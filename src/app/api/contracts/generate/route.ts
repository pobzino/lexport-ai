import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateContract } from "@/lib/contracts/generator";
import {
  ContractTypeEnum,
  NDAMetadataSchema,
  ContractorMetadataSchema,
  ConsultingMetadataSchema,
  SAFEMetadataSchema,
  FreelanceMetadataSchema,
  PaymentConfigSchema,
  type ContractMetadata,
  type ContractType,
} from "@/lib/contracts/schemas";
import { z } from "zod";
import { auditLogger, getRequestContextFromRequest } from "@/lib/audit";

// Signer info for creating signature fields
interface SignerInfo {
  role: string;
  name: string;
  email: string;
  title?: string;
}

// Helper to extract all signers from contract metadata
function getAllSigners(contractType: string, metadata: ContractMetadata): SignerInfo[] {
  const signers: SignerInfo[] = [];
  const meta = metadata as Record<string, unknown>;

  // If signerGroups is present, use that for multi-signatory support
  const signerGroups = meta.signerGroups as Array<{
    role: string;
    roleLabel: string;
    signers: Array<{ id: string; name: string; email: string; title?: string }>;
  }> | undefined;

  if (signerGroups && signerGroups.length > 0) {
    // Flatten all signers from all groups
    for (const group of signerGroups) {
      for (const signer of group.signers) {
        if (signer.name || signer.email) {
          signers.push({
            role: group.roleLabel,
            name: signer.name,
            email: signer.email,
            title: signer.title,
          });
        }
      }
    }
    return signers;
  }

  // Fallback to legacy 2-party extraction
  const roleMap: Record<string, { primary: string; secondary: string }> = {
    nda_mutual: { primary: "disclosingParty", secondary: "receivingParty" },
    nda_one_way: { primary: "disclosingParty", secondary: "receivingParty" },
    independent_contractor: { primary: "client", secondary: "contractor" },
    consulting_agreement: { primary: "client", secondary: "consultant" },
    safe_note: { primary: "company", secondary: "investor" },
    freelance_service: { primary: "client", secondary: "freelancer" },
  };

  const roleLabelMap: Record<string, { primary: string; secondary: string }> = {
    nda_mutual: { primary: "Disclosing Party", secondary: "Receiving Party" },
    nda_one_way: { primary: "Disclosing Party", secondary: "Receiving Party" },
    independent_contractor: { primary: "Company", secondary: "Contractor" },
    consulting_agreement: { primary: "Client", secondary: "Consultant" },
    safe_note: { primary: "Company", secondary: "Investor" },
    freelance_service: { primary: "Client", secondary: "Freelancer" },
  };

  const mapping = roleMap[contractType] || { primary: "party1", secondary: "party2" };
  const labels = roleLabelMap[contractType] || { primary: "Party 1", secondary: "Party 2" };

  const primary = meta[mapping.primary] as { name?: string; email?: string } | undefined;
  const secondary = meta[mapping.secondary] as { name?: string; email?: string } | undefined;

  if (primary) {
    signers.push({
      role: labels.primary,
      name: primary.name || labels.primary,
      email: primary.email || "",
    });
  } else {
    signers.push({ role: labels.primary, name: labels.primary, email: "" });
  }

  if (secondary) {
    signers.push({
      role: labels.secondary,
      name: secondary.name || labels.secondary,
      email: secondary.email || "",
    });
  } else {
    signers.push({ role: labels.secondary, name: labels.secondary, email: "" });
  }

  return signers;
}

// Legacy helper for backwards compatibility
function getSignerRoles(contractType: string, metadata: ContractMetadata): string[] {
  const signers = getAllSigners(contractType, metadata);
  // Get unique roles
  const roles = [...new Set(signers.map(s => s.role))];
  return roles.length > 0 ? roles : ["Party 1", "Party 2"];
}

// Request schema
const GenerateRequestSchema = z.object({
  contractType: ContractTypeEnum,
  metadata: z.union([
    NDAMetadataSchema,
    ContractorMetadataSchema,
    ConsultingMetadataSchema,
    SAFEMetadataSchema,
    FreelanceMetadataSchema,
  ]),
  paymentConfig: PaymentConfigSchema.optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request
    const body = await request.json();
    const parseResult = GenerateRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { contractType, metadata, paymentConfig } = parseResult.data;

    // Generate contract with AI
    const generated = await generateContract(
      contractType as ContractType,
      metadata as ContractMetadata
    );

    // Build contract data with optional payment config
    const contractData: Record<string, unknown> = {
      user_id: user.id,
      title: generated.title,
      type: contractType,
      jurisdiction: metadata.jurisdiction,
      status: "draft",
      content: {
        preamble: generated.preamble,
        recitals: generated.recitals,
        clauses: generated.clauses,
        signatureBlock: generated.signatureBlock,
      },
      metadata: metadata,
    };

    // Add payment configuration if provided
    if (paymentConfig) {
      contractData.payment_required = paymentConfig.paymentRequired;
      contractData.payment_amount = paymentConfig.paymentAmount || null;
      contractData.payment_currency = paymentConfig.paymentCurrency;
      contractData.payment_structure = paymentConfig.paymentStructure;
      contractData.deposit_percentage = paymentConfig.depositPercentage || null;
    }

    // Save to database using Supabase
    const { data: savedContract, error: insertError } = await supabase
      .from("contracts")
      .insert(contractData)
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save contract" },
        { status: 500 }
      );
    }

    // Auto-generate signature fields for each signer (supports multi-signatory)
    const allSigners = getAllSigners(contractType, metadata as ContractMetadata);
    const signatureFields = allSigners.flatMap((signer, signerIndex) => {
      // Create a unique label that includes the signer's name if multiple signers per role
      const signersInSameRole = allSigners.filter(s => s.role === signer.role);
      const isMultiplePerRole = signersInSameRole.length > 1;
      const signerLabel = isMultiplePerRole ? `${signer.role} - ${signer.name || `Signer ${signerIndex + 1}`}` : signer.role;

      return [
        // Signature field for this signer
        {
          contract_id: savedContract.id,
          type: "signature",
          label: "Signature",
          signer_role: signerLabel,
          required: true,
          position_x: signerIndex * 50,
          position_y: 10,
          width: 200,
          height: 60,
          order: signerIndex * 3 + 1,
        },
        // Date field for this signer
        {
          contract_id: savedContract.id,
          type: "date",
          label: "Date",
          signer_role: signerLabel,
          required: true,
          position_x: signerIndex * 50 + 25,
          position_y: 10,
          width: 120,
          height: 30,
          order: signerIndex * 3 + 2,
        },
        // Printed Name field for this signer
        {
          contract_id: savedContract.id,
          type: "text",
          label: "Printed Name",
          signer_role: signerLabel,
          required: true,
          position_x: signerIndex * 50,
          position_y: 50,
          width: 180,
          height: 30,
          order: signerIndex * 3 + 3,
        },
      ];
    });

    // Insert signature fields
    const { error: fieldsError } = await supabase
      .from("signature_fields")
      .insert(signatureFields);

    if (fieldsError) {
      console.error("Error creating signature fields:", fieldsError);
      // Don't fail the whole request, just log the error
    }

    // Log audit event for contract creation
    const context = getRequestContextFromRequest(request);
    await auditLogger.contractCreated(
      savedContract.id,
      user.id,
      user.email || "",
      user.user_metadata?.name || user.user_metadata?.full_name || null,
      {
        contract_type: contractType,
        jurisdiction: metadata.jurisdiction,
        title: generated.title,
      },
      context
    );

    return NextResponse.json({
      success: true,
      contract: {
        id: savedContract.id,
        ...generated,
      },
    });
  } catch (error) {
    console.error("Contract generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate contract" },
      { status: 500 }
    );
  }
}

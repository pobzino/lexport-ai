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
  LOIMetadataSchema,
  CofounderMetadataSchema,
  SalesContractMetadataSchema,
  CustomMetadataSchema,
  PaymentConfigSchema,
  type ContractMetadata,
  type ContractType,
} from "@/lib/contracts/schemas";
import { z } from "zod";
import { auditLogger, getRequestContextFromRequest } from "@/lib/audit";
import { checkContractLimit } from "@/lib/usage-tracking";
import { TIER_LIMITS } from "@/lib/rate-limits";

// Signer info for creating signature fields
interface SignerInfo {
  role: string;
  name: string;        // Individual's name (person signing)
  email: string;
  title?: string;      // Job title (e.g., "CEO", "Managing Director")
  company?: string;    // Company/entity name if signing on behalf of company
  isEntity?: boolean;  // True if this is a company/entity (needs Title field)
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
      // Detect if this role represents an entity (company)
      // by checking if roleLabel contains "Company" or similar keywords
      const isEntityRole = /company|corporation|corp|llc|ltd|inc/i.test(group.roleLabel);

      // Ensure at least one signer per role group (use role label as fallback name)
      if (group.signers.length === 0) {
        signers.push({
          role: group.roleLabel,
          name: group.roleLabel,
          email: "",
          isEntity: isEntityRole,
        });
      } else {
        for (const signer of group.signers) {
          // A signer is for an entity if the role is for entities OR they have a title
          const hasTitle = !!(signer.title && signer.title.trim());
          signers.push({
            role: group.roleLabel,
            name: signer.name || group.roleLabel,
            email: signer.email || "",
            title: signer.title,
            isEntity: isEntityRole || hasTitle,
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
    letter_of_intent: { primary: "proposingParty", secondary: "receivingParty" },
    cofounder_agreement: { primary: "party1", secondary: "party2" }, // Cofounders handled via signerGroups
    sales_contract: { primary: "seller", secondary: "buyer" },
  };

  const roleLabelMap: Record<string, { primary: string; secondary: string }> = {
    nda_mutual: { primary: "Disclosing Party", secondary: "Receiving Party" },
    nda_one_way: { primary: "Disclosing Party", secondary: "Receiving Party" },
    independent_contractor: { primary: "Company", secondary: "Contractor" },
    consulting_agreement: { primary: "Client", secondary: "Consultant" },
    safe_note: { primary: "Company", secondary: "Investor" },
    freelance_service: { primary: "Client", secondary: "Freelancer" },
    letter_of_intent: { primary: "Proposing Party", secondary: "Receiving Party" },
    cofounder_agreement: { primary: "Co-Founder 1", secondary: "Co-Founder 2" },
    sales_contract: { primary: "Seller", secondary: "Buyer" },
  };

  const mapping = roleMap[contractType] || { primary: "party1", secondary: "party2" };
  const labels = roleLabelMap[contractType] || { primary: "Party 1", secondary: "Party 2" };

  // Contract types where parties are typically entities/companies (not individuals)
  const entityRoles: Record<string, { primary: boolean; secondary: boolean }> = {
    nda_mutual: { primary: true, secondary: true },      // Both parties usually companies
    nda_one_way: { primary: true, secondary: true },     // Both parties usually companies
    independent_contractor: { primary: true, secondary: false }, // Company hires individual
    consulting_agreement: { primary: true, secondary: false },   // Company hires consultant
    safe_note: { primary: true, secondary: true },       // Company and investor (both entities)
    freelance_service: { primary: true, secondary: false },      // Client (company) hires freelancer
    letter_of_intent: { primary: true, secondary: true },        // Both usually companies
    cofounder_agreement: { primary: false, secondary: false },   // Individuals as cofounders
    sales_contract: { primary: true, secondary: true },          // Both usually companies
  };

  const entityConfig = entityRoles[contractType] || { primary: false, secondary: false };

  const primary = meta[mapping.primary] as { name?: string; email?: string; company?: string; title?: string } | undefined;
  const secondary = meta[mapping.secondary] as { name?: string; email?: string; company?: string; title?: string } | undefined;

  if (primary) {
    const hasCompany = !!primary.company;
    signers.push({
      role: labels.primary,
      name: primary.name || labels.primary,
      email: primary.email || "",
      company: primary.company,
      title: primary.title,
      isEntity: hasCompany || entityConfig.primary,
    });
  } else {
    signers.push({
      role: labels.primary,
      name: labels.primary,
      email: "",
      isEntity: entityConfig.primary,
    });
  }

  if (secondary) {
    const hasCompany = !!secondary.company;
    signers.push({
      role: labels.secondary,
      name: secondary.name || labels.secondary,
      email: secondary.email || "",
      company: secondary.company,
      title: secondary.title,
      isEntity: hasCompany || entityConfig.secondary,
    });
  } else {
    signers.push({
      role: labels.secondary,
      name: labels.secondary,
      email: "",
      isEntity: entityConfig.secondary,
    });
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
    LOIMetadataSchema,
    CofounderMetadataSchema,
    SalesContractMetadataSchema,
    CustomMetadataSchema,
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

    // Check contract generation limits
    const limitCheck = await checkContractLimit(user.id);

    if (!limitCheck.allowed) {
      const tierLimits = TIER_LIMITS[limitCheck.tier];
      return NextResponse.json(
        {
          error: "Contract limit reached",
          message: limitCheck.tier === "free"
            ? `You've used your ${tierLimits.contractsPerMonth} free contract${tierLimits.contractsPerMonth > 1 ? "s" : ""} this month. Upgrade to Pro for 50 contracts/month.`
            : `You've reached your ${tierLimits.contractsPerMonth} contract limit for this month. Your limit resets at the start of next month.`,
          upgradeUrl: "/settings/billing",
          current: limitCheck.current,
          limit: limitCheck.limit,
          tier: limitCheck.tier,
        },
        { status: 403 }
      );
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
      version: 1,
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

    // Increment AI contracts used counter for the user
    try {
      await supabase.rpc("increment_ai_contracts_used", { user_uuid: user.id });
    } catch (err) {
      console.error("Failed to increment contract usage:", err);
      // Don't fail the request if counter update fails
    }

    // Auto-generate signature fields for each signer (supports multi-signatory)
    // Fields vary based on whether the signer is an entity (company) or individual
    const allSigners = getAllSigners(contractType, metadata as ContractMetadata);
    const signatureFields = allSigners.flatMap((signer, signerIndex) => {
      // Create a unique label that includes the signer's name if multiple signers per role
      const signersInSameRole = allSigners.filter(s => s.role === signer.role);
      const isMultiplePerRole = signersInSameRole.length > 1;
      const signerLabel = isMultiplePerRole ? `${signer.role} - ${signer.name || `Signer ${signerIndex + 1}`}` : signer.role;

      // Base fields for all signers
      const baseFields = [
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
          order: signerIndex * 5 + 1,
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
          order: signerIndex * 5 + 2,
        },
        // Printed Name field for this signer (individual's name)
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
          order: signerIndex * 5 + 3,
          // Store default value hint for pre-fill
          placeholder: signer.name || undefined,
        },
      ];

      // Additional fields for entity/company signers
      if (signer.isEntity) {
        baseFields.push(
          // Title field (CEO, Director, etc.)
          {
            contract_id: savedContract.id,
            type: "text",
            label: "Title",
            signer_role: signerLabel,
            required: true,
            position_x: signerIndex * 50,
            position_y: 80,
            width: 180,
            height: 30,
            order: signerIndex * 5 + 4,
            placeholder: signer.title || undefined,
          }
        );
      }

      return baseFields;
    });

    // Insert signature fields
    const { error: fieldsError } = await supabase
      .from("signature_fields")
      .insert(signatureFields);

    if (fieldsError) {
      console.error("Error creating signature fields:", fieldsError);
      // Don't fail the whole request, just log the error
    }

    // Create initial version snapshot (version 1)
    const { error: versionError } = await supabase
      .from("contract_versions")
      .insert({
        contract_id: savedContract.id,
        version_number: 1,
        content: {
          preamble: generated.preamble,
          recitals: generated.recitals,
          clauses: generated.clauses,
          signatureBlock: generated.signatureBlock,
        },
        metadata: metadata,
        change_type: "create",
        change_summary: "Initial contract creation",
        created_by: user.id,
      });

    if (versionError) {
      console.error("Error creating initial version:", versionError);
      // Don't fail the whole request, version history is secondary
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

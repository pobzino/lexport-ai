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
  type ContractMetadata,
  type ContractType,
} from "@/lib/contracts/schemas";
import { z } from "zod";

// Helper to extract signer roles from contract metadata
function getSignerRoles(contractType: string, metadata: ContractMetadata): string[] {
  switch (contractType) {
    case "nda_mutual":
    case "nda_one_way":
      return ["Disclosing Party", "Receiving Party"];
    case "independent_contractor":
      return ["Company", "Contractor"];
    case "consulting_agreement":
      return ["Client", "Consultant"];
    case "safe_note":
      return ["Company", "Investor"];
    case "freelance_service":
      return ["Client", "Freelancer"];
    default:
      return ["Party 1", "Party 2"];
  }
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

    const { contractType, metadata } = parseResult.data;

    // Generate contract with AI
    const generated = await generateContract(
      contractType as ContractType,
      metadata as ContractMetadata
    );

    // Save to database using Supabase
    const { data: savedContract, error: insertError } = await supabase
      .from("contracts")
      .insert({
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
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save contract" },
        { status: 500 }
      );
    }

    // Auto-generate signature fields for each party
    const signerRoles = getSignerRoles(contractType, metadata as ContractMetadata);
    const signatureFields = signerRoles.flatMap((role, roleIndex) => [
      // Signature field for this role
      {
        contract_id: savedContract.id,
        type: "signature",
        label: "Signature",
        signer_role: role,
        required: true,
        position_x: roleIndex * 50,
        position_y: 10,
        width: 200,
        height: 60,
        order: roleIndex * 3 + 1,
      },
      // Date field for this role
      {
        contract_id: savedContract.id,
        type: "date",
        label: "Date",
        signer_role: role,
        required: true,
        position_x: roleIndex * 50 + 25,
        position_y: 10,
        width: 120,
        height: 30,
        order: roleIndex * 3 + 2,
      },
      // Printed Name field for this role
      {
        contract_id: savedContract.id,
        type: "text",
        label: "Printed Name",
        signer_role: role,
        required: true,
        position_x: roleIndex * 50,
        position_y: 50,
        width: 180,
        height: 30,
        order: roleIndex * 3 + 3,
      },
    ]);

    // Insert signature fields
    const { error: fieldsError } = await supabase
      .from("signature_fields")
      .insert(signatureFields);

    if (fieldsError) {
      console.error("Error creating signature fields:", fieldsError);
      // Don't fail the whole request, just log the error
    }

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

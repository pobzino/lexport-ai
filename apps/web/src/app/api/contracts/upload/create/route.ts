import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { ContractContent } from "@/db/types";

interface CreateUploadedContractRequest {
  title: string;
  type: string;
  jurisdiction: string;
  processingMode: "quick" | "full";
  // For quick mode
  extractedText?: string;
  sourceFileUrl: string;
  sourceFileType: "pdf" | "docx" | "jpg" | "png";
  // For full mode
  content?: ContractContent;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: CreateUploadedContractRequest = await request.json();

    // Validate required fields
    if (!body.title || !body.processingMode || !body.sourceFileUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Prepare content based on mode
    let contractContent: ContractContent;

    if (body.processingMode === "full" && body.content) {
      // Full mode: use parsed content
      contractContent = body.content;
    } else {
      // Quick mode: create minimal content structure
      contractContent = {
        preamble: "",
        recitals: "",
        clauses: [],
        signatureBlock: "",
      };
    }

    // Create the contract record
    const { data: contract, error: insertError } = await supabase
      .from("contracts")
      .insert({
        title: body.title,
        type: body.type || "service_agreement",
        jurisdiction: body.jurisdiction || "other",
        status: "draft",
        content: contractContent,
        user_id: user.id,
        // Upload-specific fields
        source_type: "uploaded",
        source_file_url: body.sourceFileUrl,
        source_file_type: body.sourceFileType,
        processing_mode: body.processingMode,
        extracted_text: body.extractedText || null,
        // Default values
        payment_required: false,
        payment_currency: "usd",
        payment_status: "pending",
        payment_structure: "full",
        deposit_percentage: 0,
        reminder_enabled: false,
        reminder_interval_days: 3,
        require_sequential_signing: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create contract" },
        { status: 500 }
      );
    }

    // Create initial version
    await supabase.from("contract_versions").insert({
      contract_id: contract.id,
      version_number: 1,
      content: contractContent,
      change_summary: "Initial upload",
      change_type: "create",
      created_by: user.id,
    });

    return NextResponse.json({
      success: true,
      contract: {
        id: contract.id,
        title: contract.title,
        type: contract.type,
        jurisdiction: contract.jurisdiction,
        status: contract.status,
        processingMode: body.processingMode,
      },
    });
  } catch (error) {
    console.error("Create error:", error);
    return NextResponse.json(
      { error: "Failed to create uploaded contract" },
      { status: 500 }
    );
  }
}

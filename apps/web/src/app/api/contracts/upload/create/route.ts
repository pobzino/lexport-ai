import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { ContractContent } from "@/db/types";

type ProcessingMode = "sign_only" | "edit_and_sign";

interface CreateUploadedContractRequest {
  title: string;
  type: string;
  jurisdiction: string;
  processingMode: ProcessingMode;
  extractedText?: string;
  sourceFileUrl: string;
  sourceFileType: "pdf" | "docx" | "jpg" | "png";
  content?: ContractContent | null; // Required for edit_and_sign, null for sign_only
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
    if (!body.title || !body.sourceFileUrl || !body.processingMode) {
      return NextResponse.json(
        { error: "Missing required fields: title, sourceFileUrl, and processingMode are required" },
        { status: 400 }
      );
    }

    // Validate mode-specific requirements
    if (body.processingMode === "edit_and_sign" && !body.content) {
      return NextResponse.json(
        { error: "Content is required for Edit & Sign mode" },
        { status: 400 }
      );
    }

    // For sign_only mode, create minimal content structure
    let contractContent: ContractContent;

    if (body.processingMode === "sign_only") {
      // Minimal content for sign_only - the original PDF is the source of truth
      contractContent = {
        preamble: "",
        recitals: "",
        clauses: [],
        signatureBlock: "",
      };
    } else {
      // Use AI-parsed content for edit_and_sign
      contractContent = body.content as ContractContent;
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
      change_summary: `Initial upload (${body.processingMode === "sign_only" ? "Sign Only" : "Edit & Sign"})`,
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

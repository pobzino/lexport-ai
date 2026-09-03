import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { ContractContent } from "@/db/types";
import {
  isOwnedUploadPath,
  type UploadFileType,
} from "@/lib/upload/file-validation";
import type { UploadedProcessingMode } from "@/lib/contracts/uploaded-document";

interface CreateUploadedContractRequest {
  title: string;
  type: string;
  jurisdiction: string;
  processingMode: UploadedProcessingMode;
  extractedText?: string;
  sourceFileUrl: string;
  sourceFileType: UploadFileType;
  content?: ContractContent | null; // Review outline; never replaces the source document.
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

    if (!isOwnedUploadPath(body.sourceFileUrl, user.id)) {
      return NextResponse.json({ error: "Invalid upload path" }, { status: 400 });
    }

    if (!(["sign_only", "review", "edit_and_sign"] as const).includes(body.processingMode)) {
      return NextResponse.json({ error: "Invalid processing mode" }, { status: 400 });
    }

    if (!(["pdf", "docx", "jpg", "png"] as const).includes(body.sourceFileType)) {
      return NextResponse.json({ error: "Invalid source file type" }, { status: 400 });
    }

    if (body.processingMode === "sign_only" && body.sourceFileType === "docx") {
      return NextResponse.json(
        {
          error:
            "Export the Word document to PDF before preparing it for signature.",
        },
        { status: 400 },
      );
    }

    const title = body.title.trim().slice(0, 160);
    if (!title) {
      return NextResponse.json({ error: "Contract title is required" }, { status: 400 });
    }

    // Validate mode-specific requirements
    if (
      (body.processingMode === "review" || body.processingMode === "edit_and_sign") &&
      !body.content
    ) {
      return NextResponse.json(
        { error: "Extracted content is required for AI review" },
        { status: 400 }
      );
    }

    // Signing-only mode needs no reconstructed legal text. Review mode stores a
    // separate clause outline while the original remains the signing document.
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
      // Use extracted content for the review workspace or a legacy conversion.
      contractContent = body.content as ContractContent;
    }

    // Create the contract record
    const { data: contract, error: insertError } = await supabase
      .from("contracts")
      .insert({
        title,
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
      change_summary: `Initial upload (${
        body.processingMode === "sign_only"
          ? "Original document"
          : body.processingMode === "review"
            ? "AI review workspace"
            : "Legacy editable conversion"
      })`,
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

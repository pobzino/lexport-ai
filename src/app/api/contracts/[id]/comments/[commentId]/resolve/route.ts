import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST - Resolve or unresolve a comment thread
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id, commentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get optional body for unresolving
    let unresolve = false;
    try {
      const body = await request.json();
      unresolve = body.unresolve === true;
    } catch {
      // No body or invalid JSON is fine, default to resolving
    }

    // Verify comment exists and is a top-level comment (not a reply)
    const { data: existingComment } = await supabase
      .from("comments")
      .select("id, user_id, contract_id, parent_comment_id, is_resolved")
      .eq("id", commentId)
      .eq("contract_id", id)
      .single();

    if (!existingComment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Only top-level comments can be resolved
    if (existingComment.parent_comment_id) {
      return NextResponse.json(
        { error: "Only top-level comments can be resolved" },
        { status: 400 }
      );
    }

    // Check if user has access to this contract
    const { data: contract } = await supabase
      .from("contracts")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Get user email for signature request check
    const { data: currentUser } = await supabase
      .from("users")
      .select("email")
      .eq("id", user.id)
      .single();

    const isContractOwner = contract.user_id === user.id;
    const isCommentAuthor = existingComment.user_id === user.id;

    // Check if user is a signer
    let isSigner = false;
    if (!isContractOwner && currentUser?.email) {
      const { data: signatureRequest } = await supabase
        .from("signature_requests")
        .select("id")
        .eq("contract_id", id)
        .eq("signer_email", currentUser.email)
        .single();
      isSigner = !!signatureRequest;
    }

    // Only contract owner, comment author, or signers can resolve
    if (!isContractOwner && !isCommentAuthor && !isSigner) {
      return NextResponse.json(
        { error: "You don't have permission to resolve this comment" },
        { status: 403 }
      );
    }

    // Update the comment resolution status
    const updateData = unresolve
      ? {
          is_resolved: false,
          resolved_by: null,
          resolved_at: null,
        }
      : {
          is_resolved: true,
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
        };

    const { data: comment, error: updateError } = await supabase
      .from("comments")
      .update(updateData)
      .eq("id", commentId)
      .select(`
        *,
        user:users!user_id(id, name, email, image)
      `)
      .single();

    if (updateError) {
      console.error("Error resolving comment:", updateError);
      return NextResponse.json(
        { error: "Failed to resolve comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      comment,
      message: unresolve ? "Comment reopened" : "Comment resolved",
    });
  } catch (error) {
    console.error("Error in POST resolve:", error);
    return NextResponse.json(
      { error: "Failed to resolve comment" },
      { status: 500 }
    );
  }
}

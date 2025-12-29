import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// PATCH - Update comment (resolve, add owner response)
const UpdateCommentSchema = z.object({
  resolved: z.boolean().optional(),
  ownerResponse: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id: contractId, commentId } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const parseResult = UpdateCommentSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { resolved, ownerResponse } = parseResult.data;

    // Verify user owns this contract
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, user_id")
      .eq("id", contractId)
      .single();

    if (contractError || !contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    if (contract.user_id !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to update this comment" },
        { status: 403 }
      );
    }

    // Verify comment exists and belongs to this contract
    const { data: comment, error: commentError } = await supabase
      .from("review_comments")
      .select("*")
      .eq("id", commentId)
      .eq("contract_id", contractId)
      .single();

    if (commentError || !comment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (resolved !== undefined) {
      updateData.resolved = resolved;
      updateData.resolved_at = resolved ? new Date().toISOString() : null;
    }
    if (ownerResponse !== undefined) {
      updateData.owner_response = ownerResponse;
      updateData.owner_responded_at = new Date().toISOString();
    }

    // Update the comment
    const { data: updatedComment, error: updateError } = await supabase
      .from("review_comments")
      .update(updateData)
      .eq("id", commentId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating comment:", updateError);
      return NextResponse.json(
        { error: "Failed to update comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      comment: updatedComment,
    });
  } catch (error) {
    console.error("Error updating comment:", error);
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 }
    );
  }
}

// POST - Add owner reply to a comment thread
const ReplySchema = z.object({
  content: z.string().min(1, "Reply cannot be empty"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id: contractId, commentId } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const parseResult = ReplySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { content } = parseResult.data;

    // Verify user owns this contract
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, user_id")
      .eq("id", contractId)
      .single();

    if (contractError || !contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    if (contract.user_id !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to reply to this comment" },
        { status: 403 }
      );
    }

    // Verify parent comment exists
    const { data: parentComment, error: commentError } = await supabase
      .from("review_comments")
      .select("*, review_requests(id)")
      .eq("id", commentId)
      .eq("contract_id", contractId)
      .single();

    if (commentError || !parentComment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    // Get owner profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    // Create owner's reply as a new comment
    const { data: reply, error: replyError } = await supabase
      .from("review_comments")
      .insert({
        review_request_id: parentComment.review_request_id,
        contract_id: contractId,
        author_type: "owner",
        author_name: profile?.full_name || "Contract Owner",
        author_email: profile?.email || user.email,
        content,
        clause_id: parentComment.clause_id,
        parent_comment_id: commentId,
      })
      .select()
      .single();

    if (replyError) {
      console.error("Error creating reply:", replyError);
      return NextResponse.json(
        { error: "Failed to add reply" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reply,
    });
  } catch (error) {
    console.error("Error adding reply:", error);
    return NextResponse.json(
      { error: "Failed to add reply" },
      { status: 500 }
    );
  }
}

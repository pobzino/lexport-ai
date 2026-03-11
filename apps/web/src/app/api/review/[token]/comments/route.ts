import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

// POST - Add a comment to the review
const CommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty"),
  clauseId: z.string().optional(), // Optional: attach comment to specific clause
  selectedText: z.string().optional(), // Optional: the text that was highlighted
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = createAdminClient();

    // Parse request body
    const body = await request.json();
    const parseResult = CommentSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { content, clauseId, selectedText } = parseResult.data;

    // Find the review request
    const { data: reviewRequest, error } = await supabase
      .from("review_requests")
      .select("*, contracts(*)")
      .eq("token", token)
      .single();

    if (error || !reviewRequest) {
      return NextResponse.json(
        { error: "Review request not found" },
        { status: 404 }
      );
    }

    // Check if expired
    if (reviewRequest.expires_at && new Date() > new Date(reviewRequest.expires_at)) {
      return NextResponse.json(
        { error: "Review request has expired" },
        { status: 410 }
      );
    }

    // Check if review is still open
    if (reviewRequest.status === "cancelled" || reviewRequest.status === "expired") {
      return NextResponse.json(
        { error: "This review is no longer active" },
        { status: 400 }
      );
    }

    const contract = reviewRequest.contracts;

    // Check if contract has moved past draft stage
    if (contract.status === "pending_signature" || contract.status === "signed") {
      return NextResponse.json(
        { error: "This contract has been finalized" },
        { status: 400 }
      );
    }

    // Create the comment
    const { data: comment, error: insertError } = await supabase
      .from("review_comments")
      .insert({
        review_request_id: reviewRequest.id,
        contract_id: contract.id,
        author_type: "reviewer",
        author_name: reviewRequest.reviewer_name,
        author_email: reviewRequest.reviewer_email,
        content,
        clause_id: clauseId || null,
        selected_text: selectedText || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating comment:", insertError);
      return NextResponse.json(
        { error: "Failed to add comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      comment,
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    return NextResponse.json(
      { error: "Failed to add comment" },
      { status: 500 }
    );
  }
}

// GET - Fetch all comments for a review
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = createAdminClient();

    // Find the review request
    const { data: reviewRequest, error } = await supabase
      .from("review_requests")
      .select("id")
      .eq("token", token)
      .single();

    if (error || !reviewRequest) {
      return NextResponse.json(
        { error: "Review request not found" },
        { status: 404 }
      );
    }

    // Fetch comments
    const { data: comments, error: fetchError } = await supabase
      .from("review_comments")
      .select("*")
      .eq("review_request_id", reviewRequest.id)
      .order("created_at", { ascending: true });

    if (fetchError) {
      console.error("Error fetching comments:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch comments" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      comments: comments || [],
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

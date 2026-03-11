import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

// GET - Fetch contract for review (public, token-based)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = createAdminClient();

    // Find the review request with contract
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

    // Check if cancelled
    if (reviewRequest.status === "cancelled") {
      return NextResponse.json(
        { error: "This review request has been cancelled" },
        { status: 410 }
      );
    }

    const contract = reviewRequest.contracts;

    // Check if contract has moved past draft stage
    if (contract.status === "pending_signature" || contract.status === "signed") {
      return NextResponse.json(
        {
          error: "This contract has been finalized",
          message: "The contract owner has already sent this for signature. Review is no longer available.",
          finalized: true,
        },
        { status: 400 }
      );
    }

    // Update viewed_at if not already viewed
    if (!reviewRequest.viewed_at) {
      await supabase
        .from("review_requests")
        .update({
          viewed_at: new Date().toISOString(),
          status: "viewed",
        })
        .eq("id", reviewRequest.id);
    }

    // Fetch comments for this review
    const { data: comments } = await supabase
      .from("review_comments")
      .select("*")
      .eq("review_request_id", reviewRequest.id)
      .order("created_at", { ascending: true });

    // Get owner info
    const { data: owner } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", contract.user_id)
      .single();

    return NextResponse.json({
      reviewRequest: {
        id: reviewRequest.id,
        reviewerName: reviewRequest.reviewer_name,
        reviewerEmail: reviewRequest.reviewer_email,
        status: reviewRequest.status,
        message: reviewRequest.message,
        expiresAt: reviewRequest.expires_at,
        viewedAt: reviewRequest.viewed_at,
        respondedAt: reviewRequest.responded_at,
        responseMessage: reviewRequest.response_message,
      },
      contract: {
        id: contract.id,
        title: contract.title,
        type: contract.type,
        content: contract.content,
        status: contract.status,
        // Note: No hash - this is a draft, hash is only generated when sending for signature
      },
      comments: comments || [],
      owner: {
        name: owner?.full_name || "Contract Owner",
        email: owner?.email,
      },
    });
  } catch (error) {
    console.error("[review GET] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Failed to fetch review request", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST - Submit review response (approve or request changes)
const ReviewResponseSchema = z.object({
  action: z.enum(["approve", "request_changes"]),
  message: z.string().optional(),
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
    const parseResult = ReviewResponseSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { action, message } = parseResult.data;

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

    // Check if already responded
    if (reviewRequest.status === "approved" || reviewRequest.status === "changes_requested") {
      return NextResponse.json(
        { error: "You have already submitted your review" },
        { status: 400 }
      );
    }

    const contract = reviewRequest.contracts;

    // Check if contract has moved past draft stage
    if (contract.status === "pending_signature" || contract.status === "signed") {
      return NextResponse.json(
        { error: "This contract has been finalized and cannot be reviewed" },
        { status: 400 }
      );
    }

    // Update review request status
    const newStatus = action === "approve" ? "approved" : "changes_requested";
    const { error: updateError } = await supabase
      .from("review_requests")
      .update({
        status: newStatus,
        responded_at: new Date().toISOString(),
        response_message: message || null,
      })
      .eq("id", reviewRequest.id);

    if (updateError) {
      console.error("Error updating review request:", updateError);
      return NextResponse.json(
        { error: "Failed to submit review" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      message: action === "approve"
        ? "Thank you! Your approval has been recorded."
        : "Your feedback has been sent to the contract owner.",
    });
  } catch (error) {
    console.error("Error submitting review response:", error);
    return NextResponse.json(
      { error: "Failed to submit review" },
      { status: 500 }
    );
  }
}

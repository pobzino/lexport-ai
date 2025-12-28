import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Fetch all review requests and comments for a contract (owner view)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contractId } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user owns this contract
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, user_id, title")
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
        { error: "You don't have permission to view this contract's reviews" },
        { status: 403 }
      );
    }

    // Fetch all review requests for this contract
    const { data: reviewRequests, error: reviewError } = await supabase
      .from("review_requests")
      .select("*")
      .eq("contract_id", contractId)
      .order("created_at", { ascending: false });

    if (reviewError) {
      console.error("Error fetching review requests:", reviewError);
      return NextResponse.json(
        { error: "Failed to fetch reviews" },
        { status: 500 }
      );
    }

    // Fetch all comments for this contract
    const { data: comments, error: commentsError } = await supabase
      .from("review_comments")
      .select("*")
      .eq("contract_id", contractId)
      .order("created_at", { ascending: true });

    if (commentsError) {
      console.error("Error fetching comments:", commentsError);
      return NextResponse.json(
        { error: "Failed to fetch comments" },
        { status: 500 }
      );
    }

    // Group comments by review request
    const reviewsWithComments = reviewRequests?.map((review) => ({
      ...review,
      comments: comments?.filter((c) => c.review_request_id === review.id) || [],
    }));

    // Calculate summary
    const summary = {
      total: reviewRequests?.length || 0,
      pending: reviewRequests?.filter((r) => r.status === "pending" || r.status === "viewed").length || 0,
      approved: reviewRequests?.filter((r) => r.status === "approved").length || 0,
      changesRequested: reviewRequests?.filter((r) => r.status === "changes_requested").length || 0,
      totalComments: comments?.length || 0,
      unresolvedComments: comments?.filter((c) => !c.resolved).length || 0,
    };

    return NextResponse.json({
      reviews: reviewsWithComments || [],
      summary,
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

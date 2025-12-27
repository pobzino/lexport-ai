import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Schema for creating a comment
const CreateCommentSchema = z.object({
  clauseId: z.string().min(1, "Clause ID is required"),
  content: z.string().min(1, "Comment content is required"),
  parentCommentId: z.string().uuid().optional().nullable(),
  selectionStart: z.number().optional().nullable(),
  selectionEnd: z.number().optional().nullable(),
  selectedText: z.string().optional().nullable(),
});

// GET - Fetch all comments for a contract
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has access to this contract
    const { data: contract } = await supabase
      .from("contracts")
      .select("id, user_id")
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

    // Check if user owns contract or is a signer
    const isOwner = contract.user_id === user.id;

    let isSigner = false;
    if (!isOwner && currentUser?.email) {
      const { data: signatureRequest } = await supabase
        .from("signature_requests")
        .select("id")
        .eq("contract_id", id)
        .eq("signer_email", currentUser.email)
        .single();
      isSigner = !!signatureRequest;
    }

    if (!isOwner && !isSigner) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Optional: filter by clause
    const clauseId = request.nextUrl.searchParams.get("clauseId");
    const includeResolved = request.nextUrl.searchParams.get("includeResolved") === "true";

    // Build query for top-level comments (no parent)
    let query = supabase
      .from("comments")
      .select(`
        *,
        user:users!user_id(id, name, email, image)
      `)
      .eq("contract_id", id)
      .is("parent_comment_id", null)
      .order("created_at", { ascending: true });

    if (clauseId) {
      query = query.eq("clause_id", clauseId);
    }

    if (!includeResolved) {
      query = query.eq("is_resolved", false);
    }

    const { data: comments, error: commentsError } = await query;

    if (commentsError) {
      console.error("Error fetching comments:", commentsError);
      return NextResponse.json(
        { error: "Failed to fetch comments" },
        { status: 500 }
      );
    }

    // Fetch replies for each comment
    const commentsWithReplies = await Promise.all(
      (comments || []).map(async (comment) => {
        const { data: replies } = await supabase
          .from("comments")
          .select(`
            *,
            user:users!user_id(id, name, email, image)
          `)
          .eq("parent_comment_id", comment.id)
          .order("created_at", { ascending: true });

        return {
          ...comment,
          replies: replies || [],
        };
      })
    );

    // Group comments by clause for easier rendering
    const commentsByClause: Record<string, typeof commentsWithReplies> = {};
    commentsWithReplies.forEach((comment) => {
      if (!commentsByClause[comment.clause_id]) {
        commentsByClause[comment.clause_id] = [];
      }
      commentsByClause[comment.clause_id].push(comment);
    });

    // Get comment counts per clause
    const { data: countData } = await supabase
      .from("comments")
      .select("clause_id")
      .eq("contract_id", id)
      .is("parent_comment_id", null)
      .eq("is_resolved", false);

    const commentCounts: Record<string, number> = {};
    (countData || []).forEach((row) => {
      commentCounts[row.clause_id] = (commentCounts[row.clause_id] || 0) + 1;
    });

    return NextResponse.json({
      comments: commentsWithReplies,
      commentsByClause,
      commentCounts,
    });
  } catch (error) {
    console.error("Error in GET comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

// POST - Create a new comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = CreateCommentSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { clauseId, content, parentCommentId, selectionStart, selectionEnd, selectedText } =
      parseResult.data;

    // Check if user has access to this contract
    const { data: contract } = await supabase
      .from("contracts")
      .select("id, user_id")
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

    // Check if user owns contract or is a signer
    const isOwner = contract.user_id === user.id;

    let isSigner = false;
    if (!isOwner && currentUser?.email) {
      const { data: signatureRequest } = await supabase
        .from("signature_requests")
        .select("id")
        .eq("contract_id", id)
        .eq("signer_email", currentUser.email)
        .single();
      isSigner = !!signatureRequest;
    }

    if (!isOwner && !isSigner) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // If this is a reply, verify parent comment exists
    if (parentCommentId) {
      const { data: parentComment } = await supabase
        .from("comments")
        .select("id, contract_id")
        .eq("id", parentCommentId)
        .single();

      if (!parentComment || parentComment.contract_id !== id) {
        return NextResponse.json(
          { error: "Parent comment not found" },
          { status: 404 }
        );
      }
    }

    // Create the comment
    const { data: comment, error: insertError } = await supabase
      .from("comments")
      .insert({
        contract_id: id,
        clause_id: clauseId,
        user_id: user.id,
        parent_comment_id: parentCommentId || null,
        content,
        selection_start: selectionStart || null,
        selection_end: selectionEnd || null,
        selected_text: selectedText || null,
        is_resolved: false,
      })
      .select(`
        *,
        user:users!user_id(id, name, email, image)
      `)
      .single();

    if (insertError) {
      console.error("Error creating comment:", insertError);
      return NextResponse.json(
        { error: "Failed to create comment" },
        { status: 500 }
      );
    }

    // Extract @mentions from content and create mention records
    const mentionPattern = /@(\w+(?:\.\w+)*@[\w.-]+\.\w+)/g;
    const mentions = content.match(mentionPattern) || [];

    for (const mention of mentions) {
      const email = mention.substring(1); // Remove @ prefix
      const { data: mentionedUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      if (mentionedUser) {
        await supabase.from("comment_mentions").insert({
          comment_id: comment.id,
          mentioned_user_id: mentionedUser.id,
          is_read: false,
        });
      }
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("Error in POST comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}

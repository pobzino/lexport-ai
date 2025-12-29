"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  MessageCircle,
  Filter,
  Loader2,
  MessageSquarePlus,
} from "lucide-react";
import type { CommentWithUser } from "@/db/types";
import { CommentThread } from "./CommentThread";
import { CommentInput } from "./CommentInput";

interface CommentSidebarProps {
  contractId: string;
  currentUserId: string;
  isContractOwner: boolean;
  activeClauseId?: string | null;
  clauseTitle?: string;
  selectedText?: string;
  selectionRange?: { start: number; end: number };
  onClose: () => void;
  onCommentCountChange?: (counts: Record<string, number>) => void;
  onCommentCreated?: () => void;
  onJumpToSelection?: (clauseId: string, selectionStart: number, selectionEnd: number) => void;
}

export function CommentSidebar({
  contractId,
  currentUserId,
  isContractOwner,
  activeClauseId,
  clauseTitle,
  selectedText,
  selectionRange,
  onClose,
  onCommentCountChange,
  onCommentCreated,
  onJumpToSelection,
}: CommentSidebarProps) {
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [showNewComment, setShowNewComment] = useState(false);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeClauseId) {
        params.append("clauseId", activeClauseId);
      }
      if (showResolved) {
        params.append("includeResolved", "true");
      }

      const response = await fetch(
        `/api/contracts/${contractId}/comments?${params.toString()}`
      );

      if (!response.ok) throw new Error("Failed to fetch comments");

      const data = await response.json();
      const fetchedComments = data.comments || [];
      setComments(fetchedComments);

      // Notify parent of comment counts
      if (onCommentCountChange) {
        onCommentCountChange(data.commentCounts || {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load comments");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId, activeClauseId, showResolved]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Auto-show comment input when text is selected
  useEffect(() => {
    if (selectedText && activeClauseId) {
      setShowNewComment(true);
    }
  }, [selectedText, activeClauseId]);

  // Create a new comment
  const handleCreateComment = async (content: string) => {
    if (!activeClauseId) {
      setError("Please select a clause to comment on");
      return;
    }

    const response = await fetch(`/api/contracts/${contractId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clauseId: activeClauseId,
        content,
        selectedText: selectedText || null,
        selectionStart: selectionRange?.start || null,
        selectionEnd: selectionRange?.end || null,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to create comment");
    }

    setShowNewComment(false);
    await fetchComments();
    onCommentCreated?.();
  };

  // Reply to a comment
  const handleReply = async (parentCommentId: string, content: string) => {
    if (!activeClauseId) return;

    const response = await fetch(`/api/contracts/${contractId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clauseId: activeClauseId,
        content,
        parentCommentId,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to reply");
    }

    await fetchComments();
  };

  // Edit a comment
  const handleEdit = async (commentId: string, content: string) => {
    const response = await fetch(
      `/api/contracts/${contractId}/comments/${commentId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to edit comment");
    }

    await fetchComments();
  };

  // Delete a comment
  const handleDelete = async (commentId: string) => {
    const response = await fetch(
      `/api/contracts/${contractId}/comments/${commentId}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to delete comment");
    }

    await fetchComments();
  };

  // Resolve/unresolve a comment
  const handleResolve = async (commentId: string, unresolve = false) => {
    const response = await fetch(
      `/api/contracts/${contractId}/comments/${commentId}/resolve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unresolve }),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to resolve comment");
    }

    await fetchComments();
  };

  const unresolvedCount = comments.filter((c) => !c.is_resolved).length;
  const resolvedCount = comments.filter((c) => c.is_resolved).length;

  return (
    <aside className="w-96 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#529ec6]" />
            <span className="font-semibold text-slate-900">Comments</span>
            {unresolvedCount > 0 && (
              <span className="px-2 py-0.5 bg-[#529ec6]/10 text-[#202e46] text-xs rounded-full font-medium">
                {unresolvedCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Active clause indicator */}
        {activeClauseId && clauseTitle && (
          <p className="text-sm text-slate-500 mt-1 truncate">
            Commenting on: <span className="font-medium">{clauseTitle}</span>
          </p>
        )}

        {/* Filter toggle */}
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={() => setShowResolved(!showResolved)}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
              showResolved
                ? "bg-slate-100 text-slate-700"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <Filter className="w-3 h-3" />
            {showResolved ? "Showing resolved" : "Show resolved"}
            {resolvedCount > 0 && (
              <span className="ml-1 text-slate-400">({resolvedCount})</span>
            )}
          </button>
        </div>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* New comment input - shown when showNewComment is true regardless of existing comments */}
        {showNewComment && activeClauseId && (
          <div className="mb-4">
            <CommentInput
              onSubmit={handleCreateComment}
              onCancel={() => setShowNewComment(false)}
              placeholder="Add a comment..."
              autoFocus
              selectedText={selectedText}
            />
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#529ec6]" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                fetchComments();
              }}
              className="mt-2 text-sm text-[#529ec6] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : comments.length === 0 && !showNewComment ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500 mb-2">
              {activeClauseId
                ? "No comments on this clause yet"
                : "Select a clause to view comments"}
            </p>
            {activeClauseId && (
              <p className="text-xs text-slate-400">
                Click &ldquo;New Comment&rdquo; below to start a discussion
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Comment threads */}
            {comments.map((comment) => (
              <CommentThread
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                isContractOwner={isContractOwner}
                contractId={contractId}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onReply={handleReply}
                onResolve={handleResolve}
                onJumpToSelection={onJumpToSelection}
              />
            ))}
          </>
        )}
      </div>

      {/* New comment button */}
      {activeClauseId && !showNewComment && (
        <div className="p-4 border-t border-slate-200 flex-shrink-0">
          <button
            onClick={() => setShowNewComment(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#202e46] text-white rounded-lg hover:bg-[#1a2539] transition-colors"
          >
            <MessageSquarePlus className="w-4 h-4" />
            New Comment
          </button>
        </div>
      )}

      {/* Prompt to select clause if none selected */}
      {!activeClauseId && (
        <div className="p-4 border-t border-slate-200 flex-shrink-0">
          <p className="text-sm text-slate-500 text-center">
            Click on a clause to add or view comments
          </p>
        </div>
      )}
    </aside>
  );
}

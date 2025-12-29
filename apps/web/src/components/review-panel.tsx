"use client";

import { useState, useEffect } from "react";
import {
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  Send,
  Check,
  X,
  Loader2,
  Eye,
  MessageCircle,
  RefreshCw,
} from "lucide-react";

interface Comment {
  id: string;
  author_type: "owner" | "reviewer";
  author_name: string;
  author_email: string;
  content: string;
  clause_id: string | null;
  selected_text: string | null;
  resolved: boolean;
  resolved_at: string | null;
  owner_response: string | null;
  owner_responded_at: string | null;
  parent_comment_id: string | null;
  created_at: string;
}

interface ReviewRequest {
  id: string;
  reviewer_name: string;
  reviewer_email: string;
  status: "pending" | "viewed" | "approved" | "changes_requested" | "cancelled" | "expired";
  message: string | null;
  response_message: string | null;
  expires_at: string;
  viewed_at: string | null;
  responded_at: string | null;
  created_at: string;
  comments: Comment[];
}

interface ReviewSummary {
  total: number;
  pending: number;
  approved: number;
  changesRequested: number;
  totalComments: number;
  unresolvedComments: number;
}

interface ReviewPanelProps {
  contractId: string;
  onCommentResolved?: () => void;
  onClose?: () => void;
}

export function ReviewPanel({ contractId, onCommentResolved, onClose }: ReviewPanelProps) {
  const [reviews, setReviews] = useState<ReviewRequest[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [resolvingComment, setResolvingComment] = useState<string | null>(null);

  useEffect(() => {
    fetchReviews();
  }, [contractId]);

  async function fetchReviews() {
    try {
      setLoading(true);
      const response = await fetch(`/api/contracts/${contractId}/reviews`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch reviews");
      }

      setReviews(data.reviews || []);
      setSummary(data.summary);

      // Auto-expand reviews with unresolved comments
      const reviewsWithUnresolved = data.reviews
        ?.filter((r: ReviewRequest) => r.comments.some((c: Comment) => !c.resolved))
        .map((r: ReviewRequest) => r.id);
      setExpandedReviews(new Set(reviewsWithUnresolved || []));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }

  async function handleResolveComment(commentId: string, resolved: boolean) {
    setResolvingComment(commentId);
    try {
      const response = await fetch(
        `/api/contracts/${contractId}/reviews/comments/${commentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolved }),
        }
      );

      if (response.ok) {
        // Update local state
        setReviews((prev) =>
          prev.map((review) => ({
            ...review,
            comments: review.comments.map((c) =>
              c.id === commentId ? { ...c, resolved, resolved_at: resolved ? new Date().toISOString() : null } : c
            ),
          }))
        );
        setSummary((prev) =>
          prev
            ? {
                ...prev,
                unresolvedComments: resolved
                  ? prev.unresolvedComments - 1
                  : prev.unresolvedComments + 1,
              }
            : null
        );
        onCommentResolved?.();
      }
    } catch (err) {
      console.error("Failed to resolve comment:", err);
    } finally {
      setResolvingComment(null);
    }
  }

  async function handleSubmitReply(commentId: string) {
    if (!replyContent.trim()) return;

    setSubmittingReply(true);
    try {
      const response = await fetch(
        `/api/contracts/${contractId}/reviews/comments/${commentId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: replyContent }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Add reply to local state
        setReviews((prev) =>
          prev.map((review) => ({
            ...review,
            comments: [...review.comments, data.reply],
          }))
        );
        setReplyContent("");
        setReplyingTo(null);
      }
    } catch (err) {
      console.error("Failed to add reply:", err);
    } finally {
      setSubmittingReply(false);
    }
  }

  function toggleReviewExpanded(reviewId: string) {
    setExpandedReviews((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });
  }

  function getStatusConfig(status: ReviewRequest["status"]) {
    switch (status) {
      case "approved":
        return {
          icon: CheckCircle2,
          color: "text-emerald-600",
          bg: "bg-emerald-100",
          label: "Approved",
        };
      case "changes_requested":
        return {
          icon: AlertCircle,
          color: "text-amber-600",
          bg: "bg-amber-100",
          label: "Changes Requested",
        };
      case "viewed":
        return {
          icon: Eye,
          color: "text-blue-600",
          bg: "bg-blue-100",
          label: "Viewed",
        };
      case "cancelled":
        return {
          icon: X,
          color: "text-slate-600",
          bg: "bg-slate-100",
          label: "Cancelled",
        };
      case "expired":
        return {
          icon: Clock,
          color: "text-slate-600",
          bg: "bg-slate-100",
          label: "Expired",
        };
      default:
        return {
          icon: Clock,
          color: "text-slate-600",
          bg: "bg-slate-100",
          label: "Pending",
        };
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <aside className="w-96 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-slate-900">Reviews</span>
            {summary && summary.total > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                {summary.total}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={fetchReviews}
              className="p-1.5 hover:bg-slate-100 rounded transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading reviews...</span>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-600">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p>{error}</p>
            <button
              onClick={fetchReviews}
              className="mt-2 text-sm text-slate-600 hover:text-slate-900"
            >
              Try again
            </button>
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-6 text-center">
            <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-medium text-slate-900 mb-1">No Reviews Yet</h3>
            <p className="text-sm text-slate-500">
              Share this contract for review to get feedback before sending for signature.
            </p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            {summary && (
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="flex flex-wrap gap-3 text-sm">
                    {summary.approved > 0 && (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="w-4 h-4" />
                        {summary.approved} approved
                      </span>
                    )}
                    {summary.changesRequested > 0 && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <AlertCircle className="w-4 h-4" />
                        {summary.changesRequested} changes requested
                      </span>
                    )}
                    {summary.pending > 0 && (
                      <span className="flex items-center gap-1 text-slate-500">
                        <Clock className="w-4 h-4" />
                        {summary.pending} pending
                      </span>
                    )}
                    {summary.unresolvedComments > 0 && (
                      <span className="flex items-center gap-1 text-blue-600">
                        <MessageCircle className="w-4 h-4" />
                        {summary.unresolvedComments} unresolved
                      </span>
                    )}
                </div>
              </div>
            )}

            {/* Reviews List */}
            <div className="divide-y divide-slate-100">
              {reviews.map((review) => {
          const statusConfig = getStatusConfig(review.status);
          const StatusIcon = statusConfig.icon;
          const isExpanded = expandedReviews.has(review.id);
          const unresolvedCount = review.comments.filter((c) => !c.resolved && c.author_type === "reviewer").length;

          return (
            <div key={review.id} className="bg-white">
              {/* Review Header */}
              <button
                onClick={() => toggleReviewExpanded(review.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${statusConfig.bg} flex items-center justify-center`}>
                    <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">
                        {review.reviewer_name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                      {unresolvedCount > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {unresolvedCount} unresolved
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500">
                      {review.reviewer_email} &middot;{" "}
                      {review.responded_at
                        ? `Responded ${formatDate(review.responded_at)}`
                        : review.viewed_at
                        ? `Viewed ${formatDate(review.viewed_at)}`
                        : `Sent ${formatDate(review.created_at)}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {review.comments.length > 0 && (
                    <span className="text-sm text-slate-500">
                      {review.comments.length} comment{review.comments.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-4">
                  {/* Response Message */}
                  {review.response_message && (
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <p className="text-sm font-medium text-slate-700 mb-1">
                        Review Message:
                      </p>
                      <p className="text-sm text-slate-600">{review.response_message}</p>
                    </div>
                  )}

                  {/* Comments */}
                  {review.comments.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-slate-700">Comments</h4>
                      {review.comments
                        .filter((c) => !c.parent_comment_id) // Only show root comments
                        .map((comment) => {
                          const replies = review.comments.filter(
                            (c) => c.parent_comment_id === comment.id
                          );
                          const isOwnerComment = comment.author_type === "owner";

                          return (
                            <div
                              key={comment.id}
                              className={`rounded-lg border ${
                                comment.resolved
                                  ? "bg-slate-50 border-slate-200"
                                  : isOwnerComment
                                  ? "bg-white border-slate-200"
                                  : "bg-white border-amber-200"
                              }`}
                            >
                              <div className="p-3">
                                {/* Comment Header */}
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                        isOwnerComment
                                          ? "bg-[#202e46] text-white"
                                          : "bg-amber-100 text-amber-700"
                                      }`}
                                    >
                                      {comment.author_name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-sm font-medium text-slate-900">
                                      {comment.author_name}
                                      {isOwnerComment && (
                                        <span className="ml-1 text-xs text-slate-500">(You)</span>
                                      )}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                      {formatDate(comment.created_at)} at {formatTime(comment.created_at)}
                                    </span>
                                  </div>

                                  {/* Resolve Button (only for reviewer comments) */}
                                  {!isOwnerComment && (
                                    <button
                                      onClick={() => handleResolveComment(comment.id, !comment.resolved)}
                                      disabled={resolvingComment === comment.id}
                                      className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                                        comment.resolved
                                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                      }`}
                                    >
                                      {resolvingComment === comment.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : comment.resolved ? (
                                        <>
                                          <Check className="w-3 h-3" />
                                          Resolved
                                        </>
                                      ) : (
                                        <>
                                          <Check className="w-3 h-3" />
                                          Resolve
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>

                                {/* Selected Text Quote */}
                                {comment.selected_text && (
                                  <div className="mb-2 text-xs bg-amber-50 border-l-2 border-amber-400 px-3 py-2 text-slate-600 italic rounded-r">
                                    "{comment.selected_text}"
                                  </div>
                                )}

                                {/* Clause Reference */}
                                {comment.clause_id && !comment.selected_text && (
                                  <div className="mb-2 text-xs text-slate-500">
                                    On clause: {comment.clause_id}
                                  </div>
                                )}

                                {/* Comment Content */}
                                <p className={`text-sm ${comment.resolved ? "text-slate-500" : "text-slate-700"}`}>
                                  {comment.content}
                                </p>

                                {/* Replies */}
                                {replies.length > 0 && (
                                  <div className="mt-3 pl-4 border-l-2 border-slate-200 space-y-2">
                                    {replies.map((reply) => (
                                      <div key={reply.id} className="text-sm">
                                        <div className="flex items-center gap-2 mb-1">
                                          <div
                                            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                                              reply.author_type === "owner"
                                                ? "bg-[#202e46] text-white"
                                                : "bg-amber-100 text-amber-700"
                                            }`}
                                          >
                                            {reply.author_name.charAt(0).toUpperCase()}
                                          </div>
                                          <span className="font-medium text-slate-900">
                                            {reply.author_name}
                                          </span>
                                          <span className="text-xs text-slate-400">
                                            {formatDate(reply.created_at)}
                                          </span>
                                        </div>
                                        <p className="text-slate-600 pl-7">{reply.content}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Reply Input */}
                                {!isOwnerComment && !comment.resolved && (
                                  <div className="mt-3">
                                    {replyingTo === comment.id ? (
                                      <div className="flex gap-2">
                                        <input
                                          type="text"
                                          value={replyContent}
                                          onChange={(e) => setReplyContent(e.target.value)}
                                          placeholder="Write a reply..."
                                          className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202e46]/20 focus:border-[#202e46]"
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                              e.preventDefault();
                                              handleSubmitReply(comment.id);
                                            }
                                            if (e.key === "Escape") {
                                              setReplyingTo(null);
                                              setReplyContent("");
                                            }
                                          }}
                                          autoFocus
                                        />
                                        <button
                                          onClick={() => handleSubmitReply(comment.id)}
                                          disabled={!replyContent.trim() || submittingReply}
                                          className="px-3 py-1.5 bg-[#202e46] text-white rounded-lg hover:bg-[#1a2539] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                          {submittingReply ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                          ) : (
                                            <Send className="w-4 h-4" />
                                          )}
                                        </button>
                                        <button
                                          onClick={() => {
                                            setReplyingTo(null);
                                            setReplyContent("");
                                          }}
                                          className="px-2 py-1.5 text-slate-500 hover:text-slate-700"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setReplyingTo(comment.id)}
                                        className="text-xs text-slate-500 hover:text-slate-700"
                                      >
                                        Reply
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-2">
                      No comments on this review yet.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

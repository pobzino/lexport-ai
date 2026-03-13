"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  FileText,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Send,
  Clock,
  User,
  Loader2,
  ThumbsUp,
  MessageCircle,
  X,
  MessageSquarePlus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { showError } from "@/lib/toast";

interface ReviewRequest {
  id: string;
  reviewerName: string;
  reviewerEmail: string;
  status: string;
  message: string | null;
  expiresAt: string;
  viewedAt: string | null;
  respondedAt: string | null;
  responseMessage: string | null;
}

interface Contract {
  id: string;
  title: string;
  type: string;
  content: {
    preamble?: string;
    recitals?: string;
    clauses?: Array<{
      id: string;
      title: string;
      content: string;
      order: number;
    }>;
    signatureBlock?: string;
  };
  status: string;
}

interface Comment {
  id: string;
  author_type: string;
  author_name: string;
  content: string;
  clause_id: string | null;
  selected_text: string | null;
  created_at: string;
  resolved: boolean;
}

interface Owner {
  name: string;
  email: string;
}

export default function ReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewRequest, setReviewRequest] = useState<ReviewRequest | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseAction, setResponseAction] = useState<"approve" | "request_changes" | null>(null);
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);
  const [inlineComment, setInlineComment] = useState("");
  const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set());

  // Text selection state
  const [selectionPopup, setSelectionPopup] = useState<{
    visible: boolean;
    x: number;
    y: number;
    text: string;
    clauseId: string;
  } | null>(null);
  const [selectionComment, setSelectionComment] = useState("");
  const [showSelectionCommentInput, setShowSelectionCommentInput] = useState(false);

  useEffect(() => {
    fetchReviewData();
  }, [token]);

  async function fetchReviewData() {
    try {
      const response = await fetch(`/api/review/${token}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to load review");
        return;
      }

      setReviewRequest(data.reviewRequest);
      setContract(data.contract);
      setComments(data.comments || []);
      setOwner(data.owner);
    } catch (err) {
      setError("Failed to load review data");
    } finally {
      setLoading(false);
    }
  }

  // Helper functions for inline comments
  function getClauseComments(clauseId: string): Comment[] {
    return comments.filter((c) => c.clause_id === clauseId);
  }

  function getGeneralComments(): Comment[] {
    return comments.filter((c) => !c.clause_id);
  }

  function toggleClauseExpanded(clauseId: string) {
    setExpandedClauses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(clauseId)) {
        newSet.delete(clauseId);
      } else {
        newSet.add(clauseId);
      }
      return newSet;
    });
  }

  // Handle text selection within a clause
  function handleTextSelection(e: React.MouseEvent, clauseId: string) {
    // Small delay to let the selection complete
    setTimeout(() => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();

      if (selectedText && selectedText.length > 2) {
        const range = selection?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();

        if (rect) {
          // Use viewport coordinates for fixed positioning
          // Position above the selection, centered
          const x = rect.left + rect.width / 2;
          const y = rect.top - 10; // Just above the selection in viewport coords

          setSelectionPopup({
            visible: true,
            x: Math.max(200, Math.min(x, window.innerWidth - 200)), // Keep within viewport
            y: Math.max(60, y), // Don't go above viewport
            text: selectedText,
            clauseId,
          });
          setShowSelectionCommentInput(false);
          setSelectionComment("");
        }
      }
    }, 10);
  }

  // Submit comment on selected text
  async function handleSelectionComment() {
    if (!selectionPopup || !selectionComment.trim()) return;

    setSubmittingComment(true);
    try {
      const response = await fetch(`/api/review/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: selectionComment,
          clauseId: selectionPopup.clauseId,
          selectedText: selectionPopup.text,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setComments([...comments, data.comment]);
        setSelectionPopup(null);
        setSelectionComment("");
        setShowSelectionCommentInput(false);
        // Expand the clause to show the new comment
        setExpandedClauses((prev) => new Set(prev).add(selectionPopup.clauseId));
      }
    } catch (err) {
      console.error("Failed to add comment:", err);
    } finally {
      setSubmittingComment(false);
    }
  }

  // Close selection popup when clicking outside
  function handleDocumentClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest(".selection-popup")) {
      setSelectionPopup(null);
      setShowSelectionCommentInput(false);
    }
  }

  useEffect(() => {
    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  async function handleAddComment(clauseId?: string) {
    const commentText = clauseId ? inlineComment : newComment;
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    try {
      const response = await fetch(`/api/review/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: commentText,
          clauseId: clauseId || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setComments([...comments, data.comment]);
        if (clauseId) {
          setInlineComment("");
          // Keep the clause expanded to show the new comment
          setExpandedClauses((prev) => new Set(prev).add(clauseId));
        } else {
          setNewComment("");
        }
      }
    } catch (err) {
      console.error("Failed to add comment:", err);
      showError("Failed to add comment. Please try again.");
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleSubmitResponse() {
    if (!responseAction) return;

    setSubmittingResponse(true);
    try {
      const response = await fetch(`/api/review/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: responseAction,
          message: responseMessage || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setReviewRequest((prev) =>
          prev ? { ...prev, status: data.status, respondedAt: new Date().toISOString() } : null
        );
        setShowResponseModal(false);
      } else {
        showError(data.error || "Failed to submit response. Please try again.");
      }
    } catch (err) {
      console.error("Failed to submit response:", err);
      showError("Failed to submit response. Please try again.");
    } finally {
      setSubmittingResponse(false);
    }
  }

  function formatContractType(type: string): string {
    const types: Record<string, string> = {
      nda_mutual: "Mutual NDA",
      nda_one_way: "One-Way NDA",
      independent_contractor: "Independent Contractor Agreement",
      consulting_agreement: "Consulting Agreement",
      safe_note: "SAFE Note",
      freelance_service: "Freelance Service Agreement",
    };
    return types[type] || type;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#202e46] mx-auto mb-4" />
          <p className="text-slate-600">Loading contract...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            Unable to Load Review
          </h1>
          <p className="text-slate-600">{error}</p>
          <Link href="/" className="inline-flex items-center gap-2 mt-4 text-sm text-[#529ec6] hover:text-[#4189b1] transition-colors">
            Go to Lexport
          </Link>
        </div>
      </div>
    );
  }

  if (!reviewRequest || !contract) {
    return null;
  }

  const hasResponded = reviewRequest.status === "approved" || reviewRequest.status === "changes_requested";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-[#202e46] text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex-shrink-0">
                <Image src="/light-logo.png" alt="Lexport" width={100} height={30} className="h-7 w-auto" />
              </Link>
              <div className="w-px h-8 bg-white/20" />
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">{contract.title}</h1>
                <p className="text-white/70 text-sm">
                  {formatContractType(contract.type)} • Draft Review
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <User className="w-4 h-4" />
              <span>Reviewing as {reviewRequest.reviewerName}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Draft Notice Banner */}
      <div className="bg-amber-50 border-b border-amber-200">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                This is a draft for review only
              </p>
              <p className="text-xs text-amber-600">
                No signature is required. Review the contract and provide your feedback before it&apos;s finalized.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Owner Message */}
      {reviewRequest.message && (
        <div className="max-w-6xl mx-auto px-4 mt-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Message from {owner?.name || "Contract Owner"}
                </p>
                <p className="text-sm text-blue-700 mt-1">{reviewRequest.message}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contract Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">
                  Contract Content
                </h2>
              </div>

              <div className="p-6 space-y-6">
                {/* Preamble */}
                {contract.content?.preamble && (
                  <div>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {contract.content.preamble}
                    </p>
                  </div>
                )}

                {/* Recitals */}
                {contract.content?.recitals && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                      Recitals
                    </h3>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {contract.content.recitals}
                    </p>
                  </div>
                )}

                {/* Clauses */}
                {contract.content?.clauses && contract.content.clauses.length > 0 && (
                  <div className="space-y-4">
                    {contract.content.clauses
                      .sort((a, b) => a.order - b.order)
                      .map((clause, index) => {
                        const clauseComments = getClauseComments(clause.id);
                        const isExpanded = expandedClauses.has(clause.id);
                        const hasComments = clauseComments.length > 0;

                        return (
                          <div
                            key={clause.id}
                            className={`border-l-2 rounded-r-lg transition-all ${
                              isExpanded
                                ? "border-[#202e46] bg-slate-50"
                                : hasComments
                                ? "border-amber-400"
                                : "border-slate-200"
                            }`}
                          >
                            {/* Clause Header - NOT clickable, separate button for expand */}
                            <div className="p-4">
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-slate-900">
                                    {index + 1}. {clause.title}
                                  </h3>
                                  {hasComments && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                                      <MessageSquare className="w-3 h-3" />
                                      {clauseComments.length}
                                    </span>
                                  )}
                                </div>
                                {/* Explicit expand/collapse button */}
                                <button
                                  onClick={() => toggleClauseExpanded(clause.id)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                    isExpanded
                                      ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  }`}
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="w-3.5 h-3.5" />
                                      Hide
                                    </>
                                  ) : (
                                    <>
                                      <MessageSquarePlus className="w-3.5 h-3.5" />
                                      {hasComments ? `${clauseComments.length} Comments` : "Comment"}
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* Clause Content - Freely selectable, no click handlers interfering */}
                              <div
                                className="text-slate-700 leading-relaxed whitespace-pre-wrap"
                                style={{ userSelect: "text" }}
                                onMouseUp={(e) => handleTextSelection(e, clause.id)}
                              >
                                {/* Render clause content with highlighted commented text */}
                                {(() => {
                                  const commentedTexts = clauseComments
                                    .filter((c) => c.selected_text)
                                    .map((c) => c.selected_text as string);

                                  if (commentedTexts.length === 0) {
                                    return clause.content;
                                  }

                                  // Simple highlighting - split content by commented texts
                                  let content = clause.content;
                                  const parts: React.ReactNode[] = [];
                                  let lastIndex = 0;

                                  commentedTexts.forEach((text, i) => {
                                    const idx = content.indexOf(text, lastIndex);
                                    if (idx !== -1) {
                                      // Add text before highlight
                                      if (idx > lastIndex) {
                                        parts.push(content.slice(lastIndex, idx));
                                      }
                                      // Add highlighted text
                                      parts.push(
                                        <mark
                                          key={`highlight-${i}`}
                                          className="bg-amber-200 text-amber-900 px-0.5 rounded"
                                          title="Has comment"
                                        >
                                          {text}
                                        </mark>
                                      );
                                      lastIndex = idx + text.length;
                                    }
                                  });

                                  // Add remaining text
                                  if (lastIndex < content.length) {
                                    parts.push(content.slice(lastIndex));
                                  }

                                  return parts.length > 0 ? parts : content;
                                })()}
                              </div>

                              {/* Hint for text selection */}
                              <p className="mt-3 text-xs text-slate-400 italic">
                                Select any text above to add an inline comment
                              </p>
                            </div>

                            {/* Inline Comments Panel */}
                            {isExpanded && (
                              <div className="border-t border-slate-200 bg-white rounded-br-lg">
                                {/* Existing Comments */}
                                {clauseComments.length > 0 && (
                                  <div className="divide-y divide-slate-100">
                                    {clauseComments.map((comment) => (
                                      <div key={comment.id} className="px-4 py-3">
                                        <div className="flex items-center gap-2 mb-1">
                                          <div
                                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                              comment.author_type === "owner"
                                                ? "bg-[#202e46] text-white"
                                                : "bg-amber-100 text-amber-700"
                                            }`}
                                          >
                                            {comment.author_name.charAt(0).toUpperCase()}
                                          </div>
                                          <span className="text-sm font-medium text-slate-900">
                                            {comment.author_name}
                                          </span>
                                          <span className="text-xs text-slate-400">
                                            {new Date(comment.created_at).toLocaleDateString()}
                                          </span>
                                        </div>
                                        {/* Show selected text if available */}
                                        {comment.selected_text && (
                                          <div className="ml-8 mb-2 text-xs bg-amber-50 border-l-2 border-amber-400 px-2 py-1 text-slate-600 italic">
                                            "{comment.selected_text}"
                                          </div>
                                        )}
                                        <p className="text-sm text-slate-700 pl-8">
                                          {comment.content}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Add Comment Input */}
                                <div className="p-4 border-t border-slate-100">
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={selectedClauseId === clause.id ? inlineComment : ""}
                                      onChange={(e) => {
                                        setSelectedClauseId(clause.id);
                                        setInlineComment(e.target.value);
                                      }}
                                      onFocus={() => setSelectedClauseId(clause.id)}
                                      placeholder={`Add comment on "${clause.title}"...`}
                                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#202e46]/20 focus:border-[#202e46]"
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                          e.preventDefault();
                                          handleAddComment(clause.id);
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={() => handleAddComment(clause.id)}
                                      disabled={
                                        (selectedClauseId !== clause.id || !inlineComment.trim()) &&
                                        submittingComment
                                      }
                                      className="px-3 py-2 bg-[#202e46] text-white rounded-lg hover:bg-[#1a2539] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                      {submittingComment && selectedClauseId === clause.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Send className="w-4 h-4" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Signature Block */}
                {contract.content?.signatureBlock && (
                  <div className="border-t border-slate-200 pt-6 mt-6">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                      Signature Block
                    </h3>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {contract.content.signatureBlock}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Response Status or Actions */}
            {hasResponded ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      reviewRequest.status === "approved"
                        ? "bg-emerald-100"
                        : "bg-amber-100"
                    }`}
                  >
                    {reviewRequest.status === "approved" ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <MessageCircle className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {reviewRequest.status === "approved"
                        ? "You Approved"
                        : "Changes Requested"}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {reviewRequest.respondedAt &&
                        new Date(reviewRequest.respondedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-600">
                  {reviewRequest.status === "approved"
                    ? "You've approved this contract. The owner can now proceed with sending it for signature."
                    : "You've requested changes. The owner will review your feedback."}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">
                  Submit Your Review
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setResponseAction("approve");
                      setShowResponseModal(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Approve Contract
                  </button>
                  <button
                    onClick={() => {
                      setResponseAction("request_changes");
                      setShowResponseModal(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Request Changes
                  </button>
                </div>
              </div>
            )}

            {/* Comments Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="p-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Comments ({comments.length})
                </h3>
                {/* Show inline vs general breakdown */}
                {comments.length > 0 && (
                  <div className="flex gap-3 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      {comments.filter((c) => c.clause_id).length} on clauses
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      {getGeneralComments().length} general
                    </span>
                  </div>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {getGeneralComments().length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-sm">
                    {comments.length > 0 ? (
                      <>
                        <p>All comments are on specific clauses.</p>
                        <p className="text-xs mt-1">Click on a clause to view its comments.</p>
                      </>
                    ) : (
                      <>
                        <p>No comments yet.</p>
                        <p className="text-xs mt-1">Click on a clause to add inline feedback, or add a general comment below.</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {getGeneralComments().map((comment) => (
                      <div key={comment.id} className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                              comment.author_type === "owner"
                                ? "bg-[#202e46] text-white"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {comment.author_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-slate-900">
                            {comment.author_name}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 pl-8">
                          {comment.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add General Comment */}
              <div className="p-4 border-t border-slate-200">
                <p className="text-xs text-slate-500 mb-2">General comment (not tied to a clause)</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a general comment..."
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#202e46]/20 focus:border-[#202e46]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                  />
                  <button
                    onClick={() => handleAddComment()}
                    disabled={!newComment.trim() || submittingComment}
                    className="px-3 py-2 bg-[#202e46] text-white rounded-lg hover:bg-[#1a2539] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submittingComment && !selectedClauseId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Expiration Info */}
            <div className="bg-slate-100 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock className="w-4 h-4" />
                <span>
                  Review link expires{" "}
                  {new Date(reviewRequest.expiresAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Text Selection Popup - Floating toolbar */}
      {selectionPopup && (
        <div
          className="selection-popup fixed z-50"
          style={{
            left: selectionPopup.x,
            top: selectionPopup.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          {!showSelectionCommentInput ? (
            <div className="bg-[#202e46] text-white rounded-lg shadow-2xl p-1 flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                  setShowSelectionCommentInput(true);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium hover:bg-white/20 rounded-md transition-colors"
              >
                <MessageSquarePlus className="w-4 h-4" />
                Comment
              </button>
              <div className="w-px h-6 bg-white/20" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                  setSelectionPopup(null);
                  window.getSelection()?.removeAllRanges();
                }}
                className="p-2 hover:bg-white/20 rounded-md transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
              {/* Arrow pointing down to selection */}
              <div className="absolute left-1/2 top-full transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-[#202e46]" />
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-80">
              <div className="p-4 border-b border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-900">Add Comment</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.nativeEvent.stopImmediatePropagation();
                      setSelectionPopup(null);
                      setShowSelectionCommentInput(false);
                      window.getSelection()?.removeAllRanges();
                    }}
                    className="p-1 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
                <div className="text-xs text-slate-500 mb-1">Selected text:</div>
                <p className="text-sm text-slate-700 bg-amber-50 border-l-2 border-amber-400 px-3 py-2 rounded-r line-clamp-3 italic">
                  "{selectionPopup.text}"
                </p>
              </div>
              <div className="p-4">
                <textarea
                  value={selectionComment}
                  onChange={(e) => setSelectionComment(e.target.value)}
                  placeholder="Write your comment..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-[#202e46]/20 focus:border-[#202e46]"
                  autoFocus
                  onClick={(e) => {
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleSelectionComment();
                    }
                  }}
                />
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-slate-400">⌘+Enter to submit</span>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.nativeEvent.stopImmediatePropagation();
                        setShowSelectionCommentInput(false);
                      }}
                      className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.nativeEvent.stopImmediatePropagation();
                        handleSelectionComment();
                      }}
                      disabled={!selectionComment.trim() || submittingComment}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-[#202e46] text-white text-sm font-medium rounded-lg hover:bg-[#1a2539] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {submittingComment ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Add
                    </button>
                  </div>
                </div>
              </div>
              {/* Arrow pointing down to selection */}
              <div className="absolute left-1/2 top-full transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-white" />
            </div>
          )}
        </div>
      )}

      {/* Response Modal */}
      {showResponseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {responseAction === "approve" ? "Approve Contract" : "Request Changes"}
              </h3>
              <button
                onClick={() => setShowResponseModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-slate-600 mb-4">
                {responseAction === "approve"
                  ? "Confirm that you've reviewed this contract and approve it for signing."
                  : "Let the contract owner know what changes you'd like to see."}
              </p>

              <textarea
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                placeholder={
                  responseAction === "approve"
                    ? "Optional: Add a message..."
                    : "Describe the changes you'd like..."
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-[#202e46]/20 focus:border-[#202e46]"
              />
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50 rounded-b-xl">
              <button
                onClick={() => setShowResponseModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitResponse}
                disabled={submittingResponse}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                  responseAction === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-[#202e46] hover:bg-[#1a2539]"
                } disabled:opacity-50`}
              >
                {submittingResponse ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : responseAction === "approve" ? (
                  "Confirm Approval"
                ) : (
                  "Submit Feedback"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

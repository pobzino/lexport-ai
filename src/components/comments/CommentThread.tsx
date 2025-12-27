"use client";

import { useState } from "react";
import { CheckCircle2, RotateCcw, Loader2, MessageCircle } from "lucide-react";
import type { CommentWithUser } from "@/db/types";
import { CommentItem } from "./CommentItem";
import { CommentInput } from "./CommentInput";

interface CommentThreadProps {
  comment: CommentWithUser;
  currentUserId: string;
  isContractOwner: boolean;
  contractId: string;
  onEdit: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onReply: (parentCommentId: string, content: string) => Promise<void>;
  onResolve: (commentId: string, unresolve?: boolean) => Promise<void>;
}

export function CommentThread({
  comment,
  currentUserId,
  isContractOwner,
  contractId,
  onEdit,
  onDelete,
  onReply,
  onResolve,
}: CommentThreadProps) {
  const [isResolving, setIsResolving] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);

  const handleResolve = async (unresolve = false) => {
    setIsResolving(true);
    try {
      await onResolve(comment.id, unresolve);
    } finally {
      setIsResolving(false);
    }
  };

  const handleReply = async (content: string) => {
    await onReply(comment.id, content);
    setShowReplyInput(false);
  };

  const replyCount = comment.replies?.length || 0;

  return (
    <div
      className={`p-4 rounded-lg border transition-all ${
        comment.is_resolved
          ? "bg-slate-50 border-slate-200 opacity-75"
          : "bg-white border-slate-200 hover:border-violet-200"
      }`}
    >
      {/* Resolved badge */}
      {comment.is_resolved && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 mb-2">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Resolved</span>
        </div>
      )}

      {/* Main comment */}
      <CommentItem
        comment={comment}
        currentUserId={currentUserId}
        isContractOwner={isContractOwner}
        onReply={() => setShowReplyInput(true)}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              isContractOwner={isContractOwner}
              onEdit={onEdit}
              onDelete={onDelete}
              isReply
            />
          ))}
        </div>
      )}

      {/* Reply input */}
      {showReplyInput && (
        <div className="mt-3">
          <CommentInput
            onSubmit={handleReply}
            onCancel={() => setShowReplyInput(false)}
            placeholder="Write a reply..."
            autoFocus
            isReply
          />
        </div>
      )}

      {/* Thread actions */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-3">
          {!showReplyInput && (
            <button
              onClick={() => setShowReplyInput(true)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-violet-600"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              {replyCount > 0 ? `${replyCount} ${replyCount === 1 ? "reply" : "replies"}` : "Reply"}
            </button>
          )}
        </div>

        {/* Resolve/Unresolve button */}
        <button
          onClick={() => handleResolve(comment.is_resolved)}
          disabled={isResolving}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
            comment.is_resolved
              ? "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              : "text-emerald-600 hover:bg-emerald-50"
          } disabled:opacity-50`}
        >
          {isResolving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : comment.is_resolved ? (
            <>
              <RotateCcw className="w-3.5 h-3.5" />
              Reopen
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Resolve
            </>
          )}
        </button>
      </div>
    </div>
  );
}

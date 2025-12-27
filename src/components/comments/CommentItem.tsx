"use client";

import { useState } from "react";
import {
  MoreVertical,
  Edit2,
  Trash2,
  Reply,
  Check,
  X,
  Loader2,
  ExternalLink,
} from "lucide-react";
import type { CommentWithUser } from "@/db/types";

interface CommentItemProps {
  comment: CommentWithUser;
  currentUserId: string;
  isContractOwner: boolean;
  onReply?: (commentId: string) => void;
  onEdit?: (commentId: string, content: string) => Promise<void>;
  onDelete?: (commentId: string) => Promise<void>;
  onJumpToSelection?: (clauseId: string, selectionStart: number, selectionEnd: number) => void;
  isReply?: boolean;
}

export function CommentItem({
  comment,
  currentUserId,
  isContractOwner,
  onReply,
  onEdit,
  onDelete,
  onJumpToSelection,
  isReply = false,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isAuthor = comment.user_id === currentUserId;
  const canEdit = isAuthor;
  const canDelete = isAuthor || isContractOwner;

  const handleSaveEdit = async () => {
    if (!editContent.trim() || !onEdit) return;
    setIsSaving(true);
    try {
      await onEdit(comment.id, editContent);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save edit:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(comment.id);
    } catch (error) {
      console.error("Failed to delete:", error);
      setIsDeleting(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getUserInitials = (user: CommentWithUser["user"]) => {
    if (user.name) {
      return user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user.email.slice(0, 2).toUpperCase();
  };

  const getUserDisplayName = (user: CommentWithUser["user"]) => {
    return user.name || user.email.split("@")[0];
  };

  return (
    <div
      className={`group ${isReply ? "pl-8 border-l-2 border-slate-100" : ""}`}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {comment.user.image ? (
            <img
              src={comment.user.image}
              alt={getUserDisplayName(comment.user)}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-medium">
              {getUserInitials(comment.user)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-slate-900 truncate">
              {getUserDisplayName(comment.user)}
            </span>
            {isAuthor && (
              <span className="text-xs text-slate-400">(you)</span>
            )}
            <span className="text-xs text-slate-400">
              {formatTime(comment.created_at)}
            </span>
            {comment.updated_at !== comment.created_at && (
              <span className="text-xs text-slate-400">(edited)</span>
            )}
          </div>

          {/* Selected text quote - clickable to jump to highlight */}
          {comment.selected_text && (
            <button
              onClick={() => {
                if (onJumpToSelection && comment.clause_id && comment.selection_start !== null && comment.selection_end !== null) {
                  onJumpToSelection(comment.clause_id, comment.selection_start, comment.selection_end);
                }
              }}
              className="mb-2 pl-3 border-l-2 border-amber-300 bg-amber-50 rounded-r py-1 px-2 w-full text-left hover:bg-amber-100 transition-colors group/quote cursor-pointer"
              title="Jump to highlighted text"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs text-amber-800 italic line-clamp-2 flex-1">
                  &ldquo;{comment.selected_text}&rdquo;
                </p>
                <ExternalLink className="w-3 h-3 text-amber-600 opacity-0 group-hover/quote:opacity-100 ml-2 flex-shrink-0" />
              </div>
            </button>
          )}

          {/* Comment content */}
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                rows={3}
                autoFocus
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving || !editContent.trim()}
                  className="flex items-center gap-1 px-3 py-1 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.content);
                  }}
                  className="flex items-center gap-1 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-3 h-3" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-700 whitespace-pre-wrap">
              {comment.content}
            </p>
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {!isReply && onReply && (
                <button
                  onClick={() => onReply(comment.id)}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-violet-600"
                >
                  <Reply className="w-3 h-3" />
                  Reply
                </button>
              )}

              {(canEdit || canDelete) && (
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </button>

                  {showMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowMenu(false)}
                      />
                      <div className="absolute left-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                        {canEdit && (
                          <button
                            onClick={() => {
                              setIsEditing(true);
                              setShowMenu(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => {
                              handleDelete();
                              setShowMenu(false);
                            }}
                            disabled={isDeleting}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                            Delete
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

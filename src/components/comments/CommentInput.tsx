"use client";

import { useState, useRef, useEffect } from "react";
import { Send, X, Loader2 } from "lucide-react";

interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  isReply?: boolean;
  selectedText?: string;
}

export function CommentInput({
  onSubmit,
  onCancel,
  placeholder = "Add a comment...",
  autoFocus = false,
  isReply = false,
  selectedText,
}: CommentInputProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content.trim());
      setContent("");
    } catch (error) {
      console.error("Failed to submit comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape" && onCancel) {
      onCancel();
    }
  };

  return (
    <div className={`${isReply ? "pl-8 border-l-2 border-slate-100" : ""}`}>
      {/* Selected text preview */}
      {selectedText && (
        <div className="mb-2 pl-3 border-l-2 border-amber-300 bg-amber-50 rounded-r py-1 px-2">
          <p className="text-xs text-amber-800 italic line-clamp-2">
            &ldquo;{selectedText}&rdquo;
          </p>
        </div>
      )}

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-20 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
          rows={isReply ? 2 : 3}
        />

        <div className="absolute right-2 bottom-2 flex items-center gap-1">
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="p-1.5 bg-violet-600 text-white rounded hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Send (Cmd+Enter)"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-1">
        Press {navigator.platform?.includes("Mac") ? "Cmd" : "Ctrl"}+Enter to
        send
      </p>
    </div>
  );
}

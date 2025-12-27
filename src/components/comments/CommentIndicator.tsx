"use client";

import { MessageCircle } from "lucide-react";

interface CommentIndicatorProps {
  count: number;
  onClick?: () => void;
  isActive?: boolean;
}

export function CommentIndicator({
  count,
  onClick,
  isActive = false,
}: CommentIndicatorProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all ${
        isActive
          ? "bg-violet-100 text-violet-700 ring-1 ring-violet-200"
          : count > 0
          ? "bg-slate-100 text-slate-600 hover:bg-violet-50 hover:text-violet-600"
          : "text-slate-400 hover:bg-violet-50 hover:text-violet-600"
      }`}
      title={count > 0 ? `${count} ${count === 1 ? "comment" : "comments"}` : "Add comment"}
    >
      <MessageCircle className="w-3 h-3" />
      {count > 0 && <span>{count}</span>}
    </button>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import {
  MessageSquarePlus,
  MessageCircle,
  Lightbulb,
  FileEdit,
  Scale,
  Zap,
  ChevronDown
} from "lucide-react";

interface SelectionPopupProps {
  position: { x: number; y: number };
  selectedText: string;
  onAddComment: () => void;
  onQuickAction: (action: string, prompt: string) => void;
  onAddToChat: (text: string) => void;
  onClose: () => void;
}

type AIShortcut = {
  icon: React.ReactNode;
  label: string;
  action: string;
  prompt: string;
};

const AI_SHORTCUTS: AIShortcut[] = [
  {
    icon: <Lightbulb className="w-3.5 h-3.5" />,
    label: "Explain",
    action: "Explain this",
    prompt: "Explain the following clause in plain English, highlighting key points and implications:",
  },
  {
    icon: <FileEdit className="w-3.5 h-3.5" />,
    label: "Simplify",
    action: "Simplify",
    prompt: "Rewrite the following clause in simpler, clearer language while maintaining its legal meaning:",
  },
  {
    icon: <Scale className="w-3.5 h-3.5" />,
    label: "Risks",
    action: "Identify risks",
    prompt: "Identify potential risks and issues with the following clause:",
  },
  {
    icon: <Zap className="w-3.5 h-3.5" />,
    label: "Improve",
    action: "Suggest improvements",
    prompt: "Suggest improvements to make the following clause more favorable:",
  },
];

export function SelectionPopup({
  position,
  selectedText,
  onAddComment,
  onQuickAction,
  onAddToChat,
  onClose,
}: SelectionPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [showMore, setShowMore] = useState(false);
  const isClickingRef = useRef(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isClickingRef.current) return;
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (isClickingRef.current) return;
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleSelectionChange = () => {
      if (isClickingRef.current) return;
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.toString().trim() === "") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [onClose]);

  const popupStyle: React.CSSProperties = {
    position: "fixed",
    left: `${position.x}px`,
    top: `${position.y - 50}px`,
    transform: "translateX(-50%)",
    zIndex: 1000,
  };

  if (position.y < 80) {
    popupStyle.top = `${position.y + 25}px`;
  }

  const handleQuickAction = (shortcut: AIShortcut) => {
    isClickingRef.current = true;
    const fullPrompt = `${shortcut.prompt}\n\n"${selectedText}"`;
    onQuickAction(shortcut.action, fullPrompt);
  };

  const handleAddToChat = () => {
    isClickingRef.current = true;
    onAddToChat(selectedText);
  };

  return (
    <div
      ref={popupRef}
      style={popupStyle}
      className="animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Main actions row */}
        <div className="flex items-center">
          {/* Quick AI Actions */}
          {AI_SHORTCUTS.map((shortcut, index) => (
            <button
              key={index}
              onMouseDown={() => { isClickingRef.current = true; }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleQuickAction(shortcut);
              }}
              title={shortcut.action}
              className="flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-[#529ec6]/10 hover:text-[#529ec6] transition-colors border-r border-slate-100"
            >
              <span className="text-[#529ec6]">{shortcut.icon}</span>
              <span className="hidden sm:inline">{shortcut.label}</span>
            </button>
          ))}

          {/* Divider */}
          <div className="w-px h-6 bg-slate-200 mx-0.5" />

          {/* Add to Chat - visible in main row */}
          <button
            onMouseDown={() => { isClickingRef.current = true; }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAddToChat();
            }}
            title="Add to AI chat"
            className="flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Chat</span>
          </button>

          {/* More dropdown toggle */}
          <button
            onMouseDown={() => { isClickingRef.current = true; }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowMore(!showMore);
            }}
            className={`flex items-center justify-center w-8 py-2 transition-colors border-l border-slate-100 ${showMore
                ? "bg-slate-100 text-slate-900"
                : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              }`}
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMore ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* More options dropdown */}
        {showMore && (
          <div className="border-t border-slate-100 bg-slate-50/50">
            {/* Add Comment */}
            <button
              onMouseDown={() => { isClickingRef.current = true; }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddComment();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-white transition-colors"
            >
              <MessageSquarePlus className="w-4 h-4 text-[#529ec6]" />
              Add Comment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

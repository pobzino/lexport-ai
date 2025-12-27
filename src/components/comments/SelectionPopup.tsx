"use client";

import { useEffect, useRef } from "react";
import { MessageSquarePlus } from "lucide-react";

interface SelectionPopupProps {
  position: { x: number; y: number };
  onAddComment: () => void;
  onClose: () => void;
}

export function SelectionPopup({
  position,
  onAddComment,
  onClose,
}: SelectionPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  // Use ref instead of state for synchronous updates
  // State updates don't propagate to event listener closures immediately
  const isClickingRef = useRef(false);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if we clicked Add Comment (user is now in commenting mode)
      if (isClickingRef.current) return;
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      // Don't close on Escape if we're in commenting mode
      if (isClickingRef.current) return;
      if (e.key === "Escape") {
        onClose();
      }
    };

    // Handle selection change - close if selection is cleared
    // but not if we're in the middle of clicking the Add Comment button
    const handleSelectionChange = () => {
      if (isClickingRef.current) return; // Don't close during Add Comment click
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

  // Calculate popup position (prefer above selection, fallback to below)
  const popupStyle: React.CSSProperties = {
    position: "fixed",
    left: `${position.x}px`,
    top: `${position.y - 45}px`, // Position above selection
    transform: "translateX(-50%)",
    zIndex: 1000,
  };

  // If too close to top, position below
  if (position.y < 60) {
    popupStyle.top = `${position.y + 25}px`;
  }

  return (
    <div
      ref={popupRef}
      style={popupStyle}
      className="animate-in fade-in zoom-in-95 duration-150"
    >
      <button
        onMouseDown={() => { isClickingRef.current = true; }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onAddComment();
        }}
        className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
      >
        <MessageSquarePlus className="w-4 h-4 text-violet-600" />
        Add Comment
      </button>
    </div>
  );
}

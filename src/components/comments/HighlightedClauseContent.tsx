"use client";

import { useMemo, useCallback, useRef } from "react";
import type { CommentWithUser } from "@/db/types";

interface TextSelection {
  clauseId: string;
  text: string;
  start: number;
  end: number;
  position: { x: number; y: number };
}

interface HighlightedClauseContentProps {
  clauseId: string;
  content: string;
  comments: CommentWithUser[];
  onHighlightClick: (commentId: string) => void;
  onTextSelect: (selection: TextSelection) => void;
  className?: string;
}

interface TextSegment {
  text: string;
  isHighlighted: boolean;
  commentIds: string[];
  start: number;
  end: number;
}

export function HighlightedClauseContent({
  clauseId,
  content,
  comments,
  onHighlightClick,
  onTextSelect,
  className = "",
}: HighlightedClauseContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Filter comments that have valid selection ranges
  const commentsWithSelection = useMemo(() => {
    return comments.filter(
      (c) =>
        c.selection_start !== null &&
        c.selection_end !== null &&
        c.selection_start >= 0 &&
        c.selection_end <= content.length &&
        c.selection_start < c.selection_end
    );
  }, [comments, content.length]);

  // Build segments with highlights
  const segments = useMemo(() => {
    if (commentsWithSelection.length === 0) {
      return [{ text: content, isHighlighted: false, commentIds: [], start: 0, end: content.length }];
    }

    // Create a map of positions to comment starts/ends
    const events: Array<{ pos: number; type: "start" | "end"; commentId: string }> = [];

    for (const comment of commentsWithSelection) {
      events.push({ pos: comment.selection_start!, type: "start", commentId: comment.id });
      events.push({ pos: comment.selection_end!, type: "end", commentId: comment.id });
    }

    // Sort events by position, with ends before starts at same position
    events.sort((a, b) => {
      if (a.pos !== b.pos) return a.pos - b.pos;
      return a.type === "end" ? -1 : 1;
    });

    const result: TextSegment[] = [];
    let currentPos = 0;
    const activeComments = new Set<string>();

    for (const event of events) {
      // Add segment before this event
      if (event.pos > currentPos) {
        result.push({
          text: content.slice(currentPos, event.pos),
          isHighlighted: activeComments.size > 0,
          commentIds: Array.from(activeComments),
          start: currentPos,
          end: event.pos,
        });
        currentPos = event.pos;
      }

      // Update active comments
      if (event.type === "start") {
        activeComments.add(event.commentId);
      } else {
        activeComments.delete(event.commentId);
      }
    }

    // Add remaining text
    if (currentPos < content.length) {
      result.push({
        text: content.slice(currentPos),
        isHighlighted: false,
        commentIds: [],
        start: currentPos,
        end: content.length,
      });
    }

    return result;
  }, [content, commentsWithSelection]);

  // Handle text selection
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      // Small delay to ensure selection is complete
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;

        const selectedText = selection.toString().trim();
        if (!selectedText || selectedText.length < 2) return;

        // Get the selection range
        const range = selection.getRangeAt(0);
        if (!contentRef.current?.contains(range.commonAncestorContainer)) return;

        // Calculate the character offset within the content
        const preSelectionRange = document.createRange();
        preSelectionRange.selectNodeContents(contentRef.current);
        preSelectionRange.setEnd(range.startContainer, range.startOffset);
        const start = preSelectionRange.toString().length;
        const end = start + selectedText.length;

        // Get position for popup
        const rect = range.getBoundingClientRect();
        const position = {
          x: rect.left + rect.width / 2,
          y: rect.top,
        };

        onTextSelect({
          clauseId,
          text: selectedText,
          start,
          end,
          position,
        });
      }, 10);
    },
    [clauseId, onTextSelect]
  );

  return (
    <div
      ref={contentRef}
      className={`whitespace-pre-wrap ${className}`}
      onMouseUp={handleMouseUp}
    >
      {segments.map((segment, index) => {
        if (!segment.isHighlighted) {
          return <span key={index}>{segment.text}</span>;
        }

        // Highlighted text
        return (
          <mark
            key={index}
            className="bg-amber-100 hover:bg-amber-200 cursor-pointer rounded-sm px-0.5 transition-all"
            data-start={segment.start}
            data-end={segment.end}
            onClick={() => {
              if (segment.commentIds.length > 0) {
                onHighlightClick(segment.commentIds[0]);
              }
            }}
            title={`${segment.commentIds.length} comment${segment.commentIds.length > 1 ? "s" : ""}`}
          >
            {segment.text}
          </mark>
        );
      })}
    </div>
  );
}

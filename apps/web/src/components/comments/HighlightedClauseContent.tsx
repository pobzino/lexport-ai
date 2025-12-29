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
  // Props for fillable blanks
  filledBlanks?: Map<string, string>;
  onBlankChange?: (blankKey: string, value: string) => void;
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
  filledBlanks,
  onBlankChange,
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

  // Render text with blanks replaced by input fields
  const renderTextWithBlanks = (text: string, isHighlighted: boolean, commentIds: string[], segmentKey: string) => {
    // If no blank handling needed, render as-is
    if (!filledBlanks || !onBlankChange) {
      if (isHighlighted) {
        return (
          <mark
            key={segmentKey}
            className="bg-amber-100 hover:bg-amber-200 cursor-pointer rounded-sm px-0.5 transition-all"
            onClick={() => {
              if (commentIds.length > 0) {
                onHighlightClick(commentIds[0]);
              }
            }}
            title={`${commentIds.length} comment${commentIds.length > 1 ? "s" : ""}`}
          >
            {text}
          </mark>
        );
      }
      return <span key={segmentKey}>{text}</span>;
    }

    // Split text by blanks (5+ underscores)
    const blankPattern = /_{5,}/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let blankIndex = 0;

    // We need to track which blank index we're on globally for this clause
    // Count blanks in content before this segment
    const contentBeforeSegment = content.slice(0, content.indexOf(text));
    const blanksBefore = (contentBeforeSegment.match(/_{5,}/g) || []).length;

    while ((match = blankPattern.exec(text)) !== null) {
      // Add text before the blank
      if (match.index > lastIndex) {
        const beforeText = text.slice(lastIndex, match.index);
        if (isHighlighted) {
          parts.push(
            <mark
              key={`${segmentKey}-text-${lastIndex}`}
              className="bg-amber-100 hover:bg-amber-200 cursor-pointer rounded-sm px-0.5 transition-all"
              onClick={() => {
                if (commentIds.length > 0) {
                  onHighlightClick(commentIds[0]);
                }
              }}
            >
              {beforeText}
            </mark>
          );
        } else {
          parts.push(<span key={`${segmentKey}-text-${lastIndex}`}>{beforeText}</span>);
        }
      }

      // Add the fillable blank input
      const globalBlankIndex = blanksBefore + blankIndex;
      const blankKey = `${clauseId}-blank-${globalBlankIndex}`;
      const filledValue = filledBlanks.get(blankKey) || "";

      parts.push(
        <span key={`${segmentKey}-blank-${blankIndex}`} className="inline-block relative mx-0.5">
          <input
            id={`blank-input-${blankKey}`}
            type="text"
            value={filledValue}
            onChange={(e) => onBlankChange(blankKey, e.target.value)}
            placeholder="fill in"
            className={`
              inline-block min-w-[80px] max-w-[200px] px-2 py-0.5
              text-center font-medium rounded
              border-b-2 border-dashed
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-1
              ${filledValue
                ? "bg-emerald-50 border-emerald-400 text-emerald-700 focus:ring-emerald-400"
                : "bg-amber-50 border-amber-400 text-amber-700 focus:ring-amber-400 animate-pulse"
              }
            `}
            style={{ width: `${Math.max(80, filledValue.length * 10 + 20)}px` }}
            onClick={(e) => e.stopPropagation()}
          />
          {!filledValue && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
          )}
        </span>
      );

      lastIndex = match.index + match[0].length;
      blankIndex++;
    }

    // Add remaining text after last blank
    if (lastIndex < text.length) {
      const afterText = text.slice(lastIndex);
      if (isHighlighted) {
        parts.push(
          <mark
            key={`${segmentKey}-text-end`}
            className="bg-amber-100 hover:bg-amber-200 cursor-pointer rounded-sm px-0.5 transition-all"
            onClick={() => {
              if (commentIds.length > 0) {
                onHighlightClick(commentIds[0]);
              }
            }}
          >
            {afterText}
          </mark>
        );
      } else {
        parts.push(<span key={`${segmentKey}-text-end`}>{afterText}</span>);
      }
    }

    // If no blanks found, return original behavior
    if (parts.length === 0) {
      if (isHighlighted) {
        return (
          <mark
            key={segmentKey}
            className="bg-amber-100 hover:bg-amber-200 cursor-pointer rounded-sm px-0.5 transition-all"
            onClick={() => {
              if (commentIds.length > 0) {
                onHighlightClick(commentIds[0]);
              }
            }}
            title={`${commentIds.length} comment${commentIds.length > 1 ? "s" : ""}`}
          >
            {text}
          </mark>
        );
      }
      return <span key={segmentKey}>{text}</span>;
    }

    return <span key={segmentKey}>{parts}</span>;
  };

  return (
    <div
      ref={contentRef}
      className={`whitespace-pre-wrap ${className}`}
      onMouseUp={handleMouseUp}
    >
      {segments.map((segment, index) =>
        renderTextWithBlanks(
          segment.text,
          segment.isHighlighted,
          segment.commentIds,
          `segment-${index}`
        )
      )}
    </div>
  );
}

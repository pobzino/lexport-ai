"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Resizable } from "re-resizable";
import { X, Move, PenTool, Type, Calendar, FileText, CheckSquare } from "lucide-react";
import { PlacedFieldData, FieldType, getFieldConfig } from "./types";

const FIELD_ICONS: Record<FieldType, typeof PenTool> = {
  signature: PenTool,
  initials: Type,
  date: Calendar,
  text: FileText,
  checkbox: CheckSquare,
};

interface PlacedFieldProps {
  field: PlacedFieldData;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onResize: (width: number, height: number) => void;
  pageDimensions: { width: number; height: number };
}

export function PlacedField({
  field,
  isSelected,
  onSelect,
  onDelete,
  onResize,
  pageDimensions,
}: PlacedFieldProps) {
  const [isResizing, setIsResizing] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: field.id,
    data: { field, fromPalette: false },
  });

  const config = getFieldConfig(field.type);
  const Icon = FIELD_ICONS[field.type];

  // Convert percentage position to pixels
  const pixelX = (field.x / 100) * pageDimensions.width;
  const pixelY = (field.y / 100) * pageDimensions.height;

  const style: React.CSSProperties = {
    position: "absolute",
    left: pixelX,
    top: pixelY,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging || isSelected ? 100 : 10,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        // Add padding for delete button overflow
        padding: "8px",
        margin: "-8px",
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <Resizable
        size={{ width: field.width, height: field.height }}
        minWidth={40}
        minHeight={24}
        maxWidth={400}
        maxHeight={200}
        onResizeStart={() => setIsResizing(true)}
        onResizeStop={(e, direction, ref, d) => {
          setIsResizing(false);
          onResize(field.width + d.width, field.height + d.height);
        }}
        enable={isSelected ? {
          top: false,
          right: true,
          bottom: true,
          left: false,
          topRight: false,
          bottomRight: true,
          bottomLeft: false,
          topLeft: false,
        } : {}}
        handleStyles={{
          right: { cursor: "ew-resize", width: 8 },
          bottom: { cursor: "ns-resize", height: 8 },
          bottomRight: { cursor: "nwse-resize", width: 12, height: 12 },
        }}
        handleClasses={{
          right: "bg-violet-500/0 hover:bg-violet-500/50 transition-colors",
          bottom: "bg-violet-500/0 hover:bg-violet-500/50 transition-colors",
          bottomRight: "bg-violet-500 rounded-full",
        }}
      >
        <div
          {...listeners}
          {...attributes}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className={`relative w-full h-full rounded border-2 transition-all cursor-grab active:cursor-grabbing ${
            isSelected
              ? "border-violet-500 shadow-lg ring-2 ring-violet-200"
              : isDragging
              ? "border-violet-400 shadow-md"
              : "border-slate-300 hover:border-slate-400"
          }`}
          style={{ backgroundColor: `${config.color}15` }}
        >
          {/* Drag indicator */}
          <div
            className={`absolute top-1 left-1 p-0.5 rounded ${
              isSelected ? "bg-violet-500/20" : "bg-slate-200/50"
            }`}
          >
            <Move className="w-3 h-3" style={{ color: config.color }} />
          </div>

          {/* Delete Button */}
          {isSelected && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              className="absolute -right-2 -top-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md z-50 cursor-pointer"
              style={{ pointerEvents: "auto" }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Field Content */}
          <div className="absolute inset-0 flex items-center justify-center p-1">
            <div className="flex items-center gap-1.5 text-slate-600">
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color: config.color }} />
              <span
                className="text-xs font-medium truncate"
                style={{ color: config.color }}
              >
                {field.label || config.label}
              </span>
            </div>
          </div>

          {/* Signer Badge */}
          <div
            className="absolute -bottom-5 left-0 text-[10px] font-medium px-1.5 py-0.5 rounded truncate max-w-full"
            style={{
              backgroundColor: config.color,
              color: "white",
            }}
          >
            {field.signerRole}
          </div>

          {/* Resize Handle Indicator */}
          {isSelected && !isResizing && (
            <div
              className="absolute bottom-0 right-0 w-3 h-3 rounded-tl"
              style={{ backgroundColor: config.color }}
            />
          )}
        </div>
      </Resizable>
    </div>
  );
}

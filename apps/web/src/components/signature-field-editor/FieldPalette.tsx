"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  PenTool,
  Type,
  Calendar,
  FileText,
  CheckSquare,
  GripVertical,
} from "lucide-react";
import { FieldType, FIELD_CONFIGS } from "./types";

const FIELD_ICONS: Record<FieldType, typeof PenTool> = {
  signature: PenTool,
  initials: Type,
  date: Calendar,
  text: FileText,
  checkbox: CheckSquare,
};

interface DraggableFieldProps {
  type: FieldType;
  label: string;
  description: string;
  color: string;
  onAdd: (type: FieldType) => void;
}

function DraggableField({ type, label, description, color, onAdd }: DraggableFieldProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { type, fromPalette: true },
  });

  const Icon = FIELD_ICONS[type];

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex w-full items-center rounded-xl border bg-white text-left transition-all ${isDragging ? "shadow-lg ring-2 ring-[#529ec6]" : "border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
        }`}
    >
      <button
        type="button"
        onClick={() => onAdd(type)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-l-xl p-3 text-left"
      >
        <span
          className="rounded-lg p-2"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-slate-900">{label}</span>
          <span className="block truncate text-xs text-slate-500">{description}</span>
        </span>
        <span className="text-lg leading-none text-[#4189b1]" aria-hidden="true">+</span>
      </button>
      <button
        type="button"
        {...listeners}
        {...attributes}
        aria-label={`Drag ${label} field`}
        className="mr-2 cursor-grab rounded-lg p-2 text-slate-300 hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
    </div>
  );
}

interface FieldPaletteProps {
  signers: Array<{ id: string; role: string; name?: string; email?: string; color?: string }>;
  selectedSignerId: string;
  isFieldSelected?: boolean;
  onSignerChange: (signerId: string) => void;
  onAddField: (type: FieldType) => void;
}

export function FieldPalette({
  signers,
  selectedSignerId,
  isFieldSelected = false,
  onSignerChange,
  onAddField,
}: FieldPaletteProps) {
  const selectedSigner = signers.find((s) => s.id === selectedSignerId);

  return (
    <aside className="flex max-h-[42vh] w-full flex-none flex-col border-t border-slate-200 bg-white shadow-[0_-8px_24px_rgba(15,23,42,0.05)] lg:max-h-none lg:w-80 lg:border-l lg:border-t-0 lg:shadow-[-8px_0_24px_rgba(15,23,42,0.05)]">
      {/* Header */}
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#4189b1]">
          Recipients and fields
        </p>
        <h3 className="mt-1 font-semibold text-slate-950">Prepare for signature</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Select a recipient, then click or drag fields onto the document.
        </p>
      </div>

      {/* Signer Selector */}
      <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4">
        <label className="mb-2 block text-xs font-semibold text-slate-700">
          {isFieldSelected ? "Selected field assigned to" : "New fields assigned to"}
        </label>
        <select
          value={selectedSignerId}
          onChange={(e) => onSignerChange(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-[#529ec6] focus:ring-4 focus:ring-[#529ec6]/10"
        >
          {signers.map((signer) => (
            <option key={signer.id} value={signer.id}>
              {signer.name ? `${signer.name} (${signer.role})` : signer.role}
            </option>
          ))}
        </select>
        {selectedSigner?.email && (
          <p className="mt-2 truncate text-xs text-slate-500">
            {selectedSigner.email}
          </p>
        )}
        {isFieldSelected && (
          <p className="mt-2 text-xs font-medium text-[#317ba2]">
            Changing the recipient reassigns the selected field.
          </p>
        )}
      </div>

      {/* Field Types */}
      <div className="flex-1 overflow-auto p-5">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Fields
        </p>
        <div className="grid grid-cols-2 gap-2 lg:block lg:space-y-2">
          {FIELD_CONFIGS.map((config) => (
            <DraggableField
              key={config.type}
              type={config.type}
              label={config.label}
              description={config.description}
              color={selectedSigner?.color || config.color}
              onAdd={onAddField}
            />
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="hidden border-t border-slate-200 bg-[#f0f7fb] px-5 py-4 lg:block">
        <p className="text-xs leading-5 text-slate-600">
          <strong className="text-slate-800">Tip:</strong> Place required signatures first. Dates can auto-fill when a recipient signs.
        </p>
      </div>
    </aside>
  );
}

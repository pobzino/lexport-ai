"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { PenTool, Type, Calendar, FileText, CheckSquare } from "lucide-react";
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
}

function DraggableField({ type, label, description, color }: DraggableFieldProps) {
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
      {...listeners}
      {...attributes}
      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${isDragging ? "shadow-lg ring-2 ring-[#529ec6]" : "hover:border-slate-300"
        }`}
      role="button"
      tabIndex={0}
    >
      <div
        className="p-2 rounded-lg"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-slate-900">{label}</p>
        <p className="text-xs text-slate-500 truncate">{description}</p>
      </div>
    </div>
  );
}

interface FieldPaletteProps {
  signers: Array<{ id: string; role: string; name?: string; email?: string }>;
  selectedSignerId: string;
  onSignerChange: (signerId: string) => void;
}

export function FieldPalette({
  signers,
  selectedSignerId,
  onSignerChange,
}: FieldPaletteProps) {
  const selectedSigner = signers.find((s) => s.id === selectedSignerId);

  return (
    <div className="w-72 bg-white border-l flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-slate-50">
        <h3 className="font-semibold text-slate-900">Signature Fields</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Drag fields onto the document
        </p>
      </div>

      {/* Signer Selector */}
      <div className="px-4 py-3 border-b">
        <label className="block text-xs font-medium text-slate-600 mb-1.5">
          Assign to Signer
        </label>
        <select
          value={selectedSignerId}
          onChange={(e) => onSignerChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6]"
        >
          {signers.map((signer) => (
            <option key={signer.id} value={signer.id}>
              {signer.name ? `${signer.name} (${signer.role})` : signer.role}
            </option>
          ))}
        </select>
        {selectedSigner?.email && (
          <p className="text-xs text-slate-400 mt-1 truncate">
            {selectedSigner.email}
          </p>
        )}
      </div>

      {/* Field Types */}
      <div className="flex-1 overflow-auto p-4">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
          Available Fields
        </p>
        <div className="space-y-2">
          {FIELD_CONFIGS.map((config) => (
            <DraggableField
              key={config.type}
              type={config.type}
              label={config.label}
              description={config.description}
              color={config.color}
            />
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="px-4 py-3 border-t bg-slate-50">
        <p className="text-xs text-slate-500">
          <strong>Tip:</strong> Drag a field to the document, then resize and
          position it. Each signer will see only their assigned fields.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { PDFViewer } from "./PDFViewer";
import { FieldPalette } from "./FieldPalette";
import { PlacedField } from "./PlacedField";
import { PlacedFieldData, FieldType, getFieldConfig, FIELD_CONFIGS } from "./types";
import { X, Save, Loader2, AlertCircle } from "lucide-react";

interface Signer {
  id: string;
  role: string;
  name?: string;
  email?: string;
}

interface SignatureFieldEditorVisualProps {
  contractId: string;
  pdfUrl: string;
  signers: Signer[];
  initialFields?: PlacedFieldData[];
  onClose: () => void;
  onSave: (fields: PlacedFieldData[]) => Promise<void>;
}

export function SignatureFieldEditorVisual({
  contractId,
  pdfUrl,
  signers,
  initialFields = [],
  onClose,
  onSave,
}: SignatureFieldEditorVisualProps) {
  const [fields, setFields] = useState<PlacedFieldData[]>(initialFields);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [selectedSignerId, setSelectedSignerId] = useState(signers[0]?.id || "");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageDimensions, setPageDimensions] = useState({ width: 612, height: 792 });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    const fieldsChanged = JSON.stringify(fields) !== JSON.stringify(initialFields);
    setHasChanges(fieldsChanged);
  }, [fields, initialFields]);

  // Configure sensor with activation constraint - requires 8px movement before drag starts
  // This allows clicks to pass through without triggering drag
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  });
  const sensors = useSensors(pointerSensor);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, delta } = event;

      if (!active.data.current) return;

      const { fromPalette, field, type } = active.data.current;

      if (fromPalette && type) {
        // New field from palette
        const config = getFieldConfig(type as FieldType);
        const selectedSigner = signers.find((s) => s.id === selectedSignerId);

        // Calculate drop position (center of where the ghost was dropped)
        // Convert pixel position to percentage of page
        const dropX = Math.max(0, Math.min(100, (delta.x / pageDimensions.width) * 100 + 10));
        const dropY = Math.max(0, Math.min(100, (delta.y / pageDimensions.height) * 100 + 10));

        const newField: PlacedFieldData = {
          id: `field-${Date.now()}`,
          type: type as FieldType,
          signerId: selectedSignerId,
          signerRole: selectedSigner?.role || "Signer",
          page: currentPage,
          x: dropX,
          y: dropY,
          width: config.defaultWidth,
          height: config.defaultHeight,
          required: type === "signature",
          label: config.label,
        };

        setFields((prev) => [...prev, newField]);
        setSelectedFieldId(newField.id);
      } else if (field) {
        // Moving existing field
        setFields((prev) =>
          prev.map((f) => {
            if (f.id === field.id) {
              const newX = f.x + (delta.x / pageDimensions.width) * 100;
              const newY = f.y + (delta.y / pageDimensions.height) * 100;
              return {
                ...f,
                x: Math.max(0, Math.min(100 - (f.width / pageDimensions.width) * 100, newX)),
                y: Math.max(0, Math.min(100 - (f.height / pageDimensions.height) * 100, newY)),
              };
            }
            return f;
          })
        );
      }
    },
    [signers, selectedSignerId, currentPage, pageDimensions]
  );

  const handleFieldResize = useCallback((fieldId: string, width: number, height: number) => {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, width, height } : f))
    );
  }, []);

  const handleFieldDelete = useCallback((fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    setSelectedFieldId(null);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSave(fields);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save fields");
    } finally {
      setIsSaving(false);
    }
  };

  // Filter fields for current page
  const currentPageFields = fields.filter((f) => f.page === currentPage);
  const totalFields = fields.length;

  // Get the active dragging item for overlay
  const activeField = activeId
    ? fields.find((f) => f.id === activeId)
    : null;
  const activePaletteType = activeId?.startsWith("palette-")
    ? activeId.replace("palette-", "") as FieldType
    : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/90">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-semibold text-lg">Place Signature Fields</h2>
            <p className="text-sm text-slate-500">
              {totalFields} field{totalFields !== 1 ? "s" : ""} placed
              {currentPageFields.length > 0 && ` (${currentPageFields.length} on this page)`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#202e46] hover:bg-[#1a2539] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Fields
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {/* PDF Viewer */}
          <div className="flex-1" onClick={() => setSelectedFieldId(null)}>
            <PDFViewer
              pdfUrl={pdfUrl}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onPageDimensions={setPageDimensions}
            >
              {currentPageFields.map((field) => (
                <PlacedField
                  key={field.id}
                  field={field}
                  isSelected={field.id === selectedFieldId}
                  onSelect={() => setSelectedFieldId(field.id)}
                  onDelete={() => handleFieldDelete(field.id)}
                  onResize={(w, h) => handleFieldResize(field.id, w, h)}
                  pageDimensions={pageDimensions}
                />
              ))}
            </PDFViewer>
          </div>

          {/* Field Palette */}
          <FieldPalette
            signers={signers}
            selectedSignerId={selectedSignerId}
            onSignerChange={setSelectedSignerId}
          />

          {/* Drag Overlay */}
          <DragOverlay>
            {activePaletteType && (
              <div
                className="px-3 py-2 rounded-lg border-2 border-[#529ec6] shadow-lg"
                style={{
                  backgroundColor: `${getFieldConfig(activePaletteType).color}20`,
                  borderColor: getFieldConfig(activePaletteType).color,
                }}
              >
                <span
                  className="text-sm font-medium"
                  style={{ color: getFieldConfig(activePaletteType).color }}
                >
                  {FIELD_CONFIGS.find((c) => c.type === activePaletteType)?.label}
                </span>
              </div>
            )}
            {activeField && (
              <div
                className="rounded border-2 border-[#529ec6] shadow-lg"
                style={{
                  width: activeField.width,
                  height: activeField.height,
                  backgroundColor: `${getFieldConfig(activeField.type).color}20`,
                }}
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

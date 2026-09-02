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
  contractTitle?: string;
  pdfUrl: string;
  signers: Signer[];
  initialFields?: PlacedFieldData[];
  onClose: () => void;
  onSave: (fields: PlacedFieldData[]) => Promise<void>;
}

export function SignatureFieldEditorVisual({
  contractId,
  contractTitle = "Uploaded contract",
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
      const pageElement = document.querySelector<HTMLElement>("[data-signature-page]");
      const pageRect = pageElement?.getBoundingClientRect();

      if (fromPalette && type) {
        // New field from palette
        const config = getFieldConfig(type as FieldType);
        const selectedSigner = signers.find((s) => s.id === selectedSignerId);
        const pointerEvent = event.activatorEvent as PointerEvent;
        const displayScale = pageRect ? pageRect.width / 800 : 1;
        const displayWidth = config.defaultWidth * displayScale;
        const displayHeight = config.defaultHeight * displayScale;
        const pointerX = typeof pointerEvent.clientX === "number"
          ? pointerEvent.clientX + delta.x
          : (pageRect?.left || 0) + (pageRect?.width || pageDimensions.width) / 2;
        const pointerY = typeof pointerEvent.clientY === "number"
          ? pointerEvent.clientY + delta.y
          : (pageRect?.top || 0) + (pageRect?.height || pageDimensions.height) / 2;
        const widthPercent = pageRect
          ? (displayWidth / pageRect.width) * 100
          : 25;
        const heightPercent = pageRect
          ? (displayHeight / pageRect.height) * 100
          : 8;
        const dropX = pageRect
          ? Math.max(0, Math.min(100 - widthPercent, ((pointerX - pageRect.left - displayWidth / 2) / pageRect.width) * 100))
          : 10;
        const dropY = pageRect
          ? Math.max(0, Math.min(100 - heightPercent, ((pointerY - pageRect.top - displayHeight / 2) / pageRect.height) * 100))
          : 10;

        const newField: PlacedFieldData = {
          id: `field-${Date.now()}`,
          type: type as FieldType,
          signerId: selectedSignerId,
          // Use signer's role to match with signature_requests (not name)
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
              const renderedWidth = pageRect?.width || pageDimensions.width;
              const renderedHeight = pageRect?.height || pageDimensions.height;
              const fieldWidthPercent = ((f.width * (renderedWidth / 800)) / renderedWidth) * 100;
              const fieldHeightPercent = ((f.height * (renderedWidth / 800)) / renderedHeight) * 100;
              const newX = f.x + (delta.x / renderedWidth) * 100;
              const newY = f.y + (delta.y / renderedHeight) * 100;
              return {
                ...f,
                x: Math.max(0, Math.min(100 - fieldWidthPercent, newX)),
                y: Math.max(0, Math.min(100 - fieldHeightPercent, newY)),
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

  const handleAddField = useCallback((type: FieldType) => {
    const config = getFieldConfig(type);
    const selectedSigner = signers.find((signer) => signer.id === selectedSignerId);
    const fieldsOnPage = fields.filter((field) => field.page === currentPage).length;
    const offset = fieldsOnPage % 6;
    const newField: PlacedFieldData = {
      id: `field-${Date.now()}`,
      type,
      signerId: selectedSignerId,
      signerRole: selectedSigner?.role || "Signer",
      page: currentPage,
      x: Math.min(68, 14 + offset * 5),
      y: Math.min(76, 16 + offset * 8),
      width: config.defaultWidth,
      height: config.defaultHeight,
      required: type === "signature",
      label: config.label,
    };
    setFields((previous) => [...previous, newField]);
    setSelectedFieldId(newField.id);
  }, [currentPage, fields, selectedSignerId, signers]);

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
    <div className="fixed inset-0 z-50 flex flex-col bg-[#e8edf3]">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-[#141d2e] px-4 py-3 text-white sm:px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close field editor"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8dc2df]">
              Prepare document - fields
            </p>
            <h2 className="truncate text-base font-semibold sm:text-lg">{contractTitle}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden rounded-full bg-white/10 px-3 py-1.5 text-xs text-slate-200 md:inline-flex">
            {totalFields} field{totalFields !== 1 ? "s" : ""}
            {currentPageFields.length > 0 && ` - ${currentPageFields.length} on page`}
          </span>
          {error && (
            <div className="hidden items-center gap-2 text-sm text-red-300 lg:flex">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          <button
            onClick={onClose}
            disabled={isSaving}
            className="hidden rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white sm:block"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="flex items-center gap-2 rounded-lg bg-[#529ec6] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4189b1] disabled:cursor-not-allowed disabled:opacity-45"
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
          <div className="flex-1 bg-[#dfe6ee]" onClick={() => setSelectedFieldId(null)}>
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
            onAddField={handleAddField}
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

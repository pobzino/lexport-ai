"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Loader2,
  PenTool,
  Type,
  Calendar,
  FileText,
  CheckSquare,
  Check,
} from "lucide-react";

// Dynamically import react-pdf with SSR disabled
const Document = dynamic(
  () => import("react-pdf").then((mod) => mod.Document),
  { ssr: false }
);

const Page = dynamic(
  () => import("react-pdf").then((mod) => mod.Page),
  { ssr: false }
);

type FieldType = "signature" | "initials" | "date" | "text" | "checkbox" | "dropdown" | "attachment";

interface SignatureField {
  id: string;
  type: FieldType;
  label?: string;
  signer_role: string;
  required: boolean;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  page?: number;
}

interface FieldValue {
  signatureData?: string;
  value?: string;
}

interface PDFSigningViewProps {
  pdfUrl: string;
  signatureFields: SignatureField[];
  currentSignerRole: string;
  fieldValues: Map<string, FieldValue>;
  onFieldClick: (field: SignatureField) => void;
}

const FIELD_ICONS: Record<FieldType, typeof PenTool> = {
  signature: PenTool,
  initials: Type,
  date: Calendar,
  text: FileText,
  checkbox: CheckSquare,
  dropdown: FileText,
  attachment: FileText,
};

const FIELD_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  signature: { bg: "bg-blue-50", border: "border-blue-400", text: "text-blue-600" },
  initials: { bg: "bg-purple-50", border: "border-purple-400", text: "text-purple-600" },
  date: { bg: "bg-green-50", border: "border-green-400", text: "text-green-600" },
  text: { bg: "bg-amber-50", border: "border-amber-400", text: "text-amber-600" },
  checkbox: { bg: "bg-pink-50", border: "border-pink-400", text: "text-pink-600" },
  dropdown: { bg: "bg-cyan-50", border: "border-cyan-400", text: "text-cyan-600" },
  attachment: { bg: "bg-orange-50", border: "border-orange-400", text: "text-orange-600" },
};

export function PDFSigningView({
  pdfUrl,
  signatureFields,
  currentSignerRole,
  fieldValues,
  onFieldClick,
}: PDFSigningViewProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [pageWidth, setPageWidth] = useState(0);
  const [pdfAspectRatio, setPdfAspectRatio] = useState<number | null>(null); // height / width
  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  // Set up PDF.js worker on client side only
  useEffect(() => {
    setIsClient(true);
    import("react-pdf").then((pdfjs) => {
      pdfjs.pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    });
  }, []);

  // Calculate optimal scale based on container width
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 48;
        const optimalWidth = Math.min(containerWidth, 700);
        setPageWidth(optimalWidth);
      }
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onPageLoadSuccess = (page: { width: number; height: number }) => {
    // Store the PDF's aspect ratio (height/width)
    setPdfAspectRatio(page.height / page.width);
  };

  // Calculate actual rendered dimensions based on pageWidth, scale, and aspect ratio
  // The Page component renders at: width = pageWidth * scale, height = pageWidth * aspectRatio * scale
  // Only calculate when we have the aspect ratio from the PDF
  const renderedWidth = pdfAspectRatio !== null ? pageWidth * scale : 0;
  const renderedHeight = pdfAspectRatio !== null ? pageWidth * pdfAspectRatio * scale : 0;

  // Get fields for current page
  const currentPageFields = signatureFields.filter(
    (f) => (f.page || 1) === currentPage
  );

  // Debug logging - always log to help diagnose rendering issues
  if (typeof window !== 'undefined') {
    console.log("[PDFSigningView] RENDER STATE:", {
      pageWidth,
      pdfAspectRatio,
      scale,
      renderedWidth,
      renderedHeight,
      willRenderFields: renderedWidth > 0 && currentPageFields.length > 0,
      signatureFieldsCount: signatureFields.length,
      currentPageFieldsCount: currentPageFields.length,
      currentPage,
      currentSignerRole,
      containerRefExists: !!containerRef.current,
      fields: signatureFields.slice(0, 5).map(f => ({
        id: f.id?.substring(0, 8),
        type: f.type,
        signer_role: f.signer_role,
        position_x: f.position_x,
        position_y: f.position_y,
        page: f.page
      }))
    });
  }

  // Check if a field is filled
  const isFieldFilled = (field: SignatureField): boolean => {
    const value = fieldValues.get(field.id);
    if (!value) return false;
    if (field.type === "signature" || field.type === "initials") {
      return !!value.signatureData;
    }
    return !!value.value;
  };

  // Check if field belongs to current signer
  const isMyField = (field: SignatureField): boolean => {
    return field.signer_role === currentSignerRole;
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-96 bg-slate-100 rounded-lg">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col bg-slate-100 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <span className="text-sm text-slate-600">
            Page {currentPage} of {numPages || "..."}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages}
            className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
            className="p-1.5 rounded hover:bg-slate-100"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-5 h-5" aria-hidden="true" />
          </button>
          <span className="text-sm text-slate-600 w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(2, s + 0.25))}
            className="p-1.5 rounded hover:bg-slate-100"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* PDF Container */}
      <div className="flex-1 overflow-auto p-6">
        <div className="relative mx-auto" style={{ width: "fit-content" }}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          )}

          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            }
            error={
              <div className="flex items-center justify-center h-96 text-red-500">
                Failed to load PDF
              </div>
            }
          >
            <div className="relative">
              <Page
                pageNumber={currentPage}
                width={pageWidth}
                scale={scale}
                onLoadSuccess={onPageLoadSuccess}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />

              {/* Signature Field Overlays */}
              {renderedWidth > 0 && currentPageFields.map((field) => {
                const Icon = FIELD_ICONS[field.type] || FileText;
                const colors = FIELD_COLORS[field.type] || FIELD_COLORS.text;
                const filled = isFieldFilled(field);
                const isClickable = isMyField(field) && !filled;
                const value = fieldValues.get(field.id);

                // Convert percentage to pixels using actual rendered dimensions
                const pixelX = (field.position_x / 100) * renderedWidth;
                const pixelY = (field.position_y / 100) * renderedHeight;

                return (
                  <div
                    key={field.id}
                    className={`absolute border-2 rounded transition-all ${
                      filled
                        ? "bg-green-50 border-green-400"
                        : isClickable
                        ? `${colors.bg} ${colors.border} cursor-pointer hover:shadow-lg hover:scale-105`
                        : "bg-slate-50 border-slate-300 opacity-60"
                    }`}
                    style={{
                      left: pixelX,
                      top: pixelY,
                      width: field.width || 150,
                      height: field.height || 40,
                    }}
                    onClick={() => isClickable && onFieldClick(field)}
                  >
                    {filled ? (
                      // Show filled content
                      <div className="w-full h-full flex items-center justify-center p-1">
                        {(field.type === "signature" || field.type === "initials") && value?.signatureData ? (
                          <img
                            src={value.signatureData}
                            alt={field.type}
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : field.type === "checkbox" ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <span className="text-xs text-green-700 truncate px-1">
                            {value?.value || "Filled"}
                          </span>
                        )}
                      </div>
                    ) : (
                      // Show placeholder
                      <div className={`w-full h-full flex items-center justify-center gap-1 ${isClickable ? colors.text : "text-slate-400"}`}>
                        <Icon className="w-4 h-4" />
                        <span className="text-xs font-medium truncate">
                          {isMyField(field) ? (field.label || field.type) : field.signer_role}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Document>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 bg-white border-t text-xs text-slate-500 flex items-center gap-4">
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-100 border border-blue-400" />
          Click to sign
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-100 border border-green-400" />
          Completed
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-slate-100 border border-slate-300" />
          Other signer
        </span>
      </div>
    </div>
  );
}

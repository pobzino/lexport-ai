"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from "lucide-react";

// Dynamically import react-pdf with SSR disabled to avoid DOMMatrix error
const Document = dynamic(
  () => import("react-pdf").then((mod) => mod.Document),
  { ssr: false }
);

const Page = dynamic(
  () => import("react-pdf").then((mod) => mod.Page),
  { ssr: false }
);

// CSS imports are handled via the worker setup in useEffect

interface PDFViewerProps {
  pdfUrl: string;
  currentPage: number;
  onPageChange: (page: number) => void;
  onPageDimensions: (dimensions: { width: number; height: number }) => void;
  pageFieldCounts?: Record<number, number>;
  children?: React.ReactNode;
}

export function PDFViewer({
  pdfUrl,
  currentPage,
  onPageChange,
  onPageDimensions,
  pageFieldCounts = {},
  children,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(1);
  const [pageWidth, setPageWidth] = useState(0);
  const [pdfAspectRatio, setPdfAspectRatio] = useState<number | null>(null);
  const [isClient, setIsClient] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Bundle the exact PDF.js worker version with the app so CSP and CDN outages
  // cannot break document rendering.
  useEffect(() => {
    import("react-pdf").then((pdfjs) => {
      pdfjs.pdfjs.GlobalWorkerOptions.workerSrc =
        new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      setIsClient(true);
    });
  }, []);

  // Calculate optimal scale based on container width
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 48; // padding
        const optimalWidth = Math.min(containerWidth, 800);
        setPageWidth(optimalWidth);
      }
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    if (currentPage > numPages) {
      onPageChange(1);
    }
  };

  const onPageLoadSuccess = (page: { width: number; height: number }) => {
    // Store the PDF's aspect ratio for dimension calculations
    const aspectRatio = page.height / page.width;
    setPdfAspectRatio(aspectRatio);
  };

  // Update dimensions when scale, pageWidth, or aspect ratio changes
  useEffect(() => {
    if (pdfAspectRatio !== null && pageWidth > 0) {
      // react-pdf renders at: width = pageWidth * scale, height = pageWidth * aspectRatio * scale
      const renderedWidth = pageWidth * scale;
      const renderedHeight = pageWidth * pdfAspectRatio * scale;
      onPageDimensions({ width: renderedWidth, height: renderedHeight });
    }
  }, [scale, pageWidth, pdfAspectRatio, onPageDimensions]);

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < numPages) {
      onPageChange(currentPage + 1);
    }
  };

  const zoomIn = () => setScale((s) => Math.min(s + 0.25, 2));
  const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#dfe6ee]">
      {/* Toolbar */}
      <div className="flex min-h-14 items-center justify-between border-b border-slate-200 bg-white px-4 py-2 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage <= 1}
            className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="min-w-[92px] text-center text-sm font-medium text-slate-700">
            Page {currentPage} / {numPages || "..."}
          </span>
          <button
            onClick={goToNextPage}
            disabled={currentPage >= numPages}
            className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="rounded-lg p-1.5 hover:bg-slate-100 disabled:opacity-40"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="min-w-[50px] text-center text-xs font-semibold text-slate-600">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={scale >= 2}
            className="rounded-lg p-1.5 hover:bg-slate-100 disabled:opacity-40"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* PDF workspace */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {isClient && numPages > 1 && (
          <aside className="hidden w-28 flex-none overflow-y-auto border-r border-slate-300 bg-slate-100 p-3 lg:block">
            <Document file={pdfUrl} loading={null} error={null}>
              <div className="space-y-3">
                {Array.from({ length: numPages }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => onPageChange(pageNumber)}
                    aria-label={`Go to page ${pageNumber}`}
                    aria-current={currentPage === pageNumber ? "page" : undefined}
                    className={`relative block w-full rounded-lg p-1.5 transition ${
                      currentPage === pageNumber
                        ? "bg-white shadow ring-2 ring-[#397fa4]"
                        : "hover:bg-white/80"
                    }`}
                  >
                    <Page
                      pageNumber={pageNumber}
                      width={72}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                    <span className="mt-1 block text-center text-[10px] font-semibold text-slate-500">
                      {pageNumber}
                    </span>
                    {pageFieldCounts[pageNumber] ? (
                      <span className="absolute right-0 top-0 flex h-5 min-w-5 translate-x-1/3 -translate-y-1/3 items-center justify-center rounded-full bg-[#202e46] px-1 text-[9px] font-bold text-white">
                        {pageFieldCounts[pageNumber]}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </Document>
          </aside>
        )}

        <div
          ref={containerRef}
          className="flex min-w-0 flex-1 justify-center overflow-auto p-6 sm:p-10"
        >
          {!isClient ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#529ec6]" />
          </div>
        ) : (
          <div
            data-signature-page
            className="relative bg-white shadow-[0_18px_55px_rgba(32,46,70,0.22)] ring-1 ring-slate-300"
          >
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center p-12">
                  <div className="w-8 h-8 border-2 border-[#529ec6] border-t-transparent rounded-full animate-spin" />
                </div>
              }
              error={
                <div className="flex items-center justify-center p-12 text-red-500">
                  Failed to load PDF
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                width={pageWidth}
                scale={scale}
                onLoadSuccess={onPageLoadSuccess}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>

            {/* Field Overlay Container */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ pointerEvents: "none" }}
            >
              <div className="relative w-full h-full" style={{ pointerEvents: "auto" }}>
                {children}
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {numPages > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto border-t border-slate-200 bg-white px-4 py-2 lg:hidden">
          <span className="mr-1 flex-none text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Pages
          </span>
          {Array.from({ length: numPages }, (_, index) => index + 1).map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onPageChange(pageNumber)}
              aria-label={`Go to page ${pageNumber}`}
              aria-current={currentPage === pageNumber ? "page" : undefined}
              className={`h-8 min-w-8 flex-none rounded-md px-2 text-xs font-semibold transition ${
                currentPage === pageNumber
                  ? "bg-[#202e46] text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-[#529ec6] hover:text-[#356e8e]"
              }`}
            >
              {pageNumber}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

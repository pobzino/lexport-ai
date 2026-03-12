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
  children?: React.ReactNode;
}

export function PDFViewer({
  pdfUrl,
  currentPage,
  onPageChange,
  onPageDimensions,
  children,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(1);
  const [pageWidth, setPageWidth] = useState(0);
  const [pdfAspectRatio, setPdfAspectRatio] = useState<number | null>(null);
  const [isClient, setIsClient] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Set up PDF.js worker on client side — only mark ready after worker is configured
  useEffect(() => {
    import("react-pdf").then((pdfjs) => {
      pdfjs.pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
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
    <div className="flex flex-col h-full bg-slate-100 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage <= 1}
            className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium min-w-[80px] text-center">
            Page {currentPage} of {numPages || "..."}
          </span>
          <button
            onClick={goToNextPage}
            disabled={currentPage >= numPages}
            className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-50"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={scale >= 2}
            className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-50"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* PDF Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-6 flex justify-center"
      >
        {!isClient ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#529ec6]" />
          </div>
        ) : (
          <div className="relative shadow-xl bg-white">
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
  );
}

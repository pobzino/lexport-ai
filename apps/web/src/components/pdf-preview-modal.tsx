"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Loader2,
  FileText,
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

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  contractTitle: string;
}

export function PDFPreviewModal({
  isOpen,
  onClose,
  contractId,
  contractTitle,
}: PDFPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [isClient, setIsClient] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState(600);

  // Set up PDF.js worker on client side
  useEffect(() => {
    setIsClient(true);
    import("react-pdf").then((pdfjs) => {
      pdfjs.pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    });
  }, []);

  // Calculate optimal width based on container
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 64;
        const optimalWidth = Math.min(containerWidth, 700);
        setPageWidth(optimalWidth);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [isOpen]);

  // Fetch PDF when modal opens
  useEffect(() => {
    if (!isOpen) {
      setPdfUrl(null);
      setCurrentPage(1);
      setError(null);
      return;
    }

    const fetchPDF = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/contracts/${contractId}/pdf`);
        if (!response.ok) {
          throw new Error("Failed to generate PDF preview");
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load PDF");
      } finally {
        setLoading(false);
      }
    };

    fetchPDF();

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [isOpen, contractId]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < numPages) setCurrentPage(currentPage + 1);
  };

  const zoomIn = () => setScale((s) => Math.min(s + 0.25, 2));
  const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));

  const handleDownload = () => {
    if (pdfUrl) {
      const a = document.createElement("a");
      a.href = pdfUrl;
      a.download = `${contractTitle || "contract"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-[#529ec6]" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                PDF Preview
              </h2>
              <p className="text-sm text-slate-500">{contractTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Toolbar */}
        {!loading && !error && (
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousPage}
                disabled={currentPage <= 1}
                className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium min-w-[100px] text-center text-slate-700">
                Page {currentPage} of {numPages || "..."}
              </span>
              <button
                onClick={goToNextPage}
                disabled={currentPage >= numPages}
                className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={zoomOut}
                  disabled={scale <= 0.5}
                  className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-50 transition-colors"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <span className="text-sm font-medium min-w-[50px] text-center text-slate-700">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={zoomIn}
                  disabled={scale >= 2}
                  className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-50 transition-colors"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        )}

        {/* PDF Content */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-slate-100 p-6"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-[#529ec6]" />
              <p className="text-slate-600">Generating PDF preview...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <X className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-red-600 font-medium">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  // Retry fetch
                  fetch(`/api/contracts/${contractId}/pdf`)
                    .then((res) => {
                      if (!res.ok) throw new Error("Failed to generate PDF");
                      return res.blob();
                    })
                    .then((blob) => {
                      setPdfUrl(URL.createObjectURL(blob));
                      setLoading(false);
                    })
                    .catch((err) => {
                      setError(err.message);
                      setLoading(false);
                    });
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : isClient && pdfUrl ? (
            <div className="flex justify-center">
              <div className="shadow-xl bg-white">
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={
                    <div className="flex items-center justify-center p-24">
                      <Loader2 className="w-8 h-8 animate-spin text-[#529ec6]" />
                    </div>
                  }
                  error={
                    <div className="flex flex-col items-center justify-center p-12 text-red-500 gap-2">
                      <X className="w-8 h-8" />
                      <span>Failed to render PDF</span>
                    </div>
                  }
                >
                  <Page
                    pageNumber={currentPage}
                    width={pageWidth}
                    scale={scale}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </Document>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-[#529ec6]" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-white">
          <p className="text-sm text-slate-500">
            This is how the contract will appear when downloaded as a PDF
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

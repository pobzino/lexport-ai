"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Download,
  Loader2,
  FileText,
} from "lucide-react";

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  contractTitle: string;
  /** Direct URL to an existing PDF (e.g. uploaded sign-only contracts). Skips API generation. */
  sourceFileUrl?: string | null;
}

export function PDFPreviewModal({
  isOpen,
  onClose,
  contractId,
  contractTitle,
  sourceFileUrl,
}: PDFPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const pdfUrlRef = useRef<string | null>(null);
  const contractIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch PDF when modal opens
  useEffect(() => {
    if (!isOpen) {
      // Abort any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      // Cleanup old blob URL when modal closes
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = null;
        contractIdRef.current = null;
      }
      setPdfUrl(null);
      setError(null);
      setLoading(true);
      return;
    }

    // If we already have a valid URL for this exact contract, don't refetch
    if (pdfUrlRef.current && contractIdRef.current === contractId) {
      setLoading(false);
      return;
    }

    // Abort any previous in-flight request before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const fetchPDF = async () => {
      setLoading(true);
      setError(null);

      try {
        // Use the direct source file URL if provided (e.g. uploaded sign-only contracts)
        const fetchUrl = sourceFileUrl || `/api/contracts/${contractId}/pdf`;

        const response = await fetch(fetchUrl, {
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to generate PDF preview");
        }

        const blob = await response.blob();

        // Check if this request was aborted
        if (abortController.signal.aborted) return;

        // Revoke old URL before creating new one
        if (pdfUrlRef.current) {
          URL.revokeObjectURL(pdfUrlRef.current);
        }
        const url = URL.createObjectURL(blob);
        pdfUrlRef.current = url;
        contractIdRef.current = contractId;
        setPdfUrl(url);
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        if (!abortController.signal.aborted) {
          setError(err instanceof Error ? err.message : "Failed to load PDF");
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchPDF();

    return () => {
      abortController.abort();
    };
  }, [isOpen, contractId, sourceFileUrl]);

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
          <div className="flex items-center gap-2">
            {!loading && !error && pdfUrl && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* PDF Content */}
        <div className="flex-1 overflow-hidden bg-slate-100">
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
                  fetch(sourceFileUrl || `/api/contracts/${contractId}/pdf`)
                    .then((res) => {
                      if (!res.ok) throw new Error("Failed to generate PDF");
                      return res.blob();
                    })
                    .then((blob) => {
                      if (pdfUrlRef.current) {
                        URL.revokeObjectURL(pdfUrlRef.current);
                      }
                      const url = URL.createObjectURL(blob);
                      pdfUrlRef.current = url;
                      contractIdRef.current = contractId;
                      setPdfUrl(url);
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
          ) : pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=0&view=FitH`}
              className="w-full h-full border-0"
              title={`PDF Preview - ${contractTitle}`}
            />
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

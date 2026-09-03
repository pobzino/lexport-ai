"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ExternalLink, Loader2, RefreshCw } from "lucide-react";

interface EmbeddedPDFViewerProps {
  pdfUrl: string | null;
}

export function EmbeddedPDFViewer({ pdfUrl }: EmbeddedPDFViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const previewTimeoutRef = useRef<number | null>(null);

  const viewerUrl = useMemo(() => {
    if (!pdfUrl) {
      return null;
    }

    return `${pdfUrl}#toolbar=1&navpanes=0&view=FitH`;
  }, [pdfUrl]);

  useEffect(() => {
    if (previewTimeoutRef.current !== null) {
      window.clearTimeout(previewTimeoutRef.current);
    }
    setLoading(true);
    setError(null);

    if (!viewerUrl) return;

    previewTimeoutRef.current = window.setTimeout(() => {
      setLoading(false);
      setError("The preview is taking longer than expected");
    }, 15_000);

    return () => {
      if (previewTimeoutRef.current !== null) {
        window.clearTimeout(previewTimeoutRef.current);
      }
    };
  }, [viewerUrl, loadAttempt]);

  if (!viewerUrl) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-slate-400">
        <AlertCircle className="mb-2 h-8 w-8" />
        <p>No PDF available</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-2">
        <span className="text-xs text-slate-500">Original document preview</span>
        <a
          href={pdfUrl ?? undefined}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-[#202e46] hover:underline"
        >
          Open in new tab
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="relative min-h-[720px] flex-1 bg-slate-200">
        {loading && !error ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-200/80">
            <Loader2 className="h-6 w-6 animate-spin text-[#529ec6]" />
          </div>
        ) : null}

        {error ? (
          <div className="flex h-full min-h-[720px] flex-col items-center justify-center gap-3 p-6 text-center text-red-600">
            <AlertCircle className="h-8 w-8" />
            <div>
              <p className="font-medium">{error}</p>
              <p className="mt-1 text-sm text-slate-500">
                Retry here or open the document in a new tab to continue reviewing it.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setLoadAttempt((attempt) => attempt + 1)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Retry preview
              </button>
              <a
                href={pdfUrl ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#202e46] px-3 py-2 text-sm font-medium text-white hover:bg-[#1a2539]"
              >
                Open document
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        ) : (
          <iframe
            key={`${viewerUrl}-${loadAttempt}`}
            src={viewerUrl}
            title="Uploaded contract PDF"
            className="h-full min-h-[720px] w-full"
            onLoad={() => {
              if (previewTimeoutRef.current !== null) {
                window.clearTimeout(previewTimeoutRef.current);
              }
              setLoading(false);
              setError(null);
            }}
            onError={() => {
              if (previewTimeoutRef.current !== null) {
                window.clearTimeout(previewTimeoutRef.current);
              }
              setLoading(false);
              setError("Failed to load PDF preview");
            }}
          />
        )}
      </div>
    </div>
  );
}

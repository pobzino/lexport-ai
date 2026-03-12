"use client";

import { useMemo, useState } from "react";
import { AlertCircle, ExternalLink, Loader2 } from "lucide-react";

interface EmbeddedPDFViewerProps {
  pdfUrl: string | null;
}

export function EmbeddedPDFViewer({ pdfUrl }: EmbeddedPDFViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const viewerUrl = useMemo(() => {
    if (!pdfUrl) {
      return null;
    }

    return `${pdfUrl}#toolbar=1&navpanes=0&view=FitH`;
  }, [pdfUrl]);

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
        <span className="text-xs text-slate-500">Original PDF document</span>
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
              <p className="font-medium">Failed to load PDF preview</p>
              <p className="mt-1 text-sm text-slate-500">
                Open the original document in a new tab to continue reviewing it.
              </p>
            </div>
            <a
              href={pdfUrl ?? undefined}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#202e46] px-3 py-2 text-sm font-medium text-white hover:bg-[#1a2539]"
            >
              Open PDF
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        ) : (
          <iframe
            key={viewerUrl}
            src={viewerUrl}
            title="Uploaded contract PDF"
            className="h-full min-h-[720px] w-full"
            onLoad={() => {
              setLoading(false);
              setError(null);
            }}
            onError={() => {
              setLoading(false);
              setError("Failed to load PDF preview");
            }}
          />
        )}
      </div>
    </div>
  );
}

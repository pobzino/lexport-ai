"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

const Document = dynamic(
  () => import("react-pdf").then((module) => module.Document),
  { ssr: false },
);
const Page = dynamic(
  () => import("react-pdf").then((module) => module.Page),
  { ssr: false },
);

interface OriginalDocumentPreviewProps {
  file: File;
}

function getPreviewKind(file: File): "pdf" | "image" | "docx" {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "pdf" || file.type === "application/pdf") return "pdf";
  if (["jpg", "jpeg", "png"].includes(extension || "")) return "image";
  return "docx";
}

export function OriginalDocumentPreview({ file }: OriginalDocumentPreviewProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [pdfReady, setPdfReady] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [viewportWidth, setViewportWidth] = useState(760);
  const viewportRef = useRef<HTMLDivElement>(null);
  const kind = useMemo(() => getPreviewKind(file), [file]);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    setCurrentPage(1);
    setNumPages(0);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (kind !== "pdf") return;
    import("react-pdf").then((pdfjs) => {
      pdfjs.pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      setPdfReady(true);
    });
  }, [kind]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const updateWidth = () => setViewportWidth(viewport.clientWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [kind, objectUrl]);

  if (!objectUrl) {
    return (
      <div className="flex min-h-80 items-center justify-center rounded-2xl bg-slate-100">
        <Loader2 className="h-7 w-7 animate-spin text-[#397fa4]" />
      </div>
    );
  }

  if (kind === "image") {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#e8edf2]">
        <PreviewHeader fileName={file.name} pageLabel="1 page" />
        <div className="flex min-h-[540px] items-center justify-center overflow-auto p-8">
          {/* A local object URL cannot be optimized by next/image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={objectUrl}
            alt={`Original document preview: ${file.name}`}
            className="max-h-[720px] max-w-full bg-white object-contain shadow-[0_18px_50px_rgba(15,23,42,0.18)] ring-1 ring-slate-300"
          />
        </div>
      </div>
    );
  }

  if (kind === "docx") {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <PreviewHeader fileName={file.name} pageLabel="Word document" />
        <div className="flex min-h-80 flex-col items-center justify-center px-8 text-center">
          <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
            <FileText className="h-8 w-8" />
          </div>
          <h3 className="mt-4 font-semibold text-slate-900">Review the extracted document</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            Lexport will keep the Word file attached and create a review outline. Export it to PDF before placing legally positioned signature fields.
          </p>
        </div>
      </div>
    );
  }

  const basePageWidth = Math.max(300, Math.min(viewportWidth - 64, 760));

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#dfe6ec]">
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{file.name}</p>
          <p className="text-xs text-slate-500">Original document preview</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage <= 1}
            aria-label="Previous page"
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-35"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-20 text-center text-xs font-semibold text-slate-700">
            Page {currentPage} / {numPages || "..."}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.min(numPages || page, page + 1))}
            disabled={!numPages || currentPage >= numPages}
            aria-label="Next page"
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-35"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="mx-1 h-6 w-px bg-slate-200" />
          <button
            type="button"
            onClick={() => setZoom((value) => Math.max(0.65, value - 0.15))}
            disabled={zoom <= 0.65}
            aria-label="Zoom out"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-35"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-[11px] font-semibold text-slate-500">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((value) => Math.min(1.6, value + 0.15))}
            disabled={zoom >= 1.6}
            aria-label="Zoom in"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-35"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!pdfReady ? (
        <div className="flex min-h-[580px] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-[#397fa4]" />
        </div>
      ) : (
        <Document
          file={objectUrl}
          onLoadSuccess={({ numPages: pages }) => {
            setNumPages(pages);
            setCurrentPage((page) => Math.min(page, pages));
          }}
          className="flex h-[680px] min-h-0"
          loading={
            <div className="flex min-h-[580px] flex-1 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-[#397fa4]" />
            </div>
          }
          error={
            <div className="flex min-h-[580px] flex-1 items-center justify-center px-6 text-center text-sm text-red-600">
              The PDF preview could not be opened. Try another file or download and repair the source document.
            </div>
          }
        >
          {numPages > 0 && (
            <>
              <aside className="hidden w-32 flex-none overflow-y-auto border-r border-slate-300 bg-slate-100 p-3 md:block">
                <div className="space-y-3">
                  {Array.from({ length: numPages }, (_, index) => index + 1).map((pageNumber) => (
                    <button
                      type="button"
                      key={pageNumber}
                      onClick={() => setCurrentPage(pageNumber)}
                      aria-label={`Show page ${pageNumber}`}
                      aria-current={pageNumber === currentPage ? "page" : undefined}
                      className={`relative block w-full rounded-lg p-1.5 text-left transition ${
                        pageNumber === currentPage
                          ? "bg-white shadow ring-2 ring-[#397fa4]"
                          : "hover:bg-white/80"
                      }`}
                    >
                      <Page
                        pageNumber={pageNumber}
                        width={92}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                      <span className="mt-1 block text-center text-[10px] font-semibold text-slate-500">
                        {pageNumber}
                      </span>
                    </button>
                  ))}
                </div>
              </aside>
              <div
                ref={viewportRef}
                className="flex min-w-0 flex-1 justify-center overflow-auto p-6 sm:p-8"
              >
                <div className="h-fit bg-white shadow-[0_20px_60px_rgba(15,23,42,0.2)] ring-1 ring-slate-300">
                  <Page
                    pageNumber={currentPage}
                    width={basePageWidth * zoom}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </div>
              </div>
            </>
          )}
        </Document>
      )}
    </div>
  );
}

function PreviewHeader({ fileName, pageLabel }: { fileName: string; pageLabel: string }) {
  return (
    <div className="border-b border-slate-200 bg-white px-4 py-3">
      <p className="truncate text-sm font-semibold text-slate-900">{fileName}</p>
      <p className="text-xs text-slate-500">{pageLabel}</p>
    </div>
  );
}

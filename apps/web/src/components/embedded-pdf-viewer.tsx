"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
    ZoomIn,
    ZoomOut,
    Loader2,
    AlertCircle,
    Maximize2,
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

interface EmbeddedPDFViewerProps {
    pdfUrl: string | null;
}

export function EmbeddedPDFViewer({ pdfUrl }: EmbeddedPDFViewerProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [numPages, setNumPages] = useState(0);
    const [scale, setScale] = useState(1);
    const [isClient, setIsClient] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [pageWidth, setPageWidth] = useState(500);

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
                const containerWidth = containerRef.current.clientWidth - 48;
                const optimalWidth = Math.min(containerWidth, 600);
                setPageWidth(optimalWidth);
            }
        };

        updateWidth();
        window.addEventListener("resize", updateWidth);
        return () => window.removeEventListener("resize", updateWidth);
    }, []);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setLoading(false);
    };

    const onDocumentLoadError = (err: Error) => {
        const errorMessage = err.message || "";
        // Ignore transient blob URL errors
        if (
            errorMessage.includes("response (0)") ||
            errorMessage.includes("Unexpected server response") ||
            errorMessage.includes("aborted") ||
            errorMessage.includes("cancelled")
        ) {
            return;
        }
        console.error("PDF load error:", err);
        setError("Failed to load PDF");
        setLoading(false);
    };

    const zoomIn = () => setScale((s) => Math.min(s + 0.25, 2));
    const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));

    if (!pdfUrl) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <AlertCircle className="w-8 h-8 mb-2" />
                <p>No PDF available</p>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200">
                <span className="text-xs text-slate-500">
                    {numPages > 0 ? `${numPages} page${numPages > 1 ? 's' : ''}` : 'Loading...'}
                </span>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={zoomOut}
                            disabled={scale <= 0.5}
                            className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-50 transition-colors"
                        >
                            <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-medium min-w-[40px] text-center text-slate-600">
                            {Math.round(scale * 100)}%
                        </span>
                        <button
                            onClick={zoomIn}
                            disabled={scale >= 2}
                            className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-50 transition-colors"
                        >
                            <ZoomIn className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Scrollable PDF Content - All pages rendered continuously */}
            <div className="flex-1 overflow-auto bg-slate-200 p-4">
                {error ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-red-500">
                        <AlertCircle className="w-8 h-8" />
                        <span className="text-sm">{error}</span>
                    </div>
                ) : isClient ? (
                    <div className="flex flex-col items-center gap-4">
                        <Document
                            file={pdfUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                            loading={
                                <div className="flex items-center justify-center p-16">
                                    <Loader2 className="w-6 h-6 animate-spin text-[#529ec6]" />
                                </div>
                            }
                        >
                            {/* Render all pages */}
                            {Array.from(new Array(numPages), (_, index) => (
                                <div key={`page_${index + 1}`} className="shadow-lg bg-white mb-4">
                                    <Page
                                        pageNumber={index + 1}
                                        width={pageWidth}
                                        scale={scale}
                                        renderTextLayer={false}
                                        renderAnnotationLayer={false}
                                    />
                                </div>
                            ))}
                        </Document>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 animate-spin text-[#529ec6]" />
                    </div>
                )}
            </div>
        </div>
    );
}

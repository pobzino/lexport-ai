"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, MessageCircle, FileText } from "lucide-react";

interface PublicErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
  variant?: "sign" | "pay" | "generic";
}

export function PublicError({
  error,
  reset,
  title,
  description,
  variant = "generic",
}: PublicErrorProps) {
  useEffect(() => {
    console.error("Public page error:", error);
  }, [error]);

  const getDefaultTitle = () => {
    switch (variant) {
      case "sign":
        return "Unable to load signing page";
      case "pay":
        return "Unable to load payment page";
      default:
        return "Something went wrong";
    }
  };

  const getDefaultDescription = () => {
    switch (variant) {
      case "sign":
        return "We couldn't load the document for signing. The link may have expired, or there might be a temporary issue. Please try refreshing or contact the sender.";
      case "pay":
        return "We couldn't load the payment page. Please try refreshing or contact the sender for a new payment link.";
      default:
        return "We encountered an unexpected error. Please try again or contact support if the problem persists.";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        {/* Error illustration */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 bg-red-100 rounded-full" />
          <div className="absolute inset-3 bg-white rounded-full flex items-center justify-center shadow-lg">
            {variant === "sign" ? (
              <FileText className="w-10 h-10 text-red-400" />
            ) : (
              <AlertTriangle className="w-10 h-10 text-red-500" />
            )}
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          {title || getDefaultTitle()}
        </h1>

        <p className="text-slate-600 mb-8 leading-relaxed">
          {description || getDefaultDescription()}
        </p>

        {/* Error details (dev only) */}
        {process.env.NODE_ENV === "development" && error.message && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200 text-left">
            <p className="text-xs font-mono text-red-600 break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-red-400 mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#529ec6] text-white rounded-lg hover:bg-[#4a8db3] transition-colors font-medium shadow-sm"
            aria-label="Retry loading the page"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Try Again
          </button>
        </div>

        {/* Support link */}
        <div className="mt-12 pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-500 mb-3">
            If the problem persists, please contact the sender or reach out to support.
          </p>
          <a
            href="mailto:support@lexportai.com"
            className="inline-flex items-center gap-1.5 text-sm text-[#529ec6] hover:underline font-medium"
          >
            <MessageCircle className="w-4 h-4" aria-hidden="true" />
            Contact Support
          </a>
        </div>

        {/* Branding */}
        <div className="mt-8">
          <p className="text-xs text-slate-400">
            Powered by Lexport
          </p>
        </div>
      </div>
    </div>
  );
}

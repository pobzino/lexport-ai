"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home, MessageCircle } from "lucide-react";
import Link from "next/link";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
}

export function DashboardError({
  error,
  reset,
  title = "Something went wrong",
  description,
}: DashboardErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        {/* Error illustration */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 bg-red-100 rounded-full animate-pulse" />
          <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center shadow-sm">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          {title}
        </h2>

        <p className="text-slate-500 mb-6">
          {description || "We encountered an unexpected error while loading this page. Please try again or contact support if the problem persists."}
        </p>

        {/* Error details (dev only) */}
        {process.env.NODE_ENV === "development" && error.message && (
          <div className="mb-6 p-3 bg-red-50 rounded-lg border border-red-200 text-left">
            <p className="text-xs font-mono text-red-600 break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-red-400 mt-1">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#202e46] text-white rounded-lg hover:bg-[#1a2539] transition-colors font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Link>
        </div>

        {/* Support link */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-400 mb-2">Need help?</p>
          <a
            href="mailto:support@lexportai.com"
            className="inline-flex items-center gap-1 text-sm text-[#529ec6] hover:underline"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}

// Smaller inline error component for partial failures
interface InlineErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function InlineError({
  message = "Failed to load",
  onRetry
}: InlineErrorProps) {
  return (
    <div className="flex items-center justify-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
      <p className="text-sm text-red-600">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}

// Card-level error for sections that can fail independently
interface CardErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function CardError({
  title = "Unable to load",
  message = "Something went wrong while loading this section.",
  onRetry,
}: CardErrorProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-500 mb-4 max-w-sm mx-auto">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}

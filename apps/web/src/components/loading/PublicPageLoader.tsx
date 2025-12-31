"use client";

import { Loader2, FileText, CreditCard, Shield } from "lucide-react";

interface PublicPageLoaderProps {
  variant?: "sign" | "pay" | "review" | "generic";
  message?: string;
}

export function PublicPageLoader({
  variant = "generic",
  message,
}: PublicPageLoaderProps) {
  const getDefaultMessage = () => {
    switch (variant) {
      case "sign":
        return "Loading your document...";
      case "pay":
        return "Preparing payment details...";
      case "review":
        return "Loading document for review...";
      default:
        return "Loading...";
    }
  };

  const getIcon = () => {
    switch (variant) {
      case "sign":
        return FileText;
      case "pay":
        return CreditCard;
      case "review":
        return FileText;
      default:
        return Loader2;
    }
  };

  const Icon = getIcon();
  const displayMessage = message || getDefaultMessage();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <div className="text-center">
        {/* Animated loader */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          {/* Outer ring */}
          <div className="absolute inset-0 border-4 border-slate-200 rounded-full" />
          {/* Spinning ring */}
          <div className="absolute inset-0 border-4 border-transparent border-t-[#529ec6] rounded-full animate-spin" />
          {/* Inner icon */}
          <div className="absolute inset-3 bg-white rounded-full flex items-center justify-center shadow-sm">
            <Icon className="w-8 h-8 text-[#529ec6]" aria-hidden="true" />
          </div>
        </div>

        {/* Loading message */}
        <p className="text-slate-600 font-medium mb-2" role="status" aria-live="polite">
          {displayMessage}
        </p>

        {/* Security badge for payment pages */}
        {variant === "pay" && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 mt-4">
            <Shield className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Secure connection</span>
          </div>
        )}

        {/* Skeleton preview for document pages */}
        {(variant === "sign" || variant === "review") && (
          <div className="mt-8 w-64 mx-auto">
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
              <div className="space-y-3 animate-pulse">
                <div className="h-3 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-full" />
                <div className="h-3 bg-slate-200 rounded w-5/6" />
                <div className="h-3 bg-slate-200 rounded w-2/3" />
              </div>
            </div>
          </div>
        )}

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

"use client";

import Link from "next/link";
import { FileSignature, Send, ArrowRight, CheckCircle } from "lucide-react";

interface NoPendingSignaturesProps {
  showCta?: boolean;
  title?: string;
  description?: string;
  variant?: "no-pending" | "no-completed" | "no-any";
}

export function NoPendingSignatures({
  showCta = true,
  title,
  description,
  variant = "no-any",
}: NoPendingSignaturesProps) {
  // Different content based on variant
  const getContent = () => {
    switch (variant) {
      case "no-pending":
        return {
          icon: <CheckCircle className="w-10 h-10 text-emerald-500" />,
          bgColor: "from-emerald-100/50 to-emerald-50",
          iconBg: "bg-emerald-50",
          title: title || "All caught up!",
          description: description || "You have no pending signature requests. All signers have completed their signatures.",
        };
      case "no-completed":
        return {
          icon: <FileSignature className="w-10 h-10 text-[#529ec6]" />,
          bgColor: "from-[#529ec6]/20 to-[#202e46]/10",
          iconBg: "bg-white",
          title: title || "No completed signatures yet",
          description: description || "When signers complete their signatures, they'll appear here for tracking.",
        };
      default:
        return {
          icon: <FileSignature className="w-10 h-10 text-[#529ec6]" />,
          bgColor: "from-[#529ec6]/20 to-[#202e46]/10",
          iconBg: "bg-white",
          title: title || "No signature requests yet",
          description: description || "When you send contracts for signature, all your signature requests will appear here for easy tracking.",
        };
    }
  };

  const content = getContent();

  return (
    <div className="text-center py-16 px-6">
      {/* Illustration */}
      <div className="relative w-24 h-24 mx-auto mb-6">
        <div className={`absolute inset-0 bg-gradient-to-br ${content.bgColor} rounded-full`} />
        <div className={`absolute inset-2 ${content.iconBg} rounded-full flex items-center justify-center shadow-sm`}>
          {content.icon}
        </div>
        {/* Decorative signature lines */}
        <div className="absolute -right-2 top-1/2 -translate-y-1/2 space-y-1">
          <div className="w-8 h-0.5 bg-[#529ec6]/20 rounded-full" />
          <div className="w-6 h-0.5 bg-[#529ec6]/15 rounded-full ml-1" />
          <div className="w-4 h-0.5 bg-[#529ec6]/10 rounded-full ml-2" />
        </div>
      </div>

      <h3 className="text-xl font-semibold text-slate-900 mb-2">
        {content.title}
      </h3>
      <p className="text-slate-500 mb-8 max-w-md mx-auto">
        {content.description}
      </p>

      {showCta && variant === "no-any" && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/contracts/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#202e46] text-white rounded-lg hover:bg-[#1a2539] transition-colors font-medium"
          >
            <FileSignature className="w-4 h-4" />
            Create Your First Contract
          </Link>
        </div>
      )}

      {showCta && variant === "no-completed" && (
        <Link
          href="/contracts"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#202e46] hover:underline"
        >
          View your contracts
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}

      {showCta && variant === "no-pending" && (
        <Link
          href="/contracts"
          className="inline-flex items-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
        >
          <Send className="w-4 h-4" />
          Send More Contracts
        </Link>
      )}
    </div>
  );
}

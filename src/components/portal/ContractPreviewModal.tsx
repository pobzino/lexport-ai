"use client";

import { useState } from "react";
import { X, Download, FileText, Calendar, User, CheckCircle2 } from "lucide-react";

interface Contract {
  id: string;
  title: string;
  type: string;
  content?: string;
  created_at: string;
  status: string;
  payment_required: boolean;
  payment_amount: number | null;
  payment_currency: string | null;
  payment_status: string;
}

interface ContractPreviewModalProps {
  contract: Contract;
  signerName: string;
  signedAt: string | null;
  onClose: () => void;
}

function formatContractType(type: string): string {
  const types: Record<string, string> = {
    nda_mutual: "Mutual NDA",
    nda_one_way: "One-Way NDA",
    independent_contractor: "Contractor Agreement",
    consulting_agreement: "Consulting Agreement",
    safe_note: "SAFE Note",
    freelance_service: "Freelance Service Agreement",
  };
  return types[type] || type;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function ContractPreviewModal({
  contract,
  signerName,
  signedAt,
  onClose,
}: ContractPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "details">("preview");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-100 rounded-md flex items-center justify-center">
              <FileText className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">{contract.title}</h2>
              <p className="text-sm text-slate-500">{formatContractType(contract.type)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6">
          <button
            onClick={() => setActiveTab("preview")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "preview"
                ? "border-[#202e46] text-[#202e46]"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Document Preview
          </button>
          <button
            onClick={() => setActiveTab("details")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "details"
                ? "border-[#202e46] text-[#202e46]"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Details
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "preview" ? (
            <div className="prose prose-slate max-w-none">
              {contract.content ? (
                <div
                  className="text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: contract.content }}
                />
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Contract content not available for preview.</p>
                  <p className="text-sm mt-1">Download the PDF to view the full document.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="font-medium text-slate-900">Contract Signed</p>
                  <p className="text-sm text-slate-500">
                    All parties have signed this agreement
                  </p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wide">Created</span>
                  </div>
                  <p className="font-medium text-slate-900">{formatDate(contract.created_at)}</p>
                </div>

                {signedAt && (
                  <div className="p-4 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-wide">Signed</span>
                    </div>
                    <p className="font-medium text-slate-900">{formatDate(signedAt)}</p>
                  </div>
                )}

                <div className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <User className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wide">Your Role</span>
                  </div>
                  <p className="font-medium text-slate-900">{signerName}</p>
                </div>

                <div className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <FileText className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wide">Type</span>
                  </div>
                  <p className="font-medium text-slate-900">{formatContractType(contract.type)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Close
          </button>
          <a
            href={`/api/contracts/${contract.id}/pdf`}
            download
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#202e46] text-white text-sm font-medium rounded-md hover:bg-[#1a2539] transition-colors"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </a>
        </div>
      </div>
    </div>
  );
}

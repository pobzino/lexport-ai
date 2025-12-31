"use client";

import { useState } from "react";
import { X, FileStack, Globe, Lock, Loader2, Info, CheckCircle } from "lucide-react";
import { useOnboarding } from "@/components/onboarding";

interface ContractContent {
  preamble?: string;
  recitals?: string;
  clauses?: Array<{ id: string; title: string; content: string; type?: string; order?: number }>;
  signatureBlock?: string;
}

interface SaveAsTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: { name: string; description: string; is_public: boolean }) => Promise<void>;
  contractType: string;
  jurisdiction: string;
  content: ContractContent;
  defaultName?: string;
}

// Human-readable labels
const CONTRACT_TYPE_LABELS: Record<string, string> = {
  nda_mutual: "Mutual NDA",
  nda_one_way: "One-Way NDA",
  independent_contractor: "Independent Contractor",
  consulting_agreement: "Consulting Agreement",
  safe_note: "SAFE Note",
  freelance_service: "Freelance Service",
};

const JURISDICTION_LABELS: Record<string, string> = {
  us_california: "California, USA",
  us_texas: "Texas, USA",
  us_new_york: "New York, USA",
  uk: "United Kingdom",
};

export function SaveAsTemplateModal({
  isOpen,
  onClose,
  onSave,
  contractType,
  jurisdiction,
  content,
  defaultName = "",
}: SaveAsTemplateModalProps) {
  const { completeStep } = useOnboarding();
  const [name, setName] = useState(defaultName || "");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Template name is required");
      return;
    }

    setSaving(true);
    try {
      await onSave({ name: name.trim(), description: description.trim(), is_public: isPublic });
      setSaved(true);
      // Mark onboarding step complete
      completeStep("save_template");
      // Auto-close after showing success
      setTimeout(() => {
        onClose();
        setSaved(false);
      }, 1500);
    } catch (err) {
      console.error("Error saving template:", err);
      setError("Failed to save template. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const clauseCount = content?.clauses?.length || 0;
  const typeLabel = CONTRACT_TYPE_LABELS[contractType] || contractType;
  const jurisdictionLabel = JURISDICTION_LABELS[jurisdiction] || jurisdiction;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#529ec6]/10 rounded-lg flex items-center justify-center">
              <FileStack className="w-5 h-5 text-[#529ec6]" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Save as Template</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Standard NDA for Acquisitions"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6]/20 focus:border-[#529ec6]"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe when to use this template..."
              rows={3}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6]/20 focus:border-[#529ec6] resize-none"
            />
          </div>

          {/* Public Toggle */}
          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
            <div className="flex-shrink-0 mt-0.5">
              {isPublic ? (
                <Globe className="w-5 h-5 text-green-600" />
              ) : (
                <Lock className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div className="flex-1">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium text-slate-900">
                  Make this template public
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-checked:bg-[#202e46] transition-colors" />
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                </div>
              </label>
              <p className="text-xs text-slate-500 mt-1">
                {isPublic
                  ? "Anyone can find and use this template"
                  : "Only you can see and use this template"}
              </p>
            </div>
          </div>

          {/* Preview Info */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">What will be saved:</p>
              <ul className="text-xs space-y-0.5">
                <li>Contract type: {typeLabel}</li>
                <li>Jurisdiction: {jurisdictionLabel}</li>
                <li>{clauseCount} clause{clauseCount !== 1 ? "s" : ""}</li>
                <li>Preamble, recitals, and signature block</li>
              </ul>
              <p className="text-xs mt-2 text-blue-600 font-medium">
                Filled values (names, dates, amounts) will be converted to blank fields that can be filled in later.
              </p>
            </div>
          </div>

          {/* Success */}
          {saved && (
            <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 text-sm rounded-lg">
              <CheckCircle className="w-4 h-4" />
              Template saved successfully!
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || saved || !name.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#202e46] rounded-lg hover:bg-[#1a2539] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Saved!
              </>
            ) : (
              <>
                <FileStack className="w-4 h-4" />
                Save Template
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

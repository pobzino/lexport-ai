"use client";

import { useState } from "react";
import { X, FileStack, Globe, Lock, Loader2, Info } from "lucide-react";

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

export function SaveAsTemplateModal({
  isOpen,
  onClose,
  onSave,
  contractType,
  jurisdiction,
  content,
  defaultName = "",
}: SaveAsTemplateModalProps) {
  const [name, setName] = useState(defaultName || "");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
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
      onClose();
    } catch (err) {
      console.error("Error saving template:", err);
      setError("Failed to save template. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const clauseCount = content?.clauses?.length || 0;

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
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
              <FileStack className="w-5 h-5 text-violet-600" />
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
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
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
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none"
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
                  <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-checked:bg-violet-600 transition-colors" />
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
                <li>Contract type: {contractType}</li>
                <li>Jurisdiction: {jurisdiction}</li>
                <li>{clauseCount} clause{clauseCount !== 1 ? "s" : ""}</li>
                <li>Preamble, recitals, and signature block</li>
              </ul>
              <p className="text-xs mt-2 text-blue-600">
                Party names and specific details will not be saved.
              </p>
            </div>
          </div>

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
            disabled={saving || !name.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
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

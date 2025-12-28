"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  FileText,
  Loader2,
  ArrowRight,
  AlertCircle,
  Eye,
  Sparkles,
} from "lucide-react";
import { PlaceholderEditor, PlaceholderPreview } from "./PlaceholderEditor";
import {
  extractPlaceholders,
  validatePlaceholderValues,
  type UserProfileData,
} from "@/lib/contracts/placeholders";

interface Template {
  id: string;
  name: string;
  description: string | null;
  type: string;
  jurisdiction: string;
  content: {
    preamble: string;
    recitals: string;
    clauses: Array<{ id: string; title: string; content: string }>;
    signatureBlock: string;
  };
}

interface UseTemplateModalProps {
  template: Template;
  isOpen: boolean;
  onClose: () => void;
}

export function UseTemplateModal({
  template,
  isOpen,
  onClose,
}: UseTemplateModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<"fill" | "preview">("fill");
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({});
  const [userProfile, setUserProfile] = useState<Partial<UserProfileData> | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Count placeholders
  const allContent = [
    template.content.preamble,
    template.content.recitals,
    ...template.content.clauses.map((c) => c.content),
    template.content.signatureBlock,
  ].join(" ");
  const placeholderCount = extractPlaceholders(allContent).length;

  // Fetch user profile for autofill
  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    }
  }, [isOpen]);

  const fetchProfile = async () => {
    setProfileLoading(true);
    try {
      const response = await fetch("/api/profile");
      if (response.ok) {
        const data = await response.json();
        setUserProfile({
          name: data.profile.name || "",
          email: data.profile.email || "",
          company_name: data.profile.company_name || "",
          job_title: data.profile.job_title || "",
          address: data.profile.address || "",
          phone: data.profile.phone || "",
          default_jurisdiction: data.profile.default_jurisdiction || "",
        });
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    setError(null);

    try {
      const response = await fetch(`/api/templates/${template.id}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeholderValues,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create contract");
      }

      // Redirect to the new contract
      router.push(`/contracts/${data.contract.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create contract");
    } finally {
      setCreating(false);
    }
  };

  const validation = validatePlaceholderValues(allContent, placeholderValues);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Use Template: {template.name}
              </h2>
              <p className="text-sm text-slate-500">
                {placeholderCount > 0
                  ? `Fill in ${placeholderCount} fields to create your contract`
                  : "Create a contract from this template"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Step Indicator */}
        {placeholderCount > 0 && (
          <div className="flex items-center gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200">
            <button
              onClick={() => setStep("fill")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                step === "fill"
                  ? "bg-violet-100 text-violet-700"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-current text-white flex items-center justify-center text-xs">
                1
              </span>
              Fill Details
            </button>
            <ArrowRight className="w-4 h-4 text-slate-300" />
            <button
              onClick={() => setStep("preview")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                step === "preview"
                  ? "bg-violet-100 text-violet-700"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-current text-white flex items-center justify-center text-xs">
                2
              </span>
              Preview
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === "fill" && placeholderCount > 0 ? (
            profileLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
              </div>
            ) : (
              <PlaceholderEditor
                content={template.content}
                values={placeholderValues}
                onChange={setPlaceholderValues}
                userProfile={userProfile || undefined}
                showAutofill={true}
              />
            )
          ) : step === "preview" || placeholderCount === 0 ? (
            <div className="space-y-6">
              {/* Preview Header */}
              <div className="flex items-center gap-2 text-slate-600">
                <Eye className="w-4 h-4" />
                <span className="text-sm font-medium">Contract Preview</span>
              </div>

              {/* Preamble */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                  Preamble
                </h4>
                <PlaceholderPreview
                  content={template.content.preamble}
                  values={placeholderValues}
                />
              </div>

              {/* Recitals */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                  Recitals
                </h4>
                <PlaceholderPreview
                  content={template.content.recitals}
                  values={placeholderValues}
                />
              </div>

              {/* Clauses Preview */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-500 uppercase">
                  Clauses ({template.content.clauses.length})
                </h4>
                {template.content.clauses.slice(0, 2).map((clause) => (
                  <div key={clause.id} className="p-4 bg-slate-50 rounded-lg">
                    <p className="font-medium text-slate-900 mb-2">
                      {clause.title}
                    </p>
                    <div className="text-sm text-slate-600 line-clamp-3">
                      <PlaceholderPreview
                        content={clause.content}
                        values={placeholderValues}
                      />
                    </div>
                  </div>
                ))}
                {template.content.clauses.length > 2 && (
                  <p className="text-sm text-slate-400 text-center">
                    + {template.content.clauses.length - 2} more clauses
                  </p>
                )}
              </div>

              {/* Validation Warning */}
              {!validation.valid && (
                <div className="flex items-start gap-2 p-4 bg-amber-50 text-amber-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Missing required fields</p>
                    <p className="text-sm mt-1">
                      {validation.missing.map((m) => m.label).join(", ")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {error && (
            <div className="mt-4 flex items-start gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={step === "preview" && placeholderCount > 0 ? () => setStep("fill") : onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {step === "preview" && placeholderCount > 0 ? "Back" : "Cancel"}
          </button>

          {step === "fill" && placeholderCount > 0 ? (
            <button
              onClick={() => setStep("preview")}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors"
            >
              Preview
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Create Contract
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  FileStack,
  Save,
  Download,
  Loader2,
  ChevronDown,
  Check,
  X,
  Globe,
  Lock,
  Trash2,
} from "lucide-react";
import type { SignatureField } from "@/components/signature-field-editor";

interface FieldTemplate {
  id: string;
  name: string;
  description?: string;
  contract_type?: string;
  fields: Array<{
    type: string;
    label?: string;
    signerRole: string;
    required: boolean;
    positionX: number;
    positionY: number;
    width: number;
    height: number;
    order: number;
  }>;
  is_public: boolean;
  created_by_id: string;
  usage_count: number;
  created_at: string;
}

interface FieldTemplateEditorProps {
  contractId: string;
  contractType?: string;
  currentFields: SignatureField[];
  onApplyTemplate: (fields: SignatureField[]) => void;
  onFieldsChange?: () => void;
}

export function FieldTemplateEditor({
  contractId,
  contractType,
  currentFields,
  onApplyTemplate,
  onFieldsChange,
}: FieldTemplateEditorProps) {
  const [templates, setTemplates] = useState<FieldTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Save modal state
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [saveIsPublic, setSaveIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Applying template state
  const [applying, setApplying] = useState(false);

  // Fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (contractType) params.set("contract_type", contractType);
        params.set("public", "all");

        const response = await fetch(`/api/field-templates?${params}`);
        if (response.ok) {
          const data = await response.json();
          setTemplates(data.templates || []);
        }
      } catch (error) {
        console.error("Error fetching field templates:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [contractType]);

  const handleApplyTemplate = async (template: FieldTemplate) => {
    setApplying(true);
    setShowDropdown(false);

    try {
      const response = await fetch(`/api/field-templates/${template.id}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId }),
      });

      if (response.ok) {
        const data = await response.json();
        // Convert DB fields to SignatureField format
        const newFields: SignatureField[] = data.fields.map((f: {
          id: string;
          type: string;
          label?: string;
          signer_role: string;
          required: boolean;
          position_x: number;
          position_y: number;
          width: number;
          height: number;
          order: number;
        }) => ({
          id: f.id,
          type: f.type as SignatureField["type"],
          label: f.label,
          signerRole: f.signer_role,
          required: f.required,
          positionX: f.position_x,
          positionY: f.position_y,
          width: f.width,
          height: f.height,
          order: f.order,
        }));
        onApplyTemplate(newFields);
        onFieldsChange?.();
      } else {
        console.error("Failed to apply template");
      }
    } catch (error) {
      console.error("Error applying template:", error);
    } finally {
      setApplying(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!saveName.trim()) {
      setSaveError("Template name is required");
      return;
    }

    if (currentFields.length === 0) {
      setSaveError("No fields to save");
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const response = await fetch("/api/field-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveName.trim(),
          description: saveDescription.trim() || undefined,
          contract_type: contractType,
          fields: currentFields.map((f) => ({
            type: f.type,
            label: f.label,
            signerRole: f.signerRole,
            required: f.required,
            positionX: f.positionX,
            positionY: f.positionY,
            width: f.width,
            height: f.height,
            order: f.order,
          })),
          is_public: saveIsPublic,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates((prev) => [data.template, ...prev]);
        setShowSaveModal(false);
        setSaveName("");
        setSaveDescription("");
        setSaveIsPublic(false);
      } else {
        setSaveError("Failed to save template");
      }
    } catch (error) {
      console.error("Error saving template:", error);
      setSaveError("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this field template?")) return;

    try {
      const response = await fetch(`/api/field-templates/${templateId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      }
    } catch (error) {
      console.error("Error deleting template:", error);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Load Template Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={loading || applying}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {applying ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Load Preset</span>
          <ChevronDown className="w-4 h-4" />
        </button>

        {showDropdown && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 max-h-80 overflow-auto">
              {loading ? (
                <div className="p-4 text-center text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading presets...
                </div>
              ) : templates.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm">
                  <FileStack className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No saved presets yet
                </div>
              ) : (
                templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleApplyTemplate(template)}
                    className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 truncate">
                          {template.name}
                        </span>
                        {template.is_public ? (
                          <Globe className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        ) : (
                          <Lock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{template.fields?.length || 0} fields</span>
                        <span>·</span>
                        <span>{template.usage_count || 0} uses</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteTemplate(template.id, e)}
                      className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Save Template Button */}
      <button
        onClick={() => setShowSaveModal(true)}
        disabled={currentFields.length === 0}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-violet-600 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Save className="w-4 h-4" />
        <span className="hidden sm:inline">Save Preset</span>
      </button>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowSaveModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                  <FileStack className="w-5 h-5 text-violet-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Save Field Preset</h2>
              </div>
              <button
                onClick={() => setShowSaveModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Preset Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="e.g., Standard Two-Party Signature"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description <span className="text-slate-400">(optional)</span>
                </label>
                <textarea
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="Describe when to use this preset..."
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={saveIsPublic}
                  onChange={(e) => setSaveIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <label htmlFor="isPublic" className="text-sm text-slate-600 cursor-pointer">
                  Make this preset public
                </label>
              </div>

              <div className="text-sm text-slate-500 bg-blue-50 p-3 rounded-lg">
                <p>
                  <strong>{currentFields.length}</strong> field{currentFields.length !== 1 ? "s" : ""} will be saved:
                </p>
                <ul className="mt-1 ml-4 list-disc">
                  {currentFields.slice(0, 3).map((f) => (
                    <li key={f.id}>{f.type} ({f.signerRole})</li>
                  ))}
                  {currentFields.length > 3 && (
                    <li>...and {currentFields.length - 3} more</li>
                  )}
                </ul>
              </div>

              {saveError && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                  {saveError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={saving || !saveName.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Preset
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

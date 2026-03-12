"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Users,
  Briefcase,
  DollarSign,
  Handshake,
  FileCheck,
  Globe,
  Lock,
  Play,
  Pencil,
  Trash2,
  Loader2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Crown,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import type { Template } from "@/db/types";
import { useSubscription } from "@/lib/hooks/useSubscription";

// Contract type icons
const CONTRACT_TYPE_ICONS: Record<string, typeof FileText> = {
  nda_mutual: Users,
  nda_one_way: FileText,
  nda_oneway: FileText,
  independent_contractor: Briefcase,
  contractor_agreement: Briefcase,
  consulting_agreement: Handshake,
  safe_note: DollarSign,
  freelance_service: FileCheck,
  service_agreement: FileCheck,
};

// Contract type display names
const CONTRACT_TYPE_NAMES: Record<string, string> = {
  nda_mutual: "Mutual NDA",
  nda_one_way: "One-Way NDA",
  nda_oneway: "One-Way NDA",
  independent_contractor: "Independent Contractor",
  contractor_agreement: "Contractor Agreement",
  consulting_agreement: "Consulting Agreement",
  safe_note: "SAFE Note",
  freelance_service: "Freelance Service",
  service_agreement: "Service Agreement",
};

// Jurisdiction display names
const JURISDICTION_NAMES: Record<string, string> = {
  us_california: "California, USA",
  us_texas: "Texas, USA",
  us_new_york: "New York, USA",
  uk: "United Kingdom",
  CA: "California, USA",
  TX: "Texas, USA",
  NY: "New York, USA",
  UK: "United Kingdom",
};

export default function TemplateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;
  const subscription = useSubscription();

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  // Premium template ownership
  const [ownsTemplate, setOwnsTemplate] = useState<boolean | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  // Using template state
  const [isUsing, setIsUsing] = useState(false);

  // Clauses expansion state
  const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set());

  // Prevent right-click on protected content
  const handleContextMenu = (e: React.MouseEvent) => {
    if (template?.is_premium && !ownsTemplate && !subscription.hasPremiumTemplates) {
      e.preventDefault();
    }
  };

  useEffect(() => {
    async function fetchTemplate() {
      try {
        const response = await fetch(`/api/templates/${templateId}`);
        if (!response.ok) {
          throw new Error("Template not found");
        }
        const data = await response.json();
        setTemplate(data.template);

        // Check ownership
        const userResponse = await fetch("/api/auth/me");
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setIsOwner(data.template.created_by_id === userData.user?.id);
        }

        // Check premium template ownership
        if (data.template.is_premium) {
          const ownershipResponse = await fetch(`/api/templates/${templateId}/purchase`);
          if (ownershipResponse.ok) {
            const ownershipData = await ownershipResponse.json();
            setOwnsTemplate(ownershipData.owned);
          }
        } else {
          setOwnsTemplate(true); // Non-premium templates are "owned" by everyone
        }
      } catch (err) {
        console.error("Error fetching template:", err);
        setError("Failed to load template");
      } finally {
        setLoading(false);
      }
    }

    fetchTemplate();
  }, [templateId]);

  // Handle purchasing premium template
  const handlePurchase = async () => {
    setIsPurchasing(true);
    try {
      const response = await fetch(`/api/templates/${templateId}/purchase`, {
        method: "POST",
      });
      const data = await response.json();

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else if (data.success) {
        // Pro/Team user - template was granted
        setOwnsTemplate(true);
      }
    } catch (err) {
      console.error("Failed to purchase template:", err);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleEdit = () => {
    if (!template) return;
    setEditName(template.name);
    setEditDescription(template.description || "");
    setEditIsPublic(template.is_public);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!template) return;
    setSaving(true);

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          is_public: editIsPublic,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTemplate(data.template);
        setIsEditing(false);
      } else {
        throw new Error("Failed to save");
      }
    } catch (err) {
      console.error("Error saving template:", err);
      alert("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this template? This cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/my-templates");
      } else {
        throw new Error("Failed to delete");
      }
    } catch (err) {
      console.error("Error deleting template:", err);
      alert("Failed to delete template");
    }
  };

  const handleUse = async () => {
    setIsUsing(true);
    try {
      const response = await fetch(`/api/templates/${templateId}/use`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/contracts/${data.contract.id}/edit`);
      } else {
        throw new Error("Failed to create contract");
      }
    } catch (err) {
      console.error("Error using template:", err);
      alert("Failed to create contract from template");
    } finally {
      setIsUsing(false);
    }
  };

  const toggleClause = (clauseId: string) => {
    setExpandedClauses((prev) => {
      const next = new Set(prev);
      if (next.has(clauseId)) {
        next.delete(clauseId);
      } else {
        next.add(clauseId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-slate-200 rounded" />
          <div className="h-32 bg-slate-100 rounded-xl" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-100 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error || "Template not found"}</p>
          <Link
            href="/my-templates"
            className="text-[#529ec6] hover:text-[#202e46] font-medium"
          >
            Back to Templates
          </Link>
        </div>
      </div>
    );
  }

  const Icon = CONTRACT_TYPE_ICONS[template.type] || FileText;
  const typeName = CONTRACT_TYPE_NAMES[template.type] || template.type;
  const jurisdictionName = JURISDICTION_NAMES[template.jurisdiction] || template.jurisdiction;
  const content = template.content as {
    preamble?: string;
    recitals?: string;
    clauses?: Array<{ id: string; title: string; content: string }>;
    signatureBlock?: string;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Link */}
      <Link
        href="/templates"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Templates
      </Link>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-[#529ec6]/10 rounded-xl flex items-center justify-center">
              <Icon className="w-7 h-7 text-[#529ec6]" />
            </div>
            <div>
              {isEditing ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-xl font-bold text-slate-900 border border-slate-300 rounded-lg px-3 py-1 w-full focus:outline-none focus:ring-2 focus:ring-[#529ec6]"
                />
              ) : (
                <h1 className="text-xl font-bold text-slate-900">{template.name}</h1>
              )}
              <div className="flex items-center gap-3 mt-2">
                <span className="text-sm font-medium text-[#529ec6] bg-[#529ec6]/5 px-2 py-0.5 rounded">
                  {typeName}
                </span>
                <span className="text-sm text-slate-500">{jurisdictionName}</span>
                {template.is_public ? (
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Globe className="w-3 h-3" />
                    Public
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Lock className="w-3 h-3" />
                    Private
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#202e46] rounded-lg hover:bg-[#1a2539] transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </button>
              </>
            ) : (
              <>
                {isOwner && (
                  <>
                    <button
                      onClick={handleEdit}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </>
                )}
                <button
                  onClick={handleUse}
                  disabled={isUsing}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#202e46] rounded-lg hover:bg-[#1a2539] transition-colors disabled:opacity-50"
                >
                  {isUsing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  Use This Template
                </button>
              </>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="mt-4">
          {isEditing ? (
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Add a description..."
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#529ec6]"
            />
          ) : template.description ? (
            <p className="text-slate-600">{template.description}</p>
          ) : (
            <p className="text-slate-400 italic">No description</p>
          )}
        </div>

        {/* Public Toggle (Edit Mode) */}
        {isEditing && (
          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={editIsPublic}
              onChange={(e) => setEditIsPublic(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-[#529ec6] focus:ring-[#529ec6]"
            />
            <span className="text-sm text-slate-600">Make this template public</span>
          </label>
        )}

        {/* Stats */}
        <div className="flex items-center gap-6 mt-6 pt-4 border-t border-slate-100">
          <div>
            <span className="text-2xl font-bold text-slate-900">{template.usage_count || 0}</span>
            <span className="text-sm text-slate-500 ml-1">uses</span>
          </div>
          <div>
            <span className="text-sm text-slate-500">
              Created {new Date(template.created_at).toLocaleDateString()}
            </span>
          </div>
          {template.updated_at !== template.created_at && (
            <div>
              <span className="text-sm text-slate-500">
                Updated {new Date(template.updated_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Contract Preview */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 relative">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Contract Preview</h2>
          {template.is_premium && (
            <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
              <Crown className="w-3 h-3" />
              Premium Template
            </span>
          )}
        </div>

        {/* Premium Upgrade Banner (shown when user doesn't own premium template) */}
        {template.is_premium && !ownsTemplate && !subscription.hasPremiumTemplates && (
          <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 mb-1">
                  Unlock this Premium Template
                </h3>
                <p className="text-sm text-slate-600 mb-3">
                  Get access to this professionally crafted template. Pro subscribers get all premium templates included.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePurchase}
                    disabled={isPurchasing}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {isPurchasing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShoppingCart className="w-4 h-4" />
                    )}
                    Buy for ${((template.price || 1000) / 100).toFixed(0)}
                  </button>
                  <Link
                    href="/settings/billing"
                    className="text-sm font-medium text-amber-700 hover:text-amber-800"
                  >
                    or upgrade to Pro for all templates
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content with copy protection */}
        <div
          className={`${template.is_premium && !ownsTemplate && !subscription.hasPremiumTemplates ? "copy-protected" : ""}`}
          onContextMenu={handleContextMenu}
        >
          {/* Preamble */}
          {content?.preamble && (
            <div className={`mb-6 ${template.is_premium && !ownsTemplate && !subscription.hasPremiumTemplates ? "content-blur" : ""}`}>
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">
                Preamble
              </h3>
              <p className="text-slate-700 whitespace-pre-wrap">{content.preamble}</p>
            </div>
          )}

          {/* Recitals */}
          {content?.recitals && (
            <div className={`mb-6 ${template.is_premium && !ownsTemplate && !subscription.hasPremiumTemplates ? "content-blur" : ""}`}>
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">
                Recitals
              </h3>
              <p className="text-slate-700 whitespace-pre-wrap">{content.recitals}</p>
            </div>
          )}

          {/* Clauses */}
          {content?.clauses && content.clauses.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">
                Clauses ({content.clauses.length})
              </h3>
              <div className="space-y-2">
                {content.clauses.map((clause, index) => (
                  <div
                    key={clause.id}
                    className="border border-slate-200 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleClause(clause.id)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <span className="font-medium text-slate-900">
                        {index + 1}. {clause.title}
                      </span>
                      {expandedClauses.has(clause.id) ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                    {expandedClauses.has(clause.id) && (
                      <div className={`px-4 py-3 text-slate-700 whitespace-pre-wrap ${template.is_premium && !ownsTemplate && !subscription.hasPremiumTemplates ? "content-blur" : ""}`}>
                        {clause.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signature Block */}
          {content?.signatureBlock && (
            <div className={template.is_premium && !ownsTemplate && !subscription.hasPremiumTemplates ? "content-blur" : ""}>
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">
                Signature Block
              </h3>
              <p className="text-slate-700 whitespace-pre-wrap">{content.signatureBlock}</p>
            </div>
          )}

          {/* Empty State */}
          {!content?.preamble && !content?.recitals && (!content?.clauses || content.clauses.length === 0) && (
            <p className="text-slate-400 italic text-center py-8">
              No content preview available
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

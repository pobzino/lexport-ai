"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Users,
  Briefcase,
  DollarSign,
  Handshake,
  FileCheck,
  MoreVertical,
  Play,
  Pencil,
  Trash2,
  Globe,
  Lock,
  Loader2,
} from "lucide-react";
import type { Template } from "@/db/types";

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
  independent_contractor: "Contractor",
  contractor_agreement: "Contractor",
  consulting_agreement: "Consulting",
  safe_note: "SAFE Note",
  freelance_service: "Freelance",
  service_agreement: "Service",
};

// Jurisdiction display names
const JURISDICTION_NAMES: Record<string, string> = {
  us_california: "California",
  us_texas: "Texas",
  us_new_york: "New York",
  uk: "UK",
  CA: "California",
  TX: "Texas",
  NY: "New York",
  UK: "UK",
};

interface TemplateCardProps {
  template: Template;
  isOwner: boolean;
  onUse?: (template: Template) => void;
  onEdit?: (template: Template) => void;
  onDelete?: (template: Template) => void;
}

export function TemplateCard({
  template,
  isOwner,
  onUse,
  onEdit,
  onDelete,
}: TemplateCardProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [isUsing, setIsUsing] = useState(false);

  const Icon = CONTRACT_TYPE_ICONS[template.type] || FileText;
  const typeName = CONTRACT_TYPE_NAMES[template.type] || template.type;
  const jurisdictionName = JURISDICTION_NAMES[template.jurisdiction] || template.jurisdiction;

  const handleUse = async () => {
    if (onUse) {
      onUse(template);
    } else {
      // Default behavior: create contract from template
      setIsUsing(true);
      try {
        const response = await fetch(`/api/templates/${template.id}/use`, {
          method: "POST",
        });
        if (response.ok) {
          const { contract } = await response.json();
          router.push(`/contracts/${contract.id}/edit`);
        }
      } catch (error) {
        console.error("Failed to use template:", error);
      } finally {
        setIsUsing(false);
      }
    }
  };

  return (
    <div className="group relative bg-white border border-slate-200 rounded-xl p-4 hover:border-violet-300 hover:shadow-md transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
            <Icon className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-violet-600 bg-violet-50 px-2 py-0.5 rounded">
                {typeName}
              </span>
              <span className="text-xs text-slate-500">{jurisdictionName}</span>
            </div>
          </div>
        </div>

        {/* Menu */}
        {isOwner && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20 min-w-[120px]">
                  {onEdit && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onEdit(template);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onDelete(template);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <h3 className="font-semibold text-slate-900 mb-1 line-clamp-1">
        {template.name}
      </h3>
      {template.description && (
        <p className="text-sm text-slate-500 line-clamp-2 mb-3">
          {template.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          {template.is_public ? (
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              Public
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Private
            </span>
          )}
          <span>{template.usage_count || 0} uses</span>
        </div>

        <button
          onClick={handleUse}
          disabled={isUsing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-violet-600 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors disabled:opacity-50"
        >
          {isUsing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          Use
        </button>
      </div>
    </div>
  );
}

// Skeleton for loading state
export function TemplateCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 bg-slate-200 rounded-lg" />
        <div className="space-y-2">
          <div className="h-4 w-20 bg-slate-200 rounded" />
          <div className="h-3 w-16 bg-slate-100 rounded" />
        </div>
      </div>
      <div className="h-5 w-3/4 bg-slate-200 rounded mb-2" />
      <div className="h-4 w-full bg-slate-100 rounded mb-1" />
      <div className="h-4 w-2/3 bg-slate-100 rounded mb-3" />
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="h-4 w-20 bg-slate-100 rounded" />
        <div className="h-8 w-16 bg-slate-200 rounded-lg" />
      </div>
    </div>
  );
}

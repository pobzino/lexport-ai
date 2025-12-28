"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  Receipt,
  Target,
  RefreshCw,
  FileText,
  Plus,
  Check,
} from "lucide-react";
import type { InvoiceTemplate, InvoiceTemplateType } from "@/db/types";

interface InvoiceTemplateSelectorProps {
  onSelect: (template: InvoiceTemplate | null) => void;
  selectedTemplateId?: string | null;
  showCustomOption?: boolean;
  onCreateCustom?: () => void;
}

const TEMPLATE_CONFIG: Record<InvoiceTemplateType, {
  icon: typeof Clock;
  color: string;
  iconBg: string;
  selectedBg: string;
  selectedBorder: string;
}> = {
  hourly: {
    icon: Clock,
    color: "text-blue-600",
    iconBg: "bg-blue-50",
    selectedBg: "bg-blue-50",
    selectedBorder: "ring-blue-600",
  },
  fixed_fee: {
    icon: Receipt,
    color: "text-emerald-600",
    iconBg: "bg-emerald-50",
    selectedBg: "bg-emerald-50",
    selectedBorder: "ring-emerald-600",
  },
  milestone: {
    icon: Target,
    color: "text-violet-600",
    iconBg: "bg-violet-50",
    selectedBg: "bg-violet-50",
    selectedBorder: "ring-violet-600",
  },
  retainer: {
    icon: RefreshCw,
    color: "text-amber-600",
    iconBg: "bg-amber-50",
    selectedBg: "bg-amber-50",
    selectedBorder: "ring-amber-600",
  },
  custom: {
    icon: FileText,
    color: "text-slate-600",
    iconBg: "bg-slate-100",
    selectedBg: "bg-slate-50",
    selectedBorder: "ring-slate-600",
  },
};

export function InvoiceTemplateSelector({
  onSelect,
  selectedTemplateId,
  showCustomOption = true,
  onCreateCustom,
}: InvoiceTemplateSelectorProps) {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/invoices/templates");
      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const systemTemplates = templates.filter((t) => t.is_system);
  const userTemplates = templates.filter((t) => !t.is_system);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-[120px] rounded-xl border border-slate-200 animate-pulse bg-slate-50"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-red-50 rounded-xl border border-red-200">
        <p className="text-red-600 font-medium">{error}</p>
        <button
          onClick={fetchTemplates}
          className="mt-3 text-sm text-red-700 hover:text-red-800 underline underline-offset-2"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* All Templates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* System Templates */}
        {systemTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isSelected={selectedTemplateId === template.id}
            onSelect={() => onSelect(template)}
          />
        ))}

        {/* Blank Invoice Option */}
        {showCustomOption && (
          <BlankInvoiceCard
            isSelected={selectedTemplateId === null}
            onSelect={() => onSelect(null)}
          />
        )}
      </div>

      {/* User Templates */}
      {userTemplates.length > 0 && (
        <div className="pt-6 border-t border-slate-200">
          <h3 className="text-sm font-medium text-slate-700 mb-4">
            Your Custom Templates
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {userTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={selectedTemplateId === template.id}
                onSelect={() => onSelect(template)}
              />
            ))}

            {onCreateCustom && (
              <button
                onClick={onCreateCustom}
                className="group h-[120px] rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-400 bg-white transition-all flex items-center justify-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors">
                  <Plus className="w-5 h-5 text-slate-500" />
                </div>
                <span className="text-sm font-medium text-slate-600">
                  Create Template
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface TemplateCardProps {
  template: InvoiceTemplate;
  isSelected: boolean;
  onSelect: () => void;
}

function TemplateCard({ template, isSelected, onSelect }: TemplateCardProps) {
  const config = TEMPLATE_CONFIG[template.template_type] || TEMPLATE_CONFIG.custom;
  const Icon = config.icon;

  return (
    <button
      onClick={onSelect}
      className={`
        relative h-[120px] rounded-xl border bg-white transition-all text-left p-5
        flex items-start gap-4
        ${isSelected
          ? `ring-2 ${config.selectedBorder} border-transparent ${config.selectedBg}`
          : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
        }
      `}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Icon */}
      <div className={`w-11 h-11 rounded-xl ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${config.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-slate-900 leading-tight">
          {template.name}
        </h4>
        {template.description && (
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-3">
            {template.description}
          </p>
        )}
      </div>
    </button>
  );
}

interface BlankInvoiceCardProps {
  isSelected: boolean;
  onSelect: () => void;
}

function BlankInvoiceCard({ isSelected, onSelect }: BlankInvoiceCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`
        relative h-[120px] rounded-xl border bg-white transition-all text-left p-5
        flex items-start gap-4
        ${isSelected
          ? "ring-2 ring-violet-600 border-transparent bg-violet-50"
          : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
        }
      `}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Icon */}
      <div className={`w-11 h-11 rounded-xl ${isSelected ? "bg-violet-100" : "bg-slate-100"} flex items-center justify-center flex-shrink-0`}>
        <FileText className={`w-5 h-5 ${isSelected ? "text-violet-600" : "text-slate-500"}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-slate-900 leading-tight">
          Blank Invoice
        </h4>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
          Start from scratch with a custom invoice
        </p>
      </div>
    </button>
  );
}

// Export for use in template management
export function useInvoiceTemplates() {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/invoices/templates");
      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }
      const data = await response.json();
      setTemplates(data.templates || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return { templates, loading, error, refetch: fetchTemplates };
}

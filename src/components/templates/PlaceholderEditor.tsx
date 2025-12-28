"use client";

import { useState, useEffect, useMemo } from "react";
import {
  User,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Sparkles,
  Check,
  AlertCircle,
} from "lucide-react";
import {
  getPlaceholdersInContent,
  getPlaceholdersByCategory,
  formatCategoryName,
  autofillFromProfile,
  type PlaceholderDefinition,
  type UserProfileData,
} from "@/lib/contracts/placeholders";

interface PlaceholderEditorProps {
  content: {
    preamble: string;
    recitals: string;
    clauses: Array<{ content: string }>;
    signatureBlock: string;
  };
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  userProfile?: Partial<UserProfileData>;
  showAutofill?: boolean;
}

export function PlaceholderEditor({
  content,
  values,
  onChange,
  userProfile,
  showAutofill = true,
}: PlaceholderEditorProps) {
  // Combine all content to find placeholders
  const allContent = useMemo(() => {
    return [
      content.preamble,
      content.recitals,
      ...content.clauses.map((c) => c.content),
      content.signatureBlock,
    ].join(" ");
  }, [content]);

  // Get placeholders found in content
  const placeholders = useMemo(() => {
    return getPlaceholdersInContent(allContent);
  }, [allContent]);

  // Group placeholders by category
  const groupedPlaceholders = useMemo(() => {
    const grouped: Record<string, PlaceholderDefinition[]> = {};
    for (const placeholder of placeholders) {
      if (!grouped[placeholder.category]) {
        grouped[placeholder.category] = [];
      }
      grouped[placeholder.category].push(placeholder);
    }
    return grouped;
  }, [placeholders]);

  // Count filled vs total
  const filledCount = placeholders.filter((p) => {
    const key = p.token.replace(/\{\{|\}\}/g, "");
    return values[key] && values[key].trim() !== "";
  }).length;

  const handleAutofill = () => {
    if (!userProfile) return;
    const autofillValues = autofillFromProfile(userProfile);
    onChange({ ...values, ...autofillValues });
  };

  const handleValueChange = (token: string, value: string) => {
    const key = token.replace(/\{\{|\}\}/g, "");
    onChange({ ...values, [key]: value });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "party_a":
        return <User className="w-4 h-4" />;
      case "party_b":
        return <User className="w-4 h-4" />;
      case "dates":
        return <Calendar className="w-4 h-4" />;
      case "financial":
        return <DollarSign className="w-4 h-4" />;
      case "project":
        return <FileText className="w-4 h-4" />;
      case "terms":
        return <Building2 className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  if (placeholders.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <Check className="w-8 h-8 mx-auto mb-2 text-green-500" />
        <p>No placeholders to fill</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="bg-slate-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">
            Progress: {filledCount} of {placeholders.length} fields filled
          </span>
          {showAutofill && userProfile && (
            <button
              onClick={handleAutofill}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-violet-600 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Autofill from Profile
            </button>
          )}
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className="bg-violet-600 h-2 rounded-full transition-all"
            style={{ width: `${(filledCount / placeholders.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Placeholder fields grouped by category */}
      {Object.entries(groupedPlaceholders).map(([category, categoryPlaceholders]) => (
        <div key={category} className="space-y-4">
          <div className="flex items-center gap-2 text-slate-700">
            {getCategoryIcon(category)}
            <h3 className="font-semibold">{formatCategoryName(category)}</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {categoryPlaceholders.map((placeholder) => {
              const key = placeholder.token.replace(/\{\{|\}\}/g, "");
              const value = values[key] || "";
              const isFilled = value.trim() !== "";

              return (
                <div key={placeholder.token} className="space-y-1">
                  <label className="flex items-center gap-1 text-sm font-medium text-slate-700">
                    {placeholder.label}
                    {placeholder.required && (
                      <span className="text-red-500">*</span>
                    )}
                    {isFilled && (
                      <Check className="w-3 h-3 text-green-500 ml-1" />
                    )}
                  </label>
                  {placeholder.type === "textarea" ? (
                    <textarea
                      value={value}
                      onChange={(e) =>
                        handleValueChange(placeholder.token, e.target.value)
                      }
                      placeholder={placeholder.description}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none"
                    />
                  ) : placeholder.type === "date" ? (
                    <input
                      type="date"
                      value={value}
                      onChange={(e) =>
                        handleValueChange(placeholder.token, e.target.value)
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                    />
                  ) : placeholder.type === "currency" ? (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        $
                      </span>
                      <input
                        type="number"
                        value={value}
                        onChange={(e) =>
                          handleValueChange(placeholder.token, e.target.value)
                        }
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                      />
                    </div>
                  ) : placeholder.type === "number" ? (
                    <input
                      type="number"
                      value={value}
                      onChange={(e) =>
                        handleValueChange(placeholder.token, e.target.value)
                      }
                      placeholder={placeholder.description}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                    />
                  ) : placeholder.type === "email" ? (
                    <input
                      type="email"
                      value={value}
                      onChange={(e) =>
                        handleValueChange(placeholder.token, e.target.value)
                      }
                      placeholder={placeholder.description}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                    />
                  ) : (
                    <input
                      type="text"
                      value={value}
                      onChange={(e) =>
                        handleValueChange(placeholder.token, e.target.value)
                      }
                      placeholder={placeholder.description}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                    />
                  )}
                  <p className="text-xs text-slate-400">
                    {placeholder.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Validation warning */}
      {filledCount < placeholders.filter((p) => p.required).length && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 text-amber-800 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            Please fill in all required fields (marked with *) before creating
            the contract.
          </p>
        </div>
      )}
    </div>
  );
}

// Preview component showing placeholders highlighted in content
export function PlaceholderPreview({
  content,
  values,
}: {
  content: string;
  values: Record<string, string>;
}) {
  // Replace filled placeholders with values, highlight unfilled ones
  const processedContent = content.replace(
    /\{\{([a-z_]+)\}\}/g,
    (match, key) => {
      const value = values[key];
      if (value && value.trim() !== "") {
        return `<span class="text-green-700 font-medium">${value}</span>`;
      }
      return `<span class="bg-yellow-100 text-yellow-800 px-1 rounded font-mono text-sm">${match}</span>`;
    }
  );

  return (
    <div
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  );
}

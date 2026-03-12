import { FileText, Lock } from "lucide-react";

interface TemplatePreviewProps {
  title: string;
  clauseTitles: string[];
  previewText: string;
}

const PLACEHOLDER_LABELS: Record<string, string> = {
  effective_date: "Effective Date",
  party_a_name: "Your Name",
  party_a_title: "Your Title",
  party_a_company: "Your Company",
  party_a_address: "Your Address",
  party_b_name: "Other Party's Name",
  party_b_title: "Other Party's Title",
  party_b_company: "Other Party's Company",
  party_b_address: "Other Party's Address",
  term_length: "Term Length",
  governing_state: "Governing State",
  confidentiality_period: "Confidentiality Period",
  payment_amount: "Payment Amount",
  notice_period: "Notice Period",
};

function humanizePlaceholders(text: string): string {
  return text.replace(/\{\{(\w+)\}?\}?/g, (_, key) => {
    const label = PLACEHOLDER_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    return `[${label}]`;
  });
}

/**
 * A visual preview of a contract template that shows clause structure
 * with content blurred behind a signup overlay. Server component.
 */
export function TemplatePreview({
  title,
  clauseTitles,
  previewText,
}: TemplatePreviewProps) {
  const cleanPreview = humanizePlaceholders(previewText);

  return (
    <div className="relative bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Document header */}
      <div className="px-8 pt-8 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-[#529ec6]/10 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-[#529ec6]" />
          </div>
          <h3 className="font-semibold text-slate-900 text-lg">{title}</h3>
        </div>
        {cleanPreview && (
          <p className="text-sm text-slate-600 leading-relaxed">
            {cleanPreview}
          </p>
        )}
      </div>

      {/* Clause list with progressive blur */}
      <div className="relative px-8 py-6">
        <div className="space-y-4">
          {clauseTitles.slice(0, 8).map((clause, index) => (
            <div key={index} className="flex items-start gap-3">
              <span className="text-xs font-medium text-slate-400 mt-0.5 w-6 flex-shrink-0">
                {index + 1}.
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">{clause}</p>
                {/* Fake content lines */}
                <div className="mt-2 space-y-1.5">
                  <div className="h-2.5 bg-slate-100 rounded w-full" />
                  <div className="h-2.5 bg-slate-100 rounded w-[90%]" />
                  {index < 2 && (
                    <div className="h-2.5 bg-slate-100 rounded w-[75%]" />
                  )}
                </div>
              </div>
            </div>
          ))}
          {clauseTitles.length > 8 && (
            <p className="text-xs text-slate-400 pl-9">
              + {clauseTitles.length - 8} more sections
            </p>
          )}
        </div>

        {/* Gradient fade overlay */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-white via-white/95 to-transparent" />
      </div>

      {/* Locked content overlay */}
      <div className="relative px-8 pb-8 -mt-16">
        <div className="flex flex-col items-center text-center py-6 px-4 bg-slate-50 rounded-xl border border-slate-200/50">
          <div className="w-10 h-10 bg-slate-200/50 rounded-full flex items-center justify-center mb-3">
            <Lock className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-700 mb-1">
            Full template content available after sign up
          </p>
          <p className="text-xs text-slate-500">
            Create an account to view, customize, and e-sign this template
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Placeholder preview when no actual template data is available.
 * Shows a generic document preview structure.
 */
export function TemplatePreviewPlaceholder({
  typeName,
  jurisdictionName,
}: {
  typeName: string;
  jurisdictionName: string;
}) {
  const placeholderClauses = [
    "Definitions",
    "Scope of Agreement",
    "Terms and Conditions",
    "Representations and Warranties",
    "Limitation of Liability",
    "Governing Law",
    "Dispute Resolution",
    "General Provisions",
  ];

  return (
    <TemplatePreview
      title={`${jurisdictionName} ${typeName}`}
      clauseTitles={placeholderClauses}
      previewText={`This ${typeName.toLowerCase()} is governed by ${jurisdictionName} law and includes all standard provisions required for enforceability in this jurisdiction.`}
    />
  );
}

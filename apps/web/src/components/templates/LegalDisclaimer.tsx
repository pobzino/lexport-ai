import { AlertTriangle } from "lucide-react";

/**
 * Legal disclaimer for template pages. Shows on every public template page
 * to make clear these are AI-generated starting points, not legal advice.
 */
export function TemplateDisclaimer() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
      <div className="flex gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
        <div>
          <p className="font-medium">Not legal advice</p>
          <p className="mt-1 text-amber-700">
            Templates are AI-generated starting points for common agreements. They are not a
            substitute for legal advice. Have an attorney review any contract before signing,
            especially for high-value or complex transactions.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact inline disclaimer for use near CTA buttons.
 */
export function TemplateDisclaimerInline() {
  return (
    <p className="text-xs text-slate-400 text-center mt-3">
      AI-generated template — not legal advice.{" "}
      <a href="/terms#templates" className="underline hover:text-slate-500">
        Learn more
      </a>
    </p>
  );
}

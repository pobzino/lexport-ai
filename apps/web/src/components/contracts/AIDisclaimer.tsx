import { AlertTriangle } from "lucide-react";

export function AIDisclaimer() {
  return (
    <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>Disclaimer:</strong> This document was generated using Lexport AI. While our
          templates are reviewed by legal professionals, this does not constitute legal advice.
          For complex or high-value transactions, we recommend consulting with a qualified
          attorney in your jurisdiction.
        </p>
      </div>
    </div>
  );
}

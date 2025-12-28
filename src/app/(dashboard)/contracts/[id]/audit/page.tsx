import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, FileJson, FileSpreadsheet } from "lucide-react";
import { AuditTrailTimeline } from "@/components/audit-trail-timeline";

interface AuditPageProps {
  params: Promise<{ id: string }>;
}

export default async function AuditTrailPage({ params }: AuditPageProps) {
  const { id: contractId } = await params;
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Fetch contract to verify ownership and get title
  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select("id, title, type, status, created_at")
    .eq("id", contractId)
    .eq("user_id", user.id)
    .single();

  if (contractError || !contract) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/contracts/${contractId}/edit`}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Link>
              <div>
                <h1 className="font-semibold text-slate-900">Audit Trail</h1>
                <p className="text-sm text-slate-500">{contract.title}</p>
              </div>
            </div>

            {/* Export buttons */}
            <div className="flex items-center gap-2">
              <a
                href={`/api/contracts/${contractId}/audit/export?format=csv`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </a>
              <a
                href={`/api/contracts/${contractId}/audit/export?format=json`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <FileJson className="w-4 h-4" />
                <span className="hidden sm:inline">Export JSON</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Contract info card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-slate-500">Contract</p>
              <p className="font-medium text-slate-900 truncate">{contract.title}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Type</p>
              <p className="font-medium text-slate-900 capitalize">
                {contract.type.replace(/_/g, " ")}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Status</p>
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                  contract.status === "completed" || contract.status === "signed"
                    ? "bg-emerald-100 text-emerald-700"
                    : contract.status === "pending_signature"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {contract.status.replace(/_/g, " ")}
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-500">Created</p>
              <p className="font-medium text-slate-900">
                {new Date(contract.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Audit trail timeline */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Activity Log</h2>
            <p className="text-sm text-slate-500">
              All events are recorded with timestamps and actor information
            </p>
          </div>

          <AuditTrailTimeline contractId={contractId} />
        </div>

        {/* Legal disclaimer */}
        <div className="mt-8 p-4 bg-slate-100 rounded-lg">
          <p className="text-xs text-slate-500 text-center">
            This audit trail provides a complete record of all actions taken on this contract.
            All timestamps are in UTC. IP addresses and locations are captured for security and compliance purposes.
          </p>
        </div>
      </main>
    </div>
  );
}

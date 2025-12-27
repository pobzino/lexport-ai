import { FileSignature, CheckCircle, Clock, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function SignaturesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch all signature requests with their signatures
  const { data: signatureRequests = [] } = await supabase
    .from("signature_requests")
    .select("*, contracts(*), signatures(*)")
    .order("created_at", { ascending: false });

  const pendingSignatures = (signatureRequests || []).filter((s: { status: string }) => s.status === "pending");
  const completedSignatures = (signatureRequests || []).filter((s: { status: string }) => s.status === "signed");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Signatures</h1>
        <p className="text-slate-500 mt-1">
          Track and manage signature requests
        </p>
      </div>

      {/* Completed Signatures */}
      {completedSignatures.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              Completed Signatures ({completedSignatures.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {completedSignatures.map((sig: { id: string; signer_name: string; signer_email: string; status: string; signed_at: string; contracts: { id: string; title: string }; signatures: { id: string; image_url: string }[] }) => (
              <div
                key={sig.id}
                className="flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">
                      {sig.contracts?.title || "Contract"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {sig.signer_name} ({sig.signer_email})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {sig.signatures?.[0]?.image_url && (
                    <div className="bg-slate-50 border border-slate-200 rounded p-1">
                      <img
                        src={sig.signatures[0].image_url}
                        alt="Signature"
                        className="h-8 w-auto max-w-[100px] object-contain"
                      />
                    </div>
                  )}
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                    Signed
                  </span>
                  <span className="text-sm text-slate-500">
                    {sig.signed_at ? new Date(sig.signed_at).toLocaleDateString() : ""}
                  </span>
                  <Link
                    href={`/contracts/${sig.contracts?.id}/edit`}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    title="View Contract"
                  >
                    <Eye className="w-4 h-4 text-slate-500" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Signatures */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Pending Signatures ({pendingSignatures.length})
          </h2>
        </div>
        {pendingSignatures.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileSignature className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No pending signatures
            </h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              When you send contracts for signature, they&apos;ll appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingSignatures.map((sig: { id: string; signer_name: string; signer_email: string; status: string; created_at: string; token: string; contracts: { id: string; title: string } }) => (
              <div
                key={sig.id}
                className="flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <FileSignature className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">
                      {sig.contracts?.title || "Contract"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {sig.signer_name} ({sig.signer_email})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    Pending
                  </span>
                  <span className="text-sm text-slate-500">
                    {new Date(sig.created_at).toLocaleDateString()}
                  </span>
                  <Link
                    href={`/contracts/${sig.contracts?.id}/edit`}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    title="View Contract"
                  >
                    <Eye className="w-4 h-4 text-slate-500" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

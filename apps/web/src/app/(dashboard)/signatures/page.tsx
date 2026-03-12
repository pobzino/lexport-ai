import {
  FileSignature,
  CheckCircle,
  Clock,
  Eye,
  Send,
  Download,
  AlertCircle,
  XCircle,
  Mail,
  MoreHorizontal,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { SendReminderButton } from "@/components/signatures/SendReminderButton";

interface SignatureRequest {
  id: string;
  signer_name: string;
  signer_email: string;
  signer_role: string | null;
  status: "pending" | "viewed" | "signed" | "declined" | "expired";
  created_at: string;
  signed_at: string | null;
  viewed_at: string | null;
  declined_at: string | null;
  expires_at: string;
  token: string;
  contracts: {
    id: string;
    title: string;
    type: string;
  } | null;
  signatures: {
    id: string;
    signature_data: string;
  }[];
}

export default async function SignaturesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch signature requests for contracts owned by this user
  const { data: userContracts } = await supabase
    .from("contracts")
    .select("id")
    .eq("user_id", user.id);

  const contractIds = userContracts?.map(c => c.id) || [];

  const { data: signatureRequests = [] } = await supabase
    .from("signature_requests")
    .select("*, contracts(id, title, type), signatures(id, signature_data)")
    .in("contract_id", contractIds.length > 0 ? contractIds : ['none'])
    .order("created_at", { ascending: false });

  const requests = (signatureRequests || []) as SignatureRequest[];

  // Calculate stats
  const stats = {
    total: requests.length,
    completed: requests.filter(s => s.status === "signed").length,
    pending: requests.filter(s => s.status === "pending" || s.status === "viewed").length,
    declined: requests.filter(s => s.status === "declined").length,
    expired: requests.filter(s => s.status === "expired").length,
  };

  // Group requests
  const completedRequests = requests.filter(s => s.status === "signed");
  const pendingRequests = requests.filter(s => s.status === "pending" || s.status === "viewed");
  const otherRequests = requests.filter(s => s.status === "declined" || s.status === "expired");

  const getStatusBadge = (status: string, viewedAt: string | null) => {
    switch (status) {
      case "signed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle className="w-3.5 h-3.5" />
            Signed
          </span>
        );
      case "viewed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <Eye className="w-3.5 h-3.5" />
            Viewed
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <Clock className="w-3.5 h-3.5" />
            {viewedAt ? "Viewed" : "Awaiting"}
          </span>
        );
      case "declined":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <XCircle className="w-3.5 h-3.5" />
            Declined
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            <AlertCircle className="w-3.5 h-3.5" />
            Expired
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return formatDate(dateString);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Signatures</h1>
          <p className="text-slate-500 mt-1">
            Track and manage signature requests
          </p>
        </div>
        <Link
          href="/contracts"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#202e46] text-white rounded-lg hover:bg-[#1a2539] transition-colors text-sm font-medium"
        >
          <Send className="w-4 h-4" />
          Send for Signature
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500">Total Requests</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <FileSignature className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500">Completed</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">{stats.completed}</p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500">Awaiting</p>
              <p className="text-xl sm:text-2xl font-bold text-amber-600 mt-1">{stats.pending}</p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500">Declined</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600 mt-1">{stats.declined}</p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Awaiting Signatures - Show first if any pending */}
      {pendingRequests.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-amber-50/50">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Awaiting Signatures
                <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                  {pendingRequests.length}
                </span>
              </h2>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-amber-700">
                        {req.signer_name?.charAt(0)?.toUpperCase() || "?"}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900 truncate text-sm sm:text-base">
                          {req.signer_name}
                        </p>
                        {req.viewed_at && (
                          <span className="text-xs text-blue-600 flex items-center gap-1 flex-shrink-0">
                            <Eye className="w-3 h-3" />
                            <span className="hidden sm:inline">Viewed</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-500 truncate">
                        {req.signer_email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                    <div className="text-right hidden md:block">
                      <p className="text-sm font-medium text-slate-700 truncate max-w-[200px]">
                        {req.contracts?.title || "Contract"}
                      </p>
                      <p className="text-xs text-slate-400">
                        Sent {getTimeAgo(req.created_at)}
                      </p>
                    </div>

                    <div className="hidden sm:block">
                      {getStatusBadge(req.status, req.viewed_at)}
                    </div>

                    <div className="flex items-center gap-1">
                      <SendReminderButton
                        contractId={req.contracts?.id || ""}
                        signatureRequestId={req.id}
                        signerName={req.signer_name}
                      />
                      <Link
                        href={`/contracts/${req.contracts?.id}/edit`}
                        className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                        title="View Contract"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Signatures */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            Completed Signatures
            {completedRequests.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                {completedRequests.length}
              </span>
            )}
          </h2>
        </div>

        {completedRequests.length === 0 ? (
          <div className="text-center py-12 px-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileSignature className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No completed signatures yet
            </h3>
            <p className="text-slate-500 max-w-sm mx-auto mb-6">
              When signers complete their signatures, they&apos;ll appear here.
            </p>
            <Link
              href="/contracts"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#202e46] hover:underline"
            >
              View your contracts
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {completedRequests.map((req) => (
              <div
                key={req.id}
                className="px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 truncate">
                        {req.signer_name}
                      </p>
                      <p className="text-sm text-slate-500 truncate">
                        {req.signer_email}
                        {req.signer_role && (
                          <span className="ml-2 text-slate-400">• {req.signer_role}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 flex-shrink-0">
                    {/* Signature Preview */}
                    {req.signatures?.[0]?.signature_data && (
                      <div className="hidden md:block bg-slate-50 border border-slate-200 rounded px-2 py-1">
                        <img
                          src={req.signatures[0].signature_data}
                          alt="Signature"
                          className="h-8 w-auto max-w-[80px] object-contain"
                        />
                      </div>
                    )}

                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium text-slate-700 truncate max-w-[200px]">
                        {req.contracts?.title || "Contract"}
                      </p>
                      <p className="text-xs text-slate-400">
                        Signed {req.signed_at ? formatDate(req.signed_at) : ""}
                      </p>
                    </div>

                    {getStatusBadge(req.status, req.viewed_at)}

                    <div className="flex items-center gap-1">
                      <Link
                        href={`/contracts/${req.contracts?.id}/edit`}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="View Contract"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Download Certificate"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Declined/Expired - Only show if any exist */}
      {otherRequests.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-slate-400" />
              Declined & Expired
              <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                {otherRequests.length}
              </span>
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {otherRequests.map((req) => (
              <div
                key={req.id}
                className="px-6 py-4 hover:bg-slate-50 transition-colors opacity-75"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      req.status === "declined" ? "bg-red-100" : "bg-slate-100"
                    }`}>
                      {req.status === "declined" ? (
                        <XCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-700 truncate">
                        {req.signer_name}
                      </p>
                      <p className="text-sm text-slate-500 truncate">
                        {req.signer_email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm text-slate-600 truncate max-w-[200px]">
                        {req.contracts?.title || "Contract"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {req.status === "declined" && req.declined_at
                          ? `Declined ${formatDate(req.declined_at)}`
                          : `Expired ${formatDate(req.expires_at)}`
                        }
                      </p>
                    </div>

                    {getStatusBadge(req.status, req.viewed_at)}

                    <div className="flex items-center gap-1">
                      <button
                        className="p-2 text-slate-400 hover:text-[#202e46] hover:bg-slate-100 rounded-lg transition-colors"
                        title="Resend Request"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <Link
                        href={`/contracts/${req.contracts?.id}/edit`}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="View Contract"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State - Only show if no requests at all */}
      {requests.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileSignature className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            No signature requests yet
          </h3>
          <p className="text-slate-500 max-w-md mx-auto mb-8">
            When you send contracts for signature, all your signature requests will appear here for easy tracking.
          </p>
          <Link
            href="/contracts/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#202e46] text-white rounded-lg hover:bg-[#1a2539] transition-colors font-medium"
          >
            <FileSignature className="w-5 h-5" />
            Create Your First Contract
          </Link>
        </div>
      )}
    </div>
  );
}

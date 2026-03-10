"use client";

import { useState } from "react";
import {
  Check,
  Clock,
  Eye,
  X,
  Copy,
  RefreshCw,
  Mail,
  User,
  AlertCircle,
} from "lucide-react";

interface SignatureRequest {
  id: string;
  signer_email: string;
  signer_name: string;
  signer_role?: string;
  status: "pending" | "viewed" | "signed" | "declined";
  signed_at?: string;
  declined_at?: string;
  decline_reason?: string;
  expires_at: string;
  token: string;
  created_at: string;
}

interface Signature {
  id: string;
  signature_request_id: string;
  signature_data: string;
  signature_type: string;
  signed_at: string;
}

interface SignerStatusPanelProps {
  signatureRequests: SignatureRequest[];
  signatures: Signature[];
  contractId: string;
  onResend?: (requestId: string) => Promise<void>;
}

const statusConfig: Record<
  string,
  { icon: typeof Check; label: string; color: string; bgColor: string }
> = {
  pending: {
    icon: Clock,
    label: "Pending",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
  },
  viewed: {
    icon: Eye,
    label: "Viewed",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  signed: {
    icon: Check,
    label: "Signed",
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
  },
  declined: {
    icon: X,
    label: "Declined",
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
};

export function SignerStatusPanel({
  signatureRequests,
  signatures,
  contractId,
  onResend,
}: SignerStatusPanelProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);

  const signedCount = signatureRequests.filter((r) => r.status === "signed").length;
  const totalCount = signatureRequests.length;
  const allSigned = signedCount === totalCount && totalCount > 0;

  const copySigningLink = async (token: string, requestId: string) => {
    const url = `${window.location.origin}/sign/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(requestId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResend = async (requestId: string) => {
    if (!onResend) return;
    setResending(requestId);
    try {
      await onResend(requestId);
    } finally {
      setResending(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (signatureRequests.length === 0) {
    return (
      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center gap-3 text-slate-500">
          <User className="w-5 h-5" />
          <p className="text-sm">No signature requests yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Signature Status</h3>
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium ${
              allSigned ? "text-emerald-600" : "text-slate-600"
            }`}
          >
            {signedCount} of {totalCount} signed
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            allSigned ? "bg-emerald-500" : "bg-[#529ec6]/50"
          }`}
          style={{ width: `${(signedCount / totalCount) * 100}%` }}
        />
      </div>

      {/* All Signed Badge */}
      {allSigned && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <Check className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">
            All parties have signed this contract
          </span>
        </div>
      )}

      {/* Signer List */}
      <div className="space-y-3">
        {signatureRequests.map((request) => {
          const status = statusConfig[request.status] || statusConfig.pending;
          const StatusIcon = status.icon;
          const signature = signatures.find(
            (s) => s.signature_request_id === request.id
          );
          const expired = isExpired(request.expires_at) && request.status === "pending";

          return (
            <div
              key={request.id}
              className="p-3 bg-white border border-slate-200 rounded-lg"
            >
              <div className="flex items-start gap-3">
                {/* Status Icon */}
                <div className={`p-2 rounded-full ${status.bgColor}`}>
                  <StatusIcon className={`w-4 h-4 ${status.color}`} />
                </div>

                {/* Signer Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900 truncate">
                      {request.signer_name}
                    </p>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.bgColor} ${status.color}`}
                    >
                      {status.label}
                    </span>
                    {expired && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-600">
                        Expired
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 truncate">
                    {request.signer_email}
                  </p>
                  {request.signer_role && (
                    <p className="text-xs text-[#529ec6] mt-0.5">
                      {request.signer_role}
                    </p>
                  )}

                  {/* Timestamps */}
                  <div className="mt-2 text-xs text-slate-400">
                    {request.status === "signed" && request.signed_at && (
                      <p>Signed: {formatDate(request.signed_at)}</p>
                    )}
                    {request.status === "declined" && request.declined_at && (
                      <p>Declined: {formatDate(request.declined_at)}</p>
                    )}
                    {request.status === "pending" && (
                      <p>
                        Expires: {formatDate(request.expires_at)}
                        {expired && " (expired)"}
                      </p>
                    )}
                  </div>

                  {/* Decline Reason */}
                  {request.status === "declined" && request.decline_reason && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                      <span className="font-medium">Reason:</span>{" "}
                      {request.decline_reason}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {request.status === "pending" && (
                  <div className="flex items-center gap-1">
                    {!expired && (
                      <button
                        onClick={() => copySigningLink(request.token, request.id)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Copy signing link"
                      >
                        {copiedId === request.id ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    {onResend && (
                      <button
                        onClick={() => handleResend(request.id)}
                        disabled={resending === request.id}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                        title={expired ? "Renew and resend request" : "Resend invitation"}
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${
                            resending === request.id ? "animate-spin" : ""
                          }`}
                        />
                      </button>
                    )}
                  </div>
                )}

                {/* Signature Preview (if signed) */}
                {signature && signature.signature_data && (
                  <div className="flex-shrink-0">
                    <img
                      src={signature.signature_data}
                      alt={`${request.signer_name}'s signature`}
                      className="h-10 w-auto max-w-[100px] object-contain border border-slate-200 rounded bg-white"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
        {Object.entries(statusConfig).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <div key={key} className="flex items-center gap-1.5 text-xs text-slate-500">
              <Icon className={`w-3 h-3 ${config.color}`} />
              {config.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

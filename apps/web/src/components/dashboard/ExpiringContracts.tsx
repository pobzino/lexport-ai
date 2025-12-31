"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, AlertTriangle, Send, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow, differenceInHours, differenceInDays } from "date-fns";

interface ExpiringContract {
  id: string;
  title: string;
  type: string;
  expires_at: string;
  status: string;
  pending_signers: {
    id: string;
    signer_name: string;
    signer_email: string;
    token: string;
  }[];
}

interface ExpiringContractsProps {
  contracts: ExpiringContract[];
}

function getUrgencyLevel(expiresAt: string): "critical" | "warning" | "info" {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const hoursRemaining = differenceInHours(expiry, now);

  if (hoursRemaining <= 24) return "critical";
  if (hoursRemaining <= 72) return "warning";
  return "info";
}

function getUrgencyStyles(level: "critical" | "warning" | "info") {
  switch (level) {
    case "critical":
      return {
        bg: "bg-red-50",
        border: "border-red-200",
        badge: "bg-red-100 text-red-700",
        icon: "text-red-500",
        text: "text-red-700",
      };
    case "warning":
      return {
        bg: "bg-amber-50",
        border: "border-amber-200",
        badge: "bg-amber-100 text-amber-700",
        icon: "text-amber-500",
        text: "text-amber-700",
      };
    default:
      return {
        bg: "bg-blue-50",
        border: "border-blue-200",
        badge: "bg-blue-100 text-blue-700",
        icon: "text-blue-500",
        text: "text-blue-700",
      };
  }
}

function formatTimeRemaining(expiresAt: string): string {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const hours = differenceInHours(expiry, now);
  const days = differenceInDays(expiry, now);

  if (hours < 1) {
    const minutes = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60));
    return `${minutes}m`;
  } else if (hours < 24) {
    return `${hours}h`;
  } else {
    return `${days}d`;
  }
}

export function ExpiringContracts({ contracts }: ExpiringContractsProps) {
  const [expanded, setExpanded] = useState(true);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  // Sort by expiration date (soonest first)
  const sortedContracts = [...contracts].sort(
    (a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime()
  );

  if (contracts.length === 0) {
    return null;
  }

  const handleResendReminder = async (contractId: string, signerId: string) => {
    setSendingReminder(signerId);
    try {
      const res = await fetch(`/api/contracts/${contractId}/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerId }),
      });

      if (res.ok) {
        // Show success feedback (could add toast here)
        console.log("Reminder sent successfully");
      } else {
        console.error("Failed to send reminder");
      }
    } catch (error) {
      console.error("Error sending reminder:", error);
    } finally {
      setSendingReminder(null);
    }
  };

  const criticalCount = sortedContracts.filter(
    (c) => getUrgencyLevel(c.expires_at) === "critical"
  ).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 border-b border-slate-200 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-left">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              Expiring Soon
              {criticalCount > 0 && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                  {criticalCount} urgent
                </span>
              )}
            </h2>
            <p className="text-sm text-slate-500">
              {contracts.length} contract{contracts.length !== 1 ? "s" : ""} expiring in the next 7 days
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="divide-y divide-slate-100">
          {sortedContracts.map((contract) => {
            const urgency = getUrgencyLevel(contract.expires_at);
            const styles = getUrgencyStyles(urgency);

            return (
              <div
                key={contract.id}
                className={`p-4 ${styles.bg} ${styles.border} border-l-4 border-t-0 border-r-0 border-b-0`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/contracts/${contract.id}/edit`}
                        className="font-medium text-slate-900 hover:text-[#529ec6] truncate"
                      >
                        {contract.title}
                      </Link>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles.badge}`}>
                        {urgency === "critical" && (
                          <AlertTriangle className="w-3 h-3 inline mr-1" />
                        )}
                        {formatTimeRemaining(contract.expires_at)} left
                      </span>
                    </div>

                    <p className="text-sm text-slate-500 mb-2">
                      Expires {formatDistanceToNow(new Date(contract.expires_at), { addSuffix: true })}
                    </p>

                    {/* Pending signers */}
                    {contract.pending_signers.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-600">
                          Awaiting signature from:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {contract.pending_signers.map((signer) => (
                            <div
                              key={signer.id}
                              className="flex items-center gap-2 bg-white/80 rounded-lg px-3 py-1.5 border border-slate-200"
                            >
                              <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-medium text-slate-600">
                                {signer.signer_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="text-sm">
                                <span className="font-medium text-slate-700">
                                  {signer.signer_name}
                                </span>
                              </div>
                              <button
                                onClick={() => handleResendReminder(contract.id, signer.id)}
                                disabled={sendingReminder === signer.id}
                                className="ml-1 p-1 hover:bg-slate-100 rounded transition-colors disabled:opacity-50"
                                title="Send reminder"
                              >
                                <Send className={`w-3.5 h-3.5 ${sendingReminder === signer.id ? "animate-pulse" : ""} text-slate-500 hover:text-[#529ec6]`} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/contracts/${contract.id}/edit`}
                    className="flex-shrink-0 p-2 hover:bg-white/50 rounded-lg transition-colors"
                  >
                    <ArrowRight className="w-5 h-5 text-slate-400" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ExpiringContracts;

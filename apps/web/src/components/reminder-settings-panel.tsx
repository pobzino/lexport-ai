"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Clock, AlertCircle, RefreshCw, Send } from "lucide-react";

interface SignatureRequest {
  id: string;
  signer_email: string;
  signer_name: string;
  status: string;
  reminder_enabled: boolean;
  reminder_count: number;
  max_reminders: number;
  expires_at: string;
  created_at: string;
}

interface ReminderHistory {
  id: string;
  reminder_type: string;
  recipient_email: string;
  recipient_name: string;
  sent_at: string;
  days_until_expiration: number | null;
}

interface ReminderSettingsPanelProps {
  contractId: string;
  signatureRequests: SignatureRequest[];
  onUpdate?: () => void;
  onResendRequest?: (signatureRequestId: string) => Promise<void>;
}

export function ReminderSettingsPanel({
  contractId,
  signatureRequests,
  onUpdate,
  onResendRequest,
}: ReminderSettingsPanelProps) {
  const [reminderHistory, setReminderHistory] = useState<ReminderHistory[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);

  useEffect(() => {
    fetchReminderHistory();
  }, [contractId]);

  const fetchReminderHistory = async () => {
    try {
      const response = await fetch(
        `/api/contracts/${contractId}/reminders/history`
      );
      if (response.ok) {
        const data = await response.json();
        setReminderHistory(data.history || []);
      }
    } catch (error) {
      console.error("Failed to fetch reminder history:", error);
    }
  };

  const toggleReminder = async (
    signatureRequestId: string,
    currentEnabled: boolean
  ) => {
    setToggling(signatureRequestId);
    try {
      const response = await fetch(
        `/api/contracts/${contractId}/reminders/toggle`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signatureRequestId,
            reminderEnabled: !currentEnabled,
          }),
        }
      );

      if (response.ok) {
        onUpdate?.();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update reminder setting");
      }
    } catch (error) {
      console.error("Failed to toggle reminder:", error);
      alert("Failed to update reminder setting");
    } finally {
      setToggling(null);
    }
  };

  const handleResendRequest = async (signatureRequestId: string) => {
    if (!onResendRequest) return;

    setResending(signatureRequestId);
    try {
      await onResendRequest(signatureRequestId);
      onUpdate?.();
      await fetchReminderHistory();
    } catch (error) {
      console.error("Failed to resend signing request:", error);
      alert("Failed to resend signing request");
    } finally {
      setResending(null);
    }
  };

  const getExpirationStatus = (expiresAt: string, status: string) => {
    if (status === "expired") return { text: "Expired", color: "text-red-600" };
    if (status === "signed") return { text: "Signed", color: "text-emerald-600" };

    const now = new Date();
    const expiry = new Date(expiresAt);
    const hoursRemaining = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursRemaining < 0) return { text: "Expired", color: "text-red-600" };
    if (hoursRemaining < 24)
      return {
        text: `Expires in ${Math.round(hoursRemaining)}h`,
        color: "text-red-600",
      };
    if (hoursRemaining < 72)
      return {
        text: `Expires in ${Math.round(hoursRemaining / 24)}d`,
        color: "text-amber-600",
      };

    const daysRemaining = Math.round(hoursRemaining / 24);
    return {
      text: `Expires in ${daysRemaining}d`,
      color: "text-slate-600",
    };
  };

  const formatReminderType = (type: string) => {
    const types: Record<string, string> = {
      first: "First Reminder",
      followup: "Follow-up",
      final: "Final Warning",
      expiration_warning: "Expiration Warning",
    };
    return types[type] || type;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="w-5 h-5 text-slate-600" />
        <h3 className="text-lg font-semibold text-slate-900">
          Signature Reminders
        </h3>
      </div>

      {/* Signature Requests List */}
      {signatureRequests.length > 0 ? (
        <div className="space-y-4">
          {signatureRequests.map((request) => {
            const expStatus = getExpirationStatus(
              request.expires_at,
              request.status
            );
            return (
              <div
                key={request.id}
                className="border border-slate-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">
                      {request.signer_name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {request.signer_email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        request.status === "signed"
                          ? "bg-emerald-100 text-emerald-700"
                          : request.status === "expired"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {request.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className={expStatus.color}>{expStatus.text}</span>
                    </div>
                    <div className="text-slate-500">
                      Reminders sent: {request.reminder_count}/
                      {request.max_reminders}
                    </div>
                  </div>

                  {request.status === "pending" && (
                    <button
                      onClick={() =>
                        toggleReminder(request.id, request.reminder_enabled)
                      }
                      disabled={toggling === request.id}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        request.reminder_enabled
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      } disabled:opacity-50`}
                    >
                      {toggling === request.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : request.reminder_enabled ? (
                        <Bell className="w-4 h-4" />
                      ) : (
                        <BellOff className="w-4 h-4" />
                      )}
                      {request.reminder_enabled
                        ? "Auto-reminders ON"
                        : "Auto-reminders OFF"}
                    </button>
                  )}
                </div>

                {request.status === "expired" && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    {onResendRequest ? (
                      <button
                        onClick={() => handleResendRequest(request.id)}
                        disabled={resending === request.id}
                        className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
                      >
                        {resending === request.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Re-send Signing Request
                      </button>
                    ) : (
                      <p className="text-sm text-slate-500">
                        Request expired. Re-send from the signing actions panel.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p>No signature requests for this contract.</p>
        </div>
      )}

      {/* Reminder History */}
      {reminderHistory.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-200">
          <h4 className="text-sm font-semibold text-slate-900 mb-4">
            Reminder History
          </h4>
          <div className="space-y-2">
            {reminderHistory.slice(0, 5).map((history) => (
              <div
                key={history.id}
                className="flex items-start gap-3 text-sm"
              >
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                <div className="flex-1">
                  <p className="text-slate-700">
                    <span className="font-medium">
                      {formatReminderType(history.reminder_type)}
                    </span>{" "}
                    sent to {history.recipient_name}
                  </p>
                  <p className="text-slate-500 text-xs">
                    {new Date(history.sent_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {history.days_until_expiration !== null &&
                      ` • ${history.days_until_expiration}d until expiration`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

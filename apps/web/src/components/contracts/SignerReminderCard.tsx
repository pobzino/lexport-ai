"use client";

import {
  Check,
  Clock,
  Eye,
  X,
  Send,
  Loader2,
  Mail,
  User,
  AlertCircle,
  Calendar,
} from "lucide-react";
import type { SignerReminder } from "./ReminderSettings";

interface SignerReminderCardProps {
  signer: SignerReminder;
  nextReminderAt: string | null;
  onSendReminder?: () => void;
  isSending?: boolean;
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

export function SignerReminderCard({
  signer,
  nextReminderAt,
  onSendReminder,
  isSending,
}: SignerReminderCardProps) {
  const status = statusConfig[signer.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? "s" : ""} ago`;
    } else if (diffDays === 0) {
      const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
      if (diffHours <= 0) return "Now";
      return `in ${diffHours}h`;
    } else if (diffDays === 1) {
      return "Tomorrow";
    } else {
      return `in ${diffDays}d`;
    }
  };

  const isExpired = new Date(signer.expiresAt) < new Date() && signer.status === "pending";
  const showReminderButton = signer.status === "pending" && !isExpired && onSendReminder;

  return (
    <div className="p-3 bg-white border border-slate-200 rounded-lg">
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className={`p-2 rounded-full ${status.bgColor} flex-shrink-0`}>
          <StatusIcon className={`w-4 h-4 ${status.color}`} />
        </div>

        {/* Signer Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-slate-900 truncate text-sm">
              {signer.signerName}
            </p>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.bgColor} ${status.color}`}
            >
              {status.label}
            </span>
            {isExpired && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-600">
                Expired
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 truncate mt-0.5">
            {signer.signerEmail}
          </p>
          {signer.signerRole && (
            <p className="text-xs text-[#529ec6] mt-0.5">
              {signer.signerRole}
            </p>
          )}

          {/* Reminder Info */}
          <div className="mt-2 space-y-1">
            {signer.lastReminderSentAt && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Mail className="w-3 h-3" />
                <span>Last reminder: {formatDate(signer.lastReminderSentAt)}</span>
              </div>
            )}

            {nextReminderAt && signer.status === "pending" && !isExpired && (
              <div className="flex items-center gap-1.5 text-xs text-[#529ec6]">
                <Clock className="w-3 h-3" />
                <span>Next: {formatRelativeTime(nextReminderAt)}</span>
              </div>
            )}

            {!signer.lastReminderSentAt && signer.status === "pending" && !isExpired && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Mail className="w-3 h-3" />
                <span>No reminders sent yet</span>
              </div>
            )}

            {signer.status === "signed" && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                <Check className="w-3 h-3" />
                <span>Completed - no reminders needed</span>
              </div>
            )}

            {signer.status === "declined" && (
              <div className="flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle className="w-3 h-3" />
                <span>Declined - no reminders will be sent</span>
              </div>
            )}

            {isExpired && (
              <div className="flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle className="w-3 h-3" />
                <span>Request expired - resend invitation to continue</span>
              </div>
            )}
          </div>
        </div>

        {/* Send Reminder Button */}
        {showReminderButton && (
          <button
            onClick={onSendReminder}
            disabled={isSending}
            className="p-2 text-[#529ec6] hover:bg-[#529ec6]/10 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
            title="Send reminder"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Expiration Warning */}
      {signer.status === "pending" && !isExpired && (
        <div className="mt-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Calendar className="w-3 h-3" />
            <span>Expires: {formatDate(signer.expiresAt)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

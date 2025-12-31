"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  BellOff,
  Clock,
  Send,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Loader2,
  AlertCircle,
  History,
  Mail,
  Calendar,
} from "lucide-react";
import { SignerReminderCard } from "./SignerReminderCard";
import { useToast } from "@/components/ui/toast";

export interface ReminderSettings {
  enabled: boolean;
  intervalDays: number;
  lastReminderSentAt: string | null;
  nextReminderAt: string | null;
  maxReminders: number;
  remindersSent: number;
}

export interface SignerReminder {
  id: string;
  signerName: string;
  signerEmail: string;
  signerRole?: string;
  status: "pending" | "viewed" | "signed" | "declined";
  lastReminderSentAt: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface ReminderHistoryItem {
  id: string;
  signerEmail: string;
  signerName: string;
  sentAt: string;
  emailSent: boolean;
  type: "manual" | "automatic";
}

interface ReminderSettingsPanelProps {
  contractId: string;
  settings: ReminderSettings;
  signers: SignerReminder[];
  reminderHistory?: ReminderHistoryItem[];
  onSettingsChange?: (settings: Partial<ReminderSettings>) => Promise<void>;
  onSendReminder?: (signerId?: string) => Promise<void>;
  onClose?: () => void;
}

const INTERVAL_OPTIONS = [
  { value: 1, label: "Every day" },
  { value: 2, label: "Every 2 days" },
  { value: 3, label: "Every 3 days" },
  { value: 5, label: "Every 5 days" },
  { value: 7, label: "Every 7 days" },
];

export function ReminderSettingsPanel({
  contractId,
  settings,
  signers,
  reminderHistory = [],
  onSettingsChange,
  onSendReminder,
  onClose,
}: ReminderSettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<ReminderSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const toast = useToast();

  // Update local settings when props change
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleToggleReminders = useCallback(async () => {
    if (!onSettingsChange) return;

    const newEnabled = !localSettings.enabled;
    setLocalSettings(prev => ({ ...prev, enabled: newEnabled }));
    setSaving(true);

    try {
      await onSettingsChange({ enabled: newEnabled });
      toast.success(newEnabled ? "Reminders enabled" : "Reminders disabled");
    } catch (err) {
      toast.error("Failed to update settings");
      setLocalSettings(prev => ({ ...prev, enabled: !newEnabled }));
    } finally {
      setSaving(false);
    }
  }, [localSettings.enabled, onSettingsChange, toast]);

  const handleIntervalChange = useCallback(async (newInterval: number) => {
    if (!onSettingsChange) return;

    const oldInterval = localSettings.intervalDays;
    setLocalSettings(prev => ({ ...prev, intervalDays: newInterval }));
    setSaving(true);

    try {
      await onSettingsChange({ intervalDays: newInterval });
      toast.success("Interval updated");
    } catch (err) {
      toast.error("Failed to update interval");
      setLocalSettings(prev => ({ ...prev, intervalDays: oldInterval }));
    } finally {
      setSaving(false);
    }
  }, [localSettings.intervalDays, onSettingsChange, toast]);

  const handleSendReminder = useCallback(async (signerId?: string) => {
    if (!onSendReminder) return;

    setSendingReminder(signerId || "all");

    try {
      await onSendReminder(signerId);
      toast.success(signerId ? "Reminder sent" : "Reminders sent to all pending signers");
    } catch (err) {
      toast.error("Failed to send reminder");
    } finally {
      setSendingReminder(null);
    }
  }, [onSendReminder, toast]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
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
      return `in ${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
    } else if (diffDays === 1) {
      return "Tomorrow";
    } else {
      return `in ${diffDays} days`;
    }
  };

  const pendingSigners = signers.filter(s => s.status === "pending");
  const hasPendingSigners = pendingSigners.length > 0;

  return (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#529ec6]" />
            <h3 className="font-medium text-slate-900">Reminders</h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Manage automatic and manual signature reminders
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {localSettings.enabled ? (
                <div className="p-2 bg-[#529ec6]/10 rounded-lg">
                  <Bell className="w-5 h-5 text-[#529ec6]" />
                </div>
              ) : (
                <div className="p-2 bg-slate-200 rounded-lg">
                  <BellOff className="w-5 h-5 text-slate-500" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Auto-Reminders
                </p>
                <p className="text-xs text-slate-500">
                  {localSettings.enabled ? "Active" : "Disabled"}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleReminders}
              disabled={saving}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                localSettings.enabled ? "bg-[#529ec6]" : "bg-slate-300"
              } ${saving ? "opacity-50" : ""}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  localSettings.enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Interval Selection */}
        {localSettings.enabled && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Reminder Interval
            </label>
            <div className="relative">
              <select
                value={localSettings.intervalDays}
                onChange={(e) => handleIntervalChange(parseInt(e.target.value))}
                disabled={saving}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg appearance-none cursor-pointer focus:ring-2 focus:ring-[#529ec6] focus:border-transparent disabled:opacity-50"
              >
                {INTERVAL_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Status Info */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Reminders sent</span>
            <span className="font-medium text-slate-900">
              {localSettings.remindersSent} / {localSettings.maxReminders}
            </span>
          </div>

          {localSettings.lastReminderSentAt && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Last sent</span>
              <span className="text-slate-900">
                {formatRelativeTime(localSettings.lastReminderSentAt)}
              </span>
            </div>
          )}

          {localSettings.enabled && localSettings.nextReminderAt && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Next reminder
              </span>
              <span className="text-[#529ec6] font-medium">
                {formatRelativeTime(localSettings.nextReminderAt)}
              </span>
            </div>
          )}
        </div>

        {/* Send Manual Reminder */}
        {hasPendingSigners && (
          <button
            onClick={() => handleSendReminder()}
            disabled={sendingReminder === "all"}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#529ec6] text-white rounded-lg hover:bg-[#4a8db3] transition-colors disabled:opacity-50"
          >
            {sendingReminder === "all" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send Reminder to All ({pendingSigners.length})
          </button>
        )}

        {/* Signers Section */}
        {signers.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-3">
              Signers
            </h4>
            <div className="space-y-2">
              {signers.map(signer => (
                <SignerReminderCard
                  key={signer.id}
                  signer={signer}
                  nextReminderAt={
                    localSettings.enabled && signer.status === "pending"
                      ? localSettings.nextReminderAt
                      : null
                  }
                  onSendReminder={
                    signer.status === "pending" && onSendReminder
                      ? () => handleSendReminder(signer.id)
                      : undefined
                  }
                  isSending={sendingReminder === signer.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Reminder History */}
        {reminderHistory.length > 0 && (
          <div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between py-2 text-sm font-medium text-slate-700"
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Reminder History
              </div>
              {showHistory ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showHistory && (
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                {reminderHistory.map(item => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 rounded-lg text-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className={`w-3.5 h-3.5 ${
                          item.emailSent ? "text-emerald-500" : "text-red-500"
                        }`} />
                        <span className="font-medium text-slate-900">
                          {item.signerName}
                        </span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        item.type === "manual"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-200 text-slate-600"
                      }`}>
                        {item.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {item.signerEmail}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {formatDate(item.sentAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {signers.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Mail className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-600 font-medium">No signers yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Send the contract for signature to enable reminders
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { X, RotateCcw, AlertTriangle, Loader2 } from "lucide-react";
import type { ContractVersion } from "@/db/types";

interface RollbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  targetVersion: ContractVersion;
  currentVersion: number;
}

export function RollbackModal({
  isOpen,
  onClose,
  onConfirm,
  targetVersion,
  currentVersion,
}: RollbackModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rollback");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <RotateCcw className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              Rollback to Version {targetVersion.version_number}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">
                This action cannot be easily undone
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Rolling back will restore the contract to a previous state. Your
                current version will be saved in the history before the rollback.
              </p>
            </div>
          </div>

          {/* Version Details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Current Version</span>
              <span className="font-medium text-slate-900">
                Version {currentVersion}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Rolling back to</span>
              <span className="font-medium text-slate-900">
                Version {targetVersion.version_number}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Saved on</span>
              <span className="text-slate-700">
                {formatDate(targetVersion.created_at)}
              </span>
            </div>
            {targetVersion.change_summary && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-500 uppercase font-medium mb-1">
                  Changes in this version
                </p>
                <p className="text-sm text-slate-700">
                  {targetVersion.change_summary}
                </p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Rolling back...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                Rollback to Version {targetVersion.version_number}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

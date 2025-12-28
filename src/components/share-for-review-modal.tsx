"use client";

import { useState } from "react";
import {
  X,
  Send,
  Loader2,
  Copy,
  Check,
  Mail,
  User,
  MessageSquare,
  Clock,
  Link as LinkIcon,
} from "lucide-react";

interface ShareForReviewModalProps {
  contractId: string;
  contractTitle: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ShareForReviewModal({
  contractId,
  contractTitle,
  onClose,
  onSuccess,
}: ShareForReviewModalProps) {
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [message, setMessage] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    reviewUrl: string;
    emailSent: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);

    try {
      const response = await fetch(`/api/contracts/${contractId}/share-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewerName,
          reviewerEmail,
          message: message || undefined,
          expiresInDays,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to share contract");
      }

      setSuccess({
        reviewUrl: data.reviewUrl,
        emailSent: data.emailSent,
      });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to share contract");
    } finally {
      setSending(false);
    }
  };

  const copyLink = async () => {
    if (!success?.reviewUrl) return;
    await navigator.clipboard.writeText(success.reviewUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Share for Review
            </h2>
            <p className="text-sm text-slate-500">{contractTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          // Success State
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Review Link Created!
              </h3>
              <p className="text-slate-600">
                {success.emailSent
                  ? `An invitation has been sent to ${reviewerEmail}`
                  : "Share the link below with your reviewer"}
              </p>
            </div>

            {/* Review Link */}
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Review Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={success.reviewUrl}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-600 truncate"
                />
                <button
                  onClick={copyLink}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    copied
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
                >
                  {copied ? (
                    <span className="flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      Copied
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Copy className="w-4 h-4" />
                      Copy
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <LinkIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">This is a review link, not a signing link</p>
                  <p className="mt-1">
                    The reviewer can view the contract and leave feedback, but cannot sign it.
                    When you&apos;re ready to finalize, use &quot;Send for Signature&quot; instead.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-[#202e46] text-white rounded-lg hover:bg-[#1a2539] transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          // Form State
          <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
            <div className="p-6 space-y-4">
              {/* Info Banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Draft Review Only</p>
                    <p className="mt-1">
                      Share this contract for review before finalizing. The reviewer can view
                      and comment, but cannot sign. No document hash is generated until you
                      send for signature.
                    </p>
                  </div>
                </div>
              </div>

              {/* Reviewer Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reviewer Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="John Smith"
                    required
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#202e46]/20 focus:border-[#202e46] transition-colors"
                  />
                </div>
              </div>

              {/* Reviewer Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reviewer Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={reviewerEmail}
                    onChange={(e) => setReviewerEmail(e.target.value)}
                    placeholder="john@company.com"
                    required
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#202e46]/20 focus:border-[#202e46] transition-colors"
                  />
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Message (optional)
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Please review this contract and let me know your thoughts..."
                    rows={3}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#202e46]/20 focus:border-[#202e46] transition-colors resize-none"
                  />
                </div>
              </div>

              {/* Expiration */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Link Expires In
                </label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#202e46]/20 focus:border-[#202e46] transition-colors"
                >
                  <option value={3}>3 days</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending || !reviewerName || !reviewerEmail}
                className="flex items-center gap-2 px-4 py-2 bg-[#202e46] text-white rounded-lg hover:bg-[#1a2539] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Review Invite
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

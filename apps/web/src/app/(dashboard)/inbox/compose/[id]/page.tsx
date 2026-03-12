"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Loader2,
  Trash2,
  Save,
  Check,
} from "lucide-react";
import toast from "@/lib/toast";

interface Draft {
  id: string;
  to_addresses: string[] | null;
  subject: string | null;
  body: string | null;
  reply_to_received_email_id: string | null;
  thread_id: string | null;
  updated_at: string;
}

export default function ComposeEmailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    async function fetchDraft() {
      try {
        const res = await fetch(`/api/emails/drafts/${id}`);
        if (!res.ok) {
          toast.error("Draft not found.");
          router.push("/inbox");
          return;
        }
        const data: Draft = await res.json();
        setDraft(data);
        setTo(data.to_addresses?.join(", ") || "");
        setSubject(data.subject || "");
        setBody(data.body || "");
      } catch {
        toast.error("Failed to load draft.");
        router.push("/inbox");
      } finally {
        setLoading(false);
      }
    }
    fetchDraft();
  }, [id, router]);

  const saveDraft = useCallback(async () => {
    // Cancel any in-flight save
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setSaving(true);
    setSaved(false);

    try {
      const toAddresses = to
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await fetch(`/api/emails/drafts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_addresses: toAddresses,
          subject,
          body,
        }),
        signal: controller.signal,
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Failed to save draft:", err);
      }
    } finally {
      setSaving(false);
    }
  }, [id, to, subject, body]);

  // Auto-save on changes with 2s debounce
  useEffect(() => {
    if (!draft) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      saveDraft();
    }, 2000);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [to, subject, body, draft, saveDraft]);

  const handleSend = async () => {
    const toAddresses = to
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (toAddresses.length === 0) {
      toast.error("At least one recipient is required.");
      return;
    }

    if (!body.trim()) {
      toast.error("Email body is required.");
      return;
    }

    // Save first to ensure latest content is persisted
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    await fetch(`/api/emails/drafts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to_addresses: toAddresses,
        subject,
        body,
      }),
    });

    setSending(true);
    try {
      const res = await fetch(`/api/emails/drafts/${id}/send`, {
        method: "POST",
      });

      if (res.ok) {
        toast.success("Email sent!");
        router.push("/inbox");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to send email.");
      }
    } catch {
      toast.error("Failed to send email.");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/emails/drafts/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Draft deleted.");
        router.push("/inbox");
      } else {
        toast.error("Failed to delete draft.");
      }
    } catch {
      toast.error("Failed to delete draft.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-[#529ec6]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          href="/inbox"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Inbox
        </Link>

        {/* Save status */}
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          {saving && (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Saving...
            </>
          )}
          {saved && (
            <>
              <Check className="w-3 h-3 text-green-500" />
              Saved
            </>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {/* To field */}
        <div className="flex items-center border-b border-slate-100 px-5 py-3">
          <label className="text-sm font-medium text-slate-500 w-12">To:</label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com"
            className="flex-1 text-sm text-slate-900 outline-none"
          />
        </div>

        {/* Subject field */}
        <div className="flex items-center border-b border-slate-100 px-5 py-3">
          <label className="text-sm font-medium text-slate-500 w-12">
            Subj:
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="flex-1 text-sm text-slate-900 outline-none"
          />
        </div>

        {/* Body */}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your email..."
          rows={16}
          className="w-full px-5 py-4 text-sm text-slate-900 outline-none resize-y min-h-[300px]"
        />

        {/* Actions */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Delete
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={saveDraft}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#202e46] hover:bg-[#1a2539] rounded-lg transition-colors disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

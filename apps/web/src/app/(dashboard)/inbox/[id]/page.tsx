"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Paperclip,
  Download,
  Reply,
  Loader2,
  Send,
  X,
  Mail,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import toast from "@/lib/toast";
import { cn } from "@/lib/utils";

interface EmailContent {
  id: string;
  resend_email_id: string;
  from: string;
  to: string[];
  cc: string[] | null;
  bcc: string[] | null;
  subject: string;
  html: string | null;
  text: string | null;
  message_id: string;
  created_at: string;
  attachments: Array<{
    id: string;
    filename: string;
    content_type: string;
    size?: number;
  }>;
}

interface Attachment {
  id: string;
  filename: string;
  content_type: string;
  size: number;
  download_url: string;
  expires_at: string;
}

function parseSenderName(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: from, email: from };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EmailDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [email, setEmail] = useState<EmailContent | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReply, setShowReply] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    async function fetchEmail() {
      try {
        const res = await fetch(`/api/emails/received/${id}`);
        if (!res.ok) {
          setError("Email not found.");
          return;
        }
        const data = await res.json();
        setEmail(data);

        // Fetch attachments if any
        if (data.attachments && data.attachments.length > 0) {
          const attRes = await fetch(
            `/api/emails/received/${id}/attachments`
          );
          if (attRes.ok) {
            const attData = await attRes.json();
            setAttachments(attData.data || []);
          }
        }
      } catch {
        setError("Failed to load email.");
      } finally {
        setLoading(false);
      }
    }

    fetchEmail();
  }, [id]);

  // Render HTML content in sandboxed iframe
  useEffect(() => {
    if (email?.html && iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                color: #1e293b;
                margin: 0;
                padding: 16px;
                line-height: 1.6;
              }
              img { max-width: 100%; height: auto; }
              a { color: #529ec6; }
              pre, code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
              blockquote { border-left: 3px solid #cbd5e1; margin: 8px 0; padding: 4px 12px; color: #64748b; }
            </style>
          </head>
          <body>${email.html}</body>
          </html>
        `);
        doc.close();

        // Auto-resize iframe to fit content
        const resizeObserver = new ResizeObserver(() => {
          if (doc.body) {
            iframe.style.height = doc.body.scrollHeight + 20 + "px";
          }
        });
        if (doc.body) {
          resizeObserver.observe(doc.body);
          iframe.style.height = doc.body.scrollHeight + 20 + "px";
        }

        return () => resizeObserver.disconnect();
      }
    }
  }, [email?.html]);

  const handleSendReply = async () => {
    if (!replyBody.trim()) return;

    setSending(true);
    try {
      const res = await fetch(`/api/emails/received/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyBody }),
      });

      if (res.ok) {
        toast.success("Reply sent!");
        setShowReply(false);
        setReplyBody("");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to send reply.");
      }
    } catch {
      toast.error("Failed to send reply.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-[#529ec6]" />
      </div>
    );
  }

  if (error || !email) {
    return (
      <div className="text-center py-24">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-slate-900 mb-2">
          {error || "Email not found"}
        </h2>
        <Link
          href="/inbox"
          className="text-sm text-[#529ec6] hover:underline"
        >
          Back to Inbox
        </Link>
      </div>
    );
  }

  const { name: senderName, email: senderEmail } = parseSenderName(
    email.from
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        href="/inbox"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Inbox
      </Link>

      {/* Email Card */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100">
          <h1 className="text-xl font-semibold text-slate-900 mb-4">
            {email.subject || "(no subject)"}
          </h1>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-slate-600">
                  {senderName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">
                    {senderName}
                  </span>
                  {senderName !== senderEmail && (
                    <span className="text-sm text-slate-400">
                      &lt;{senderEmail}&gt;
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-500 mt-0.5">
                  To: {email.to.join(", ")}
                  {email.cc && email.cc.length > 0 && (
                    <span> | CC: {email.cc.join(", ")}</span>
                  )}
                </div>
              </div>
            </div>
            <span className="text-sm text-slate-400 whitespace-nowrap">
              {format(new Date(email.created_at), "MMM d, yyyy 'at' h:mm a")}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {email.html ? (
            <iframe
              ref={iframeRef}
              sandbox="allow-same-origin"
              className="w-full border-0 min-h-[200px]"
              title="Email content"
            />
          ) : email.text ? (
            <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans leading-relaxed">
              {email.text}
            </pre>
          ) : (
            <p className="text-sm text-slate-400 italic">
              No email content available.
            </p>
          )}
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2 mb-3">
              <Paperclip className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">
                {attachments.length} attachment
                {attachments.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Download className="w-4 h-4 text-slate-400" />
                  <span className="truncate max-w-[200px]">
                    {att.filename}
                  </span>
                  {att.size > 0 && (
                    <span className="text-xs text-slate-400">
                      ({formatFileSize(att.size)})
                    </span>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Reply Section */}
        <div className="px-6 py-4 border-t border-slate-100">
          {!showReply ? (
            <button
              onClick={() => setShowReply(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#202e46] text-white font-medium rounded-lg hover:bg-[#1a2539] transition-colors"
            >
              <Reply className="w-4 h-4" />
              Reply
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Replying to {senderName}
                </span>
                <button
                  onClick={() => setShowReply(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Type your reply..."
                rows={6}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#529ec6]/50 resize-y"
                autoFocus
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSendReply}
                  disabled={sending || !replyBody.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#202e46] text-white font-medium rounded-lg hover:bg-[#1a2539] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {sending ? "Sending..." : "Send Reply"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

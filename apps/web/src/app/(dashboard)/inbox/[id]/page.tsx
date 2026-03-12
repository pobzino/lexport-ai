"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Paperclip,
  Download,
  Reply,
  Loader2,
  Send,
  X,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import toast from "@/lib/toast";
import { cn } from "@/lib/utils";

interface ThreadMessage {
  id: string;
  type: "received" | "sent";
  from: string;
  to: string[];
  subject: string;
  resend_email_id?: string;
  has_attachments?: boolean;
  attachment_count?: number;
  read?: boolean;
  html?: string;
  text_body?: string;
  created_at: string;
}

interface Attachment {
  id: string;
  filename: string;
  content_type: string;
  size: number;
  download_url: string;
}

interface LoadedContent {
  html?: string | null;
  text?: string | null;
  attachments?: Attachment[];
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

function MessageContent({
  message,
  isExpanded,
}: {
  message: ThreadMessage;
  isExpanded: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [content, setContent] = useState<LoadedContent | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  // For sent messages, content is already available
  useEffect(() => {
    if (message.type === "sent" && message.html) {
      setContent({ html: message.html, text: message.text_body });
    }
  }, [message]);

  // For received messages, fetch content on expand
  useEffect(() => {
    if (
      message.type === "received" &&
      isExpanded &&
      !content &&
      !loadingContent
    ) {
      setLoadingContent(true);
      fetch(`/api/emails/received/${message.id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setContent({ html: data.html, text: data.text });
            // Fetch attachments
            if (message.has_attachments) {
              fetch(`/api/emails/received/${message.id}/attachments`)
                .then((res) => (res.ok ? res.json() : null))
                .then((attData) => {
                  if (attData?.data) {
                    setContent((prev) => ({
                      ...prev,
                      attachments: attData.data,
                    }));
                  }
                });
            }
          }
        })
        .finally(() => setLoadingContent(false));
    }
  }, [message, isExpanded, content, loadingContent]);

  // Render HTML in iframe
  useEffect(() => {
    if (isExpanded && content?.html && iframeRef.current) {
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
          <body>${content.html}</body>
          </html>
        `);
        doc.close();

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
  }, [isExpanded, content?.html]);

  if (!isExpanded) return null;

  if (loadingContent) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-[#529ec6]" />
      </div>
    );
  }

  return (
    <div>
      {content?.html ? (
        <iframe
          ref={iframeRef}
          sandbox="allow-same-origin"
          className="w-full border-0 min-h-[100px]"
          title="Email content"
        />
      ) : content?.text ? (
        <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans leading-relaxed">
          {content.text}
        </pre>
      ) : (
        <p className="text-sm text-slate-400 italic">
          No email content available.
        </p>
      )}

      {/* Attachments */}
      {content?.attachments && content.attachments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Paperclip className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-500">
              {content.attachments.length} attachment
              {content.attachments.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {content.attachments.map((att) => (
              <a
                key={att.id}
                href={att.download_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate max-w-[180px]">{att.filename}</span>
                {att.size > 0 && (
                  <span className="text-slate-400">
                    ({formatFileSize(att.size)})
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmailDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showReply, setShowReply] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);

  const fetchThread = useCallback(async () => {
    try {
      // First get the email metadata to find thread_id
      const emailRes = await fetch(`/api/emails/received/${id}`);
      if (!emailRes.ok) {
        setError("Email not found.");
        return;
      }
      const emailData = await emailRes.json();

      // If there's a thread_id, fetch the full thread
      if (emailData.thread_id) {
        const threadRes = await fetch(
          `/api/emails/threads/${encodeURIComponent(emailData.thread_id)}`
        );
        if (threadRes.ok) {
          const threadData = await threadRes.json();
          setMessages(threadData.messages);
          // Expand the current email and the most recent message
          const expanded = new Set<string>();
          expanded.add(id);
          if (threadData.messages.length > 0) {
            expanded.add(
              threadData.messages[threadData.messages.length - 1].id
            );
          }
          setExpandedIds(expanded);
          return;
        }
      }

      // Fallback: show single email
      setMessages([
        {
          id: emailData.id || id,
          type: "received",
          from: emailData.from,
          to: emailData.to || [],
          subject: emailData.subject,
          resend_email_id: emailData.resend_email_id,
          has_attachments:
            emailData.attachments && emailData.attachments.length > 0,
          created_at: emailData.created_at,
        },
      ]);
      setExpandedIds(new Set([id]));
    } catch {
      setError("Failed to load email.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  const toggleExpanded = (msgId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  };

  const handleSendReply = async () => {
    if (!replyBody.trim()) return;

    setSending(true);
    try {
      // Find the last received email in thread to reply to
      const lastReceived = [...messages]
        .reverse()
        .find((m) => m.type === "received");
      const replyToId = lastReceived?.id || id;

      const res = await fetch(`/api/emails/received/${replyToId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyBody }),
      });

      if (res.ok) {
        toast.success("Reply sent!");
        setShowReply(false);
        setReplyBody("");
        // Refresh thread to show the sent reply
        setLoading(true);
        fetchThread();
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

  if (error || messages.length === 0) {
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

  const threadSubject = messages[0]?.subject || "(no subject)";

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Back button */}
      <Link
        href="/inbox"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Inbox
      </Link>

      {/* Thread subject */}
      <h1 className="text-xl font-semibold text-slate-900">
        {threadSubject}
      </h1>

      {/* Thread messages */}
      <div className="space-y-2">
        {messages.map((msg) => {
          const isExpanded = expandedIds.has(msg.id);
          const { name: senderName, email: senderEmail } = parseSenderName(
            msg.from
          );
          const isSent = msg.type === "sent";

          return (
            <div
              key={msg.id}
              className={cn(
                "bg-white rounded-lg border overflow-hidden",
                isSent
                  ? "border-[#529ec6]/20 bg-[#529ec6]/[0.02]"
                  : "border-slate-200"
              )}
            >
              {/* Message header - clickable to expand/collapse */}
              <button
                onClick={() => toggleExpanded(msg.id)}
                className="w-full px-5 py-3.5 flex items-center gap-3 text-left hover:bg-slate-50/50 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                )}

                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    isSent ? "bg-[#529ec6]/10" : "bg-slate-200"
                  )}
                >
                  {isSent ? (
                    <Send className="w-3.5 h-3.5 text-[#529ec6]" />
                  ) : (
                    <span className="text-xs font-semibold text-slate-600">
                      {senderName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {isSent ? "You" : senderName}
                    </span>
                    {!isSent && senderName !== senderEmail && (
                      <span className="text-xs text-slate-400 hidden sm:inline">
                        &lt;{senderEmail}&gt;
                      </span>
                    )}
                    {isSent && (
                      <span className="text-xs text-[#529ec6] font-medium">
                        Sent
                      </span>
                    )}
                  </div>
                  {!isExpanded && (
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      To: {msg.to?.join(", ")}
                    </p>
                  )}
                </div>

                <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                  {format(
                    new Date(msg.created_at),
                    "MMM d, yyyy 'at' h:mm a"
                  )}
                </span>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-5 pb-4 border-t border-slate-100">
                  {/* To/CC details */}
                  <div className="py-2 text-xs text-slate-500">
                    To: {msg.to?.join(", ")}
                  </div>

                  {/* Message body */}
                  <MessageContent message={msg} isExpanded={isExpanded} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reply Section */}
      <div className="bg-white rounded-lg border border-slate-200 p-5">
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
                Replying to thread
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
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Send,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

interface SentEmailDetail {
  id: string;
  from_address: string;
  to_addresses: string[];
  subject: string;
  html: string | null;
  text_body: string | null;
  status: string;
  created_at: string;
}

export default function SentEmailDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [email, setEmail] = useState<SentEmailDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    async function fetchEmail() {
      try {
        const res = await fetch(`/api/emails/sent/${id}`);
        if (!res.ok) {
          setError("Email not found.");
          return;
        }
        setEmail(await res.json());
      } catch {
        setError("Failed to load email.");
      } finally {
        setLoading(false);
      }
    }
    fetchEmail();
  }, [id]);

  // Render HTML in iframe
  useEffect(() => {
    if (email?.html && iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(email.html);
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
  }, [email?.html]);

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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/inbox"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Inbox
      </Link>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100">
          <h1 className="text-xl font-semibold text-slate-900 mb-4">
            {email.subject || "(no subject)"}
          </h1>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#529ec6]/10 flex items-center justify-center flex-shrink-0">
                <Send className="w-4 h-4 text-[#529ec6]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">You</span>
                  <span className="text-xs text-[#529ec6] font-medium">
                    Sent
                  </span>
                </div>
                <div className="text-sm text-slate-500 mt-0.5">
                  To: {email.to_addresses.join(", ")}
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
          ) : email.text_body ? (
            <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans leading-relaxed">
              {email.text_body}
            </pre>
          ) : (
            <p className="text-sm text-slate-400 italic">
              No email content available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

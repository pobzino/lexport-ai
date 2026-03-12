"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Search,
  Paperclip,
  Loader2,
  Inbox,
  Filter,
  CheckCheck,
  Send,
  FileEdit,
  Plus,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import toast from "@/lib/toast";
import { cn } from "@/lib/utils";

interface ReceivedEmail {
  id: string;
  from_address: string;
  to_addresses: string[];
  subject: string;
  has_attachments: boolean;
  attachment_count: number;
  read: boolean;
  thread_id: string;
  created_at: string;
}

interface SentEmail {
  id: string;
  to_addresses: string[];
  subject: string;
  thread_id: string;
  created_at: string;
}

interface Draft {
  id: string;
  to_addresses: string[] | null;
  subject: string | null;
  body: string | null;
  updated_at: string;
}

type TabType = "inbox" | "sent" | "drafts";
type FilterType = "all" | "unread" | "read";

function parseSenderName(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: from, email: from };
}

function formatRecipients(addresses: string[] | null): string {
  if (!addresses || addresses.length === 0) return "(no recipient)";
  return addresses.map((a) => {
    const match = a.match(/<(.+?)>/);
    return match ? match[1] : a;
  }).join(", ");
}

export default function InboxPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabType>("inbox");
  const [emails, setEmails] = useState<ReceivedEmail[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchInbox = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filter !== "all") params.set("filter", filter);
      params.set("page", page.toString());

      const res = await fetch(`/api/emails/received?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      } else {
        toast.error("Failed to load emails.");
      }
    } catch {
      toast.error("Failed to load emails.");
    } finally {
      setLoading(false);
    }
  }, [search, filter, page]);

  const fetchSent = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", page.toString());

      const res = await fetch(`/api/emails/sent?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSentEmails(data.emails);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      } else {
        toast.error("Failed to load sent emails.");
      }
    } catch {
      toast.error("Failed to load sent emails.");
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());

      const res = await fetch(`/api/emails/drafts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDrafts(data.drafts);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      } else {
        toast.error("Failed to load drafts.");
      }
    } catch {
      toast.error("Failed to load drafts.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (tab === "inbox") fetchInbox();
    else if (tab === "sent") fetchSent();
    else if (tab === "drafts") fetchDrafts();
  }, [tab, fetchInbox, fetchSent, fetchDrafts]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleTabChange = (newTab: TabType) => {
    setTab(newTab);
    setPage(1);
    setSearch("");
    setSearchInput("");
    setFilter("all");
  };

  const unreadCount = emails.filter((e) => !e.read).length;

  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/emails/received/mark-read", {
        method: "POST",
      });
      if (res.ok) {
        setEmails((prev) => prev.map((e) => ({ ...e, read: true })));
        toast.success("All emails marked as read.");
      }
    } catch {
      toast.error("Failed to mark emails as read.");
    }
  };

  const handleCompose = async () => {
    try {
      const res = await fetch("/api/emails/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/inbox/compose/${data.id}`);
      } else {
        toast.error("Failed to create draft.");
      }
    } catch {
      toast.error("Failed to create draft.");
    }
  };

  const handleDeleteDraft = async (draftId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(`/api/emails/drafts/${draftId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDrafts((prev) => prev.filter((d) => d.id !== draftId));
        setTotal((prev) => prev - 1);
        toast.success("Draft deleted.");
      }
    } catch {
      toast.error("Failed to delete draft.");
    }
  };

  const tabs = [
    { key: "inbox" as TabType, label: "Inbox", icon: Mail },
    { key: "sent" as TabType, label: "Sent", icon: Send },
    { key: "drafts" as TabType, label: "Drafts", icon: FileEdit },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inbox</h1>
          <p className="text-slate-500 mt-1">
            Manage emails at hello@lexportai.com
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tab === "inbox" && unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
          <button
            onClick={handleCompose}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#202e46] hover:bg-[#1a2539] rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Compose
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="flex border-b border-slate-200">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => handleTabChange(t.key)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                  tab === t.key
                    ? "border-[#529ec6] text-[#202e46]"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                )}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Search & Filters (inbox & sent only) */}
        {(tab === "inbox" || tab === "sent") && (
          <div className="p-4 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={
                    tab === "inbox"
                      ? "Search by sender or subject..."
                      : "Search by recipient or subject..."
                  }
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#529ec6]/50"
                />
              </div>
              {tab === "inbox" && (
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  {(["all", "unread", "read"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => {
                        setFilter(f);
                        setPage(1);
                      }}
                      className={cn(
                        "px-3 py-2 text-sm font-medium rounded-lg transition-colors capitalize",
                        filter === f
                          ? "bg-[#529ec6]/10 text-[#202e46]"
                          : "text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#529ec6]" />
          </div>
        ) : tab === "inbox" ? (
          /* Received emails list */
          emails.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Inbox className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                {search || filter !== "all"
                  ? "No emails match your filters"
                  : "Your inbox is empty"}
              </h3>
              <p className="text-slate-500">
                {search || filter !== "all"
                  ? "Try adjusting your search or filter."
                  : "Emails sent to hello@lexportai.com will appear here."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {emails.map((email) => {
                const { name, email: senderEmail } = parseSenderName(
                  email.from_address
                );
                return (
                  <Link
                    key={email.id}
                    href={`/inbox/${email.id}`}
                    className={cn(
                      "flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors",
                      !email.read && "bg-blue-50/40"
                    )}
                  >
                    <div className="flex-shrink-0 w-2">
                      {!email.read && (
                        <div className="w-2 h-2 rounded-full bg-[#529ec6]" />
                      )}
                    </div>
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center">
                      <span className="text-sm font-semibold text-slate-600">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-sm truncate",
                            !email.read
                              ? "font-semibold text-slate-900"
                              : "font-medium text-slate-700"
                          )}
                        >
                          {name}
                        </span>
                        {name !== senderEmail && (
                          <span className="text-xs text-slate-400 truncate hidden sm:inline">
                            {senderEmail}
                          </span>
                        )}
                      </div>
                      <p
                        className={cn(
                          "text-sm truncate mt-0.5",
                          !email.read ? "text-slate-800" : "text-slate-500"
                        )}
                      >
                        {email.subject || "(no subject)"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {email.has_attachments && (
                        <Paperclip className="w-4 h-4 text-slate-400" />
                      )}
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {formatDistanceToNow(new Date(email.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        ) : tab === "sent" ? (
          /* Sent emails list */
          sentEmails.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No sent emails
              </h3>
              <p className="text-slate-500">
                Replies and composed emails will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sentEmails.map((email) => (
                <Link
                  key={email.id}
                  href={`/inbox/sent/${email.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-shrink-0 w-2" />
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#529ec6]/10 flex items-center justify-center">
                    <Send className="w-4 h-4 text-[#529ec6]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700 truncate">
                        To: {formatRecipients(email.to_addresses)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 truncate mt-0.5">
                      {email.subject || "(no subject)"}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                    {formatDistanceToNow(new Date(email.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </Link>
              ))}
            </div>
          )
        ) : (
          /* Drafts list */
          drafts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileEdit className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No drafts
              </h3>
              <p className="text-slate-500">
                Saved drafts will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {drafts.map((draft) => (
                <Link
                  key={draft.id}
                  href={`/inbox/compose/${draft.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-shrink-0 w-2" />
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center">
                    <FileEdit className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700 truncate">
                        {draft.to_addresses && draft.to_addresses.length > 0
                          ? `To: ${formatRecipients(draft.to_addresses)}`
                          : "(no recipient)"}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 truncate mt-0.5">
                      {draft.subject || draft.body?.slice(0, 60) || "(empty draft)"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {formatDistanceToNow(new Date(draft.updated_at), {
                        addSuffix: true,
                      })}
                    </span>
                    <button
                      onClick={(e) => handleDeleteDraft(draft.id, e)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Delete draft"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-slate-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

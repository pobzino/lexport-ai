"use client";

import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import type { InvoiceStatus } from "@/db/types";

interface Invoice {
  id: string;
  invoice_number: string;
  recipient_name: string;
  recipient_email: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  due_date: string | null;
  created_at: string;
  sent_at: string | null;
  paid_at: string | null;
  contract_id: string | null;
  contract_title?: string | null;
}

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; color: string; icon: typeof Clock; bgColor: string }
> = {
  draft: {
    label: "Draft",
    color: "text-slate-600",
    icon: FileText,
    bgColor: "bg-slate-100",
  },
  sent: {
    label: "Sent",
    color: "text-blue-600",
    icon: Send,
    bgColor: "bg-blue-100",
  },
  paid: {
    label: "Paid",
    color: "text-emerald-600",
    icon: CheckCircle,
    bgColor: "bg-emerald-100",
  },
  overdue: {
    label: "Overdue",
    color: "text-red-600",
    icon: AlertCircle,
    bgColor: "bg-red-100",
  },
  cancelled: {
    label: "Cancelled",
    color: "text-slate-400",
    icon: XCircle,
    bgColor: "bg-slate-100",
  },
  void: {
    label: "Void",
    color: "text-slate-400",
    icon: XCircle,
    bgColor: "bg-slate-100",
  },
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  usd: "$",
  gbp: "£",
  eur: "€",
};

function formatCurrency(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency.toLowerCase()] || "$";
  return `${symbol}${(amount / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Memoized invoice row to prevent re-renders on filter/pagination changes
interface InvoiceRowProps {
  invoice: Invoice;
  openMenu: string | null;
  setOpenMenu: (id: string | null) => void;
  actionLoading: string | null;
  onSend: (id: string) => void;
  onDelete: (id: string) => void;
}

// Shared action menu used by both table row and mobile card
function InvoiceActions({ invoice, openMenu, setOpenMenu, actionLoading, onSend, onDelete }: Omit<InvoiceRowProps, never>) {
  return (
    <div className="flex items-center gap-2">
      {invoice.status === "draft" && (
        <button
          onClick={() => onSend(invoice.id)}
          disabled={actionLoading === invoice.id}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#202e46] text-white text-sm font-medium rounded-lg hover:bg-[#1a2539] transition-colors disabled:opacity-50 min-h-[36px]"
        >
          {actionLoading === invoice.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{actionLoading === invoice.id ? "Sending..." : "Send"}</span>
        </button>
      )}
      {(invoice.status === "sent" || invoice.status === "overdue") && (
        <button
          onClick={() => onSend(invoice.id)}
          disabled={actionLoading === invoice.id}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 min-h-[36px]"
        >
          {actionLoading === invoice.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{actionLoading === invoice.id ? "Sending..." : "Resend"}</span>
        </button>
      )}
      <div className="relative">
        <button
          onClick={() => setOpenMenu(openMenu === invoice.id ? null : invoice.id)}
          className="p-2.5 hover:bg-slate-100 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
          aria-label="More actions"
        >
          <MoreVertical className="w-4 h-4 text-slate-600" />
        </button>
        {openMenu === invoice.id && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-20 py-1">
              <Link href={`/invoices/${invoice.id}`} className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                <FileText className="w-4 h-4" />View Details
              </Link>
              {invoice.status === "draft" && (
                <button
                  onClick={() => { onSend(invoice.id); setOpenMenu(null); }}
                  disabled={actionLoading === invoice.id}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 w-full text-left disabled:opacity-50"
                >
                  {actionLoading === invoice.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {actionLoading === invoice.id ? "Sending..." : "Send Invoice"}
                </button>
              )}
              {(invoice.status === "sent" || invoice.status === "overdue") && (
                <button
                  onClick={() => { onSend(invoice.id); setOpenMenu(null); }}
                  disabled={actionLoading === invoice.id}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 w-full text-left disabled:opacity-50"
                >
                  {actionLoading === invoice.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {actionLoading === invoice.id ? "Sending..." : "Resend Invoice"}
                </button>
              )}
              <button
                onClick={() => { window.open(`/api/invoices/${invoice.id}?format=pdf&download=true`, '_blank'); setOpenMenu(null); }}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 w-full text-left"
              >
                <Download className="w-4 h-4" />Download PDF
              </button>
              <hr className="my-1 border-slate-100" />
              <button
                onClick={() => { onDelete(invoice.id); setOpenMenu(null); }}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full text-left"
              >
                <Trash2 className="w-4 h-4" />Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Desktop table row
const InvoiceRow = memo(function InvoiceRow(props: InvoiceRowProps) {
  const { invoice } = props;
  const statusConfig = STATUS_CONFIG[invoice.status];
  const StatusIcon = statusConfig.icon;

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="py-3 px-4">
        <Link href={`/invoices/${invoice.id}`} className="font-medium text-slate-900 hover:text-[#529ec6]">
          {invoice.invoice_number}
        </Link>
        <p className="text-xs text-slate-500">{formatDate(invoice.created_at)}</p>
      </td>
      <td className="py-3 px-4">
        <p className="text-slate-900">{invoice.recipient_name}</p>
        <p className="text-xs text-slate-500">{invoice.recipient_email}</p>
      </td>
      <td className="py-3 px-4">
        <span className="font-medium text-slate-900">{formatCurrency(invoice.amount, invoice.currency)}</span>
      </td>
      <td className="py-3 px-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {statusConfig.label}
        </span>
      </td>
      <td className="py-3 px-4 text-slate-600 hidden lg:table-cell">{formatDate(invoice.due_date)}</td>
      <td className="py-3 px-4 hidden lg:table-cell">
        {invoice.contract_id ? (
          <Link href={`/contracts/${invoice.contract_id}/edit`} className="text-sm text-[#529ec6] hover:underline truncate max-w-[150px] block">
            {invoice.contract_title || "View Contract"}
          </Link>
        ) : (
          <span className="text-xs text-slate-400">Standalone</span>
        )}
      </td>
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end">
          <InvoiceActions {...props} />
        </div>
      </td>
    </tr>
  );
});

// Mobile card layout
const InvoiceCard = memo(function InvoiceCard(props: InvoiceRowProps) {
  const { invoice } = props;
  const statusConfig = STATUS_CONFIG[invoice.status];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="p-4 border-b border-slate-100 last:border-b-0">
      <div className="flex items-start justify-between gap-3 mb-2">
        <Link href={`/invoices/${invoice.id}`} className="font-medium text-slate-900 hover:text-[#529ec6]">
          {invoice.invoice_number}
        </Link>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color} flex-shrink-0`}>
          <StatusIcon className="w-3 h-3" />
          {statusConfig.label}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-sm text-slate-700 truncate">{invoice.recipient_name}</p>
          <p className="text-xs text-slate-500 truncate">{invoice.recipient_email}</p>
        </div>
        <p className="text-lg font-semibold text-slate-900 flex-shrink-0">
          {formatCurrency(invoice.amount, invoice.currency)}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>{formatDate(invoice.created_at)}</span>
          {invoice.due_date && <span>Due {formatDate(invoice.due_date)}</span>}
        </div>
        <InvoiceActions {...props} />
      </div>
    </div>
  );
});

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [showStandalone, setShowStandalone] = useState<boolean | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounce search input (300ms)
  useEffect(() => {
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchQuery]);

  // Pagination
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  // Dropdown menu state
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("limit", limit.toString());
      params.set("offset", offset.toString());

      if (debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim());
      }
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (showStandalone === true) {
        params.set("standalone", "true");
      }

      const response = await fetch(`/api/invoices?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch invoices");
      }

      const data = await response.json();
      setInvoices(data.invoices || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, showStandalone, offset, limit]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Reset offset when filters change
  useEffect(() => {
    setOffset(0);
  }, [debouncedSearch, statusFilter, showStandalone]);

  const handleDelete = async (invoiceId: string) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;

    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete invoice");
      }
      fetchInvoices();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleSend = async (invoiceId: string) => {
    setActionLoading(invoiceId);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send invoice");
      }

      // Show success feedback
      fetchInvoices();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send invoice");
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  // Memoize stats to avoid 4 filter passes on every render
  const stats = useMemo(() => {
    const counts = { total, draft: 0, sent: 0, paid: 0, overdue: 0 };
    for (const inv of invoices) {
      if (inv.status in counts) counts[inv.status as keyof Omit<typeof counts, "total">]++;
    }
    return counts;
  }, [invoices, total]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
              <p className="text-slate-600 mt-1">
                Manage and track your invoices
              </p>
            </div>
            <Link
              href="/invoices/new"
              className="flex items-center gap-2 px-4 py-2.5 bg-[#202e46] text-white rounded-lg font-medium hover:bg-[#1a2539] transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Invoice
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-3 md:p-4">
            <p className="text-xs md:text-sm text-slate-500">Total</p>
            <p className="text-xl md:text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3 md:p-4">
            <p className="text-xs md:text-sm text-slate-500">Drafts</p>
            <p className="text-xl md:text-2xl font-bold text-slate-600">{stats.draft}</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3 md:p-4">
            <p className="text-xs md:text-sm text-slate-500">Sent</p>
            <p className="text-xl md:text-2xl font-bold text-blue-600">{stats.sent}</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3 md:p-4">
            <p className="text-xs md:text-sm text-slate-500">Paid</p>
            <p className="text-xl md:text-2xl font-bold text-emerald-600">{stats.paid}</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3 md:p-4 col-span-2 sm:col-span-1">
            <p className="text-xs md:text-sm text-slate-500">Overdue</p>
            <p className="text-xl md:text-2xl font-bold text-red-600">{stats.overdue}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by invoice number, name, or email..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6] focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as InvoiceStatus | "all")
                }
                className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6] bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Standalone Filter */}
            <div className="flex items-center gap-2">
              <select
                value={showStandalone === null ? "all" : showStandalone ? "standalone" : "linked"}
                onChange={(e) => {
                  const val = e.target.value;
                  setShowStandalone(
                    val === "all" ? null : val === "standalone"
                  );
                }}
                className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6] bg-white"
              >
                <option value="all">All Invoices</option>
                <option value="standalone">Standalone Only</option>
                <option value="linked">Contract-Linked Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Invoice List */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#529ec6]" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
              <button
                onClick={fetchInvoices}
                className="mt-4 text-sm text-[#529ec6] hover:underline"
              >
                Try again
              </button>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No invoices found
              </h3>
              <p className="text-slate-500 mb-4">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Create your first invoice to get started"}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Link
                  href="/invoices/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#202e46] text-white rounded-lg font-medium hover:bg-[#1a2539]"
                >
                  <Plus className="w-4 h-4" />
                  Create Invoice
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Mobile card layout */}
              <div className="md:hidden">
                {invoices.map((invoice) => (
                  <InvoiceCard
                    key={invoice.id}
                    invoice={invoice}
                    openMenu={openMenu}
                    setOpenMenu={setOpenMenu}
                    actionLoading={actionLoading}
                    onSend={handleSend}
                    onDelete={handleDelete}
                  />
                ))}
              </div>

              {/* Desktop table layout */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                        Invoice
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                        Client
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                        Amount
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 hidden lg:table-cell">
                        Due Date
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 hidden lg:table-cell">
                        Contract
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map((invoice) => (
                      <InvoiceRow
                        key={invoice.id}
                        invoice={invoice}
                        openMenu={openMenu}
                        setOpenMenu={setOpenMenu}
                        actionLoading={actionLoading}
                        onSend={handleSend}
                        onDelete={handleDelete}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                  <p className="text-xs sm:text-sm text-slate-600">
                    <span className="hidden sm:inline">Showing {offset + 1} to {Math.min(offset + limit, total)} of{" "}{total}</span>
                    <span className="sm:hidden">{offset + 1}-{Math.min(offset + limit, total)} of {total}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setOffset(Math.max(0, offset - limit))}
                      disabled={offset === 0}
                      className="p-2.5 rounded-lg border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs sm:text-sm text-slate-600 min-w-[60px] text-center">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setOffset(Math.min(total - limit, offset + limit))
                      }
                      disabled={offset + limit >= total}
                      className="p-2.5 rounded-lg border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                      aria-label="Next page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

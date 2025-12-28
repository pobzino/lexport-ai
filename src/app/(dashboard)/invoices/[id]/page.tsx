"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  AlertCircle,
  Loader2,
  ExternalLink,
  Calendar,
  User,
  Mail,
  DollarSign,
} from "lucide-react";
import type { InvoiceStatus } from "@/db/types";

interface Invoice {
  id: string;
  invoice_number: string;
  recipient_name: string;
  recipient_email: string;
  sender_name: string | null;
  sender_email: string | null;
  amount: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  due_date: string | null;
  created_at: string;
  sent_at: string | null;
  paid_at: string | null;
  contract_id: string | null;
  contract_title?: string | null;
  notes: string | null;
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

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoice();
    fetchPdfPreview();

    // Cleanup blob URL on unmount
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [invoiceId]);

  async function fetchPdfPreview() {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}?format=pdf`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      }
    } catch (err) {
      console.error("Failed to load PDF preview:", err);
    }
  }

  async function fetchInvoice() {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`);
      if (!response.ok) {
        throw new Error("Invoice not found");
      }
      const data = await response.json();
      setInvoice(data.invoice);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoice");
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    if (!invoice || invoice.status !== "draft") return;
    setActionLoading("send");
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to send invoice");
      }
      await fetchInvoice();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMarkPaid() {
    if (!invoice || invoice.status !== "sent") return;
    setActionLoading("paid");
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });
      if (!response.ok) {
        throw new Error("Failed to update invoice");
      }
      await fetchInvoice();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleVoid() {
    if (!invoice || invoice.status === "paid" || invoice.status === "void") return;
    if (!confirm("Are you sure you want to void this invoice?")) return;

    setActionLoading("void");
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "void" }),
      });
      if (!response.ok) {
        throw new Error("Failed to void invoice");
      }
      await fetchInvoice();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to void");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Invoice Not Found</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <Link
            href="/invoices"
            className="text-violet-600 hover:underline inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Invoices
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[invoice.status];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/invoices"
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-slate-900">
                    {invoice.invoice_number}
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                  >
                    <StatusIcon className="w-3.5 h-3.5" />
                    {statusConfig.label}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">
                  Created {formatDate(invoice.created_at)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {invoice.status === "draft" && (
                <button
                  onClick={handleSend}
                  disabled={actionLoading === "send"}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
                >
                  {actionLoading === "send" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send Invoice
                </button>
              )}

              {invoice.status === "sent" && (
                <button
                  onClick={handleMarkPaid}
                  disabled={actionLoading === "paid"}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {actionLoading === "paid" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Mark as Paid
                </button>
              )}

              <button
                onClick={() => window.open(`/api/invoices/${invoiceId}?format=pdf&download=true`, "_blank")}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>

              {invoice.status !== "paid" && invoice.status !== "void" && (
                <button
                  onClick={handleVoid}
                  disabled={actionLoading === "void"}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
                >
                  {actionLoading === "void" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  Void
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invoice Details Sidebar */}
          <div className="space-y-6">
            {/* Amount Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm font-medium">Amount</span>
              </div>
              <p className="text-3xl font-bold text-slate-900">
                {formatCurrency(invoice.total || invoice.amount, invoice.currency)}
              </p>
              {invoice.status === "paid" && invoice.paid_at && (
                <p className="text-sm text-emerald-600 mt-2">
                  Paid on {formatDate(invoice.paid_at)}
                </p>
              )}
            </div>

            {/* Client Info */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-medium text-slate-500 mb-4">Bill To</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-slate-500" />
                  </div>
                  <span className="font-medium text-slate-900">
                    {invoice.recipient_name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                    <Mail className="w-4 h-4 text-slate-500" />
                  </div>
                  <span className="text-slate-600">{invoice.recipient_email}</span>
                </div>
              </div>
            </div>

            {/* Due Date */}
            {invoice.due_date && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">Due Date</span>
                </div>
                <p className="text-lg font-medium text-slate-900">
                  {formatDate(invoice.due_date)}
                </p>
              </div>
            )}

            {/* Contract Link */}
            {invoice.contract_id && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-sm font-medium text-slate-500 mb-3">Linked Contract</h3>
                <Link
                  href={`/contracts/${invoice.contract_id}/edit`}
                  className="flex items-center gap-2 text-violet-600 hover:text-violet-700 font-medium"
                >
                  <FileText className="w-4 h-4" />
                  {invoice.contract_title || "View Contract"}
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            )}

            {/* Notes */}
            {invoice.notes && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-sm font-medium text-slate-500 mb-3">Notes</h3>
                <p className="text-slate-700 text-sm whitespace-pre-wrap">
                  {invoice.notes}
                </p>
              </div>
            )}
          </div>

          {/* PDF Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-medium text-slate-900">Invoice Preview</h3>
                <button
                  onClick={() => window.open(`/api/invoices/${invoiceId}?format=pdf`, "_blank")}
                  className="text-sm text-violet-600 hover:text-violet-700 flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in new tab
                </button>
              </div>
              <div className="bg-slate-100 p-4">
                {pdfUrl ? (
                  <iframe
                    src={pdfUrl}
                    className="w-full h-[800px] bg-white rounded-lg shadow-sm"
                    title="Invoice PDF Preview"
                  />
                ) : (
                  <div className="w-full h-[800px] bg-white rounded-lg shadow-sm flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-violet-600 mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">Loading preview...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

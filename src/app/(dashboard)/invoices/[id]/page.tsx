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
  ChevronDown,
  CreditCard,
  Banknote,
  Building2,
  MoreHorizontal,
  X,
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
  payment_method?: string | null;
  payment_reference?: string | null;
}

const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank Transfer", icon: Building2 },
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "check", label: "Check", icon: FileText },
  { value: "card", label: "Card (External)", icon: CreditCard },
  { value: "other", label: "Other", icon: MoreHorizontal },
];

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

  // Status change modal state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusModalType, setStatusModalType] = useState<"paid" | "void" | "cancelled" | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [statusNotes, setStatusNotes] = useState("");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

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
        const data = await response.json();
        throw new Error(data.error || "Failed to send invoice");
      }
      await fetchInvoice();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setActionLoading(null);
    }
  }

  function openStatusModal(type: "paid" | "void" | "cancelled") {
    setStatusModalType(type);
    setPaymentMethod("bank_transfer");
    setPaymentReference("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setStatusNotes("");
    setShowStatusModal(true);
    setShowStatusDropdown(false);
  }

  async function handleStatusChange() {
    if (!invoice || !statusModalType) return;

    setActionLoading(statusModalType);
    try {
      const body: Record<string, unknown> = {
        status: statusModalType,
        notes: statusNotes || undefined,
      };

      // Add payment details for "paid" status
      if (statusModalType === "paid") {
        body.payment_method = paymentMethod;
        body.payment_reference = paymentReference || undefined;
        body.payment_date = paymentDate;
      }

      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update invoice");
      }

      await fetchInvoice();
      setShowStatusModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#529ec6]" />
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
            className="text-[#529ec6] hover:underline inline-flex items-center gap-2"
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
                  className="flex items-center gap-2 px-4 py-2 bg-[#202e46] text-white rounded-lg font-medium hover:bg-[#1a2539] disabled:opacity-50 transition-colors"
                >
                  {actionLoading === "send" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send Invoice
                </button>
              )}

              {/* Mark as Paid button - available for sent, draft, overdue statuses */}
              {(invoice.status === "sent" || invoice.status === "draft" || invoice.status === "overdue") && (
                <button
                  onClick={() => openStatusModal("paid")}
                  disabled={actionLoading === "paid"}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {actionLoading === "paid" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Record Payment
                </button>
              )}

              <button
                onClick={() => window.open(`/api/invoices/${invoiceId}?format=pdf&download=true`, "_blank")}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>

              {/* Status dropdown for more options */}
              {invoice.status !== "paid" && invoice.status !== "void" && (
                <div className="relative">
                  <button
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className="flex items-center gap-1 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {showStatusDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowStatusDropdown(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-20 py-1">
                        <button
                          onClick={() => openStatusModal("cancelled")}
                          className="w-full flex items-center gap-2 px-4 py-2 text-left text-slate-700 hover:bg-slate-50"
                        >
                          <XCircle className="w-4 h-4 text-slate-400" />
                          Cancel Invoice
                        </button>
                        <button
                          onClick={() => openStatusModal("void")}
                          className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4" />
                          Void Invoice
                        </button>
                      </div>
                    </>
                  )}
                </div>
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
                  className="flex items-center gap-2 text-[#529ec6] hover:text-[#202e46] font-medium"
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
                  className="text-sm text-[#529ec6] hover:text-[#202e46] flex items-center gap-1"
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
                      <Loader2 className="w-8 h-8 animate-spin text-[#529ec6] mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">Loading preview...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Status Change Modal */}
      {showStatusModal && statusModalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowStatusModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {statusModalType === "paid" && "Record External Payment"}
                {statusModalType === "void" && "Void Invoice"}
                {statusModalType === "cancelled" && "Cancel Invoice"}
              </h3>
              <button
                onClick={() => setShowStatusModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              {statusModalType === "paid" && (
                <>
                  <p className="text-sm text-slate-600">
                    Record a payment received outside the platform (bank transfer, cash, check, etc.)
                  </p>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {PAYMENT_METHODS.map((method) => {
                        const MethodIcon = method.icon;
                        return (
                          <button
                            key={method.value}
                            type="button"
                            onClick={() => setPaymentMethod(method.value)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                              paymentMethod === method.value
                                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 hover:border-slate-300 text-slate-700"
                            }`}
                          >
                            <MethodIcon className="w-4 h-4" />
                            <span className="text-sm font-medium">{method.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payment Reference */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Reference Number <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="Check #, wire reference, transaction ID..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    />
                  </div>

                  {/* Payment Date */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    />
                  </div>
                </>
              )}

              {statusModalType === "void" && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    <strong>Warning:</strong> Voiding an invoice is permanent. The invoice will be marked as void and cannot be changed back.
                  </p>
                </div>
              )}

              {statusModalType === "cancelled" && (
                <p className="text-sm text-slate-600">
                  Cancel this invoice if it was created in error or is no longer needed.
                </p>
              )}

              {/* Notes (for all types) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Notes <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder={
                    statusModalType === "paid"
                      ? "Additional details about this payment..."
                      : "Reason for this change..."
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 text-slate-700 font-medium hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusChange}
                disabled={!!actionLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                  statusModalType === "paid"
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : statusModalType === "void"
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-slate-600 text-white hover:bg-slate-700"
                }`}
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : statusModalType === "paid" ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                {statusModalType === "paid" && "Record Payment"}
                {statusModalType === "void" && "Void Invoice"}
                {statusModalType === "cancelled" && "Cancel Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

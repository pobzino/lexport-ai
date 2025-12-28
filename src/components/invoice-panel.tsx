"use client";

import { useState, useEffect } from "react";
import {
  X,
  FileText,
  Download,
  Plus,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  DollarSign,
  Receipt,
  Send,
  Bell,
  Mail,
} from "lucide-react";

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: "draft" | "sent" | "paid" | "void";
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
  }>;
  due_date: string | null;
  paid_at: string | null;
  sent_at: string | null;
  created_at: string;
  recipient_name: string | null;
  recipient_email: string | null;
}

interface Payment {
  id: string;
  payment_type: "full" | "deposit" | "balance" | "installment";
  status: string;
  amount: number;
  created_at: string;
  hasInvoice?: boolean;
}

interface PaymentSchedule {
  depositAmount: number;
  balanceAmount: number;
  depositPaid: boolean;
  balancePaid: boolean;
}

interface InvoicePanelProps {
  contractId: string;
  onClose: () => void;
}

export function InvoicePanel({ contractId, onClose }: InvoicePanelProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [schedule, setSchedule] = useState<PaymentSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderSuccess, setReminderSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch invoices and payments
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch invoices
        const invoiceRes = await fetch(`/api/contracts/${contractId}/invoices`);
        let invoicesList: Invoice[] = [];
        if (invoiceRes.ok) {
          const data = await invoiceRes.json();
          invoicesList = data.invoices || [];
          setInvoices(invoicesList);
        }

        // Fetch payment status
        const paymentRes = await fetch(`/api/contracts/${contractId}/payment`);
        if (paymentRes.ok) {
          const data = await paymentRes.json();
          // Store payment schedule info
          if (data.schedule) {
            const paymentsList: Payment[] = [];
            if (data.schedule.depositPaid && data.schedule.depositPaymentId) {
              // Check if deposit has an invoice by looking for invoices linked to this payment
              const depositHasInvoice = invoicesList.some(
                (inv) => inv.line_items?.[0]?.description?.toLowerCase().includes("deposit")
              );
              paymentsList.push({
                id: data.schedule.depositPaymentId,
                payment_type: "deposit",
                status: "succeeded",
                amount: data.schedule.depositAmount,
                created_at: data.schedule.depositPaymentDate,
                hasInvoice: depositHasInvoice,
              });
            }
            if (data.schedule.balancePaid && data.schedule.balancePaymentId) {
              // Check if balance has an invoice
              const balanceHasInvoice = invoicesList.some(
                (inv) => inv.line_items?.[0]?.description?.toLowerCase().includes("balance")
              );
              paymentsList.push({
                id: data.schedule.balancePaymentId,
                payment_type: "balance",
                status: "succeeded",
                amount: data.schedule.balanceAmount,
                created_at: data.schedule.balancePaymentDate,
                hasInvoice: balanceHasInvoice,
              });
            }
            setPayments(paymentsList);

            // Store schedule for reminder button logic
            setSchedule({
              depositAmount: data.schedule.depositAmount,
              balanceAmount: data.schedule.balanceAmount,
              depositPaid: data.schedule.depositPaid,
              balancePaid: data.schedule.balancePaid,
            });
          }
        }
      } catch (err) {
        setError("Failed to load invoices");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [contractId]);

  // Send balance reminder
  const sendBalanceReminder = async (reminderType: "first" | "second" | "final" = "first") => {
    setSendingReminder(true);
    setError(null);
    setReminderSuccess(null);

    try {
      const response = await fetch(`/api/contracts/${contractId}/balance-reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminderType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send reminder");
      }

      setReminderSuccess(`Reminder sent to ${data.reminder.sentTo}`);

      // Clear success message after 5 seconds
      setTimeout(() => setReminderSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reminder");
    } finally {
      setSendingReminder(false);
    }
  };

  // Create invoice for a payment
  const createInvoice = async (paymentId?: string) => {
    setCreating(true);
    setError(null);

    try {
      const response = await fetch(`/api/contracts/${contractId}/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create invoice");
      }

      const data = await response.json();
      setInvoices((prev) => [data.invoice, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice");
    } finally {
      setCreating(false);
    }
  };

  // Download invoice PDF
  const downloadInvoice = async (invoiceId: string, invoiceNumber: string) => {
    setDownloading(invoiceId);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}?format=pdf`);
      if (!response.ok) throw new Error("Failed to download");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to download invoice");
    } finally {
      setDownloading(null);
    }
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  // Format date
  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            Paid
          </span>
        );
      case "sent":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Send className="w-3 h-3" />
            Sent
          </span>
        );
      case "void":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            <X className="w-3 h-3" />
            Void
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3" />
            Draft
          </span>
        );
    }
  };

  return (
    <aside className="w-96 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-slate-900">Invoices</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
          </div>
        ) : (
          <>
            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Success Message */}
            {reminderSuccess && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm">
                <Mail className="w-4 h-4 flex-shrink-0" />
                {reminderSuccess}
              </div>
            )}

            {/* Payment Summary */}
            {payments.length > 0 && (
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-slate-700 mb-3">Payment History</h4>
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <div>
                          <span className="capitalize font-medium">{payment.payment_type}</span>
                          <span className="text-slate-500 ml-2">{formatDate(payment.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatCurrency(payment.amount, "usd")}</span>
                        {payment.hasInvoice ? (
                          <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                            Invoiced
                          </span>
                        ) : (
                          <button
                            onClick={() => createInvoice(payment.id)}
                            disabled={creating}
                            className="text-xs text-violet-600 hover:text-violet-700 font-medium"
                          >
                            {creating ? "..." : "+ Invoice"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Balance Due - Send Reminder */}
            {schedule && schedule.depositPaid && !schedule.balancePaid && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-amber-900">Balance Due</h4>
                    <p className="text-lg font-bold text-amber-700 mt-1">
                      {formatCurrency(schedule.balanceAmount, "usd")}
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      Deposit of {formatCurrency(schedule.depositAmount, "usd")} received
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => sendBalanceReminder("first")}
                    disabled={sendingReminder}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
                  >
                    {sendingReminder ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
                    {sendingReminder ? "Sending..." : "Send Reminder"}
                  </button>
                  <div className="relative group">
                    <button
                      disabled={sendingReminder}
                      className="px-3 py-2 text-amber-700 text-sm font-medium rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors"
                    >
                      <span className="sr-only">More options</span>
                      ▾
                    </button>
                    <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      <button
                        onClick={() => sendBalanceReminder("second")}
                        disabled={sendingReminder}
                        className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 first:rounded-t-lg"
                      >
                        Second Reminder
                      </button>
                      <button
                        onClick={() => sendBalanceReminder("final")}
                        disabled={sendingReminder}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 last:rounded-b-lg"
                      >
                        Final Reminder
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Create Invoice Button */}
            <button
              onClick={() => createInvoice()}
              disabled={creating}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {creating ? "Creating..." : "Create Invoice"}
            </button>

            {/* Invoices List */}
            {invoices.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-600 font-medium">No invoices yet</p>
                <p className="text-sm text-slate-500 mt-1">
                  Create an invoice to send to your client
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    {/* Invoice Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-slate-900">
                          {invoice.invoice_number}
                        </p>
                        <p className="text-sm text-slate-500">
                          {formatDate(invoice.created_at)}
                        </p>
                      </div>
                      {getStatusBadge(invoice.status)}
                    </div>

                    {/* Amount */}
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="w-4 h-4 text-slate-400" />
                      <span className="text-lg font-semibold text-slate-900">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </span>
                    </div>

                    {/* Recipient */}
                    {invoice.recipient_name && (
                      <p className="text-sm text-slate-600 mb-3">
                        To: {invoice.recipient_name}
                        {invoice.recipient_email && ` (${invoice.recipient_email})`}
                      </p>
                    )}

                    {/* Due Date */}
                    {invoice.due_date && invoice.status !== "paid" && (
                      <p className="text-sm text-slate-500 mb-3">
                        Due: {formatDate(invoice.due_date)}
                      </p>
                    )}

                    {/* Paid Date */}
                    {invoice.paid_at && (
                      <p className="text-sm text-emerald-600 mb-3">
                        Paid on {formatDate(invoice.paid_at)}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadInvoice(invoice.id, invoice.invoice_number)}
                        disabled={downloading === invoice.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors"
                      >
                        {downloading === invoice.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        Download PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

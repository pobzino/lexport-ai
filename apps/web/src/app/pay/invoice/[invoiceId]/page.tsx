"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  Loader2,
  Check,
  AlertCircle,
  Shield,
  Lock,
  Calendar,
  FileText,
  Building2,
  User,
  Download,
  Clock,
} from "lucide-react";
import Image from "next/image";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface PaymentInfo {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  invoiceNumber: string;
  recipientName: string;
  recipientEmail: string;
  recipientAddress: string | null;
  senderName: string | null;
  senderEmail: string | null;
  senderAddress: { address: string } | null;
  lineItems: LineItem[] | null;
  subtotal: number;
  taxAmount: number;
  total: number;
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function CheckoutForm({ paymentInfo, invoiceId }: { paymentInfo: PaymentInfo; invoiceId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const [isAchProcessing, setIsAchProcessing] = useState(false);

  // Determine payment method order based on currency - bank payments first
  const getPaymentMethodOrder = () => {
    const currency = paymentInfo.currency.toLowerCase();
    if (currency === "usd") {
      return ["us_bank_account", "card", "link"];
    } else if (currency === "gbp") {
      return ["bacs_debit", "card", "link"];
    } else if (currency === "eur") {
      return ["sepa_debit", "card", "link"];
    }
    return ["card", "link"]; // Default for other currencies
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || "Payment failed");
      setProcessing(false);
      return;
    }

    const returnUrl = `${window.location.origin}/pay/invoice/${invoiceId}/success`;

    const { error: paymentError, paymentIntent } =
      await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
        },
        redirect: "if_required",
      });

    if (paymentError) {
      setError(paymentError.message || "Payment failed");
      setProcessing(false);
    } else if (paymentIntent?.status === "succeeded") {
      setSucceeded(true);
    } else if (paymentIntent?.status === "processing") {
      // ACH payments take 3-4 business days to process
      setSucceeded(true);
      setIsAchProcessing(true);
    } else {
      setProcessing(false);
    }
  };

  if (succeeded) {
    // ACH bank payments are processing (takes 3-4 business days)
    if (isAchProcessing) {
      return (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Bank Payment Processing
          </h2>
          <p className="text-slate-600 mb-4">
            Your bank payment for invoice {paymentInfo.invoiceNumber} has been initiated. ACH bank transfers typically take <strong>3-4 business days</strong> to complete.
          </p>
          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-sm text-blue-800">
              You&apos;ll receive an email at {paymentInfo.recipientEmail} once the payment clears.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Payment Successful!
        </h2>
        <p className="text-slate-600 mb-4">
          Thank you for your payment. A confirmation email will be sent to{" "}
          {paymentInfo.recipientEmail}.
        </p>
        <div className="mt-6 p-4 bg-slate-50 rounded-xl">
          <p className="text-sm text-slate-600">
            Invoice {paymentInfo.invoiceNumber} has been paid.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: "tabs",
          paymentMethodOrder: getPaymentMethodOrder(),
          fields: {
            billingDetails: {
              name: "auto",
              email: "auto",
            },
          },
        }}
      />

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#202e46] text-white font-medium rounded-lg hover:bg-[#1a2539] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {processing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            Pay {formatCurrency(paymentInfo.amount, paymentInfo.currency)}
          </>
        )}
      </button>

      <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
        <Shield className="w-3 h-3" />
        <span>Secured by Stripe</span>
      </div>
    </form>
  );
}

export default function InvoicePaymentPage() {
  const params = useParams();
  const invoiceId = params.invoiceId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);

  useEffect(() => {
    async function initializePayment() {
      try {
        const response = await fetch(`/api/invoices/${invoiceId}/pay`, {
          method: "POST",
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to initialize payment");
        }

        const data = await response.json();
        setPaymentInfo(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load payment");
      } finally {
        setLoading(false);
      }
    }

    initializePayment();
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#529ec6] mx-auto mb-4" />
          <p className="text-slate-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Payment Error
          </h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!paymentInfo) {
    return null;
  }

  const lineItems = paymentInfo.lineItems || [];

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Image
              src="/dark-logo.png"
              alt="Lexport"
              width={120}
              height={32}
              className="h-8 w-auto"
            />
            <a
              href={`/api/invoices/${invoiceId}?format=pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Invoice Preview - Left Side */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Invoice Header */}
              <div className="px-8 py-6 border-b border-slate-100">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">INVOICE</h1>
                    <p className="text-slate-500 mt-1">{paymentInfo.invoiceNumber}</p>
                  </div>
                  <div className="text-right text-sm text-slate-500">
                    <p>Date: {formatDate(paymentInfo.createdAt)}</p>
                    <p className="mt-1">Due: {formatDate(paymentInfo.dueDate)}</p>
                  </div>
                </div>
              </div>

              {/* From / Bill To */}
              <div className="px-8 py-6 grid md:grid-cols-2 gap-8 border-b border-slate-100 bg-slate-50">
                {/* From */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">From</span>
                  </div>
                  <p className="font-semibold text-slate-900">{paymentInfo.senderName || "—"}</p>
                  {paymentInfo.senderEmail && (
                    <p className="text-sm text-slate-600 mt-1">{paymentInfo.senderEmail}</p>
                  )}
                  {paymentInfo.senderAddress?.address && (
                    <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">
                      {paymentInfo.senderAddress.address}
                    </p>
                  )}
                </div>

                {/* Bill To */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Bill To</span>
                  </div>
                  <p className="font-semibold text-slate-900">{paymentInfo.recipientName}</p>
                  <p className="text-sm text-slate-600 mt-1">{paymentInfo.recipientEmail}</p>
                  {paymentInfo.recipientAddress && (
                    <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">
                      {paymentInfo.recipientAddress}
                    </p>
                  )}
                </div>
              </div>

              {/* Line Items Table */}
              <div className="px-8 py-6">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Description
                      </th>
                      <th className="text-center py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">
                        Qty
                      </th>
                      <th className="text-right py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">
                        Unit Price
                      </th>
                      <th className="text-right py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.length > 0 ? (
                      lineItems.map((item, index) => (
                        <tr key={index} className="border-b border-slate-100">
                          <td className="py-4 text-slate-900">{item.description}</td>
                          <td className="py-4 text-center text-slate-600">{item.quantity}</td>
                          <td className="py-4 text-right text-slate-600">
                            {formatCurrency(item.unit_price, paymentInfo.currency)}
                          </td>
                          <td className="py-4 text-right font-medium text-slate-900">
                            {formatCurrency(item.amount, paymentInfo.currency)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-b border-slate-100">
                        <td className="py-4 text-slate-900">Invoice Payment</td>
                        <td className="py-4 text-center text-slate-600">1</td>
                        <td className="py-4 text-right text-slate-600">
                          {formatCurrency(paymentInfo.amount, paymentInfo.currency)}
                        </td>
                        <td className="py-4 text-right font-medium text-slate-900">
                          {formatCurrency(paymentInfo.amount, paymentInfo.currency)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="mt-6 border-t border-slate-200 pt-4">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      {paymentInfo.subtotal > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Subtotal</span>
                          <span className="text-slate-900">
                            {formatCurrency(paymentInfo.subtotal, paymentInfo.currency)}
                          </span>
                        </div>
                      )}
                      {paymentInfo.taxAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Tax</span>
                          <span className="text-slate-900">
                            {formatCurrency(paymentInfo.taxAmount, paymentInfo.currency)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-200">
                        <span className="text-slate-900">Total Due</span>
                        <span className="text-[#529ec6]">
                          {formatCurrency(paymentInfo.total, paymentInfo.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {paymentInfo.notes && (
                <div className="px-8 py-4 border-t border-slate-100 bg-amber-50">
                  <p className="text-sm text-amber-800">
                    <strong>Notes:</strong> {paymentInfo.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Form - Right Side */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-8">
              {/* Payment Header */}
              <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-[#529ec6]/5 to-[#529ec6]/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#529ec6]/10 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-[#529ec6]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Pay Invoice
                    </h2>
                    <p className="text-sm text-slate-500">
                      {paymentInfo.invoiceNumber}
                    </p>
                  </div>
                </div>
              </div>

              {/* Amount Summary */}
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Amount Due</span>
                  <span className="text-2xl font-bold text-slate-900">
                    {formatCurrency(paymentInfo.amount, paymentInfo.currency)}
                  </span>
                </div>
                {paymentInfo.dueDate && (
                  <div className="flex items-center justify-between mt-2 text-sm">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="w-4 h-4" />
                      Due Date
                    </span>
                    <span className="text-slate-700">
                      {formatDate(paymentInfo.dueDate)}
                    </span>
                  </div>
                )}
              </div>

              {/* Stripe Elements */}
              <div className="px-6 py-6">
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret: paymentInfo.clientSecret,
                    appearance: {
                      theme: "stripe",
                      variables: {
                        colorPrimary: "#7c3aed",
                        borderRadius: "8px",
                      },
                    },
                  }}
                >
                  <CheckoutForm paymentInfo={paymentInfo} invoiceId={invoiceId} />
                </Elements>
              </div>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400">
            Your payment information is encrypted and secure. We never store
            your card details.
          </p>
        </div>
      </main>
    </div>
  );
}

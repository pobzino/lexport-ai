"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
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
  CreditCard,
  ArrowLeft,
  Shield,
  Lock,
  FileText,
  Calendar,
  Clock,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// Initialize Stripe - make sure to set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in .env
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

interface PaymentInfo {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  contractTitle?: string;
  paymentType?: "full" | "deposit" | "balance";
  totalAmount?: number;
  depositPaid?: boolean;
  balanceRemaining?: number;
}

interface InvoiceInfo {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  due_date: string;
  line_items: { description: string; quantity: number; amount: number }[];
  sender_name?: string;
  sender_email?: string;
  recipient_name?: string;
  recipient_email?: string;
}

function CheckoutForm({
  paymentInfo,
  returnUrl,
  alreadySigned,
}: {
  paymentInfo: PaymentInfo;
  returnUrl: string;
  alreadySigned: boolean;
}) {
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
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const [isAchProcessing, setIsAchProcessing] = useState(false);

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
      // Only redirect if not already signed and not a deposit payment
      // For deposit payments after signing, stay on success message
      if (!alreadySigned && paymentInfo.paymentType !== "deposit") {
        setTimeout(() => {
          window.location.href = returnUrl;
        }, 2000);
      }
    } else if (paymentIntent?.status === "processing") {
      // ACH payments take 4 business days to process
      setSucceeded(true); // Show success state - payment is in progress
      setIsAchProcessing(true);
    } else {
      setProcessing(false);
    }
  };

  if (succeeded) {
    const isDeposit = paymentInfo.paymentType === "deposit";
    const isBalance = paymentInfo.paymentType === "balance";

    // ACH bank payments are processing (takes 4 business days)
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
            Your bank payment has been initiated and is being processed. ACH bank transfers typically take <strong>3-4 business days</strong> to complete.
          </p>
          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-sm text-blue-800">
              You&apos;ll receive an email confirmation once the payment clears. You can close this page.
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
          {isDeposit ? "Deposit Paid!" : isBalance ? "Balance Paid!" : "Payment Successful!"}
        </h2>
        <p className="text-slate-600 mb-4">
          {isDeposit && alreadySigned ? (
            <>Your contract has been signed and your deposit has been received. The remaining balance will be collected when due.</>
          ) : isBalance ? (
            <>All payments are now complete. Thank you!</>
          ) : alreadySigned ? (
            <>Your payment has been received. Thank you!</>
          ) : (
            <>Redirecting you back to sign the contract...</>
          )}
        </p>
        {!alreadySigned && !isDeposit && (
          <Loader2 className="w-5 h-5 animate-spin text-[#529ec6] mx-auto" />
        )}
        {(alreadySigned || isDeposit) && (
          <div className="mt-6 p-4 bg-slate-50 rounded-xl">
            <p className="text-sm text-slate-600">
              You can close this page. A confirmation email will be sent to you shortly.
            </p>
          </div>
        )}
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
            Pay{" "}
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: paymentInfo.currency,
            }).format(paymentInfo.amount / 100)}
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

export default function PaymentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const contractId = params.contractId as string;
  const returnToken = searchParams.get("token");
  const alreadySigned = searchParams.get("signed") === "true";
  const invoiceId = searchParams.get("invoice");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [invoiceInfo, setInvoiceInfo] = useState<InvoiceInfo | null>(null);
  const [contractTitle, setContractTitle] = useState<string>("");

  useEffect(() => {
    async function initializePayment() {
      try {
        // Fetch invoice if ID is provided
        if (invoiceId) {
          const invoiceResponse = await fetch(`/api/invoices/${invoiceId}`);
          if (invoiceResponse.ok) {
            const invoiceData = await invoiceResponse.json();
            setInvoiceInfo(invoiceData.invoice);
          }
        }

        // Create or retrieve payment intent
        const response = await fetch(`/api/contracts/${contractId}/payment`, {
          method: "POST",
        });

        if (!response.ok) {
          const data = await response.json();
          if (data.error === "Payment has already been completed") {
            // Redirect back to signing page
            if (returnToken) {
              router.push(`/sign/${returnToken}`);
              return;
            }
          }
          throw new Error(data.error || "Failed to initialize payment");
        }

        const data = await response.json();
        setPaymentInfo({
          clientSecret: data.clientSecret,
          paymentIntentId: data.paymentIntentId,
          amount: data.amount,
          currency: data.currency,
          paymentType: data.paymentType,
          totalAmount: data.totalAmount,
          depositPaid: data.depositPaid,
          balanceRemaining: data.balanceRemaining,
        });
        if (data.contractTitle) {
          setContractTitle(data.contractTitle);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load payment");
      } finally {
        setLoading(false);
      }
    }

    initializePayment();
  }, [contractId, returnToken, router, invoiceId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#529ec6] mx-auto mb-4" />
          <p className="text-slate-600">Initializing payment...</p>
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
          <p className="text-slate-600 mb-6">{error}</p>
          {returnToken && (
            <Link
              href={`/sign/${returnToken}`}
              className="inline-flex items-center gap-2 text-[#529ec6] hover:text-[#202e46]"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to contract
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (!paymentInfo) {
    return null;
  }

  const returnUrl = returnToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/sign/${returnToken}`
    : `${typeof window !== "undefined" ? window.location.origin : ""}/`;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/dark-logo.png"
                alt="Lexport"
                width={120}
                height={32}
                className="h-8 w-auto"
              />
            </Link>
            {returnToken && (
              <Link
                href={`/sign/${returnToken}`}
                className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        {/* Invoice Summary (if invoice is available) */}
        {invoiceInfo && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-4">
            <div className="px-6 py-4 border-b border-slate-100 bg-[#202e46]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/10">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Invoice {invoiceInfo.invoice_number}
                  </h2>
                  <p className="text-sm text-white/70">
                    {invoiceInfo.sender_name ? `From ${invoiceInfo.sender_name}` : "Payment due"}
                  </p>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="px-6 py-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 font-medium text-slate-600">Description</th>
                    <th className="text-center py-2 font-medium text-slate-600 w-16">Qty</th>
                    <th className="text-right py-2 font-medium text-slate-600 w-24">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceInfo.line_items.map((item, index) => (
                    <tr key={index} className="border-b border-slate-50">
                      <td className="py-3 text-slate-700">{item.description}</td>
                      <td className="py-3 text-center text-slate-600">{item.quantity}</td>
                      <td className="py-3 text-right font-medium text-slate-900">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: invoiceInfo.currency,
                        }).format(item.amount / 100)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} className="py-3 text-right font-semibold text-slate-700">Total Due</td>
                    <td className="py-3 text-right text-lg font-bold text-[#202e46]">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: invoiceInfo.currency,
                      }).format(invoiceInfo.amount / 100)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Due Date */}
            <div className="px-6 py-3 bg-amber-50 border-t border-amber-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-800">
                Due by {new Date(invoiceInfo.due_date).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Payment Header */}
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${alreadySigned ? "bg-emerald-100" : "bg-[#529ec6]/10"}`}>
                {alreadySigned ? (
                  <Check className="w-5 h-5 text-emerald-600" />
                ) : (
                  <CreditCard className="w-5 h-5 text-[#529ec6]" />
                )}
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">
                  {alreadySigned ? "Contract Signed!" : "Complete Payment"}
                </h1>
                <p className="text-sm text-slate-500">
                  {alreadySigned
                    ? "Complete your payment to finalize the contract"
                    : "Payment to complete your contract"}
                </p>
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="px-6 py-4 border-b border-slate-100">
            {/* Payment type badge */}
            {paymentInfo.paymentType && paymentInfo.paymentType !== "full" && (
              <div className="mb-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  paymentInfo.paymentType === "deposit"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}>
                  {paymentInfo.paymentType === "deposit" ? "Deposit Payment" : "Balance Payment"}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-slate-600">
                {paymentInfo.paymentType === "deposit"
                  ? "Deposit Amount"
                  : paymentInfo.paymentType === "balance"
                  ? "Balance Due"
                  : "Amount Due"}
              </span>
              <span className="text-2xl font-bold text-slate-900">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: paymentInfo.currency,
                }).format(paymentInfo.amount / 100)}
              </span>
            </div>

            {/* Show total and remaining for split payments */}
            {paymentInfo.paymentType === "deposit" && paymentInfo.totalAmount && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Total Contract Value</span>
                  <span className="text-slate-700">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: paymentInfo.currency,
                    }).format(paymentInfo.totalAmount / 100)}
                  </span>
                </div>
                {paymentInfo.balanceRemaining && paymentInfo.balanceRemaining > 0 && (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-slate-500">Balance Due Later</span>
                    <span className="text-slate-700">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: paymentInfo.currency,
                      }).format(paymentInfo.balanceRemaining / 100)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {paymentInfo.depositPaid && paymentInfo.paymentType === "balance" && (
              <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600">
                <Check className="w-4 h-4" />
                <span>Deposit already paid</span>
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
              <CheckoutForm paymentInfo={paymentInfo} returnUrl={returnUrl} alreadySigned={alreadySigned} />
            </Elements>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400">
            Your payment information is encrypted and secure. We never store
            your card details.
          </p>
        </div>
      </main>
    </div>
  );
}

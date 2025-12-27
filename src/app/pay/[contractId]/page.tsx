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
} from "lucide-react";
import Link from "next/link";

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
}

function CheckoutForm({
  paymentInfo,
  returnUrl,
}: {
  paymentInfo: PaymentInfo;
  returnUrl: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

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
      // Redirect back to signing page after short delay
      setTimeout(() => {
        window.location.href = returnUrl;
      }, 2000);
    } else {
      setProcessing(false);
    }
  };

  if (succeeded) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Payment Successful!
        </h2>
        <p className="text-slate-600 mb-4">
          Redirecting you back to sign the contract...
        </p>
        <Loader2 className="w-5 h-5 animate-spin text-violet-600 mx-auto" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: "tabs",
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
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [contractTitle, setContractTitle] = useState<string>("");

  useEffect(() => {
    async function initializePayment() {
      try {
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
        });

        // Fetch contract title
        const contractResponse = await fetch(
          `/api/contracts/${contractId}/payment`
        );
        if (contractResponse.ok) {
          const contractData = await contractResponse.json();
          // Contract title would come from a different endpoint in production
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load payment");
      } finally {
        setLoading(false);
      }
    }

    initializePayment();
  }, [contractId, returnToken, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600 mx-auto mb-4" />
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
              className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-700"
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
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                Lx
              </div>
              <span className="text-xl font-bold text-slate-900">Lexport</span>
            </div>
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
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Payment Header */}
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">
                  Complete Payment
                </h1>
                <p className="text-sm text-slate-500">
                  Payment required before signing
                </p>
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Amount Due</span>
              <span className="text-2xl font-bold text-slate-900">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: paymentInfo.currency,
                }).format(paymentInfo.amount / 100)}
              </span>
            </div>
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
              <CheckoutForm paymentInfo={paymentInfo} returnUrl={returnUrl} />
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

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, Check, Clock, Loader2 } from "lucide-react";

type CheckoutState = "loading" | "paid" | "processing" | "failed";

export default function InvoicePaymentSuccessPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [state, setState] = useState<CheckoutState>("loading");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function checkPayment() {
      try {
        const response = await fetch(`/api/invoices/${invoiceId}/pay`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Unable to confirm payment");

        const data = await response.json();
        if (cancelled) return;
        setInvoiceNumber(data.invoice?.invoice_number || "");

        if (data.paymentStatus === "succeeded") {
          setState("paid");
        } else if (
          data.paymentStatus === "processing" ||
          data.paymentStatus === "requires_capture"
        ) {
          setState("processing");
        } else {
          setState("failed");
        }
      } catch {
        if (!cancelled) setState("failed");
      }
    }

    checkPayment();
    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  const config = {
    loading: {
      icon: <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />,
      title: "Confirming payment",
      message: "Please wait while we confirm the payment with Stripe.",
      tone: "bg-sky-100",
    },
    paid: {
      icon: <Check className="w-8 h-8 text-emerald-600" />,
      title: "Payment received",
      message: "The invoice has been paid successfully. A receipt will be sent by email.",
      tone: "bg-emerald-100",
    },
    processing: {
      icon: <Clock className="w-8 h-8 text-blue-600" />,
      title: "Payment processing",
      message: "Your bank payment was submitted and may take several business days to clear.",
      tone: "bg-blue-100",
    },
    failed: {
      icon: <AlertCircle className="w-8 h-8 text-amber-600" />,
      title: "Payment not confirmed",
      message: "Return to the invoice to check the payment status or try again.",
      tone: "bg-amber-100",
    },
  }[state];

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <section className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
        <div className={`w-16 h-16 ${config.tone} rounded-full flex items-center justify-center mx-auto mb-5`}>
          {config.icon}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{config.title}</h1>
        {invoiceNumber && (
          <p className="text-sm font-medium text-slate-500 mt-2">Invoice {invoiceNumber}</p>
        )}
        <p className="text-slate-600 mt-4">{config.message}</p>
        {state !== "loading" && (
          <a
            href={`/pay/invoice/${invoiceId}`}
            className="inline-flex mt-6 px-5 py-2.5 rounded-lg bg-[#202e46] text-white font-medium hover:bg-[#1a2539]"
          >
            View invoice
          </a>
        )}
      </section>
    </main>
  );
}

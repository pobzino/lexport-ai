import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import type { Invoice } from "@/db/types";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  calculatePlatformFee,
  getPaymentMethodConfiguration,
  getPlatformFeePercent,
  getStripe,
  type SubscriptionTier,
} from "@/lib/stripe";
import { readInvoiceSenderSnapshot } from "@/lib/invoices/bank-details";

type InvoiceRecord = Invoice & { stripe_payment_intent_id: string | null };

async function linkInvoicePayment(
  supabase: ReturnType<typeof createAdminClient>,
  invoice: InvoiceRecord,
  paymentIntent: Stripe.PaymentIntent
) {
  if (!invoice.payment_id || !invoice.contract_id) return;

  const paymentStatus = paymentIntent.status === "succeeded"
    ? "succeeded"
    : paymentIntent.status === "processing"
      ? "processing"
      : "pending";
  const { error } = await supabase
    .from("payments")
    .update({
      stripe_payment_intent_id: paymentIntent.id,
      status: paymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoice.payment_id)
    .eq("contract_id", invoice.contract_id);

  if (error) {
    console.error(
      `Failed to link invoice ${invoice.id} to payment ${invoice.payment_id}:`,
      error
    );
  }
}

function getInvoiceAmount(invoice: InvoiceRecord): number {
  return invoice.total ?? invoice.amount;
}

function buildPaymentResponse(
  invoice: InvoiceRecord,
  paymentIntent?: Stripe.PaymentIntent | null
) {
  const senderSnapshot = readInvoiceSenderSnapshot(invoice);
  const amount = getInvoiceAmount(invoice);

  return {
    clientSecret: paymentIntent?.client_secret || null,
    paymentIntentId: paymentIntent?.id || invoice.stripe_payment_intent_id || null,
    paymentStatus:
      paymentIntent?.status || (invoice.status === "paid" ? "succeeded" : "unpaid"),
    amount,
    currency: (invoice.currency || "usd").toLowerCase(),
    invoiceNumber: invoice.invoice_number,
    recipientName: invoice.recipient_name,
    recipientEmail: invoice.recipient_email,
    recipientAddress: invoice.recipient_address,
    senderName: invoice.sender_name,
    senderCompany: senderSnapshot.company,
    senderEmail: invoice.sender_email,
    senderAddress: invoice.sender_address,
    bankDetails: senderSnapshot.bankDetails,
    lineItems: invoice.line_items,
    subtotal: invoice.subtotal,
    taxAmount: invoice.tax_amount,
    total: amount,
    dueDate: invoice.due_date,
    notes: invoice.notes,
    createdAt: invoice.created_at,
  };
}

function isReusablePaymentIntent(
  paymentIntent: Stripe.PaymentIntent,
  amount: number,
  currency: string,
  connectedAccountId: string
): boolean {
  return (
    paymentIntent.status !== "canceled" &&
    paymentIntent.amount === amount &&
    paymentIntent.currency === currency &&
    paymentIntent.metadata.connected_account_id === connectedAccountId
  );
}

// Public invoice checkout. The invoice UUID is the bearer identifier and draft,
// void, and cancelled invoices are never payable.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status === "paid") {
      return NextResponse.json(buildPaymentResponse(invoice));
    }

    if (invoice.status === "void" || invoice.status === "cancelled") {
      return NextResponse.json(
        { error: "Invoice has been cancelled" },
        { status: 400 }
      );
    }

    if (invoice.status === "draft") {
      return NextResponse.json(
        { error: "Invoice has not been sent yet" },
        { status: 400 }
      );
    }

    const amount = getInvoiceAmount(invoice);
    const currency = (invoice.currency || "usd").toLowerCase();
    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Invoice has an invalid payment amount" },
        { status: 400 }
      );
    }

    const { data: invoiceOwner, error: invoiceOwnerError } = await supabase
      .from("users")
      .select("stripe_connect_account_id, stripe_connect_status, subscription_tier")
      .eq("id", invoice.user_id)
      .single();
    const connectedAccountId =
      !invoiceOwnerError &&
      invoiceOwner?.stripe_connect_status === "active" &&
      invoiceOwner.stripe_connect_account_id
        ? invoiceOwner.stripe_connect_account_id
        : null;

    // Keep the public invoice view and offline bank details available, but do
    // not create a platform-held card/bank charge before the sender has a payout
    // destination. The page already treats a null clientSecret as unavailable.
    if (!connectedAccountId) {
      return NextResponse.json({
        ...buildPaymentResponse(invoice),
        code: "CONNECT_ACCOUNT_REQUIRED",
        paymentUnavailableReason:
          "The invoice sender must finish Stripe payout setup before accepting online payment.",
      });
    }

    let stripe: ReturnType<typeof getStripe>;
    try {
      stripe = getStripe();
    } catch (paymentError) {
      console.error("Stripe is unavailable for invoice payment:", paymentError);
      return NextResponse.json({
        ...buildPaymentResponse(invoice),
        code: "ONLINE_PAYMENT_UNAVAILABLE",
        paymentUnavailableReason:
          "Online payment is temporarily unavailable. Contact the sender for payment instructions.",
      });
    }

    if (invoice.stripe_payment_intent_id) {
      try {
        const existingIntent = await stripe.paymentIntents.retrieve(
          invoice.stripe_payment_intent_id
        );

        if (
          existingIntent.status === "succeeded" ||
          existingIntent.status === "processing" ||
          existingIntent.status === "requires_capture"
        ) {
          await linkInvoicePayment(supabase, invoice as InvoiceRecord, existingIntent);
          return NextResponse.json(buildPaymentResponse(invoice, existingIntent));
        }

        if (
          connectedAccountId &&
          isReusablePaymentIntent(
            existingIntent,
            amount,
            currency,
            connectedAccountId
          )
        ) {
          await linkInvoicePayment(supabase, invoice as InvoiceRecord, existingIntent);
          return NextResponse.json(buildPaymentResponse(invoice, existingIntent));
        }

        if (
          existingIntent.status === "requires_payment_method" ||
          existingIntent.status === "requires_confirmation" ||
          existingIntent.status === "requires_action"
        ) {
          await stripe.paymentIntents.cancel(existingIntent.id);
        }
      } catch (error) {
        console.warn(
          `Could not reuse invoice PaymentIntent ${invoice.stripe_payment_intent_id}:`,
          error
        );
      }
    }

    const subscriptionTier: SubscriptionTier =
      (invoiceOwner?.subscription_tier as SubscriptionTier) || "free";
    const paymentMethodConfiguration = getPaymentMethodConfiguration();

    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount,
      currency,
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        type: "standalone_invoice",
        ...(invoice.contract_id ? { contract_id: invoice.contract_id } : {}),
        ...(invoice.payment_id ? { payment_id: invoice.payment_id } : {}),
      },
      description: `Invoice ${invoice.invoice_number}`,
      receipt_email: invoice.recipient_email || undefined,
      ...paymentMethodConfiguration,
    };

    const platformFee = calculatePlatformFee(amount, subscriptionTier);
    if (platformFee > 0) {
      paymentIntentParams.application_fee_amount = platformFee;
    }
    paymentIntentParams.transfer_data = { destination: connectedAccountId };
    paymentIntentParams.on_behalf_of = connectedAccountId;
    paymentIntentParams.metadata = {
      ...paymentIntentParams.metadata,
      connected_account_id: connectedAccountId,
      platform_fee: platformFee.toString(),
      platform_fee_percent: getPlatformFeePercent(subscriptionTier).toString(),
      subscription_tier: subscriptionTier,
    };

    const idempotencyVersion = invoice.updated_at || invoice.created_at;
    // Bump the request-shape version whenever PaymentIntent parameters change.
    // Stripe requires an idempotency key to be reused with identical params,
    // including for invoices whose earlier initialization attempt failed.
    const idempotencyKey =
      `invoice:v2:${invoice.id}:${amount}:${currency}:${idempotencyVersion}`;
    let paymentIntent: Stripe.PaymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create(
        paymentIntentParams,
        { idempotencyKey }
      );
    } catch (paymentError) {
      // A stale/restricted Connect account or a temporary Stripe failure must
      // not hide the invoice or its bank-transfer details from the customer.
      // Fail closed for online collection and leave the invoice payable offline.
      console.error(
        `Could not initialize online payment for invoice ${invoice.id}:`,
        paymentError
      );
      return NextResponse.json({
        ...buildPaymentResponse(invoice),
        code: "ONLINE_PAYMENT_UNAVAILABLE",
        paymentUnavailableReason:
          "Online payment is temporarily unavailable. Contact the sender for payment instructions.",
      });
    }
    const updatedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        updated_at: updatedAt,
      })
      .eq("id", id);

    if (updateError) {
      throw new Error(`Failed to store invoice PaymentIntent: ${updateError.message}`);
    }

    await linkInvoicePayment(supabase, invoice as InvoiceRecord, paymentIntent);

    return NextResponse.json(
      buildPaymentResponse(
        { ...invoice, stripe_payment_intent_id: paymentIntent.id },
        paymentIntent
      )
    );
  } catch (error) {
    console.error("Error creating invoice payment:", error);
    return NextResponse.json(
      { error: "Failed to initialize invoice payment" },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, status, total, amount, currency, recipient_name, due_date, stripe_payment_intent_id")
      .eq("id", id)
      .single();

    if (error || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status === "draft") {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status === "void" || invoice.status === "cancelled") {
      return NextResponse.json(
        { error: "Invoice has been cancelled" },
        { status: 400 }
      );
    }

    let paymentStatus = invoice.status === "paid" ? "succeeded" : "unpaid";
    if (invoice.stripe_payment_intent_id && invoice.status !== "paid") {
      try {
        const paymentIntent = await getStripe().paymentIntents.retrieve(
          invoice.stripe_payment_intent_id
        );
        paymentStatus = paymentIntent.status;
      } catch (paymentError) {
        console.warn("Could not retrieve invoice payment status:", paymentError);
      }
    }

    return NextResponse.json({ invoice, paymentStatus });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

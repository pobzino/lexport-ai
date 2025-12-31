import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";
import { calculatePlatformFee, getPlatformFeePercent, type SubscriptionTier } from "@/lib/stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover",
});

// POST - Create payment intent for invoice
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch invoice (no auth required for public payment page)
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Check if invoice can be paid
    if (invoice.status === "paid") {
      return NextResponse.json(
        { error: "Invoice has already been paid" },
        { status: 400 }
      );
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

    // Get invoice owner for Stripe connect (if they have connected account) and subscription tier
    const { data: invoiceSettings } = await supabase
      .from("invoice_settings")
      .select("stripe_account_id")
      .eq("user_id", invoice.user_id)
      .single();

    // Get user's subscription tier for platform fee calculation
    const { data: invoiceOwner } = await supabase
      .from("users")
      .select("subscription_status")
      .eq("id", invoice.user_id)
      .single();

    const subscriptionTier: SubscriptionTier =
      (invoiceOwner?.subscription_status as SubscriptionTier) || "free";

    // Check if there's an existing payment intent
    if (invoice.stripe_payment_intent_id) {
      try {
        const existingIntent = await stripe.paymentIntents.retrieve(
          invoice.stripe_payment_intent_id
        );

        if (existingIntent.status === "succeeded") {
          return NextResponse.json(
            { error: "Invoice has already been paid" },
            { status: 400 }
          );
        }

        // Cancel old payment intent to create a fresh one with all payment methods
        if (
          existingIntent.status === "requires_payment_method" ||
          existingIntent.status === "requires_confirmation"
        ) {
          await stripe.paymentIntents.cancel(existingIntent.id);
        }
      } catch {
        // Payment intent not found or expired, create new one
      }
    }

    // Determine payment methods based on currency
    const currency = invoice.currency.toLowerCase();
    let paymentMethodTypes: string[] = ["card", "link"];

    // Add region-specific bank payment methods
    if (currency === "usd") {
      paymentMethodTypes.push("us_bank_account");
    } else if (currency === "gbp") {
      paymentMethodTypes.push("bacs_debit");
    } else if (currency === "eur") {
      paymentMethodTypes.push("sepa_debit");
    }

    // Create new payment intent
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: invoice.total || invoice.amount,
      currency,
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        type: "standalone_invoice",
      },
      description: `Invoice ${invoice.invoice_number}`,
      receipt_email: invoice.recipient_email || undefined,
      // Explicitly specify payment methods by currency
      payment_method_types: paymentMethodTypes as Stripe.PaymentIntentCreateParams["payment_method_types"],
      // Bank payment options
      payment_method_options: {
        // US: ACH Direct Debit
        us_bank_account: {
          financial_connections: {
            permissions: ["payment_method", "balances"],
          },
          verification_method: "automatic",
        },
        // UK: Bacs Direct Debit
        bacs_debit: {
          mandate_options: {
            reference_prefix: "LEX",
          },
        },
        // EU: SEPA Direct Debit
        sepa_debit: {
          mandate_options: {
            reference_prefix: "LEX",
          },
        },
      },
    };

    // Add application fee and connected account if user has Stripe Connect
    if (invoiceSettings?.stripe_account_id) {
      const invoiceAmount = invoice.total || invoice.amount;
      const platformFee = calculatePlatformFee(invoiceAmount, subscriptionTier);

      paymentIntentParams.application_fee_amount = platformFee;
      paymentIntentParams.transfer_data = {
        destination: invoiceSettings.stripe_account_id,
      };
      paymentIntentParams.metadata = {
        ...paymentIntentParams.metadata,
        platform_fee: platformFee.toString(),
        platform_fee_percent: getPlatformFeePercent(subscriptionTier).toString(),
        subscription_tier: subscriptionTier,
      };
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    // Store payment intent ID on invoice
    await supabase
      .from("invoices")
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: invoice.total || invoice.amount,
      currency: invoice.currency.toLowerCase(),
      invoiceNumber: invoice.invoice_number,
      recipientName: invoice.recipient_name,
      recipientEmail: invoice.recipient_email,
      recipientAddress: invoice.recipient_address,
      senderName: invoice.sender_name,
      senderEmail: invoice.sender_email,
      senderAddress: invoice.sender_address,
      lineItems: invoice.line_items,
      subtotal: invoice.subtotal,
      taxAmount: invoice.tax_amount,
      total: invoice.total || invoice.amount,
      dueDate: invoice.due_date,
      notes: invoice.notes,
      createdAt: invoice.created_at,
    });
  } catch (error) {
    console.error("Error creating invoice payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Get payment status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, status, total, amount, currency, recipient_name, due_date")
      .eq("id", id)
      .single();

    if (error || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

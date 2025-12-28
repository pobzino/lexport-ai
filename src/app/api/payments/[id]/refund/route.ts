import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

// POST - Create a refund for a payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { amount, reason } = body;

    // Fetch payment
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*, contracts!inner(user_id, title)")
      .eq("id", id)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contracts = payment.contracts as any;

    // Verify user owns the contract
    if (contracts.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if payment can be refunded
    if (payment.status !== "succeeded") {
      return NextResponse.json(
        { error: "Only succeeded payments can be refunded" },
        { status: 400 }
      );
    }

    if (!payment.stripe_payment_intent_id) {
      return NextResponse.json(
        { error: "No Stripe payment intent found" },
        { status: 400 }
      );
    }

    // Calculate refund amount (default to full amount if not specified)
    const refundAmount = amount
      ? Math.min(amount, payment.amount - (payment.refunded_amount || 0))
      : payment.amount - (payment.refunded_amount || 0);

    if (refundAmount <= 0) {
      return NextResponse.json(
        { error: "No refundable amount remaining" },
        { status: 400 }
      );
    }

    // Create refund in Stripe
    const stripe = getStripe();
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      amount: refundAmount,
      reason: reason === "duplicate" ? "duplicate" :
              reason === "fraudulent" ? "fraudulent" :
              "requested_by_customer",
      metadata: {
        payment_id: id,
        contract_id: payment.contract_id,
        refund_reason: reason || "requested_by_customer",
      },
    });

    // Update payment record
    const newRefundedAmount = (payment.refunded_amount || 0) + refundAmount;
    const isFullyRefunded = newRefundedAmount >= payment.amount;

    const { error: updateError } = await supabase
      .from("payments")
      .update({
        refunded_amount: newRefundedAmount,
        status: isFullyRefunded ? "refunded" : payment.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating payment:", updateError);
    }

    // Update contract payment status if fully refunded
    if (isFullyRefunded) {
      await supabase
        .from("contracts")
        .update({
          payment_status: "refunded",
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.contract_id);
    }

    // Create audit log
    await supabase.from("audit_logs").insert({
      contract_id: payment.contract_id,
      user_id: user.id,
      event_type: "payment_refunded",
      actor_email: user.email,
      metadata: {
        payment_id: id,
        refund_id: refund.id,
        refund_amount: refundAmount,
        reason: reason || "requested_by_customer",
        is_full_refund: isFullyRefunded,
      },
    });

    return NextResponse.json({
      refund: {
        id: refund.id,
        amount: refundAmount,
        status: refund.status,
        reason: refund.reason,
      },
      payment: {
        id: payment.id,
        amount: payment.amount,
        refunded_amount: newRefundedAmount,
        status: isFullyRefunded ? "refunded" : payment.status,
      },
    });
  } catch (error) {
    console.error("Error creating refund:", error);

    // Handle Stripe-specific errors
    if (error instanceof Error) {
      if (error.message.includes("has already been refunded")) {
        return NextResponse.json(
          { error: "Payment has already been fully refunded" },
          { status: 400 }
        );
      }
      if (error.message.includes("charge must be greater")) {
        return NextResponse.json(
          { error: "Refund amount exceeds available balance" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to process refund" },
      { status: 500 }
    );
  }
}

// GET - Get refund history for a payment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch payment with contract ownership check
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*, contracts!inner(user_id)")
      .eq("id", id)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contracts = payment.contracts as any;
    if (contracts.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!payment.stripe_payment_intent_id) {
      return NextResponse.json({ refunds: [] });
    }

    // Fetch refunds from Stripe
    const stripe = getStripe();
    const refunds = await stripe.refunds.list({
      payment_intent: payment.stripe_payment_intent_id,
      limit: 100,
    });

    return NextResponse.json({
      refunds: refunds.data.map((r: Stripe.Refund) => ({
        id: r.id,
        amount: r.amount,
        status: r.status,
        reason: r.reason,
        created: new Date(r.created * 1000).toISOString(),
      })),
      payment: {
        id: payment.id,
        amount: payment.amount,
        refunded_amount: payment.refunded_amount || 0,
        status: payment.status,
      },
    });
  } catch (error) {
    console.error("Error fetching refunds:", error);
    return NextResponse.json(
      { error: "Failed to fetch refunds" },
      { status: 500 }
    );
  }
}

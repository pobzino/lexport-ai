import { NextRequest, NextResponse } from "next/server";
import { stripe, STRIPE_WEBHOOK_SECRET, getAccountStatus } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

// Helper to update both payments and contracts tables
async function updatePaymentStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paymentIntentId: string,
  status: string,
  additionalData?: Record<string, unknown>
) {
  // Update payments table
  const paymentUpdate: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
    ...additionalData,
  };
  await supabase
    .from("payments")
    .update(paymentUpdate)
    .eq("stripe_payment_intent_id", paymentIntentId);

  // Find and update contract
  const { data: payment } = await supabase
    .from("payments")
    .select("contract_id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .single();

  if (payment?.contract_id) {
    await supabase
      .from("contracts")
      .update({
        payment_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.contract_id);
  }

  return payment?.contract_id;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    switch (event.type) {
      // ===== Payment Events =====
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const contractId = paymentIntent.metadata.contract_id;

        // Get charge details for payment method info
        const charges = paymentIntent.latest_charge
          ? await stripe.charges.retrieve(paymentIntent.latest_charge as string)
          : null;

        const paymentMethod = charges?.payment_method_details?.type || "card";
        const payerEmail = charges?.billing_details?.email || null;
        const payerName = charges?.billing_details?.name || null;

        if (contractId) {
          // Update both payments and contracts tables
          await updatePaymentStatus(supabase, paymentIntent.id, "succeeded", {
            payment_method: paymentMethod,
            payer_email: payerEmail,
            payer_name: payerName,
            stripe_charge_id: charges?.id || null,
            net_amount:
              paymentIntent.amount -
              (paymentIntent.application_fee_amount || 0),
          });

          console.log(
            `Payment succeeded for contract ${contractId} via ${paymentMethod}`
          );

          // Create audit log
          await supabase.from("audit_logs").insert({
            contract_id: contractId,
            event_type: "payment_completed" as unknown as string,
            ip_address: "webhook",
            user_agent: "stripe-webhook",
            metadata: {
              payment_intent_id: paymentIntent.id,
              amount: paymentIntent.amount,
              currency: paymentIntent.currency,
              payment_method: paymentMethod,
            },
          });
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const lastError = paymentIntent.last_payment_error;

        const contractId = await updatePaymentStatus(
          supabase,
          paymentIntent.id,
          "failed",
          {
            failure_code: lastError?.code || null,
            failure_message: lastError?.message || null,
          }
        );

        if (contractId) {
          console.log(`Payment failed for contract ${contractId}`);

          // Create audit log
          await supabase.from("audit_logs").insert({
            contract_id: contractId,
            event_type: "payment_failed" as unknown as string,
            ip_address: "webhook",
            user_agent: "stripe-webhook",
            metadata: {
              payment_intent_id: paymentIntent.id,
              error_code: lastError?.code,
              error_message: lastError?.message,
            },
          });
        }
        break;
      }

      case "payment_intent.processing": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await updatePaymentStatus(supabase, paymentIntent.id, "processing");
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string;

        if (paymentIntentId) {
          const contractId = await updatePaymentStatus(
            supabase,
            paymentIntentId,
            "refunded",
            {
              refunded_amount: charge.amount_refunded,
            }
          );

          if (contractId) {
            console.log(`Payment refunded for contract ${contractId}`);

            // Create audit log
            await supabase.from("audit_logs").insert({
              contract_id: contractId,
              event_type: "payment_refunded" as unknown as string,
              ip_address: "webhook",
              user_agent: "stripe-webhook",
              metadata: {
                charge_id: charge.id,
                amount_refunded: charge.amount_refunded,
              },
            });
          }
        }
        break;
      }

      // ===== Connect Account Events =====
      case "account.updated": {
        const account = event.data.object as Stripe.Account;

        // Find user with this Connect account
        const { data: user } = await supabase
          .from("users")
          .select("id")
          .eq("stripe_connect_account_id", account.id)
          .single();

        if (user) {
          const status = getAccountStatus(account);

          await supabase
            .from("users")
            .update({
              stripe_connect_status: status,
              stripe_connect_onboarding_complete: account.details_submitted,
              updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);

          console.log(
            `Connect account ${account.id} updated to status: ${status}`
          );
        }
        break;
      }

      case "account.application.deauthorized": {
        const application = event.data.object as Stripe.Application;
        // When a connected account deauthorizes our app
        console.log(`Connect account deauthorized: ${application.id}`);

        // Note: We can't easily find the user here since the event
        // doesn't include the account ID. The user would need to
        // manually disconnect in our UI.
        break;
      }

      // ===== Payout Events (for monitoring) =====
      case "payout.paid": {
        const payout = event.data.object as Stripe.Payout;
        console.log(
          `Payout completed: ${payout.id}, amount: ${payout.amount} ${payout.currency}`
        );
        break;
      }

      case "payout.failed": {
        const payout = event.data.object as Stripe.Payout;
        console.error(
          `Payout failed: ${payout.id}, reason: ${payout.failure_message}`
        );
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

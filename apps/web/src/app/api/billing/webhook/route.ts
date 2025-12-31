import { NextRequest, NextResponse } from "next/server";
import { getStripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

// Map Stripe price IDs to subscription tiers
const PRICE_TO_TIER: Record<string, "pro" | "team"> = {
  [process.env.STRIPE_PRO_PRICE_ID || ""]: "pro",
  [process.env.STRIPE_TEAM_PRICE_ID || ""]: "team",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature || !STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: "Missing signature or webhook secret" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
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

    const supabase = createAdminClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Handle subscription purchases
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          const userId = subscription.metadata.user_id;
          const planId = subscription.metadata.plan_id as "pro" | "team";

          if (userId && planId) {
            await supabase.rpc("set_subscription_tier", {
              user_uuid: userId,
              new_tier: planId,
              new_status: "active",
            });

            // Update stripe subscription ID
            await supabase
              .from("users")
              .update({
                stripe_subscription_id: subscription.id,
                subscription_started_at: new Date().toISOString(),
              })
              .eq("id", userId);
          }
        }

        // Handle one-time template purchases
        if (session.mode === "payment" && session.metadata?.type === "template_purchase") {
          const userId = session.metadata.user_id;
          const templateId = session.metadata.template_id;

          if (userId && templateId) {
            await supabase
              .from("template_purchases")
              .update({
                status: "succeeded",
                purchased_at: new Date().toISOString(),
                stripe_payment_intent_id: session.payment_intent as string,
              })
              .eq("user_id", userId)
              .eq("template_id", templateId)
              .eq("status", "pending");
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.user_id;

        if (userId) {
          const priceId = subscription.items.data[0]?.price.id;
          const tier = PRICE_TO_TIER[priceId || ""] || "free";

          const status = subscription.status === "active" || subscription.status === "trialing"
            ? "active"
            : subscription.status === "past_due"
            ? "past_due"
            : "canceled";

          await supabase.rpc("set_subscription_tier", {
            user_uuid: userId,
            new_tier: tier,
            new_status: status,
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.user_id;

        if (userId) {
          // Downgrade to free tier
          await supabase.rpc("set_subscription_tier", {
            user_uuid: userId,
            new_tier: "free",
            new_status: "canceled",
          });

          await supabase
            .from("users")
            .update({
              stripe_subscription_id: null,
              subscription_ends_at: new Date().toISOString(),
            })
            .eq("id", userId);
        }
        break;
      }

      case "invoice.payment_failed": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any;
        const subscriptionId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.id;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const userId = subscription.metadata.user_id;

          if (userId) {
            await supabase
              .from("users")
              .update({ subscription_status: "past_due" })
              .eq("id", userId);
          }
        }
        break;
      }

      default:
        // Unhandled event type
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

// Disable body parsing for webhooks (Stripe requires raw body)
export const config = {
  api: {
    bodyParser: false,
  },
};

import { NextRequest, NextResponse } from "next/server";
import { getStripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

// Build PRICE_TO_TIER map safely — skip empty/missing env vars
function buildPriceToTierMap(): Record<string, "pro" | "team"> {
  const map: Record<string, "pro" | "team"> = {};
  const proPrice = process.env.STRIPE_PRO_PRICE_ID;
  const teamPrice = process.env.STRIPE_TEAM_PRICE_ID;
  const proAnnualPrice = process.env.STRIPE_PRO_ANNUAL_PRICE_ID;
  const teamAnnualPrice = process.env.STRIPE_TEAM_ANNUAL_PRICE_ID;
  if (proPrice) map[proPrice] = "pro";
  if (teamPrice) map[teamPrice] = "team";
  if (proAnnualPrice) map[proAnnualPrice] = "pro";
  if (teamAnnualPrice) map[teamAnnualPrice] = "team";
  return map;
}

/**
 * Set a user's subscription tier via RPC, with direct UPDATE fallback.
 * Throws on failure so the webhook returns 500 and Stripe retries.
 */
async function setUserSubscription(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  tier: string,
  status: string
) {
  // Try RPC first
  const { error: rpcError } = await supabase.rpc("set_subscription_tier", {
    user_uuid: userId,
    new_tier: tier,
    new_status: status,
  });

  if (rpcError) {
    console.error(`[webhook] RPC set_subscription_tier failed for user ${userId}:`, rpcError);

    // Fallback: direct UPDATE
    const { error: updateError } = await supabase
      .from("users")
      .update({
        subscription_tier: tier,
        subscription_status: status,
        ...(tier !== "free" ? { subscription_started_at: new Date().toISOString() } : {}),
      })
      .eq("id", userId);

    if (updateError) {
      console.error(`[webhook] Direct UPDATE also failed for user ${userId}:`, updateError);
      throw new Error(`Failed to update subscription for user ${userId}: ${updateError.message}`);
    }
    console.log(`[webhook] Fallback UPDATE succeeded for user ${userId}: tier=${tier}, status=${status}`);
  } else {
    console.log(`[webhook] RPC set_subscription_tier succeeded for user ${userId}: tier=${tier}, status=${status}`);
  }
}

/**
 * Set an org's subscription tier via RPC, with direct UPDATE fallback.
 */
async function setOrgSubscription(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string,
  tier: string,
  status: string
) {
  const { error: rpcError } = await supabase.rpc("set_org_subscription_tier", {
    org_uuid: orgId,
    new_tier: tier,
    new_status: status,
  });

  if (rpcError) {
    console.error(`[webhook] RPC set_org_subscription_tier failed for org ${orgId}:`, rpcError);

    // Fallback: direct UPDATE
    const { error: updateError } = await supabase
      .from("organizations")
      .update({
        subscription_tier: tier,
        subscription_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orgId);

    if (updateError) {
      console.error(`[webhook] Direct UPDATE also failed for org ${orgId}:`, updateError);
      throw new Error(`Failed to update subscription for org ${orgId}: ${updateError.message}`);
    }
    console.log(`[webhook] Fallback UPDATE succeeded for org ${orgId}: tier=${tier}, status=${status}`);
  } else {
    console.log(`[webhook] RPC set_org_subscription_tier succeeded for org ${orgId}: tier=${tier}, status=${status}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature || !STRIPE_WEBHOOK_SECRET) {
      console.error("[webhook] Missing signature or webhook secret");
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
      console.error("[webhook] Signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    console.log(`[webhook] Processing event: ${event.type} (${event.id})`);
    const supabase = createAdminClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Handle subscription purchases
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          // Read metadata — checkout sets user_id for individual, organization_id for org
          // Also check created_by_user_id as a fallback for org subscriptions
          const userId = subscription.metadata.user_id || subscription.metadata.created_by_user_id;
          const organizationId = subscription.metadata.organization_id;
          const planId = subscription.metadata.plan_id as "pro" | "team" | undefined;

          console.log(`[webhook] checkout.session.completed: userId=${userId}, orgId=${organizationId}, planId=${planId}, subId=${subscription.id}`);

          if (!planId) {
            console.error(`[webhook] No plan_id in subscription metadata. Metadata:`, subscription.metadata);
            // Still return 200 to Stripe — retrying won't fix missing metadata
            break;
          }

          // Handle organization subscription
          if (organizationId) {
            await setOrgSubscription(supabase, organizationId, planId, "active");

            // Update stripe subscription ID on organization
            const { error: orgUpdateError } = await supabase
              .from("organizations")
              .update({
                stripe_subscription_id: subscription.id,
                subscription_started_at: new Date().toISOString(),
              })
              .eq("id", organizationId);

            if (orgUpdateError) {
              console.error(`[webhook] Failed to update org stripe_subscription_id:`, orgUpdateError);
            }

            // Also update the creating user's stripe_customer_id if available
            if (userId) {
              const { error } = await supabase
                .from("users")
                .update({ stripe_customer_id: subscription.customer as string })
                .eq("id", userId);
              if (error) console.error(`[webhook] Failed to update user stripe_customer_id:`, error);
            }
          }
          // Handle individual user subscription
          else if (userId) {
            await setUserSubscription(supabase, userId, planId, "active");

            // Update stripe IDs on user record
            const { error: userUpdateError } = await supabase
              .from("users")
              .update({
                stripe_subscription_id: subscription.id,
                stripe_customer_id: subscription.customer as string,
                subscription_started_at: new Date().toISOString(),
              })
              .eq("id", userId);

            if (userUpdateError) {
              console.error(`[webhook] Failed to update user stripe IDs:`, userUpdateError);
            }
          } else {
            console.error(`[webhook] checkout.session.completed: No userId or orgId found in metadata:`, subscription.metadata);
          }
        }

        // Handle one-time template purchases
        if (session.mode === "payment" && session.metadata?.type === "template_purchase") {
          const userId = session.metadata.user_id;
          const templateId = session.metadata.template_id;

          if (userId && templateId) {
            const { error } = await supabase
              .from("template_purchases")
              .update({
                status: "succeeded",
                purchased_at: new Date().toISOString(),
                stripe_payment_intent_id: session.payment_intent as string,
              })
              .eq("user_id", userId)
              .eq("template_id", templateId)
              .eq("status", "pending");

            if (error) {
              console.error(`[webhook] Failed to update template purchase:`, error);
            }
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.user_id || subscription.metadata.created_by_user_id;
        const organizationId = subscription.metadata.organization_id;

        const priceId = subscription.items.data[0]?.price.id;
        const priceToTier = buildPriceToTierMap();
        const tier = (priceId && priceToTier[priceId]) || subscription.metadata.plan_id || "free";

        const status = subscription.status === "active" || subscription.status === "trialing"
          ? "active"
          : subscription.status === "past_due"
          ? "past_due"
          : "canceled";

        console.log(`[webhook] subscription.updated: userId=${userId}, orgId=${organizationId}, tier=${tier}, status=${status}, priceId=${priceId}`);

        // Handle organization subscription update
        if (organizationId) {
          await setOrgSubscription(supabase, organizationId, tier, status);
        }
        // Handle user subscription update
        else if (userId) {
          await setUserSubscription(supabase, userId, tier, status);
        } else {
          console.error(`[webhook] subscription.updated: No userId or orgId in metadata:`, subscription.metadata);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.user_id || subscription.metadata.created_by_user_id;
        const organizationId = subscription.metadata.organization_id;

        console.log(`[webhook] subscription.deleted: userId=${userId}, orgId=${organizationId}`);

        // Handle organization subscription deletion
        if (organizationId) {
          await setOrgSubscription(supabase, organizationId, "free", "canceled");

          const { error } = await supabase
            .from("organizations")
            .update({
              stripe_subscription_id: null,
              subscription_ends_at: new Date().toISOString(),
            })
            .eq("id", organizationId);

          if (error) console.error(`[webhook] Failed to clear org stripe_subscription_id:`, error);
        }
        // Handle user subscription deletion
        else if (userId) {
          await setUserSubscription(supabase, userId, "free", "canceled");

          const { error } = await supabase
            .from("users")
            .update({
              stripe_subscription_id: null,
              subscription_ends_at: new Date().toISOString(),
            })
            .eq("id", userId);

          if (error) console.error(`[webhook] Failed to clear user stripe_subscription_id:`, error);
        } else {
          console.error(`[webhook] subscription.deleted: No userId or orgId in metadata:`, subscription.metadata);
        }
        break;
      }

      case "invoice.payment_failed": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any;
        const subscriptionId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.id;

        console.log(`[webhook] invoice.payment_failed: subscriptionId=${subscriptionId}`);

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const userId = subscription.metadata.user_id || subscription.metadata.created_by_user_id;
          const organizationId = subscription.metadata.organization_id;

          // Handle organization payment failure
          if (organizationId) {
            const { error } = await supabase
              .from("organizations")
              .update({ subscription_status: "past_due" })
              .eq("id", organizationId);
            if (error) console.error(`[webhook] Failed to set org past_due:`, error);
          }
          // Handle user payment failure
          else if (userId) {
            const { error } = await supabase
              .from("users")
              .update({ subscription_status: "past_due" })
              .eq("id", userId);
            if (error) console.error(`[webhook] Failed to set user past_due:`, error);
          }
        }
        break;
      }

      default:
        console.log(`[webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[webhook] Unhandled error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

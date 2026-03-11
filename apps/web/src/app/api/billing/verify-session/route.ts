import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

/**
 * POST /api/billing/verify-session
 *
 * Called from the billing page after Stripe redirects back with a session_id.
 * Verifies the checkout session completed and ensures the user's subscription
 * was actually updated in the database (belt-and-suspenders for webhook).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    const stripe = getStripe();

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Verify this session belongs to the current user by checking subscription metadata
    if (session.mode !== "subscription" || !session.subscription) {
      return NextResponse.json({ error: "Not a subscription session" }, { status: 400 });
    }

    const subscription = typeof session.subscription === "string"
      ? await stripe.subscriptions.retrieve(session.subscription)
      : session.subscription;

    const metadataUserId = subscription.metadata.user_id || subscription.metadata.created_by_user_id;

    // Security: only allow the user who created this checkout to verify it
    if (metadataUserId !== user.id) {
      return NextResponse.json({ error: "Session does not belong to this user" }, { status: 403 });
    }

    const planId = subscription.metadata.plan_id as "pro" | "team" | undefined;
    const organizationId = subscription.metadata.organization_id;

    if (!planId) {
      return NextResponse.json({ error: "No plan_id in subscription metadata" }, { status: 400 });
    }

    // Check if subscription is already correctly set in the DB
    const adminSupabase = createAdminClient();

    if (organizationId) {
      const { data: org } = await adminSupabase
        .from("organizations")
        .select("subscription_tier, subscription_status, stripe_subscription_id")
        .eq("id", organizationId)
        .single();

      if (org?.subscription_tier === planId && org?.subscription_status === "active") {
        return NextResponse.json({
          status: "already_active",
          tier: planId,
          message: "Subscription is active",
        });
      }

      // Subscription not updated yet — apply it now (webhook may not have fired yet)
      console.log(`[verify-session] Org ${organizationId} not updated, applying tier=${planId}`);

      const { error: rpcError } = await adminSupabase.rpc("set_org_subscription_tier", {
        org_uuid: organizationId,
        new_tier: planId,
        new_status: "active",
      });

      if (rpcError) {
        console.error("[verify-session] RPC failed, using direct update:", rpcError);
        await adminSupabase
          .from("organizations")
          .update({
            subscription_tier: planId,
            subscription_status: "active",
            stripe_subscription_id: subscription.id,
            subscription_started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", organizationId);
      } else {
        await adminSupabase
          .from("organizations")
          .update({
            stripe_subscription_id: subscription.id,
            subscription_started_at: new Date().toISOString(),
          })
          .eq("id", organizationId);
      }

      return NextResponse.json({
        status: "activated",
        tier: planId,
        message: "Subscription activated successfully",
      });
    }

    // Individual user subscription
    const { data: userData } = await adminSupabase
      .from("users")
      .select("subscription_tier, subscription_status, stripe_subscription_id")
      .eq("id", user.id)
      .single();

    if (userData?.subscription_tier === planId && userData?.subscription_status === "active") {
      return NextResponse.json({
        status: "already_active",
        tier: planId,
        message: "Subscription is active",
      });
    }

    // Subscription not updated yet — apply it now
    console.log(`[verify-session] User ${user.id} not updated (current: ${userData?.subscription_tier}), applying tier=${planId}`);

    const { error: rpcError } = await adminSupabase.rpc("set_subscription_tier", {
      user_uuid: user.id,
      new_tier: planId,
      new_status: "active",
    });

    if (rpcError) {
      console.error("[verify-session] RPC failed, using direct update:", rpcError);
      await adminSupabase
        .from("users")
        .update({
          subscription_tier: planId,
          subscription_status: "active",
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer as string,
          subscription_started_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    } else {
      await adminSupabase
        .from("users")
        .update({
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer as string,
          subscription_started_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }

    return NextResponse.json({
      status: "activated",
      tier: planId,
      message: "Subscription activated successfully",
    });
  } catch (error) {
    console.error("[verify-session] Error:", error);
    return NextResponse.json(
      { error: "Failed to verify session" },
      { status: 500 }
    );
  }
}

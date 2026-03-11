import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import Stripe from "stripe";

// Stripe price IDs for subscription plans (set these in your Stripe dashboard)
const PRICE_IDS: Record<string, string> = {
  pro: process.env.STRIPE_PRO_PRICE_ID || "",
  team: process.env.STRIPE_TEAM_PRICE_ID || "",
};

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
    const { planId, organizationId, promoCode } = body;

    if (!planId || !["pro", "team"].includes(planId)) {
      return NextResponse.json(
        { error: "Invalid plan" },
        { status: 400 }
      );
    }

    const priceId = PRICE_IDS[planId];
    if (!priceId) {
      return NextResponse.json(
        { error: "Plan not configured. Please contact support." },
        { status: 400 }
      );
    }

    // If organization subscription, verify user is admin of the org
    if (organizationId) {
      const { data: userData } = await supabase
        .from("users")
        .select("organization_id, role")
        .eq("id", user.id)
        .single();

      // Check if user belongs to this org (proper admin check would require org_members table)
      if (userData?.organization_id !== organizationId) {
        return NextResponse.json(
          { error: "You are not a member of this organization" },
          { status: 403 }
        );
      }

      // Get org's Stripe customer
      const { data: orgData } = await supabase
        .from("organizations")
        .select("stripe_customer_id, name")
        .eq("id", organizationId)
        .single();

      const stripe = getStripe();
      let customerId = orgData?.stripe_customer_id;

      if (!customerId) {
        // Create new Stripe customer for organization
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          name: orgData?.name || undefined,
          metadata: {
            organization_id: organizationId,
            created_by_user_id: user.id,
          },
        });
        customerId = customer.id;

        // Save customer ID to organization record
        const { error: orgUpdateError } = await supabase
          .from("organizations")
          .update({ stripe_customer_id: customerId })
          .eq("id", organizationId);
        if (orgUpdateError) console.error("[checkout] Failed to save org stripe_customer_id:", orgUpdateError);
      }

      // Create checkout session for organization
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${baseUrl}/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/settings/billing?canceled=true`,
        subscription_data: {
          metadata: {
            organization_id: organizationId,
            plan_id: planId,
            user_id: user.id,
            created_by_user_id: user.id,
          },
          trial_period_days: 7,
        },
        allow_promotion_codes: true,
      });

      return NextResponse.json({ url: session.url });
    }

    // Individual user subscription
    const { data: userData } = await supabase
      .from("users")
      .select("stripe_customer_id, email, name")
      .eq("id", user.id)
      .single();

    const stripe = getStripe();
    let customerId = userData?.stripe_customer_id;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email || userData?.email,
        name: userData?.name || undefined,
        metadata: {
          user_id: user.id,
        },
      });
      customerId = customer.id;

      // Save customer ID to user record
      const { error: custUpdateError } = await supabase
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
      if (custUpdateError) console.error("[checkout] Failed to save user stripe_customer_id:", custUpdateError);
    }

    // Create checkout session for individual user
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Build checkout session config
    const checkoutConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/settings/billing?canceled=true`,
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_id: planId,
        },
      },
    };

    // Apply promo code if provided, otherwise allow manual entry and offer trial
    if (promoCode) {
      checkoutConfig.discounts = [{ coupon: promoCode }];
    } else {
      checkoutConfig.allow_promotion_codes = true;
      if (checkoutConfig.subscription_data) {
        checkoutConfig.subscription_data.trial_period_days = 7;
      }
    }

    const session = await stripe.checkout.sessions.create(checkoutConfig);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

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
    const { planId } = body;

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

    // Get or create Stripe customer
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
      await supabase
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    // Create checkout session
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
          user_id: user.id,
          plan_id: planId,
        },
        trial_period_days: 7,
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

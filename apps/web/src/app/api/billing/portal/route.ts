import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's Stripe customer ID
    const { data: userData } = await supabase
      .from("users")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!userData?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No billing account found" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: userData.stripe_customer_id,
      return_url: `${baseUrl}/settings/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

const TEMPLATE_PRICE_CENTS = 1000; // $10.00

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: templateId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user already owns this template
    const { data: existingPurchase } = await supabase
      .from("template_purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("template_id", templateId)
      .eq("status", "succeeded")
      .single();

    if (existingPurchase) {
      return NextResponse.json(
        { error: "You already own this template" },
        { status: 400 }
      );
    }

    // Check if user has Pro/Team subscription (unlimited templates)
    const { data: userData } = await supabase
      .from("users")
      .select("subscription_tier, stripe_customer_id, email, name")
      .eq("id", user.id)
      .single();

    if (userData?.subscription_tier && userData.subscription_tier !== "free") {
      // Pro/Team users get all templates free
      const { error: insertError } = await supabase
        .from("template_purchases")
        .insert({
          user_id: user.id,
          template_id: templateId,
          amount: 0,
          status: "succeeded",
          purchased_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("Error granting template:", insertError);
        return NextResponse.json(
          { error: "Failed to grant template access" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Template unlocked (included with your subscription)",
      });
    }

    // Get template details
    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select("id, name, price")
      .eq("id", templateId)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const price = template.price || TEMPLATE_PRICE_CENTS;

    // Get or create Stripe customer
    const stripe = getStripe();
    let customerId = userData?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || userData?.email,
        name: userData?.name || undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;

      await supabase
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    // Create checkout session for one-time purchase
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Template: ${template.name}`,
              description: "One-time purchase - use unlimited times",
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/templates?purchase=success&template_id=${templateId}`,
      cancel_url: `${baseUrl}/templates?purchase=canceled`,
      metadata: {
        user_id: user.id,
        template_id: templateId,
        type: "template_purchase",
      },
    });

    // Create pending purchase record
    await supabase.from("template_purchases").insert({
      user_id: user.id,
      template_id: templateId,
      stripe_payment_intent_id: session.payment_intent as string,
      amount: price,
      status: "pending",
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Template purchase error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

// GET: Check if user owns the template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: templateId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ owned: false });
    }

    // Check subscription (Pro/Team have all templates)
    const { data: userData } = await supabase
      .from("users")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    if (userData?.subscription_tier && userData.subscription_tier !== "free") {
      return NextResponse.json({ owned: true, reason: "subscription" });
    }

    // Check purchase
    const { data: purchase } = await supabase
      .from("template_purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("template_id", templateId)
      .eq("status", "succeeded")
      .single();

    return NextResponse.json({
      owned: !!purchase,
      reason: purchase ? "purchased" : null,
    });
  } catch (error) {
    console.error("Check ownership error:", error);
    return NextResponse.json({ owned: false });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe, calculatePlatformFee } from "@/lib/stripe";

// Create a payment intent for a contract
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch contract
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Check if payment is required
    if (!contract.payment_required) {
      return NextResponse.json(
        { error: "This contract does not require payment" },
        { status: 400 }
      );
    }

    // Check if payment already succeeded
    if (contract.payment_status === "succeeded") {
      return NextResponse.json(
        { error: "Payment has already been completed" },
        { status: 400 }
      );
    }

    // If we already have a payment intent, return it
    if (contract.stripe_payment_intent_id) {
      try {
        const existingIntent = await stripe.paymentIntents.retrieve(
          contract.stripe_payment_intent_id
        );

        // If the existing intent is still valid, return its client secret
        if (
          existingIntent.status !== "canceled" &&
          existingIntent.status !== "succeeded"
        ) {
          return NextResponse.json({
            clientSecret: existingIntent.client_secret,
            paymentIntentId: existingIntent.id,
            amount: existingIntent.amount,
            currency: existingIntent.currency,
          });
        }
      } catch (err) {
        // If retrieving fails, create a new one
        console.log("Could not retrieve existing payment intent, creating new one");
      }
    }

    // Create new payment intent
    const amount = Math.round((contract.payment_amount || 0) * 100); // Convert to cents
    const currency = contract.payment_currency || "usd";

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Invalid payment amount" },
        { status: 400 }
      );
    }

    // Get contract owner's Connect account for payouts
    const { data: contractOwner } = await supabase
      .from("users")
      .select("stripe_connect_account_id, stripe_connect_status")
      .eq("id", contract.user_id)
      .single();

    // Build payment intent options
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paymentIntentOptions: any = {
      amount,
      currency,
      metadata: {
        contract_id: id,
        contract_title: contract.title,
        payment_type: "full",
      },
      description: `Payment for: ${contract.title}`,
      // Enable all automatic payment methods (cards, wallets, bank debits, BNPL)
      automatic_payment_methods: {
        enabled: true,
      },
    };

    // If contract owner has an active Connect account, add Connect params
    if (
      contractOwner?.stripe_connect_account_id &&
      contractOwner.stripe_connect_status === "active"
    ) {
      const platformFee = calculatePlatformFee(amount);
      paymentIntentOptions.application_fee_amount = platformFee;
      paymentIntentOptions.transfer_data = {
        destination: contractOwner.stripe_connect_account_id,
      };
      paymentIntentOptions.metadata.connected_account_id =
        contractOwner.stripe_connect_account_id;
      paymentIntentOptions.metadata.platform_fee = platformFee.toString();
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentOptions);

    // Calculate platform fee for tracking
    const platformFee =
      contractOwner?.stripe_connect_account_id &&
      contractOwner.stripe_connect_status === "active"
        ? calculatePlatformFee(amount)
        : 0;

    // Create payment record in our database
    await supabase.from("payments").insert({
      contract_id: id,
      user_id: contract.user_id,
      stripe_payment_intent_id: paymentIntent.id,
      amount,
      currency,
      platform_fee: platformFee,
      status: "pending",
      payment_type: "full",
      metadata: {
        contract_title: contract.title,
        connected_account_id: contractOwner?.stripe_connect_account_id || null,
      },
    });

    // Update contract with payment intent ID
    await supabase
      .from("contracts")
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        payment_status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      hasConnectedAccount: !!(
        contractOwner?.stripe_connect_account_id &&
        contractOwner.stripe_connect_status === "active"
      ),
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}

// Get payment status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: contract, error } = await supabase
      .from("contracts")
      .select("payment_required, payment_amount, payment_currency, payment_status, stripe_payment_intent_id")
      .eq("id", id)
      .single();

    if (error || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    return NextResponse.json({
      paymentRequired: contract.payment_required,
      amount: contract.payment_amount,
      currency: contract.payment_currency,
      status: contract.payment_status,
      hasPaymentIntent: !!contract.stripe_payment_intent_id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get payment status" },
      { status: 500 }
    );
  }
}

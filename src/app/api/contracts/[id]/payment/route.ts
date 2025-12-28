import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe, calculatePlatformFee } from "@/lib/stripe";
import type { PaymentType } from "@/db/types";

// Create a payment intent for a contract
// Supports full payment, deposit, or balance payment based on payment_structure
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Parse request body for payment type (deposit, balance, or full)
    let requestedPaymentType: PaymentType = "full";
    try {
      const body = await request.json();
      if (body.paymentType && ["deposit", "balance", "full"].includes(body.paymentType)) {
        requestedPaymentType = body.paymentType;
      }
    } catch {
      // No body or invalid JSON, use default
    }

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

    // Check if full payment already succeeded
    if (contract.payment_status === "succeeded") {
      return NextResponse.json(
        { error: "Payment has already been completed" },
        { status: 400 }
      );
    }

    // Calculate amounts based on payment structure
    const totalAmount = Math.round((contract.payment_amount || 0) * 100); // Convert to cents
    const currency = contract.payment_currency || "usd";
    const depositPercentage = contract.deposit_percentage || 30;

    let paymentAmount: number;
    let paymentType: PaymentType;
    let paymentDescription: string;

    // Check existing payments to determine what's due
    const { data: existingPayments } = await supabase
      .from("payments")
      .select("payment_type, status, amount")
      .eq("contract_id", id)
      .eq("status", "succeeded");

    const depositPaid = existingPayments?.some(p => p.payment_type === "deposit");
    const fullPaid = existingPayments?.some(p => p.payment_type === "full");

    if (fullPaid) {
      return NextResponse.json(
        { error: "Payment has already been completed" },
        { status: 400 }
      );
    }

    if (contract.payment_structure === "deposit_balance") {
      const depositAmount = Math.round(totalAmount * (depositPercentage / 100));
      const balanceAmount = totalAmount - depositAmount;

      if (depositPaid) {
        // Deposit already paid, only balance remaining
        if (requestedPaymentType === "deposit") {
          return NextResponse.json(
            { error: "Deposit has already been paid", nextPaymentType: "balance" },
            { status: 400 }
          );
        }
        paymentAmount = balanceAmount;
        paymentType = "balance";
        paymentDescription = `Balance payment for: ${contract.title}`;
      } else {
        // Deposit not paid yet
        if (requestedPaymentType === "balance") {
          return NextResponse.json(
            { error: "Deposit must be paid first", nextPaymentType: "deposit" },
            { status: 400 }
          );
        }
        paymentAmount = depositAmount;
        paymentType = "deposit";
        paymentDescription = `Deposit (${depositPercentage}%) for: ${contract.title}`;
      }
    } else {
      // Full payment or BNPL
      paymentAmount = totalAmount;
      paymentType = "full";
      paymentDescription = `Payment for: ${contract.title}`;
    }

    if (paymentAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid payment amount" },
        { status: 400 }
      );
    }

    // Check for existing valid payment intent for this payment type
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("stripe_payment_intent_id")
      .eq("contract_id", id)
      .eq("payment_type", paymentType)
      .eq("status", "pending")
      .single();

    if (existingPayment?.stripe_payment_intent_id) {
      try {
        const existingIntent = await stripe.paymentIntents.retrieve(
          existingPayment.stripe_payment_intent_id
        );

        if (
          existingIntent.status !== "canceled" &&
          existingIntent.status !== "succeeded"
        ) {
          return NextResponse.json({
            clientSecret: existingIntent.client_secret,
            paymentIntentId: existingIntent.id,
            amount: existingIntent.amount,
            currency: existingIntent.currency,
            paymentType,
            totalAmount,
            depositPaid,
          });
        }
      } catch {
        console.log("Could not retrieve existing payment intent, creating new one");
      }
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
      amount: paymentAmount,
      currency,
      metadata: {
        contract_id: id,
        contract_title: contract.title,
        payment_type: paymentType,
        total_amount: totalAmount.toString(),
        deposit_percentage: depositPercentage.toString(),
      },
      description: paymentDescription,
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
      const platformFee = calculatePlatformFee(paymentAmount);
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
        ? calculatePlatformFee(paymentAmount)
        : 0;

    // Create payment record in our database
    await supabase.from("payments").insert({
      contract_id: id,
      user_id: contract.user_id,
      stripe_payment_intent_id: paymentIntent.id,
      amount: paymentAmount,
      currency,
      platform_fee: platformFee,
      status: "pending",
      payment_type: paymentType,
      metadata: {
        contract_title: contract.title,
        connected_account_id: contractOwner?.stripe_connect_account_id || null,
        total_amount: totalAmount,
        deposit_percentage: depositPercentage,
      },
    });

    // Update contract with payment intent ID (only for first payment or full payment)
    if (paymentType === "full" || paymentType === "deposit") {
      await supabase
        .from("contracts")
        .update({
          stripe_payment_intent_id: paymentIntent.id,
          payment_status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      paymentType,
      totalAmount,
      depositPaid,
      balanceRemaining: contract.payment_structure === "deposit_balance" && !depositPaid
        ? totalAmount - paymentAmount
        : 0,
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

// Get payment status with schedule info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: contract, error } = await supabase
      .from("contracts")
      .select("payment_required, payment_amount, payment_currency, payment_status, stripe_payment_intent_id, payment_structure, deposit_percentage")
      .eq("id", id)
      .single();

    if (error || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Get all payments for this contract
    const { data: payments } = await supabase
      .from("payments")
      .select("id, payment_type, status, amount, created_at")
      .eq("contract_id", id)
      .order("created_at", { ascending: true });

    const depositPayment = payments?.find(p => p.payment_type === "deposit" && p.status === "succeeded");
    const balancePayment = payments?.find(p => p.payment_type === "balance" && p.status === "succeeded");
    const fullPayment = payments?.find(p => p.payment_type === "full" && p.status === "succeeded");

    // Calculate amounts
    const totalAmount = Math.round((contract.payment_amount || 0) * 100);
    const depositPercentage = contract.deposit_percentage || 30;
    const depositAmount = Math.round(totalAmount * (depositPercentage / 100));
    const balanceAmount = totalAmount - depositAmount;

    // Determine next payment due
    let nextPaymentType: PaymentType | null = null;
    let nextPaymentAmount = 0;

    if (contract.payment_structure === "deposit_balance") {
      if (!depositPayment || depositPayment.status !== "succeeded") {
        nextPaymentType = "deposit";
        nextPaymentAmount = depositAmount;
      } else if (!balancePayment || balancePayment.status !== "succeeded") {
        nextPaymentType = "balance";
        nextPaymentAmount = balanceAmount;
      }
    } else if (!fullPayment || fullPayment.status !== "succeeded") {
      nextPaymentType = "full";
      nextPaymentAmount = totalAmount;
    }

    return NextResponse.json({
      paymentRequired: contract.payment_required,
      totalAmount: contract.payment_amount,
      currency: contract.payment_currency,
      status: contract.payment_status,
      hasPaymentIntent: !!contract.stripe_payment_intent_id,
      // Payment structure details
      paymentStructure: contract.payment_structure,
      depositPercentage: contract.deposit_percentage,
      // Calculated amounts (in cents)
      schedule: contract.payment_structure === "deposit_balance" ? {
        depositAmount,
        balanceAmount,
        depositPaid: !!depositPayment,
        balancePaid: !!balancePayment,
        depositPaymentId: depositPayment?.id || null,
        balancePaymentId: balancePayment?.id || null,
        depositPaymentDate: depositPayment?.created_at || null,
        balancePaymentDate: balancePayment?.created_at || null,
      } : null,
      // Next payment info
      nextPayment: nextPaymentType ? {
        type: nextPaymentType,
        amount: nextPaymentAmount,
      } : null,
      // All completed
      fullyPaid: contract.payment_status === "succeeded" ||
        (fullPayment?.status === "succeeded") ||
        (depositPayment?.status === "succeeded" && balancePayment?.status === "succeeded"),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get payment status" },
      { status: 500 }
    );
  }
}

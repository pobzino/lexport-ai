import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  stripe,
  calculatePlatformFee,
  getPaymentMethodConfiguration,
  getPlatformFeePercent,
  type SubscriptionTier,
} from "@/lib/stripe";
import type { PaymentType } from "@/db/types";
import {
  getMilestoneAmount,
  getScheduleTotal,
  normalizePaymentSchedule,
} from "@/lib/payments/config";

// Create a payment intent for a contract
// Supports full, deposit/balance, and ordered milestone payments.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    // Parse request body for payment type (deposit, balance, or full)
    let requestedPaymentType: PaymentType = "full";
    let requestedMilestoneId: string | undefined;
    try {
      const body = await request.json();
      if (body.paymentType && ["deposit", "balance", "full", "installment"].includes(body.paymentType)) {
        requestedPaymentType = body.paymentType;
      }
      if (typeof body.milestoneId === "string") {
        requestedMilestoneId = body.milestoneId;
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
    let activeMilestone: {
      id: string;
      label: string;
      percentage: number;
      dueDate?: string;
      index: number;
    } | null = null;

    // Check existing payments to determine what's due
    const { data: existingPayments } = await supabase
      .from("payments")
      .select("payment_type, status, amount, metadata")
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

    if (contract.payment_structure === "custom") {
      const schedule = normalizePaymentSchedule(contract.payment_schedule);
      if (schedule.length < 2 || getScheduleTotal(schedule) !== 100) {
        return NextResponse.json(
          { error: "This contract has an invalid payment schedule" },
          { status: 400 }
        );
      }

      const paidMilestoneIds = new Set(
        (existingPayments || [])
          .filter((payment) => payment.payment_type === "installment")
          .map((payment) => {
            const metadata = payment.metadata as Record<string, unknown> | null;
            return typeof metadata?.payment_milestone_id === "string"
              ? metadata.payment_milestone_id
              : null;
          })
          .filter((milestoneId): milestoneId is string => Boolean(milestoneId))
      );
      const nextMilestoneIndex = schedule.findIndex(
        (milestone) => !paidMilestoneIds.has(milestone.id)
      );

      if (nextMilestoneIndex === -1) {
        return NextResponse.json(
          { error: "Payment has already been completed" },
          { status: 400 }
        );
      }

      const nextMilestone = schedule[nextMilestoneIndex];
      if (requestedMilestoneId && requestedMilestoneId !== nextMilestone.id) {
        return NextResponse.json(
          {
            error: "Payment stages must be completed in order",
            nextMilestoneId: nextMilestone.id,
          },
          { status: 400 }
        );
      }

      activeMilestone = { ...nextMilestone, index: nextMilestoneIndex };
      paymentAmount = getMilestoneAmount(totalAmount, schedule, nextMilestoneIndex);
      paymentType = "installment";
      paymentDescription = `${nextMilestone.label} (${nextMilestone.percentage}%) for: ${contract.title}`;
    } else if (contract.payment_structure === "deposit_balance") {
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

    // Destination charges must always have a real payout destination. Creating
    // a PaymentIntent without transfer_data would collect the customer's money
    // into Lexport's platform balance with no automated way to pay the contract
    // owner. Fail closed until the owner has completed Stripe Connect.
    const { data: contractOwner, error: contractOwnerError } = await supabase
      .from("users")
      .select("stripe_connect_account_id, stripe_connect_status, subscription_tier")
      .eq("id", contract.user_id)
      .single();

    if (
      contractOwnerError ||
      !contractOwner?.stripe_connect_account_id ||
      contractOwner.stripe_connect_status !== "active"
    ) {
      return NextResponse.json(
        {
          error:
            "Online payment is not available yet. The contract owner must finish Stripe payout setup before accepting payment.",
          code: "CONNECT_ACCOUNT_REQUIRED",
        },
        { status: 409 }
      );
    }

    const connectedAccountId = contractOwner.stripe_connect_account_id;

    // Check for existing valid payment intent for this payment type
    const { data: pendingPayments } = await supabase
      .from("payments")
      .select("stripe_payment_intent_id, metadata")
      .eq("contract_id", id)
      .eq("payment_type", paymentType)
      .eq("status", "pending");

    const existingPayment = pendingPayments?.find((payment) => {
      const metadata = payment.metadata as Record<string, unknown> | null;
      const isSameDestination =
        metadata?.connected_account_id === connectedAccountId;
      if (!isSameDestination) return false;
      if (!activeMilestone) return true;
      return metadata?.payment_milestone_id === activeMilestone.id;
    });

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
            contractTitle: contract.title,
            paymentType,
            totalAmount,
            depositPaid,
            milestone: activeMilestone,
            balanceRemaining: contract.payment_structure === "custom"
              ? Math.max(
                  0,
                  totalAmount -
                    (existingPayments || []).reduce(
                      (sum, payment) => sum + payment.amount,
                      0
                    ) -
                    existingIntent.amount
                )
              : contract.payment_structure === "deposit_balance" && !depositPaid
                ? totalAmount - existingIntent.amount
                : 0,
          });
        }
      } catch {
        console.log("Could not retrieve existing payment intent, creating new one");
      }
    }

    // Determine subscription tier for platform fee calculation.
    // BILLING-3: use subscription_tier (free|pro|team), NOT subscription_status
    // (active|past_due|...), so Pro/Team sellers get their reduced fee.
    const subscriptionTier: SubscriptionTier =
      (contractOwner?.subscription_tier as SubscriptionTier) || "free";

    const { paymentMethodTypes, paymentMethodOptions } =
      getPaymentMethodConfiguration(currency);

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
        ...(activeMilestone
          ? {
              payment_milestone_id: activeMilestone.id,
              payment_milestone_index: activeMilestone.index.toString(),
              payment_milestone_label: activeMilestone.label,
            }
          : {}),
      },
      description: paymentDescription,
      payment_method_types: paymentMethodTypes,
      ...(paymentMethodOptions
        ? { payment_method_options: paymentMethodOptions }
        : {}),
    };

    // Every new charge is a destination charge. A zero-fee tier still carries
    // transfer_data so the seller, never the platform, receives the funds.
    const platformFee = calculatePlatformFee(paymentAmount, subscriptionTier);
    if (platformFee > 0) {
      paymentIntentOptions.application_fee_amount = platformFee;
    }
    paymentIntentOptions.transfer_data = { destination: connectedAccountId };
    paymentIntentOptions.metadata.connected_account_id = connectedAccountId;
    paymentIntentOptions.metadata.platform_fee = platformFee.toString();
    paymentIntentOptions.metadata.platform_fee_percent = getPlatformFeePercent(subscriptionTier).toString();
    paymentIntentOptions.metadata.subscription_tier = subscriptionTier;

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentOptions);

    // Calculate platform fee for tracking
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
        connected_account_id: connectedAccountId,
        total_amount: totalAmount,
        deposit_percentage: depositPercentage,
        ...(activeMilestone
          ? {
              payment_milestone_id: activeMilestone.id,
              payment_milestone_index: activeMilestone.index,
              payment_milestone_label: activeMilestone.label,
              payment_milestone_percentage: activeMilestone.percentage,
            }
          : {}),
      },
    });

    // Update contract with payment intent ID (only for first payment or full payment)
    if (paymentType === "full" || paymentType === "deposit" || paymentType === "installment") {
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
      contractTitle: contract.title,
      paymentType,
      totalAmount,
      depositPaid,
      milestone: activeMilestone,
      balanceRemaining: contract.payment_structure === "deposit_balance" && !depositPaid
        ? totalAmount - paymentAmount
        : contract.payment_structure === "custom"
          ? Math.max(
              0,
              totalAmount -
                (existingPayments || []).reduce(
                  (sum, payment) => sum + payment.amount,
                  0
                ) -
                paymentAmount
            )
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
    const supabase = createAdminClient();

    const { data: contract, error } = await supabase
      .from("contracts")
      .select("payment_required, payment_amount, payment_currency, payment_status, stripe_payment_intent_id, payment_structure, deposit_percentage, payment_schedule")
      .eq("id", id)
      .single();

    if (error || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Get all payments for this contract
    const { data: payments } = await supabase
      .from("payments")
      .select("id, payment_type, status, amount, created_at, metadata")
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
    let nextMilestone: (ReturnType<typeof normalizePaymentSchedule>[number] & { index: number }) | null = null;
    const customSchedule = normalizePaymentSchedule(contract.payment_schedule);

    if (contract.payment_structure === "custom") {
      const paidMilestoneIds = new Set(
        (payments || [])
          .filter(
            (payment) =>
              payment.payment_type === "installment" && payment.status === "succeeded"
          )
          .map((payment) => {
            const metadata = payment.metadata as Record<string, unknown> | null;
            return typeof metadata?.payment_milestone_id === "string"
              ? metadata.payment_milestone_id
              : null;
          })
          .filter((milestoneId): milestoneId is string => Boolean(milestoneId))
      );
      const nextIndex = customSchedule.findIndex(
        (milestone) => !paidMilestoneIds.has(milestone.id)
      );
      if (nextIndex >= 0) {
        nextMilestone = { ...customSchedule[nextIndex], index: nextIndex };
        nextPaymentType = "installment";
        nextPaymentAmount = getMilestoneAmount(
          totalAmount,
          customSchedule,
          nextIndex
        );
      }
    } else if (contract.payment_structure === "deposit_balance") {
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
      } : contract.payment_structure === "custom" ? {
        milestones: customSchedule.map((milestone, index) => {
          const payment = payments?.find((candidate) => {
            const metadata = candidate.metadata as Record<string, unknown> | null;
            return candidate.status === "succeeded" &&
              metadata?.payment_milestone_id === milestone.id;
          });
          return {
            ...milestone,
            amount: getMilestoneAmount(totalAmount, customSchedule, index),
            paid: Boolean(payment),
            paymentId: payment?.id || null,
            paymentDate: payment?.created_at || null,
          };
        }),
      } : null,
      // Next payment info
      nextPayment: nextPaymentType ? {
        type: nextPaymentType,
        amount: nextPaymentAmount,
        milestone: nextMilestone,
      } : null,
      // All completed
      fullyPaid: contract.payment_status === "succeeded" ||
        (fullPayment?.status === "succeeded") ||
        (depositPayment?.status === "succeeded" && balancePayment?.status === "succeeded") ||
        (contract.payment_structure === "custom" && nextMilestone === null && customSchedule.length > 0),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get payment status" },
      { status: 500 }
    );
  }
}

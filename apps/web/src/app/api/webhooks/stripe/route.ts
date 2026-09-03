import { NextRequest, NextResponse } from "next/server";
import { stripe, STRIPE_WEBHOOK_SECRET, getAccountStatus } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPaymentReceiptEmail } from "@/lib/email";
import { getPublicInvoicePdfUrl } from "@/lib/invoices/payment-link";
import Stripe from "stripe";
import type { InvoiceLineItem, PaymentType } from "@/db/types";
import { normalizeInvoiceBankDetails } from "@/lib/invoices/bank-details";

// Generate invoice number
function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `INV-${year}${month}-${random}`;
}

// Get payment type label for invoice
function getPaymentTypeLabel(paymentType: PaymentType): string {
  switch (paymentType) {
    case "deposit":
      return "Deposit Payment";
    case "balance":
      return "Balance Payment";
    case "installment":
      return "Milestone Payment";
    case "full":
    default:
      return "Full Payment";
  }
}

// Auto-create invoice after successful payment
async function createInvoiceForPayment(
  supabase: ReturnType<typeof createAdminClient>,
  paymentIntentId: string,
  payerEmail: string | null,
  payerName: string | null
) {
  try {
    // Get payment details
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("id, contract_id, user_id, amount, currency, payment_type, metadata")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .single();

    if (paymentError || !payment) {
      console.error("Could not find payment for invoice creation:", paymentError);
      return null;
    }

    // Check if invoice already exists for this payment
    const { data: existingInvoice } = await supabase
      .from("invoices")
      .select("id")
      .eq("payment_id", payment.id)
      .single();

    if (existingInvoice) {
      console.log(`Invoice already exists for payment ${payment.id}`);
      return existingInvoice.id;
    }

    // Get contract details
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, title, user_id")
      .eq("id", payment.contract_id)
      .single();

    if (contractError || !contract) {
      console.error("Could not find contract for invoice creation:", contractError);
      return null;
    }

    // Get user info for sender details
    const { data: userData } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", contract.user_id)
      .single();
    const { data: invoiceSettings } = await supabase
      .from("invoice_settings")
      .select("company_name, company_address, company_logo_url, bank_details")
      .eq("user_id", contract.user_id)
      .maybeSingle();
    const bankDetails = normalizeInvoiceBankDetails(invoiceSettings?.bank_details);

    // Create line items with payment type description
    const milestoneLabel = typeof payment.metadata?.payment_milestone_label === "string"
      ? payment.metadata.payment_milestone_label
      : null;
    const paymentTypeLabel =
      milestoneLabel || getPaymentTypeLabel(payment.payment_type as PaymentType);
    const lineItems: InvoiceLineItem[] = [
      {
        description: `${paymentTypeLabel} - ${contract.title}`,
        quantity: 1,
        unit_price: payment.amount,
        amount: payment.amount,
      },
    ];

    // Create invoice marked as paid (since payment succeeded)
    const invoiceData = {
      contract_id: payment.contract_id,
      payment_id: payment.id,
      user_id: contract.user_id,
      invoice_number: generateInvoiceNumber(),
      amount: payment.amount,
      currency: payment.currency,
      status: "paid" as const,
      line_items: lineItems,
      subtotal: payment.amount,
      tax_amount: 0,
      total: payment.amount,
      due_date: new Date().toISOString(), // Already paid, so due date is now
      paid_at: new Date().toISOString(),
      sent_at: new Date().toISOString(),
      recipient_name: payerName,
      recipient_email: payerEmail,
      recipient_address: null,
      sender_name: userData?.name || null,
      sender_company: invoiceSettings?.company_name || null,
      sender_email: userData?.email || null,
      sender_logo_url: invoiceSettings?.company_logo_url || null,
      sender_address:
        invoiceSettings?.company_address || invoiceSettings?.company_name || bankDetails
          ? {
              address: invoiceSettings?.company_address || null,
              company: invoiceSettings?.company_name || null,
              bank_details: bankDetails,
            }
          : null,
      bank_details: bankDetails,
      notes: `Auto-generated receipt for ${paymentTypeLabel.toLowerCase()}`,
    };

    const { data: invoice, error: insertError } = await supabase
      .from("invoices")
      .insert(invoiceData)
      .select()
      .single();

    if (insertError) {
      console.error("Error creating auto-invoice:", insertError);
      return null;
    }

    console.log(`Auto-created invoice ${invoice.invoice_number} for ${paymentTypeLabel}`);

    // Log audit event
    const { error: auditError } = await supabase.from("audit_logs").insert({
      contract_id: payment.contract_id,
      user_id: contract.user_id,
      event_type: "invoice_created",
      ip_address: "webhook",
      user_agent: "stripe-webhook",
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        payment_type: payment.payment_type,
        amount: invoice.amount,
        currency: invoice.currency,
        auto_created: true,
      },
    });

    if (auditError) {
      console.error("Failed to insert auto-created invoice audit log:", auditError);
    }

    // Send receipt email to payer if we have their email
    if (payerEmail) {
      try {
        const invoiceUrl = getPublicInvoicePdfUrl(invoice.id);

        await sendPaymentReceiptEmail({
          to: payerEmail,
          recipientName: payerName || "Valued Customer",
          contractTitle: contract.title,
          invoiceNumber: invoice.invoice_number,
          amount: invoice.amount,
          currency: invoice.currency,
          paymentType: payment.payment_type as PaymentType,
          paidAt: invoice.paid_at || new Date().toISOString(),
          invoiceUrl,
          senderName: userData?.name || undefined,
          senderEmail: userData?.email || undefined,
        });

        console.log(`Payment receipt email sent to ${payerEmail}`);

        // Update invoice to mark as sent
        await supabase
          .from("invoices")
          .update({ sent_at: new Date().toISOString() })
          .eq("id", invoice.id);
      } catch (emailError) {
        // Log but don't fail the webhook if email fails
        console.error("Failed to send payment receipt email:", emailError);
      }
    }

    return invoice.id;
  } catch (error) {
    console.error("Error in createInvoiceForPayment:", error);
    return null;
  }
}

// Helper to update both payments and contracts tables
async function updatePaymentStatus(
  supabase: ReturnType<typeof createAdminClient>,
  paymentIntentId: string,
  status: string,
  additionalData?: Record<string, unknown>
) {
  // Update payments table
  const paymentUpdate: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
    ...additionalData,
  };
  await supabase
    .from("payments")
    .update(paymentUpdate)
    .eq("stripe_payment_intent_id", paymentIntentId);

  // Split payments remain pending until the full contract value is collected.
  const { data: payment } = await supabase
    .from("payments")
    .select("contract_id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .single();

  if (payment?.contract_id) {
    let contractPaymentStatus = status;
    if (status === "succeeded") {
      const [{ data: contract }, { data: successfulPayments }] = await Promise.all([
        supabase
          .from("contracts")
          .select("payment_amount")
          .eq("id", payment.contract_id)
          .single(),
        supabase
          .from("payments")
          .select("amount")
          .eq("contract_id", payment.contract_id)
          .eq("status", "succeeded"),
      ]);
      const totalDue = Math.round((contract?.payment_amount || 0) * 100);
      const totalPaid = (successfulPayments || []).reduce(
        (sum, completedPayment) => sum + completedPayment.amount,
        0
      );
      contractPaymentStatus =
        totalDue > 0 && totalPaid >= totalDue ? "succeeded" : "pending";
    }

    await supabase
      .from("contracts")
      .update({
        payment_status: contractPaymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.contract_id);
  }

  return payment?.contract_id;
}

// ===== Subscription helpers (consolidated from /api/billing/webhook) =====

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
  const { error: rpcError } = await supabase.rpc("set_subscription_tier", {
    user_uuid: userId,
    new_tier: tier,
    new_status: status,
  });

  if (rpcError) {
    console.error(`[webhook] RPC set_subscription_tier failed for user ${userId}:`, rpcError);

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
 * Throws on failure so the webhook returns 500 and Stripe retries.
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
  // Set once we successfully claim a Stripe event id (BILLING-4 idempotency);
  // invoked from the catch below if the handler throws so Stripe's retry can
  // reprocess the event instead of it being permanently de-duped.
  let releaseClaim: (() => Promise<void>) | null = null;
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

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

    // ===== Idempotency / event de-dup (BILLING-4) =====
    // Claim this event id before running any side effects (receipt emails,
    // subscription writes, audit logs). Stripe retries on any slow/non-2xx
    // response, so a replayed delivery of the same event.id must be a no-op.
    // The claim is released in the catch below if the handler throws, so
    // genuine processing failures are still retried by Stripe.
    const { error: claimError } = await supabase
      .from("stripe_webhook_events")
      .insert({ event_id: event.id, event_type: event.type });

    if (!claimError) {
      releaseClaim = async () => {
        await supabase
          .from("stripe_webhook_events")
          .delete()
          .eq("event_id", event.id);
      };
    } else if (claimError.code === "23505") {
      // Unique-violation => this event was already processed (or is in-flight).
      console.log(`Duplicate Stripe event ${event.id} (${event.type}) ignored`);
      return NextResponse.json({ received: true, duplicate: true });
    } else {
      // Idempotency ledger unavailable (e.g. migration not yet applied). Log and
      // continue so the webhook keeps functioning; de-dup is simply skipped.
      console.error(`Could not record Stripe event ${event.id} for idempotency:`, claimError);
    }

    switch (event.type) {
      // ===== Payment Events =====
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const contractId = paymentIntent.metadata.contract_id;
        const invoiceId = paymentIntent.metadata.invoice_id;
        const paymentType = paymentIntent.metadata.type;

        // Get charge details for payment method info
        const charges = paymentIntent.latest_charge
          ? await stripe.charges.retrieve(paymentIntent.latest_charge as string)
          : null;

        const paymentMethod = charges?.payment_method_details?.type || "card";
        const payerEmail = charges?.billing_details?.email || null;
        const payerName = charges?.billing_details?.name || null;

        // Handle standalone invoice payments
      if (paymentType === "standalone_invoice" && invoiceId) {
        const paidAt = new Date().toISOString();

        // BILLING-4: atomically flip ONLY rows that are not already paid and
        // return the affected ids. If nothing transitioned, this is a replay/
        // retry — short-circuit so the receipt email and audit log don't fire
        // twice. This guards the high-impact side effect even if the event-id
        // claim above was skipped (e.g. ledger table missing).
        const { data: transitioned, error: updateError } = await supabase
          .from("invoices")
          .update({
            status: "paid",
            paid_at: paidAt,
            payment_method: paymentMethod,
            payment_reference: charges?.id || paymentIntent.id,
            updated_at: paidAt,
          })
          .eq("id", invoiceId)
          .neq("status", "paid")
          .select("id");

          if (updateError) {
            throw new Error(
              `Failed to update invoice ${invoiceId}: ${updateError.message}`
            );
          } else if (!transitioned || transitioned.length === 0) {
            console.log(`Standalone invoice ${invoiceId} already paid; skipping duplicate receipt/audit`);
            break;
          } else {
            console.log(`Standalone invoice ${invoiceId} marked as paid via ${paymentMethod}`);
          }

          // Create audit log for invoice payment
          const { data: invoice } = await supabase
            .from("invoices")
            .select("user_id, contract_id, payment_id, invoice_number, recipient_name, recipient_email, sender_name, sender_email, line_items, total, amount, currency, paid_at")
            .eq("id", invoiceId)
            .single();

          if (invoice) {
            let receiptPaymentType: PaymentType = "full";
            if (invoice.payment_id) {
              const { data: linkedPayment } = await supabase
                .from("payments")
                .select("payment_type")
                .eq("id", invoice.payment_id)
                .maybeSingle();

              if (linkedPayment?.payment_type) {
                receiptPaymentType = linkedPayment.payment_type as PaymentType;
              }

              await updatePaymentStatus(supabase, paymentIntent.id, "succeeded", {
                payment_method: paymentMethod,
                payer_email: payerEmail || invoice.recipient_email,
                payer_name: payerName || invoice.recipient_name,
                stripe_charge_id: charges?.id || null,
                net_amount:
                  paymentIntent.amount -
                  (paymentIntent.application_fee_amount || 0),
              });
            }

            const { error: auditError } = await supabase.from("audit_logs").insert({
              contract_id: invoice.contract_id,
              user_id: invoice.user_id,
              event_type: "invoice_paid",
              ip_address: "webhook",
              user_agent: "stripe-webhook",
              metadata: {
                invoice_id: invoiceId,
                invoice_number: invoice.invoice_number,
                payment_intent_id: paymentIntent.id,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                payment_method: paymentMethod,
                payer_email: payerEmail,
                payer_name: payerName,
              },
            });

            if (auditError) {
              console.error(`Failed to insert invoice_paid audit log for invoice ${invoiceId}:`, auditError);
            }

            const receiptEmail = payerEmail || invoice.recipient_email;
            if (receiptEmail) {
              const firstLineItem = Array.isArray(invoice.line_items)
                ? invoice.line_items.find(
                    (item): item is { description?: string } =>
                      typeof item === "object" && item !== null
                  )
                : null;
              const receiptReference =
                typeof firstLineItem?.description === "string" && firstLineItem.description.trim().length > 0
                  ? firstLineItem.description
                  : `Invoice ${invoice.invoice_number}`;

              try {
                await sendPaymentReceiptEmail({
                  to: receiptEmail,
                  recipientName:
                    payerName ||
                    invoice.recipient_name ||
                    "Valued Customer",
                  contractTitle: receiptReference,
                  invoiceNumber: invoice.invoice_number,
                  amount: invoice.total ?? invoice.amount ?? paymentIntent.amount,
                  currency: invoice.currency || paymentIntent.currency,
                  paymentType: receiptPaymentType,
                  paidAt: invoice.paid_at || paidAt,
                  invoiceUrl: getPublicInvoicePdfUrl(invoiceId),
                  senderName: invoice.sender_name || undefined,
                  senderEmail: invoice.sender_email || undefined,
                });

                console.log(`Standalone invoice payment receipt email sent to ${receiptEmail}`);
              } catch (emailError) {
                console.error(
                  `Failed to send standalone invoice payment receipt email to ${receiptEmail}:`,
                  emailError
                );
              }
            }
          }
        }
        // Handle contract-linked payments
        else if (contractId) {
          // Update both payments and contracts tables
          await updatePaymentStatus(supabase, paymentIntent.id, "succeeded", {
            payment_method: paymentMethod,
            payer_email: payerEmail,
            payer_name: payerName,
            stripe_charge_id: charges?.id || null,
            net_amount:
              paymentIntent.amount -
              (paymentIntent.application_fee_amount || 0),
          });

          console.log(
            `Payment succeeded for contract ${contractId} via ${paymentMethod}`
          );

          // Auto-create invoice for this payment (receipt)
          const autoInvoiceId = await createInvoiceForPayment(
            supabase,
            paymentIntent.id,
            payerEmail,
            payerName
          );

          // Create audit log
          await supabase.from("audit_logs").insert({
            contract_id: contractId,
            event_type: "payment_completed" as unknown as string,
            ip_address: "webhook",
            user_agent: "stripe-webhook",
            metadata: {
              payment_intent_id: paymentIntent.id,
              amount: paymentIntent.amount,
              currency: paymentIntent.currency,
              payment_method: paymentMethod,
              auto_invoice_id: autoInvoiceId,
            },
          });
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const lastError = paymentIntent.last_payment_error;

        const contractId = await updatePaymentStatus(
          supabase,
          paymentIntent.id,
          "failed",
          {
            failure_code: lastError?.code || null,
            failure_message: lastError?.message || null,
          }
        );

        if (contractId) {
          console.log(`Payment failed for contract ${contractId}`);

          // Create audit log
          await supabase.from("audit_logs").insert({
            contract_id: contractId,
            event_type: "payment_failed" as unknown as string,
            ip_address: "webhook",
            user_agent: "stripe-webhook",
            metadata: {
              payment_intent_id: paymentIntent.id,
              error_code: lastError?.code,
              error_message: lastError?.message,
            },
          });
        }
        break;
      }

      case "payment_intent.processing": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await updatePaymentStatus(supabase, paymentIntent.id, "processing");
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string;

        if (paymentIntentId) {
          const contractId = await updatePaymentStatus(
            supabase,
            paymentIntentId,
            "refunded",
            {
              refunded_amount: charge.amount_refunded,
            }
          );

          if (contractId) {
            console.log(`Payment refunded for contract ${contractId}`);

            // Create audit log
            await supabase.from("audit_logs").insert({
              contract_id: contractId,
              event_type: "payment_refunded" as unknown as string,
              ip_address: "webhook",
              user_agent: "stripe-webhook",
              metadata: {
                charge_id: charge.id,
                amount_refunded: charge.amount_refunded,
              },
            });
          }
        }
        break;
      }

      // ===== Checkout Events =====
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // ----- Subscription purchases (consolidated from /api/billing/webhook) -----
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          // checkout sets user_id for individual / organization_id for org;
          // created_by_user_id is a fallback for org subscriptions.
          const subUserId =
            subscription.metadata.user_id || subscription.metadata.created_by_user_id;
          const organizationId = subscription.metadata.organization_id;
          const planId = subscription.metadata.plan_id as "pro" | "team" | undefined;

          console.log(
            `[webhook] checkout.session.completed (subscription): userId=${subUserId}, orgId=${organizationId}, planId=${planId}, subId=${subscription.id}`
          );

          if (!planId) {
            // Retrying won't fix missing metadata — log and move on.
            console.error(`[webhook] No plan_id in subscription metadata:`, subscription.metadata);
          } else if (organizationId) {
            await setOrgSubscription(supabase, organizationId, planId, "active");

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

            if (subUserId) {
              const { error } = await supabase
                .from("users")
                .update({ stripe_customer_id: subscription.customer as string })
                .eq("id", subUserId);
              if (error) console.error(`[webhook] Failed to update user stripe_customer_id:`, error);
            }
          } else if (subUserId) {
            await setUserSubscription(supabase, subUserId, planId, "active");

            const { error: userUpdateError } = await supabase
              .from("users")
              .update({
                stripe_subscription_id: subscription.id,
                stripe_customer_id: subscription.customer as string,
                subscription_started_at: new Date().toISOString(),
              })
              .eq("id", subUserId);
            if (userUpdateError) {
              console.error(`[webhook] Failed to update user stripe IDs:`, userUpdateError);
            }
          } else {
            console.error(`[webhook] checkout.session.completed: no userId or orgId in metadata:`, subscription.metadata);
          }
        }

        // ----- One-time template purchases -----
        const type = session.metadata?.type;
        const userId = session.metadata?.user_id;
        const templateId = session.metadata?.template_id;

        if (type === "template_purchase" && userId && templateId) {
          console.log(`Processing template purchase for user ${userId}, template ${templateId}`);

          // Update purchase record to succeeded
          const { error: updateError } = await supabase
            .from("template_purchases")
            .update({
              status: "succeeded",
              stripe_payment_intent_id: session.payment_intent as string,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId)
            .eq("template_id", templateId)
            // We match pending or failed, or just update by user/template to be sure
            // But ideally we match the pending record.
            // Since we might not have the ID, user/template combo is unique per purchase usually?
            // Or maybe we should allow re-purchasing if failed?
            // Let's assume user+template is unique for "ownership".
            ;

          if (updateError) {
            // If record doesn't exist (maybe created via webhook?), insert it
            // But the POST endpoint creates it as pending.
            console.error("Error updating template purchase:", updateError);

            // Fallback: upsert check
            const { error: upsertError } = await supabase
              .from("template_purchases")
              .upsert({
                user_id: userId,
                template_id: templateId,
                stripe_payment_intent_id: session.payment_intent as string,
                amount: session.amount_total || 0,
                status: "succeeded",
                purchased_at: new Date().toISOString(),
              }, { onConflict: "user_id,template_id" });

            if (upsertError) {
              console.error("CRITICAL: Failed to fulfill template purchase:", upsertError);
            }
          } else {
            console.log(`Template ${templateId} purchased successfully by user ${userId}`);
          }

          // Create audit log
          await supabase.from("audit_logs").insert({
            user_id: userId,
            event_type: "template_purchased" as unknown as string,
            ip_address: "webhook",
            user_agent: "stripe-webhook",
            metadata: {
              template_id: templateId,
              amount: session.amount_total,
              currency: session.currency,
              payment_intent_id: session.payment_intent,
            },
          });
        }
        break;
      }

      // ===== Subscription Lifecycle (consolidated from /api/billing/webhook) =====
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

        if (organizationId) {
          await setOrgSubscription(supabase, organizationId, tier, status);
        } else if (userId) {
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
        } else if (userId) {
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

          if (organizationId) {
            const { error } = await supabase
              .from("organizations")
              .update({ subscription_status: "past_due" })
              .eq("id", organizationId);
            if (error) console.error(`[webhook] Failed to set org past_due:`, error);
          } else if (userId) {
            const { error } = await supabase
              .from("users")
              .update({ subscription_status: "past_due" })
              .eq("id", userId);
            if (error) console.error(`[webhook] Failed to set user past_due:`, error);
          }
        }
        break;
      }

      // ===== Connect Account Events =====
      case "account.updated": {
        const account = event.data.object as Stripe.Account;

        // Find user with this Connect account
        const { data: user } = await supabase
          .from("users")
          .select("id")
          .eq("stripe_connect_account_id", account.id)
          .single();

        if (user) {
          const status = getAccountStatus(account);

          await supabase
            .from("users")
            .update({
              stripe_connect_status: status,
              stripe_connect_onboarding_complete: account.details_submitted,
              updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);

          console.log(
            `Connect account ${account.id} updated to status: ${status}`
          );
        }
        break;
      }

      case "account.application.deauthorized": {
        const application = event.data.object as Stripe.Application;
        // When a connected account deauthorizes our app
        console.log(`Connect account deauthorized: ${application.id}`);

        // Note: We can't easily find the user here since the event
        // doesn't include the account ID. The user would need to
        // manually disconnect in our UI.
        break;
      }

      // ===== Payout Events (for monitoring) =====
      case "payout.paid": {
        const payout = event.data.object as Stripe.Payout;
        console.log(
          `Payout completed: ${payout.id}, amount: ${payout.amount} ${payout.currency}`
        );
        break;
      }

      case "payout.failed": {
        const payout = event.data.object as Stripe.Payout;
        console.error(
          `Payout failed: ${payout.id}, reason: ${payout.failure_message}`
        );
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // BILLING-4: release the idempotency claim so Stripe's retry can reprocess
    // this event (otherwise a failed event would be permanently de-duped).
    if (releaseClaim) {
      try {
        await releaseClaim();
      } catch (cleanupError) {
        console.error("Failed to release webhook idempotency claim:", cleanupError);
      }
    }
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

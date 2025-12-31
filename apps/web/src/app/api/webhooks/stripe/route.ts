import { NextRequest, NextResponse } from "next/server";
import { stripe, STRIPE_WEBHOOK_SECRET, getAccountStatus } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { sendPaymentReceiptEmail } from "@/lib/email";
import Stripe from "stripe";
import type { InvoiceLineItem, PaymentType } from "@/db/types";

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
    case "full":
    default:
      return "Full Payment";
  }
}

// Auto-create invoice after successful payment
async function createInvoiceForPayment(
  supabase: Awaited<ReturnType<typeof createClient>>,
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

    // Create line items with payment type description
    const paymentTypeLabel = getPaymentTypeLabel(payment.payment_type as PaymentType);
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
      sender_email: userData?.email || null,
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
    await supabase.from("audit_logs").insert({
      contract_id: payment.contract_id,
      user_id: contract.user_id,
      event_type: "invoice_auto_created",
      ip_address: "webhook",
      user_agent: "stripe-webhook",
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        payment_type: payment.payment_type,
        amount: invoice.amount,
        currency: invoice.currency,
      },
    });

    // Send receipt email to payer if we have their email
    if (payerEmail) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lexportai.com";
        const invoiceUrl = `${baseUrl}/api/invoices/${invoice.id}?format=pdf`;

        await sendPaymentReceiptEmail({
          to: payerEmail,
          recipientName: payerName || "Valued Customer",
          contractTitle: contract.title,
          invoiceNumber: invoice.invoice_number,
          amount: invoice.amount,
          currency: invoice.currency,
          paymentType: payment.payment_type as "deposit" | "balance" | "full",
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
  supabase: Awaited<ReturnType<typeof createClient>>,
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

  // Find and update contract
  const { data: payment } = await supabase
    .from("payments")
    .select("contract_id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .single();

  if (payment?.contract_id) {
    await supabase
      .from("contracts")
      .update({
        payment_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.contract_id);
  }

  return payment?.contract_id;
}

export async function POST(request: NextRequest) {
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

    const supabase = await createClient();

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
          // Update invoice status to paid
          const { error: updateError } = await supabase
            .from("invoices")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", invoiceId);

          if (updateError) {
            console.error(`Failed to update invoice ${invoiceId} status:`, updateError);
          } else {
            console.log(`Standalone invoice ${invoiceId} marked as paid via ${paymentMethod}`);
          }

          // Create audit log for invoice payment
          const { data: invoice } = await supabase
            .from("invoices")
            .select("user_id, contract_id, invoice_number")
            .eq("id", invoiceId)
            .single();

          if (invoice) {
            await supabase.from("audit_logs").insert({
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
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

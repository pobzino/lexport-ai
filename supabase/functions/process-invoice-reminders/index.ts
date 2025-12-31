// Supabase Edge Function: process-invoice-reminders
// Processes payment reminders for unpaid invoices
// Designed to be called via Supabase scheduled functions (cron) every hour

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Brand colors matching the main app
const BRAND = {
  navy: "#202e46",
  blue: "#529ec6",
  emerald: "#10b981",
  slate: "#64748b",
  lightSlate: "#f1f5f9",
};

// Email wrapper with Lexport branding
const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; background-color: #f8fafc; margin: 0; padding: 0;">
  <!-- Full-width Header -->
  <div style="background: linear-gradient(135deg, ${BRAND.navy} 0%, #2a3a54 100%); padding: 28px 20px; text-align: center;">
    <div style="display: inline-block;">
      <span style="color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -1px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Lex</span><span style="color: ${BRAND.blue}; font-size: 28px; font-weight: 700; letter-spacing: -1px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">port</span>
    </div>
  </div>

  <div style="max-width: 600px; margin: 0 auto; padding: 32px 20px;">
    <!-- Main Content Card -->
    <div style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
      ${content}
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px; font-size: 13px; color: ${BRAND.slate};">
      <p style="margin: 0 0 8px;">Powered by <a href="https://lexportai.com" style="color: ${BRAND.blue}; text-decoration: none; font-weight: 500;">Lexport</a></p>
      <p style="margin: 0; font-size: 12px; color: #94a3b8;">AI-powered contracts & e-signatures for modern businesses</p>
    </div>
  </div>
</body>
</html>
`;

// Primary button style
const primaryButton = (href: string, text: string) => `
<div style="text-align: center; margin: 32px 0;">
  <a href="${href}" style="display: inline-block; background: linear-gradient(135deg, ${BRAND.emerald} 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(16, 185, 129, 0.4);">${text}</a>
</div>
`;

interface Invoice {
  id: string;
  invoice_number: string;
  recipient_name: string;
  recipient_email: string;
  total: number;
  amount: number;
  currency: string;
  status: string;
  due_date: string | null;
  reminder_enabled: boolean;
  reminder_interval_days: number;
  next_reminder_at: string;
  reminder_count: number;
  max_reminders: number;
  contract_id: string | null;
  user_id: string;
}

interface ReminderResult {
  invoiceId: string;
  invoiceNumber: string;
  recipientEmail: string;
  success: boolean;
  error?: string;
  emailId?: string;
}

// Format currency for display
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

// Determine reminder type based on count and max
function getReminderType(count: number, max: number): "first" | "second" | "final" {
  if (count === 0) return "first";
  if (count >= max - 1) return "final";
  return "second";
}

// Build the invoice reminder email HTML
function buildReminderEmailHtml(
  recipientName: string,
  invoiceNumber: string,
  amount: number,
  currency: string,
  dueDate: string | null,
  paymentUrl: string,
  reminderType: "first" | "second" | "final",
  reminderNumber: number
): string {
  const formattedAmount = formatCurrency(amount, currency);
  const formattedDueDate = dueDate
    ? new Date(dueDate).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const isOverdue = dueDate ? new Date(dueDate) < new Date() : false;

  // Urgency styling based on reminder type
  const urgencyConfig = {
    first: {
      bgColor: `${BRAND.blue}10`,
      borderColor: BRAND.blue,
      textColor: BRAND.navy,
      label: "Payment Reminder",
      emoji: "📋",
      urgencyText: "",
    },
    second: {
      bgColor: "#fffbeb",
      borderColor: "#f59e0b",
      textColor: "#92400e",
      label: "Payment Reminder",
      emoji: "⏰",
      urgencyText: "This is a friendly reminder that your payment is coming due soon.",
    },
    final: {
      bgColor: "#fef2f2",
      borderColor: "#ef4444",
      textColor: "#991b1b",
      label: "Final Payment Reminder",
      emoji: "🚨",
      urgencyText: "This is your final reminder. Please complete your payment to avoid any service interruptions.",
    },
  };

  const config = urgencyConfig[reminderType];

  const overdueWarning = isOverdue
    ? `
    <div style="background-color: #fef2f2; border-radius: 10px; padding: 16px; margin: 16px 0; border-left: 4px solid #ef4444;">
      <p style="margin: 0; font-size: 14px; color: #991b1b;">
        <strong>⚠️ Overdue:</strong> This invoice was due on ${formattedDueDate}. Please make your payment as soon as possible.
      </p>
    </div>
    `
    : "";

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background-color: ${config.bgColor}; color: ${config.textColor}; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;">${config.emoji} ${config.label}${reminderNumber > 1 ? ` #${reminderNumber}` : ""}</span>
    </div>

    <h2 style="color: ${BRAND.navy}; font-size: 22px; margin: 0 0 20px; text-align: center;">Payment Due</h2>

    <p style="margin: 16px 0; color: #475569;">Hi ${recipientName},</p>

    <p style="margin: 16px 0; color: #475569;">
      ${config.urgencyText ? config.urgencyText + " " : ""}You have an outstanding invoice that requires your attention:
    </p>

    <!-- Invoice Summary -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; color: #475569; font-size: 14px;">Invoice Number</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 600; color: ${BRAND.navy};">${invoiceNumber}</td>
        </tr>
        ${formattedDueDate ? `
        <tr>
          <td style="padding: 10px 0; color: #475569; font-size: 14px;">Due Date</td>
          <td style="padding: 10px 0; text-align: right; color: ${isOverdue ? "#ef4444" : BRAND.navy}; font-weight: ${isOverdue ? "600" : "400"};">${formattedDueDate}${isOverdue ? " (Overdue)" : ""}</td>
        </tr>
        ` : ""}
        <tr style="border-top: 2px solid #e2e8f0;">
          <td style="padding: 16px 0 8px; color: ${BRAND.navy}; font-size: 16px; font-weight: 600;">Amount Due</td>
          <td style="padding: 16px 0 8px; text-align: right; font-size: 24px; font-weight: 700; color: ${BRAND.emerald};">${formattedAmount}</td>
        </tr>
      </table>
    </div>

    ${overdueWarning}

    ${primaryButton(paymentUrl, "Pay Now")}

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;">

    <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
      Can't click the button? Copy this link:<br>
      <a href="${paymentUrl}" style="color: ${BRAND.blue}; word-break: break-all;">${paymentUrl}</a>
    </p>
  `;

  return emailWrapper(content);
}

// Build plain text version of the email
function buildReminderEmailText(
  recipientName: string,
  invoiceNumber: string,
  amount: number,
  currency: string,
  dueDate: string | null,
  paymentUrl: string,
  reminderType: "first" | "second" | "final"
): string {
  const formattedAmount = formatCurrency(amount, currency);
  const formattedDueDate = dueDate
    ? new Date(dueDate).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const isOverdue = dueDate ? new Date(dueDate) < new Date() : false;

  const urgencyText = {
    first: "",
    second: "This is a friendly reminder that your payment is coming due soon.",
    final: "This is your final reminder. Please complete your payment to avoid any service interruptions.",
  };

  return `
Hi ${recipientName},

${urgencyText[reminderType] ? urgencyText[reminderType] + " " : ""}You have an outstanding invoice that requires your attention.

Invoice Number: ${invoiceNumber}
${formattedDueDate ? `Due Date: ${formattedDueDate}${isOverdue ? " (OVERDUE)" : ""}` : ""}
Amount Due: ${formattedAmount}

Click here to pay: ${paymentUrl}

---
Powered by Lexport
`;
}

// Send reminder email via Resend API
async function sendReminderEmail(
  resendApiKey: string,
  fromEmail: string,
  to: string,
  recipientName: string,
  invoiceNumber: string,
  amount: number,
  currency: string,
  dueDate: string | null,
  paymentUrl: string,
  reminderType: "first" | "second" | "final",
  reminderNumber: number
): Promise<{ success: boolean; id?: string; error?: string }> {
  const html = buildReminderEmailHtml(
    recipientName,
    invoiceNumber,
    amount,
    currency,
    dueDate,
    paymentUrl,
    reminderType,
    reminderNumber
  );
  const text = buildReminderEmailText(
    recipientName,
    invoiceNumber,
    amount,
    currency,
    dueDate,
    paymentUrl,
    reminderType
  );

  const isOverdue = dueDate ? new Date(dueDate) < new Date() : false;
  const subjectPrefix = reminderType === "final" ? "🚨 Final Reminder" : isOverdue ? "⚠️ Overdue" : "📋 Reminder";
  const formattedAmount = formatCurrency(amount, currency);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: `${subjectPrefix}: Invoice ${invoiceNumber} - ${formattedAmount} Due`,
        html,
        text,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`Resend API error for ${to}:`, data);
      return { success: false, error: data.message || "Failed to send email" };
    }

    return { success: true, id: data.id };
  } catch (error) {
    console.error(`Failed to send reminder to ${to}:`, error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Calculate the next reminder timestamp
function calculateNextReminder(
  reminderIntervalDays: number,
  currentReminderCount: number,
  maxReminders: number
): string | null {
  // If we've sent all reminders, don't schedule another
  if (currentReminderCount >= maxReminders) {
    return null;
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + reminderIntervalDays);
  return nextDate.toISOString();
}

// Main handler
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get environment variables
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const appUrl = Deno.env.get("APP_URL") || "https://lexportai.com";
  const fromEmail = Deno.env.get("EMAIL_FROM") || "Lexport <noreply@lexportai.com>";

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase environment variables");
    return new Response(
      JSON.stringify({ error: "Server configuration error: Missing Supabase credentials" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!resendApiKey) {
    console.error("Missing RESEND_API_KEY");
    return new Response(
      JSON.stringify({ error: "Server configuration error: Missing email service credentials" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Create Supabase client with service role key (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const results: ReminderResult[] = [];
  let processedCount = 0;
  let successCount = 0;
  let errorCount = 0;

  try {
    console.log("Starting invoice reminder processing...");

    // Query invoices that need reminders
    // Conditions:
    // - next_reminder_at <= NOW()
    // - reminder_enabled = true
    // - status = 'sent' (only sent invoices should get reminders)
    // - reminder_count < max_reminders
    const { data: invoices, error: invoicesError } = await supabase
      .from("invoices")
      .select(`
        id,
        invoice_number,
        recipient_name,
        recipient_email,
        total,
        amount,
        currency,
        status,
        due_date,
        reminder_enabled,
        reminder_interval_days,
        next_reminder_at,
        reminder_count,
        max_reminders,
        contract_id,
        user_id
      `)
      .eq("status", "sent")
      .eq("reminder_enabled", true)
      .lte("next_reminder_at", new Date().toISOString())
      .not("next_reminder_at", "is", null);

    if (invoicesError) {
      console.error("Error fetching invoices:", invoicesError);
      throw new Error(`Failed to fetch invoices: ${invoicesError.message}`);
    }

    if (!invoices || invoices.length === 0) {
      console.log("No invoices need reminders at this time");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No invoices need reminders",
          processed: 0,
          sent: 0,
          errors: 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${invoices.length} invoices needing reminders`);

    // Process each invoice
    for (const invoice of invoices as Invoice[]) {
      processedCount++;

      // Check if max reminders reached
      if (invoice.reminder_count >= invoice.max_reminders) {
        console.log(`Invoice ${invoice.id} has reached max reminders (${invoice.max_reminders}), skipping`);

        // Disable further reminders by setting next_reminder_at to null
        await supabase
          .from("invoices")
          .update({ next_reminder_at: null })
          .eq("id", invoice.id);

        continue;
      }

      const newReminderCount = invoice.reminder_count + 1;
      const reminderType = getReminderType(invoice.reminder_count, invoice.max_reminders);

      // Build payment URL
      const paymentUrl = invoice.contract_id
        ? `${appUrl}/portal/contracts/${invoice.contract_id}?action=pay`
        : `${appUrl}/pay/invoice/${invoice.id}`;

      // Send the reminder email
      const emailResult = await sendReminderEmail(
        resendApiKey,
        fromEmail,
        invoice.recipient_email,
        invoice.recipient_name || "Customer",
        invoice.invoice_number,
        invoice.total || invoice.amount,
        invoice.currency || "usd",
        invoice.due_date,
        paymentUrl,
        reminderType,
        newReminderCount
      );

      results.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        recipientEmail: invoice.recipient_email,
        success: emailResult.success,
        error: emailResult.error,
        emailId: emailResult.id,
      });

      if (emailResult.success) {
        successCount++;

        // Calculate next reminder time
        const nextReminderAt = calculateNextReminder(
          invoice.reminder_interval_days,
          newReminderCount,
          invoice.max_reminders
        );

        // Update invoice with new reminder count
        await supabase
          .from("invoices")
          .update({
            reminder_count: newReminderCount,
            last_reminder_sent_at: new Date().toISOString(),
            next_reminder_at: nextReminderAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", invoice.id);

        // Record in payment_reminders table
        await supabase.from("payment_reminders").insert({
          contract_id: invoice.contract_id,
          recipient_email: invoice.recipient_email,
          recipient_name: invoice.recipient_name,
          reminder_type: reminderType,
          amount: invoice.total || invoice.amount,
          currency: invoice.currency || "usd",
          sent_at: new Date().toISOString(),
          email_id: emailResult.id,
        });

        // Create notification for invoice owner
        await supabase.from("notifications").insert({
          user_id: invoice.user_id,
          type: "invoice_reminder_sent",
          title: "Payment Reminder Sent",
          message: `Automatic payment reminder sent to ${invoice.recipient_email} for ${invoice.invoice_number}`,
          contract_id: invoice.contract_id,
          data: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoice_number,
            recipientEmail: invoice.recipient_email,
            reminderType,
            reminderCount: newReminderCount,
            automated: true,
          },
        });

        // Log audit event
        if (invoice.contract_id) {
          await supabase.from("audit_logs").insert({
            contract_id: invoice.contract_id,
            event_type: "reminder_sent",
            actor_email: "system@lexportai.com",
            actor_name: "Lexport Reminder System",
            metadata: {
              invoice_id: invoice.id,
              invoice_number: invoice.invoice_number,
              reminder_number: newReminderCount,
              reminder_type: reminderType,
              recipient_email: invoice.recipient_email,
              email_id: emailResult.id,
              automated: true,
            },
          });
        }

        console.log(
          `Reminder sent to ${invoice.recipient_email} for invoice ${invoice.invoice_number} (reminder #${newReminderCount}, type: ${reminderType})`
        );
      } else {
        errorCount++;
        console.error(`Failed to send reminder to ${invoice.recipient_email}: ${emailResult.error}`);
      }
    }

    const response = {
      success: true,
      message: `Processed ${invoices.length} invoices`,
      processed: processedCount,
      sent: successCount,
      errors: errorCount,
      details: results,
      timestamp: new Date().toISOString(),
    };

    console.log(`Invoice reminder processing complete: ${successCount} sent, ${errorCount} errors`);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing invoice reminders:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        processed: processedCount,
        sent: successCount,
        errors: errorCount,
        details: results,
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

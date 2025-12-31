// Supabase Edge Function: process-reminders
// Processes signature reminders for pending contracts
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

interface Contract {
  id: string;
  title: string;
  reminder_count: number;
  max_reminders: number;
  reminder_interval_days: number;
  next_reminder_at: string;
  expires_at: string | null;
}

interface SignatureRequest {
  id: string;
  signer_email: string;
  signer_name: string;
  token: string;
  expires_at: string;
  contract_id: string;
}

interface ReminderResult {
  contractId: string;
  contractTitle: string;
  signerEmail: string;
  success: boolean;
  error?: string;
  emailId?: string;
}

// Build the signing reminder email HTML
function buildReminderEmailHtml(
  signerName: string,
  contractTitle: string,
  signingUrl: string,
  expiresAt?: string,
  reminderNumber?: number
): string {
  const expirationText = expiresAt
    ? `This link expires on ${new Date(expiresAt).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}.`
    : "";

  const reminderLabel = reminderNumber && reminderNumber > 1
    ? `Reminder #${reminderNumber}`
    : "Reminder";

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background-color: #fef3c7; color: #92400e; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;">${reminderLabel}</span>
    </div>

    <h2 style="color: ${BRAND.navy}; font-size: 22px; margin: 0 0 20px; text-align: center;">Contract awaiting your signature</h2>

    <p style="margin: 16px 0; color: #475569;">Hi ${signerName},</p>

    <p style="margin: 16px 0; color: #475569;">
      This is a friendly reminder that you have a contract waiting for your signature:
    </p>

    <div style="background-color: #fffbeb; border-radius: 12px; padding: 20px; margin: 24px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; color: ${BRAND.navy}; font-size: 18px; font-weight: 600;">${contractTitle}</p>
    </div>

    ${primaryButton(signingUrl, "Review & Sign Now")}

    ${expirationText ? `<p style="margin: 16px 0; font-size: 13px; color: ${BRAND.slate}; text-align: center;">${expirationText}</p>` : ""}

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;">

    <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
      Can't click the button? Copy this link:<br>
      <a href="${signingUrl}" style="color: ${BRAND.blue}; word-break: break-all;">${signingUrl}</a>
    </p>
  `;

  return emailWrapper(content);
}

// Build plain text version of the email
function buildReminderEmailText(
  signerName: string,
  contractTitle: string,
  signingUrl: string,
  expiresAt?: string
): string {
  const expirationText = expiresAt
    ? `This link expires on ${new Date(expiresAt).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}.`
    : "";

  return `
Hi ${signerName},

This is a friendly reminder that you have a contract waiting for your signature:

${contractTitle}

Click here to review and sign: ${signingUrl}

${expirationText}

---
Powered by Lexport
`;
}

// Send reminder email via Resend API
async function sendReminderEmail(
  resendApiKey: string,
  fromEmail: string,
  to: string,
  signerName: string,
  contractTitle: string,
  signingUrl: string,
  expiresAt?: string,
  reminderNumber?: number
): Promise<{ success: boolean; id?: string; error?: string }> {
  const html = buildReminderEmailHtml(signerName, contractTitle, signingUrl, expiresAt, reminderNumber);
  const text = buildReminderEmailText(signerName, contractTitle, signingUrl, expiresAt);

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
        subject: `Reminder: Please sign ${contractTitle}`,
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
    console.log("Starting reminder processing...");

    // Query contracts that need reminders
    // Conditions:
    // - next_reminder_at <= NOW()
    // - reminder_enabled = true
    // - status = 'pending_signature'
    // - reminder_count < max_reminders
    const { data: contracts, error: contractsError } = await supabase
      .from("contracts")
      .select("id, title, reminder_count, max_reminders, reminder_interval_days, next_reminder_at, expires_at")
      .eq("status", "pending_signature")
      .eq("reminder_enabled", true)
      .lte("next_reminder_at", new Date().toISOString())
      .not("next_reminder_at", "is", null);

    if (contractsError) {
      console.error("Error fetching contracts:", contractsError);
      throw new Error(`Failed to fetch contracts: ${contractsError.message}`);
    }

    if (!contracts || contracts.length === 0) {
      console.log("No contracts need reminders at this time");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No contracts need reminders",
          processed: 0,
          sent: 0,
          errors: 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${contracts.length} contracts needing reminders`);

    // Process each contract
    for (const contract of contracts as Contract[]) {
      // Check if max reminders reached
      if (contract.reminder_count >= contract.max_reminders) {
        console.log(`Contract ${contract.id} has reached max reminders (${contract.max_reminders}), skipping`);

        // Disable further reminders by setting next_reminder_at to null
        await supabase
          .from("contracts")
          .update({ next_reminder_at: null })
          .eq("id", contract.id);

        continue;
      }

      // Get pending signature requests for this contract
      const { data: signatureRequests, error: srError } = await supabase
        .from("signature_requests")
        .select("id, signer_email, signer_name, token, expires_at, contract_id")
        .eq("contract_id", contract.id)
        .eq("status", "pending");

      if (srError) {
        console.error(`Error fetching signature requests for contract ${contract.id}:`, srError);
        results.push({
          contractId: contract.id,
          contractTitle: contract.title,
          signerEmail: "N/A",
          success: false,
          error: `Failed to fetch signature requests: ${srError.message}`,
        });
        errorCount++;
        continue;
      }

      if (!signatureRequests || signatureRequests.length === 0) {
        console.log(`No pending signature requests for contract ${contract.id}`);

        // No pending signatures - contract might be fully signed or cancelled
        // Update next_reminder_at to null since no more reminders needed
        await supabase
          .from("contracts")
          .update({ next_reminder_at: null })
          .eq("id", contract.id);

        continue;
      }

      console.log(`Processing ${signatureRequests.length} pending signers for contract ${contract.id}`);

      // Send reminders to each pending signer
      let contractRemindersSent = 0;
      const newReminderCount = contract.reminder_count + 1;

      for (const sr of signatureRequests as SignatureRequest[]) {
        processedCount++;

        // Build the signing URL
        const signingUrl = `${appUrl}/sign/${sr.token}`;

        // Send the reminder email
        const emailResult = await sendReminderEmail(
          resendApiKey,
          fromEmail,
          sr.signer_email,
          sr.signer_name,
          contract.title,
          signingUrl,
          sr.expires_at,
          newReminderCount
        );

        results.push({
          contractId: contract.id,
          contractTitle: contract.title,
          signerEmail: sr.signer_email,
          success: emailResult.success,
          error: emailResult.error,
          emailId: emailResult.id,
        });

        if (emailResult.success) {
          successCount++;
          contractRemindersSent++;

          // Update last_reminder_sent_at on the signature request
          await supabase
            .from("signature_requests")
            .update({ last_reminder_sent_at: new Date().toISOString() })
            .eq("id", sr.id);

          // Log the reminder_sent audit event
          await supabase.from("audit_logs").insert({
            contract_id: contract.id,
            signature_request_id: sr.id,
            event_type: "reminder_sent",
            actor_email: "system@lexportai.com",
            actor_name: "Lexport Reminder System",
            metadata: {
              reminder_number: newReminderCount,
              signer_email: sr.signer_email,
              signer_name: sr.signer_name,
              email_id: emailResult.id,
              automated: true,
            },
          });

          console.log(`Reminder sent to ${sr.signer_email} for contract ${contract.id} (reminder #${newReminderCount})`);
        } else {
          errorCount++;
          console.error(`Failed to send reminder to ${sr.signer_email}: ${emailResult.error}`);
        }
      }

      // Update contract with new reminder count and next reminder time
      if (contractRemindersSent > 0) {
        const nextReminderAt = calculateNextReminder(
          contract.reminder_interval_days,
          newReminderCount,
          contract.max_reminders
        );

        const updateData: Record<string, unknown> = {
          reminder_count: newReminderCount,
          last_reminder_sent_at: new Date().toISOString(),
          next_reminder_at: nextReminderAt,
        };

        const { error: updateError } = await supabase
          .from("contracts")
          .update(updateData)
          .eq("id", contract.id);

        if (updateError) {
          console.error(`Failed to update contract ${contract.id}:`, updateError);
        } else {
          console.log(
            `Updated contract ${contract.id}: reminder_count=${newReminderCount}, next_reminder_at=${nextReminderAt || "null (max reached)"}`
          );
        }
      }
    }

    const response = {
      success: true,
      message: `Processed ${contracts.length} contracts`,
      processed: processedCount,
      sent: successCount,
      errors: errorCount,
      details: results,
      timestamp: new Date().toISOString(),
    };

    console.log(`Reminder processing complete: ${successCount} sent, ${errorCount} errors`);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing reminders:", error);
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

import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { sendBalanceReminderEmail, sendSigningReminder, sendExpirationWarningEmail, sendExpirationNotificationToSigner, sendExpirationNotificationToOwner } from "@/lib/email";

class RemindersConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RemindersConfigError";
  }
}

function getServiceRoleKey(): string | null {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_ADMIN_KEY ||
    null
  );
}

function isServiceKeyAuthError(error: unknown): boolean {
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: unknown }).message || "").toLowerCase()
      : "";

  return (
    message.includes("invalid api key") ||
    message.includes("invalid jwt") ||
    message.includes("jwt") ||
    message.includes("unauthorized") ||
    message.includes("permission denied") ||
    message.includes("apikey")
  );
}

// Lazy initialization for service role client (bypasses RLS)
let supabaseAdmin: SupabaseClient | null = null;
function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = getServiceRoleKey();

    if (!supabaseUrl) {
      throw new RemindersConfigError("NEXT_PUBLIC_SUPABASE_URL is required.");
    }

    if (!serviceRoleKey) {
      throw new RemindersConfigError(
        "Supabase service key is missing. Set SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY."
      );
    }

    supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey
    );
  }
  return supabaseAdmin;
}

interface ContractWithBalance {
  id: string;
  title: string;
  user_id: string;
  payment_amount: number;
  payment_currency: string;
  deposit_percentage: number;
  balance_due_date: string | null;
  last_reminder_sent: string | null;
}

interface ReminderSchedule {
  daysBeforeDue: number;
  reminderType: "first" | "second" | "final";
}

// Reminder schedule configuration
const REMINDER_SCHEDULE: ReminderSchedule[] = [
  { daysBeforeDue: 7, reminderType: "first" },
  { daysBeforeDue: 3, reminderType: "second" },
  { daysBeforeDue: 1, reminderType: "final" },
  { daysBeforeDue: 0, reminderType: "final" }, // On due date
  { daysBeforeDue: -1, reminderType: "final" }, // 1 day overdue
  { daysBeforeDue: -3, reminderType: "final" }, // 3 days overdue
  { daysBeforeDue: -7, reminderType: "final" }, // 7 days overdue
];

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const paymentResults = {
      processed: 0,
      sent: 0,
      skipped: 0,
      errors: [] as string[],
    };
    
    const signatureResults = {
      processed: 0,
      sent: 0,
      skipped: 0,
      errors: [] as string[],
    };
    
    const expirationResults = {
      processed: 0,
      expired: 0,
      errors: [] as string[],
    };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lexportai.com";

    // Find contracts with deposit paid but balance unpaid
    // These are contracts with deposit_balance structure where we have a deposit payment but no balance payment
    const { data: contracts, error: contractsError } = await getSupabaseAdmin()
      .from("contracts")
      .select(`
        id, title, user_id,
        payment_amount, payment_currency, deposit_percentage,
        balance_due_date, last_reminder_sent
      `)
      .eq("payment_structure", "deposit_balance")
      .eq("payment_required", true)
      .not("balance_due_date", "is", null);

    if (contractsError) {
      if (isServiceKeyAuthError(contractsError)) {
        return NextResponse.json(
          {
            error:
              "Reminders service is not configured with a valid Supabase service key. Set SUPABASE_SECRET_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY.",
          },
          { status: 503 }
        );
      }
      console.error("Failed to fetch contracts:", contractsError);
      return NextResponse.json(
        { error: "Failed to fetch contracts" },
        { status: 500 }
      );
    }

    // Process payment reminders (existing logic)
    if (contracts && contracts.length > 0) {
      for (const contract of contracts as ContractWithBalance[]) {
        paymentResults.processed++;

      try {
        // Check if deposit is paid and balance is not
        const { data: payments } = await getSupabaseAdmin()
          .from("payments")
          .select("id, payment_type, status, payer_email, payer_name")
          .eq("contract_id", contract.id)
          .eq("status", "succeeded");

        const depositPayment = payments?.find(p => p.payment_type === "deposit");
        const balancePayment = payments?.find(p => p.payment_type === "balance");

          // Skip if deposit not paid or balance already paid
          if (!depositPayment || balancePayment) {
            paymentResults.skipped++;
            continue;
          }

          // Get recipient email from deposit payment
          const recipientEmail = depositPayment.payer_email;
          const recipientName = depositPayment.payer_name;

          if (!recipientEmail) {
            paymentResults.skipped++;
            continue;
          }

          // Calculate days until due
          const dueDate = new Date(contract.balance_due_date!);
          const daysUntilDue = Math.ceil(
            (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Find the appropriate reminder to send
          const reminderToSend = REMINDER_SCHEDULE.find(
            (r) => r.daysBeforeDue === daysUntilDue
          );

          if (!reminderToSend) {
            paymentResults.skipped++;
            continue;
          }

          // Check if we already sent this type of reminder
          const { data: existingReminders } = await getSupabaseAdmin()
            .from("payment_reminders")
            .select("id, reminder_type")
            .eq("contract_id", contract.id)
            .eq("reminder_type", reminderToSend.reminderType);

          // For "first" and "second", only send once
          // For "final", allow multiple (overdue reminders)
          if (existingReminders && existingReminders.length > 0) {
            if (reminderToSend.reminderType !== "final") {
              paymentResults.skipped++;
              continue;
            }

            // For final reminders, check 24-hour cooldown
            const lastReminder = await getSupabaseAdmin()
              .from("payment_reminders")
              .select("sent_at")
              .eq("contract_id", contract.id)
              .order("sent_at", { ascending: false })
              .limit(1)
              .single();

            if (lastReminder.data) {
              const hoursSinceLastReminder =
                (now.getTime() - new Date(lastReminder.data.sent_at).getTime()) /
                (1000 * 60 * 60);
              if (hoursSinceLastReminder < 24) {
                paymentResults.skipped++;
                continue;
              }
            }
          }

          // Get contract owner info for sender details
          const { data: ownerData } = await getSupabaseAdmin()
            .from("users")
            .select("name, email")
            .eq("id", contract.user_id)
            .single();

          // Calculate amounts
          const totalAmount = Math.round(contract.payment_amount * 100);
          const depositPercentage = contract.deposit_percentage || 30;
          const depositAmount = Math.round(totalAmount * (depositPercentage / 100));
          const balanceAmount = totalAmount - depositAmount;

          // Build payment URL
          const paymentUrl = `${baseUrl}/portal/contracts/${contract.id}?action=pay`;

          // Send the reminder
          const emailResult = await sendBalanceReminderEmail({
            to: recipientEmail,
            recipientName: recipientName || "Valued Customer",
            contractTitle: contract.title,
            balanceAmount,
            currency: contract.payment_currency || "usd",
            dueDate: contract.balance_due_date || undefined,
            paymentUrl,
            depositPaidAmount: depositAmount,
            senderName: ownerData?.name || undefined,
            reminderType: reminderToSend.reminderType,
          });

          // Record the reminder
          await getSupabaseAdmin().from("payment_reminders").insert({
            contract_id: contract.id,
            payment_id: depositPayment.id,
            recipient_email: recipientEmail,
            recipient_name: recipientName,
            reminder_type: reminderToSend.reminderType,
            amount: balanceAmount,
            currency: contract.payment_currency || "usd",
            email_id: emailResult.id || null,
          });

          // Update contract's last_reminder_sent
          await getSupabaseAdmin()
            .from("contracts")
            .update({
              last_reminder_sent: now.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq("id", contract.id);

          // Log audit event
          await getSupabaseAdmin().from("audit_logs").insert({
            contract_id: contract.id,
            user_id: contract.user_id,
            event_type: "auto_balance_reminder_sent",
            ip_address: "cron",
            user_agent: "netlify-scheduled-function",
            metadata: {
              reminder_type: reminderToSend.reminderType,
              days_until_due: daysUntilDue,
              recipient_email: recipientEmail,
              balance_amount: balanceAmount,
            },
          });

          paymentResults.sent++;
          console.log(
            `Sent ${reminderToSend.reminderType} payment reminder for contract ${contract.id} (${daysUntilDue} days until due)`
          );
        } catch (contractError) {
          const errorMsg = `Failed to process contract ${contract.id}: ${contractError}`;
          console.error(errorMsg);
          paymentResults.errors.push(errorMsg);
        }
      }
    }

    // ======== SIGNATURE REMINDER PROCESSING ========
    
    // Query signature requests needing reminders
    const { data: signatureRequests, error: sigRequestsError } = await getSupabaseAdmin()
      .from("signature_requests")
      .select(`
        id, contract_id, signer_email, signer_name, token,
        reminder_enabled, reminder_count, max_reminders,
        next_reminder_at, expires_at, created_at, reminder_interval_days,
        contracts!inner(id, title, user_id, users(name))
      `)
      .eq("status", "pending")
      .eq("reminder_enabled", true)
      .lte("next_reminder_at", now.toISOString())
      .gt("expires_at", now.toISOString()); // Not expired

    if (sigRequestsError) {
      console.error("Failed to fetch signature requests:", sigRequestsError);
    } else if (signatureRequests && signatureRequests.length > 0) {
      for (const sigRequest of signatureRequests) {
        signatureResults.processed++;

        // Check max_reminders limit
        if (sigRequest.reminder_count >= sigRequest.max_reminders) {
          continue; // Skip if already at max reminders
        }

        try {
          const contract = Array.isArray(sigRequest.contracts) ? sigRequest.contracts[0] : sigRequest.contracts;
          const senderName = (contract?.users as any)?.[0]?.name;
          const signingUrl = `${baseUrl}/sign/${sigRequest.token}`;
          const expiresAt = sigRequest.expires_at;
          
          // Determine reminder type based on reminder count
          let reminderType: "first" | "followup" | "final" = "first";
          if (sigRequest.reminder_count === 0) {
            reminderType = "first";
          } else if (sigRequest.reminder_count >= 2) {
            reminderType = "final";
          } else {
            reminderType = "followup";
          }

          // Check if this is final reminder (24h before expiration)
          const hoursUntilExpiration = expiresAt 
            ? (new Date(expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60)
            : null;
          
          const isFinalWarning = hoursUntilExpiration && hoursUntilExpiration <= 24 && hoursUntilExpiration > 0;

          if (isFinalWarning) {
            // Send expiration warning
            await sendExpirationWarningEmail({
              to: sigRequest.signer_email,
              signerName: sigRequest.signer_name,
              contractTitle: contract.title,
              signingUrl,
              expiresAt: expiresAt!,
              hoursRemaining: hoursUntilExpiration,
              senderName,
            });
            reminderType = "final";
          } else {
            // Send regular reminder
            await sendSigningReminder({
              to: sigRequest.signer_email,
              signerName: sigRequest.signer_name,
              contractTitle: contract.title,
              signingUrl,
              expiresAt: expiresAt || undefined,
            });
          }

          // Record in history
          await getSupabaseAdmin().from("signature_reminder_history").insert({
            signature_request_id: sigRequest.id,
            contract_id: sigRequest.contract_id,
            reminder_type: isFinalWarning ? "expiration_warning" : reminderType,
            recipient_email: sigRequest.signer_email,
            recipient_name: sigRequest.signer_name,
            days_until_expiration: hoursUntilExpiration ? Math.ceil(hoursUntilExpiration / 24) : null,
          });

          // Update signature request
          const newReminderCount = sigRequest.reminder_count + 1;
          const reminderIntervalDays = sigRequest.reminder_interval_days || 3;
          const nextReminderAt = new Date(now.getTime() + reminderIntervalDays * 24 * 60 * 60 * 1000);

          await getSupabaseAdmin()
            .from("signature_requests")
            .update({
              reminder_count: newReminderCount,
              last_reminder_sent_at: now.toISOString(),
              next_reminder_at: nextReminderAt.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq("id", sigRequest.id);

          // Log audit event
          await getSupabaseAdmin().from("audit_logs").insert({
            contract_id: sigRequest.contract_id,
            user_id: contract.user_id,
            event_type: "auto_signature_reminder_sent",
            ip_address: "cron",
            user_agent: "netlify-scheduled-function",
            metadata: {
              signature_request_id: sigRequest.id,
              reminder_type: reminderType,
              reminder_count: newReminderCount,
              recipient_email: sigRequest.signer_email,
              expires_at: expiresAt,
            },
          });

          signatureResults.sent++;
          console.log(
            `Sent ${reminderType} signature reminder for request ${sigRequest.id} (count: ${newReminderCount})`
          );
        } catch (error) {
          const errorMsg = `Failed to process signature request ${sigRequest.id}: ${error}`;
          console.error(errorMsg);
          signatureResults.errors.push(errorMsg);
        }
      }
    }

    // ======== EXPIRATION PROCESSING ========
    
    // Find expired signature requests that haven't been processed
    const { data: expiredRequests, error: expiredError } = await getSupabaseAdmin()
      .from("signature_requests")
      .select(`
        id, contract_id, signer_email, signer_name, token, expires_at,
        contracts!inner(id, title, user_id, users(name, email))
      `)
      .eq("status", "pending")
      .lte("expires_at", now.toISOString())
      .eq("expired_processed", false);

    if (expiredError) {
      console.error("Failed to fetch expired requests:", expiredError);
    } else if (expiredRequests && expiredRequests.length > 0) {
      for (const expiredRequest of expiredRequests) {
        expirationResults.processed++;

        try {
          const contract = Array.isArray(expiredRequest.contracts) ? expiredRequest.contracts[0] : expiredRequest.contracts;
          
          // Mark as expired
          await getSupabaseAdmin()
            .from("signature_requests")
            .update({
              status: "expired",
              expired_processed: true,
              updated_at: now.toISOString(),
            })
            .eq("id", expiredRequest.id);

          // Send expiration notifications
          const senderName = (contract?.users as any)?.[0]?.name;
          const ownerEmail = (contract?.users as any)?.[0]?.email;

          // Notify signer
          try {
            await sendExpirationNotificationToSigner({
              to: expiredRequest.signer_email,
              signerName: expiredRequest.signer_name,
              contractTitle: contract.title,
              expiresAt: expiredRequest.expires_at,
              senderName,
            });
          } catch (emailError) {
            console.error(`Failed to send expiration notification to signer:`, emailError);
          }

          // Notify contract owner
          if (ownerEmail) {
            try {
              await sendExpirationNotificationToOwner({
                to: ownerEmail,
                ownerName: senderName || "Contract Owner",
                signerName: expiredRequest.signer_name,
                contractTitle: contract.title,
                expiresAt: expiredRequest.expires_at,
                contractId: expiredRequest.contract_id,
              });
            } catch (emailError) {
              console.error(`Failed to send expiration notification to owner:`, emailError);
            }
          }

          // Log audit event
          await getSupabaseAdmin().from("audit_logs").insert({
            contract_id: expiredRequest.contract_id,
            user_id: contract.user_id,
            event_type: "signature_request_expired",
            ip_address: "cron",
            user_agent: "netlify-scheduled-function",
            metadata: {
              signature_request_id: expiredRequest.id,
              signer_email: expiredRequest.signer_email,
              expired_at: expiredRequest.expires_at,
            },
          });

          expirationResults.expired++;
          console.log(
            `Marked signature request ${expiredRequest.id} as expired`
          );
        } catch (error) {
          const errorMsg = `Failed to expire signature request ${expiredRequest.id}: ${error}`;
          console.error(errorMsg);
          expirationResults.errors.push(errorMsg);
        }
      }
    }

    console.log("Reminder processing complete:", {
      paymentReminders: paymentResults,
      signatureReminders: signatureResults,
      expiredRequests: expirationResults,
    });

    return NextResponse.json({
      success: true,
      paymentReminders: paymentResults,
      signatureReminders: signatureResults,
      expiredRequests: expirationResults,
    });
  } catch (error) {
    if (error instanceof RemindersConfigError) {
      return NextResponse.json(
        {
          error:
            "Reminders service is not configured. Set SUPABASE_SECRET_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY.",
          details: error.message,
        },
        { status: 503 }
      );
    }

    console.error("Error processing reminders:", error);
    return NextResponse.json(
      { error: "Failed to process reminders" },
      { status: 500 }
    );
  }
}

// Also support GET for manual testing
export async function GET(request: NextRequest) {
  // For GET requests, require the cron secret as a query param
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Forward to POST handler
  return POST(request);
}

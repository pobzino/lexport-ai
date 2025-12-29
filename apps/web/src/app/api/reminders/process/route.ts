import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { sendBalanceReminderEmail } from "@/lib/email";

// Lazy initialization for service role client (bypasses RLS)
let supabaseAdmin: SupabaseClient | null = null;
function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
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
    const results = {
      processed: 0,
      remindersSent: 0,
      skipped: 0,
      errors: [] as string[],
    };

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
      console.error("Failed to fetch contracts:", contractsError);
      return NextResponse.json(
        { error: "Failed to fetch contracts" },
        { status: 500 }
      );
    }

    if (!contracts || contracts.length === 0) {
      return NextResponse.json({
        message: "No contracts with balance due dates found",
        ...results,
      });
    }

    // Process each contract
    for (const contract of contracts as ContractWithBalance[]) {
      results.processed++;

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
          results.skipped++;
          continue;
        }

        // Get recipient email from deposit payment
        const recipientEmail = depositPayment.payer_email;
        const recipientName = depositPayment.payer_name;

        if (!recipientEmail) {
          results.skipped++;
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
          results.skipped++;
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
            results.skipped++;
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
              results.skipped++;
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
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lexportai.com";
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

        results.remindersSent++;
        console.log(
          `Sent ${reminderToSend.reminderType} reminder for contract ${contract.id} (${daysUntilDue} days until due)`
        );
      } catch (contractError) {
        const errorMsg = `Failed to process contract ${contract.id}: ${contractError}`;
        console.error(errorMsg);
        results.errors.push(errorMsg);
      }
    }

    console.log("Reminder processing complete:", results);

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} contracts, sent ${results.remindersSent} reminders`,
      ...results,
    });
  } catch (error) {
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

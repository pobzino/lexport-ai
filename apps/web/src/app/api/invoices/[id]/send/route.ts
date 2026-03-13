import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isEmailTransportConfigured, sendEmail } from "@/lib/email";

// Format currency
function formatCurrency(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  });
  return formatter.format(amount / 100);
}

// Format date
function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// POST - Send invoice to recipient
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Check if invoice can be sent (allow draft, sent, and overdue for resending)
    if (invoice.status === "paid" || invoice.status === "cancelled" || invoice.status === "void") {
      return NextResponse.json(
        { error: "Cannot send a paid, cancelled, or voided invoice" },
        { status: 400 }
      );
    }

    const isResend = invoice.status !== "draft";

    // Get contract title if linked
    let contractTitle = "Standalone Invoice";
    if (invoice.contract_id) {
      const { data: contract } = await supabase
        .from("contracts")
        .select("title")
        .eq("id", invoice.contract_id)
        .single();
      if (contract) {
        contractTitle = contract.title;
      }
    }

    // Generate payment URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const paymentUrl = invoice.contract_id
      ? `${baseUrl}/portal/contracts/${invoice.contract_id}?action=pay`
      : `${baseUrl}/pay/invoice/${invoice.id}`;

    // Get user profile for sender name
    const { data: profile } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", user.id)
      .single();

    const senderName = profile?.name || user.email?.split("@")[0] || "Lexport User";
    const formattedAmount = formatCurrency(invoice.total || invoice.amount, invoice.currency);

    // Send email
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="color: #111827; font-size: 24px; margin: 0;">Lexport</h1>
  </div>

  <div style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
    <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">You've received an invoice</h2>

    <p style="margin: 16px 0;">Hi ${invoice.recipient_name || "there"},</p>

    <p style="margin: 16px 0;">
      ${senderName} has sent you an invoice for payment.
    </p>

    <!-- Invoice Summary -->
    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Invoice Number</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${invoice.invoice_number}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Reference</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${contractTitle}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Due Date</td>
          <td style="padding: 8px 0; text-align: right; color: #111827;">${formatDate(invoice.due_date)}</td>
        </tr>
        <tr style="border-top: 1px solid #e5e7eb;">
          <td style="padding: 16px 0 8px; color: #111827; font-size: 16px; font-weight: 600;">Amount Due</td>
          <td style="padding: 16px 0 8px; text-align: right; font-size: 20px; font-weight: 700; color: #529ec6;">${formattedAmount}</td>
        </tr>
      </table>
    </div>

    ${invoice.notes ? `
    <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0; font-size: 14px; color: #6b7280;"><strong>Notes:</strong></p>
      <p style="margin: 8px 0 0; font-size: 14px; color: #374151;">${invoice.notes}</p>
    </div>
    ` : ""}

    <div style="text-align: center; margin: 32px 0;">
      <a href="${paymentUrl}" style="display: inline-block; background-color: #529ec6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">View &amp; Pay Invoice</a>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

    <p style="margin: 16px 0; font-size: 12px; color: #9ca3af;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${paymentUrl}" style="color: #529ec6; word-break: break-all;">${paymentUrl}</a>
    </p>
  </div>

  <div style="text-align: center; margin-top: 32px; font-size: 12px; color: #9ca3af;">
    <p>Powered by <a href="https://lexportai.com" style="color: #6b7280;">Lexport</a></p>
    <p>Simple, legally binding contracts for startups and freelancers.</p>
  </div>
</body>
</html>
`;

    const text = `
You've received an invoice

Hi ${invoice.recipient_name || "there"},

${senderName} has sent you an invoice for payment.

Invoice Number: ${invoice.invoice_number}
Reference: ${contractTitle}
Due Date: ${formatDate(invoice.due_date)}
Amount Due: ${formattedAmount}

${invoice.notes ? `Notes: ${invoice.notes}` : ""}

View and pay your invoice: ${paymentUrl}

---
Powered by Lexport - Simple, legally binding contracts for startups and freelancers.
`;

    if (!isEmailTransportConfigured()) {
      console.error("Email transport is not configured");
      return NextResponse.json(
        { error: "Email service not configured. Please add SMTP or Resend email settings to your environment variables." },
        { status: 500 }
      );
    }

    // Send the email
    let emailSent = false;
    let emailError: any = null;

    try {
      const subject = isResend
        ? `Reminder: Invoice ${invoice.invoice_number} from ${senderName} - ${formattedAmount}`
        : `Invoice ${invoice.invoice_number} from ${senderName} - ${formattedAmount}`;

      const { error } = await sendEmail({
        to: [invoice.recipient_email],
        subject,
        html,
        text,
      });

      if (error) {
        emailError = error;
        console.error("Failed to send invoice email:", error);
      } else {
        emailSent = true;
      }
    } catch (err) {
      emailError = err;
      console.error("Error sending invoice email:", err);
    }

    // If email failed, return error and don't update status
    if (!emailSent) {
      return NextResponse.json(
        {
          error: "Failed to send invoice email. Please check your email configuration.",
          details: emailError?.message || "Unknown email error"
        },
        { status: 500 }
      );
    }

    // Update invoice status to sent (only if draft, preserve status for resends)
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (!isResend) {
      updateData.status = "sent";
      updateData.sent_at = new Date().toISOString();
    }

    const { data: updatedInvoice, error: updateError } = await supabase
      .from("invoices")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Failed to update invoice status:", updateError);
      return NextResponse.json(
        { error: "Failed to update invoice status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      emailSent: true,
      isResend,
    });
  } catch (error) {
    console.error("Error sending invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Default from address - update this with your verified domain
const FROM_EMAIL = process.env.EMAIL_FROM || "Lexport <noreply@lexport.app>";

export interface SigningEmailParams {
  to: string;
  signerName: string;
  contractTitle: string;
  signingUrl: string;
  message?: string;
  expiresAt?: string;
  senderName?: string;
}

export interface ReminderEmailParams {
  to: string;
  signerName: string;
  contractTitle: string;
  signingUrl: string;
  expiresAt?: string;
}

export interface MagicLinkEmailParams {
  to: string;
  magicLinkUrl: string;
}

/**
 * Send a contract signing invitation email
 */
export async function sendSigningInvitation({
  to,
  signerName,
  contractTitle,
  signingUrl,
  message,
  expiresAt,
  senderName,
}: SigningEmailParams) {
  const expirationText = expiresAt
    ? `This link will expire on ${new Date(expiresAt).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}.`
    : "";

  const personalMessage = message
    ? `<p style="margin: 16px 0; padding: 16px; background-color: #f9fafb; border-radius: 8px; font-style: italic;">"${message}"</p>`
    : "";

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
    <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">You've been invited to sign a contract</h2>

    <p style="margin: 16px 0;">Hi ${signerName},</p>

    <p style="margin: 16px 0;">
      ${senderName ? `${senderName} has` : "You have been"} requested your signature on:
    </p>

    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <strong style="color: #111827; font-size: 16px;">${contractTitle}</strong>
    </div>

    ${personalMessage}

    <div style="text-align: center; margin: 32px 0;">
      <a href="${signingUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Review &amp; Sign</a>
    </div>

    <p style="margin: 16px 0; font-size: 14px; color: #6b7280;">
      ${expirationText}
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

    <p style="margin: 16px 0; font-size: 12px; color: #9ca3af;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${signingUrl}" style="color: #2563eb; word-break: break-all;">${signingUrl}</a>
    </p>
  </div>

  <div style="text-align: center; margin-top: 32px; font-size: 12px; color: #9ca3af;">
    <p>Powered by <a href="https://lexport.app" style="color: #6b7280;">Lexport</a></p>
    <p>Simple, legally binding contracts for startups and freelancers.</p>
  </div>
</body>
</html>
`;

  const text = `
Hi ${signerName},

${senderName ? `${senderName} has` : "You have been"} requested your signature on: ${contractTitle}

${message ? `Message: "${message}"` : ""}

Click here to review and sign: ${signingUrl}

${expirationText}

---
Powered by Lexport - Simple, legally binding contracts for startups and freelancers.
`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Please sign: ${contractTitle}`,
      html,
      text,
    });

    if (error) {
      console.error("Failed to send signing invitation:", error);
      throw error;
    }

    console.log(`Signing invitation sent to ${to}:`, data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Error sending signing invitation:", error);
    throw error;
  }
}

/**
 * Send a reminder email for a pending signature
 */
export async function sendSigningReminder({
  to,
  signerName,
  contractTitle,
  signingUrl,
  expiresAt,
}: ReminderEmailParams) {
  const expirationText = expiresAt
    ? `This link will expire on ${new Date(expiresAt).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}.`
    : "";

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
    <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">Reminder: Contract awaiting your signature</h2>

    <p style="margin: 16px 0;">Hi ${signerName},</p>

    <p style="margin: 16px 0;">
      This is a friendly reminder that you have a contract waiting for your signature:
    </p>

    <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #f59e0b;">
      <strong style="color: #111827; font-size: 16px;">${contractTitle}</strong>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${signingUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Review &amp; Sign Now</a>
    </div>

    <p style="margin: 16px 0; font-size: 14px; color: #6b7280;">
      ${expirationText}
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

    <p style="margin: 16px 0; font-size: 12px; color: #9ca3af;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${signingUrl}" style="color: #2563eb; word-break: break-all;">${signingUrl}</a>
    </p>
  </div>

  <div style="text-align: center; margin-top: 32px; font-size: 12px; color: #9ca3af;">
    <p>Powered by <a href="https://lexport.app" style="color: #6b7280;">Lexport</a></p>
  </div>
</body>
</html>
`;

  const text = `
Hi ${signerName},

This is a friendly reminder that you have a contract waiting for your signature:

${contractTitle}

Click here to review and sign: ${signingUrl}

${expirationText}

---
Powered by Lexport
`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Reminder: Please sign ${contractTitle}`,
      html,
      text,
    });

    if (error) {
      console.error("Failed to send reminder:", error);
      throw error;
    }

    console.log(`Reminder sent to ${to}:`, data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Error sending reminder:", error);
    throw error;
  }
}

/**
 * Send a magic link email for portal access
 */
export async function sendMagicLinkEmail({
  to,
  magicLinkUrl,
}: MagicLinkEmailParams) {
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
    <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">Sign in to Your Client Portal</h2>

    <p style="margin: 16px 0;">
      Click the button below to securely access your contracts and documents.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${magicLinkUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Access My Portal</a>
    </div>

    <p style="margin: 16px 0; font-size: 14px; color: #6b7280;">
      This link will expire in 1 hour for security purposes.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

    <p style="margin: 16px 0; font-size: 12px; color: #9ca3af;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${magicLinkUrl}" style="color: #2563eb; word-break: break-all;">${magicLinkUrl}</a>
    </p>

    <p style="margin: 16px 0; font-size: 12px; color: #9ca3af;">
      If you didn't request this link, you can safely ignore this email.
    </p>
  </div>

  <div style="text-align: center; margin-top: 32px; font-size: 12px; color: #9ca3af;">
    <p>Powered by <a href="https://lexport.app" style="color: #6b7280;">Lexport</a></p>
  </div>
</body>
</html>
`;

  const text = `
Sign in to Your Client Portal

Click here to securely access your contracts: ${magicLinkUrl}

This link will expire in 1 hour for security purposes.

If you didn't request this link, you can safely ignore this email.

---
Powered by Lexport
`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: "Sign in to Lexport",
      html,
      text,
    });

    if (error) {
      console.error("Failed to send magic link:", error);
      throw error;
    }

    console.log(`Magic link sent to ${to}:`, data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Error sending magic link:", error);
    throw error;
  }
}

export interface PaymentReceiptEmailParams {
  to: string;
  recipientName: string;
  contractTitle: string;
  invoiceNumber: string;
  amount: number; // in cents
  currency: string;
  paymentType: "deposit" | "balance" | "full";
  paidAt: string;
  invoiceUrl?: string;
  senderName?: string;
  senderEmail?: string;
}

/**
 * Send a payment receipt email after successful payment
 */
export async function sendPaymentReceiptEmail({
  to,
  recipientName,
  contractTitle,
  invoiceNumber,
  amount,
  currency,
  paymentType,
  paidAt,
  invoiceUrl,
  senderName,
  senderEmail,
}: PaymentReceiptEmailParams) {
  // Format currency
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);

  // Format date
  const formattedDate = new Date(paidAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Payment type label
  const paymentTypeLabel =
    paymentType === "deposit"
      ? "Deposit Payment"
      : paymentType === "balance"
      ? "Balance Payment"
      : "Full Payment";

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
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background-color: #d1fae5; border-radius: 50%; padding: 16px;">
        <span style="font-size: 32px;">✓</span>
      </div>
    </div>

    <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px; text-align: center;">Payment Received</h2>

    <p style="margin: 16px 0;">Hi ${recipientName},</p>

    <p style="margin: 16px 0;">
      Thank you for your payment. This email confirms that we have received your ${paymentTypeLabel.toLowerCase()}.
    </p>

    <!-- Payment Summary -->
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Invoice Number</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Contract</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${contractTitle}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Payment Type</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${paymentTypeLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date</td>
          <td style="padding: 8px 0; text-align: right; color: #111827;">${formattedDate}</td>
        </tr>
        <tr style="border-top: 1px solid #bbf7d0;">
          <td style="padding: 16px 0 8px; color: #111827; font-size: 16px; font-weight: 600;">Amount Paid</td>
          <td style="padding: 16px 0 8px; text-align: right; font-size: 20px; font-weight: 700; color: #059669;">${formattedAmount}</td>
        </tr>
      </table>
    </div>

    ${
      invoiceUrl
        ? `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${invoiceUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Download Invoice PDF</a>
    </div>
    `
        : ""
    }

    ${
      paymentType === "deposit"
        ? `
    <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>Note:</strong> This was a deposit payment. The remaining balance will be due according to your contract terms.
      </p>
    </div>
    `
        : ""
    }

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

    <p style="margin: 16px 0; font-size: 12px; color: #9ca3af;">
      ${senderName ? `This payment was sent to ${senderName}${senderEmail ? ` (${senderEmail})` : ""}.` : ""}
      If you have any questions about this payment, please contact the contract owner directly.
    </p>
  </div>

  <div style="text-align: center; margin-top: 32px; font-size: 12px; color: #9ca3af;">
    <p>Powered by <a href="https://lexport.app" style="color: #6b7280;">Lexport</a></p>
    <p>Simple, legally binding contracts for startups and freelancers.</p>
  </div>
</body>
</html>
`;

  const text = `
Payment Received

Hi ${recipientName},

Thank you for your payment. This email confirms that we have received your ${paymentTypeLabel.toLowerCase()}.

Invoice: ${invoiceNumber}
Contract: ${contractTitle}
Payment Type: ${paymentTypeLabel}
Date: ${formattedDate}
Amount Paid: ${formattedAmount}

${invoiceUrl ? `Download your invoice: ${invoiceUrl}` : ""}

${paymentType === "deposit" ? "Note: This was a deposit payment. The remaining balance will be due according to your contract terms." : ""}

${senderName ? `This payment was sent to ${senderName}${senderEmail ? ` (${senderEmail})` : ""}.` : ""}

---
Powered by Lexport - Simple, legally binding contracts for startups and freelancers.
`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Payment Receipt: ${formattedAmount} for ${contractTitle}`,
      html,
      text,
    });

    if (error) {
      console.error("Failed to send payment receipt:", error);
      throw error;
    }

    console.log(`Payment receipt sent to ${to}:`, data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Error sending payment receipt:", error);
    throw error;
  }
}

export interface BalanceReminderEmailParams {
  to: string;
  recipientName: string;
  contractTitle: string;
  balanceAmount: number; // in cents
  currency: string;
  dueDate?: string;
  paymentUrl: string;
  depositPaidAmount?: number; // in cents
  senderName?: string;
  reminderType?: "first" | "second" | "final";
}

/**
 * Send a balance payment reminder email
 */
export async function sendBalanceReminderEmail({
  to,
  recipientName,
  contractTitle,
  balanceAmount,
  currency,
  dueDate,
  paymentUrl,
  depositPaidAmount,
  senderName,
  reminderType = "first",
}: BalanceReminderEmailParams) {
  // Format currency
  const formattedBalance = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(balanceAmount / 100);

  const formattedDeposit = depositPaidAmount
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
      }).format(depositPaidAmount / 100)
    : null;

  // Format due date
  const formattedDueDate = dueDate
    ? new Date(dueDate).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  // Urgency styling based on reminder type
  const urgencyConfig = {
    first: {
      borderColor: "#3b82f6", // blue
      bgColor: "#eff6ff",
      textColor: "#1e40af",
      label: "Payment Reminder",
      urgencyText: "",
    },
    second: {
      borderColor: "#f59e0b", // amber
      bgColor: "#fffbeb",
      textColor: "#92400e",
      label: "Payment Reminder",
      urgencyText: "This is a friendly reminder that your payment is coming due soon.",
    },
    final: {
      borderColor: "#ef4444", // red
      bgColor: "#fef2f2",
      textColor: "#991b1b",
      label: "Final Payment Reminder",
      urgencyText: "This is your final reminder. Please complete your payment to avoid any service interruptions.",
    },
  };

  const config = urgencyConfig[reminderType];

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
    <div style="background-color: ${config.bgColor}; border-left: 4px solid ${config.borderColor}; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <h2 style="color: ${config.textColor}; font-size: 18px; margin: 0;">${config.label}</h2>
    </div>

    <p style="margin: 16px 0;">Hi ${recipientName},</p>

    <p style="margin: 16px 0;">
      ${config.urgencyText ? config.urgencyText + " " : ""}This is a reminder about the remaining balance for:
    </p>

    <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <strong style="color: #111827; font-size: 16px;">${contractTitle}</strong>
    </div>

    <!-- Payment Summary -->
    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        ${
          formattedDeposit
            ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Deposit Paid</td>
          <td style="padding: 8px 0; text-align: right; color: #059669; font-weight: 600;">${formattedDeposit} ✓</td>
        </tr>
        `
            : ""
        }
        <tr style="${formattedDeposit ? "border-top: 1px solid #e5e7eb;" : ""}">
          <td style="padding: 12px 0 8px; color: #111827; font-size: 16px; font-weight: 600;">Balance Due</td>
          <td style="padding: 12px 0 8px; text-align: right; font-size: 20px; font-weight: 700; color: ${config.textColor};">${formattedBalance}</td>
        </tr>
        ${
          formattedDueDate
            ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Due Date</td>
          <td style="padding: 8px 0; text-align: right; color: #111827;">${formattedDueDate}</td>
        </tr>
        `
            : ""
        }
      </table>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${paymentUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Pay Now</a>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

    <p style="margin: 16px 0; font-size: 12px; color: #9ca3af;">
      ${senderName ? `This payment is for services provided by ${senderName}. ` : ""}
      If you have any questions or have already made this payment, please contact us.
    </p>

    <p style="margin: 16px 0; font-size: 12px; color: #9ca3af;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${paymentUrl}" style="color: #2563eb; word-break: break-all;">${paymentUrl}</a>
    </p>
  </div>

  <div style="text-align: center; margin-top: 32px; font-size: 12px; color: #9ca3af;">
    <p>Powered by <a href="https://lexport.app" style="color: #6b7280;">Lexport</a></p>
    <p>Simple, legally binding contracts for startups and freelancers.</p>
  </div>
</body>
</html>
`;

  const text = `
${config.label}

Hi ${recipientName},

${config.urgencyText ? config.urgencyText + " " : ""}This is a reminder about the remaining balance for: ${contractTitle}

${formattedDeposit ? `Deposit Paid: ${formattedDeposit}` : ""}
Balance Due: ${formattedBalance}
${formattedDueDate ? `Due Date: ${formattedDueDate}` : ""}

Pay now: ${paymentUrl}

${senderName ? `This payment is for services provided by ${senderName}.` : ""}
If you have any questions or have already made this payment, please contact us.

---
Powered by Lexport - Simple, legally binding contracts for startups and freelancers.
`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `${reminderType === "final" ? "Final Reminder: " : ""}Balance Due: ${formattedBalance} for ${contractTitle}`,
      html,
      text,
    });

    if (error) {
      console.error("Failed to send balance reminder:", error);
      throw error;
    }

    console.log(`Balance reminder sent to ${to}:`, data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Error sending balance reminder:", error);
    throw error;
  }
}

/**
 * Send notification when a contract is fully signed
 */
export async function sendContractCompletedNotification({
  to,
  contractTitle,
  contractUrl,
}: {
  to: string;
  contractTitle: string;
  contractUrl: string;
}) {
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
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background-color: #d1fae5; border-radius: 50%; padding: 16px;">
        <span style="font-size: 32px;">✓</span>
      </div>
    </div>

    <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px; text-align: center;">Contract Signed!</h2>

    <p style="margin: 16px 0; text-align: center;">
      All parties have signed the following contract:
    </p>

    <div style="background-color: #d1fae5; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
      <strong style="color: #111827; font-size: 16px;">${contractTitle}</strong>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${contractUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">View Contract</a>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

    <p style="margin: 16px 0; font-size: 12px; color: #9ca3af; text-align: center;">
      A copy of the signed contract has been saved to your account.
    </p>
  </div>

  <div style="text-align: center; margin-top: 32px; font-size: 12px; color: #9ca3af;">
    <p>Powered by <a href="https://lexport.app" style="color: #6b7280;">Lexport</a></p>
  </div>
</body>
</html>
`;

  const text = `
Contract Signed!

All parties have signed: ${contractTitle}

View the contract: ${contractUrl}

A copy of the signed contract has been saved to your account.

---
Powered by Lexport
`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Contract Signed: ${contractTitle}`,
      html,
      text,
    });

    if (error) {
      console.error("Failed to send completion notification:", error);
      throw error;
    }

    console.log(`Completion notification sent to ${to}:`, data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Error sending completion notification:", error);
    throw error;
  }
}

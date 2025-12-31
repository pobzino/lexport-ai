import { Resend } from "resend";

// Lazy initialization to avoid build-time errors when env vars are unavailable
let resendClient: Resend | null = null;
function getResend() {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// Default from address - update this with your verified domain
const FROM_EMAIL = process.env.EMAIL_FROM || "Lexport <noreply@lexportai.com>";

// Brand colors
const BRAND = {
  navy: "#202e46",
  blue: "#529ec6",
  emerald: "#10b981",
  slate: "#64748b",
  lightSlate: "#f1f5f9",
};

// Shared email wrapper with Lexport branding
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

// Secondary button style
const secondaryButton = (href: string, text: string) => `
<div style="text-align: center; margin: 32px 0;">
  <a href="${href}" style="display: inline-block; background: ${BRAND.navy}; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-weight: 600; font-size: 16px;">${text}</a>
</div>
`;

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

export interface VerificationCodeEmailParams {
  to: string;
  signerName: string;
  contractTitle: string;
  code: string;
  expiresInMinutes?: number;
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
    ? `This link expires on ${new Date(expiresAt).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })}.`
    : "";

  const personalMessage = message
    ? `
    <div style="margin: 20px 0; padding: 16px; background-color: ${BRAND.lightSlate}; border-radius: 10px; border-left: 4px solid ${BRAND.blue};">
      <p style="margin: 0; font-style: italic; color: #475569;">"${message}"</p>
    </div>`
    : "";

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background-color: ${BRAND.blue}15; color: ${BRAND.blue}; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;">📝 Signature Request</span>
    </div>

    <h2 style="color: ${BRAND.navy}; font-size: 22px; margin: 0 0 20px; text-align: center;">You've been invited to sign a contract</h2>

    <p style="margin: 16px 0; color: #475569;">Hi ${signerName},</p>

    <p style="margin: 16px 0; color: #475569;">
      ${senderName ? `<strong>${senderName}</strong> has` : "You have been"} requested your signature on the following document:
    </p>

    <div style="background: linear-gradient(135deg, ${BRAND.navy}08 0%, ${BRAND.blue}08 100%); border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid ${BRAND.navy}15;">
      <p style="margin: 0; color: ${BRAND.navy}; font-size: 18px; font-weight: 600; text-align: center;">${contractTitle}</p>
    </div>

    ${personalMessage}

    ${primaryButton(signingUrl, "Review & Sign")}

    ${expirationText ? `<p style="margin: 16px 0; font-size: 13px; color: ${BRAND.slate}; text-align: center;">${expirationText}</p>` : ""}

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;">

    <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
      Can't click the button? Copy this link:<br>
      <a href="${signingUrl}" style="color: ${BRAND.blue}; word-break: break-all;">${signingUrl}</a>
    </p>
  `;

  const html = emailWrapper(content);

  const text = `
Hi ${signerName},

${senderName ? `${senderName} has` : "You have been"} requested your signature on: ${contractTitle}

${message ? `Message: "${message}"` : ""}

Click here to review and sign: ${signingUrl}

${expirationText}

---
Powered by Lexport - AI-powered contracts & e-signatures
`;

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `✍️ Please sign: ${contractTitle}`,
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
    ? `This link expires on ${new Date(expiresAt).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })}.`
    : "";

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background-color: #fef3c7; color: #92400e; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;">⏰ Reminder</span>
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

  const html = emailWrapper(content);

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
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `⏰ Reminder: Please sign ${contractTitle}`,
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
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background-color: ${BRAND.blue}15; color: ${BRAND.blue}; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;">🔐 Secure Login</span>
    </div>

    <h2 style="color: ${BRAND.navy}; font-size: 22px; margin: 0 0 20px; text-align: center;">Sign in to Your Portal</h2>

    <p style="margin: 16px 0; color: #475569; text-align: center;">
      Click the button below to securely access your contracts and documents.
    </p>

    ${primaryButton(magicLinkUrl, "Access My Portal")}

    <div style="background-color: ${BRAND.lightSlate}; border-radius: 10px; padding: 16px; margin: 24px 0; text-align: center;">
      <p style="margin: 0; font-size: 13px; color: ${BRAND.slate};">
        🕐 This link expires in <strong>1 hour</strong> for security purposes.
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;">

    <p style="margin: 0 0 12px; font-size: 12px; color: #94a3b8; text-align: center;">
      Can't click the button? Copy this link:<br>
      <a href="${magicLinkUrl}" style="color: ${BRAND.blue}; word-break: break-all;">${magicLinkUrl}</a>
    </p>

    <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
      Didn't request this? You can safely ignore this email.
    </p>
  `;

  const html = emailWrapper(content);

  const text = `
Sign in to Your Portal

Click here to securely access your contracts: ${magicLinkUrl}

This link will expire in 1 hour for security purposes.

If you didn't request this link, you can safely ignore this email.

---
Powered by Lexport
`;

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: "🔐 Sign in to Lexport",
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

/**
 * Send a verification code email for signer authentication
 */
export async function sendVerificationCodeEmail({
  to,
  signerName,
  contractTitle,
  code,
  expiresInMinutes = 10,
}: VerificationCodeEmailParams) {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background-color: ${BRAND.blue}15; color: ${BRAND.blue}; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;">🔐 Verification Required</span>
    </div>

    <h2 style="color: ${BRAND.navy}; font-size: 22px; margin: 0 0 20px; text-align: center;">Verify Your Identity</h2>

    <p style="margin: 16px 0; color: #475569;">Hi ${signerName},</p>

    <p style="margin: 16px 0; color: #475569;">
      To sign the document <strong>"${contractTitle}"</strong>, please enter the following verification code:
    </p>

    <div style="background: linear-gradient(135deg, ${BRAND.navy}08 0%, ${BRAND.blue}08 100%); border-radius: 12px; padding: 32px; margin: 28px 0; text-align: center; border: 2px solid ${BRAND.navy}15;">
      <p style="margin: 0 0 8px; color: ${BRAND.slate}; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
      <p style="margin: 0; color: ${BRAND.navy}; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: monospace;">${code}</p>
    </div>

    <div style="background-color: ${BRAND.lightSlate}; border-radius: 10px; padding: 16px; margin: 24px 0; text-align: center;">
      <p style="margin: 0; font-size: 13px; color: ${BRAND.slate};">
        ⏱️ This code expires in <strong>${expiresInMinutes} minutes</strong>
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;">

    <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
      If you didn't request to sign this document, please ignore this email.
    </p>
  `;

  const html = emailWrapper(content);

  const text = `
Verify Your Identity

Hi ${signerName},

To sign the document "${contractTitle}", please enter this verification code:

${code}

This code expires in ${expiresInMinutes} minutes.

If you didn't request to sign this document, please ignore this email.

---
Powered by Lexport
`;

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `🔐 Verification Code: ${code}`,
      html,
      text,
    });

    if (error) {
      console.error("Failed to send verification code:", error);
      throw error;
    }

    console.log(`Verification code sent to ${to}:`, data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Error sending verification code:", error);
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
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);

  const formattedDate = new Date(paidAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const paymentTypeLabel =
    paymentType === "deposit"
      ? "Deposit Payment"
      : paymentType === "balance"
        ? "Balance Payment"
        : "Full Payment";

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background-color: #d1fae5; border-radius: 50%; padding: 20px; margin-bottom: 16px;">
        <span style="font-size: 36px;">✓</span>
      </div>
      <h2 style="color: ${BRAND.navy}; font-size: 22px; margin: 0;">Payment Received</h2>
    </div>

    <p style="margin: 16px 0; color: #475569;">Hi ${recipientName},</p>

    <p style="margin: 16px 0; color: #475569;">
      Thank you for your payment. This email confirms we have received your ${paymentTypeLabel.toLowerCase()}.
    </p>

    <!-- Payment Summary -->
    <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 1px solid #a7f3d0; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; color: #475569; font-size: 14px;">Invoice</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 600; color: ${BRAND.navy};">${invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #475569; font-size: 14px;">Contract</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 600; color: ${BRAND.navy};">${contractTitle}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #475569; font-size: 14px;">Payment Type</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 600; color: ${BRAND.navy};">${paymentTypeLabel}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #475569; font-size: 14px;">Date</td>
          <td style="padding: 10px 0; text-align: right; color: ${BRAND.navy};">${formattedDate}</td>
        </tr>
        <tr style="border-top: 2px solid #a7f3d0;">
          <td style="padding: 16px 0 8px; color: ${BRAND.navy}; font-size: 16px; font-weight: 600;">Amount Paid</td>
          <td style="padding: 16px 0 8px; text-align: right; font-size: 24px; font-weight: 700; color: ${BRAND.emerald};">${formattedAmount}</td>
        </tr>
      </table>
    </div>

    ${invoiceUrl ? secondaryButton(invoiceUrl, "Download Invoice PDF") : ""}

    ${paymentType === "deposit"
      ? `
    <div style="background-color: #fffbeb; border-radius: 10px; padding: 16px; margin: 16px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>Note:</strong> This was a deposit payment. The remaining balance will be due according to your contract terms.
      </p>
    </div>
    `
      : ""
    }

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;">

    <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
      ${senderName ? `This payment was sent to ${senderName}${senderEmail ? ` (${senderEmail})` : ""}.` : ""}
      Questions about this payment? Contact the contract owner directly.
    </p>
  `;

  const html = emailWrapper(content);

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
Powered by Lexport
`;

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `✅ Payment Receipt: ${formattedAmount} for ${contractTitle}`,
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

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background-color: ${config.bgColor}; color: ${config.textColor}; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;">${config.emoji} ${config.label}</span>
    </div>

    <h2 style="color: ${BRAND.navy}; font-size: 22px; margin: 0 0 20px; text-align: center;">Balance Payment Due</h2>

    <p style="margin: 16px 0; color: #475569;">Hi ${recipientName},</p>

    <p style="margin: 16px 0; color: #475569;">
      ${config.urgencyText ? config.urgencyText + " " : ""}This is a reminder about the remaining balance for:
    </p>

    <div style="background-color: ${BRAND.lightSlate}; border-radius: 12px; padding: 16px; margin: 16px 0; text-align: center;">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${BRAND.navy};">${contractTitle}</p>
    </div>

    <!-- Payment Summary -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        ${formattedDeposit
      ? `
        <tr>
          <td style="padding: 10px 0; color: #475569; font-size: 14px;">Deposit Paid</td>
          <td style="padding: 10px 0; text-align: right; color: ${BRAND.emerald}; font-weight: 600;">${formattedDeposit} ✓</td>
        </tr>
        `
      : ""
    }
        <tr style="${formattedDeposit ? "border-top: 1px solid #e2e8f0;" : ""}">
          <td style="padding: 14px 0; color: ${BRAND.navy}; font-size: 16px; font-weight: 600;">Balance Due</td>
          <td style="padding: 14px 0; text-align: right; font-size: 24px; font-weight: 700; color: ${config.textColor};">${formattedBalance}</td>
        </tr>
        ${formattedDueDate
      ? `
        <tr>
          <td style="padding: 10px 0; color: #475569; font-size: 14px;">Due Date</td>
          <td style="padding: 10px 0; text-align: right; color: ${BRAND.navy}; font-weight: 500;">${formattedDueDate}</td>
        </tr>
        `
      : ""
    }
      </table>
    </div>

    ${primaryButton(paymentUrl, "Pay Now")}

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;">

    <p style="margin: 0 0 12px; font-size: 12px; color: #94a3b8; text-align: center;">
      ${senderName ? `This payment is for services provided by ${senderName}.` : ""}
      Questions? Contact the contract owner directly.
    </p>

    <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
      Can't click the button? <a href="${paymentUrl}" style="color: ${BRAND.blue};">Pay here</a>
    </p>
  `;

  const html = emailWrapper(content);

  const text = `
${config.label}

Hi ${recipientName},

${config.urgencyText ? config.urgencyText + " " : ""}This is a reminder about the remaining balance for: ${contractTitle}

${formattedDeposit ? `Deposit Paid: ${formattedDeposit}` : ""}
Balance Due: ${formattedBalance}
${formattedDueDate ? `Due Date: ${formattedDueDate}` : ""}

Pay now: ${paymentUrl}

${senderName ? `This payment is for services provided by ${senderName}.` : ""}

---
Powered by Lexport
`;

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `${reminderType === "final" ? "🚨 Final Reminder: " : reminderType === "second" ? "⏰ Reminder: " : ""}Balance Due: ${formattedBalance} for ${contractTitle}`,
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

export interface CompletedContractWithCertificateParams {
  to: string;
  recipientName: string;
  contractTitle: string;
  contractUrl: string;
  certificatePdf: Buffer;
  certificateNumber: string;
  isOwner: boolean;
  signers: { name: string; email: string; signedAt: string }[];
}

/**
 * Send completed contract notification with Certificate of Completion attached
 */
export async function sendCompletedContractWithCertificate({
  to,
  recipientName,
  contractTitle,
  contractUrl,
  certificatePdf,
  certificateNumber,
  isOwner,
  signers,
}: CompletedContractWithCertificateParams) {
  const signersHtml = signers
    .map(
      (s) =>
        `<tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: ${BRAND.navy};">${s.name}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: ${BRAND.slate};">${s.email}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: ${BRAND.emerald};">✓ Signed</td>
        </tr>`
    )
    .join("");

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 50%; padding: 24px; margin-bottom: 16px;">
        <span style="font-size: 40px;">🎉</span>
      </div>
      <h2 style="color: ${BRAND.navy}; font-size: 24px; margin: 0;">Contract Fully Executed!</h2>
    </div>

    <p style="margin: 16px 0; color: #475569;">Hi ${recipientName},</p>

    <p style="margin: 16px 0; color: #475569;">
      ${isOwner
      ? "Great news! All parties have signed your contract:"
      : "Great news! All parties have signed the following contract:"}
    </p>

    <div style="background: linear-gradient(135deg, ${BRAND.emerald}10 0%, #d1fae520 100%); border: 2px solid ${BRAND.emerald}; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
      <p style="margin: 0; color: ${BRAND.navy}; font-size: 20px; font-weight: 700;">${contractTitle}</p>
      <p style="margin: 8px 0 0; color: ${BRAND.emerald}; font-size: 14px; font-weight: 600;">✓ Fully Executed</p>
    </div>

    <!-- Signature Summary -->
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <h3 style="margin: 0 0 16px; color: ${BRAND.navy}; font-size: 16px;">Signature Summary</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr style="background-color: ${BRAND.lightSlate};">
          <th style="padding: 10px 12px; text-align: left; color: ${BRAND.navy}; font-weight: 600;">Name</th>
          <th style="padding: 10px 12px; text-align: left; color: ${BRAND.navy}; font-weight: 600;">Email</th>
          <th style="padding: 10px 12px; text-align: left; color: ${BRAND.navy}; font-weight: 600;">Status</th>
        </tr>
        ${signersHtml}
      </table>
    </div>

    <!-- Certificate Info -->
    <div style="background-color: ${BRAND.blue}08; border: 1px solid ${BRAND.blue}30; border-radius: 10px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; font-size: 14px; color: ${BRAND.navy};">
        <strong>📜 Certificate of Completion</strong><br>
        <span style="color: ${BRAND.slate};">Certificate #${certificateNumber} is attached to this email.</span>
      </p>
    </div>

    ${secondaryButton(contractUrl, "View Contract")}

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;">

    <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
      This certificate provides a complete audit trail and legally verifiable record of all signatures. Keep it for your records.
    </p>
  `;

  const html = emailWrapper(content);

  const signersText = signers.map((s) => `  - ${s.name} (${s.email}): Signed`).join("\n");

  const text = `
🎉 Contract Fully Executed!

Hi ${recipientName},

${isOwner ? "Great news! All parties have signed your contract:" : "Great news! All parties have signed the following contract:"}

${contractTitle}

Signature Summary:
${signersText}

Certificate of Completion #${certificateNumber} is attached to this email.

View Contract: ${contractUrl}

This certificate provides a complete audit trail and legally verifiable record of all signatures. Keep it for your records.

---
Powered by Lexport
`;

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `🎉 Contract Signed: ${contractTitle} - Certificate Attached`,
      html,
      text,
      attachments: [
        {
          filename: `Certificate-${certificateNumber}.pdf`,
          content: certificatePdf,
        },
      ],
    });

    if (error) {
      console.error("Failed to send contract with certificate:", error);
      throw error;
    }

    console.log(`Contract with certificate sent to ${to}:`, data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Error sending contract with certificate:", error);
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
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 50%; padding: 24px; margin-bottom: 16px;">
        <span style="font-size: 40px;">🎉</span>
      </div>
      <h2 style="color: ${BRAND.navy}; font-size: 24px; margin: 0;">Contract Signed!</h2>
    </div>

    <p style="margin: 20px 0; color: #475569; text-align: center; font-size: 16px;">
      All parties have signed the following contract:
    </p>

    <div style="background: linear-gradient(135deg, ${BRAND.emerald}10 0%, #d1fae520 100%); border: 2px solid ${BRAND.emerald}; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
      <p style="margin: 0; color: ${BRAND.navy}; font-size: 20px; font-weight: 700;">${contractTitle}</p>
      <p style="margin: 8px 0 0; color: ${BRAND.emerald}; font-size: 14px; font-weight: 600;">✓ Fully Executed</p>
    </div>

    ${secondaryButton(contractUrl, "View Signed Contract")}

    <div style="background-color: ${BRAND.lightSlate}; border-radius: 10px; padding: 16px; margin: 24px 0; text-align: center;">
      <p style="margin: 0; font-size: 13px; color: ${BRAND.slate};">
        📁 A copy of the signed contract has been saved to your account.
      </p>
    </div>
  `;

  const html = emailWrapper(content);

  const text = `
🎉 Contract Signed!

All parties have signed: ${contractTitle}

View the contract: ${contractUrl}

A copy of the signed contract has been saved to your account.

---
Powered by Lexport
`;

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `🎉 Contract Signed: ${contractTitle}`,
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

export interface InvoiceEmailParams {
  to: string;
  recipientName: string;
  contractTitle: string;
  invoiceNumber: string;
  amount: number; // in cents
  currency: string;
  dueDate: string;
  paymentUrl: string;
  lineItems: { description: string; quantity: number; amount: number }[];
  senderName?: string;
  senderEmail?: string;
  notes?: string;
}

/**
 * Send an invoice email to the paying party
 */
export async function sendInvoiceEmail({
  to,
  recipientName,
  contractTitle,
  invoiceNumber,
  amount,
  currency,
  dueDate,
  paymentUrl,
  lineItems,
  senderName,
  senderEmail,
  notes,
}: InvoiceEmailParams) {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);

  const formattedDueDate = new Date(dueDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const lineItemsHtml = lineItems
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #475569;">${item.description}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #475569;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: ${BRAND.navy}; font-weight: 600;">
          ${new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(item.amount / 100)}
        </td>
      </tr>`
    )
    .join("");

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background-color: ${BRAND.blue}15; color: ${BRAND.blue}; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;">📄 Invoice</span>
    </div>

    <h2 style="color: ${BRAND.navy}; font-size: 22px; margin: 0 0 8px; text-align: center;">Invoice ${invoiceNumber}</h2>
    <p style="margin: 0 0 24px; text-align: center; color: ${BRAND.slate};">for ${contractTitle}</p>

    <p style="margin: 16px 0; color: #475569;">Hi ${recipientName},</p>

    <p style="margin: 16px 0; color: #475569;">
      ${senderName ? `${senderName} has` : "You have"} sent you the following invoice for payment:
    </p>

    <!-- Invoice Summary -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin: 24px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background-color: ${BRAND.navy}; color: white;">
            <th style="padding: 12px; text-align: left; font-weight: 600;">Description</th>
            <th style="padding: 12px; text-align: center; font-weight: 600;">Qty</th>
            <th style="padding: 12px; text-align: right; font-weight: 600;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHtml}
        </tbody>
        <tfoot>
          <tr style="background-color: ${BRAND.emerald}10;">
            <td colspan="2" style="padding: 16px; font-size: 16px; font-weight: 600; color: ${BRAND.navy};">Total Due</td>
            <td style="padding: 16px; text-align: right; font-size: 20px; font-weight: 700; color: ${BRAND.emerald};">${formattedAmount}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Due Date -->
    <div style="background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 10px; padding: 16px; margin: 24px 0; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>📅 Payment Due:</strong> ${formattedDueDate}
      </p>
    </div>

    ${notes ? `
    <div style="background-color: ${BRAND.lightSlate}; border-radius: 10px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: ${BRAND.navy};">Notes:</p>
      <p style="margin: 0; font-size: 14px; color: #475569;">${notes}</p>
    </div>
    ` : ""}

    ${primaryButton(paymentUrl, "Pay Now")}

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;">

    <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
      ${senderName ? `This invoice is from ${senderName}${senderEmail ? ` (${senderEmail})` : ""}.` : ""}
      Questions about this invoice? Reply to this email or contact the sender directly.
    </p>
  `;

  const html = emailWrapper(content);

  const lineItemsText = lineItems
    .map((item) => `  - ${item.description}: ${new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(item.amount / 100)}`)
    .join("\n");

  const text = `
Invoice ${invoiceNumber}
for ${contractTitle}

Hi ${recipientName},

${senderName ? `${senderName} has` : "You have"} sent you the following invoice for payment:

${lineItemsText}

Total Due: ${formattedAmount}
Due Date: ${formattedDueDate}

${notes ? `Notes: ${notes}` : ""}

Pay now: ${paymentUrl}

${senderName ? `This invoice is from ${senderName}${senderEmail ? ` (${senderEmail})` : ""}.` : ""}

---
Powered by Lexport
`;

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `📄 Invoice ${invoiceNumber}: ${formattedAmount} due for ${contractTitle}`,
      html,
      text,
    });

    if (error) {
      console.error("Failed to send invoice email:", error);
      throw error;
    }

    console.log(`Invoice email sent to ${to}:`, data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Error sending invoice email:", error);
    throw error;
  }
}

export interface ExpirationWarningEmailParams {
  to: string;
  signerName: string;
  contractTitle: string;
  signingUrl: string;
  expiresAt: string;
  hoursRemaining: number;
  senderName?: string;
}

/**
 * Send an expiration warning email for a contract/signature request
 */
export async function sendExpirationWarningEmail({
  to,
  signerName,
  contractTitle,
  signingUrl,
  expiresAt,
  hoursRemaining,
  senderName,
}: ExpirationWarningEmailParams) {
  const expirationDate = new Date(expiresAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  // Determine urgency level and styling
  const isUrgent = hoursRemaining <= 24;
  const urgencyConfig = isUrgent
    ? {
        bgColor: "#fef2f2",
        borderColor: "#ef4444",
        textColor: "#991b1b",
        label: "URGENT: Expires Soon",
        emoji: "🚨",
        countdownColor: "#ef4444",
      }
    : {
        bgColor: "#fffbeb",
        borderColor: "#f59e0b",
        textColor: "#92400e",
        label: "Expiring Soon",
        emoji: "⏰",
        countdownColor: "#f59e0b",
      };

  // Format time remaining
  const formatTimeRemaining = () => {
    if (hoursRemaining < 1) {
      const minutes = Math.round(hoursRemaining * 60);
      return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
    } else if (hoursRemaining < 24) {
      const hours = Math.round(hoursRemaining);
      return `${hours} hour${hours !== 1 ? "s" : ""}`;
    } else {
      const days = Math.round(hoursRemaining / 24);
      return `${days} day${days !== 1 ? "s" : ""}`;
    }
  };

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background-color: ${urgencyConfig.bgColor}; color: ${urgencyConfig.textColor}; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600; border: 1px solid ${urgencyConfig.borderColor};">${urgencyConfig.emoji} ${urgencyConfig.label}</span>
    </div>

    <h2 style="color: ${BRAND.navy}; font-size: 22px; margin: 0 0 20px; text-align: center;">Contract Expiring Soon</h2>

    <p style="margin: 16px 0; color: #475569;">Hi ${signerName},</p>

    <p style="margin: 16px 0; color: #475569;">
      ${isUrgent ? "<strong>This is an urgent reminder.</strong> " : ""}The following contract requires your signature and will expire soon:
    </p>

    <div style="background-color: ${urgencyConfig.bgColor}; border-radius: 12px; padding: 20px; margin: 24px 0; border-left: 4px solid ${urgencyConfig.borderColor};">
      <p style="margin: 0 0 12px; color: ${BRAND.navy}; font-size: 18px; font-weight: 600;">${contractTitle}</p>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 28px; font-weight: 700; color: ${urgencyConfig.countdownColor};">${formatTimeRemaining()}</span>
        <span style="color: ${urgencyConfig.textColor}; font-size: 14px;">remaining</span>
      </div>
    </div>

    <div style="background-color: ${BRAND.lightSlate}; border-radius: 10px; padding: 16px; margin: 24px 0; text-align: center;">
      <p style="margin: 0; font-size: 13px; color: ${BRAND.slate};">
        <strong>Expires:</strong> ${expirationDate}
      </p>
    </div>

    ${primaryButton(signingUrl, isUrgent ? "Sign Now - Urgent" : "Review & Sign")}

    <p style="margin: 16px 0; font-size: 14px; color: #475569; text-align: center;">
      ${isUrgent
        ? "After expiration, you will no longer be able to sign this document and a new signing request may need to be sent."
        : "Please complete your signature before the deadline to avoid any delays."
      }
    </p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;">

    <p style="margin: 0 0 12px; font-size: 12px; color: #94a3b8; text-align: center;">
      ${senderName ? `This contract was sent by ${senderName}.` : ""}
      Can't click the button? Copy this link:<br>
      <a href="${signingUrl}" style="color: ${BRAND.blue}; word-break: break-all;">${signingUrl}</a>
    </p>
  `;

  const html = emailWrapper(content);

  const text = `
${urgencyConfig.label}

Hi ${signerName},

${isUrgent ? "This is an urgent reminder. " : ""}The following contract requires your signature and will expire soon:

${contractTitle}

Time remaining: ${formatTimeRemaining()}
Expires: ${expirationDate}

Sign now: ${signingUrl}

${isUrgent
  ? "After expiration, you will no longer be able to sign this document and a new signing request may need to be sent."
  : "Please complete your signature before the deadline to avoid any delays."
}

${senderName ? `This contract was sent by ${senderName}.` : ""}

---
Powered by Lexport
`;

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `${urgencyConfig.emoji} ${isUrgent ? "URGENT: " : ""}Contract expires in ${formatTimeRemaining()}: ${contractTitle}`,
      html,
      text,
    });

    if (error) {
      console.error("Failed to send expiration warning:", error);
      throw error;
    }

    console.log(`Expiration warning sent to ${to}:`, data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Error sending expiration warning:", error);
    throw error;
  }
}

export interface InvoiceReminderEmailParams {
  to: string;
  recipientName: string;
  invoiceNumber: string;
  amount: number; // in cents
  currency: string;
  dueDate: string | null;
  paymentUrl: string;
  lineItems?: { description: string; quantity: number; amount: number }[];
  senderName?: string;
  senderEmail?: string;
  notes?: string;
  reminderType: "first" | "second" | "final" | "overdue";
  reminderCount: number;
  isOverdue: boolean;
  daysPastDue?: number;
}

/**
 * Send an invoice payment reminder email
 */
export async function sendInvoiceReminderEmail({
  to,
  recipientName,
  invoiceNumber,
  amount,
  currency,
  dueDate,
  paymentUrl,
  lineItems,
  senderName,
  senderEmail,
  notes,
  reminderType,
  reminderCount,
  isOverdue,
  daysPastDue,
}: InvoiceReminderEmailParams) {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);

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
      bgColor: `${BRAND.blue}10`,
      borderColor: BRAND.blue,
      textColor: BRAND.navy,
      label: "Payment Reminder",
      emoji: "📋",
      urgencyText: "This is a friendly reminder about your outstanding invoice.",
      subjectPrefix: "",
    },
    second: {
      bgColor: "#fffbeb",
      borderColor: "#f59e0b",
      textColor: "#92400e",
      label: "Payment Reminder",
      emoji: "⏰",
      urgencyText: "This is a follow-up reminder that your invoice payment is still pending.",
      subjectPrefix: "⏰ Reminder: ",
    },
    final: {
      bgColor: "#fef2f2",
      borderColor: "#ef4444",
      textColor: "#991b1b",
      label: "Final Payment Reminder",
      emoji: "🚨",
      urgencyText: "This is your final reminder before we close this invoice. Please complete your payment to avoid any issues.",
      subjectPrefix: "🚨 Final Reminder: ",
    },
    overdue: {
      bgColor: "#fef2f2",
      borderColor: "#dc2626",
      textColor: "#b91c1c",
      label: "Overdue Payment Notice",
      emoji: "⚠️",
      urgencyText: `Your invoice is now ${daysPastDue ? `${daysPastDue} days ` : ""}overdue. Please process your payment immediately to avoid any service interruptions.`,
      subjectPrefix: "⚠️ Overdue: ",
    },
  };

  const config = urgencyConfig[reminderType];

  const lineItemsHtml = lineItems && lineItems.length > 0
    ? lineItems
      .map(
        (item) => `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #475569;">${item.description}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #475569;">${item.quantity}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: ${BRAND.navy}; font-weight: 600;">
            ${new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(item.amount / 100)}
          </td>
        </tr>`
      )
      .join("")
    : "";

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background-color: ${config.bgColor}; color: ${config.textColor}; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;">${config.emoji} ${config.label}</span>
    </div>

    <h2 style="color: ${BRAND.navy}; font-size: 22px; margin: 0 0 8px; text-align: center;">Invoice ${invoiceNumber}</h2>
    ${reminderCount > 1 ? `<p style="margin: 0 0 24px; text-align: center; color: ${BRAND.slate}; font-size: 13px;">Reminder #${reminderCount}</p>` : ""}

    <p style="margin: 16px 0; color: #475569;">Hi ${recipientName},</p>

    <p style="margin: 16px 0; color: #475569;">
      ${config.urgencyText}
    </p>

    <!-- Invoice Summary -->
    <div style="background-color: ${isOverdue ? "#fef2f2" : "#f8fafc"}; border: 1px solid ${isOverdue ? "#fecaca" : "#e2e8f0"}; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; color: #475569; font-size: 14px;">Invoice Number</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 600; color: ${BRAND.navy};">${invoiceNumber}</td>
        </tr>
        ${formattedDueDate ? `
        <tr>
          <td style="padding: 10px 0; color: #475569; font-size: 14px;">${isOverdue ? "Was Due On" : "Due Date"}</td>
          <td style="padding: 10px 0; text-align: right; font-weight: ${isOverdue ? "600" : "500"}; color: ${isOverdue ? "#dc2626" : BRAND.navy};">${formattedDueDate}${isOverdue && daysPastDue ? ` (${daysPastDue} days ago)` : ""}</td>
        </tr>
        ` : ""}
        <tr style="border-top: 2px solid ${isOverdue ? "#fecaca" : "#e2e8f0"};">
          <td style="padding: 16px 0 8px; color: ${BRAND.navy}; font-size: 16px; font-weight: 600;">Amount Due</td>
          <td style="padding: 16px 0 8px; text-align: right; font-size: 24px; font-weight: 700; color: ${isOverdue ? "#dc2626" : config.textColor};">${formattedAmount}</td>
        </tr>
      </table>
    </div>

    ${lineItemsHtml ? `
    <!-- Line Items -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin: 24px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background-color: ${BRAND.navy}; color: white;">
            <th style="padding: 12px; text-align: left; font-weight: 600;">Description</th>
            <th style="padding: 12px; text-align: center; font-weight: 600;">Qty</th>
            <th style="padding: 12px; text-align: right; font-weight: 600;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHtml}
        </tbody>
      </table>
    </div>
    ` : ""}

    ${primaryButton(paymentUrl, isOverdue ? "Pay Now - Overdue" : "Pay Now")}

    ${notes ? `
    <div style="background-color: ${BRAND.lightSlate}; border-radius: 10px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: ${BRAND.navy};">Notes:</p>
      <p style="margin: 0; font-size: 14px; color: #475569;">${notes}</p>
    </div>
    ` : ""}

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;">

    <p style="margin: 0 0 12px; font-size: 12px; color: #94a3b8; text-align: center;">
      ${senderName ? `This invoice is from ${senderName}${senderEmail ? ` (${senderEmail})` : ""}.` : ""}
      Questions about this invoice? Reply to this email or contact the sender directly.
    </p>

    <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
      Can't click the button? <a href="${paymentUrl}" style="color: ${BRAND.blue};">Pay here</a>
    </p>
  `;

  const html = emailWrapper(content);

  const lineItemsText = lineItems && lineItems.length > 0
    ? lineItems
      .map((item) => `  - ${item.description}: ${new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(item.amount / 100)}`)
      .join("\n")
    : "";

  const text = `
${config.label}${reminderCount > 1 ? ` (#${reminderCount})` : ""}

Hi ${recipientName},

${config.urgencyText}

Invoice: ${invoiceNumber}
${formattedDueDate ? `Due Date: ${formattedDueDate}${isOverdue && daysPastDue ? ` (${daysPastDue} days overdue)` : ""}` : ""}
Amount Due: ${formattedAmount}

${lineItemsText ? `Items:\n${lineItemsText}` : ""}

${notes ? `Notes: ${notes}` : ""}

Pay now: ${paymentUrl}

${senderName ? `This invoice is from ${senderName}${senderEmail ? ` (${senderEmail})` : ""}.` : ""}

---
Powered by Lexport
`;

  const subjectLine = `${config.subjectPrefix}Invoice ${invoiceNumber}: ${formattedAmount} ${isOverdue ? "OVERDUE" : "payment due"}`;

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: subjectLine,
      html,
      text,
    });

    if (error) {
      console.error("Failed to send invoice reminder:", error);
      throw error;
    }

    console.log(`Invoice reminder sent to ${to}:`, data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Error sending invoice reminder:", error);
    throw error;
  }
}

export interface TeamInviteEmailParams {
  to: string;
  inviterName: string;
  organizationName: string;
  inviteToken: string;
  role: string;
}

/**
 * Send a team invite email
 */
export async function sendTeamInviteEmail({
  to,
  inviterName,
  organizationName,
  inviteToken,
  role,
}: TeamInviteEmailParams) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lexportai.com";
  const inviteUrl = `${baseUrl}/invite?token=${inviteToken}`;

  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background-color: ${BRAND.blue}15; color: ${BRAND.blue}; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;">👥 Team Invitation</span>
    </div>

    <h2 style="color: ${BRAND.navy}; font-size: 22px; margin: 0 0 20px; text-align: center;">You've been invited to join a team</h2>

    <p style="margin: 16px 0; color: #475569;">
      <strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on Lexport as a <strong>${roleLabel}</strong>.
    </p>

    <div style="background: linear-gradient(135deg, ${BRAND.navy}08 0%, ${BRAND.blue}08 100%); border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid ${BRAND.navy}15; text-align: center;">
      <p style="margin: 0; color: ${BRAND.navy}; font-size: 18px; font-weight: 600;">${organizationName}</p>
      <p style="margin: 8px 0 0; color: ${BRAND.slate}; font-size: 14px;">Role: ${roleLabel}</p>
    </div>

    ${primaryButton(inviteUrl, "Accept Invitation")}

    <div style="background-color: ${BRAND.lightSlate}; border-radius: 10px; padding: 16px; margin: 24px 0; text-align: center;">
      <p style="margin: 0; font-size: 13px; color: ${BRAND.slate};">
        🕐 This invitation expires in <strong>7 days</strong>
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;">

    <p style="margin: 0 0 12px; font-size: 12px; color: #94a3b8; text-align: center;">
      Can't click the button? Copy this link:<br>
      <a href="${inviteUrl}" style="color: ${BRAND.blue}; word-break: break-all;">${inviteUrl}</a>
    </p>

    <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
      Didn't expect this invitation? You can safely ignore this email.
    </p>
  `;

  const html = emailWrapper(content);

  const text = `
You've been invited to join a team

${inviterName} has invited you to join ${organizationName} on Lexport as a ${roleLabel}.

Click here to accept: ${inviteUrl}

This invitation expires in 7 days.

If you didn't expect this invitation, you can safely ignore this email.

---
Powered by Lexport
`;

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `👥 ${inviterName} invited you to join ${organizationName}`,
      html,
      text,
    });

    if (error) {
      console.error("Failed to send team invite:", error);
      throw error;
    }

    console.log(`Team invite sent to ${to}:`, data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Error sending team invite:", error);
    throw error;
  }
}


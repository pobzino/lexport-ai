import { createClient } from "@/lib/supabase/server";

export type NotificationType =
    | "contract_signed"
    | "signature_requested"
    | "signature_completed"
    | "signature_declined"
    | "payment_received"
    | "payment_failed"
    | "contract_expired"
    | "contract_expiring_soon"
    | "review_submitted"
    | "comment_added"
    // New notification types
    | "signature_reminder_sent"
    | "invoice_reminder_sent"
    | "signature_expiring_soon"
    | "signature_request_viewed"
    | "invoice_overdue";

// Notification type metadata for UI display
export const NOTIFICATION_TYPE_INFO: Record<NotificationType, { label: string; description: string; category: "signature" | "payment" | "contract" | "collaboration" }> = {
    contract_signed: { label: "Contract Signed", description: "When all parties have signed a contract", category: "contract" },
    signature_requested: { label: "Signature Requested", description: "When someone requests your signature", category: "signature" },
    signature_completed: { label: "Signature Completed", description: "When a signer completes signing", category: "signature" },
    signature_declined: { label: "Signature Declined", description: "When a signer declines to sign", category: "signature" },
    payment_received: { label: "Payment Received", description: "When you receive a payment", category: "payment" },
    payment_failed: { label: "Payment Failed", description: "When a payment fails", category: "payment" },
    contract_expired: { label: "Contract Expired", description: "When a contract expires", category: "contract" },
    contract_expiring_soon: { label: "Contract Expiring Soon", description: "When a contract is about to expire", category: "contract" },
    review_submitted: { label: "Review Submitted", description: "When a reviewer submits feedback", category: "collaboration" },
    comment_added: { label: "Comment Added", description: "When someone comments on a contract", category: "collaboration" },
    signature_reminder_sent: { label: "Signature Reminder Sent", description: "When a signing reminder is sent to a signer", category: "signature" },
    invoice_reminder_sent: { label: "Invoice Reminder Sent", description: "When an invoice reminder is sent", category: "payment" },
    signature_expiring_soon: { label: "Signature Expiring Soon", description: "24 hours before a signature request expires", category: "signature" },
    signature_request_viewed: { label: "Signature Request Viewed", description: "When a signer opens the signing page", category: "signature" },
    invoice_overdue: { label: "Invoice Overdue", description: "When an invoice passes its due date", category: "payment" },
};

interface CreateNotificationParams {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    contractId?: string;
    data?: Record<string, unknown>;
}

/**
 * Create a notification for a user
 */
export async function createNotification(params: CreateNotificationParams) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("notifications")
        .insert({
            user_id: params.userId,
            type: params.type,
            title: params.title,
            message: params.message,
            contract_id: params.contractId || null,
            data: params.data || {},
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating notification:", error);
        throw error;
    }

    return data;
}

/**
 * Notify contract owner when a signature is completed
 */
export async function notifySignatureCompleted(
    contractOwnerId: string,
    signerName: string,
    contractTitle: string,
    contractId: string
) {
    return createNotification({
        userId: contractOwnerId,
        type: "signature_completed",
        title: "Signature received",
        message: `${signerName} has signed "${contractTitle}"`,
        contractId,
    });
}

/**
 * Notify contract owner when a signature is declined
 */
export async function notifySignatureDeclined(
    contractOwnerId: string,
    signerName: string,
    contractTitle: string,
    contractId: string,
    reason?: string
) {
    return createNotification({
        userId: contractOwnerId,
        type: "signature_declined",
        title: "Signature declined",
        message: `${signerName} has declined to sign "${contractTitle}"${reason ? `: ${reason}` : ""}`,
        contractId,
        data: { reason },
    });
}

/**
 * Notify user when a signature is requested
 */
export async function notifySignatureRequested(
    signerId: string,
    senderName: string,
    contractTitle: string,
    contractId: string
) {
    return createNotification({
        userId: signerId,
        type: "signature_requested",
        title: "Signature requested",
        message: `${senderName} has requested your signature on "${contractTitle}"`,
        contractId,
    });
}

/**
 * Notify contract owner when payment is received
 */
export async function notifyPaymentReceived(
    contractOwnerId: string,
    payerName: string,
    amount: number,
    currency: string,
    contractTitle: string,
    contractId: string
) {
    const formattedAmount = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
    }).format(amount / 100);

    return createNotification({
        userId: contractOwnerId,
        type: "payment_received",
        title: "Payment received",
        message: `${payerName} paid ${formattedAmount} for "${contractTitle}"`,
        contractId,
        data: { amount, currency },
    });
}

/**
 * Notify contract owner when a contract is fully signed
 */
export async function notifyContractSigned(
    contractOwnerId: string,
    contractTitle: string,
    contractId: string
) {
    return createNotification({
        userId: contractOwnerId,
        type: "contract_signed",
        title: "Contract fully signed",
        message: `All parties have signed "${contractTitle}". The contract is now complete.`,
        contractId,
    });
}

/**
 * Notify contract owner when a comment is added
 */
export async function notifyCommentAdded(
    contractOwnerId: string,
    commenterName: string,
    contractTitle: string,
    contractId: string,
    commentPreview: string
) {
    return createNotification({
        userId: contractOwnerId,
        type: "comment_added",
        title: "New comment",
        message: `${commenterName} commented on "${contractTitle}": "${commentPreview.slice(0, 50)}${commentPreview.length > 50 ? "..." : ""}"`,
        contractId,
        data: { commenterName },
    });
}

/**
 * Notify contract owner when a signature reminder is sent
 */
export async function notifySignatureReminderSent(
    contractOwnerId: string,
    signerName: string,
    signerEmail: string,
    contractTitle: string,
    contractId: string
) {
    return createNotification({
        userId: contractOwnerId,
        type: "signature_reminder_sent",
        title: "Reminder sent",
        message: `A signing reminder was sent to ${signerName} (${signerEmail}) for "${contractTitle}"`,
        contractId,
        data: { signerName, signerEmail },
    });
}

/**
 * Notify contract owner when an invoice reminder is sent
 */
export async function notifyInvoiceReminderSent(
    contractOwnerId: string,
    recipientName: string,
    recipientEmail: string,
    invoiceNumber: string,
    contractId?: string
) {
    return createNotification({
        userId: contractOwnerId,
        type: "invoice_reminder_sent",
        title: "Invoice reminder sent",
        message: `A payment reminder was sent to ${recipientName} (${recipientEmail}) for invoice ${invoiceNumber}`,
        contractId,
        data: { recipientName, recipientEmail, invoiceNumber },
    });
}

/**
 * Notify contract owner when a signature request is about to expire (24h before)
 */
export async function notifySignatureExpiringSoon(
    contractOwnerId: string,
    signerName: string,
    contractTitle: string,
    contractId: string,
    expiresAt: string
) {
    return createNotification({
        userId: contractOwnerId,
        type: "signature_expiring_soon",
        title: "Signature expiring soon",
        message: `${signerName}'s signature request for "${contractTitle}" expires in 24 hours`,
        contractId,
        data: { signerName, expiresAt },
    });
}

/**
 * Notify contract owner when a signer views the signing page
 */
export async function notifySignatureRequestViewed(
    contractOwnerId: string,
    signerName: string,
    signerEmail: string,
    contractTitle: string,
    contractId: string
) {
    return createNotification({
        userId: contractOwnerId,
        type: "signature_request_viewed",
        title: "Document viewed",
        message: `${signerName} (${signerEmail}) has opened "${contractTitle}" for signing`,
        contractId,
        data: { signerName, signerEmail },
    });
}

/**
 * Notify contract owner when an invoice becomes overdue
 */
export async function notifyInvoiceOverdue(
    contractOwnerId: string,
    recipientName: string,
    invoiceNumber: string,
    amount: number,
    currency: string,
    dueDate: string,
    contractId?: string
) {
    const formattedAmount = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
    }).format(amount / 100);

    return createNotification({
        userId: contractOwnerId,
        type: "invoice_overdue",
        title: "Invoice overdue",
        message: `Invoice ${invoiceNumber} for ${formattedAmount} to ${recipientName} is now overdue`,
        contractId,
        data: { recipientName, invoiceNumber, amount, currency, dueDate },
    });
}

/**
 * Check if a notification type is enabled for a user
 */
export async function isNotificationEnabled(
    userId: string,
    notificationType: NotificationType,
    channel: "email" | "in_app" = "in_app"
): Promise<boolean> {
    const supabase = await createClient();

    const { data } = await supabase
        .from("notification_preferences")
        .select("email_enabled, in_app_enabled")
        .eq("user_id", userId)
        .eq("notification_type", notificationType)
        .single();

    // Default to enabled if no preference exists
    if (!data) return true;

    return channel === "email" ? data.email_enabled : data.in_app_enabled;
}

/**
 * Get all notification preferences for a user
 */
export async function getNotificationPreferences(userId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId);

    if (error) {
        console.error("Error fetching notification preferences:", error);
        return [];
    }

    return data || [];
}

/**
 * Update notification preference for a user
 */
export async function updateNotificationPreference(
    userId: string,
    notificationType: NotificationType,
    emailEnabled?: boolean,
    inAppEnabled?: boolean
) {
    const supabase = await createClient();

    const updates: Record<string, unknown> = {
        user_id: userId,
        notification_type: notificationType,
        updated_at: new Date().toISOString(),
    };

    if (emailEnabled !== undefined) {
        updates.email_enabled = emailEnabled;
    }
    if (inAppEnabled !== undefined) {
        updates.in_app_enabled = inAppEnabled;
    }

    const { data, error } = await supabase
        .from("notification_preferences")
        .upsert(updates, {
            onConflict: "user_id,notification_type",
        })
        .select()
        .single();

    if (error) {
        console.error("Error updating notification preference:", error);
        throw error;
    }

    return data;
}

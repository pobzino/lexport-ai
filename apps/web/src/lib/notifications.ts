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
    | "comment_added";

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

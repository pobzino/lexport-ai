export const PUBLIC_INVOICE_STATUSES = ["sent", "overdue", "paid"] as const;

export function getInvoicePaymentUrl(invoiceId: string, baseUrl?: string): string {
  const appUrl = (baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
    .replace(/\/$/, "");

  return `${appUrl}/pay/invoice/${invoiceId}`;
}

export function getPublicInvoicePdfUrl(invoiceId: string, baseUrl?: string): string {
  const appUrl = (baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
    .replace(/\/$/, "");

  return `${appUrl}/api/invoices/${invoiceId}?format=pdf&public=true`;
}

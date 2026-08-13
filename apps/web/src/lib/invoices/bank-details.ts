export interface InvoiceBankDetails {
  account_name?: string;
  bank_name?: string;
  account_number?: string;
  sort_code?: string;
  routing_number?: string;
  iban?: string;
  swift_bic?: string;
  reference?: string;
  instructions?: string;
}

const FIELD_LIMITS: Record<keyof InvoiceBankDetails, number> = {
  account_name: 120,
  bank_name: 120,
  account_number: 64,
  sort_code: 32,
  routing_number: 32,
  iban: 64,
  swift_bic: 32,
  reference: 120,
  instructions: 500,
};

export function normalizeInvoiceBankDetails(
  value: unknown
): InvoiceBankDetails | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const source = value as Record<string, unknown>;
  const normalized: InvoiceBankDetails = {};

  for (const [field, maxLength] of Object.entries(FIELD_LIMITS) as Array<
    [keyof InvoiceBankDetails, number]
  >) {
    const rawValue = source[field];
    if (typeof rawValue !== "string") continue;
    const cleanValue = rawValue.replace(/\r\n?/g, "\n").trim().slice(0, maxLength);
    if (cleanValue) normalized[field] = cleanValue;
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}

export function getBankDetailRows(
  details: InvoiceBankDetails | null | undefined,
  invoiceNumber?: string
): Array<{ label: string; value: string }> {
  if (!details) return [];

  const rows: Array<{ label: string; value?: string }> = [
    { label: "Account holder", value: details.account_name },
    { label: "Bank", value: details.bank_name },
    { label: "Account number", value: details.account_number },
    { label: "Sort code", value: details.sort_code },
    { label: "Routing number", value: details.routing_number },
    { label: "IBAN", value: details.iban },
    { label: "SWIFT / BIC", value: details.swift_bic },
    {
      label: "Payment reference",
      value: details.reference || invoiceNumber,
    },
    { label: "Instructions", value: details.instructions },
  ];

  return rows.filter(
    (row): row is { label: string; value: string } => Boolean(row.value)
  );
}

export function hasInvoiceBankDetails(value: unknown): boolean {
  return normalizeInvoiceBankDetails(value) !== null;
}

export function readInvoiceSenderSnapshot(invoice: {
  sender_company?: unknown;
  bank_details?: unknown;
  sender_address?: unknown;
}): {
  address: string | null;
  company: string | null;
  bankDetails: InvoiceBankDetails | null;
} {
  const senderAddress =
    invoice.sender_address &&
    typeof invoice.sender_address === "object" &&
    !Array.isArray(invoice.sender_address)
      ? (invoice.sender_address as Record<string, unknown>)
      : null;

  return {
    address:
      typeof invoice.sender_address === "string"
        ? invoice.sender_address
        : typeof senderAddress?.address === "string"
          ? senderAddress.address
          : null,
    company:
      typeof invoice.sender_company === "string"
        ? invoice.sender_company
        : typeof senderAddress?.company === "string"
          ? senderAddress.company
          : null,
    bankDetails: normalizeInvoiceBankDetails(
      invoice.bank_details ?? senderAddress?.bank_details
    ),
  };
}

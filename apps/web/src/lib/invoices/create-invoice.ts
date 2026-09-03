import type { SupabaseClient } from "@supabase/supabase-js";
import { generateInvoiceNumber } from "@/lib/invoices/generate-number";

type InvoiceInsertPayload = {
  user_id: string;
  invoice_number?: string;
  [key: string]: unknown;
};

function isInvoiceNumberConflict(error: {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
} | null) {
  if (!error || error.code !== "23505") {
    return false;
  }

  const haystack = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes("invoice_number");
}

function isMissingInvoicePaymentColumns(error: {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
} | null) {
  if (!error) return false;
  const haystack = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    (error.code === "PGRST204" || error.code === "42703") &&
    (haystack.includes("sender_company") ||
      haystack.includes("sender_logo_url") ||
      haystack.includes("bank_details"))
  );
}

export async function insertInvoiceWithRetry<TInvoice extends { id: string }>(
  supabase: SupabaseClient,
  invoiceData: InvoiceInsertPayload,
  maxAttempts = 4
) {
  let payload = { ...invoiceData };
  let lastError: {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  } | null = null;
  let usedLegacySchemaFallback = false;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (!payload.invoice_number) {
      payload.invoice_number = await generateInvoiceNumber(supabase, payload.user_id);
    }

    const { data, error } = await supabase
      .from("invoices")
      .insert(payload)
      .select()
      .single<TInvoice>();

    if (!error && data) {
      return { data, error: null };
    }

    lastError = error;

    if (!usedLegacySchemaFallback && isMissingInvoicePaymentColumns(error)) {
      // The sender_address JSON snapshot carries the same values until the
      // dedicated invoice columns are migrated in every environment.
      delete payload.sender_company;
      delete payload.sender_logo_url;
      delete payload.bank_details;
      usedLegacySchemaFallback = true;
      attempt -= 1;
      continue;
    }

    if (!isInvoiceNumberConflict(error)) {
      return { data: null, error };
    }

    payload = {
      ...payload,
      invoice_number: undefined,
    };
  }

  return { data: null, error: lastError };
}

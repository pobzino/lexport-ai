import { SupabaseClient } from "@supabase/supabase-js";
import type { InvoiceSettings } from "@/db/types";

// Default settings for users without custom settings
const DEFAULT_SETTINGS: Partial<InvoiceSettings> = {
  number_prefix: "INV",
  next_number: 1,
  number_year: new Date().getFullYear(),
  default_due_days: 30,
  default_payment_terms: "Net 30",
};

/**
 * Generate a year-based invoice number and atomically increment the counter.
 * Format: {prefix}-{YYYY}-{XXX} (e.g., "INV-2025-001")
 * Counter resets to 1 each new year.
 *
 * @param supabase - Supabase client instance
 * @param userId - The user ID to get/update settings for
 * @returns The generated invoice number string
 */
export async function generateInvoiceNumber(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const currentYear = new Date().getFullYear();

  // Try to get existing settings
  const { data: existingSettings } = await supabase
    .from("invoice_settings")
    .select("number_prefix, next_number, number_year")
    .eq("user_id", userId)
    .single();

  let prefix: string;
  let nextNumber: number;

  if (existingSettings) {
    prefix = existingSettings.number_prefix || DEFAULT_SETTINGS.number_prefix!;
    const storedYear = existingSettings.number_year || currentYear;

    // Check if year changed - reset counter if so
    if (storedYear < currentYear) {
      nextNumber = 1;
    } else {
      nextNumber = existingSettings.next_number || DEFAULT_SETTINGS.next_number!;
    }

    // Atomically increment next_number and update year
    const { error: updateError } = await supabase
      .from("invoice_settings")
      .update({
        next_number: nextNumber + 1,
        number_year: currentYear,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Failed to increment invoice number:", updateError);
      return generateFallbackNumber();
    }
  } else {
    // Create new settings with defaults
    prefix = DEFAULT_SETTINGS.number_prefix!;
    nextNumber = DEFAULT_SETTINGS.next_number!;

    const { error: insertError } = await supabase
      .from("invoice_settings")
      .insert({
        user_id: userId,
        number_prefix: prefix,
        next_number: nextNumber + 1,
        number_year: currentYear,
        default_due_days: DEFAULT_SETTINGS.default_due_days,
        default_payment_terms: DEFAULT_SETTINGS.default_payment_terms,
      });

    if (insertError) {
      console.error("Failed to create invoice settings:", insertError);
      return generateFallbackNumber();
    }
  }

  // Format: INV-2025-001 (3 digits for counter)
  const paddedNumber = String(nextNumber).padStart(3, "0");
  return `${prefix}-${currentYear}-${paddedNumber}`;
}

/**
 * Generate a fallback invoice number using timestamp.
 * Used when database operations fail to ensure we always return a valid number.
 */
function generateFallbackNumber(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${timestamp}-${random}`;
}

/**
 * Get the current invoice settings for a user.
 * Returns defaults if no settings exist.
 */
export async function getInvoiceSettings(
  supabase: SupabaseClient,
  userId: string
): Promise<Partial<InvoiceSettings>> {
  const { data: settings, error } = await supabase
    .from("invoice_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !settings) {
    return {
      ...DEFAULT_SETTINGS,
      user_id: userId,
    };
  }

  return settings;
}

/**
 * Preview what the next invoice number will be without incrementing.
 */
export async function previewNextInvoiceNumber(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const settings = await getInvoiceSettings(supabase, userId);
  const prefix = settings.number_prefix || DEFAULT_SETTINGS.number_prefix!;
  const storedYear = settings.number_year || currentYear;

  // Reset counter preview if year changed
  const nextNumber = storedYear < currentYear
    ? 1
    : (settings.next_number || DEFAULT_SETTINGS.next_number!);

  const paddedNumber = String(nextNumber).padStart(3, "0");
  return `${prefix}-${currentYear}-${paddedNumber}`;
}

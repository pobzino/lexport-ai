import { createClient } from "@supabase/supabase-js";

/**
 * Create a Supabase admin client that bypasses RLS.
 * Use this ONLY for server-side operations that need elevated permissions,
 * such as:
 * - Token-based contract signing (signer is not authenticated)
 * - Webhook handlers
 * - Scheduled jobs
 *
 * NEVER expose this client to the browser.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Supabase now issues `sb_secret_...` keys under the secret-key name. Keep
  // the legacy service-role variable as a fallback for existing deployments.
  const serviceRoleKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[admin] Missing Supabase URL or server secret key");
    throw new Error(
      "Missing Supabase admin credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

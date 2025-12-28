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
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase admin credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export type SupabaseClient = ReturnType<typeof createSupabaseClient>;

export interface CreateClientOptions {
  supabaseUrl: string;
  supabaseKey: string;
}

export function createClient({ supabaseUrl, supabaseKey }: CreateClientOptions) {
  return createSupabaseClient(supabaseUrl, supabaseKey);
}

// Environment variable helpers
export function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return { supabaseUrl, supabaseKey };
}

import { z } from "zod";

/**
 * Environment Variable Validation
 *
 * Validates all required environment variables at build/startup time.
 * Fails fast with clear error messages if configuration is missing.
 */

// Schema for server-side environment variables
const serverEnvSchema = z.object({
  // Supabase (required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("Invalid Supabase URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "Supabase anon key is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "Supabase service role key is required").optional(),

  // OpenAI (required for AI features)
  OPENAI_API_KEY: z.string().startsWith("sk-", "OpenAI API key must start with 'sk-'"),

  // Stripe (optional, but required for payments)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // Email (optional, but required for sending emails)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  SUPPORT_EMAIL: z.string().email().optional(),

  // Analytics (optional)
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),

  // App configuration
  NEXT_PUBLIC_APP_URL: z.string().url("Invalid app URL").default("http://localhost:3000"),

  // Cron security
  CRON_SECRET: z.string().optional(),

  // Node environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

// Schema for client-side environment variables (subset of server env)
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

// Validate and export server environment
function validateServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([key, messages]) => `  ${key}: ${messages?.join(", ")}`)
      .join("\n");

    console.error("\n❌ Invalid environment variables:\n" + errorMessages + "\n");

    // In production, fail hard. In development, warn but continue.
    if (process.env.NODE_ENV === "production") {
      throw new Error("Invalid environment configuration. Check server logs.");
    }

    // Return partial env in development to allow app to start
    return process.env as unknown as ServerEnv;
  }

  return parsed.data;
}

// Validate and export client environment
function validateClientEnv(): ClientEnv {
  const clientVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };

  const parsed = clientEnvSchema.safeParse(clientVars);

  if (!parsed.success) {
    console.error("❌ Invalid client environment variables");
    return clientVars as unknown as ClientEnv;
  }

  return parsed.data;
}

// Export validated environment
export const env = validateServerEnv();
export const clientEnv = validateClientEnv();

// Helper to check if a feature is configured
export const features = {
  payments: !!env.STRIPE_SECRET_KEY && !!env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  email: !!env.RESEND_API_KEY,
  analytics: !!env.NEXT_PUBLIC_POSTHOG_KEY,
  webhooks: !!env.STRIPE_WEBHOOK_SECRET,
} as const;

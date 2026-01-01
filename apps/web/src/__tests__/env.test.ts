import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";

// Test environment validation schemas directly
describe("Environment Validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Server Environment Schema", () => {
    const serverEnvSchema = z.object({
      NEXT_PUBLIC_SUPABASE_URL: z.string().url("Invalid Supabase URL"),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "Supabase anon key is required"),
      OPENAI_API_KEY: z.string().startsWith("sk-", "OpenAI API key must start with 'sk-'"),
      STRIPE_SECRET_KEY: z.string().optional(),
      NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
    });

    it("should validate correct environment variables", () => {
      const validEnv = {
        NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
        OPENAI_API_KEY: "sk-test-key-12345",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      };

      const result = serverEnvSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
    });

    it("should reject invalid Supabase URL", () => {
      const invalidEnv = {
        NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
        OPENAI_API_KEY: "sk-test-key-12345",
      };

      const result = serverEnvSchema.safeParse(invalidEnv);
      expect(result.success).toBe(false);
    });

    it("should reject OpenAI key without sk- prefix", () => {
      const invalidEnv = {
        NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
        OPENAI_API_KEY: "invalid-key",
      };

      const result = serverEnvSchema.safeParse(invalidEnv);
      expect(result.success).toBe(false);
    });

    it("should use default app URL if not provided", () => {
      const envWithoutAppUrl = {
        NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
        OPENAI_API_KEY: "sk-test-key-12345",
      };

      const result = serverEnvSchema.safeParse(envWithoutAppUrl);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
      }
    });
  });

  describe("Feature Detection", () => {
    it("should detect when payments are configured", () => {
      const hasPayments = !!(
        process.env.STRIPE_SECRET_KEY &&
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      );
      // In test env, these are not set
      expect(hasPayments).toBe(false);
    });

    it("should detect when analytics is configured", () => {
      const hasAnalytics = !!process.env.NEXT_PUBLIC_POSTHOG_KEY;
      // In test env, this is not set
      expect(hasAnalytics).toBe(false);
    });
  });
});

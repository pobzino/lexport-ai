import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import OpenAI from "openai";
import {
  INTAKE_MODEL,
  INTAKE_SYSTEM_PROMPT,
} from "@/lib/contracts/intake-prompt";

// Read real API key from .env.local (vitest.setup.ts overrides with sk-test-key)
function getRealApiKey(): string | undefined {
  try {
    const envFile = readFileSync(resolve(__dirname, "../../.env.local"), "utf-8");
    const match = envFile.match(/^OPENAI_API_KEY=(.+)$/m);
    return match?.[1]?.trim();
  } catch {
    return undefined;
  }
}
const OPENAI_API_KEY = getRealApiKey();

async function analyzeDescription(description: string): Promise<Record<string, unknown>> {
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY, dangerouslyAllowBrowser: true });
  const response = await openai.chat.completions.create({
    model: INTAKE_MODEL,
    messages: [
      { role: "system", content: INTAKE_SYSTEM_PROMPT },
      { role: "user", content: description },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI");
  return JSON.parse(content);
}

describe.skipIf(!OPENAI_API_KEY)("intake API — live OpenAI tests", () => {
  it("extracts deposit details from freelance description", async () => {
    const result = await analyzeDescription(
      "I need a freelance contract for a web redesign project, £10000 total, with 40% deposit upfront"
    );
    const ef = result.extractedFields as Record<string, unknown>;

    expect(ef.totalAmount).toBe(10000);
    expect(ef.paymentRequired).toBe(true);
    expect(ef.paymentCurrency).toBe("gbp");
    expect(ef.paymentStructure).toBe("deposit_balance");
    expect(ef.depositPercentage).toBe(40);
  }, 30_000);

  it("extracts consultant details and hourly rate", async () => {
    const result = await analyzeDescription(
      "consulting agreement with John Smith at Acme Corp, $150/hour for 6 months"
    );
    const ef = result.extractedFields as Record<string, unknown>;

    expect(ef.paymentRequired).toBe(true);
    expect(ef.paymentCurrency).toBe("usd");
    expect(ef.hourlyRate).toBe(150);
    expect(ef.consultantName).toContain("John");
    expect(ef.duration).toBeDefined();
    expect(result.suggestedType).toBe("consulting_agreement");
  }, 30_000);

  it("extracts multiple non-payment fields", async () => {
    const result = await analyzeDescription(
      "NDA between my company TechFlow and Sarah Jones at InnovateCo, for discussing a potential partnership, 3 year confidentiality period"
    );
    const ef = result.extractedFields as Record<string, unknown>;

    // Should extract party names and details
    expect(ef).toHaveProperty("purpose");
    expect(ef.confidentialityPeriod).toBe(3);
    // Should identify at least one party name (may be string or nested object)
    const allValues = JSON.stringify(ef);
    expect(allValues).toContain("Sarah");
  }, 30_000);
});

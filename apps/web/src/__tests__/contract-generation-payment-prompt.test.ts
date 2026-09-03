import { describe, expect, it } from "vitest";

import {
  buildContractGenerationInput,
  parseGeneratedContractResponseContent,
} from "@/lib/contracts/generator-streaming";
import type {
  FreelanceMetadata,
  PaymentConfig,
} from "@/lib/contracts/schemas";

describe("contract generation payment prompt", () => {
  it("passes the exact currency and ordered payment stages to the model", () => {
    const metadata = {
      contractType: "freelance_service",
      jurisdiction: "uk",
      client: { name: "Pobor E", email: "client@example.com", role: "client" },
      freelancer: {
        name: "Test Company Inc",
        email: "provider@example.com",
        role: "contractor",
      },
      projectName: "QA launch testing",
      projectDescription: "Test signatures, invoices, and payments",
      totalAmount: 3,
      paymentSchedule: "milestone",
      revisionRounds: 2,
      effectiveDate: "2026-09-03",
      deliverables: [{ description: "Complete QA testing" }],
      includeIPAssignment: true,
    } as FreelanceMetadata;
    const paymentConfig = {
      paymentRequired: true,
      paymentAmount: 3,
      paymentCurrency: "gbp",
      paymentStructure: "custom",
      paymentSchedule: [
        { id: "stage-1", label: "QA Kickoff", percentage: 25 },
        { id: "stage-2", label: "QA Midpoint", percentage: 35 },
        { id: "stage-3", label: "QA Final Verification", percentage: 40 },
      ],
    } satisfies PaymentConfig;

    const input = buildContractGenerationInput(
      "freelance_service",
      metadata,
      paymentConfig
    );
    const prompt = input.map((message) => message.content).join("\n");

    expect(prompt).toContain("Total fee: £3.00 (GBP)");
    expect(prompt).toContain("Total Amount: £3.00");
    expect(prompt).not.toContain("Total Amount: $3");
    expect(prompt).toContain("1. QA Kickoff: 25% (£0.75)");
    expect(prompt).toContain("2. QA Midpoint: 35% (£1.05)");
    expect(prompt).toContain("3. QA Final Verification: 40% (£1.20)");
    expect(prompt).toContain("do not describe them as a single milestone");
  });

  it("normalizes escaped model line breaks before persistence", () => {
    const generated = parseGeneratedContractResponseContent(
      "freelance_service",
      JSON.stringify({
        title: "Freelance Service Agreement",
        preamble: "First line\\nSecond line",
        recitals: "A. First\\nB. Second",
        clauses: [
          {
            id: "clause-1",
            title: "Payment",
            content: "1.1 Kickoff\\n1.2 Final",
            type: "standard",
            order: 1,
          },
        ],
        signatureBlock: "CLIENT\\nBy: __________",
      })
    );

    expect(generated.preamble).toBe("First line\nSecond line");
    expect(generated.recitals).toBe("A. First\nB. Second");
    expect(generated.clauses[0].content).toBe("1.1 Kickoff\n1.2 Final");
    expect(generated.signatureBlock).toBe("CLIENT\nBy: __________");
  });
});

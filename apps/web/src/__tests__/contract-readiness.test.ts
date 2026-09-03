import { describe, expect, it } from "vitest";
import type { ContractContent } from "@/db/types";
import {
  findUnresolvedContractPlaceholders,
  shouldCheckContractPlaceholders,
} from "@/lib/contracts/readiness";

function content(overrides: Partial<ContractContent> = {}): ContractContent {
  return {
    preamble: "This agreement is made on 3 September 2026.",
    recitals: "The parties wish to record their agreement.",
    clauses: [],
    signatureBlock: "Signed by the parties.",
    ...overrides,
  };
}

describe("contract readiness", () => {
  it("finds labelled blanks in generated legal text", () => {
    const unresolved = findUnresolvedContractPlaceholders(
      content({
        clauses: [
          {
            id: "payment",
            title: "Payment",
            order: 1,
            content:
              "Payment is due within _____[Payment Period in Days]_____ days. Milestone: [Stage 1 Description and Amount].",
          },
        ],
      }),
    );

    expect(unresolved.map(({ text }) => text)).toEqual([
      "_____[Payment Period in Days]_____",
      "[Stage 1 Description and Amount]",
    ]);
  });

  it("finds alternate template markers", () => {
    const unresolved = findUnresolvedContractPlaceholders(
      content({
        preamble: "Between {{Client Name}} and <<Supplier Name>>.",
        recitals: "The delivery date is TBD.",
        signatureBlock: "Reference: __________",
      }),
    );

    expect(unresolved).toHaveLength(4);
  });

  it("does not flag completed prose or legal citations", () => {
    const unresolved = findUnresolvedContractPlaceholders(
      content({
        clauses: [
          {
            id: "law",
            title: "Governing Law",
            order: 1,
            content:
              "The parties refer to Example Ltd v Smith [2024] EWCA Civ 123 and agree payment is due within 14 days.",
          },
        ],
      }),
    );

    expect(unresolved).toEqual([]);
  });

  it("exempts uploaded sign-only originals but checks editable uploads", () => {
    expect(
      shouldCheckContractPlaceholders({
        source_type: "uploaded",
        processing_mode: "sign_only",
      }),
    ).toBe(false);
    expect(
      shouldCheckContractPlaceholders({
        source_type: "uploaded",
        processing_mode: "edit_and_sign",
      }),
    ).toBe(true);
    expect(
      shouldCheckContractPlaceholders({ source_type: "generated" }),
    ).toBe(true);
  });
});

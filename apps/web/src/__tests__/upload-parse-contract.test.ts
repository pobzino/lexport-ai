import { describe, expect, it } from "vitest";
import { parseContractTextFallback } from "@/lib/upload/parse-contract";

describe("uploaded contract fallback parser", () => {
  it("splits headed contracts and preserves their legal text", () => {
    const source = `SERVICE AGREEMENT

This Agreement is made between Acme Ltd and Example Ltd.

1. Services
The Supplier will provide design and development services.

2. Payment
The Client will pay GBP 12,000 in four stages.

3. Governing Law
This Agreement is governed by the laws of England and Wales.

SIGNATURES
Signed for Acme Ltd: ____________________`;

    const result = parseContractTextFallback(source);

    expect(result.content.preamble).toContain("This Agreement is made");
    expect(result.content.clauses.map((clause) => clause.title)).toEqual([
      "Services",
      "Payment",
      "Governing Law",
    ]);
    expect(result.content.clauses[1].content).toContain("GBP 12,000");
    expect(result.content.signatureBlock).toContain("Signed for Acme Ltd");
    expect(result.suggestedJurisdiction).toBe("UK");
    expect(result.suggestedType).toBe("service_agreement");
  });

  it("keeps unstructured documents intact as one editable clause", () => {
    const source =
      "NON-DISCLOSURE AGREEMENT\nThe parties agree that all supplied information remains confidential and must not be disclosed without written consent.";

    const result = parseContractTextFallback(source);

    expect(result.content.clauses).toHaveLength(1);
    expect(result.content.clauses[0].content).toBe(source);
    expect(result.suggestedType).toBe("nda_mutual");
    expect(result.confidence).toBe("low");
  });
});

import { describe, expect, it } from "vitest";
import { parseContractTextFallback } from "@/lib/upload/parse-contract";
import {
  detectScannedPdf,
  normalizeExtractedText,
} from "@/lib/upload/extract-pdf";

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

  it("recovers sections from flattened PDF text and removes page headers", () => {
    const source = `SALYX SERVICE AGREEMENT LOX DIGITAL PRIVATE & CONFIDENTIAL Page 1 SERVICE AGREEMENT SALYX Ecosystem MVP Short-form development, licensing and data-processing terms Parties 1.1 This agreement is between Mayowa Akinyemi, trading as SALYX (the Client), and LOX Digital. 1.2 The contact details on the execution page are used for notices. Agreement and project 2.1 LOX Digital will design, build, migrate and launch the SALYX Ecosystem MVP. 2.2 The proposal is incorporated as Schedule 1. If the documents conflict, this agreement prevails on legal terms. SALYX SERVICE AGREEMENT LOX DIGITAL PRIVATE & CONFIDENTIAL Page 2 Fees, review and delivery 3.1 The fixed project fee is £4,000, payable in four stages. 3.2 Invoices are due within three Business Days. SIGNATURES Signed for SALYX: ____________________`;

    const result = parseContractTextFallback(source);

    expect(result.suggestedTitle).toBe("SALYX SERVICE AGREEMENT");
    expect(result.content.clauses.map((clause) => clause.title)).toEqual([
      "Parties",
      "Agreement and project",
      "Fees, review and delivery",
    ]);
    expect(result.content.clauses[0].content).toContain("1.2 The contact details");
    expect(result.content.clauses[2].content).toContain("£4,000");
    expect(result.content.signatureBlock).toContain("Signed for SALYX");
    expect(JSON.stringify(result.content)).not.toContain("PRIVATE & CONFIDENTIAL");
    expect(JSON.stringify(result.content)).not.toContain("Page 2");
    expect(result.confidence).toBe("high");
  });

  it("normalizes PDF whitespace without removing line boundaries", () => {
    const source = "SERVICE AGREEMENT\r\n\r\n1. Services\nThe Supplier   will perform work.\n\n\n2. Fees\nGBP 1,000";

    expect(normalizeExtractedText(source)).toBe(
      "SERVICE AGREEMENT\n\n1. Services\nThe Supplier will perform work.\n\n2. Fees\nGBP 1,000"
    );
  });

  it("detects image-only PDFs without misclassifying readable contracts", () => {
    expect(detectScannedPdf("", 3)).toBe(true);
    expect(detectScannedPdf("Page 1", 4)).toBe(true);
    expect(detectScannedPdf("A".repeat(600), 3)).toBe(false);
  });
});

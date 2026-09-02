import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { renderLegalContractPdf } from "@/lib/pdf/legal-contract";

describe("legal contract PDF renderer", () => {
  it("uses the sender identity and keeps execution on a dedicated page", async () => {
    const bytes = await renderLegalContractPdf({
      title: "Professional Services Agreement",
      jurisdiction: "uk",
      identity: { companyName: "Example Agency" },
      content: {
        preamble: "This agreement is between Example Agency and Example Client Ltd.",
        clauses: [
          {
            title: "1. Services",
            content: "The Supplier will provide the services with reasonable skill and care.",
          },
        ],
      },
      signatureRequests: [
        {
          id: "request-1",
          signer_name: "Alex Client",
          signer_email: "alex@example.com",
          signer_role: "Client",
          status: "pending",
        },
      ],
    });

    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(2);
    expect(pdf.getTitle()).toBe("Professional Services Agreement");
    expect(pdf.getAuthor()).toBe("Example Agency");
  });
});

import { describe, expect, it } from "vitest";
import {
  getPdfResponseHeaders,
  sanitizePdfFilename,
} from "@/lib/pdf/response";

describe("PDF response headers", () => {
  it("serves previews inline with private short-lived caching", () => {
    expect(getPdfResponseHeaders("Client agreement", "inline")).toEqual({
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="Client_agreement.pdf"',
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    });
  });

  it("keeps explicit downloads as attachments without caching", () => {
    const headers = getPdfResponseHeaders("Client agreement", "attachment");
    expect(headers["Content-Disposition"]).toBe(
      'attachment; filename="Client_agreement.pdf"',
    );
    expect(headers["Cache-Control"]).toBe("private, no-store");
  });

  it("sanitizes unsafe and empty filenames", () => {
    expect(sanitizePdfFilename('../../Client: "Agreement"')).toBe(
      "Client_Agreement",
    );
    expect(sanitizePdfFilename("💥")).toBe("contract");
  });
});

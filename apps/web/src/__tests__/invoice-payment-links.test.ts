import { describe, expect, it } from "vitest";
import {
  getInvoicePaymentUrl,
  getPublicInvoicePdfUrl,
  PUBLIC_INVOICE_STATUSES,
} from "@/lib/invoices/payment-link";
import {
  calculatePlatformFee,
  getPaymentMethodConfiguration,
} from "@/lib/stripe";

describe("invoice payment links", () => {
  it("always sends recipients to the public invoice checkout", () => {
    expect(getInvoicePaymentUrl("invoice-123", "https://lexportai.com/"))
      .toBe("https://lexportai.com/pay/invoice/invoice-123");
  });

  it("creates a public, non-cached PDF URL for receipt emails", () => {
    expect(getPublicInvoicePdfUrl("invoice-123", "https://lexportai.com"))
      .toBe("https://lexportai.com/api/invoices/invoice-123?format=pdf&public=true");
  });

  it("only exposes statuses defined by the production invoice enum", () => {
    expect(PUBLIC_INVOICE_STATUSES).toEqual(["sent", "overdue", "paid"]);
  });
});

describe("Stripe payment method configuration", () => {
  it("only sends ACH options for USD", () => {
    const config = getPaymentMethodConfiguration("USD");

    expect(config.paymentMethodTypes).toEqual(["card", "link", "us_bank_account"]);
    expect(config.paymentMethodOptions).toHaveProperty("us_bank_account");
    expect(config.paymentMethodOptions).not.toHaveProperty("bacs_debit");
    expect(config.paymentMethodOptions).not.toHaveProperty("sepa_debit");
  });

  it("only sends Bacs options for GBP", () => {
    const config = getPaymentMethodConfiguration("gbp");

    expect(config.paymentMethodTypes).toEqual(["card", "link", "bacs_debit"]);
    expect(config.paymentMethodOptions).toHaveProperty("bacs_debit");
    expect(config.paymentMethodOptions).not.toHaveProperty("us_bank_account");
  });

  it("falls back to card and Link for other currencies", () => {
    expect(getPaymentMethodConfiguration("cad")).toEqual({
      paymentMethodTypes: ["card", "link"],
    });
  });

  it("keeps the team platform fee at zero", () => {
    expect(calculatePlatformFee(100_00, "team")).toBe(0);
  });
});

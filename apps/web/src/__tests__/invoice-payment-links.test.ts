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
import { getPreferredPaymentMethodOrder } from "@/lib/payments/payment-methods";

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
  it("lets Stripe select eligible methods for the payment context", () => {
    expect(getPaymentMethodConfiguration()).toEqual({
      automatic_payment_methods: { enabled: true },
      excluded_payment_method_types: ["klarna"],
    });
  });

  it("keeps the team platform fee at zero", () => {
    expect(calculatePlatformFee(100_00, "team")).toBe(0);
  });

  it("prefers UK Pay by Bank for eligible GBP payments", () => {
    expect(getPreferredPaymentMethodOrder("GBP")).toEqual([
      "pay_by_bank",
      "bacs_debit",
      "card",
      "link",
    ]);
  });

  it("does not promote Klarna in the B2B invoice checkout", () => {
    expect(getPreferredPaymentMethodOrder("USD")).not.toContain("klarna");
    expect(getPreferredPaymentMethodOrder("EUR")).not.toContain("klarna");
  });
});

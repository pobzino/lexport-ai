import { describe, expect, it } from "vitest";
import {
  getBankDetailRows,
  normalizeInvoiceBankDetails,
  readInvoiceSenderSnapshot,
} from "@/lib/invoices/bank-details";

describe("invoice bank details", () => {
  it("keeps only supported non-empty string fields", () => {
    expect(
      normalizeInvoiceBankDetails({
        account_name: "  Acme Studio Ltd  ",
        account_number: "12345678",
        sort_code: "20-00-00",
        unexpected_secret: "ignore me",
        bank_name: 123,
      })
    ).toEqual({
      account_name: "Acme Studio Ltd",
      account_number: "12345678",
      sort_code: "20-00-00",
    });
  });

  it("returns null when no usable instructions were supplied", () => {
    expect(normalizeInvoiceBankDetails(null)).toBeNull();
    expect(normalizeInvoiceBankDetails({ account_name: "   " })).toBeNull();
  });

  it("uses the invoice number as the transfer reference when none is set", () => {
    const rows = getBankDetailRows(
      { account_name: "Acme Studio Ltd", iban: "GB00 TEST 1234" },
      "INV-00042"
    );

    expect(rows).toContainEqual({
      label: "Payment reference",
      value: "INV-00042",
    });
  });

  it("limits free-form instructions before they are persisted or sent", () => {
    const result = normalizeInvoiceBankDetails({ instructions: "x".repeat(600) });

    expect(result?.instructions).toHaveLength(500);
  });

  it("reads the legacy JSON snapshot until dedicated columns are migrated", () => {
    expect(
      readInvoiceSenderSnapshot({
        sender_address: {
          address: "10 High Street",
          company: "Acme Studio Ltd",
          bank_details: { account_number: "12345678" },
        },
      })
    ).toEqual({
      address: "10 High Street",
      company: "Acme Studio Ltd",
      bankDetails: { account_number: "12345678" },
    });
  });
});

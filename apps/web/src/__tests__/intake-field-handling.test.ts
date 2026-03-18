import { describe, expect, it } from "vitest";

/**
 * Tests for intake field handling — payment field stripping,
 * field value formatting, and field label formatting.
 *
 * These mirror the functions in contracts/new/page.tsx.
 */

// Replicate the payment fields filter list used in the frontend
const PAYMENT_INTERNAL_FIELDS = [
  "paymentRequired",
  "paymentCurrency",
  "paymentStructure",
  "depositPercentage",
];

function stripPaymentFields(
  fields: Record<string, unknown>
): Record<string, unknown> {
  const {
    paymentRequired: _pr,
    paymentCurrency: _pc,
    paymentStructure: _ps,
    depositPercentage: _dp,
    ...rest
  } = fields;
  return rest;
}

function formatFieldLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/([a-z])([A-Z])/g, "$1 $2");
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return "Not specified";
  if (Array.isArray(value)) {
    return (
      value
        .map((item) =>
          typeof item === "object" && item !== null && "name" in item
            ? (item as { name: string }).name
            : String(item)
        )
        .filter(Boolean)
        .join(", ") || "Not specified"
    );
  }
  if (typeof value === "object" && value !== null) {
    if ("name" in value) return (value as { name: string }).name;
    return JSON.stringify(value);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const str = String(value);
  if (str === "null" || str === "undefined") return "Not specified";
  return str
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

describe("intake field handling", () => {
  describe("stripPaymentFields", () => {
    it("removes payment-internal fields from extracted data", () => {
      const extracted = {
        totalAmount: 10000,
        projectDescription: "web redesign",
        clientName: "Acme Corp",
        paymentRequired: true,
        paymentCurrency: "gbp",
        paymentStructure: "deposit_balance",
        depositPercentage: 40,
      };

      const result = stripPaymentFields(extracted);

      expect(result).toEqual({
        totalAmount: 10000,
        projectDescription: "web redesign",
        clientName: "Acme Corp",
      });
      expect(result).not.toHaveProperty("paymentRequired");
      expect(result).not.toHaveProperty("paymentCurrency");
      expect(result).not.toHaveProperty("paymentStructure");
      expect(result).not.toHaveProperty("depositPercentage");
    });

    it("preserves all fields when no payment fields present", () => {
      const extracted = {
        purpose: "protecting trade secrets",
        confidentialityPeriod: 2,
      };

      expect(stripPaymentFields(extracted)).toEqual(extracted);
    });

    it("returns empty object when only payment fields present", () => {
      const extracted = {
        paymentRequired: true,
        paymentCurrency: "usd",
      };

      expect(stripPaymentFields(extracted)).toEqual({});
    });
  });

  describe("PAYMENT_INTERNAL_FIELDS filter", () => {
    it("filters payment fields from display list", () => {
      const fields = {
        totalAmount: 5000,
        projectDescription: "website",
        paymentRequired: true,
        paymentCurrency: "usd",
        paymentStructure: "full",
        depositPercentage: 30,
      };

      const displayFields = Object.entries(fields).filter(
        ([key]) => !PAYMENT_INTERNAL_FIELDS.includes(key)
      );

      expect(displayFields.map(([k]) => k)).toEqual([
        "totalAmount",
        "projectDescription",
      ]);
    });
  });

  describe("formatFieldLabel", () => {
    it("converts camelCase to Title Case", () => {
      expect(formatFieldLabel("totalAmount")).toBe("Total Amount");
      expect(formatFieldLabel("clientName")).toBe("Client Name");
      expect(formatFieldLabel("projectDescription")).toBe(
        "Project Description"
      );
    });

    it("handles single word", () => {
      expect(formatFieldLabel("purpose")).toBe("Purpose");
    });

    it("handles multiple capitals", () => {
      expect(formatFieldLabel("hourlyRate")).toBe("Hourly Rate");
      expect(formatFieldLabel("consultingScope")).toBe("Consulting Scope");
    });
  });

  describe("formatFieldValue", () => {
    it("formats snake_case values as Title Case", () => {
      expect(formatFieldValue("deposit_balance")).toBe("Deposit Balance");
      expect(formatFieldValue("full")).toBe("Full");
    });

    it("formats camelCase values as Title Case", () => {
      expect(formatFieldValue("buyNowPayLater")).toBe("Buy Now Pay Later");
    });

    it("formats numbers as-is", () => {
      expect(formatFieldValue(10000)).toBe("10000");
      expect(formatFieldValue(150)).toBe("150");
    });

    it("formats booleans as Yes/No", () => {
      expect(formatFieldValue(true)).toBe("Yes");
      expect(formatFieldValue(false)).toBe("No");
    });

    it("handles null/undefined", () => {
      expect(formatFieldValue(null)).toBe("Not specified");
      expect(formatFieldValue(undefined)).toBe("Not specified");
    });

    it("handles arrays", () => {
      expect(formatFieldValue(["item1", "item2"])).toBe("item1, item2");
      expect(formatFieldValue([])).toBe("Not specified");
    });

    it("handles objects with name", () => {
      expect(formatFieldValue({ name: "John Smith" })).toBe("John Smith");
    });

    it("handles currency codes", () => {
      expect(formatFieldValue("gbp")).toBe("Gbp");
      expect(formatFieldValue("usd")).toBe("Usd");
    });
  });
});

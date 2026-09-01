import { describe, expect, it } from "vitest";
import { isPayingSignerRole } from "@/lib/payments/payer-role";

describe("isPayingSignerRole", () => {
  it.each([
    "Client",
    "Buyer",
    "Customer",
    "Employer",
    "Hiring Party",
    "Investor",
    "Purchaser",
  ])("recognizes common payer role %s", (role) => {
    expect(isPayingSignerRole(role)).toBe(true);
  });

  it.each([
    "Freelancer",
    "Independent Contractor",
    "Consultant",
    "Seller",
    "Vendor",
    "Employee",
  ])("does not charge payee role %s", (role) => {
    expect(isPayingSignerRole(role)).toBe(false);
  });

  it("fails closed for missing or custom roles", () => {
    expect(isPayingSignerRole(undefined)).toBe(false);
    expect(isPayingSignerRole("Party Alpha")).toBe(false);
  });
});

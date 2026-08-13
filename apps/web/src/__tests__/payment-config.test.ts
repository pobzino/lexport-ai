import { describe, expect, it } from "vitest";
import { PaymentConfigSchema } from "@/lib/contracts/schemas";
import {
  SUPPORTED_PAYMENT_CURRENCIES,
  formatPaymentAmount,
  getMilestoneAmount,
  getScheduleTotal,
  isPaymentScheduleValid,
  normalizePaymentSchedule,
} from "@/lib/payments/config";

describe("flexible payment configuration", () => {
  it("supports GBP and other Stripe currencies", () => {
    expect(SUPPORTED_PAYMENT_CURRENCIES).toContain("gbp");
    expect(SUPPORTED_PAYMENT_CURRENCIES).toContain("cad");
    expect(formatPaymentAmount(1500, "gbp")).toContain("1,500");
  });

  it("validates a four-stage schedule totaling 100 percent", () => {
    const result = PaymentConfigSchema.safeParse({
      paymentRequired: true,
      paymentAmount: 12000,
      paymentCurrency: "gbp",
      paymentStructure: "custom",
      paymentSchedule: [
        { id: "one", label: "Booking", percentage: 20 },
        { id: "two", label: "Design", percentage: 30 },
        { id: "three", label: "Build", percentage: 30 },
        { id: "four", label: "Launch", percentage: 20 },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects schedules that do not total 100 percent", () => {
    const result = PaymentConfigSchema.safeParse({
      paymentRequired: true,
      paymentStructure: "custom",
      paymentSchedule: [
        { id: "one", label: "Start", percentage: 30 },
        { id: "two", label: "Finish", percentage: 30 },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects blank or zero-value stages before submission", () => {
    expect(isPaymentScheduleValid([
      { id: "one", label: "", percentage: 50 },
      { id: "two", label: "Finish", percentage: 50 },
    ])).toBe(false);
    expect(isPaymentScheduleValid([
      { id: "one", label: "Start", percentage: 100 },
      { id: "two", label: "Finish", percentage: 0 },
    ])).toBe(false);
  });

  it("normalizes schedule data and ignores invalid milestones", () => {
    const schedule = normalizePaymentSchedule([
      { id: "start", label: " Start ", percentage: 25 },
      { label: "Finish", percentage: 75, dueDate: "2026-09-01" },
      { id: "invalid", label: "Invalid", percentage: 0 },
    ]);

    expect(schedule).toHaveLength(2);
    expect(schedule[0].label).toBe("Start");
    expect(schedule[1].id).toBe("stage-2");
    expect(getScheduleTotal(schedule)).toBe(100);
  });

  it("reconciles rounding on the final milestone", () => {
    const schedule = [
      { id: "one", label: "One", percentage: 33.33 },
      { id: "two", label: "Two", percentage: 33.33 },
      { id: "three", label: "Three", percentage: 33.34 },
    ];
    const amounts = schedule.map((_, index) =>
      getMilestoneAmount(10001, schedule, index)
    );

    expect(amounts.reduce((sum, amount) => sum + amount, 0)).toBe(10001);
  });
});

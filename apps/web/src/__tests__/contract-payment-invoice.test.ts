import { describe, expect, it } from "vitest";
import { getNextContractPaymentStage } from "@/lib/invoices/contract-payment-invoice";

const contract = {
  id: "contract-1",
  title: "QA agreement",
  user_id: "user-1",
  payment_required: true,
  payment_amount: 300,
  payment_currency: "gbp",
  payment_status: "pending",
  payment_structure: "custom",
  deposit_percentage: 0,
  payment_schedule: [
    { id: "kickoff", label: "Kickoff", percentage: 25 },
    { id: "midpoint", label: "Midpoint", percentage: 35 },
    { id: "final", label: "Final", percentage: 40 },
  ],
};

describe("contract payment invoice stages", () => {
  it("starts with the first custom milestone", () => {
    expect(getNextContractPaymentStage(contract, [])).toMatchObject({
      paymentType: "installment",
      amount: 7500,
      label: "Kickoff",
      milestone: { id: "kickoff", index: 0 },
    });
  });

  it("advances custom milestones in order", () => {
    const payments = [
      {
        id: "payment-1",
        payment_type: "installment" as const,
        status: "succeeded",
        amount: 7500,
        metadata: { payment_milestone_id: "kickoff" },
      },
    ];

    expect(getNextContractPaymentStage(contract, payments)).toMatchObject({
      amount: 10500,
      label: "Midpoint",
      milestone: { id: "midpoint", index: 1 },
    });
  });

  it("returns the final milestone and then completes", () => {
    const firstTwo = [
      {
        id: "payment-1",
        payment_type: "installment" as const,
        status: "succeeded",
        amount: 7500,
        metadata: { payment_milestone_id: "kickoff" },
      },
      {
        id: "payment-2",
        payment_type: "installment" as const,
        status: "succeeded",
        amount: 10500,
        metadata: { payment_milestone_id: "midpoint" },
      },
    ];

    expect(getNextContractPaymentStage(contract, firstTwo)).toMatchObject({
      amount: 12000,
      label: "Final",
      milestone: { id: "final", index: 2 },
    });

    expect(
      getNextContractPaymentStage(contract, [
        ...firstTwo,
        {
          id: "payment-3",
          payment_type: "installment",
          status: "succeeded",
          amount: 12000,
          metadata: { payment_milestone_id: "final" },
        },
      ])
    ).toBeNull();
  });

  it("advances a deposit and balance schedule", () => {
    const depositContract = {
      ...contract,
      payment_structure: "deposit_balance",
      deposit_percentage: 30,
      payment_schedule: [],
    };

    expect(getNextContractPaymentStage(depositContract, [])).toMatchObject({
      paymentType: "deposit",
      amount: 9000,
    });
    expect(
      getNextContractPaymentStage(depositContract, [
        {
          id: "deposit-payment",
          payment_type: "deposit",
          status: "succeeded",
          amount: 9000,
          metadata: null,
        },
      ])
    ).toMatchObject({ paymentType: "balance", amount: 21000 });
  });

  it("rejects malformed custom schedules", () => {
    expect(
      getNextContractPaymentStage(
        {
          ...contract,
          payment_schedule: [
            { id: "one", label: "One", percentage: 50 },
            { id: "two", label: "Two", percentage: 40 },
          ],
        },
        []
      )
    ).toBeNull();
  });
});

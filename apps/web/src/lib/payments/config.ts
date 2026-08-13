export const SUPPORTED_PAYMENT_CURRENCIES = [
  "usd",
  "gbp",
  "eur",
  "cad",
  "aud",
  "nzd",
  "chf",
  "sek",
  "nok",
  "dkk",
  "sgd",
] as const;

export type PaymentCurrency = (typeof SUPPORTED_PAYMENT_CURRENCIES)[number];
export type PaymentStructure = "full" | "deposit_balance" | "custom" | "bnpl";

export interface PaymentMilestone {
  id: string;
  label: string;
  percentage: number;
  dueDate?: string;
}

export const PAYMENT_CURRENCY_OPTIONS: Array<{
  value: PaymentCurrency;
  label: string;
}> = [
  { value: "usd", label: "USD ($)" },
  { value: "gbp", label: "GBP (£)" },
  { value: "eur", label: "EUR (€)" },
  { value: "cad", label: "CAD (C$)" },
  { value: "aud", label: "AUD (A$)" },
  { value: "nzd", label: "NZD (NZ$)" },
  { value: "chf", label: "CHF" },
  { value: "sek", label: "SEK" },
  { value: "nok", label: "NOK" },
  { value: "dkk", label: "DKK" },
  { value: "sgd", label: "SGD (S$)" },
];

export function createDefaultPaymentSchedule(): PaymentMilestone[] {
  return [
    { id: "stage-1", label: "Booking", percentage: 25 },
    { id: "stage-2", label: "First milestone", percentage: 25 },
    { id: "stage-3", label: "Second milestone", percentage: 25 },
    { id: "stage-4", label: "Final delivery", percentage: 25 },
  ];
}

export function normalizePaymentSchedule(value: unknown): PaymentMilestone[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as Partial<PaymentMilestone>;
      const percentage = Number(candidate.percentage);
      if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
        return null;
      }

      return {
        id:
          typeof candidate.id === "string" && candidate.id.trim()
            ? candidate.id
            : `stage-${index + 1}`,
        label:
          typeof candidate.label === "string" && candidate.label.trim()
            ? candidate.label.trim()
            : `Payment ${index + 1}`,
        percentage,
        ...(typeof candidate.dueDate === "string" && candidate.dueDate
          ? { dueDate: candidate.dueDate }
          : {}),
      } satisfies PaymentMilestone;
    })
    .filter((item): item is PaymentMilestone => Boolean(item));
}

export function getScheduleTotal(schedule: PaymentMilestone[]): number {
  const total = schedule.reduce(
    (sum, milestone) => sum + milestone.percentage,
    0
  );
  return Number(total.toFixed(4));
}

export function isPaymentScheduleValid(schedule: PaymentMilestone[]): boolean {
  return schedule.length >= 2 &&
    schedule.length <= 12 &&
    schedule.every(
      (milestone) =>
        milestone.label.trim().length > 0 &&
        milestone.percentage > 0 &&
        milestone.percentage <= 100
    ) &&
    Math.abs(getScheduleTotal(schedule) - 100) <= 0.001;
}

export function formatPaymentAmount(
  amount: number,
  currency: string,
  options?: { minorUnits?: boolean }
): string {
  const code = currency.toUpperCase();
  const value = options?.minorUnits ? amount / 100 : amount;

  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${code} ${value.toLocaleString()}`;
  }
}

export function getMilestoneAmount(
  totalMinorUnits: number,
  schedule: PaymentMilestone[],
  index: number
): number {
  if (index === schedule.length - 1) {
    const allocated = schedule.slice(0, index).reduce(
      (sum, milestone) =>
        sum + Math.round(totalMinorUnits * (milestone.percentage / 100)),
      0
    );
    return Math.max(0, totalMinorUnits - allocated);
  }

  return Math.round(totalMinorUnits * (schedule[index].percentage / 100));
}

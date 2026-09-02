export function getPreferredPaymentMethodOrder(currency: string): string[] {
  switch (currency.toLowerCase()) {
    case "usd":
      return ["us_bank_account", "card", "link"];
    case "gbp":
      return ["pay_by_bank", "bacs_debit", "card", "link"];
    case "eur":
      return ["sepa_debit", "card", "link"];
    default:
      return ["card", "link"];
  }
}

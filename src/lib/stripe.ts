import Stripe from "stripe";

// Lazy initialization of Stripe client to prevent build-time errors
let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeClient = new Stripe(secretKey, {
      apiVersion: "2025-12-15.clover",
      typescript: true,
    });
  }
  return stripeClient;
}

// Legacy export for backwards compatibility - use getStripe() in new code
export const stripe = {
  get accounts() { return getStripe().accounts; },
  get balance() { return getStripe().balance; },
  get checkout() { return getStripe().checkout; },
  get paymentIntents() { return getStripe().paymentIntents; },
  get accountLinks() { return getStripe().accountLinks; },
  get webhooks() { return getStripe().webhooks; },
  get charges() { return getStripe().charges; },
};

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

// Platform fee percentage (1% = 100 basis points)
export const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT) || 1;

// Calculate platform fee in cents
export function calculatePlatformFee(amountInCents: number): number {
  return Math.round(amountInCents * (PLATFORM_FEE_PERCENT / 100));
}

// Stripe Connect helpers
export async function createConnectAccount(email: string, country: string = "US") {
  const account = await stripe.accounts.create({
    type: "express",
    country,
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    settings: {
      payouts: {
        schedule: {
          interval: "daily",
        },
      },
    },
  });
  return account;
}

export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
) {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
  return accountLink;
}

export async function createLoginLink(accountId: string) {
  const loginLink = await stripe.accounts.createLoginLink(accountId);
  return loginLink;
}

export async function getConnectAccount(accountId: string) {
  const account = await stripe.accounts.retrieve(accountId);
  return account;
}

export async function getAccountBalance(accountId: string) {
  const balance = await stripe.balance.retrieve({
    stripeAccount: accountId,
  });
  return balance;
}

// Check if account has completed onboarding
export function isAccountReady(account: Stripe.Account): boolean {
  return (
    account.charges_enabled === true &&
    account.payouts_enabled === true &&
    account.details_submitted === true
  );
}

// Get account status for display
export function getAccountStatus(account: Stripe.Account): "not_connected" | "pending" | "active" | "restricted" {
  if (!account.details_submitted) {
    return "pending";
  }
  if (account.charges_enabled && account.payouts_enabled) {
    return "active";
  }
  if (account.requirements?.currently_due?.length || account.requirements?.past_due?.length) {
    return "restricted";
  }
  return "pending";
}

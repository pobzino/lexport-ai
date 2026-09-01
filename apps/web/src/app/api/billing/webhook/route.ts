// BILLING-1: The two Stripe webhook endpoints (this one and /api/webhooks/stripe)
// used to split event handling while sharing the single STRIPE_WEBHOOK_SECRET.
// Stripe issues a distinct signing secret per registered endpoint, so only one
// of the two could ever verify — the other rejected every event (400).
//
// The handlers are now consolidated into /api/webhooks/stripe, which processes
// the full event set (payments, refunds, Connect, payouts, subscription
// lifecycle, template purchases) under one secret. This route is kept only as a
// thin alias so any Stripe Dashboard endpoint still pointed at /api/billing/webhook
// runs the exact same handler. Register a SINGLE endpoint in Stripe and point
// STRIPE_WEBHOOK_SECRET at that endpoint's whsec_.
export { POST } from "@/app/api/webhooks/stripe/route";

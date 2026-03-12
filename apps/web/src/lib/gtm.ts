/**
 * Google Tag Manager dataLayer helper.
 *
 * Push conversion events to GTM. Configure corresponding tags
 * and triggers in the GTM dashboard (tagmanager.google.com).
 */

// Extend window with dataLayer
declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

function push(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

/** User completes registration (email or OAuth) */
export function trackSignUp(method: "email" | "google") {
  push("sign_up", { method });
}

/** User subscribes to a paid plan */
export function trackSubscription(plan: string, value?: number) {
  push("subscription_purchase", { plan, value, currency: "USD" });
}

/** AI contract generation completes */
export function trackContractCreated(contractType: string) {
  push("contract_created", { contract_type: contractType });
}

/** Signer completes signing a contract */
export function trackSignatureCompleted() {
  push("signature_completed");
}

/** Contact form submitted */
export function trackContactSubmit() {
  push("contact_form_submit");
}

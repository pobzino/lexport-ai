/**
 * Lightweight analytics helper.
 *
 * Fires events to PostHog when configured (NEXT_PUBLIC_POSTHOG_KEY set),
 * otherwise silently no-ops. Safe to call anywhere — client or server.
 *
 * Usage:
 *   import { track } from "@/lib/analytics";
 *   track("template_page_viewed", { type: "nda_mutual", jurisdiction: "us_california" });
 */

type EventProperties = Record<string, string | number | boolean | null | undefined>;

/**
 * Track a custom event. No-ops if PostHog is not loaded on the page.
 */
export function track(event: string, properties?: EventProperties) {
  if (typeof window === "undefined") return;

  // PostHog attaches to window.posthog when loaded
  const posthog = (window as unknown as { posthog?: { capture: (event: string, props?: EventProperties) => void } }).posthog;
  if (posthog?.capture) {
    posthog.capture(event, properties);
  }
}

// ============================================================================
// Pre-defined template events
// ============================================================================

export function trackTemplatePageViewed(type: string, jurisdiction?: string) {
  track("template_page_viewed", { type, jurisdiction: jurisdiction ?? null });
}

export function trackTemplateCTAClicked(action: string, type: string, jurisdiction: string, authState: string) {
  track("template_cta_clicked", { action, type, jurisdiction, auth_state: authState });
}

export function trackTemplatePurchaseStarted(templateId: string, type: string, jurisdiction: string) {
  track("template_purchase_started", { template_id: templateId, type, jurisdiction });
}

export function trackTemplateUsed(templateId: string, type: string, jurisdiction: string) {
  track("template_used", { template_id: templateId, type, jurisdiction });
}

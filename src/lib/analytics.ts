/**
 * Thin Google Analytics (GA4) helper. Safe to import anywhere: if analytics
 * isn't loaded (no NEXT_PUBLIC_GA_ID, or on the server) every call is a no-op.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Send a GA4 event. Use for marketing conversions (newsletter_signup,
 * book_click, ...). `params` are event parameters visible in GA4.
 */
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, params ?? {});
}

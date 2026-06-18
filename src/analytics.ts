// Lightweight wrapper around Google Analytics (gtag.js).
// The gtag.js snippet itself is loaded in index.html; this module just
// provides typed helpers so the rest of the app never touches `window.gtag`
// directly. All calls no-op gracefully if gtag failed to load (e.g. blocked
// by an ad blocker or offline).

export const GA_MEASUREMENT_ID = 'G-3C3TKFKG1S';

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
  }
}

/** Send a custom event to GA4. */
export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  console.log('Tracking event:', name, params);

  window.gtag?.('event', name, params);
}

/** Manually record a page view (used for SPA route changes). */
export function trackPageView(path: string, title?: string): void {
  window.gtag?.('event', 'page_view', {
    page_path: path,
    page_location: window.location.origin + path,
    page_title: title ?? document.title,
  });
}

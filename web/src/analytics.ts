export const GA_MEASUREMENT_ID = 'G-G4TTH49G1C';
const GOOGLE_TAG_SRC = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
const CLOUDFLARE_WEB_ANALYTICS_SRC = 'https://static.cloudflareinsights.com/beacon.min.js';

type AnalyticsValue = string | number | boolean;
type ProductEventParams = Record<string, AnalyticsValue>;
type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    __rhythmCoachAnalyticsInitialized?: boolean;
  }
}

function ensureGoogleTag(): Gtag | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = window.gtag ?? function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };

  if (!document.querySelector(`script[src="${GOOGLE_TAG_SRC}"]`)) {
    const script = document.createElement('script');
    script.async = true;
    script.src = GOOGLE_TAG_SRC;
    document.head.appendChild(script);
  }

  return window.gtag;
}

function initializeGoogleAnalytics(): void {
  const gtag = ensureGoogleTag();
  if (!gtag) return;
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID);
}

function initializeCloudflareAnalytics(): void {
  const token = String(import.meta.env.VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN ?? '').trim();
  if (!token || typeof document === 'undefined') return;
  if (document.querySelector(`script[src="${CLOUDFLARE_WEB_ANALYTICS_SRC}"]`)) return;

  const script = document.createElement('script');
  script.defer = true;
  script.src = CLOUDFLARE_WEB_ANALYTICS_SRC;
  script.setAttribute('data-cf-beacon', JSON.stringify({ token }));
  document.head.appendChild(script);
}

export function trackProductEvent(name: string, params: ProductEventParams = {}): void {
  const gtag = window.gtag;
  if (!gtag) return;
  gtag('event', name, params);
}

function trackAppSurface(): void {
  const isApp = window.location.hash.replace(/^#/, '').split('?')[0].replace(/\/+$/, '') === '/app';
  if (isApp) trackProductEvent('open_app', { surface: 'rehearsal' });
}

export function initializeAnalytics(): void {
  if (typeof window === 'undefined' || window.__rhythmCoachAnalyticsInitialized) return;
  window.__rhythmCoachAnalyticsInitialized = true;
  initializeGoogleAnalytics();
  initializeCloudflareAnalytics();

  trackAppSurface();
  window.addEventListener('hashchange', trackAppSurface);
  window.addEventListener('appinstalled', () => trackProductEvent('pwa_install', { product: 'rhythmcoach' }));
}

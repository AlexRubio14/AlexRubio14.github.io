/**
 * Cookieless visit counting with GoatCounter (https://www.goatcounter.com).
 *
 * Why GoatCounter: no cookies and no personal data stored (no IPs, no fingerprints),
 * so no consent banner is needed, and it reports `?ref=` / `utm_*` campaign values.
 * That is how I can tell visits from my CV (`?ref=cv`) or a job application
 * (`?ref=empresa`) apart from everything else.
 *
 * Only runs in production builds and only if VITE_GOATCOUNTER_CODE is set, so local
 * development never counts as a visit.
 */
export function initAnalytics() {
  const code = import.meta.env.VITE_GOATCOUNTER_CODE;
  if (!import.meta.env.PROD || !code) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://gc.zgo.at/count.js';
  script.dataset.goatcounter = `https://${code}.goatcounter.com/count`;
  document.head.append(script);
}

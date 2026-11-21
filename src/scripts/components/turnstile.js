/**
 * Cloudflare Turnstile (privacy-friendly CAPTCHA) for the contact forms.
 * https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
 *
 * - Disabled when VITE_TURNSTILE_SITE_KEY is empty (the Worker only requires a
 *   token once its TURNSTILE_SECRET is set).
 * - The Cloudflare script is loaded lazily, the first time someone interacts
 *   with a form: most visitors only read the page and never download it.
 * - `interaction-only`: invisible unless Cloudflare needs the visitor to click.
 */
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const TOKEN_WAIT_MS = 10000;

let scriptPromise;

function loadScript() {
  scriptPromise ??= new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => {
      scriptPromise = undefined; // allow a retry on the next interaction
      reject(new Error('Turnstile script failed to load'));
    };
    document.head.append(script);
  });
  return scriptPromise;
}

export const isTurnstileEnabled = () => Boolean(SITE_KEY);

/**
 * Attaches a widget to `container`. Rendering starts on the first interaction
 * with `form`, or immediately when getToken() is called.
 * @returns {{ getToken(): Promise<string | null>, reset(): void }}
 */
export function attachTurnstile(container, form) {
  let widgetId;
  let token = null;
  let rendering;
  const waiters = new Set();

  const settle = (value) => {
    token = value;
    if (value) waiters.forEach((resolve) => resolve(value));
    if (value) waiters.clear();
  };

  const render = () => {
    rendering ??= loadScript().then((turnstile) => {
      widgetId = turnstile.render(container, {
        sitekey: SITE_KEY,
        action: 'contact', // checked by the Worker
        appearance: 'interaction-only',
        theme: 'dark',
        size: 'flexible',
        callback: (value) => settle(value),
        'expired-callback': () => settle(null),
        'error-callback': () => settle(null),
      });
    });
    return rendering;
  };

  form.addEventListener('focusin', () => render().catch(() => {}), { once: true });

  return {
    async getToken() {
      try {
        await render();
      } catch {
        return null;
      }
      if (token) return token;
      return new Promise((resolve) => {
        waiters.add(resolve);
        setTimeout(() => {
          waiters.delete(resolve);
          resolve(null);
        }, TOKEN_WAIT_MS);
      });
    },
    // Tokens are single-use: get a fresh one after every submission.
    reset() {
      token = null;
      if (widgetId !== undefined) window.turnstile?.reset(widgetId);
    },
  };
}

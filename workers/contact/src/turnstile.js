/**
 * Cloudflare Turnstile server-side validation.
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 *
 * The widget in the browser produces a token; only the backend may redeem it
 * (that needs the secret key). Tokens are single-use and expire after 5 minutes.
 */

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
export const EXPECTED_ACTION = 'contact';
const MAX_TOKEN_LENGTH = 2048;

/** Hostnames a valid token may come from, derived from the CORS allowlist. */
export function allowedHostnames(allowedOrigins) {
  return allowedOrigins
    .map((origin) => {
      try {
        return new URL(origin).hostname;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * @returns {Promise<{ ok: true } | { ok: false, reason: string }>}
 *   reason: 'missing_token' | 'invalid_token' | 'wrong_hostname' | 'wrong_action' | 'unavailable'
 */
export async function verifyTurnstile(token, { secret, remoteIp, hostnames, fetchImpl = fetch }) {
  if (typeof token !== 'string' || !token || token.length > MAX_TOKEN_LENGTH) {
    return { ok: false, reason: 'missing_token' };
  }

  let result;
  try {
    const response = await fetchImpl(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, ...(remoteIp && { remoteip: remoteIp }) }),
    });
    if (!response.ok) return { ok: false, reason: 'unavailable' };
    result = await response.json();
  } catch {
    return { ok: false, reason: 'unavailable' };
  }

  if (!result.success) return { ok: false, reason: 'invalid_token' };
  // A token solved on another site, or for another form, must not be accepted here.
  if (hostnames.length && !hostnames.includes(result.hostname))
    return { ok: false, reason: 'wrong_hostname' };
  if (result.action && result.action !== EXPECTED_ACTION) return { ok: false, reason: 'wrong_action' };
  return { ok: true };
}

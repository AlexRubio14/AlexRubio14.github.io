/**
 * Portfolio contact API (Cloudflare Worker).
 *
 *   POST /contact   { subject, email, message, turnstileToken?, botcheck?, lang?, requestId? }
 *     200 { ok: true }
 *     4xx { ok: false, error: <code>, fields?: { <field>: <code> } }
 *     502 { ok: false, error: 'send_failed' }
 *
 * Flow: CORS check -> method/content-type -> rate limit -> size limit -> JSON parse ->
 *       honeypot -> validation -> Turnstile -> Resend.
 */
import { buildEmail, sendWithResend } from './email.js';
import { allowedHostnames, verifyTurnstile } from './turnstile.js';
import { isBot, validateSubmission } from './validate.js';

const MAX_BODY_BYTES = 16 * 1024;

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function corsHeaders(origin, env) {
  const headers = { Vary: 'Origin' };
  if (origin && allowedOrigins(env).includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Access-Control-Max-Age'] = '86400';
  }
  return headers;
}

function json(body, status, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders },
  });
}

export async function handleRequest(request, env, { fetchImpl = fetch } = {}) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  const cors = corsHeaders(origin, env);
  const reply = (body, status) => json(body, status, cors);

  if (url.pathname !== '/contact') return reply({ ok: false, error: 'not_found' }, 404);

  // Browsers send this "preflight" before a cross-origin JSON POST.
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: cors['Access-Control-Allow-Origin'] ? 204 : 403, headers: cors });
  }
  if (request.method !== 'POST') return reply({ ok: false, error: 'method_not_allowed' }, 405);

  // CORS only protects browsers; this also rejects other websites posting through a visitor's browser.
  if (!cors['Access-Control-Allow-Origin']) return reply({ ok: false, error: 'forbidden_origin' }, 403);

  if (!(request.headers.get('Content-Type') ?? '').includes('application/json')) {
    return reply({ ok: false, error: 'unsupported_media_type' }, 415);
  }

  // Cheap flood protection before doing any work. The binding is approximate and per
  // Cloudflare location (fine for a contact form). If it is missing or errors, don't block.
  const ip = request.headers.get('CF-Connecting-IP') ?? undefined;
  if (env.CONTACT_LIMITER && ip) {
    try {
      const { success } = await env.CONTACT_LIMITER.limit({ key: `contact:${ip}` });
      if (!success) return reply({ ok: false, error: 'rate_limited' }, 429);
    } catch (error) {
      console.error('[contact] Rate limiter error', error);
    }
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return reply({ ok: false, error: 'payload_too_large' }, 413);
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return reply({ ok: false, error: 'invalid_json' }, 400);
  }

  // Pretend success so bots get no signal that they were filtered.
  if (isBot(body)) return reply({ ok: true }, 200);

  const result = validateSubmission(body);
  if (!result.ok) return reply({ ok: false, error: 'validation_failed', fields: result.errors }, 422);

  // Human check. Only enforced once the TURNSTILE_SECRET secret exists, so the
  // frontend (site key) and the backend (secret) can be rolled out in either order.
  if (env.TURNSTILE_SECRET) {
    const captcha = await verifyTurnstile(body.turnstileToken, {
      secret: env.TURNSTILE_SECRET,
      remoteIp: ip,
      hostnames: allowedHostnames(allowedOrigins(env)),
      fetchImpl,
    });
    if (!captcha.ok) {
      if (captcha.reason === 'unavailable') return reply({ ok: false, error: 'captcha_unavailable' }, 503);
      return reply({ ok: false, error: 'captcha_failed', reason: captcha.reason }, 403);
    }
  }

  if (!env.RESEND_API_KEY || !env.CONTACT_TO) {
    console.error('[contact] Missing RESEND_API_KEY or CONTACT_TO secret');
    return reply({ ok: false, error: 'not_configured' }, 500);
  }

  const lang = ['en', 'es', 'ca'].includes(body.lang) ? body.lang : undefined;
  const requestId = typeof body.requestId === 'string' ? body.requestId.slice(0, 64) : undefined;
  const payload = buildEmail({ ...result.data, lang }, { from: env.MAIL_FROM, to: env.CONTACT_TO });

  const sent = await sendWithResend(payload, {
    apiKey: env.RESEND_API_KEY,
    idempotencyKey: requestId && `contact-${requestId}`,
    fetchImpl,
  });

  if (!sent.ok) {
    // Logged server-side (wrangler tail / dashboard); the visitor only gets a generic code.
    console.error('[contact] Resend error', sent.status, sent.detail);
    return reply({ ok: false, error: 'send_failed' }, 502);
  }
  return reply({ ok: true }, 200);
}

export default {
  fetch: (request, env) => handleRequest(request, env),
};

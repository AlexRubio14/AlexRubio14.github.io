/**
 * Input validation for contact submissions.
 *
 * Everything coming from the browser is untrusted: the frontend checks are a UX
 * nicety, these are the real ones. Returns either `{ ok: true, data }` with
 * normalized fields, or `{ ok: false, errors }` with one code per bad field.
 */

export const LIMITS = Object.freeze({
  subject: 120,
  email: 254, // RFC 5321 max address length
  messageMin: 10,
  messageMax: 5000,
});

// Deliberately pragmatic: "something@something.tld" without spaces.
// Full RFC 5322 validation is not worth it; Resend rejects invalid addresses anyway.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const clean = (value) => (typeof value === 'string' ? value.trim() : '');

/** Strip CR/LF so user input can never inject extra lines into headers like Subject. */
const singleLine = (value) => value.replace(/[\r\n]+/g, ' ');

export function validateSubmission(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errors: { body: 'invalid_body' } };
  }

  const subject = singleLine(clean(body.subject)) || 'Contacto Portfolio';
  const email = clean(body.email).toLowerCase();
  const message = clean(body.message);
  const errors = {};

  if (subject.length > LIMITS.subject) errors.subject = 'too_long';

  if (!email) errors.email = 'required';
  else if (email.length > LIMITS.email || !EMAIL_RE.test(email)) errors.email = 'invalid';

  if (!message) errors.message = 'required';
  else if (message.length < LIMITS.messageMin) errors.message = 'too_short';
  else if (message.length > LIMITS.messageMax) errors.message = 'too_long';

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { subject, email, message } };
}

/**
 * Honeypot: a hidden checkbox humans never see. Bots that blindly fill every
 * field tick it, and we pretend success so they don't learn to avoid it.
 */
export function isBot(body) {
  const trap = body?.botcheck;
  return trap === true || trap === 'on' || (typeof trap === 'string' && trap.length > 0);
}

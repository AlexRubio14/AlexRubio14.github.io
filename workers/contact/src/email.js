/**
 * Builds the notification email and sends it through Resend's REST API.
 * https://resend.com/docs/api-reference/emails/send-email
 */

const RESEND_URL = 'https://api.resend.com/emails';

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** User input goes into HTML: escape it, otherwise a message could inject markup into the email. */
export const escapeHtml = (text) => text.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);

export function buildEmail({ subject, email, message, lang }, { from, to }) {
  const meta = `From: ${email}${lang ? ` · Site language: ${lang}` : ''}`;
  return {
    from,
    to: [to],
    // "Reply" in your mail client answers the visitor directly.
    reply_to: email,
    subject: `[Portfolio] - ${subject}`,
    text: `${meta}\nSubject: ${subject}\n\n${message}\n`,
    html: `<div style="font-family:system-ui,sans-serif;line-height:1.6">
  <p style="color:#64748b;margin:0 0 4px">${escapeHtml(meta)}</p>
  <p style="margin:0 0 16px"><strong>${escapeHtml(subject)}</strong></p>
  <p style="white-space:pre-wrap;margin:0">${escapeHtml(message)}</p>
</div>`,
  };
}

/**
 * @returns {Promise<{ ok: true, id: string } | { ok: false, status: number, detail: string }>}
 */
export async function sendWithResend(payload, { apiKey, idempotencyKey, fetchImpl = fetch }) {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  // Same key within 24 h = Resend sends only once (double clicks, client retries).
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  let response;
  try {
    response = await fetchImpl(RESEND_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } catch (error) {
    // Network failure / DNS / timeout: fetch rejects instead of returning a response.
    return { ok: false, status: 0, detail: String(error) };
  }

  if (response.ok) {
    const { id } = await response.json();
    return { ok: true, id };
  }
  return { ok: false, status: response.status, detail: await response.text() };
}

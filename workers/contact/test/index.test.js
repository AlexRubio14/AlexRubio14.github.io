import { describe, expect, it, vi } from 'vitest';
import { escapeHtml } from '../src/email.js';
import { handleRequest } from '../src/index.js';
import { isBot, validateSubmission } from '../src/validate.js';

const ORIGIN = 'https://alexrubio14.github.io';
const env = {
  ALLOWED_ORIGINS: `${ORIGIN},http://localhost:5173`,
  MAIL_FROM: 'Portfolio <onboarding@resend.dev>',
  RESEND_API_KEY: 're_test_key',
  CONTACT_TO: 'me@example.com',
};
const valid = {
  subject: 'Oportunidad laboral',
  email: 'Recruiter@Studio.com ',
  message: 'Hello Alex, nice work!',
};

function post(body, { origin = ORIGIN, contentType = 'application/json', path = '/contact' } = {}) {
  return new Request(`https://worker.test${path}`, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': contentType },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const resendOk = () => vi.fn(async () => new Response(JSON.stringify({ id: 'email_123' }), { status: 200 }));

describe('validateSubmission', () => {
  it('normalizes valid input', () => {
    expect(validateSubmission(valid)).toEqual({
      ok: true,
      data: {
        subject: 'Oportunidad laboral',
        email: 'recruiter@studio.com',
        message: 'Hello Alex, nice work!',
      },
    });
  });

  it('defaults an empty subject and strips newlines from it (header injection)', () => {
    expect(validateSubmission({ ...valid, subject: '' }).data.subject).toBe('Contacto Portfolio');
    expect(validateSubmission({ ...valid, subject: 'Hi\r\nBcc: x@y.z' }).data.subject).toBe('Hi Bcc: x@y.z');
  });

  it.each([
    [{ ...valid, email: '' }, { email: 'required' }],
    [{ ...valid, email: 'not-an-email' }, { email: 'invalid' }],
    [{ ...valid, message: 'short' }, { message: 'too_short' }],
    [{ ...valid, message: 'x'.repeat(5001) }, { message: 'too_long' }],
    [{ ...valid, subject: 'x'.repeat(121) }, { subject: 'too_long' }],
  ])('rejects %o', (input, errors) => {
    expect(validateSubmission(input)).toEqual({ ok: false, errors });
  });

  it('rejects non-object bodies', () => {
    expect(validateSubmission(null).ok).toBe(false);
    expect(validateSubmission(['a']).ok).toBe(false);
  });
});

describe('isBot (honeypot)', () => {
  it('flags a ticked trap and ignores an empty one', () => {
    expect(isBot({ botcheck: true })).toBe(true);
    expect(isBot({ botcheck: 'on' })).toBe(true);
    expect(isBot({ botcheck: false })).toBe(false);
    expect(isBot({})).toBe(false);
  });
});

describe('escapeHtml', () => {
  it('neutralizes markup', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe(
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;',
    );
  });
});

describe('POST /contact', () => {
  it('sends the email through Resend and returns 200', async () => {
    const fetchImpl = resendOk();
    const res = await handleRequest(post({ ...valid, lang: 'es', requestId: 'abc' }), env, { fetchImpl });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer re_test_key');
    expect(init.headers['Idempotency-Key']).toBe('contact-abc');
    const payload = JSON.parse(init.body);
    expect(payload).toMatchObject({
      from: env.MAIL_FROM,
      to: ['me@example.com'],
      reply_to: 'recruiter@studio.com',
      subject: '[Portfolio] - Oportunidad laboral',
    });
    expect(payload.text).toContain('Site language: es');
  });

  it('escapes user input in the HTML body', async () => {
    const fetchImpl = resendOk();
    await handleRequest(post({ ...valid, message: '<script>alert(1)</script> hello' }), env, { fetchImpl });
    const { html } = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('answers 200 to bots without calling Resend', async () => {
    const fetchImpl = resendOk();
    const res = await handleRequest(post({ ...valid, botcheck: 'on' }), env, { fetchImpl });
    expect(res.status).toBe(200);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns 422 with field codes on invalid input', async () => {
    const res = await handleRequest(post({ email: 'nope', message: '' }), env, { fetchImpl: resendOk() });
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({
      ok: false,
      error: 'validation_failed',
      fields: { email: 'invalid', message: 'required' },
    });
  });

  it('rejects other origins, wrong content types, bad JSON and huge bodies', async () => {
    const fetchImpl = resendOk();
    expect(
      (await handleRequest(post(valid, { origin: 'https://evil.example' }), env, { fetchImpl })).status,
    ).toBe(403);
    expect((await handleRequest(post(valid, { contentType: 'text/plain' }), env, { fetchImpl })).status).toBe(
      415,
    );
    expect((await handleRequest(post('{not json', {}), env, { fetchImpl })).status).toBe(400);
    expect(
      (await handleRequest(post({ ...valid, message: 'x'.repeat(20000) }), env, { fetchImpl })).status,
    ).toBe(413);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('handles the CORS preflight', async () => {
    const preflight = (origin) =>
      new Request('https://worker.test/contact', { method: 'OPTIONS', headers: { Origin: origin } });
    const ok = await handleRequest(preflight(ORIGIN), env);
    expect(ok.status).toBe(204);
    expect(ok.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    expect((await handleRequest(preflight('https://evil.example'), env)).status).toBe(403);
  });

  it('returns 404 / 405 for other routes and methods', async () => {
    expect((await handleRequest(post(valid, { path: '/' }), env)).status).toBe(404);
    const get = new Request('https://worker.test/contact', { headers: { Origin: ORIGIN } });
    expect((await handleRequest(get, env)).status).toBe(405);
  });

  it('hides Resend errors behind a generic 502', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"message":"invalid api key"}', { status: 401 }));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await handleRequest(post(valid), env, { fetchImpl });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: 'send_failed' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('returns 502 (not a crash) when the network call to Resend throws', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await handleRequest(post(valid), env, { fetchImpl });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: 'send_failed' });
    spy.mockRestore();
  });

  it('returns 500 when secrets are missing', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await handleRequest(
      post(valid),
      { ...env, RESEND_API_KEY: undefined },
      { fetchImpl: resendOk() },
    );
    expect(res.status).toBe(500);
    spy.mockRestore();
  });
});

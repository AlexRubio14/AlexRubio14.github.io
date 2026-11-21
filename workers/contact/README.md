# Contact worker

Backend for the portfolio contact form: a [Cloudflare Worker](https://developers.cloudflare.com/workers/)
that validates submissions and emails them to me through [Resend](https://resend.com).

```
Browser ──POST /contact (JSON)──▶ Worker ──POST /emails──▶ Resend ──▶ my inbox
            CORS · rate limit · size limit · JSON · honeypot · validation · Turnstile
```

## API

`POST /contact` with `Content-Type: application/json`

```json
{
  "subject": "Oportunidad laboral",
  "email": "you@studio.com",
  "message": "Hi Alex…",
  "lang": "en",
  "requestId": "uuid"
}
```

| Status | Body                                                           | When                                                        |
| ------ | -------------------------------------------------------------- | ----------------------------------------------------------- |
| 200    | `{ "ok": true }`                                               | Sent (or silently dropped: honeypot ticked)                 |
| 400    | `{ "ok": false, "error": "invalid_json" }`                     | Body is not JSON                                            |
| 403    | `{ "ok": false, "error": "forbidden_origin" }`                 | Origin not in `ALLOWED_ORIGINS`                             |
| 413    | `{ "ok": false, "error": "payload_too_large" }`                | Body > 16 KB                                                |
| 415    | `{ "ok": false, "error": "unsupported_media_type" }`           | Not `application/json`                                      |
| 422    | `{ "ok": false, "error": "validation_failed", "fields": {…} }` | Invalid email / message length / subject                    |
| 403    | `{ "ok": false, "error": "captcha_failed", "reason": … }`      | Turnstile token missing, invalid, or from another site/form |
| 429    | `{ "ok": false, "error": "rate_limited" }`                     | More than 3 submissions per minute from one IP              |
| 503    | `{ "ok": false, "error": "captcha_unavailable" }`              | Cloudflare siteverify unreachable                           |
| 502    | `{ "ok": false, "error": "send_failed" }`                      | Resend rejected the request or was unreachable              |

Design notes:

- **Never trust the client**: limits are enforced here, the HTML attributes are only UX.
- **Escaping**: user input is HTML-escaped in the email body; newlines are stripped from the subject.
- **Idempotency**: `requestId` is forwarded as Resend's `Idempotency-Key`, so retries and double clicks
  send one email.
- **Anti-abuse**: honeypot + [Turnstile](https://developers.cloudflare.com/turnstile/) (token verified server-side,
  `hostname` and `action` checked, single use) + rate limit binding (3/min per IP, approximate per location).
  Turnstile is only enforced once `TURNSTILE_SECRET` is set, so frontend and backend can be rolled out in any order.
- **Secrets** (`RESEND_API_KEY`, `CONTACT_TO`, `TURNSTILE_SECRET`) live in Cloudflare, never in the repo.
- Resend errors are logged server-side (`npx wrangler tail`); visitors only get a generic code.

## Setup (once)

1. **Resend**: create an account **with the email where you want to receive messages**, then an API key
   with _Sending access_. Without a verified domain Resend only sends from `onboarding@resend.dev` to your
   own account address, which is exactly what a contact form needs.
2. **Cloudflare**: create a free account.
3. In this folder:

   ```bash
   npm install
   npx wrangler login      # opens the browser
   npm run secrets         # asks for RESEND_API_KEY and CONTACT_TO (your Resend account email)
   npm run deploy          # prints https://portfolio-contact.<subdomain>.workers.dev
   ```

4. Put that URL + `/contact` in the root `.env.production` (`VITE_CONTACT_ENDPOINT`).
5. **Turnstile**: Cloudflare dashboard → Turnstile → add a widget (mode _Managed_ or _Invisible_) with hostnames
   `alexrubio14.github.io` and `localhost`. Put the **site key** (public) in `VITE_TURNSTILE_SITE_KEY` in the root
   `.env.production` / `.env.development`, then store the **secret key** with `npm run secret:turnstile`.
6. Optional, for automatic deploys from GitHub: create a Cloudflare API token from the
   _Edit Cloudflare Workers_ template and save it as the repository secret `CLOUDFLARE_API_TOKEN`.

## Development

```bash
cp .dev.vars.example .dev.vars   # fill in your key and email
npm run dev                      # http://localhost:8787/contact
npm test                         # Vitest
```

The site's `npm run dev` uses the deployed Worker; to point it at `wrangler dev`, create `.env.development.local` with `VITE_CONTACT_ENDPOINT=http://localhost:8787/contact`.

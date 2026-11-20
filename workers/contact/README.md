# Contact worker

Backend for the portfolio contact form: a [Cloudflare Worker](https://developers.cloudflare.com/workers/)
that validates submissions and emails them to me through [Resend](https://resend.com).

```
Browser ──POST /contact (JSON)──▶ Worker ──POST /emails──▶ Resend ──▶ my inbox
            CORS · size limit · JSON · honeypot · validation
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

| Status | Body                                                           | When                                           |
| ------ | -------------------------------------------------------------- | ---------------------------------------------- |
| 200    | `{ "ok": true }`                                               | Sent (or silently dropped: honeypot ticked)    |
| 400    | `{ "ok": false, "error": "invalid_json" }`                     | Body is not JSON                               |
| 403    | `{ "ok": false, "error": "forbidden_origin" }`                 | Origin not in `ALLOWED_ORIGINS`                |
| 413    | `{ "ok": false, "error": "payload_too_large" }`                | Body > 16 KB                                   |
| 415    | `{ "ok": false, "error": "unsupported_media_type" }`           | Not `application/json`                         |
| 422    | `{ "ok": false, "error": "validation_failed", "fields": {…} }` | Invalid email / message length / subject       |
| 502    | `{ "ok": false, "error": "send_failed" }`                      | Resend rejected the request or was unreachable |

Design notes:

- **Never trust the client**: limits are enforced here, the HTML attributes are only UX.
- **Escaping**: user input is HTML-escaped in the email body; newlines are stripped from the subject.
- **Idempotency**: `requestId` is forwarded as Resend's `Idempotency-Key`, so retries and double clicks
  send one email.
- **Secrets** (`RESEND_API_KEY`, `CONTACT_TO`) live in Cloudflare, never in the repo.
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
5. Optional, for automatic deploys from GitHub: create a Cloudflare API token from the
   _Edit Cloudflare Workers_ template and save it as the repository secret `CLOUDFLARE_API_TOKEN`.

## Development

```bash
cp .dev.vars.example .dev.vars   # fill in your key and email
npm run dev                      # http://localhost:8787/contact
npm test                         # Vitest
```

The site's `npm run dev` already points to `http://localhost:8787/contact`.

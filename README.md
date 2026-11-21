# Alejandro Rubio Plana — Portfolio

Personal portfolio of **Alejandro Rubio Plana**, Game Software Engineer focused on C++ systems,
multiplayer networking and gameplay programming.

**Live:** https://alexrubio14.github.io

A multi-page static site built with [Vite](https://vite.dev) and vanilla JavaScript (ES modules), no UI
framework. Available in English, Spanish and Catalan.

## Features

- **Case studies** for each project (problem → engineering decisions → measured results).
- **i18n (EN / ES / CA)**: English lives in the HTML (readable without JS, indexed by search engines);
  Spanish and Catalan are JSON overlays, code-split and loaded only when selected.
- **Shared HTML partials** (navbar, footer, contact drawer) through a small custom Vite plugin.
- **Own contact backend**: a Cloudflare Worker (`workers/contact`) validates submissions, filters bots and
  sends the email through [Resend](https://resend.com). Tested with Vitest, deployed by CI.
- **Accessibility**: semantic landmarks, skip link, keyboard-friendly language menu and drawer
  (`inert`), visible focus, `prefers-reduced-motion` support.
- **Performance**: WebP images with explicit dimensions and lazy loading, hashed assets, per-page CSS.
- **SEO / sharing**: canonical URLs, Open Graph cards, `sitemap.xml`, `robots.txt`.
- **CI/CD**: formatting, linting and HTML validation on every push and PR; automatic deploy to GitHub
  Pages from `main`.

## Getting started

Requires Node.js ≥ 20.19.

```bash
npm install
npm run dev       # dev server with hot reload → http://localhost:5173
npm run build     # production build into dist/
npm run preview   # serve dist/ locally
```

| Script              | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| `npm run lint`      | ESLint (JS) + Stylelint (CSS)                             |
| `npm run lint:html` | Validates the **built** HTML (`dist/`), partials resolved |
| `npm run format`    | Formats everything with Prettier                          |
| `npm run check`     | Everything CI runs: format check, lint, build, HTML lint  |

## Project structure

```
├── index.html                    # Home page (entry)
├── projects/
│   ├── network-middleware.html   # Case study (entry)
│   └── lyra.html                 # Case study (entry)
├── 404.html                      # GitHub Pages "not found" page
├── public/                       # Copied as-is to the site root
│   ├── docs/                     # CV and technical documentation (PDF)
│   ├── og/                       # Social preview images (1200×630)
│   ├── favicon.svg, robots.txt, sitemap.xml
│   └── project-*.html            # Redirects from the v1 URLs
├── src/
│   ├── assets/images/            # Images processed and hashed by Vite
│   ├── i18n/                     # es.json, ca.json (+ en.json for JS-only strings)
│   ├── partials/                 # Shared HTML: nav, footer, contact drawer...
│   ├── scripts/
│   │   ├── core/                 # app bootstrap + i18n engine
│   │   ├── components/           # nav language switcher, contact form, scroll spy...
│   │   └── pages/                # one entry module per page
│   └── styles/
│       ├── base/                 # design tokens, reset, utilities
│       ├── components/           # nav, footer, contact, social dock...
│       ├── pages/                # page-specific styles
│       └── main.css              # global stylesheet (imports base + components)
├── workers/contact/              # Contact form backend (Cloudflare Worker + Resend)
├── config/vite-plugin-html-partials.js
├── vite.config.js
└── .github/workflows/deploy.yml
```

## How to…

### Add or change a translation

1. Write the English text directly in the HTML and give the element a key:
   `<p data-i18n="home.my_text">English text</p>`
   (use `data-i18n-placeholder` / `data-i18n-aria-label` for attributes).
2. Add the same key to `src/i18n/es.json` and `src/i18n/ca.json`.

Missing keys fall back to the original English, so a page never ends up half in the previous language.

### Use a partial

```html
<!-- @include footer.html -->
<!-- @include nav-project.html back="/#lyra" -->
```

Attributes become `{{placeholders}}` inside the partial.

### Add a new project page

1. Copy `projects/lyra.html` to `projects/<slug>.html` and replace the `<main>` content.
2. Create `src/scripts/pages/<slug>.js` (import `initApp` + your page CSS) and
   `src/styles/pages/<slug>.css` (start with `@import url('./case-study.css');`).
3. Register the page in `vite.config.js` → `build.rollupOptions.input`.
4. Add a card to the Projects section in `index.html`, the URL to `public/sitemap.xml` and an OG image
   in `public/og/`.

## Contact form backend

`workers/contact` is a small Cloudflare Worker: `POST /contact` → CORS check → validation → honeypot →
Resend API. See [`workers/contact/README.md`](workers/contact/README.md) for setup.

The frontend reads its URL from `VITE_CONTACT_ENDPOINT` (both `.env.development` and `.env.production` point to the deployed Worker; override locally with
`.env.development.local`).

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`, which builds the site and publishes `dist/` to
GitHub Pages. Pull requests run the same checks without deploying.

> One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

The Worker has its own workflow (`.github/workflows/worker.yml`): tests on every change, deploys from `main`
once the `CLOUDFLARE_API_TOKEN` repository secret exists.

## License

Code: MIT. Content, images and documents: © Alejandro Rubio Plana, all rights reserved.

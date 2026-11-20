/**
 * vite-plugin-html-partials
 *
 * Tiny build-time templating for multi-page Vite sites without a framework.
 *
 *   <!-- @include footer.html -->
 *   <!-- @include nav-project.html back="/#lyra" -->
 *
 * The directive is replaced with the contents of `<partialsDir>/<file>`.
 * Attributes become `{{name}}` placeholders inside the partial.
 * Includes are resolved recursively (with a depth guard against cycles).
 *
 * It runs with `order: 'pre'`, so Vite still processes the injected markup
 * afterwards (asset URLs, module scripts, hashing...).
 */
import fs from 'node:fs';
import path from 'node:path';

const INCLUDE_RE = /<!--\s*@include\s+([\w./-]+)((?:\s+[\w-]+="[^"]*")*)\s*-->/g;
const ATTR_RE = /([\w-]+)="([^"]*)"/g;
const MAX_DEPTH = 10;

function parseAttrs(raw) {
  const attrs = {};
  for (const [, key, value] of raw.matchAll(ATTR_RE)) attrs[key] = value;
  return attrs;
}

function render(html, partialsDir, depth = 0) {
  if (depth > MAX_DEPTH) {
    throw new Error('[html-partials] Max include depth exceeded (circular include?)');
  }
  return html.replace(INCLUDE_RE, (_, file, rawAttrs) => {
    const filePath = path.resolve(partialsDir, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`[html-partials] Partial not found: ${file}`);
    }
    const attrs = parseAttrs(rawAttrs);
    const content = fs
      .readFileSync(filePath, 'utf-8')
      .replace(/\{\{\s*([\w-]+)\s*\}\}/g, (match, key) => attrs[key] ?? match);
    return render(content, partialsDir, depth + 1);
  });
}

export default function htmlPartials({ dir = 'src/partials' } = {}) {
  let partialsDir;

  return {
    name: 'html-partials',

    configResolved(config) {
      partialsDir = path.resolve(config.root, dir);
    },

    transformIndexHtml: {
      order: 'pre',
      handler: (html) => render(html, partialsDir),
    },

    // In dev, editing a partial should reload every page that uses it.
    handleHotUpdate({ file, server }) {
      if (file.startsWith(partialsDir)) {
        server.ws.send({ type: 'full-reload' });
        return [];
      }
    },
  };
}

/**
 * Minimal i18n engine.
 *
 * Design:
 *  - English is the source language and lives in the HTML itself. That way the
 *    site is fully readable without JavaScript and search engines index English.
 *  - Spanish and Catalan are overlays loaded from JSON (src/i18n/*.json).
 *  - Before the first translation, each element's original (English) markup is
 *    snapshotted. Switching back to English, or hitting a key that is missing
 *    in a dictionary, restores that snapshot instead of leaving the previous
 *    language on screen (the bug in the v1 site).
 *
 * Markup API:
 *   data-i18n="key"              -> innerHTML
 *   data-i18n-placeholder="key"  -> placeholder attribute
 *   data-i18n-aria-label="key"   -> aria-label attribute
 */
import en from '../../i18n/en.json';

export const SUPPORTED_LANGS = ['en', 'es', 'ca'];
export const DEFAULT_LANG = 'en';
const STORAGE_KEY = 'portfolio_lang';

/**
 * `en` is bundled (it only holds JS-only strings like form messages).
 * ES / CA are code-split: Vite emits each as its own chunk and the browser
 * downloads it only the first time that language is selected.
 */
const loaders = {
  es: () => import('../../i18n/es.json'),
  ca: () => import('../../i18n/ca.json'),
};
const dictionaries = { en };

async function loadDictionary(lang) {
  if (!dictionaries[lang]) dictionaries[lang] = (await loaders[lang]()).default;
  return dictionaries[lang];
}

const ATTRIBUTE_BINDINGS = [
  { selector: '[data-i18n-placeholder]', data: 'i18nPlaceholder', attr: 'placeholder' },
  { selector: '[data-i18n-aria-label]', data: 'i18nAriaLabel', attr: 'aria-label' },
];

const originals = new WeakMap();
const listeners = new Set();
let currentLang = DEFAULT_LANG;

function readStoredLang() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED_LANGS.includes(value) ? value : null;
  } catch {
    return null; // storage can be blocked (privacy mode, embedded contexts)
  }
}

function storeLang(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* non-critical */
  }
}

function snapshot(el) {
  if (!originals.has(el)) {
    const attrs = {};
    for (const { attr } of ATTRIBUTE_BINDINGS) attrs[attr] = el.getAttribute(attr);
    originals.set(el, { html: el.innerHTML, attrs });
  }
  return originals.get(el);
}

/** Translation lookup for strings used from JS. Falls back to English, then to the key. */
export function t(key) {
  return dictionaries[currentLang]?.[key] ?? dictionaries.en[key] ?? key;
}

export function getLanguage() {
  return currentLang;
}

export async function setLanguage(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  let dict = {};
  if (lang !== DEFAULT_LANG) {
    try {
      dict = await loadDictionary(lang);
    } catch (error) {
      console.error(`[i18n] Could not load "${lang}"`, error);
      return; // keep the current language rather than showing a half-translated page
    }
  }
  currentLang = lang;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const original = snapshot(el);
    el.innerHTML = dict[el.dataset.i18n] ?? original.html;
  });

  for (const { selector, data, attr } of ATTRIBUTE_BINDINGS) {
    document.querySelectorAll(selector).forEach((el) => {
      const original = snapshot(el);
      const value = dict[el.dataset[data]] ?? original.attrs[attr];
      if (value != null) el.setAttribute(attr, value);
    });
  }

  document.documentElement.lang = lang;
  storeLang(lang);
  listeners.forEach((fn) => fn(lang));
}

/** Subscribe to language changes. Returns an unsubscribe function. */
export function onLanguageChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function initI18n() {
  const lang = readStoredLang() ?? DEFAULT_LANG;
  // English is already in the HTML: nothing to do until the user picks another language.
  const ready = lang === DEFAULT_LANG ? Promise.resolve() : setLanguage(lang);
  // The inline script in <head> hid the page while the translation loads; show it now.
  return ready.finally(() => document.documentElement.classList.remove('i18n-pending'));
}

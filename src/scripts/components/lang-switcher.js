import { getLanguage, onLanguageChange, setLanguage } from '../core/i18n.js';

/** Dropdown in the navbar that switches between EN / ES / CA. */
export function initLangSwitcher() {
  const toggle = document.getElementById('lang-toggle');
  const menu = document.getElementById('lang-menu');
  const label = document.getElementById('lang-label');
  if (!toggle || !menu) return;

  const options = menu.querySelectorAll('[data-lang]');

  const close = () => {
    menu.classList.remove('show');
    toggle.setAttribute('aria-expanded', 'false');
  };

  const render = (lang) => {
    if (label) label.textContent = lang.toUpperCase();
    options.forEach((btn) => {
      const active = btn.dataset.lang === lang;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-checked', String(active));
    });
  };

  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = menu.classList.toggle('show');
    toggle.setAttribute('aria-expanded', String(open));
  });

  options.forEach((btn) =>
    btn.addEventListener('click', () => {
      setLanguage(btn.dataset.lang);
      close();
    }),
  );

  document.addEventListener('click', close);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });

  onLanguageChange(render);
  render(getLanguage());
}

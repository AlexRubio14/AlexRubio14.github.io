/**
 * Shared bootstrap for every page: i18n + the components that live in the
 * common partials (navbar, social dock, contact drawer, footer form).
 * Page entries import this and add whatever is specific to them.
 */
import '../../styles/main.css';

import { initContactDrawer } from '../components/contact-drawer.js';
import { initContactForms } from '../components/contact-form.js';
import { initLangSwitcher } from '../components/lang-switcher.js';
import { initSocialDock } from '../components/social-dock.js';
import { initI18n } from './i18n.js';

export function initApp() {
  initI18n();
  initLangSwitcher();
  initSocialDock();
  const drawer = initContactDrawer();
  initContactForms({ drawer });

  const year = document.getElementById('current-year');
  if (year) year.textContent = String(new Date().getFullYear());
}

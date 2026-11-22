// Styles are linked in the page's <head> (see the HTML), so they apply before first paint.
import { initApp } from '../core/app.js';
import { initScrollSpy } from '../components/scroll-spy.js';
import { initSvgPills } from '../components/svg-pills.js';

initApp();
initScrollSpy('.toc-link[data-section]');
initSvgPills();

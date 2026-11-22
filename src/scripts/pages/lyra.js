// Styles are linked in the page's <head> (see the HTML), so they apply before first paint.
import { initApp } from '../core/app.js';
import { initGalleries } from '../components/gallery.js';
import { initScrollSpy } from '../components/scroll-spy.js';
import { initSvgPills } from '../components/svg-pills.js';
import { initYouTubeFacades } from '../components/youtube.js';

initApp();
initGalleries();
initScrollSpy('.toc-link[data-section]');
initSvgPills();
initYouTubeFacades();

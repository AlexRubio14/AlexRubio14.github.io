// Global styles first (via app.js), then page styles so they can override components.
import { initApp } from '../core/app.js';
import '../../styles/pages/lyra.css';
import { initGalleries } from '../components/gallery.js';
import { initScrollSpy } from '../components/scroll-spy.js';
import { initSvgPills } from '../components/svg-pills.js';
import { initYouTubeFacades } from '../components/youtube.js';

initApp();
initGalleries();
initScrollSpy('.toc-link[data-section]');
initSvgPills();
initYouTubeFacades();

// Global styles first (via app.js), then page styles so they can override components.
import { initApp } from '../core/app.js';
import '../../styles/pages/network-middleware.css';
import { initScrollSpy } from '../components/scroll-spy.js';
import { initSvgPills } from '../components/svg-pills.js';

initApp();
initScrollSpy('.toc-link[data-section]');
initSvgPills();

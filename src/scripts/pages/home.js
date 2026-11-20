// Global styles first (via app.js), then page styles so they can override components.
import { initApp } from '../core/app.js';
import '../../styles/pages/home.css';
import { initScrollSpy } from '../components/scroll-spy.js';

initApp();
initScrollSpy();

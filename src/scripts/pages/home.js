// Styles are linked in the page's <head> (see the HTML), so they apply before first paint.
import { initApp } from '../core/app.js';
import { initScrollSpy } from '../components/scroll-spy.js';

initApp();
initScrollSpy();
initCardClips();

/**
 * Project card clips play only while a mouse hovers the card. Touch screens and
 * reduced-motion users keep the still poster, and preload="none" means nobody
 * downloads the video until they hover.
 */
function initCardClips() {
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!canHover || calm) return;

  for (const video of document.querySelectorAll('.card-clip')) {
    const card = video.closest('.featured-card');
    if (!card) continue;
    card.addEventListener('mouseenter', () => {
      video.play().catch(() => {}); // autoplay can be refused: the poster stays, nothing breaks
    });
    card.addEventListener('mouseleave', () => video.pause());
  }
}

// Styles are linked in the page's <head> (see the HTML), so they apply before first paint.
import { initApp } from '../core/app.js';
import { initScrollSpy } from '../components/scroll-spy.js';

initApp();
initScrollSpy();
initCardClips();

/**
 * Project card clips play only while a mouse hovers the card. Touch screens and
 * reduced-motion users keep the still cover, and preload="none" means nobody
 * downloads the video until they hover.
 *
 * Every hover starts the clip from the beginning, and leaving the card brings the
 * cover back. The cover only fades out on the video's `playing` event: hiding it
 * on mouseenter would show a black frame while the first bytes arrive.
 */
function initCardClips() {
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!canHover || calm) return;

  for (const video of document.querySelectorAll('.card-clip')) {
    const card = video.closest('.featured-card');
    const frame = video.closest('.featured-visual');
    if (!card || !frame) continue;
    let hovering = false;

    video.addEventListener('playing', () => {
      if (hovering) frame.classList.add('is-playing');
    });

    card.addEventListener('mouseenter', () => {
      hovering = true;
      video.currentTime = 0;
      video.play().catch(() => {}); // autoplay can be refused: the cover stays, nothing breaks
    });

    card.addEventListener('mouseleave', () => {
      hovering = false;
      frame.classList.remove('is-playing');
      video.pause();
      video.currentTime = 0;
    });
  }
}

/**
 * Media gallery for case studies.
 *
 * Markup:
 *   <div data-gallery>
 *     <figure class="gallery-item">
 *       <button class="gallery-open"><img ...> | <video ...></button>
 *       <figcaption>...</figcaption>
 *     </figure>
 *   </div>
 *   <dialog id="lightbox"><button class="lightbox__close"></button><div class="lightbox__media"></div></dialog>
 *
 * - Click/Enter on an item opens it large in a native <dialog> (focus trap,
 *   Esc and backdrop close for free).
 * - Gallery videos are muted loops that only play while visible, and never
 *   autoplay when the visitor prefers reduced motion.
 */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function initLightbox(gallery) {
  const dialog = document.getElementById('lightbox');
  const stage = dialog?.querySelector('.lightbox__media');
  if (!dialog || !stage) return;

  const close = () => dialog.close();
  dialog.querySelector('.lightbox__close')?.addEventListener('click', close);
  // A click on the backdrop lands on the <dialog> element itself.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) close();
  });
  dialog.addEventListener('close', () => stage.replaceChildren());

  gallery.querySelectorAll('.gallery-open').forEach((button) =>
    button.addEventListener('click', () => {
      const media = button.querySelector('img, video');
      if (!media) return;
      const clone = media.cloneNode(true);
      clone.removeAttribute('loading');
      if (clone.tagName === 'VIDEO') {
        clone.controls = true;
        clone.autoplay = !reducedMotion.matches;
      }
      stage.replaceChildren(clone);
      dialog.showModal();
    }),
  );
}

function initVideos(gallery) {
  const videos = gallery.querySelectorAll('video');
  if (!videos.length) return;

  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting && !reducedMotion.matches) target.play().catch(() => {});
        else target.pause();
      }),
    { threshold: 0.4 },
  );
  videos.forEach((video) => {
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    observer.observe(video);
  });
}

export function initGalleries() {
  document.querySelectorAll('[data-gallery]').forEach((gallery) => {
    initLightbox(gallery);
    initVideos(gallery);
  });
}

/** Dev-only placeholders must never reach visitors. */
export function removePlaceholders() {
  document.querySelectorAll('[data-placeholder]').forEach((el) => el.remove());
}

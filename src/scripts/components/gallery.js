/**
 * Media for case studies: a carousel, single enlargeable figures and a shared lightbox.
 *
 * Carousel markup (see projects/lyra.html):
 *   <div data-carousel>
 *     <div class="carousel__viewport">
 *       <button class="carousel__slide gallery-open is-active"><img></button> ...
 *       <button class="carousel__arrow" data-dir="-1|1"></button>
 *       <span class="carousel__count"></span>
 *     </div>
 *     <div class="carousel__captions"><p class="carousel__caption"></p> ...</div>
 *     <ul class="carousel__thumbs"><li><button class="carousel__thumb"></button></li> ...</ul>
 *   </div>
 *
 * Single figures: <div data-gallery> <button class="gallery-open"><img | video></button> </div>
 * Lightbox: <dialog id="lightbox"> close, media stage, arrows, counter </dialog>
 *
 * Why it is built this way:
 * - Every slide stays in the HTML (one per screenshot, captions translated by i18n);
 *   JS only toggles which one is active. Inactive slides get `inert`, so keyboard
 *   and screen-reader users never land on an image they cannot see.
 * - Navigation wraps around with modulo: after the last image comes the first.
 * - The lightbox is a native <dialog>: focus trap, Esc and backdrop close come free.
 *   It receives the carousel's list, so you can keep browsing at full size, and when
 *   it closes the carousel jumps to the image you were looking at.
 */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const SWIPE_PX = 40;

/* --- Lightbox ---------------------------------------------------------------- */
const lightbox = {
  dialog: null,
  stage: null,
  count: null,
  arrows: [],
  items: [],
  index: 0,
  onClose: null,
};

const wrap = (i, n) => ((i % n) + n) % n;

function showInLightbox(i) {
  const { items, stage, count, arrows } = lightbox;
  lightbox.index = wrap(i, items.length);
  const clone = items[lightbox.index].cloneNode(true);
  clone.removeAttribute('loading');
  clone.removeAttribute('fetchpriority');
  if (clone.tagName === 'VIDEO') {
    clone.controls = true;
    clone.autoplay = !reducedMotion.matches;
  }
  stage.replaceChildren(clone);

  const many = items.length > 1;
  arrows.forEach((arrow) => (arrow.hidden = !many));
  count.hidden = !many;
  count.textContent = `${lightbox.index + 1} / ${items.length}`;
}

function openLightbox(items, index, onClose = null) {
  if (!lightbox.dialog || !items.length) return;
  lightbox.items = items;
  lightbox.onClose = onClose;
  showInLightbox(index);
  lightbox.dialog.showModal();
}

function initLightbox() {
  const dialog = document.getElementById('lightbox');
  const stage = dialog?.querySelector('.lightbox__media');
  if (!dialog || !stage) return;
  Object.assign(lightbox, {
    dialog,
    stage,
    count: dialog.querySelector('.lightbox__count'),
    arrows: [...dialog.querySelectorAll('.lightbox__arrow')],
  });

  dialog.querySelector('.lightbox__close')?.addEventListener('click', () => dialog.close());
  // A click on the backdrop lands on the <dialog> element itself.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  lightbox.arrows.forEach((arrow) =>
    arrow.addEventListener('click', () => showInLightbox(lightbox.index + Number(arrow.dataset.dir))),
  );
  dialog.addEventListener('keydown', (event) => {
    if (lightbox.items.length < 2) return;
    if (event.key === 'ArrowLeft') showInLightbox(lightbox.index - 1);
    if (event.key === 'ArrowRight') showInLightbox(lightbox.index + 1);
  });
  dialog.addEventListener('close', () => {
    stage.replaceChildren();
    lightbox.onClose?.(lightbox.index);
    lightbox.onClose = null;
  });
}

/* --- Carousel ---------------------------------------------------------------- */
function initCarousel(root) {
  const slides = [...root.querySelectorAll('.carousel__slide')];
  const captions = [...root.querySelectorAll('.carousel__caption')];
  const thumbs = [...root.querySelectorAll('.carousel__thumb')];
  const counter = root.querySelector('.carousel__count');
  const viewport = root.querySelector('.carousel__viewport');
  const n = slides.length;
  if (!n) return;
  let index = 0;

  const go = (i) => {
    index = wrap(i, n);
    slides.forEach((slide, k) => {
      const active = k === index;
      slide.classList.toggle('is-active', active);
      slide.inert = !active;
    });
    captions.forEach((caption, k) => (caption.hidden = k !== index));
    thumbs.forEach((thumb, k) => {
      const active = k === index;
      thumb.classList.toggle('is-active', active);
      if (active) thumb.setAttribute('aria-current', 'true');
      else thumb.removeAttribute('aria-current');
    });
    if (counter) counter.textContent = `${index + 1} / ${n}`;
  };

  root
    .querySelectorAll('.carousel__arrow')
    .forEach((arrow) => arrow.addEventListener('click', () => go(index + Number(arrow.dataset.dir))));
  thumbs.forEach((thumb) => thumb.addEventListener('click', () => go(Number(thumb.dataset.index))));

  // Swipe on touch screens. A swipe also ends in a click, which must not open the lightbox.
  let startX = null;
  let swiped = false;
  viewport.addEventListener('pointerdown', (event) => {
    startX = event.clientX;
    swiped = false;
  });
  viewport.addEventListener('pointerup', (event) => {
    if (startX === null) return;
    const dx = event.clientX - startX;
    startX = null;
    if (Math.abs(dx) > SWIPE_PX) {
      swiped = true;
      go(index + (dx < 0 ? 1 : -1));
    }
  });

  const media = slides.map((slide) => slide.querySelector('img, video'));
  slides.forEach((slide) =>
    slide.addEventListener('click', () => {
      if (swiped) {
        swiped = false;
        return;
      }
      openLightbox(media, index, (last) => go(last));
    }),
  );

  root.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') go(index - 1);
    if (event.key === 'ArrowRight') go(index + 1);
  });
}

/* --- Single figures and videos ------------------------------------------------- */
function initSingles(gallery) {
  gallery.querySelectorAll('.gallery-open').forEach((button) =>
    button.addEventListener('click', () => {
      const media = button.querySelector('img, video');
      if (media) openLightbox([media], 0);
    }),
  );
}

function initVideos(scope) {
  const videos = scope.querySelectorAll('video');
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
  initLightbox();
  document.querySelectorAll('[data-carousel]').forEach((root) => {
    initCarousel(root);
    initVideos(root);
  });
  document.querySelectorAll('[data-gallery]').forEach((gallery) => {
    initSingles(gallery);
    initVideos(gallery);
  });
}

/** Dev-only placeholders must never reach visitors. */
export function removePlaceholders() {
  document.querySelectorAll('[data-placeholder]').forEach((el) => el.remove());
}

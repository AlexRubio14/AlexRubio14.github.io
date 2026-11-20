/** Slide-in contact panel opened from the navbar "Contact me" button. */
export function initContactDrawer() {
  const drawer = document.getElementById('contact-drawer');
  const overlay = document.getElementById('contact-drawer-overlay');
  const closeBtn = document.getElementById('drawer-close');
  if (!drawer || !overlay) return { close: () => {} };

  let lastFocused = null;

  const open = (event) => {
    event?.preventDefault();
    lastFocused = document.activeElement;
    // `inert` keeps the closed drawer out of the tab order and the accessibility tree.
    drawer.inert = false;
    drawer.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    drawer.querySelector('input, textarea, button')?.focus();
  };

  const close = () => {
    if (!drawer.classList.contains('open')) return;
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    drawer.inert = true;
    document.body.style.overflow = '';
    lastFocused?.focus?.();
  };

  document.querySelectorAll('[data-contact-open]').forEach((el) => el.addEventListener('click', open));
  closeBtn?.addEventListener('click', close);
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });

  return { open, close };
}

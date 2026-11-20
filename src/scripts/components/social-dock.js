/** Hides the fixed social dock while the footer (which repeats the links) is visible. */
export function initSocialDock() {
  const dock = document.getElementById('social-dock');
  const footer = document.getElementById('contact');
  if (!dock || !footer) return;

  const observer = new IntersectionObserver(
    ([entry]) => dock.classList.toggle('is-hidden', entry.isIntersecting),
    { threshold: 0.1 },
  );
  observer.observe(footer);
}

/**
 * Highlights the link of the section currently in view.
 * Links declare their target with `data-section="<section id>"`.
 *
 * @param {string} [selector] links to manage (navbar by default; case-study TOC uses '.toc-link')
 */
export function initScrollSpy(selector = '.nav-link[data-section]') {
  const links = [...document.querySelectorAll(selector)];
  const sections = links.map((link) => document.getElementById(link.dataset.section)).filter(Boolean);
  if (!sections.length) return;

  const setActive = (id) =>
    links.forEach((link) => {
      const active = link.dataset.section === id;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });

  const observer = new IntersectionObserver(
    (entries) => entries.filter((e) => e.isIntersecting).forEach((e) => setActive(e.target.id)),
    { rootMargin: '-10% 0px -60% 0px', threshold: 0 },
  );
  sections.forEach((section) => observer.observe(section));
}

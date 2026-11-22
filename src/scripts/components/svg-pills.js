/**
 * Label "pills" inside inline SVGs: a <rect> behind a <text>.
 * SVG has no auto-sizing boxes, so the rect is resized to the text's bounding box.
 * It re-runs when i18n swaps the text (a longer translation must not overflow its pill)
 * and once the web font has loaded (glyph widths change).
 * Afterwards the viewBox is re-framed around the real content, so no label is ever cut
 * off at the edge, whatever the language.
 */
const PAD_X = 12;
const PAD_Y = 7;
const FRAME = 24;

function fit(svg) {
  for (const pill of svg.querySelectorAll('.svg-pill')) {
    const rect = pill.querySelector('rect');
    const text = pill.querySelector('text');
    if (!rect || !text) continue;
    const box = text.getBBox();
    if (!box.width) continue; // not rendered (e.g. hidden): keep the static fallback
    rect.setAttribute('x', box.x - PAD_X);
    rect.setAttribute('y', box.y - PAD_Y);
    rect.setAttribute('width', box.width + PAD_X * 2);
    rect.setAttribute('height', box.height + PAD_Y * 2);
  }
  const all = svg.getBBox();
  if (all.width) {
    svg.setAttribute(
      'viewBox',
      [all.x - FRAME, all.y - FRAME, all.width + FRAME * 2, all.height + FRAME * 2].join(' '),
    );
  }
}

export function initSvgPills(selector = 'svg[data-fit-pills]') {
  const phone = window.matchMedia('(width <= 600px)');
  for (const svg of document.querySelectorAll(selector)) {
    fit(svg);
    document.fonts?.ready.then(() => fit(svg));
    phone.addEventListener('change', () => fit(svg)); // label size changes with the breakpoint
    new MutationObserver(() => fit(svg)).observe(svg, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  }
}

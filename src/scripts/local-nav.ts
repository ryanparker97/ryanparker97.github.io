// Local nav helper (spec §5.8): keep a focused link in view and close the dropdown on a link, Esc,
// an outside tap or 40px of scroll.
const nav = document.querySelector<HTMLElement>('[data-local-nav]');
const dd = nav?.querySelector<HTMLDetailsElement>('details');
let from = 0;

const list = nav?.querySelector<HTMLElement>('.links') ?? null;

// The leading fade shows only while the strip is scrolled (`data-start`, spec §5.8): at 0 it looks as before.
function syncStart() {
  list?.toggleAttribute('data-start', list.scrollLeft > 0);
}
list?.addEventListener('scroll', syncStart, { passive: true });
addEventListener('resize', syncStart, { passive: true });

/** Scroll the strip so link `a` ends at least `clear` px inside the strip's right edge (or starts that far inside its left). */
function reveal(a: HTMLElement, clear: number) {
  if (!list) return;
  const l = list.getBoundingClientRect();
  const r = a.getBoundingClientRect();
  if (!l.width) return;
  if (r.right > l.right - clear) list.scrollLeft += r.right - (l.right - clear);
  else if (r.left < l.left + 24) list.scrollLeft -= l.left + 24 - r.left;
}

list?.addEventListener('focusin', (e) => {
  const a = (e.target as HTMLElement).closest('a');
  if (a) reveal(a, 24);
});

// On load the strip may scroll (the 692px column, 834-1068px), so bring the current link into view,
// clear of the 32px fade at the strip's end (the mask is on at rest, so 24px would leave it under the fade).
const current = list?.querySelector<HTMLElement>('a[aria-current]');
if (current) {
  reveal(current, 32);
  syncStart();
  // Not once focus is already in the strip: a late font must not scroll the link the keyboard user is on.
  document.fonts?.ready.then(() => {
    if (!list?.contains(document.activeElement)) reveal(current, 32);
    syncStart();
  });
}

if (dd) {
  const close = () => dd.removeAttribute('open');
  dd.addEventListener('toggle', () => (from = scrollY));
  dd.addEventListener('click', (e) => (e.target as Element).closest('.tray a') && close());
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !dd.open) return;
    close();
    dd.querySelector('summary')?.focus();
  });
  addEventListener('pointerdown', (e) => dd.open && !dd.contains(e.target as Node) && close());
  addEventListener('scroll', () => dd.open && Math.abs(scrollY - from) > 40 && close(), {
    passive: true,
  });
}
export {};

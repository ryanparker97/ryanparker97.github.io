// Local nav helper (spec §5.8): keep a focused link in view and close the dropdown on a link, Esc,
// an outside tap or 40px of scroll.
const nav = document.querySelector<HTMLElement>('[data-local-nav]');
const dd = nav?.querySelector<HTMLDetailsElement>('details');
let from = 0;

nav?.querySelector<HTMLElement>('.links')?.addEventListener('focusin', (e) => {
  const list = e.currentTarget as HTMLElement;
  const a = (e.target as HTMLElement).closest('a');
  if (!a) return;
  const l = list.getBoundingClientRect();
  const r = a.getBoundingClientRect();
  if (r.right > l.right - 24) list.scrollLeft += r.right - (l.right - 24);
  else if (r.left < l.left + 24) list.scrollLeft -= l.left + 24 - r.left;
});

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

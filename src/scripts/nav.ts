// Full-screen mobile menu (spec §5.7): toggle, scroll lock, inert page, focus trap, close rules.
const header = document.querySelector<HTMLElement>('[data-nav]');
const btn = document.querySelector<HTMLButtonElement>('[data-menu-button]');
const menu = document.getElementById('mobile-menu');
const compact = matchMedia('(min-width: 834px)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const behind = () =>
  document.querySelectorAll<HTMLElement>(
    'main, .site-footer, [data-local-nav], #search-dialog, .sr-only-focusable, [role=note]',
  );
let y = 0;
let closing: number | undefined;

const isOpen = () => btn?.getAttribute('aria-expanded') === 'true';

function setOpen(open: boolean) {
  if (!btn || !menu || !header || open === isOpen()) return;
  clearTimeout(closing);
  btn.setAttribute('aria-expanded', String(open));
  btn.setAttribute('aria-label', (open ? btn.dataset.labelClose : btn.dataset.labelMenu) ?? '');
  header.toggleAttribute('data-menu-open', open);
  behind().forEach((el) => el.toggleAttribute('inert', open));
  const root = document.documentElement;
  if (open) {
    y = scrollY;
    // On local-nav pages the global nav scrolls away; the menu hangs from it, so go back up.
    if (document.querySelector('[data-local-nav]')) scrollTo(0, 0);
    menu.removeAttribute('data-closing');
    menu.hidden = false;
    root.style.overflow = 'hidden';
    menu.querySelector<HTMLElement>('a')?.focus();
  } else {
    root.style.overflow = '';
    btn.focus({ preventScroll: true }); // touch taps and link taps leave focus nowhere; the spec returns it to the button
    scrollTo(0, y);
    const hide = () => {
      menu.hidden = true;
      menu.removeAttribute('data-closing');
    };
    if (reduced.matches) hide();
    else {
      menu.setAttribute('data-closing', '');
      closing = window.setTimeout(hide, 200);
    }
  }
}

btn?.addEventListener('click', () => setOpen(!isOpen()));
menu?.addEventListener('click', (e) => {
  if ((e.target as Element).closest('a')) setOpen(false);
});
addEventListener('keydown', (e) => {
  if (!isOpen()) return;
  if (e.key === 'Escape') {
    setOpen(false);
  } else if (e.key === 'Tab' && header) {
    // Keep focus inside the bar and the panel.
    const items = [...header.querySelectorAll<HTMLElement>('a[href], button')].filter(
      (el) => el.getClientRects().length > 0,
    );
    const first = items[0];
    const last = items[items.length - 1];
    const edge = e.shiftKey ? first : last;
    if (document.activeElement === edge) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    }
  }
});
// The search icon sits in the bar: opening search closes the menu first.
document.querySelectorAll('[data-search-open]').forEach((b) =>
  b.addEventListener('click', () => {
    if (isOpen()) setOpen(false);
  }),
);
compact.addEventListener('change', (e) => {
  if (e.matches && isOpen()) {
    setOpen(false);
  }
});
export {};

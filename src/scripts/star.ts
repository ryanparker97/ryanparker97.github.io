// STAR page: competency filter (?c=) that hides empty chapters and their local-nav links, and
// Expand all / Collapse all.
const stories = [...document.querySelectorAll<HTMLElement>('[data-story]')];
const groups = [...document.querySelectorAll<HTMLElement>('[data-star-group]')];
const buttons = [
  ...document.querySelectorAll<HTMLButtonElement>('[data-competency-filter] [data-c]'),
];
const empty = document.getElementById('star-empty');
const toggle = document.querySelector<HTMLButtonElement>('[data-expand=toggle]');

const current = () => new URLSearchParams(location.search).get('c') ?? 'all';

function apply(c: string) {
  let shown = 0;
  for (const s of stories) {
    const match = c === 'all' || (s.dataset.competencies ?? '').split(' ').includes(c);
    s.hidden = !match;
    if (match) shown++;
  }
  for (const g of groups) {
    const any = !!g.querySelector('[data-story]:not([hidden])');
    g.hidden = !any;
    // A chapter with no match disappears from the local nav too (links and the dropdown).
    document
      .querySelectorAll<HTMLElement>(`[data-local-nav] a[href="#${g.id}"]`)
      .forEach((a) => ((a.closest('li') ?? a).hidden = !any));
  }
  buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.c === c)));
  if (empty) empty.hidden = shown > 0;
}

buttons.forEach((b) =>
  b.addEventListener('click', () => {
    const c = b.dataset.c ?? 'all';
    const url = new URL(location.href);
    if (c === 'all') url.searchParams.delete('c');
    else url.searchParams.set('c', c);
    history.pushState(null, '', url);
    apply(c);
  }),
);
addEventListener('popstate', () => apply(current()));
toggle?.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open));
  toggle.querySelector<HTMLElement>('[data-label-open]')!.hidden = open;
  toggle.querySelector<HTMLElement>('[data-label-close]')!.hidden = !open;
  stories
    .filter((s) => !s.hidden)
    .forEach((s) => s.querySelector(':scope > .more')?.toggleAttribute('open', open));
});
document.querySelector('[data-reset]')?.addEventListener('click', () => {
  const url = new URL(location.href);
  url.searchParams.delete('c');
  history.pushState(null, '', url);
  apply('all');
});
apply(current());
export {};

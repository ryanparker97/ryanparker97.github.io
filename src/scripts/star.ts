// STAR page: competency filter (?c=) that hides story cards (the gallery follows the `hidden`
// attribute), moves each role's anchor to its first visible card, and hides a role's local-nav
// link when it has no visible card.
const stories = [...document.querySelectorAll<HTMLElement>('[data-story]')];
const gallery = stories[0]?.closest<HTMLElement>('[data-gallery]');
const roles = [...new Set(stories.map((s) => s.dataset.role ?? ''))];
const buttons = [
  ...document.querySelectorAll<HTMLButtonElement>('[data-competency-filter] [data-c]'),
];
const empty = document.getElementById('star-empty');

const current = () => new URLSearchParams(location.search).get('c') ?? 'all';

function apply(c: string) {
  let shown = 0;
  const first = new Map<string, HTMLElement>();
  for (const s of stories) {
    const match = c === 'all' || (s.dataset.competencies ?? '').split(' ').includes(c);
    s.hidden = !match;
    if (match) {
      shown++;
      if (!first.has(s.dataset.role!)) first.set(s.dataset.role!, s);
    }
    if (s.id === s.dataset.role) s.removeAttribute('id');
  }
  for (const r of roles) {
    const f = first.get(r);
    if (f) f.id = r;
    // A role with no match disappears from the local nav too (links and the dropdown).
    document
      .querySelectorAll<HTMLElement>(`[data-local-nav] a[href="#${r}"]`)
      .forEach((a) => ((a.closest('li') ?? a).hidden = !f));
  }
  gallery?.classList.toggle('gallery--few', shown <= 3);
  if (gallery) gallery.hidden = shown === 0;
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
document.querySelector('[data-reset]')?.addEventListener('click', () => {
  const url = new URL(location.href);
  url.searchParams.delete('c');
  history.pushState(null, '', url);
  apply('all');
});
apply(current());
export {};

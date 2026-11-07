// Projects page: kind filter (?kind=) and #slug deep links.
const cards = [...document.querySelectorAll<HTMLElement>('[data-project]')];
const buttons = [...document.querySelectorAll<HTMLElement>('[data-local-nav] [data-kind]')];
const empty = document.getElementById('projects-empty');

const kindFromUrl = () => new URLSearchParams(location.search).get('kind') ?? 'all';

function apply(kind: string) {
  let shown = 0;
  for (const card of cards) {
    const visible = kind === 'all' || card.dataset.kind === kind;
    card.hidden = !visible;
    if (visible) shown++;
  }
  buttons.forEach((b) => {
    const on = String(b.dataset.kind === kind);
    b.setAttribute('aria-current', on);
  });
  if (empty) empty.hidden = shown > 0;
}

function setKind(kind: string, mode: 'push' | 'replace' = 'push') {
  const url = new URL(location.href);
  if (kind === 'all') url.searchParams.delete('kind');
  else url.searchParams.set('kind', kind);
  history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', url);
  apply(kind);
}

function openHash() {
  const card = document
    .getElementById(location.hash.slice(1))
    ?.closest<HTMLElement>('[data-project]');
  if (!card) return;
  if (card.hidden) setKind('all', 'replace');
  card.scrollIntoView();
}

// An unknown ?kind= (hand-edited URL) matches nothing and shows the empty state.
apply(kindFromUrl());
buttons.forEach((b) =>
  b.addEventListener('click', (e) => {
    e.preventDefault();
    setKind(b.dataset.kind ?? 'all');
  }),
);
addEventListener('popstate', () => apply(kindFromUrl()));
document.querySelector('[data-reset]')?.addEventListener('click', () => setKind('all'));
addEventListener('hashchange', openHash);
openHash();
export {};

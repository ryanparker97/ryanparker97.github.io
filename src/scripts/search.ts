// Search flyout (spec §5.7). Opened with Cmd/Ctrl+K, "/" or the nav icon; Pagefind is only
// downloaded the first time it opens.
const dialog = document.getElementById('search-dialog');
const curtain = document.getElementById('search-curtain');
const quick = document.getElementById('search-quick');
const input = document.getElementById('search-input') as HTMLInputElement | null;
const list = document.getElementById('search-results');
const status = document.getElementById('search-status');

interface Sub {
  url: string;
  title: string;
  excerpt: string;
}
interface Data {
  url: string;
  excerpt: string;
  meta: { title?: string; type?: string };
  sub_results: Sub[];
}
interface Pagefind {
  init?: () => Promise<void>;
  search: (q: string) => Promise<{ results: { data: () => Promise<Data> }[] }>;
}

let pagefind: Promise<Pagefind | null> | undefined;
let opener: HTMLElement | null = null;
let timer: number | undefined;
let run = 0;

const load = () =>
  (pagefind ??= (async () => {
    try {
      const url = '/pagefind/pagefind.js';
      const mod = (await import(/* @vite-ignore */ url)) as Pagefind;
      await mod.init?.();
      return mod;
    } catch {
      return null; // not built yet (astro dev)
    }
  })());

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

const behind = () =>
  document.querySelectorAll<HTMLElement>(
    'main, .site-footer, [data-local-nav], .sr-only-focusable, [role=note]',
  );
let savedY = 0;
const focusables = () =>
  [...(dialog?.querySelectorAll<HTMLElement>('input, a[href], button') ?? [])].filter(
    (el) => el.getClientRects().length > 0,
  );
const isOpen = () => !!dialog && !dialog.hidden;
const triggers = () => document.querySelectorAll<HTMLElement>('[data-search-open]');

function open() {
  if (!dialog || !curtain || isOpen()) return;
  opener = document.activeElement as HTMLElement | null;
  // On local-nav pages the global nav scrolls away, and the panel hangs from it: go back up.
  savedY = scrollY;
  if (document.querySelector('[data-local-nav]')) scrollTo(0, 0);
  dialog.hidden = curtain.hidden = false;
  behind().forEach((el) => el.setAttribute('inert', ''));
  triggers().forEach((b) => b.setAttribute('aria-expanded', 'true'));
  input?.focus();
  void load();
}

function close() {
  if (!dialog || !curtain || !isOpen()) return;
  dialog.hidden = curtain.hidden = true;
  behind().forEach((el) => el.removeAttribute('inert'));
  triggers().forEach((b) => b.setAttribute('aria-expanded', 'false'));
  // Never leave focus on the hidden input (it would swallow the "/" shortcut).
  input?.blur();
  const keep = { preventScroll: true };
  if (opener && opener !== document.body && opener.isConnected && opener.getClientRects().length)
    opener.focus(keep);
  else document.querySelector<HTMLElement>('[data-search-open]')?.focus(keep);
  if (document.querySelector('[data-local-nav]') && savedY) scrollTo(0, savedY);
}

async function search(query: string) {
  if (!dialog || !list || !status) return;
  const id = ++run;
  list.innerHTML = '';
  status.textContent = '';
  if (quick) quick.hidden = !!query.trim();
  if (!query.trim()) return;
  const pf = await load();
  if (!pf) {
    status.textContent = dialog.dataset.unavailable ?? '';
    return;
  }
  const found = (await pf.search(query)).results.slice(0, 8);
  const items = await Promise.all(found.map((r) => r.data()));
  if (id !== run) return; // a newer query replaced this one
  if (!items.length) {
    status.textContent = (dialog.dataset.none ?? '').replace('{query}', query);
    return;
  }
  status.textContent =
    items.length === 1
      ? (dialog.dataset.countOne ?? '')
      : (dialog.dataset.count ?? '').replace('{n}', String(items.length));
  list.innerHTML = items
    .map((d) => {
      const type = d.meta.type
        ? (dialog.dataset[`type${d.meta.type[0].toUpperCase()}${d.meta.type.slice(1)}`] ?? '')
        : '';
      const subs = d.sub_results
        .filter((s) => s.url !== d.url)
        .slice(0, 3)
        .map(
          (s) =>
            `<a class="sub" href="${esc(s.url)}"><strong>${esc(s.title)}</strong> <span>${s.excerpt}</span></a>`,
        )
        .join('');
      return `<li class="hit"><a class="main" href="${esc(d.url)}"><span class="type">${esc(type)}</span><strong>${esc(d.meta.title ?? d.url)}</strong><span class="excerpt">${d.excerpt}</span></a>${subs}</li>`;
    })
    .join('');
}

if (dialog && input) {
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => void search(input.value), 120);
    if (quick) quick.hidden = !!input.value.trim();
  });
  // Escape in a search field only clears it; make it close the panel.
  input.addEventListener('keydown', (e) => e.key === 'Escape' && close());
  document
    .querySelectorAll('[data-search-close]')
    .forEach((b) => b.addEventListener('click', close));
  // Following a result or quick link closes the panel (same-page anchors keep the page).
  dialog.addEventListener('click', (e) => {
    if ((e.target as Element).closest('a')) close();
  });
  document.querySelectorAll('[data-search-open]').forEach((b) => b.addEventListener('click', open));
  addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement;
    const typing = target.closest('input, textarea, select, [contenteditable]');
    if (e.key === 'Escape' && isOpen()) close();
    else if (e.key === 'Tab' && isOpen()) {
      // Modal: Tab and Shift+Tab cycle inside the panel, whatever the browser's own Tab order.
      e.preventDefault();
      const items = focusables();
      const at = items.indexOf(document.activeElement as HTMLElement);
      const next = at < 0 ? (e.shiftKey ? items.length - 1 : 0) : at + (e.shiftKey ? -1 : 1);
      items[(next + items.length) % items.length]?.focus();
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      open();
    } else if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      open();
    }
  });
}
export {};

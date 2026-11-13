// Scroll gallery paddles (spec §5.10.7): page by the visible cards; hidden cards are skipped; disable at the ends.
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
document.querySelectorAll<HTMLElement>('[data-gallery]').forEach((g) => {
  const list = g.querySelector<HTMLElement>('.gallery-track')!;
  const bar = g.querySelector<HTMLElement>('.paddles')!;
  const prev = g.querySelector<HTMLButtonElement>('[data-prev]')!;
  const next = g.querySelector<HTMLButtonElement>('[data-next]')!;
  const cards = [...list.children] as HTMLElement[];
  if (cards.length < 2) return;
  let vis = cards;
  const go = (dir: number) => {
    const pitch = vis[1] ? vis[1].offsetLeft - vis[0].offsetLeft : list.clientWidth;
    const left = Math.max(1, Math.floor(list.clientWidth / pitch)) * pitch * dir;
    list.scrollBy({ left, behavior: reduce.matches ? 'auto' : 'smooth' });
  };
  prev.onclick = () => go(-1);
  next.onclick = () => go(1);
  const io = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (e.target === vis[0]) prev.disabled = e.isIntersecting;
        if (e.target === vis[vis.length - 1]) next.disabled = e.isIntersecting;
      }),
    { root: list, threshold: 0.95 },
  );
  const sync = () => {
    vis = cards.filter((c) => !c.hidden);
    io.disconnect();
    if (vis.length) {
      io.observe(vis[0]);
      io.observe(vis[vis.length - 1]);
    }
    bar.hidden = list.scrollWidth <= list.clientWidth + 1;
  };
  sync();
  new ResizeObserver(sync).observe(list);
  new MutationObserver(sync).observe(list, { subtree: true, attributeFilter: ['hidden'] });
});
export {};

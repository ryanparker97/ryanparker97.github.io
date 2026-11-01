// Scroll gallery paddles (spec §5.10.7): page by the visible cards, disable at the ends.
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
document.querySelectorAll<HTMLElement>('[data-gallery]').forEach((g) => {
  const list = g.querySelector<HTMLElement>('.gallery-track')!;
  const bar = g.querySelector<HTMLElement>('.paddles')!;
  const prev = g.querySelector<HTMLButtonElement>('[data-prev]')!;
  const next = g.querySelector<HTMLButtonElement>('[data-next]')!;
  const cards = [...list.children] as HTMLElement[];
  if (cards.length < 2) return;
  const go = (dir: number) => {
    const pitch = cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : list.clientWidth;
    const left = Math.max(1, Math.floor(list.clientWidth / pitch)) * pitch * dir;
    list.scrollBy({ left, behavior: reduce.matches ? 'auto' : 'smooth' });
  };
  prev.onclick = () => go(-1);
  next.onclick = () => go(1);
  const io = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        (e.target === cards[0] ? prev : next).disabled = e.isIntersecting;
      }),
    { root: list, threshold: 0.95 },
  );
  io.observe(cards[0]);
  io.observe(cards[cards.length - 1]);
  new ResizeObserver(() => (bar.hidden = list.scrollWidth <= list.clientWidth + 1)).observe(list);
});
export {};

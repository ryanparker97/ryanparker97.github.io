// Highlights the table-of-contents entry of the section being read.
const headings = [...document.querySelectorAll<HTMLElement>('.prose :is(h2, h3)[id]')];
const links = [...document.querySelectorAll<HTMLAnchorElement>('.toc-side a')];

if (headings.length && links.length) {
  const mark = (id: string) =>
    links.forEach((a) => {
      if (a.hash === `#${id}`) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  // Headings count as read once they pass under both sticky bars.
  const bars = [...document.querySelectorAll<HTMLElement>('[data-nav], [data-local-nav]')].reduce(
    (n, el) => n + el.offsetHeight,
    0,
  );
  const visible = new Set<string>();
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) visible.add(e.target.id);
        else visible.delete(e.target.id);
      }
      // Highlight the first visible heading, otherwise the last one scrolled past.
      const first = headings.find((h) => visible.has(h.id));
      const past = headings.filter((h) => h.getBoundingClientRect().top < bars).pop();
      const target = first ?? past ?? headings[0];
      mark(target.id);
    },
    { rootMargin: `-${bars + 8}px 0px -65% 0px` },
  );
  headings.forEach((h) => io.observe(h));
}
export {};

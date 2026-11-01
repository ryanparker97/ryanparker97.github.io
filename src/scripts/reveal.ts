// Staggered fade-up (spec §5.11 effect 1): adds `.is-in` to a `[data-reveal-group]` (or a lone
// `[data-reveal]`) when its top crosses 85% of the viewport; whatever is already in view on load
// (or on `pageshow`) shows at once. Also the site index link-in (70%). The hidden state keys on `html.reveal`, which this module
// adds itself; if anything throws it is removed so nothing stays hidden (and if the module never
// loads, the class is never added).
const nav = document.querySelector<HTMLElement>('[data-nav]');
const onScroll = () => nav?.toggleAttribute('data-scrolled', scrollY > 8);
onScroll();
addEventListener('scroll', onScroll, { passive: true });

try {
  document.documentElement.classList.add('reveal');
  const targets = [
    ...document.querySelectorAll<HTMLElement>('[data-reveal-group], [data-reveal]'),
  ].filter((el) => el.matches('[data-reveal-group]') || !el.closest('[data-reveal-group]'));
  const index = [...document.querySelectorAll<HTMLElement>('.site-index')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const show = (el: Element, now = false) => el.classList.add('is-in', ...(now ? ['is-now'] : []));
  // Anything whose top is above the bottom of the viewport is shown at once, without animation.
  const inView = (el: Element) => el.getBoundingClientRect().top < innerHeight;

  if (reduced || !('IntersectionObserver' in window)) {
    [...targets, ...index].forEach((el) => show(el, true));
  } else {
    const watch = (els: HTMLElement[], margin: string) => {
      const io = new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            show(e.target);
            io.unobserve(e.target);
          }),
        { rootMargin: margin },
      );
      for (const el of els) {
        if (inView(el)) show(el, true);
        else io.observe(el);
      }
    };
    watch(targets, '0px 0px -15% 0px');
    watch(index, '0px 0px -30% 0px');
    // Back/forward restores: show what is in view without waiting for an observer.
    addEventListener('pageshow', (e) => {
      if (!e.persisted) return;
      [...targets, ...index].filter(inView).forEach((el) => show(el, true));
    });
    // Focusing an unrevealed item reveals its group.
    addEventListener('focusin', (e) => {
      const t = e.target as Element;
      const g = t.closest('[data-reveal-group]') ?? t.closest('[data-reveal]');
      if (g && !g.classList.contains('is-in')) show(g, true);
    });
  }
} catch {
  document.documentElement.classList.remove('reveal');
}
export {};

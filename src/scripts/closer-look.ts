// Closer look (spec §5.10.14): labels become buttons, one caption open at a time.
document.querySelectorAll<HTMLElement>('[data-closer]').forEach((root) => {
  const parts = [...root.querySelectorAll<HTMLElement>('.closer-item')].map((item) => {
    const h = item.querySelector('h3')!;
    const cap = item.querySelector<HTMLElement>('.closer-cap')!;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'closer-btn';
    btn.setAttribute('aria-controls', cap.id);
    btn.textContent = h.textContent;
    h.replaceChildren(btn);
    return { btn, cap };
  });
  const open = (n: number) =>
    parts.forEach((p, i) => {
      p.btn.setAttribute('aria-expanded', String(i === n));
      p.cap.hidden = i !== n;
    });
  parts.forEach((p, i) => (p.btn.onclick = () => open(i)));
  open(0);
});
export {};

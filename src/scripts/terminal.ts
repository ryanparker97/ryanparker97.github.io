document.querySelectorAll<HTMLElement>('[data-term]').forEach((el) => {
  const btn = el.querySelector<HTMLButtonElement>('[data-term-toggle]');
  if (!btn) return;
  btn.hidden = false;
  el.dataset.ready = '';
  btn.addEventListener('click', () => {
    const p = el.dataset.paused !== 'true';
    el.dataset.paused = String(p);
    btn.setAttribute('aria-pressed', String(p));
  });
});

export {};

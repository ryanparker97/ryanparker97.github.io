// Theme toggle (spec §5.12): Light → Dark → System. The inline <head> script has already applied
// the saved value; light is the default.
const ORDER = ['light', 'dark', 'system'] as const;
type Pref = (typeof ORDER)[number];
const root = document.documentElement;

const current = (): Pref => ORDER.find((p) => p === root.dataset.pref) ?? 'light';

function apply(pref: Pref) {
  root.dataset.pref = pref;
  if (pref === 'system') delete root.dataset.theme;
  else root.dataset.theme = pref;
  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((btn) => {
    const label = (btn.dataset.fmt ?? '').replace('{value}', btn.dataset[pref] ?? '');
    const text = btn.querySelector('[data-theme-text]');
    if (text) text.textContent = label;
    else {
      btn.setAttribute('aria-label', label);
      btn.title = label;
    }
  });
}

apply(current());
document.querySelectorAll('[data-theme-toggle]').forEach((btn) =>
  btn.addEventListener('click', () => {
    const next = ORDER[(ORDER.indexOf(current()) + 1) % ORDER.length];
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* storage unavailable: the choice still applies for this page view */
    }
    apply(next);
  }),
);
export {};

import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { NEXT_FORBIDDEN, norm, withoutStepAllowed } from './next-words';

test.use({ reducedMotion: 'reduce' });

const LOCALES = [
  {
    edu: 'Học vấn.',
    next: 'Tiếp theo.',
    contact: 'Liên hệ với tôi.',
    eyebrows: ['Mục tiêu · đến năm 2028', 'Mục tiêu · đến năm 2030'],
    titles: ['Data Architect', 'Forward Deployed Engineer (FDE)'],
    hrefs: [
      '/vi/experiences/fpt-software-senior-data-engineer/',
      '/vi/projects/agentic-coding-workflow/',
    ],
    path: '/vi/experiences/',
    home: '/vi/',
    step: { when: 'Dự kiến · 04/2027', name: 'Claude Certified Architect' },
  },
  {
    edu: 'Education.',
    next: 'Next.',
    contact: 'Get in touch.',
    eyebrows: ['Goal · by 2028', 'Goal · by 2030'],
    titles: ['Data Architect', 'Forward Deployed Engineer (FDE)'],
    hrefs: [
      '/experiences/fpt-software-senior-data-engineer/',
      '/projects/agentic-coding-workflow/',
    ],
    path: '/experiences/',
    home: '/',
    step: { when: 'Planned · Apr 2027', name: 'Claude Certified Architect' },
  },
];

// experiences-no-next: /experiences/ has no "Next." group any more; Education is followed by contact.
for (const L of LOCALES) {
  test.describe(`No Next group ${L.path}`, () => {
    test('#next and #next-cert are absent and Education is followed by contact', async ({
      page,
    }) => {
      await page.goto(L.path);
      await expect(page.locator('#next')).toHaveCount(0);
      await expect(page.locator('#next-cert')).toHaveCount(0);
      const h2 = (await page.locator('main h2').allInnerTexts()).map((s) => s.trim());
      const i = h2.indexOf(L.edu);
      expect(i).toBeGreaterThan(-1);
      expect(h2.slice(i, i + 2)).toEqual([L.edu, L.contact]);
      expect(h2).not.toContain(L.next);
    });
  });
}

test.describe('Next group stays off print', () => {
  const pages = [
    {
      path: '/experiences/print/',
      titles: ['Data Architect', 'Forward Deployed Engineer (FDE)'],
    },
    {
      path: '/vi/experiences/print/',
      titles: ['Data Architect', 'Forward Deployed Engineer (FDE)'],
    },
  ];
  for (const p of pages)
    test(`absent from ${p.path}`, async ({ page }) => {
      await page.goto(p.path);
      await expect(page.locator('#next')).toHaveCount(0);
      const body = await page.locator('body').innerText();
      for (const t of p.titles) expect(body).not.toContain(t);
    });
});

// On Home the planned certification is one plain-text dated line above the goals: no card, link or
// heading. experiences-no-next: /experiences/ no longer shows it at all (tests above).
const STEP_CASES = LOCALES.map((L) => ({
  label: L.home,
  path: L.home,
  first: '#next .goals > li',
  step: L.step,
}));
const LOGO_NOTE_CASES = LOCALES.flatMap((L) => [{ path: L.path }, { path: L.home }]);

for (const C of STEP_CASES) {
  test.describe(`Next step ${C.path}`, () => {
    test('one dated line with the exact date and name, before the first goal', async ({ page }) => {
      await page.goto(C.path);
      const step = page.locator('#next [data-next-step]');
      await expect(step).toHaveCount(1);
      await expect(step.locator('.next-step__when')).toHaveText(C.step.when);
      await expect(step.locator('.next-step__name')).toHaveText(C.step.name);
      const before = await page.evaluate((first) => {
        const s = document.querySelector('#next [data-next-step]')!;
        const f = document.querySelector(first)!;
        return Boolean(s.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING);
      }, C.first);
      expect(before).toBe(true);
    });

    test('is above the first goal on a phone, and is no link, heading or card', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(C.path);
      const step = page.locator('#next [data-next-step]');
      await expect(step.locator('a')).toHaveCount(0);
      // owner, photo-logos: old `h1..h6, li, svg` count 0 (the step had no art). The milestone now
      // carries one decorative Claude mark; headings and list items stay out, and so does any img.
      await expect(step.locator('h1, h2, h3, h4, h5, h6, li, img')).toHaveCount(0);
      await expect(step.locator('svg')).toHaveCount(1);
      await expect(
        step.locator('svg.next-step__logo[data-icon="logos:claude-icon"][aria-hidden="true"]'),
      ).toHaveCount(1);
      await expect(step.locator('svg title, svg[role], svg[aria-label]')).toHaveCount(0);
      await expect(
        page.locator('#next .group-card [data-next-step], #next li [data-next-step]'),
      ).toHaveCount(0);
      const stepBottom = await step.evaluate((e) => e.getBoundingClientRect().bottom);
      const firstTop = await page
        .locator(C.first)
        .first()
        .evaluate((e) => e.getBoundingClientRect().top);
      expect(stepBottom).toBeLessThanOrEqual(firstTop);
    });

    test('step text passes the forbidden-words rule with nothing left over, and names no issuer', async ({
      page,
    }) => {
      await page.goto(C.path);
      const text = await page.locator('#next [data-next-step]').innerText();
      const rest = withoutStepAllowed(text);
      for (const re of NEXT_FORBIDDEN) expect(rest).not.toMatch(re);
      // Anything left after the allow-list is a hit, as in the unit test.
      expect(rest.trim()).toBe('');
      expect(await page.locator('#next').innerText()).not.toMatch(/Anthropic/i); // Home names no issuer
    });
  });
}

// owner, photo-logos: the owners / no-endorsement note shows where marks show (the Next. step's
// Claude mark): once, the same text as /skills/, on the column's start edge, EN + VI.
for (const C of LOGO_NOTE_CASES) {
  test(`the logo note shows once under the marks on ${C.path}`, async ({ page }) => {
    await page.goto(C.path);
    const lang = C.path.startsWith('/vi/') ? 'vi' : 'en';
    const dict = JSON.parse(readFileSync(`src/i18n/${lang}.json`, 'utf8')) as Record<
      string,
      string
    >;
    const notes = page.locator('main .logos-note');
    await expect(notes).toHaveCount(1);
    await expect(notes).toHaveText(dict['skills.logosNote']);
    await expect(page.locator('#next .logos-note')).toHaveCount(
      C.path === '/' || C.path === '/vi/' ? 1 : 0,
    );
  });
}

test('the Home step text matches the Claude certification entry (EN + VI)', async ({ page }) => {
  for (const L of LOCALES) {
    const lang = L.home === '/' ? 'en' : 'vi';
    const entry = readFileSync(
      `src/content/certifications/${lang}/claude-certified-architect.md`,
      'utf8',
    );
    const name = /^name:\s*'(.+)'$/m.exec(entry)?.[1];
    expect(name).toBe(L.step.name);
    await page.goto(L.home);
    const flat = (x: string) => norm(x).replace(/\s+/g, ' ').trim();
    const step = flat(await page.locator('#next [data-next-step]').innerText());
    expect(step).toBe(flat(`${L.step.when} ${name}`));
  }
});

test.describe('Next step stays off print', () => {
  for (const path of ['/experiences/print/', '/vi/experiences/print/'])
    test(`no step on ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('[data-next-step]')).toHaveCount(0);
      // The print page shows no marks, so no logo note either.
      await expect(page.locator('.logos-note')).toHaveCount(0);
    });
});

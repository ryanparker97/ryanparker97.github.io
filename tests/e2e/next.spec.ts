import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  NEXT_FORBIDDEN,
  norm,
  withoutAllowed,
  withoutStepAllowed,
  withoutTitleSuffix,
} from './next-words';

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

const nbsp = (s: string) => s.replace(/ /g, ' ');

async function gotoThemed(page: Page, path: string, theme: 'light' | 'dark') {
  await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}

for (const L of LOCALES) {
  test.describe(`Next group ${L.path}`, () => {
    test('sits between Education and contact, the Claude card then two goal cards in order', async ({
      page,
    }) => {
      await page.goto(L.path);
      const h2 = (await page.locator('main h2').allInnerTexts()).map((s) => s.trim());
      const i = h2.indexOf(L.edu);
      expect(i).toBeGreaterThan(-1);
      expect(h2.slice(i, i + 3)).toEqual([L.edu, L.next, L.contact]);
      const order = await page.evaluate(() => {
        const a = document.querySelector('#education')!;
        const n = document.querySelector('#next')!;
        const c = document.querySelector('#contact')!;
        return [
          Boolean(a.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING),
          Boolean(n.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING),
          Boolean(document.querySelector('#roles #next')),
        ];
      });
      expect(order).toEqual([true, true, true]);
      const cards = page.locator('#next .group-card');
      // owner, next-card: old 2 cards -> 3; the planned Claude cert is a card first, then the two goals.
      await expect(cards).toHaveCount(3);
      await expect(page.locator('#next .group-card h3')).toHaveText([L.step.name, ...L.titles]);
      const eyebrows = await page.locator('#next .group-card__eyebrow').allInnerTexts();
      expect(eyebrows.map(nbsp)).toEqual([`Anthropic · ${L.step.when}`, ...L.eyebrows]);
    });

    test('each goal card has one link that resolves; the Claude card has none', async ({
      page,
    }) => {
      await page.goto(L.path);
      const cards = page.locator('#next .group-card');
      await expect(cards.first().locator('a')).toHaveCount(0);
      for (let i = 0; i < 2; i++) {
        const links = cards.nth(i + 1).locator('a');
        await expect(links).toHaveCount(1);
        const href = await links.first().getAttribute('href');
        expect(href).toBe(L.hrefs[i]);
        expect((await page.request.get(href!)).ok()).toBe(true);
      }
    });

    test('no forbidden words in the text or link names', async ({ page }) => {
      await page.goto(L.path);
      // owner, next-card: the Claude card (#next-cert) names its issuer and shows its own date; it is
      // checked by the step allow-list below, the goal cards by the full rule.
      const cards = page.locator('#next .group-card:not(#next-cert)');
      // Only the card title and eyebrow may carry the allowed title and year; everything else is raw.
      const fields = [
        ...(await cards.locator('.group-card__eyebrow').allInnerTexts()).map(withoutAllowed),
        ...(await cards.locator('h3').allInnerTexts()).map(withoutAllowed),
        ...(await cards.locator('.group-card__text').allInnerTexts()).map(norm),
        ...(await page.locator('#next h2').allInnerTexts()).map(norm),
        ...(await page.locator('#next a:not(h3 a)').allInnerTexts()).map(norm),
        ...(
          await page
            .locator('#next a')
            .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''))
        ).map(withoutTitleSuffix),
      ];
      for (const s of fields) for (const re of NEXT_FORBIDDEN) expect(s).not.toMatch(re);
      // The Claude card: only its name, date and issuer are left out of the rule; nothing else is.
      const claude = norm(await page.locator('#next-cert').innerText());
      const rest = withoutStepAllowed(claude).replace(/Anthropic|·/g, ' ');
      for (const re of NEXT_FORBIDDEN) expect(rest).not.toMatch(re);
      expect(rest.trim()).toBe('');
    });

    for (const theme of ['light', 'dark'] as const)
      test(`axe finds no violations in #next (${theme})`, async ({ page }) => {
        await gotoThemed(page, L.path, theme);
        const { violations } = await new AxeBuilder({ page }).include('#next').analyze();
        expect(violations.map((v) => v.id)).toEqual([]);
      });

    for (const [w, h] of [
      [390, 844],
      [320, 700],
    ])
      test(`stacks without horizontal scroll at ${w}`, async ({ page }) => {
        await page.setViewportSize({ width: w, height: h });
        await page.goto(L.path);
        const over = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(over).toBeLessThanOrEqual(0);
        const tops = await page
          .locator('#next .group-card')
          .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
        expect(new Set(tops).size).toBe(tops.length);
      });

    test('cards share a row at 1440', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(L.path);
      const tops = await page
        .locator('#next .group-card')
        .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
      expect(new Set(tops).size).toBe(1);
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
// heading. owner, next-card: on /experiences/ it is a card in the group instead (tests above).
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

test('the Home step text matches the /experiences/ Claude card (EN + VI)', async ({ page }) => {
  for (const L of LOCALES) {
    await page.goto(L.home);
    const flat = (x: string) => norm(x).replace(/\s+/g, ' ').trim();
    const step = flat(await page.locator('#next [data-next-step]').innerText());
    await page.goto(L.path);
    const card = flat(await page.locator('#next-cert').innerText());
    // The card adds the issuer in front of the same date, then the same name.
    expect(card).toBe(`Anthropic · ${step}`);
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

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { NEXT_FORBIDDEN, norm, withoutAllowed, withoutTitleSuffix } from './next-words';

test.use({ reducedMotion: 'reduce' });

const LOCALES = [
  {
    edu: 'Học vấn.',
    next: 'Tiếp theo.',
    contact: 'Liên hệ với tôi.',
    eyebrows: ['Mục tiêu · đến năm 2029', 'Mục tiêu · đến năm 2031'],
    titles: ['Enterprise Data Architect', 'Forward Deployed Engineer (FDE)'],
    hrefs: [
      '/vi/experiences/fpt-software-senior-data-engineer/',
      '/vi/projects/agentic-coding-workflow/',
    ],
    path: '/vi/experiences/',
  },
  {
    edu: 'Education.',
    next: 'Next.',
    contact: 'Get in touch.',
    eyebrows: ['Goal · by 2029', 'Goal · by 2031'],
    titles: ['Enterprise Data Architect', 'Forward Deployed Engineer (FDE)'],
    hrefs: [
      '/experiences/fpt-software-senior-data-engineer/',
      '/projects/agentic-coding-workflow/',
    ],
    path: '/experiences/',
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
    test('sits between Education and contact, two cards in order', async ({ page }) => {
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
      await expect(cards).toHaveCount(2);
      await expect(page.locator('#next .group-card h3')).toHaveText(L.titles);
      const eyebrows = await page.locator('#next .group-card__eyebrow').allInnerTexts();
      expect(eyebrows.map(nbsp)).toEqual(L.eyebrows);
    });

    test('each card has one link that resolves', async ({ page }) => {
      await page.goto(L.path);
      const cards = page.locator('#next .group-card');
      for (let i = 0; i < 2; i++) {
        const links = cards.nth(i).locator('a');
        await expect(links).toHaveCount(1);
        const href = await links.first().getAttribute('href');
        expect(href).toBe(L.hrefs[i]);
        expect((await page.request.get(href!)).ok()).toBe(true);
      }
    });

    test('no forbidden words in the text or link names', async ({ page }) => {
      await page.goto(L.path);
      const cards = page.locator('#next .group-card');
      // Only the card title and eyebrow may carry the allowed title and year; everything else is raw.
      const fields = [
        ...(await page.locator('#next .group-card__eyebrow').allInnerTexts()).map(withoutAllowed),
        ...(await page.locator('#next .group-card h3').allInnerTexts()).map(withoutAllowed),
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
        expect(tops[0]).not.toBe(tops[1]);
      });

    test('cards share a row at 1440', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(L.path);
      const tops = await page
        .locator('#next .group-card')
        .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
      expect(tops[0]).toBe(tops[1]);
    });
  });
}

test.describe('Next group stays off print', () => {
  const pages = [
    {
      path: '/experiences/print/',
      titles: ['Enterprise Data Architect', 'Forward Deployed Engineer (FDE)'],
    },
    {
      path: '/vi/experiences/print/',
      titles: ['Enterprise Data Architect', 'Forward Deployed Engineer (FDE)'],
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

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { builtPages } from './pages';

const ROUTES = [
  '/',
  '/experiences/',
  '/experiences/datum-security-bank-data-engineer/',
  '/projects/',
  '/projects/agentic-coding-workflow/',
  '/skills/',
  '/star/',
  '/star/emr-cost-optimization/',
  '/blog/',
  '/blog/neovim-setup-1-zero-to-editor/',
  '/blog/neovim-setup-3-data-engineering/',
  '/blog/topics/',
  '/blog/topics/developer-tools/',
  '/blog/tags/',
  '/blog/tags/neovim/',
  '/blog/series/',
  '/blog/series/neovim-setup-guide/',
];

type Theme = 'light' | 'dark';

// The head script reads localStorage 'theme' (default light), so that is how a theme is really applied.
async function gotoThemed(page: Page, path: string, theme: Theme) {
  await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}

const report = (violations: { id: string; nodes: { target: unknown[] }[] }[]) =>
  violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);

// Every built page, both themes (print pages force light): zero axe violations of any impact.
test.describe('axe: every built page', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'full sweep on Chromium; WebKit runs the curated set',
  );
  test.use({ reducedMotion: 'reduce' });
  const pages = builtPages();
  test('finds the built pages', () => {
    expect(pages.length).toBeGreaterThan(50);
  });
  for (const { path, kind } of pages) {
    for (const theme of kind === 'print' ? (['light'] as const) : (['light', 'dark'] as const)) {
      test(`${theme} ${path}`, async ({ page }) => {
        await gotoThemed(page, path, theme);
        const { violations } = await new AxeBuilder({ page }).analyze();
        expect(report(violations), `axe violations on ${path} (${theme})`).toEqual([]);
      });
    }
  }
});

// Curated route set for WebKit, light and dark, English and Vietnamese: zero serious or critical violations.
test.describe('axe', () => {
  test.skip(({ browserName }) => browserName !== 'webkit', 'Chromium runs the full sweep');
  test.use({ reducedMotion: 'reduce' });
  for (const lang of ['en', 'vi'] as const) {
    for (const theme of ['light', 'dark'] as const) {
      for (const route of [...ROUTES, ...(lang === 'en' ? ['/404.html'] : [])]) {
        test(`${lang} ${theme} ${route}`, async ({ page }) => {
          await gotoThemed(page, lang === 'vi' ? `/vi${route}` : route, theme);
          const { violations } = await new AxeBuilder({ page }).analyze();
          const bad = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
          expect(report(bad), `axe violations on ${route} (${lang}, ${theme})`).toEqual([]);
        });
      }
    }
  }
});

// Once without reduced motion: scroll through the page so every reveal animation has finished.
test.describe('axe with motion enabled', () => {
  for (const route of ['/', '/experiences/', '/vi/']) {
    test(`${route}`, async ({ page }) => {
      await page.goto(route);
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < height; y += 500) {
        await page.evaluate((top) => window.scrollTo(0, top), y);
        await page.waitForTimeout(80);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(2400);
      const { violations } = await new AxeBuilder({ page }).analyze();
      const bad = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(
        bad.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).join(' | ')),
      ).toEqual([]);
    });
  }
});

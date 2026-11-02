import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const ROUTES = [
  '/',
  '/experiences/',
  '/projects/',
  '/star/',
  '/star/emr-cost-optimization/',
  '/blog/',
  '/blog/neovim-setup-1-zero-to-editor/',
  '/blog/topics/',
  '/blog/topics/developer-tools/',
  '/blog/tags/',
  '/blog/tags/neovim/',
  '/blog/series/',
  '/blog/series/neovim-setup-guide/',
];

// Every route type, light and dark, English and Vietnamese: zero serious or critical violations.
test.describe('axe', () => {
  test.use({ reducedMotion: 'reduce' });
  for (const lang of ['en', 'vi'] as const) {
    for (const theme of ['light', 'dark'] as const) {
      for (const route of [...ROUTES, ...(lang === 'en' ? ['/404.html'] : [])]) {
        test(`${lang} ${theme} ${route}`, async ({ page }) => {
          await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
          await page.goto(lang === 'vi' ? `/vi${route}` : route);
          const { violations } = await new AxeBuilder({ page }).analyze();
          const bad = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
          expect(
            bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
            `axe violations on ${route} (${lang}, ${theme})`,
          ).toEqual([]);
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

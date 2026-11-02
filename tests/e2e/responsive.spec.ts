import { expect, test } from '@playwright/test';

const ROUTES = [
  '/',
  '/experiences/',
  '/projects/',
  '/star/',
  '/blog/',
  '/blog/neovim-setup-1-zero-to-editor/',
  '/blog/series/neovim-setup-guide/',
  '/blog/topics/developer-tools/',
];

test.describe('320px', () => {
  test.use({ viewport: { width: 320, height: 700 } });
  for (const route of ROUTES) {
    test(`no horizontal scroll on ${route}`, async ({ page }) => {
      await page.goto(route);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('content is visible immediately with no transforms', async ({ page }) => {
    await page.goto('/experiences/');
    const items = page.locator('[data-reveal]');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const style = await items.nth(i).evaluate((el) => {
        const s = getComputedStyle(el);
        return { opacity: s.opacity, transform: s.transform };
      });
      expect(style).toEqual({ opacity: '1', transform: 'none' });
    }
  });
});

test('without JavaScript the content is still visible', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/experiences/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('.hl-card').first()).toBeVisible();
  await expect(page.locator('.local-nav')).toBeVisible();
  await page.goto('/projects/');
  await expect(page.locator('[data-project="agentic-coding-workflow"]')).toBeVisible();
  await context.close();
});

test.describe('blank-page guard (spec 5.11)', () => {
  for (const route of ['/', '/experiences/', '/projects/', '/blog/', '/does-not-exist/']) {
    test(`reveal items stay visible when the JS module is blocked: ${route}`, async ({ page }) => {
      await page.route('**/_astro/*.js', (r) => r.abort());
      await page.goto(route);
      const items = page.locator('[data-reveal]');
      const count = await items.count();
      for (let i = 0; i < count; i++) {
        const opacity = await items.nth(i).evaluate((el) => getComputedStyle(el).opacity);
        expect(opacity).toBe('1');
      }
    });
  }
});

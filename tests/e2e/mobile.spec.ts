import { expect, test } from '@playwright/test';

// Runs on the `iPhone 13` (WebKit) and `Pixel 7` (Chromium) projects (spec §5.13, §5.15).
test.use({ reducedMotion: 'reduce' });

const PAGES = [
  '/',
  '/experiences/',
  '/experiences/datum-security-bank-data-engineer/',
  '/projects/',
  '/star/',
  '/blog/',
  '/vi/blog/',
];

test('no horizontal scroll and a 48px nav on phones', async ({ page }) => {
  for (const path of PAGES) {
    await page.goto(path);
    const over = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(over, path).toBeLessThanOrEqual(0);
    expect((await page.locator('header[data-nav]').boundingBox())!.height).toBe(48);
  }
});

test('the mobile menu opens, locks scroll and closes with the button', async ({ page }) => {
  await page.goto('/projects/');
  const button = page.locator('header [data-menu-button]');
  await button.tap();
  await expect(page.locator('#mobile-menu')).toBeVisible();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#mobile-menu nav a')).toHaveText([
    'Experiences',
    'Projects',
    'STAR',
    'Blog',
  ]);
  await button.tap();
  await expect(page.locator('#mobile-menu')).toBeHidden();
  await expect(button).toBeFocused();
});

test('local nav dropdown opens and a link tap closes it', async ({ page }) => {
  await page.goto('/experiences/');
  const local = page.locator('[data-local-nav]');
  expect((await local.boundingBox())!.height).toBe(48);
  await local.locator('summary').tap();
  await expect(local.locator('.tray a').first()).toBeVisible();
  await local.locator('.tray a').first().tap();
  await expect(local.locator('.tray')).toBeHidden();
});

test('search panel opens from the bar with a 28px input', async ({ page }) => {
  await page.goto('/');
  await page.locator('header').getByRole('button', { name: 'Search' }).tap();
  await expect(page.locator('#search-dialog')).toBeVisible();
  const size = await page.locator('#search-input').evaluate((e) => getComputedStyle(e).fontSize);
  expect(size).toBe('28px');
});

test('footer shows accordions and the content respects the safe areas', async ({ page }) => {
  await page.goto('/blog/');
  await expect(page.locator('footer .accordions details')).toHaveCount(4);
  await expect(page.locator('footer .cols')).toBeHidden();
  const content = await page.locator('meta[name=viewport]').getAttribute('content');
  expect(content).toContain('viewport-fit=cover');
});

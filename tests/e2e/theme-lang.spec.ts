import { expect, test } from '@playwright/test';

test.describe('theme toggle', () => {
  test('is light by default, even when the OS is dark', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-pref', 'light');
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
      'rgb(255, 255, 255)',
    );
  });

  test('cycles Light → Dark → System and survives a reload', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');
    const toggle = page.locator('header .bar [data-theme-toggle]');
    await expect(html).toHaveAttribute('data-pref', 'light');
    await expect(toggle).toHaveAttribute('aria-label', 'Theme: Light');
    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(toggle).toHaveAttribute('aria-label', 'Theme: Dark');
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await toggle.click();
    await expect(html).toHaveAttribute('data-pref', 'system');
    await expect(html).not.toHaveAttribute('data-theme', /.*/);
    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('System follows the OS setting', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'system'));
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
      'rgb(0, 0, 0)',
    );
  });

  test('is applied before any script bundle runs (no flash)', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    // Block the module scripts: only the inline <head> script can set the theme.
    await page.route('**/*.js', (route) => route.abort());
    await page.goto('/experiences/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
      'rgb(0, 0, 0)',
    );
  });
});

test.describe('language switch', () => {
  test('keeps the page, and translated pages have no banner', async ({ page }) => {
    await page.goto('/experiences/');
    await page.locator('.lang-switch a').click();
    await expect(page).toHaveURL(/\/vi\/experiences\/$/);
    await expect(page.getByRole('note')).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
    await expect(page.locator('link[hreflang="vi"]')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1, name: 'Kinh nghiệm' })).toBeVisible();
    await page.locator('.lang-switch a').click();
    await expect(page).toHaveURL(/\/experiences\/$/);
  });

  // The EN-only banner has no e2e test: every STAR story is translated, so no such page exists.
  // It is covered by tests/unit/star-render.test.ts.

  test('moves between translated posts without a banner', async ({ page }) => {
    await page.goto('/blog/neovim-setup-1-zero-to-editor/');
    await expect(page.locator('link[hreflang="vi"]')).toHaveCount(1);
    await page.locator('.lang-switch a').click();
    await expect(page).toHaveURL(/\/vi\/blog\/neovim-setup-1-zero-to-editor\/$/);
    await expect(page.getByRole('note').filter({ hasText: 'chỉ có bằng tiếng Anh' })).toHaveCount(
      0,
    );
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Hướng dẫn thiết lập Neovim',
    );
  });
});

test.describe('hreflang agrees with the sitemap', () => {
  const hreflangs = (page: import('@playwright/test').Page) =>
    page
      .locator('link[rel=alternate][hreflang]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('hreflang')));

  test('EN pages list vi only when the Vietnamese page is real', async ({ page, request }) => {
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    for (const path of [
      '/',
      '/experiences/',
      '/projects/',
      '/star/',
      '/star/emr-cost-optimization/',
      '/blog/',
      '/blog/topics/',
      '/blog/topics/developer-tools/',
    ]) {
      await page.goto(path);
      const inSitemap = sitemap.includes(`<loc>https://ryanparker97.github.io/vi${path}</loc>`);
      const langs = await hreflangs(page);
      expect(langs.includes('vi'), `${path} hreflang=vi vs sitemap`).toBe(inSitemap);
      expect(langs).toContain('en');
      expect(langs).toContain('x-default');
    }
  });
});

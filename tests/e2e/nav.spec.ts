import { expect, test } from '@playwright/test';

test.describe('desktop nav', () => {
  test('lists Experiences, Projects, STAR, Blog in order', async ({ page }) => {
    await page.goto('/');
    const links = page.locator('header nav.links a');
    await expect(links).toHaveText(['Experiences', 'Projects', 'STAR', 'Blog']);
  });

  for (const [path, label] of [
    ['/projects/', 'Projects'],
    ['/vi/projects/', 'Dự án'],
    ['/experiences/', 'Experiences'],
  ] as const) {
    test(`marks ${label} as current on ${path}`, async ({ page }) => {
      await page.goto(path);
      const current = page.locator('header nav.links a[aria-current="page"]');
      await expect(current).toHaveCount(1);
      await expect(current).toHaveText(label);
    });
  }

  test('bar is 44px tall (--nav-h) and at most 1024px wide', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    expect((await page.locator('header[data-nav]').boundingBox())!.height).toBe(44);
    expect((await page.locator('header .bar').boundingBox())!.width).toBeLessThanOrEqual(1024);
    await expect(page.locator('header [data-menu-button]')).toBeHidden();
    const navH = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--nav-h').trim(),
    );
    expect(navH).toBe('44px');
  });
});

test.describe('mobile menu', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('bar is 48px and shows only brand, search and menu', async ({ page }) => {
    await page.goto('/projects/');
    expect((await page.locator('header[data-nav]').boundingBox())!.height).toBe(48);
    await expect(page.locator('header .brand')).toBeVisible();
    await expect(page.locator('header [data-search-open]')).toBeVisible();
    await expect(page.locator('header [data-menu-button]')).toBeVisible();
    await expect(page.locator('header .bar [data-theme-toggle]')).toBeHidden();
    await expect(page.locator('header .lang-switch')).toBeHidden();
    await expect(page.locator('header nav.links')).toBeHidden();
  });

  test('opens, locks scroll, makes the page inert, traps focus and closes on Escape', async ({
    page,
    browserName,
  }) => {
    await page.goto('/projects/');
    const button = page.locator('header [data-menu-button]');
    const menu = page.locator('#mobile-menu');
    await expect(menu).toBeHidden();
    await expect(button).toHaveAccessibleName('Menu');
    await button.click();
    await expect(menu).toBeVisible();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(button).toHaveAccessibleName('Close');
    await expect(menu.locator('a').first()).toBeFocused();
    await expect(menu.locator('nav a')).toHaveText(['Experiences', 'Projects', 'STAR', 'Blog']);
    await expect(menu.locator('nav a[aria-current="page"]')).toHaveText('Projects');
    const size = await menu
      .locator('nav a')
      .first()
      .evaluate((e) => getComputedStyle(e).fontSize);
    expect(size).toBe('28px');
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden');
    await expect(page.locator('main')).toHaveAttribute('inert', '');
    await expect(page.locator('footer.site-footer')).toHaveAttribute('inert', '');
    // Focus stays inside the bar and the panel.
    // Safari does not Tab to buttons and links by default, so WebKit skips the trap loop.
    for (let i = 0; i < (browserName === 'webkit' ? 0 : 14); i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('header'))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(button).toBeFocused();
    await expect(page.locator('main')).not.toHaveAttribute('inert', '');
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
  });

  test('theme and language work inside the menu without closing it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Menu' }).click();
    const row = page.locator('#mobile-menu [data-theme-toggle]');
    await expect(row).toHaveText('Theme: Light');
    await row.click();
    await expect(row).toHaveText('Theme: Dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('#mobile-menu')).toBeVisible();
    const lang = page.locator('#mobile-menu a', { hasText: 'Language: Tiếng Việt' });
    await expect(lang).toHaveAttribute('href', '/vi/');
    await expect(page.locator('#mobile-menu a', { hasText: 'Download CV' })).toBeVisible();
  });

  test('the button, a link tap and resizing past compact chrome each close it', async ({
    page,
  }) => {
    await page.goto('/');
    const button = page.locator('header [data-menu-button]');
    const menu = page.locator('#mobile-menu');
    await button.click();
    await button.click();
    await expect(menu).toBeHidden();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await button.click();
    await page.setViewportSize({ width: 1024, height: 800 });
    await expect(menu).toBeHidden();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await page.setViewportSize({ width: 375, height: 800 });
    await button.click();
    await menu.getByRole('link', { name: 'Blog' }).click();
    await expect(page).toHaveURL(/\/blog\/$/);
  });

  test('without JavaScript the four links scroll in the bar', async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 375, height: 800 },
    });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('header [data-menu-button]')).toBeHidden();
    await expect(page.locator('header nav.links a')).toHaveCount(4);
    await expect(page.locator('header nav.links a').first()).toBeVisible();
    await context.close();
  });
});

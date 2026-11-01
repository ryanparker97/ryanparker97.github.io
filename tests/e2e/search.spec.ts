import { expect, test } from '@playwright/test';

test.describe('search', () => {
  test('loads Pagefind only when first opened', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (r) => r.url().includes('/pagefind/') && requests.push(r.url()));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(requests).toEqual([]);
    await page.keyboard.press('ControlOrMeta+k');
    await expect(page.locator('#search-dialog')).toBeVisible();
    await expect(page.locator('#search-input')).toBeFocused();
    await expect.poll(() => requests.length).toBeGreaterThan(0);
  });

  test('opens with "/" (not while typing) and closes with Esc, returning focus to the trigger', async ({
    page,
  }) => {
    await page.goto('/experiences/');
    const trigger = page.locator('header').getByRole('button', { name: 'Search' });
    await trigger.focus();
    await page.keyboard.press('/');
    const dialog = page.locator('#search-dialog');
    await expect(dialog).toBeVisible();
    await page.keyboard.type('a/b');
    await expect(page.locator('#search-input')).toHaveValue('a/b');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('opens from the nav icon and finds blog posts with a highlighted excerpt', async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('header').getByRole('button', { name: 'Search' }).click();
    await page.locator('#search-input').fill('lazy-loaded plugins');
    const hit = page.locator('.hit').first();
    await expect(hit).toBeVisible();
    await expect(hit.locator('.type')).toHaveText('Blog');
    await expect(hit.locator('strong').first()).toContainText('Neovim setup guide, Part 1');
    await expect(hit.locator('mark').first()).toBeVisible();
    await hit.locator('a.main').click();
    await expect(page).toHaveURL(/\/blog\/neovim-setup-1-zero-to-editor\/$/);
  });

  test('finds the experiences, STAR stories and projects (with #slug sub-results)', async ({
    page,
  }) => {
    await page.goto('/');
    await page.keyboard.press('ControlOrMeta+k');
    const input = page.locator('#search-input');
    await input.fill('Datadog observability');
    await expect(page.locator('.hit .type', { hasText: 'Experiences' })).toBeVisible();
    await input.fill('Multi-Agent Coding System');
    await expect(page.locator('.hit .type', { hasText: 'Projects' })).toBeVisible();
    await expect(
      page.locator('.hit a[href*="/projects/#agentic-coding-workflow"]').first(),
    ).toBeVisible();
    await input.fill('Airflow reuse idle EMR clusters');
    await expect(page.locator('.hit .type', { hasText: 'STAR' }).first()).toBeVisible();
    await input.fill('zzqxjwvk');
    await expect(page.locator('#search-status')).toContainText('No results for “zzqxjwvk”.');
  });

  test('does not index the print layout, tag pages or the 404 page', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('ControlOrMeta+k');
    const input = page.locator('#search-input');
    for (const query of ['Agentic Coding Technical Skills', 'Posts tagged', 'Page not found']) {
      await input.fill(query);
      await page.waitForTimeout(600);
      const urls = await page
        .locator('.hit a')
        .evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).pathname));
      expect(urls.filter((u) => /print|\/tags\/|404/.test(u))).toEqual([]);
    }
  });

  test('keeps Vietnamese and English indexes separate', async ({ page }) => {
    await page.goto('/vi/');
    await page.keyboard.press('ControlOrMeta+k');
    await page.locator('#search-input').fill('Neovim');
    await expect(page.locator('.hit a.main').first()).toBeVisible();
    const urls = await page
      .locator('.hit a.main')
      .evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).pathname));
    expect(urls.length).toBeGreaterThan(0);
    for (const u of urls) expect(u.startsWith('/vi/')).toBe(true);
    await expect(page.locator('#search-dialog')).toHaveAttribute(
      'aria-label',
      'Tìm kiếm trên trang',
    );
  });
});

test('after a keyboard-opened search closes with Esc, "/" reopens it', async ({ page }) => {
  await page.goto('/experiences/');
  await page.keyboard.press('ControlOrMeta+k');
  await page.keyboard.type('neovim');
  await page.keyboard.press('Escape');
  await expect(page.locator('#search-dialog')).toBeHidden();
  await page.keyboard.press('/');
  await expect(page.locator('#search-dialog')).toBeVisible();
  await expect(page.locator('#search-input')).toBeFocused();
});

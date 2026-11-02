import { expect, test, type Page } from '@playwright/test';

const POST = '/blog/neovim-setup-1-zero-to-editor/';
const DATA_POST = '/blog/neovim-setup-3-data-engineering/';

async function dark(page: Page) {
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
}

for (const path of ['/', POST]) {
  test(`prints light without nav, TOC or Copy buttons ${path}`, async ({ page }) => {
    await dark(page);
    await page.goto(path);
    await page.emulateMedia({ media: 'print' });
    const body = page.locator('body');
    await expect(body).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(body).toHaveCSS('color', 'rgb(29, 29, 31)');
    const sels =
      path === POST ? ['[data-nav]', '.toc-side', '.toc-narrow', '.copy-btn'] : ['[data-nav]'];
    for (const sel of sels) {
      const nodes = await page.locator(sel).all();
      expect(nodes.length, `${sel} matches on ${path}`).toBeGreaterThan(0);
      for (const node of nodes) await expect(node).toBeHidden();
    }
  });
}

test('code block focus ring is drawn on the block, not clipped', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(POST);
  await page.keyboard.press('Tab');
  const pre = page.locator('pre.astro-code').first();
  await pre.focus();
  expect(await pre.evaluate((n) => n.matches(':focus-visible'))).toBe(true);
  await expect(pre).toHaveCSS('outline-style', 'none');
  const block = page.locator('.code-block').first();
  await expect(block).toHaveCSS('outline-style', 'solid');
  await expect(block).toHaveCSS('outline-width', '2px');
});

test('copy button has a 44px tap area', async ({ page }) => {
  await page.goto(POST);
  const btn = page.locator('.copy-btn').first();
  const h = await btn.evaluate((n) => getComputedStyle(n, '::before').height);
  expect(h).toBe('44px');
  const header = await page.locator('.code-header').first().boundingBox();
  expect(header!.height).toBeGreaterThanOrEqual(44);
});

test('path titles break at slashes only', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(DATA_POST);
  const titles = page.locator('.code-title', { hasText: '/' });
  const count = await titles.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const t = titles.nth(i);
    expect(await t.locator('wbr').count()).toBeGreaterThan(0);
    await expect(t).toHaveCSS('overflow-wrap', 'normal');
    expect(await t.evaluate((n) => n.scrollWidth <= n.clientWidth)).toBe(true);
  }
});

test('language label and Copy are ignored by search indexing', async ({ page }) => {
  await page.goto(POST);
  expect(await page.locator('.code-lang[data-pagefind-ignore]').count()).toBeGreaterThan(0);
  expect(await page.locator('.copy-btn[data-pagefind-ignore]').count()).toBeGreaterThan(0);
});

for (const width of [1440, 375]) {
  test(`hero pills are 44px tall at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    for (const sel of ['.btn-primary', '.btn-secondary']) {
      const box = await page.locator(`main ${sel}`).first().boundingBox();
      expect(Math.abs(box!.height - 44)).toBeLessThanOrEqual(0.5);
    }
  });
}

test('inline code is 0.9em of its paragraph', async ({ page }) => {
  await page.goto(POST);
  const ratio = await page
    .locator('.prose p > code')
    .first()
    .evaluate((n) => {
      return (
        parseFloat(getComputedStyle(n).fontSize) /
        parseFloat(getComputedStyle(n.parentElement!).fontSize)
      );
    });
  expect(Math.abs(ratio - 0.9)).toBeLessThanOrEqual(0.01);
});

test('lockup strong inherits the lockup weight', async ({ page }) => {
  await page.goto('/');
  const strong = page.locator('.t-lockup strong').first();
  const parent = await strong.evaluate((n) => getComputedStyle(n.closest('.t-lockup')!).fontWeight);
  await expect(strong).toHaveCSS('font-weight', parent);
});

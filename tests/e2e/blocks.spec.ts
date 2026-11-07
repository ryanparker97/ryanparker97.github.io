import { expect, test } from '@playwright/test';

test.describe('hover lift', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  for (const [path, sel] of [
    ['/', '.gallery-card.lift'],
    ['/blog/series/', '.news-tile.lift'],
  ]) {
    test(`${path} ${sel} scales on hover after the reveal`, async ({ page }) => {
      await page.goto(path);
      const card = page.locator(sel).first();
      await card.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1500);
      await card.hover();
      await page.waitForTimeout(700);
      await expect(card).toHaveCSS('transform', 'matrix(1.0161, 0, 0, 1.0161, 0, 0)');
    });
  }
});

test.describe('hover lift under reduced motion', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  test('a hovered card does not scale', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('.gallery-card.lift').first();
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await card.hover();
    await page.waitForTimeout(500);
    await expect(card).toHaveCSS('transform', 'none');
  });
});

test.describe('in-context promo headline', () => {
  for (const [width, size, line] of [
    [1440, '40px', '44px'],
    [900, '32px', '35.2px'],
    [375, '32px', '35.2px'],
  ] as const) {
    test(`grid-tile h2 is ${size}/${line} at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/projects/');
      const h = page.locator('.grid-tile h2.t-promo').first();
      await expect(h).toHaveCSS('font-size', size);
      // WebKit reports 35.200001px; compare numerically.
      const lh = parseFloat(await h.evaluate((e) => getComputedStyle(e).lineHeight));
      expect(lh).toBeCloseTo(parseFloat(line), 2);
      if (width === 375) await expect(h).toHaveCSS('letter-spacing', /^(normal|0px)$/);
      if (width === 1440)
        expect(parseFloat(await h.evaluate((e) => getComputedStyle(e).letterSpacing))).toBeCloseTo(
          -0.2,
          2,
        );
    });
  }
});

test('site index keeps a gutter between groups', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/404.html');
  const gaps = await page.locator('.site-index .si-group').evaluateAll((groups) =>
    groups.map((g) => {
      const right = g.getBoundingClientRect().right;
      let max = 0;
      for (const a of g.querySelectorAll('a')) {
        const r = document.createRange();
        r.selectNodeContents(a);
        max = Math.max(max, r.getBoundingClientRect().right);
      }
      return right - max;
    }),
  );
  expect(gaps.length).toBeGreaterThan(1);
  for (const gap of gaps) expect(gap).toBeGreaterThanOrEqual(20);
});

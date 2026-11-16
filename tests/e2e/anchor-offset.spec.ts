import { expect, test } from '@playwright/test';

// Anchor jumps land one offset below the sticky bar (html scroll-padding-top = bar + 16px), not two.
test.use({ reducedMotion: 'reduce' });

const CASES = [
  { path: '/experiences/#next', id: 'next', bar: 52 },
  { path: '/experiences/#education', id: 'education', bar: 52 },
  { path: '/#career', id: 'career', bar: 44 },
];

for (const { path, id, bar } of CASES) {
  test(`${path} lands just under the bar`, async ({ page }) => {
    await page.goto(path);
    const target = page.locator(`#${id}`);
    await expect(target).toHaveCount(1);
    // Heading ids may add --eyebrow-room (56px); section and tile ids add nothing.
    const eyebrow = await target.evaluate((el) =>
      parseFloat(getComputedStyle(el).scrollMarginTop || '0'),
    );
    await expect
      .poll(() => target.evaluate((el) => Math.round(el.getBoundingClientRect().top)), {
        timeout: 5000,
      })
      .toBeGreaterThanOrEqual(bar + 16 - 2);
    const top = await target.evaluate((el) => Math.round(el.getBoundingClientRect().top));
    expect(top).toBeLessThanOrEqual(bar + 16 + eyebrow + 24);
  });
}

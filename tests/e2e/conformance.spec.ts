import { expect, test } from '@playwright/test';

// Component conformance to spec.md: STAR desk card, footer rule, search panel, nav, post meta.
test.use({ reducedMotion: 'reduce' });

test.describe('STAR', () => {
  for (const [w, pad, radius] of [
    [1440, 32, 32],
    [375, 24, 24],
  ] as const) {
    test(`desk card padding is ${pad}px and radius ${radius}px at ${w}px`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto('/star/');
      for (const card of await page.locator('[data-story]').all()) {
        const v = await card.evaluate((e) => {
          const s = getComputedStyle(e);
          return { pad: s.paddingLeft, radius: s.borderTopLeftRadius };
        });
        expect(v).toEqual({ pad: `${pad}px`, radius: `${radius}px` });
      }
    });
  }
});

test.describe('footer rule', () => {
  for (const p of ['/projects/']) {
    test(`${p} ends on a white band and has no rule`, async ({ page }) => {
      await page.goto(p);
      const v = await page
        .locator('.site-footer')
        .evaluate((e) => getComputedStyle(e).borderTopWidth);
      expect(v).toBe('0px');
    });
  }
  test('/star/ ends on the grey story band and has a 1px rule', async ({ page }) => {
    await page.goto('/star/');
    await expect(page.locator('.site-footer')).toHaveCSS('border-top-width', '1px');
  });
  for (const p of ['/', '/vi/']) {
    test(`${p} ends on the grey #more band and has a 1px rule`, async ({ page }) => {
      await page.goto(p);
      await expect(page.locator('main > section#more.section--surface:last-child')).toHaveCount(1);
      await expect(page.locator('.site-footer')).toHaveCSS('border-top-width', '1px');
    });
  }
});

test.describe('experiences footer rule', () => {
  test('/experiences/ ends on a white band and has no rule', async ({ page }) => {
    await page.goto('/experiences/');
    const v = await page
      .locator('.site-footer')
      .evaluate((e) => getComputedStyle(e).borderTopWidth);
    expect(v).toBe('0px');
  });
});

test.describe('search panel', () => {
  for (const [w, gap] of [
    [1440, 32],
    [375, 49],
  ] as const) {
    test(`status line starts ${gap}px below the field at ${w}px`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 812 });
      await page.goto('/projects/');
      await page.getByRole('button', { name: 'Search' }).first().click();
      await page.locator('#search-input').fill('neovim');
      await expect(page.locator('.hit').first()).toBeVisible();
      const d = await page.evaluate(() => {
        const s = document.querySelector('#search-status')!.getBoundingClientRect();
        const f = document.querySelector('#search-dialog .field')!.getBoundingClientRect();
        return s.top - f.bottom;
      });
      expect(Math.abs(d - gap)).toBeLessThanOrEqual(1);
    });
  }

  test('quick links have 4px vertical padding at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/projects/');
    await page.getByRole('button', { name: 'Search' }).first().click();
    const v = await page
      .locator('#search-quick a')
      .first()
      .evaluate((e) => getComputedStyle(e).paddingTop);
    expect(v).toBe('4px');
  });
});

test('nav links use the 12/1.3334 caption line height', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const lh = await page
    .locator('[data-nav] .links a')
    .first()
    .evaluate((e) => parseFloat(getComputedStyle(e).lineHeight));
  expect(Math.abs(lh - 16)).toBeLessThanOrEqual(0.1);
});

test('post tag links in a wrapped meta line do not overlap', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/blog/neovim-setup-3-data-engineering/');
  const boxes = await page.locator('header.head .meta-line a').evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { l: r.left, r: r.right, t: r.top, b: r.bottom, h: r.height };
    }),
  );
  expect(boxes.length).toBeGreaterThan(1);
  for (const b of boxes) expect(b.h).toBeGreaterThanOrEqual(43.5);
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const c = boxes[j];
      const ox = Math.min(a.r, c.r) - Math.max(a.l, c.l);
      const oy = Math.min(a.b, c.b) - Math.max(a.t, c.t);
      expect(ox > 0.5 && oy > 0.5).toBe(false);
    }
});

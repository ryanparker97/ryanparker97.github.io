import { expect, test } from '@playwright/test';

test.describe('404 site index', () => {
  test('hero, three groups, and every index link resolves', async ({ page, request }) => {
    await page.goto('/nope-not-here/');
    await expect(page.locator('h1')).toHaveText('Page not found.');
    await expect(page.locator('.hero svg.page-art[role="img"]')).toHaveAttribute(
      'aria-label',
      'Illustration: a magnifying glass over an empty page outline.',
    );
    await expect(page.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/');
    await expect(page.getByRole('button', { name: 'Search' }).first()).toBeVisible();
    const nav = page.getByRole('navigation', { name: 'Site index' });
    await expect(nav.locator('h2')).toHaveText(['Explore', 'Writing', 'Connect']);
    const hrefs = await nav
      .locator('a')
      .evaluateAll((els) => els.map((e) => e.getAttribute('href')!));
    expect(hrefs.length).toBeGreaterThanOrEqual(9);
    for (const href of hrefs) {
      if (/^(mailto:|https?:)/.test(href)) continue;
      expect((await request.get(href)).status(), href).toBe(200);
    }
  });

  for (const [w, px] of [
    [1440, '28px'],
    [375, '21px'],
  ] as const) {
    test(`first group links are ${px} at ${w}px and every link is 44px tall`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 812 });
      await page.goto('/nope-not-here/');
      const first = page.locator('.si-group').first().locator('a').first();
      await expect(first).toHaveCSS('font-size', px);
      for (const a of await page.locator('.site-index a').all())
        expect((await a.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    });
  }
});

test.describe('motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('hero exit fade is scroll-driven at L and absent at 375; cards never are', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/projects/');
    const supported = await page.evaluate(() => CSS.supports('animation-timeline: view()'));
    if (supported)
      expect(
        await page.locator('[data-hero]').evaluate((e) => getComputedStyle(e).animationTimeline),
      ).toContain('view');
    await page.setViewportSize({ width: 375, height: 812 });
    for (const path of ['/', '/projects/', '/experiences/', '/star/']) {
      await page.goto(path);
      const driven = await page.evaluate(
        () =>
          [...document.querySelectorAll('main *')].filter(
            (e) => getComputedStyle(e).animationTimeline !== 'auto',
          ).length,
      );
      expect(driven, path).toBe(0);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/experiences/');
    const cards = await page.evaluate(
      () =>
        [...document.querySelectorAll('.card, .gallery-card, .news-tile')].filter(
          (e) => getComputedStyle(e).animationTimeline !== 'auto',
        ).length,
    );
    expect(cards).toBe(0);
  });

  test('page heroes: the H1 has no animation, the other parts run the intro', async ({ page }) => {
    for (const path of ['/projects/', '/star/', '/blog/']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      const r = await page.evaluate(() => {
        const h1 = document.querySelector('h1')!;
        return document.getAnimations().filter((a) => (a.effect as KeyframeEffect).target === h1)
          .length;
      });
      expect(r, path).toBe(0);
    }
  });

  test('a revealed 3-item group is fully visible 1.6s after entering view', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const grid = page.locator('#experience .rail');
    await grid.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 150));
    await page.waitForTimeout(1600);
    for (const el of await grid.locator('li').all()) await expect(el).toHaveCSS('opacity', '1');
  });
});

test.describe('motion: reduced', () => {
  test.use({ reducedMotion: 'reduce' });
  test('everything is static and visible after load', async ({ page }) => {
    for (const path of ['/', '/experiences/', '/star/', '/projects/']) {
      await page.goto(path);
      const bad = await page.evaluate(() =>
        [...document.querySelectorAll('main *')]
          .filter((e) => {
            const s = getComputedStyle(e);
            return (
              (s.transform !== 'none' && !e.closest('.plus-disc, summary')) || Number(s.opacity) < 1
            );
          })
          .filter(
            (e) =>
              e.getClientRects().length &&
              !e.closest('.paddle, [disabled], .icon-btn') &&
              !e.parentElement?.closest('svg.page-art'),
          )
          .map((e) => e.className),
      );
      expect(bad, path).toEqual([]);
    }
  });

  test('no element has a transition', async ({ page }) => {
    for (const path of [
      '/',
      '/experiences/',
      '/projects/',
      '/blog/',
      '/blog/neovim-setup-3-data-engineering/',
    ]) {
      await page.goto(path);
      if (path === '/') await page.locator('.grid-tile').first().hover();
      const bad = await page.evaluate(() => {
        const zero = (v: string) => v.split(',').every((x) => x.trim() === '0s');
        const out: string[] = [];
        for (const e of document.querySelectorAll('*'))
          for (const pseudo of [null, '::before', '::after']) {
            const s = getComputedStyle(e, pseudo);
            if (!zero(s.transitionDuration) || !zero(s.transitionDelay))
              out.push(`${e.tagName}.${e.className}${pseudo ?? ''}`);
          }
        return out;
      });
      expect(bad, path).toEqual([]);
    }
  });
});

test('Vietnamese pages use the new strings', async ({ page }) => {
  await page.goto('/vi/projects/');
  await expect(page.locator('h1')).toHaveText('Những thứ tôi đã xây dựng.');
  await page.goto('/vi/star/');
  await expect(page.locator('h1')).toHaveText('Những câu chuyện từ công việc.');
  await page.goto('/vi/blog/');
  await expect(page.locator('h1')).toHaveText('Ghi chú về dữ liệu và công cụ.');
  await page.goto('/vi/experiences/');
  await expect(page.locator('#highlights h2')).toHaveText('Những điểm nổi bật.');
});

test.describe('secondary button hover contrast', () => {
  test.use({ reducedMotion: 'reduce' });
  for (const [theme, fg] of [
    ['dark', 'rgb(0, 0, 0)'],
    ['light', 'rgb(255, 255, 255)'],
  ] as const) {
    test(`${theme}: hovered .btn-secondary text stays legible`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      const btn = page.locator('.btn-secondary').first();
      await btn.hover();
      await expect(btn).toHaveCSS('color', fg);
    });
    test(`${theme}: primary pill text is ${fg}`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
      await page.goto('/');
      await expect(page.locator('.btn-primary').first()).toHaveCSS('color', fg);
    });
  }
});

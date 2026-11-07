import { expect, test } from '@playwright/test';

const RULE =
  /@media\s*\(prefers-reduced-motion:\s*no-preference\)\s*\{\s*@view-transition\s*\{\s*navigation:\s*auto;?\s*\}\s*\}/;

test('view transition rule ships once, inside the reduced-motion guard', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page.$$eval('link[rel=stylesheet]', (els) =>
    els.map((e) => (e as HTMLLinkElement).href),
  );
  const inline = await page.$$eval('style', (els) => els.map((e) => e.textContent ?? ''));
  const sheets = [...inline];
  for (const href of hrefs) sheets.push(await (await page.request.get(href)).text());
  const css = sheets.join('\n');
  expect(css).toMatch(RULE);
  expect(css.split('@view-transition').length - 1).toBe(1);
  expect(css.replace(RULE, '')).not.toContain('@view-transition');
});

test('no ClientRouter or route announcer', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('script[src*="ClientRouter"]')).toHaveCount(0);
  await expect(page.locator('astro-route-announcer')).toHaveCount(0);
});

test('global nav navigation works with transitions on', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'chromium only');
  const errors: Error[] = [];
  // Chromium sometimes aborts the cross-fade, in single-worker runs too (about 1 in 5), and
  // reports it as an unhandled InvalidStateError; navigation still completes with no cross-fade.
  // Only that exact message is ignored.
  page.on('pageerror', (e) => {
    if (
      !/Transition was aborted because of invalid state\. ViewTransition opt-in disabled/.test(
        e.message,
      )
    )
      errors.push(e);
  });
  await page.goto('/');
  await page.locator('header nav.links a', { hasText: 'Experiences' }).click();
  await expect(page).toHaveURL(/\/experiences\/$/);
  expect(errors).toEqual([]);
});

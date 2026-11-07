import { expect, test } from '@playwright/test';

const STORY = '/star/emr-cost-optimization/';
const LABELS = ['Reuse before create', 'Idle shutdown', 'Configurable sizing'];
const QUESTION = 'Tell me about a time you reduced cost without hurting performance.';

// Stickiness needs motion allowed and JS on, so this file does not force reduced motion.
test.describe('STAR story stage', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('pinned stage at 1440: header, three ordered cards, intro, header stays put', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(STORY);
    await expect(page.locator('#steps h2')).toHaveText('Step by step.');
    await expect(page.locator('#steps .t-eyebrow')).toHaveText('Action');
    await expect(page.locator('#steps .t-subhead')).toHaveText(QUESTION);
    await expect(page.locator('#steps ol.hl-cards .hl-card h3')).toHaveText(LABELS);
    await expect(page.locator('#steps .stage-intro')).toContainText('I found two causes');
    const side = page.locator('#steps .chapter-side');
    expect(await side.evaluate((e) => getComputedStyle(e).position)).toBe('sticky');
    // The stage is short, so find the scroll position where the header first sticks, then move
    // 30px further (still inside the pin range).
    const start = await page.evaluate(() => {
      const el = document.querySelector('#steps .chapter-side')!;
      return el.getBoundingClientRect().top + scrollY;
    });
    const stuckTop = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.querySelector('#steps .chapter-side')!).top),
    );
    await page.evaluate((y) => window.scrollTo(0, y), start - stuckTop + 10);
    const a = (await side.boundingBox())!.y;
    await page.evaluate((y) => window.scrollTo(0, y), start - stuckTop + 40);
    const b = (await side.boundingBox())!.y;
    expect(Math.abs(a - b)).toBeLessThanOrEqual(1);
  });

  test('stacked flex at 900', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1000 });
    await page.goto(STORY);
    await expect(page.locator('#steps .chapter-grid')).toHaveCSS('display', 'flex');
  });

  test('reduced motion at 1440: not sticky, all cards visible', async ({ browser }) => {
    const ctx = await browser.newContext({
      reducedMotion: 'reduce',
      viewport: { width: 1440, height: 900 },
    });
    const page = await ctx.newPage();
    await page.goto(STORY);
    await expect(page.locator('#steps .chapter-side')).toHaveCSS('display', 'contents');
    expect(
      await page.locator('#steps .chapter-side').evaluate((e) => getComputedStyle(e).position),
    ).not.toBe('sticky');
    for (const c of await page.locator('#steps .hl-card').all()) await expect(c).toBeVisible();
    await ctx.close();
  });

  test('JS off at 1440: not sticky, all cards visible', async ({ browser }) => {
    const ctx = await browser.newContext({
      javaScriptEnabled: false,
      reducedMotion: 'no-preference',
      viewport: { width: 1440, height: 900 },
    });
    const page = await ctx.newPage();
    await page.goto(STORY);
    await expect(page.locator('#steps .chapter-side')).toHaveCSS('display', 'contents');
    for (const c of await page.locator('#steps .hl-card').all()) await expect(c).toBeVisible();
    await ctx.close();
  });

  test('panels: S and T above the stage, one R with the stat, no A panel', async ({ page }) => {
    await page.goto(STORY);
    const keys = await page
      .locator('.story-steps [data-star-panel]')
      .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.starPanel));
    expect(keys).toEqual(['s', 't']);
    await expect(page.locator('[data-star-panel="r"]')).toHaveCount(1);
    await expect(page.locator('[data-star-panel="r"] .stat-value').first()).toHaveText('>50%');
    await expect(page.locator('[data-star-panel="a"]')).toHaveCount(0);
  });

  test('VI story shows three steps and the VI heading', async ({ page }) => {
    await page.goto(`/vi${STORY}`);
    await expect(page.locator('#steps h2')).toHaveText('Từng bước một.');
    await expect(page.locator('#steps .hl-card')).toHaveCount(3);
  });
});

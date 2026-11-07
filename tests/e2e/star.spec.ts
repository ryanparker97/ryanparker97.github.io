import { expect, test } from '@playwright/test';

test.describe('STAR', () => {
  test('hero art is themed by tokens', async ({ page }) => {
    await page.goto('/star/');
    const fill = () =>
      page.evaluate(
        () =>
          getComputedStyle(document.querySelector('.hero svg.page-art rect:last-of-type')!).fill,
      );
    expect(await fill()).toBe('rgb(0, 80, 159)');
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'dark';
    });
    expect(await fill()).toBe('rgb(92, 176, 255)');
  });

  test('hero, chapters by role with a start-aligned header and View in experiences', async ({
    page,
  }) => {
    await page.goto('/star/');
    await expect(page.locator('h1')).toHaveText('Stories from the work.');
    await expect(page.locator('.hero svg.page-art[role="img"]')).toHaveAttribute(
      'aria-label',
      /^Illustration: four rising steps/,
    );
    await expect(page.locator('.hero')).toContainText('1 story across 1 role.');
    await expect(page.locator('section[data-star-group] h2')).toHaveText([
      'Data Engineer (Data & Platform)',
    ]);
    const chapter = page.locator('section#datum-security-bank-data-engineer');
    await expect(chapter).toBeVisible();
    await expect(chapter.getByRole('link', { name: 'View in experiences' })).toHaveAttribute(
      'href',
      '/experiences/datum-security-bank-data-engineer/',
    );
    await expect(chapter.locator('.section-header--start')).toHaveCount(1);
  });

  test('story card: chips, question H3, stat lockup, plus disc and permalink', async ({ page }) => {
    await page.goto('/star/');
    const card = page.locator('[data-story]').first();
    await expect(card.locator('h3')).toContainText('Tell me about a time you reduced cost');
    await expect(card.locator('.stat-slot .stat-value')).toHaveText('>50%');
    const disc = card.locator('summary.plus-disc');
    await expect(disc).toHaveAttribute('aria-label', /^Learn more about Cutting EMR costs/);
    const b = (await disc.boundingBox())!;
    expect(b.width).toBeGreaterThanOrEqual(44);
    expect(b.height).toBeGreaterThanOrEqual(44);
    await expect(card.getByRole('link', { name: /Permalink/ })).toHaveAttribute(
      'href',
      '/star/emr-cost-optimization/',
    );
  });

  test('Expand all / Collapse all and keyboard toggle', async ({ page }) => {
    await page.goto('/star/');
    const first = page.locator('[data-story]').first();
    const more = first.locator(':scope > .more');
    await expect(more).not.toHaveAttribute('open', '');
    await first.locator('summary.plus-disc').focus();
    await page.keyboard.press('Enter');
    await expect(more).toHaveAttribute('open', '');
    await page.keyboard.press('Space');
    await expect(more).not.toHaveAttribute('open', '');
    await page.getByRole('button', { name: 'Expand all' }).click();
    await expect(more).toHaveAttribute('open', '');
    await expect(page.getByRole('button', { name: 'Collapse all' })).toBeVisible();
    // An open card shows all four STAR panels at once, with no nested toggles.
    const panels = first.locator('[data-star-panel]');
    await expect(panels).toHaveCount(4);
    for (const p of await panels.all()) await expect(p).toBeVisible();
    await expect(more.locator('details')).toHaveCount(0);
    await expect(panels.locator('h4')).toHaveText(['Situation', 'Task', 'Action', 'Result']);
  });

  test('competency filter updates the URL; empty chapters and their nav link are hidden', async ({
    page,
  }) => {
    await page.goto('/star/');
    await page.getByRole('button', { name: 'Ownership' }).click();
    await expect(page).toHaveURL(/\?c=ownership$/);
    await expect(page.locator('[data-story]:visible')).toHaveCount(1);
    await page.goBack();
    await expect(page).not.toHaveURL(/\?c=/);
    await page.goto('/star/?c=customer-focus');
    await expect(page.locator('[data-story]:visible')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Customer focus' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // A filter that matches nothing in the group hides it and its local-nav link; the page
    // shows the empty state when nothing matches.
    await page.goto('/star/?c=conflict');
    await expect(page.locator('section[data-star-group]')).toBeHidden();
    await expect(page.locator('.links a[href="#datum-security-bank-data-engineer"]')).toBeHidden();
    await expect(page.getByText('No stories match.')).toBeVisible();
    await page.getByRole('button', { name: 'Show all' }).click();
    await expect(page.locator('section[data-star-group]')).toBeVisible();
  });

  test('story page: quote with Interview question, super stat, four-panel grid, closing links', async ({
    page,
  }) => {
    await page.goto('/star/');
    const link = page.getByRole('link', { name: /Permalink to this story: Cutting EMR costs/ });
    await link.scrollIntoViewIfNeeded();
    // The card fades up as it enters view; click once it has settled.
    await expect(page.locator('[data-story]').first()).toHaveCSS('translate', 'none');
    await link.click();
    await expect(page).toHaveURL(/\/star\/emr-cost-optimization\/$/);
    await expect(page.locator('h1')).toHaveText('Cutting EMR costs by more than half');
    await expect(page.locator('figure.quote figcaption')).toHaveText('Interview question');
    await expect(page.locator('.stat--super .stat-value')).toHaveText('>50%');
    const panels = page.locator('[data-star-panel]');
    await expect(panels.locator('h3')).toHaveText(['Situation', 'Task', 'Result']);
    await expect(page.locator('#steps h2')).toHaveText('Step by step.');
    for (const p of await panels.all()) await expect(p).toBeVisible();
    await expect(page.getByRole('link', { name: 'All stories' }).last()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Read the role' })).toHaveAttribute(
      'href',
      '/experiences/datum-security-bank-data-engineer/',
    );
  });

  test('story panels: S and T side by side, R full width; one column at 375px', async ({
    page,
  }) => {
    const boxes = async () => {
      const out: Record<string, { x: number; y: number; w: number }> = {};
      for (const k of ['s', 't', 'r']) {
        const b = (await page.locator(`[data-star-panel="${k}"]`).boundingBox())!;
        out[k] = { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width) };
      }
      return out;
    };
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/star/emr-cost-optimization/');
    let b = await boxes();
    expect(b.s.y).toBe(b.t.y);
    expect(b.t.x).toBeGreaterThan(b.s.x);
    expect(b.r.w).toBeGreaterThan(b.s.w * 1.8);
    expect(b.r.y).toBeGreaterThan(b.t.y);
    await expect(page.locator('[data-star-panel="r"] .stat-value').first()).toHaveText('>50%');
    await page.setViewportSize({ width: 375, height: 812 });
    b = await boxes();
    expect(b.t.y).toBeGreaterThan(b.s.y);
    expect(b.t.x).toBe(b.s.x);
  });

  test('peek rule at 1440x900 and 375x812', async ({ page }) => {
    for (const path of ['/star/', '/vi/star/']) {
      for (const [w, h] of [
        [1440, 900],
        [375, 812],
      ]) {
        await page.setViewportSize({ width: w, height: h });
        await page.goto(path);
        const y = (await page.locator('section[data-star-group]').first().boundingBox())!.y;
        expect(h - y, `${path} ${w}`).toBeGreaterThanOrEqual(64);
      }
    }
  });

  test('the role page links to its STAR story and the card anchor still lands', async ({
    page,
  }) => {
    await page.goto('/experiences/datum-security-bank-data-engineer/');
    const link = page.getByRole('link', { name: 'Read the STAR story' });
    await expect(link).toHaveAttribute('href', '/star/emr-cost-optimization/');
    await page.goto('/experiences/#datum-security-bank-data-engineer');
    await expect(page.locator('#datum-security-bank-data-engineer')).toBeInViewport();
  });
});

// The sample marker and the untranslated-VI fallback banner are covered by Container-API fixtures in
// tests/unit/star-render.test.ts, because no sample or untranslated story exists any more.
test.describe('STAR language switch', () => {
  test('a translated story links to its Vietnamese page and back', async ({ page }) => {
    await page.goto('/star/emr-cost-optimization/');
    await expect(page.locator('.lang-switch a')).toHaveAttribute(
      'href',
      '/vi/star/emr-cost-optimization/',
    );
    await page.goto('/vi/star/emr-cost-optimization/');
    await expect(page.getByRole('note')).toHaveCount(0);
    await expect(page.locator('.lang-switch a')).toHaveAttribute(
      'href',
      '/star/emr-cost-optimization/',
    );
  });
});

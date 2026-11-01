import { expect, test } from '@playwright/test';

test.describe('Experiences', () => {
  test('no hero, summary/projects/skills/certifications', async ({ page }) => {
    await page.goto('/experiences/');
    for (const name of [
      'Summary',
      'AI Engineering & Agentic Coding',
      'Technical Skills',
      'Certifications',
      'Projects',
      'Skills',
    ]) {
      await expect(page.getByRole('heading', { name, exact: true })).toHaveCount(0);
    }
    await expect(page.locator('#summary, #skills, #certifications')).toHaveCount(0);
  });

  for (const [path, pdf] of [
    ['/experiences/', '/cv.pdf'],
    ['/vi/experiences/', '/vi/cv.pdf'],
  ] as const) {
    test(`Download PDF on ${path} points to a real PDF`, async ({ page, request }) => {
      await page.goto(path);
      const link = page.locator('a[download="Ryan-Parker-CV.pdf"]').first();
      await expect(link).toHaveAttribute('href', pdf);
      const res = await request.get(pdf);
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toContain('application/pdf');
    });
  }

  test('print layout is noindex and has no nav', async ({ page }) => {
    await page.goto('/experiences/print/');
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex');
    await expect(page.locator('header[data-nav]')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'AI Engineering & Agentic Coding' }),
    ).toBeVisible();
  });
});

test.describe('Projects', () => {
  const tile = (page: import('@playwright/test').Page) =>
    page.locator('[data-project="agentic-coding-workflow"]');

  test('hero, tile grid and Expand all in the local nav', async ({ page }) => {
    await page.goto('/projects/');
    await expect(page.locator('h1')).toHaveText("Things I've built.");
    await expect(page.locator('.tiles-2up .grid-tile')).toHaveCount(1);
    const details = tile(page).locator('details');
    await expect(details).not.toHaveAttribute('open', '');
    const expand = page.locator('[data-local-nav] button[data-expand]').first();
    await expect(expand).toHaveAttribute('aria-expanded', 'false');
    await expect(expand).toHaveText(/^Expand all\s*›?$/, { useInnerText: true });
    await expand.click();
    await expect(details).toHaveAttribute('open', '');
    await expect(page.getByText('Orchestrated Specialist Flows')).toBeVisible();
    await expect(expand).toHaveAttribute('aria-expanded', 'true');
    await expect(expand).toHaveText(/^Collapse all\s*›?$/, { useInnerText: true });
    await expand.click();
    await expect(details).not.toHaveAttribute('open', '');
    await expect(expand).toHaveAttribute('aria-expanded', 'false');
    await expect(expand).toHaveText(/^Expand all\s*›?$/, { useInnerText: true });
    // Opening the tile by hand also flips the control.
    await tile(page).locator('summary').click();
    await expect(expand).toHaveAttribute('aria-expanded', 'true');
  });

  test('the single tile spans both columns and reads as a feature (380px)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/projects/');
    const box = (await tile(page).boundingBox())!;
    expect(box.width).toBe(1416);
    expect(box.height).toBeGreaterThanOrEqual(380);
  });

  test('plus-disc summary is at least 44x44 and named "Learn more about ..."', async ({ page }) => {
    await page.goto('/projects/');
    const summary = tile(page).locator('summary');
    const b = (await summary.boundingBox())!;
    expect(b.width).toBeGreaterThanOrEqual(44);
    expect(b.height).toBeGreaterThanOrEqual(44);
    await expect(summary).toHaveAttribute('aria-label', /^Learn more about /);
    await expect(summary.locator('.plus-label')).toHaveText('Learn more');
  });

  test('Details toggles with Enter and Space and announces its state', async ({ page }) => {
    await page.goto('/projects/');
    const summary = tile(page).locator('summary');
    const details = tile(page).locator('details');
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(details).toHaveAttribute('open', '');
    await page.keyboard.press('Space');
    await expect(details).not.toHaveAttribute('open', '');
  });

  test('an open tile shows bullet cards and the "At ..." link; no per-project route', async ({
    page,
    request,
  }) => {
    await page.goto('/projects/#agentic-coding-workflow');
    await expect(tile(page).locator('details')).toHaveAttribute('open', '');
    await expect(tile(page).locator('.hl-card')).toHaveCount(5);
    expect((await request.get('/projects/agentic-coding-workflow/')).status()).toBe(404);
  });

  test('?kind= filters, shows the empty state, resets, and works with Back/Forward', async ({
    page,
  }) => {
    await page.goto('/projects/?kind=work');
    await expect(page.getByText('No projects here yet.')).toBeVisible();
    await expect(tile(page)).toBeHidden();
    await page.getByRole('button', { name: 'Show all projects' }).click();
    await expect(page).toHaveURL(/\/projects\/$/);
    await expect(tile(page)).toBeVisible();
    await page.goBack();
    await expect(page.getByText('No projects here yet.')).toBeVisible();
    await page.goForward();
    await expect(tile(page)).toBeVisible();
    await page.goto('/projects/?kind=personal');
    await expect(tile(page)).toBeVisible();
  });

  test('a deep link to a hidden tile resets the filter and keeps the URL in sync', async ({
    page,
  }) => {
    await page.goto('/projects/?kind=work#agentic-coding-workflow');
    await expect(tile(page)).toBeVisible();
    await expect(page).not.toHaveURL(/kind=/);
  });

  test('peek rule at 375x812: the tile starts below the hero', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/projects/');
    const y = (await tile(page).boundingBox())!.y;
    expect(812 - y).toBeGreaterThanOrEqual(64);
  });
});

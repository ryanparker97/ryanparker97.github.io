import { expect, test } from '@playwright/test';

test.describe('Experiences', () => {
  test('no summary/projects/skills', async ({ page }) => {
    await page.goto('/experiences/');
    for (const name of [
      'Summary',
      'AI Engineering & Agentic Coding',
      'Technical Skills',
      'Projects',
      'Skills',
    ]) {
      await expect(page.getByRole('heading', { name, exact: true })).toHaveCount(0);
    }
    await expect(page.locator('#summary, #skills')).toHaveCount(0);
  });

  for (const [path, pdf] of [
    ['/experiences/', '/cv.pdf'],
    ['/vi/experiences/', '/vi/cv.pdf'],
  ] as const) {
    test(`Download CV on ${path} points to a real PDF`, async ({ page, request }) => {
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
    await expect(page.locator('main')).toHaveCount(1);
    await expect(
      page.getByRole('heading', { name: 'AI Engineering & Agentic Coding' }),
    ).toBeVisible();
  });
});

test.describe('Projects', () => {
  const tile = (page: import('@playwright/test').Page) =>
    page.locator('[data-project="agentic-coding-workflow"]');

  test('hero and one lineup tile; no expanders', async ({ page }) => {
    await page.goto('/projects/');
    await expect(page.locator('h1')).toHaveText("Things I've built.");
    await expect(page.locator('.tiles-2up--feature .grid-tile')).toHaveCount(1);
    await expect(tile(page).locator('details, .chip')).toHaveCount(0);
    await expect(page.locator('[data-local-nav] [data-expand]')).toHaveCount(0);
    await expect(
      tile(page).getByRole('link', { name: 'See the project: Multi-Agent Coding System' }),
    ).toHaveAttribute('href', '/projects/agentic-coding-workflow/');
    await expect(tile(page).locator('.btn')).toHaveCount(1);
  });

  test('the single tile spans both columns and reads as a feature (600px)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/projects/');
    const box = (await tile(page).boundingBox())!;
    expect(box.width).toBe(1416);
    expect(box.height).toBeGreaterThanOrEqual(600);
  });

  test('the tile shows its cover art with localised alt text', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/projects/');
    const img = tile(page).locator('.device--laptop img');
    await expect(img).toHaveCount(1);
    await expect(img).toHaveAttribute(
      'alt',
      'Illustration: three stages on a path, with gates between them, two sign-off checkmarks and a lane of agent nodes below.',
    );
    await expect(img).toHaveAttribute('src', /project-agentic-loop\.[^/]*svg$/);
    await expect(img).toHaveAttribute('width', '1280');
    const box = (await img.boundingBox())!;
    expect(Math.abs(box.height - (box.width * 9) / 16)).toBeLessThanOrEqual(1);
    await page.setViewportSize({ width: 375, height: 812 });
    const small = (await img.boundingBox())!;
    const t = (await tile(page).boundingBox())!;
    expect(small.x + small.width).toBeLessThanOrEqual(t.x + t.width);
    expect(small.x).toBeGreaterThanOrEqual(t.x);
    await page.goto('/vi/projects/');
    await expect(tile(page).locator('.device--laptop img')).toHaveAttribute(
      'alt',
      'Hình minh họa: ba chặng trên một đường đi, các gate xen giữa, hai dấu duyệt và một làn các nút agent bên dưới.',
    );
  });

  test('each project has its own page', async ({ request }) => {
    expect((await request.get('/projects/agentic-coding-workflow/')).status()).toBe(200);
    expect((await request.get('/projects/no-such-project/')).status()).toBe(404);
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

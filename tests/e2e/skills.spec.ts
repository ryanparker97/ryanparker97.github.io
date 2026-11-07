import { expect, test } from '@playwright/test';

// Skills page (spec §4.8): Tech Specs rows for skill groups, certifications and languages.
test.use({ reducedMotion: 'reduce' });

test.describe('Skills page', () => {
  test('structure: one H1, local nav title, one H2 per row', async ({ page }) => {
    await page.goto('/skills/');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('The tools I build with.');
    await expect(page.locator('[data-local-nav] .title').first()).toContainText('Skills');
    await expect(page.locator('main h2')).toHaveText([
      'Data Engineering',
      'Cloud Platform',
      'DevOps & IaC',
      'Backend Engineering',
      'AI Engineering',
      'Methodologies',
      'Certifications',
      'Languages',
    ]);
  });

  test('items, certifications and languages', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/skills/');
    await expect(page.locator('[data-spec-items]').first()).toBeVisible();
    await expect(page.locator('main')).toContainText('Lake Formation');
    expect(
      await page
        .locator('.spec-item')
        .first()
        .evaluate((e) => getComputedStyle(e).fontSize),
    ).toBe('17px');
    await expect(page.locator('#certifications')).toContainText('Amazon Web Services · 2022');
    await expect(page.locator('#certifications')).toContainText('Datadog · 2023');
    await expect(page.locator('#languages')).toContainText('Professional working proficiency');
  });

  test('no icons or chips', async ({ page }) => {
    await page.goto('/skills/');
    await expect(page.locator('.spec-sheet svg:not(.chev)')).toHaveCount(0);
    await expect(page.locator('.spec-sheet .chip')).toHaveCount(0);
  });

  test('two columns at 1440, stacked at 375, with hairlines', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/skills/');
    const row = page.locator('[data-spec-row]').first();
    const box = async () => ({
      name: (await row.locator('.spec-name').boundingBox())!,
      body: (await row.locator('.spec-body').boundingBox())!,
    });
    let b = await box();
    expect(b.name.x).toBeLessThan(b.body.x);
    expect(Math.abs(b.name.y - b.body.y)).toBeLessThanOrEqual(2);
    expect(await row.evaluate((e) => getComputedStyle(e).borderTopWidth)).toBe('1px');
    await page.setViewportSize({ width: 375, height: 812 });
    b = await box();
    expect(Math.abs(b.name.x - b.body.x)).toBeLessThanOrEqual(1);
  });

  test('peek: the band starts above the fold', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/skills/');
    const top = async () => (await page.locator('main > .section').first().boundingBox())!.y;
    expect(await top()).toBeLessThanOrEqual(836);
    await page.setViewportSize({ width: 375, height: 812 });
    expect(await top()).toBeLessThanOrEqual(748);
  });

  test('Vietnamese', async ({ page }) => {
    await page.goto('/vi/skills/');
    await expect(page.locator('h1')).toHaveText('Những công cụ tôi dùng để xây dựng.');
    await expect(page.locator('main h2').first()).toHaveText('Kỹ thuật dữ liệu');
  });

  test('linked from the footer and the Home local nav', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('footer').getByRole('link', { name: 'Skills' })).toHaveAttribute(
      'href',
      '/skills/',
    );
    await expect(page.locator('.local-nav .links a', { hasText: 'Skills' })).toHaveAttribute(
      'href',
      '/skills/',
    );
    await page.goto('/vi/');
    await expect(page.locator('.local-nav .links a', { hasText: 'Kỹ năng' })).toHaveAttribute(
      'href',
      '/vi/skills/',
    );
  });
});

import { expect, test } from '@playwright/test';

// Links to other sites open in a new tab with noopener noreferrer; mailto/tel/same-site links do not.
const SITE_HOST = 'ryanparker97.github.io';
const PATHS = ['/', '/blog/neovim-setup-1-zero-to-editor/', '/projects/', '/vi/', '/404.html'];

for (const path of PATHS) {
  test(`external links open in a new tab safely: ${path}`, async ({ page }) => {
    await page.goto(path);
    const links = await page.locator('a[href]').evaluateAll((as) =>
      as.map((a) => {
        const el = a as HTMLAnchorElement;
        return {
          href: el.href,
          protocol: el.protocol,
          host: el.host,
          target: el.getAttribute('target'),
          rel: el.getAttribute('rel') ?? '',
          here: location.host,
        };
      }),
    );
    let external = 0;
    for (const l of links) {
      const isWeb = l.protocol === 'http:' || l.protocol === 'https:';
      if (isWeb && l.host !== l.here && l.host !== SITE_HOST) {
        external++;
        expect(l.target, l.href).toBe('_blank');
        expect(l.rel, l.href).toContain('noopener');
        expect(l.rel, l.href).toContain('noreferrer');
      } else {
        expect(l.target, l.href).not.toBe('_blank');
      }
    }
    expect(external, 'external links found').toBeGreaterThan(0);
  });
}

test('footer LinkedIn opens in a new tab', async ({ page }) => {
  await page.goto('/');
  const a = page.locator('footer .cols').getByRole('link', { name: 'LinkedIn' });
  await expect(a).toHaveAttribute('target', '_blank');
  await expect(a).toHaveAttribute('rel', 'noopener noreferrer');
});

test('blog post brew.sh link opens in a new tab', async ({ page }) => {
  await page.goto('/blog/neovim-setup-1-zero-to-editor/');
  await expect(page.locator('a[href*="brew.sh"]').first()).toHaveAttribute('target', '_blank');
});

import { expect, test } from '@playwright/test';
import { builtPages } from './pages';

// WCAG 1.4.10 / 1.4.12: no page scrolls sideways at 320px with 200% text or the text-spacing overrides.
const MODES = {
  'text-200': 'html{font-size:200%!important}',
  'text-spacing':
    '*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important} p{margin-bottom:2em!important}',
} as const;

test.use({ viewport: { width: 320, height: 800 }, reducedMotion: 'reduce' });

for (const [mode, css] of Object.entries(MODES)) {
  for (const p of builtPages().filter((b) => b.kind !== 'print')) {
    test(`${mode} ${p.path}`, async ({ page }) => {
      await page.goto(p.path);
      await page.addStyleTag({ content: css });
      await page.evaluate(
        () =>
          new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
      );
      const m = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        iw: window.innerWidth,
      }));
      expect(m.sw).toBeLessThanOrEqual(m.iw);
      const title = page.locator('[data-local-nav] .title .t').first();
      if (await title.isVisible()) {
        expect(await title.evaluate((e) => e.clientWidth)).toBeGreaterThan(40);
      }
    });
  }
}

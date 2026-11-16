import { expect, test } from '@playwright/test';

// A page with the 52px local nav: keyboard focus must never end up hidden behind it
// (html scroll-padding-top, WCAG 2.4.11 Focus Not Obscured).
test.use({ reducedMotion: 'reduce' });

for (const path of ['/experiences/', '/vi/experiences/']) {
  test.describe(`Shift+Tab clears the sticky local nav ${path}`, () => {
    // 10: the link sits under the bar; -20: it is clipped by the top of the viewport.
    for (const top of [10, -20]) {
      test(`link starting at y=${top}px is fully visible below the nav`, async ({
        page,
        browserName,
      }) => {
        await page.goto(path);
        const nav = page.locator('[data-local-nav]');
        await expect(nav).toBeVisible();
        const links = page.locator('main a:visible');
        // Two consecutive links in normal flow (no sticky or fixed ancestor) far enough down to scroll to.
        const idx = await links.evaluateAll((els) => {
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          const ok = (el: Element) => {
            for (let e: Element | null = el; e; e = e.parentElement)
              if (['sticky', 'fixed'].includes(getComputedStyle(e).position)) return false;
            const top = el.getBoundingClientRect().top + window.scrollY;
            return top > 400 && top + 40 < maxScroll;
          };
          return els.findIndex((el, i) => ok(el) && i + 1 < els.length && ok(els[i + 1]));
        });
        expect(idx).toBeGreaterThanOrEqual(0);
        const target = links.nth(idx);
        const after = links.nth(idx + 1);
        // Scroll so the target sits at `top`, focus the next link without moving the page, then Shift+Tab.
        await target.evaluate((el, t) => {
          window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - t);
        }, top);
        // Engines round the scroll offset differently (WebKit lands 1px off), so allow 2px.
        await expect
          .poll(() =>
            target.evaluate((el, t) => Math.abs(el.getBoundingClientRect().top - t) <= 2, top),
          )
          .toBe(true);
        await after.evaluate((el) => (el as HTMLElement).focus({ preventScroll: true }));
        // WebKit tabs to links only with Alt held (Safari default); Chromium needs plain Shift+Tab.
        await page.keyboard.press(browserName === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab');
        await expect(target).toBeFocused();
        const navBottom = await nav.evaluate((el) => el.getBoundingClientRect().bottom);
        expect(Math.round(navBottom)).toBe(52);
        await expect
          .poll(() => target.evaluate((el) => Math.round(el.getBoundingClientRect().top)))
          .toBeGreaterThanOrEqual(navBottom);
        const box = (await target.boundingBox())!;
        const vh = page.viewportSize()!.height;
        expect(box.y + box.height).toBeLessThanOrEqual(vh);
      });
    }
  });
}

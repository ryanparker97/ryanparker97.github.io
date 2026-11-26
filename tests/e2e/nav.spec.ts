import { expect, test } from '@playwright/test';
import { builtPages } from './pages';

test.describe('desktop nav', () => {
  test('lists Experiences, Projects, In practice, Blog in order', async ({ page }) => {
    await page.goto('/');
    const links = page.locator('header nav.links a');
    await expect(links).toHaveText(['Experiences', 'Projects', 'In practice', 'Blog']);
  });

  for (const width of [834, 1440]) {
    for (const path of ['/', '/vi/']) {
      test(`nav links stay on one line without colliding at ${width}px on ${path}`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: width === 834 ? 800 : 900 });
        await page.goto(path);
        const boxes = await page.locator('header nav.links a').evaluateAll((els) =>
          els.map((e) => {
            const r = e.getBoundingClientRect();
            return {
              left: r.left,
              right: r.right,
              height: r.height,
              overflow: e.scrollWidth - e.clientWidth,
            };
          }),
        );
        expect(boxes).toHaveLength(4);
        for (const [i, b] of boxes.entries()) {
          expect(b.height, `link ${i} height`).toBeLessThanOrEqual(44);
          expect(b.overflow, `link ${i} scrollWidth - clientWidth`).toBeLessThanOrEqual(0);
          if (i < boxes.length - 1) {
            expect(b.right, `link ${i} right edge`).toBeLessThanOrEqual(boxes[i + 1].left);
          }
        }
      });
    }
  }

  for (const [path, label] of [
    ['/projects/', 'Projects'],
    ['/vi/projects/', 'Dự án'],
    ['/experiences/', 'Experiences'],
  ] as const) {
    test(`marks ${label} as current on ${path}`, async ({ page }) => {
      await page.goto(path);
      const current = page.locator('header nav.links a[aria-current="page"]');
      await expect(current).toHaveCount(1);
      await expect(current).toHaveText(label);
    });
  }

  test('bar is 44px tall (--nav-h) and at most 1024px wide', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    expect((await page.locator('header[data-nav]').boundingBox())!.height).toBe(44);
    expect((await page.locator('header .bar').boundingBox())!.width).toBeLessThanOrEqual(1024);
    await expect(page.locator('header [data-menu-button]')).toBeHidden();
    const navH = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--nav-h').trim(),
    );
    expect(navH).toBe('44px');
  });
});

test.describe('mobile menu', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('bar is 48px and shows only logo, search and menu', async ({ page }) => {
    await page.goto('/projects/');
    expect((await page.locator('header[data-nav]').boundingBox())!.height).toBe(48);
    await expect(page.locator('header .logo')).toBeVisible();
    await expect(page.locator('header [data-search-open]')).toBeVisible();
    await expect(page.locator('header [data-menu-button]')).toBeVisible();
    await expect(page.locator('header .bar [data-theme-toggle]')).toBeHidden();
    await expect(page.locator('header .lang-switch')).toBeHidden();
    await expect(page.locator('header nav.links')).toBeHidden();
  });

  test('opens, locks scroll, makes the page inert, traps focus and closes on Escape', async ({
    page,
    browserName,
  }) => {
    await page.goto('/projects/');
    const button = page.locator('header [data-menu-button]');
    const menu = page.locator('#mobile-menu');
    await expect(menu).toBeHidden();
    await expect(button).toHaveAccessibleName('Menu');
    await button.click();
    await expect(menu).toBeVisible();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(button).toHaveAccessibleName('Close');
    await expect(menu.locator('a').first()).toBeFocused();
    await expect(menu.locator('nav a')).toHaveText([
      'Experiences',
      'Projects',
      'In practice',
      'Blog',
    ]);
    await expect(menu.locator('nav a[aria-current="page"]')).toHaveText('Projects');
    const size = await menu
      .locator('nav a')
      .first()
      .evaluate((e) => getComputedStyle(e).fontSize);
    expect(size).toBe('28px');
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden');
    await expect(page.locator('main')).toHaveAttribute('inert', '');
    await expect(page.locator('footer.site-footer')).toHaveAttribute('inert', '');
    // Focus stays inside the bar and the panel.
    // Safari does not Tab to buttons and links by default, so WebKit skips the trap loop.
    for (let i = 0; i < (browserName === 'webkit' ? 0 : 14); i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('header'))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(button).toBeFocused();
    await expect(page.locator('main')).not.toHaveAttribute('inert', '');
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
  });

  test('theme and language work inside the menu without closing it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Menu' }).click();
    const row = page.locator('#mobile-menu [data-theme-toggle]');
    await expect(row).toHaveText('Theme: Light');
    await row.click();
    await expect(row).toHaveText('Theme: Dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('#mobile-menu')).toBeVisible();
    const lang = page.locator('#mobile-menu a', { hasText: 'Language: Tiếng Việt' });
    await expect(lang).toHaveAttribute('href', '/vi/');
    await expect(page.locator('#mobile-menu a', { hasText: 'Download CV' })).toBeVisible();
  });

  test('the button, a link tap and resizing past compact chrome each close it', async ({
    page,
  }) => {
    await page.goto('/');
    const button = page.locator('header [data-menu-button]');
    const menu = page.locator('#mobile-menu');
    await button.click();
    await button.click();
    await expect(menu).toBeHidden();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await button.click();
    await page.setViewportSize({ width: 1024, height: 800 });
    await expect(menu).toBeHidden();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await page.setViewportSize({ width: 375, height: 800 });
    await button.click();
    await menu.getByRole('link', { name: 'Blog' }).click();
    await expect(page).toHaveURL(/\/blog\/$/);
  });

  test('without JavaScript the four links scroll in the bar', async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 375, height: 800 },
    });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('header [data-menu-button]')).toBeHidden();
    await expect(page.locator('header nav.links a')).toHaveCount(4);
    await expect(page.locator('header nav.links a').first()).toBeVisible();
    await context.close();
  });
});

test.describe('brand photo in the nav', () => {
  const NAME = { en: 'Ryan Parker, home', vi: 'Ryan Parker, trang chủ' } as const;
  const PAGES = [
    ['/', 'en'],
    ['/vi/', 'vi'],
    ['/experiences/', 'en'],
    ['/vi/projects/', 'vi'],
    ['/blog/neovim-setup-1-zero-to-editor/', 'en'],
    ['/404.html', 'en'],
  ] as const;

  for (const [path, lang] of PAGES) {
    test(`${path}: one round photo, no visible text, links home, named in ${lang}`, async ({
      page,
    }) => {
      await page.goto(path);
      const link = page.locator('header[data-nav] .bar > a.logo');
      await expect(link).toHaveCount(1);
      await expect(link).toHaveAttribute('href', lang === 'vi' ? '/vi/' : '/');
      await expect(link).toHaveAccessibleName(NAME[lang]);
      expect(await link.evaluate((e) => (e as HTMLElement).innerText.trim())).toBe('');
      const img = link.locator('img.nav-avatar');
      await expect(img).toHaveCount(1);
      await expect(img).toHaveAttribute('alt', '');
      await expect(img).toHaveAttribute('width', '28');
      await expect(img).toHaveAttribute('height', '28');
      expect(await img.getAttribute('src')).toMatch(/^\/_astro\/avatar.*\.webp$/);
      expect(await img.getAttribute('srcset')).toMatch(/ 2x/);
      await expect
        .poll(() => img.evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth > 0))
        .toBe(true);
    });
  }

  test('geometry: 28px photo flush left in a 44px+ link, bar height unchanged, no scroll', async ({
    page,
  }) => {
    for (const [w, bar] of [
      [1440, 44],
      [390, 48],
      [320, 48],
    ]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto('/');
      const r = await page.evaluate(() => {
        const h = document.querySelector('header[data-nav]')!.getBoundingClientRect();
        const l = document.querySelector('header[data-nav] a.logo')!.getBoundingClientRect();
        const img = document.querySelector('a.logo img.nav-avatar')!;
        const i = img.getBoundingClientRect();
        const cs = getComputedStyle(img);
        return {
          bar: h.height,
          img: [i.width, i.height],
          link: [l.width, l.height],
          dLeft: Math.abs(i.left - l.left),
          dMid: Math.abs(i.top + i.height / 2 - (h.top + h.height / 2)),
          radius: cs.borderRadius,
          shadow: cs.boxShadow,
          scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      expect(r.bar, `${w} bar`).toBe(bar);
      expect(r.img, `${w} img`).toEqual([28, 28]);
      expect(r.link[0], `${w} link w`).toBeGreaterThanOrEqual(44);
      expect(r.link[1], `${w} link h`).toBeGreaterThanOrEqual(44);
      expect(r.dLeft, `${w} flush left`).toBeLessThanOrEqual(0.5);
      expect(r.dMid, `${w} centred`).toBeLessThanOrEqual(1);
      expect(r.radius, `${w}`).toBe('50%');
      expect(r.shadow, `${w}`).toBe('none');
      expect(r.scroll, `${w} scroll`).toBeLessThanOrEqual(0);
    }
  });

  test('1x screens load the 28px file, 2x screens the 56px file', async ({ browser }) => {
    for (const [dpr, px, cand] of [
      [1, 28, '1x'],
      [2, 56, '2x'],
    ] as const) {
      const context = await browser.newContext({ deviceScaleFactor: dpr });
      const page = await context.newPage();
      await page.goto('/');
      const img = page.locator('a.logo img.nav-avatar');
      await expect
        .poll(() => img.evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth > 0), {
          message: `dpr ${dpr}`,
        })
        .toBe(true);
      // naturalWidth is density-corrected, so measure the file the browser chose.
      const r = await img.evaluate(async (e: HTMLImageElement) => {
        const want = e.srcset
          .split(',')
          .map((s) => s.trim().split(' '))
          .find((c) => c[1] === (window.devicePixelRatio >= 2 ? '2x' : '1x'))![0];
        const bmp = await createImageBitmap(await (await fetch(e.currentSrc)).blob());
        return { chosen: e.currentSrc.endsWith(want), width: bmp.width };
      });
      expect(r, `dpr ${dpr} ${cand}`).toEqual({ chosen: true, width: px });
      await context.close();
    }
  });

  test('no layout shift: the box holds at 28x28 and the bar at 44px when the image is aborted', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.route('**/_astro/avatar*', (r) => r.abort());
    await page.goto('/');
    const b = await page.locator('a.logo img.nav-avatar').boundingBox();
    expect([b!.width, b!.height]).toEqual([28, 28]);
    expect((await page.locator('header[data-nav]').boundingBox())!.height).toBe(44);
  });

  test('keyline outline: light and dark', async ({ page }) => {
    await page.goto('/');
    const img = page.locator('a.logo img.nav-avatar');
    expect(await img.evaluate((e) => getComputedStyle(e).outlineColor)).toBe('rgba(0, 0, 0, 0.16)');
    const dark = await page.context().newPage();
    await dark.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await dark.goto('/');
    expect(
      await dark.locator('a.logo img.nav-avatar').evaluate((e) => getComputedStyle(e).outlineColor),
    ).toBe('rgba(255, 255, 255, 0.24)');
  });

  test('keyboard focus draws a round 2px accent ring on the photo, inside the bar', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'WebKit only shows focus-visible after real Tab stops');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.locator('header[data-nav] a.logo')).toBeFocused();
    const v = await page.evaluate(() => {
      const a = document.querySelector('header[data-nav] a.logo')!;
      const img = a.querySelector('img.nav-avatar')!;
      const ls = getComputedStyle(a);
      const is = getComputedStyle(img);
      const i = img.getBoundingClientRect();
      const h = document.querySelector('header[data-nav]')!.getBoundingClientRect();
      return {
        link: ls.outlineStyle,
        style: is.outlineStyle,
        width: is.outlineWidth,
        color: is.outlineColor,
        offset: is.outlineOffset,
        radius: is.borderRadius,
        inside: i.top - 4 >= h.top && i.bottom + 4 <= h.bottom && i.left - 4 >= h.left,
      };
    });
    expect(v).toEqual({
      link: 'none',
      style: 'solid',
      width: '2px',
      color: 'rgb(0, 83, 166)',
      offset: '2px',
      radius: '50%',
      inside: true,
    });
  });

  test('keyboard focus ring on the photo is the dark accent in dark theme', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'WebKit only shows focus-visible after real Tab stops');
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.locator('header[data-nav] a.logo')).toBeFocused();
    expect(
      await page.locator('a.logo img.nav-avatar').evaluate((e) => getComputedStyle(e).outlineColor),
    ).toBe('rgb(92, 176, 255)');
  });

  test('reduced motion: no animation or transition on the photo', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const r = await page.locator('a.logo img.nav-avatar').evaluate((e) => ({
      anim: e.getAnimations().length,
      td: getComputedStyle(e).transitionDuration,
    }));
    expect(r).toEqual({ anim: 0, td: '0s' });
  });

  test('every built page: brand link is the photo only, named per language', async ({
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'static sweep, run once');
    const pages = builtPages();
    expect(pages.length).toBeGreaterThan(50);
    for (const p of pages) {
      expect(p.html, p.path).not.toContain('hero-avatar');
      if (p.kind === 'print') {
        expect(p.html, p.path).not.toContain('nav-avatar');
        continue;
      }
      const header = p.html.match(/<header[\s\S]*?<\/header>/)?.[0] ?? '';
      const a = header.match(/<a\b[^>]*>[\s\S]*?<\/a>/)?.[0] ?? '';
      const open = a.match(/^<a\b[^>]*>/)![0];
      expect(open, p.path).toMatch(/class="[^"]*\blogo\b/);
      expect(open, p.path).toContain(`aria-label="${NAME[p.lang]}"`);
      expect(a.replace(/<[^>]*>/g, '').trim(), p.path).toBe('');
      expect(a.match(/<img\b/g), p.path).toHaveLength(1);
      const img = a.match(/<img\b[^>]*>/)![0];
      expect(img, p.path).toMatch(/\balt(=""|(?=[\s/>]))/);
      expect(img, p.path).toContain('width="28"');
      expect(img, p.path).toContain('height="28"');
      expect(img, p.path).toMatch(/src="\/_astro\/avatar[^"]*\.webp"/);
    }
  });
});

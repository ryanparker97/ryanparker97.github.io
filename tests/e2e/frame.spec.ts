import { expect, test, type Page } from '@playwright/test';

// Frame checks from spec §5.15: tokens, type scale, local nav, footer, search panel.
test.use({ reducedMotion: 'reduce' });

const INNER = [
  '/experiences/',
  '/projects/',
  '/star/',
  '/star/emr-cost-optimization/',
  '/blog/',
  '/blog/tags/',
  '/blog/tags/neovim/',
  '/blog/series/',
  '/blog/series/neovim-setup-guide/',
  '/blog/neovim-setup-1-zero-to-editor/',
];

// Every built route (the print views are not pages a visitor navigates to).
const ALL = [...INNER, '/'].flatMap((p) => [p, p === '/' ? '/vi/' : `/vi${p}`]).concat('/404.html');

test.describe('tokens and fonts', () => {
  test('font stack starts with -apple-system and no Newsreader file is requested', async ({
    page,
  }) => {
    const files: string[] = [];
    page.on('request', (r) => /\.woff2?$/.test(r.url()) && files.push(r.url()));
    await page.goto('/blog/neovim-setup-1-zero-to-editor/');
    await page.waitForLoadState('networkidle');
    const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(family.startsWith('-apple-system')).toBe(true);
    expect(files.filter((f) => /newsreader/i.test(f))).toEqual([]);
  });

  test('Inter is not preloaded', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('link[rel=preload][as=font]')).toHaveCount(0);
  });

  test('colour tokens, light default and primary pill colour', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/experiences/');
    const v = await page.evaluate(() => {
      const probe = document.createElement('a');
      probe.className = 'btn btn-primary';
      const grey = document.createElement('div');
      grey.style.cssText = 'background:var(--surface-2);color:var(--link)';
      document.body.append(probe, grey);
      const s = getComputedStyle(probe);
      return {
        bg: getComputedStyle(document.body).backgroundColor,
        surface2: getComputedStyle(grey).backgroundColor,
        link: getComputedStyle(grey).color,
        pill: s.backgroundColor,
        pillText: s.color,
        pillFont: s.fontSize,
        pillRadius: s.borderRadius,
      };
    });
    expect(v.bg).toBe('rgb(255, 255, 255)');
    expect(v.surface2).toBe('rgb(245, 245, 247)');
    expect(v.link).toBe('rgb(0, 102, 204)');
    expect(v.pill).toBe('rgb(0, 113, 227)');
    expect(v.pillText).toBe('rgb(255, 255, 255)');
    expect(v.pillFont).toBe('17px');
    expect(parseFloat(v.pillRadius)).toBeGreaterThan(100);
  });

  test('viewport meta allows zoom and covers the safe areas', async ({ page }) => {
    await page.goto('/');
    const content = await page.locator('meta[name=viewport]').getAttribute('content');
    expect(content).toBe('width=device-width, initial-scale=1, viewport-fit=cover');
  });
});

test.describe('type scale (§5.4)', () => {
  const EXPECTED: Record<string, Record<number, number>> = {
    't-hero': { 1440: 80, 900: 64, 375: 40 },
    't-unit': { 1440: 56, 900: 48, 375: 32 },
    't-section': { 1440: 48, 900: 40, 375: 32 },
    't-promo': { 1440: 40, 900: 32, 375: 32 },
    't-subhead': { 1440: 28, 900: 24, 375: 19 },
    't-body': { 1440: 17, 900: 17, 375: 17 },
  };
  for (const w of [1440, 900, 375]) {
    test(`sizes at ${w}px`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto('/');
      const sizes = await page.evaluate((classes) => {
        const out: Record<string, number> = {};
        for (const c of classes) {
          const el = document.createElement('p');
          el.className = c;
          document.body.append(el);
          out[c] = parseFloat(getComputedStyle(el).fontSize);
          el.remove();
        }
        return out;
      }, Object.keys(EXPECTED));
      for (const [c, bySize] of Object.entries(EXPECTED)) expect(sizes[c], c).toBe(bySize[w]);
    });
  }
});

test.describe('local nav on every inner page', () => {
  for (const path of INNER) {
    test(`${path}: directly under the global nav, 52px at 1440, one H1`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(path);
      const nav = (await page.locator('header[data-nav]').boundingBox())!;
      const local = (await page.locator('[data-local-nav]').boundingBox())!;
      expect(nav.height).toBe(44);
      expect(local.height).toBe(52);
      expect(Math.round(local.y)).toBe(44);
      await expect(page.locator('h1')).toHaveCount(1);
      // The global nav scrolls away; the local nav sticks at the very top.
      await page.evaluate(() => window.scrollTo(0, 800));
      // Short pages cannot scroll the full 800px: the bar sits at 44 minus whatever did scroll.
      const scrolled = await page.evaluate(() => window.scrollY);
      expect(Math.round((await page.locator('[data-local-nav]').boundingBox())!.y)).toBe(
        Math.max(0, 44 - Math.round(scrolled)),
      );
      const gone = (await page.locator('header[data-nav]').boundingBox())!;
      if (scrolled >= 44) expect(gone.y + gone.height).toBeLessThanOrEqual(0);
    });

    test(`${path}: dropdown at 375px opens, lists its links, closes on Esc and outside tap`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(path);
      const local = page.locator('[data-local-nav]');
      expect((await local.boundingBox())!.height).toBe(48);
      const summary = local.locator('summary');
      const count = await local.locator('.links a').count();
      if (count === 0) {
        // Single-link pages: no chevron, a chevron text link on the right.
        await expect(summary).toHaveCount(0);
        await expect(local.locator('.solo-link')).toBeVisible();
        return;
      }
      await summary.click();
      await expect(local.locator('.tray a')).toHaveCount(count);
      await page.keyboard.press('Escape');
      await expect(local.locator('.tray')).toBeHidden();
      await summary.click();
      await page.mouse.click(200, 700);
      await expect(local.locator('.tray')).toBeHidden();
    });
  }

  test('Projects local nav hides the kind links when there is only one kind', async ({ page }) => {
    await page.goto('/projects/');
    await expect(page.locator('.local-nav .links a[data-kind]')).toHaveCount(0);
    await expect(page.locator('.local-nav .solo-link[data-expand]')).toHaveCount(1);
  });

  test('blog nav has the RSS pill; a post shows a single chevron link', async ({ page }) => {
    await page.goto('/blog/');
    await expect(page.locator('.local-nav .pill')).toHaveText('RSS');
    await page.goto('/blog/neovim-setup-1-zero-to-editor/');
    const link = page.locator('.local-nav .solo-link');
    await expect(link).toHaveAccessibleName('All posts');
    await expect(page.locator('.local-nav summary')).toHaveCount(0);
  });

  test('the dropdown closes after a link tap and the target lands below both bars', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/experiences/');
    const local = page.locator('[data-local-nav]');
    await local.locator('summary').click();
    const link = local.locator('.tray a').first();
    const hash = (await link.getAttribute('href'))!;
    await link.click();
    await expect(local.locator('.tray')).toBeHidden();
    await page.waitForTimeout(200);
    const top = await page.locator(hash).evaluate((e) => e.getBoundingClientRect().top);
    // Only the local nav is stuck: 48px + 16px.
    expect(top).toBeGreaterThanOrEqual(64 - 1);
  });

  test('Home and 404 have no local nav', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-local-nav]')).toHaveCount(0);
    await page.goto('/404.html');
    await expect(page.locator('[data-local-nav]')).toHaveCount(0);
  });

  test('with JavaScript off the details dropdown still opens and its links work', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();
    await page.goto('/experiences/');
    await page.locator('[data-local-nav] summary').click();
    const link = page.locator('[data-local-nav] .tray a').first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/#/);
    await context.close();
  });
});

test.describe('footer', () => {
  test('home has no breadcrumbs; inner pages show RP › section › page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('footer .crumbs')).toHaveCount(0);
    await page.goto('/blog/neovim-setup-1-zero-to-editor/');
    const crumbs = page.locator('footer .crumbs li');
    await expect(crumbs).toHaveCount(3);
    await expect(crumbs.nth(0)).toContainText('RP');
    await expect(crumbs.nth(1)).toContainText('Blog');
    await expect(crumbs.nth(2)).toContainText('Neovim setup guide, Part 1');
  });

  test('four directory columns at 1440 and accordions at 375', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/projects/');
    await expect(page.locator('footer .cols .col')).toHaveCount(4);
    await expect(page.locator('footer .accordions')).toBeHidden();
    const xs = await page
      .locator('footer .col')
      .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().x)));
    expect(new Set(xs).size).toBe(4);
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator('footer .cols')).toBeHidden();
    const acc = page.locator('footer .accordions details');
    await expect(acc).toHaveCount(4);
    await acc.first().locator('summary').click();
    await expect(acc.first()).toHaveJSProperty('open', true);
    await expect(acc.first().getByRole('link', { name: 'Experiences' })).toBeVisible();
  });

  test('is identical on every page: copyright, language link, no social icons', async ({
    page,
  }) => {
    for (const path of ['/', '/experiences/', '/blog/']) {
      await page.goto(path);
      const legal = page.locator('footer .legal');
      await expect(legal).toContainText(`Copyright © ${new Date().getFullYear()} Ryan Parker.`);
      await expect(legal.getByRole('link', { name: 'Built with Astro' })).toHaveAttribute(
        'href',
        'https://astro.build',
      );
      await expect(legal.getByRole('link', { name: 'Tiếng Việt' })).toHaveAttribute(
        'href',
        /\/vi\//,
      );
      await expect(page.locator('footer .icon-btn')).toHaveCount(0);
    }
  });

  test('directory has Explore, Writing, Connect and Resources with their links', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const cols = page.locator('footer .col');
    await expect(cols.locator('.col-title')).toHaveText([
      'Explore',
      'Writing',
      'Connect',
      'Resources',
    ]);
    await expect(cols.nth(3).getByRole('link', { name: 'Download PDF' })).toHaveAttribute(
      'href',
      '/cv.pdf',
    );
  });
});

test.describe('search panel', () => {
  test('Quick links show before typing; results replace them; Esc restores focus', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/projects/');
    const trigger = page.locator('header').getByRole('button', { name: 'Search' });
    await trigger.focus();
    await page.keyboard.press('ControlOrMeta+k');
    const panel = page.locator('#search-dialog');
    await expect(panel).toBeVisible();
    await expect(page.locator('#search-input')).toBeFocused();
    const quick = page.locator('#search-quick a');
    await expect(quick).toHaveCount(4);
    await expect(quick.nth(0)).toHaveText('Experiences');
    await expect(quick.nth(2)).toHaveText('Download PDF');
    // The panel drops from under the bar, full width, over a curtain.
    const box = (await panel.boundingBox())!;
    expect(Math.round(box.y)).toBe(44);
    expect(Math.round(box.width)).toBe(1440);
    await expect(page.locator('#search-curtain')).toBeVisible();
    const size = await page.locator('#search-input').evaluate((e) => getComputedStyle(e).fontSize);
    expect(size).toBe('24px');
    await page.locator('#search-input').fill('lazy-loaded plugins');
    await expect(page.locator('#search-quick')).toBeHidden();
    await expect(page.locator('.hit').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(page.locator('#search-curtain')).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('the ✕ and a click on the curtain close it; the input is 28px at 375px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const trigger = page.locator('header').getByRole('button', { name: 'Search' });
    await trigger.click();
    await expect(page.locator('#search-dialog')).toBeVisible();
    const size = await page.locator('#search-input').evaluate((e) => getComputedStyle(e).fontSize);
    expect(size).toBe('28px');
    await page.getByRole('button', { name: 'Close search' }).click();
    await expect(page.locator('#search-dialog')).toBeHidden();
    await trigger.click();
    await page.mouse.click(180, 790);
    await expect(page.locator('#search-dialog')).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});

async function overflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

test.describe('small screens', () => {
  for (const w of [320, 375, 430]) {
    test(`no horizontal scroll on every route in EN and VI at ${w}px`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width: w, height: 800 });
      for (const path of ALL) {
        await page.goto(path);
        expect(await overflow(page), `${path} at ${w}`).toBeLessThanOrEqual(0);
      }
    });

    test(`44px targets in the bars and footer at ${w}px`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 800 });
      for (const path of ['/', '/experiences/', '/projects/', '/star/', '/blog/', '/vi/blog/']) {
        await page.goto(path);
        await page.evaluate(() =>
          document.querySelectorAll('footer details').forEach((d) => d.setAttribute('open', '')),
        );
        const small = await page.evaluate(() =>
          [
            ...document.querySelectorAll<HTMLElement>(
              'header[data-nav] a, header[data-nav] button, [data-local-nav] summary, [data-local-nav] .pill, [data-local-nav] .solo-link, footer a, footer button, footer summary',
            ),
          ]
            .filter((el) => el.getClientRects().length > 0)
            .map((el) => {
              const r = el.getBoundingClientRect();
              // The small pill keeps a transparent 44px tap area via ::before.
              const pill = el.classList.contains('btn-sm');
              const before = pill ? getComputedStyle(el, '::before') : null;
              return {
                label: (el.textContent ?? '').trim().slice(0, 20),
                w: before ? parseFloat(before.width) : r.width,
                h: before ? parseFloat(before.height) : r.height,
              };
            })
            .filter((r) => r.h < 43.5 || r.w < 43.5),
        );
        expect(small, `${path} at ${w}`).toEqual([]);
      }
    });
  }
});

test.describe('chrome alignment, transparency and the sticky bar (§5.2, §5.7, §5.8)', () => {
  for (const [w, x] of [
    [1440, 230],
    [900, 22],
  ] as const) {
    test(`the first glyphs of nav, local nav, footer and search share one left edge at ${w}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto('/experiences/');
      await page.keyboard.press('ControlOrMeta+k');
      await expect(page.locator('#search-dialog')).toBeVisible();
      const lefts = await page.evaluate(() => {
        const left = (sel: string) => document.querySelector(sel)!.getBoundingClientRect().left;
        return [
          left('[data-nav] .brand'),
          left('[data-local-nav] .title'),
          left('footer .crumbs li:first-child a'),
          left('#search-dialog .field svg'),
        ];
      });
      for (const l of lefts) expect(Math.abs(l - x), `${lefts}`).toBeLessThanOrEqual(1);
    });
  }

  test('both bars are transparent at rest and glass after scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/experiences/');
    const supported = await page.evaluate(() => CSS.supports('animation-timeline: scroll()'));
    test.skip(!supported, 'without scroll timelines the bars stay glass (fallback)');
    const bg = (sel: string) =>
      page.evaluate((s) => getComputedStyle(document.querySelector(s)!).backgroundColor, sel);
    const keyline = () =>
      page.evaluate(() =>
        parseFloat(getComputedStyle(document.querySelector('[data-local-nav]')!, '::after').width),
      );
    expect(await bg('[data-nav]')).toBe('rgba(0, 0, 0, 0)');
    expect(await bg('[data-local-nav]')).toBe('rgba(0, 0, 0, 0)');
    expect(await keyline()).toBe(980);
    await page.evaluate(() => window.scrollTo(0, 200));
    await expect.poll(() => bg('[data-local-nav]')).toBe('rgba(250, 250, 252, 0.8)');
    expect(await keyline()).toBe(1440);
    await page.goto('/');
    expect(await bg('[data-nav]')).toBe('rgba(0, 0, 0, 0)');
    await page.evaluate(() => window.scrollTo(0, 200));
    await expect.poll(() => bg('[data-nav]')).toBe('rgba(250, 250, 252, 0.8)');
  });

  test('bar focus rings are full strength and inset', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'WebKit only shows focus-visible after real Tab stops');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.getByRole('link', { name: 'Projects' }).first().focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    const v = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const s = getComputedStyle(el);
      return { opacity: s.opacity, offset: s.outlineOffset, top: el.getBoundingClientRect().top };
    });
    expect(v.opacity).toBe('1');
    expect(v.offset).toBe('-7px');
    // The ring is inset by 7px, so it stays on screen.
    expect(v.top + 7).toBeGreaterThanOrEqual(0);
  });

  test('the small pill is 24px tall with a 44px tap area that touches no neighbour', async ({
    page,
  }) => {
    for (const w of [1440, 375]) {
      await page.setViewportSize({ width: w, height: 800 });
      await page.goto('/blog/');
      const v = await page.evaluate((w) => {
        const pill = document.querySelector<HTMLElement>('.local-nav .pill')!;
        const r = pill.getBoundingClientRect();
        const b = getComputedStyle(pill, '::before');
        const tapLeft = r.left + r.width / 2 - Math.max(parseFloat(b.width), 44) / 2;
        const prev = document.querySelector<HTMLElement>(
          w > 833 ? '.local-nav .links li:last-child a' : '.local-nav summary',
        )!;
        return {
          h: r.height,
          bw: parseFloat(b.width),
          bh: parseFloat(b.height),
          gap: tapLeft - prev.getBoundingClientRect().right,
        };
      }, w);
      expect(v.h, `${w}`).toBe(24);
      expect(v.bw).toBeGreaterThanOrEqual(44);
      expect(v.bh).toBeGreaterThanOrEqual(44);
      expect(v.gap, `${w}`).toBeGreaterThanOrEqual(8);
    }
  });

  test('Experiences links use short names and fit at 1440 and 900', async ({ page }) => {
    for (const w of [1440, 900]) {
      await page.setViewportSize({ width: w, height: 800 });
      await page.goto('/experiences/');
      await expect(page.locator('.local-nav .links a')).toHaveText([
        'FPT Software 2026',
        'Security Bank',
        'TymeX',
        'FPT Software 2020',
        'Hitachi Vantara',
      ]);
      const fits = await page
        .locator('.local-nav .links')
        .evaluate((e) => e.scrollWidth <= e.clientWidth);
      expect(fits, `${w}`).toBe(true);
    }
  });

  test('an anchor lands below the stuck local nav (--sticky-h)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/experiences/');
    const link = page.locator('.local-nav .links a').nth(2);
    const hash = (await link.getAttribute('href'))!;
    await link.click();
    await page.waitForTimeout(300);
    const top = await page.locator(hash).evaluate((e) => e.getBoundingClientRect().top);
    expect(top).toBeGreaterThanOrEqual(52 + 16 - 1);
  });
});

test.describe('local nav dropdown at 375px (§5.8)', () => {
  test('one solid surface, 14px 44px rows, a bar for the current item, chevron by the pill', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/blog/');
    const local = page.locator('[data-local-nav]');
    await local.locator('summary').click();
    await expect(local.locator('.tray a').first()).toBeVisible();
    await page.waitForTimeout(700);
    const v = await page.evaluate(() => {
      const nav = document.querySelector<HTMLElement>('[data-local-nav]')!;
      const a = nav.querySelector<HTMLElement>('.tray a')!;
      const cur = nav.querySelector<HTMLElement>('.tray a[aria-current]')!;
      const chev = nav.querySelector('summary .chev')!.getBoundingClientRect();
      const pill = nav.querySelector('.pill')!.getBoundingClientRect();
      return {
        bar: getComputedStyle(nav).backgroundColor,
        tray: getComputedStyle(nav.querySelector('.tray')!).backgroundColor,
        size: getComputedStyle(a).fontSize,
        h: a.getBoundingClientRect().height,
        after: getComputedStyle(cur, '::after').content,
        before: getComputedStyle(cur, '::before').width,
        gap: pill.left - chev.right,
      };
    });
    expect(v.bar).toBe('rgb(250, 250, 252)');
    expect(v.tray).toBe('rgb(250, 250, 252)');
    expect(v.size).toBe('14px');
    expect(v.h).toBeGreaterThanOrEqual(44);
    expect(v.after).not.toContain('✓');
    expect(parseFloat(v.before)).toBeCloseTo(1.2, 1);
    expect(v.gap).toBeLessThanOrEqual(24);
  });
});

test.describe('mobile menu rows at 375px (§5.7)', () => {
  test('rows share one style, are at least 44px, and the button is flush right', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/projects/');
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.waitForTimeout(800);
    const v = await page.evaluate(() => {
      const menu = document.getElementById('mobile-menu')!;
      const rows = [...menu.querySelectorAll<HTMLElement>('.main a, .more a, .more button')];
      const more = [...menu.querySelectorAll<HTMLElement>('.more a, .more button')];
      const btn = document.querySelector('[data-menu-button]')!.getBoundingClientRect();
      const first = menu.querySelector('.main a')!;
      const cur = menu.querySelector('.main a[aria-current]')!;
      return {
        short: rows.filter((r) => r.getBoundingClientRect().height < 44).map((r) => r.textContent),
        more: more.map((r) => {
          const s = getComputedStyle(r);
          return [s.color, s.fontSize, s.fontWeight];
        }),
        firstTop: first.getBoundingClientRect().top,
        mainColor: getComputedStyle(first).color,
        curColor: getComputedStyle(cur).color,
        btn: [btn.right, btn.width, btn.height],
      };
    });
    expect(v.short).toEqual([]);
    expect(new Set(v.more.map((m) => m.join('|'))).size).toBe(1);
    expect(v.more[0][1]).toBe('17px');
    expect(v.more[0][2]).toBe('600');
    expect(v.firstTop).toBeLessThanOrEqual(56);
    expect(v.mainColor).toBe('rgb(51, 51, 54)');
    expect(v.curColor).toBe('rgb(51, 51, 54)');
    expect(v.btn).toEqual([375, 48, 48]);
  });
});

test.describe('footer density (§5.9)', () => {
  test('desktop footer uses Apple density at 1440', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/projects/');
    const v = await page.evaluate(() => {
      const tops = [...document.querySelectorAll('footer .col:first-child li')].map(
        (e) => e.getBoundingClientRect().top,
      );
      const crumbs = document.querySelector('footer .crumbs')!;
      return {
        crumbsH: crumbs.getBoundingClientRect().height,
        crumbsBorder: getComputedStyle(crumbs).borderBottomWidth,
        pitch: tops[1] - tops[0],
        phone: [...document.querySelectorAll('footer .col a')].map((a) => a.textContent),
      };
    });
    expect(v.crumbsH).toBeLessThanOrEqual(58);
    expect(v.crumbsBorder).toBe('0px');
    expect(v.pitch).toBeGreaterThanOrEqual(24);
    expect(v.pitch).toBeLessThanOrEqual(28);
    expect(v.phone).toContain('Phone');
    await expect(page.locator('footer .reach a')).toHaveCount(2);
  });

  test('compact footer: no doubled hairlines, none between a title and its links', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/projects/');
    const first = page.locator('footer .accordions details').first();
    await first.locator('summary').click();
    const v = await page.evaluate(() => ({
      summary: getComputedStyle(document.querySelector('footer summary')!).borderBottomWidth,
      weight: getComputedStyle(document.querySelector('footer summary')!).fontWeight,
      legal: getComputedStyle(document.querySelector('footer .legal')!).borderTopWidth,
      reach: getComputedStyle(document.querySelector('footer .reach')!).borderBottomWidth,
    }));
    expect(v).toEqual({ summary: '0px', weight: '400', legal: '0px', reach: '0px' });
  });
});

test.describe('search panel frame (§5.7)', () => {
  test('is a modal: 20 Tab presses never leave it; no ring, shadow or native clear button', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/projects/');
    await page.keyboard.press('ControlOrMeta+k');
    await expect(page.locator('#search-dialog')).toHaveAttribute('aria-modal', 'true');
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press(i % 3 === 2 ? 'Shift+Tab' : 'Tab');
      const inside = await page.evaluate(() => !!document.activeElement?.closest('#search-dialog'));
      expect(inside, `press ${i}`).toBe(true);
    }
    const v = await page.evaluate(() => {
      const q = document.querySelector<HTMLElement>('#search-quick a')!;
      return {
        outline: getComputedStyle(document.querySelector('#search-dialog .field')!).outlineStyle,
        shadow: getComputedStyle(document.getElementById('search-dialog')!).boxShadow,
        navBg: getComputedStyle(document.querySelector('[data-nav]')!).backgroundColor,
        size: getComputedStyle(q).fontSize,
        arrow: getComputedStyle(q, '::before').content,
        close: getComputedStyle(document.querySelector('#search-dialog .close')!).display,
        cancel: getComputedStyle(
          document.getElementById('search-input')!,
          '::-webkit-search-cancel-button',
        ).display,
      };
    });
    expect(v.outline).toBe('none');
    expect(v.shadow).toBe('none');
    expect(v.navBg).toBe('rgb(250, 250, 252)');
    expect(v.size).toBe('12px');
    expect(v.arrow).toContain('→');
    expect(v.close).toBe('none');
  });

  test('quick links are 17px and at least 44px tall at 375px; the ✕ shows; results use plurals', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/projects/');
    await page.getByRole('button', { name: 'Search' }).first().click();
    const q = page.locator('#search-quick a').first();
    expect(await q.evaluate((e) => getComputedStyle(e).fontSize)).toBe('17px');
    expect((await q.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expect(page.locator('#search-dialog .close')).toBeVisible();
    await page.locator('#search-input').fill('lazy-loaded plugins');
    const status = page.locator('#search-status');
    await expect(page.locator('.hit').first()).toBeVisible();
    const text = (await status.textContent())!.trim();
    expect(text).toMatch(/^(1 result|[2-9] results)$/);
  });
});

test.describe('blocks and in-page targets', () => {
  test('a card inside a surface band takes the opposite colour', async ({ page }) => {
    await page.goto('/');
    const v = await page.evaluate(() => {
      const band = document.createElement('section');
      band.className = 'section section--surface';
      band.innerHTML = '<div class="card">x</div>';
      const plain = document.createElement('section');
      plain.className = 'section';
      plain.innerHTML = '<div class="card">y</div>';
      document.body.append(band, plain);
      return [
        getComputedStyle(band.querySelector('.card')!).backgroundColor,
        getComputedStyle(plain.querySelector('.card')!).backgroundColor,
      ];
    });
    expect(v).toEqual(['rgb(255, 255, 255)', 'rgb(245, 245, 247)']);
  });

  test('chips never break mid-word and keep one line', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/projects/');
    const v = await page.evaluate(() => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = 'Personal';
      chip.style.width = '40px';
      document.body.append(chip);
      const s = getComputedStyle(chip);
      return [s.whiteSpace, getComputedStyle(document.body).overflowWrap, chip.offsetHeight];
    });
    expect(v).toEqual(['nowrap', 'normal', 28]);
  });

  test('in-page links and buttons are at least 44px tall at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    for (const path of [
      '/star/',
      '/star/emr-cost-optimization/',
      '/blog/',
      '/blog/tags/',
      '/blog/series/',
      '/blog/neovim-setup-1-zero-to-editor/',
    ]) {
      await page.goto(path);
      const small = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('main a, main button, main summary')]
          .filter((e) => e.getClientRects().length && !e.closest('.prose, .code-block'))
          .map((e) => {
            const r = e.getBoundingClientRect();
            const chip = e.classList.contains('chip');
            const h = chip ? parseFloat(getComputedStyle(e, '::before').height) : r.height;
            return { t: (e.textContent ?? '').trim().slice(0, 24), h };
          })
          .filter((x) => x.h < 43.5),
      );
      expect(small, path).toEqual([]);
    }
  });
});

test.describe('Part A regressions (M11 review r2)', () => {
  for (const [w, h, how] of [
    [1440, 900, 'escape'],
    [1440, 900, 'curtain'],
    [375, 800, 'escape'],
  ] as const) {
    test(`search keeps the scroll position on close (${w}, ${how})`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto('/experiences/');
      await page.evaluate(() => window.scrollTo(0, 1200));
      await page.keyboard.press('Control+k');
      await expect(page.locator('#search-dialog')).toBeVisible();
      if (how === 'escape') await page.keyboard.press('Escape');
      else await page.locator('#search-curtain').click({ position: { x: 5, y: 700 } });
      await expect(page.locator('#search-dialog')).toBeHidden();
      const y = await page.evaluate(() => scrollY);
      expect(Math.abs(y - 1200)).toBeLessThanOrEqual(1);
      expect(
        await page.evaluate(() => document.activeElement?.hasAttribute('data-search-open')),
      ).toBe(true);
    });
  }

  test('menu keeps the scroll position on close (375)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/experiences/');
    await page.evaluate(() => window.scrollTo(0, 1200));
    const button = page.locator('[data-menu-button]');
    await button.dispatchEvent('click');
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(Math.abs((await page.evaluate(() => scrollY)) - 1200)).toBeLessThanOrEqual(1);
    expect(
      await page.evaluate(() => document.activeElement?.hasAttribute('data-menu-button')),
    ).toBe(true);
  });

  for (const [path, text] of [
    ['/', 'More ways to reach me: email me or find me on LinkedIn.'],
    ['/vi/', 'Các cách khác để liên hệ: gửi email cho tôi hoặc tìm tôi trên LinkedIn.'],
  ] as const) {
    test(`footer reach line has spaces (${path})`, async ({ page }) => {
      await page.goto(path);
      const t = (await page.locator('.site-footer .reach').textContent())!.replace(/\s+/g, ' ');
      expect(t.trim()).toBe(text);
    });
  }

  test('footer breadcrumb links are 44px wide at 375', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/vi/star/emr-cost-optimization/');
    const w = await page.evaluate(() =>
      [...document.querySelectorAll('.crumbs a')].map((a) => a.getBoundingClientRect().width),
    );
    for (const x of w) expect(x).toBeGreaterThanOrEqual(43.5);
  });

  test('local nav stays transparent until stuck', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/experiences/');
    const supported = await page.evaluate(() => CSS.supports('animation-timeline: scroll()'));
    test.skip(!supported, 'fallback is always glass');
    await page.evaluate(() => window.scrollTo(0, 20));
    const bg = await page.evaluate(
      () => getComputedStyle(document.querySelector('[data-local-nav]')!).backgroundColor,
    );
    expect(bg).toBe('rgba(0, 0, 0, 0)');
  });
});

import { readdirSync, readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { NEXT_FORBIDDEN, norm, withoutAllowed, withoutTitleSuffix } from './next-words';

const DIR = 'src/content/experience/en';
const files = readdirSync(DIR).filter((f) => f.endsWith('.md'));
const ROLES = files.length;
// Newest first: same rule as sortRoles.
const order = files
  .map((f) => ({
    slug: f.replace(/\.md$/, ''),
    start: /^start: '?([\d-]+)/m.exec(readFileSync(`${DIR}/${f}`, 'utf8'))![1],
  }))
  .sort((a, b) => b.start.localeCompare(a.start));

// Profile facts shown in the identity column, read from the source like the roles above.
const profile = (lang: 'en' | 'vi') => {
  const src = readFileSync(`src/content/profile/${lang}/index.md`, 'utf8');
  return {
    email: /^email: '(.+)'$/m.exec(src)![1],
    location: /^location: '(.+)'$/m.exec(src)![1],
    languages: [...src.matchAll(/- language: '(.+)'\n\s+proficiency: '(.+)'/g)].map(
      (m) => `${m[1]} — ${m[2]}`,
    ),
  };
};
const EMAIL = profile('en').email;

// Sections in page order inside the split (identity column, then the board).
const ORDER = ['top', 'board'];
// Board tiles in page order; their ids land below the sticky nav.
const TILES = [
  'years',
  'team',
  'project',
  'result',
  'skills',
  'tools',
  'career',
  'goals',
  'writing',
  'more',
];

// Layout is measured without the reveal animation (its translate would skew the numbers).
test.use({ reducedMotion: 'reduce' });

const size = (width: number, height = 900) => ({ width, height });

test.describe('Home structure', () => {
  test('sections run in order and the footnotes close the page', async ({ page }) => {
    await page.goto('/');
    const ids = await page
      .locator('main > .home-split > section[id]')
      .evaluateAll((els) => els.map((e) => e.id));
    expect(ids).toEqual(ORDER);
    const tail = await page.evaluate(() => {
      const split = document.querySelector('main > .home-split')!;
      const next = split.nextElementSibling;
      return {
        next: next ? `${next.tagName}.${next.className}` : null,
        last: next === document.querySelector('main')!.lastElementChild,
      };
    });
    expect(tail.next).toMatch(/^SECTION\..*\bfootnotes\b/);
    expect(tail.last).toBe(true);
  });

  test('one H1 is the gradient headline; the hero has no eyebrow', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Senior Data Engineer & Team Lead');
    await expect(page.locator('.text-gradient')).toHaveCount(1);
    await expect(page.locator('h1 .text-gradient')).toHaveCount(1);
    await expect(page.locator('#top h1')).toHaveCount(1);
    await expect(page.locator('#top .t-eyebrow')).toHaveCount(0);
  });

  test('exactly one .text-gradient, the hero role, in both languages', async ({ page }) => {
    for (const path of ['/', '/vi/']) {
      await page.goto(path);
      await expect(page.locator('.text-gradient')).toHaveCount(1);
      await expect(page.locator('#top .text-gradient')).toHaveText(
        'Senior Data Engineer & Team Lead',
      );
    }
  });

  test('heading levels start at H1 and never skip a level', async ({ page }) => {
    await page.goto('/');
    const levels = await page
      .locator('main :is(h1,h2,h3,h4,h5,h6)')
      .evaluateAll((els) => els.map((e) => Number(e.tagName[1])));
    expect(levels[0]).toBe(1);
    levels.slice(1).forEach((level, i) => expect(level).toBeLessThanOrEqual(levels[i] + 1));
    expect(levels.filter((l) => l === 1)).toHaveLength(1);
  });

  test('no section has more than two actions', async ({ page }) => {
    await page.setViewportSize(size(1440));
    await page.goto('/');
    for (const s of await page.locator('main section').all())
      expect(
        await s.locator('.actions > a').count(),
        (await s.getAttribute('id')) ?? '',
      ).toBeLessThanOrEqual(2);
    expect(await page.locator('#top .actions > a').count()).toBe(2);
  });

  test('hero and board share the page background; every tile is the grey surface', async ({
    page,
  }) => {
    await page.goto('/');
    const bg = (sel: string) =>
      page.locator(sel).evaluate((e) => getComputedStyle(e).backgroundColor);
    const [top, board] = await Promise.all(ORDER.map((id) => bg(`#${id}`)));
    await expect(page.locator('.section--dark')).toHaveCount(0);
    expect(top).toBe('rgb(255, 255, 255)');
    expect(board).toBe(top);
    for (const id of TILES) {
      const tile = await bg(`#${id}`);
      expect(tile, id).toBe('rgb(245, 245, 247)');
      expect(tile, id).not.toBe(board);
    }
  });

  test('hero and board share the page background and tiles differ from it in the dark theme', async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await page.goto('/');
    const bg = (sel: string) =>
      page.locator(sel).evaluate((e) => getComputedStyle(e).backgroundColor);
    const [top, board] = await Promise.all(ORDER.map((id) => bg(`#${id}`)));
    expect(board).toBe(top);
    for (const id of TILES) expect(await bg(`#${id}`), id).not.toBe(board);
  });

  test('hero: subhead and two pills, no stat strip', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('#top');
    await expect(hero.locator('.t-subhead')).toHaveText(
      'Data pipelines and cloud platforms for banking markets.',
    );
    await expect(hero.locator('a[href*="/experiences/"]')).toHaveCount(0);
    await expect(hero.getByRole('link', { name: 'Email me' })).toHaveAttribute(
      'href',
      `mailto:${EMAIL}`,
    );
    const pdf = hero.getByRole('link', { name: 'Download CV' });
    await expect(pdf).toHaveAttribute('download', 'Ryan-Parker-CV.pdf');
    await expect(pdf).toHaveAttribute('href', '/cv.pdf');
    await expect(hero.locator('.stat-strip')).toHaveCount(0);
    await expect(hero.locator('.stat-value')).toHaveCount(0);
  });

  test('local nav: Overview, Experiences, Skills and the PDF pill', async ({ page }) => {
    await page.setViewportSize(size(1440));
    await page.goto('/');
    await expect(page.locator('[data-local-nav]')).toHaveCount(1);
    const links = page.locator('.local-nav .links a');
    await expect(links).toHaveText(['Overview', 'Experiences', 'Skills']);
    await expect(links.first()).toHaveAttribute('aria-current', /.+/);
    await expect(page.locator('.local-nav .pill')).toHaveAttribute('href', '/cv.pdf');
    await page.goto('/vi/');
    const hrefs = await page
      .locator('.local-nav .links a')
      .evaluateAll((els) => els.map((e) => e.getAttribute('href')!));
    expect(hrefs.length).toBe(3);
    for (const h of hrefs) expect(h.startsWith('/vi/')).toBe(true);
  });

  test('peek rule: at least 64px of the next band shows at 1440x900 and 375x812', async ({
    page,
  }) => {
    const rect = (sel: string) =>
      page.locator(sel).evaluate((e) => {
        const r = e.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom };
      });
    // At 1440 the board sits beside the column: its first tile peeks, and the H1 and pills show.
    await page.setViewportSize(size(1440, 900));
    await page.goto('/');
    expect((await rect('#years')).top, '1440x900 #years').toBeLessThanOrEqual(900 - 64);
    expect((await rect('#top h1')).bottom, '1440x900 h1').toBeLessThanOrEqual(900);
    expect((await rect('#top .actions')).bottom, '1440x900 pills').toBeLessThanOrEqual(900);
    // At 375 the board is the next band below the identity block.
    await page.setViewportSize(size(375, 812));
    await page.goto('/');
    expect((await rect('#board')).top, '375x812 #board').toBeLessThanOrEqual(812 - 64);
  });

  test('sections touch: no gap between neighbouring bands', async ({ page }) => {
    for (const w of [1440, 768, 375]) {
      await page.setViewportSize(size(w));
      await page.goto('/');
      const m = await page.evaluate(() => {
        const r = (s: string) => {
          const b = document.querySelector(s)!.getBoundingClientRect();
          return { top: b.top, bottom: b.bottom };
        };
        return {
          top: r('#top'),
          board: r('#board'),
          split: r('main > .home-split'),
          notes: r('main > .footnotes'),
        };
      });
      // Below L the identity block sits on the board; at L the two start level, side by side.
      if (w >= 1069) expect(Math.abs(m.top.top - m.board.top), `@${w} tops`).toBeLessThanOrEqual(1);
      else expect(Math.abs(m.board.top - m.top.bottom), `@${w} #top/#board`).toBeLessThanOrEqual(1);
      expect(Math.abs(m.notes.top - m.split.bottom), `@${w} split/footnotes`).toBeLessThanOrEqual(
        1,
      );
    }
  });

  test('hero H1 is not animated and the intro runs on the other parts', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'no-preference' });
    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const r = await page.evaluate(() => {
      const h1 = document.querySelector('h1')!;
      const own = document
        .getAnimations()
        .filter((a) => (a.effect as KeyframeEffect).target === h1).length;
      const intro = document
        .getAnimations()
        .filter((a) => (a.effect as KeyframeEffect).target?.classList?.contains('intro')).length;
      return { own, intro };
    });
    expect(r.own).toBe(0);
    expect(r.intro).toBeGreaterThan(0);
    await context.close();
  });

  test('no horizontal scroll at 320, 768 and 1440 and no long lockup at 375x812', async ({
    page,
  }) => {
    for (const w of [320, 768, 1440]) {
      await page.setViewportSize(size(w, 700));
      await page.goto('/');
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `@${w}`,
      ).toBeLessThanOrEqual(w);
    }
    await page.setViewportSize(size(375, 812));
    await expect(page.locator('.lockup--long')).toHaveCount(0);
  });

  test('with JavaScript off every section is visible', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: size(1440) });
    const page = await context.newPage();
    await page.goto('/');
    for (const s of await page.locator('main section').all()) await expect(s).toBeVisible();
    await context.close();
  });
});

test.describe('Home design system', () => {
  // Spec-sanctioned hairlines: the career and post rows draw 1px rules between them (list
  // dividers on the items of an `ol.rows`, not card, tile or section borders).
  const HAIRLINES = ['rows'];

  test('no pastel or gradient backgrounds on large elements, no shadows or borders', async ({
    page,
  }) => {
    await page.goto('/');
    const bad = await page.locator('main *').evaluateAll(
      (els, allowed) =>
        els
          .filter((e) => {
            const r = e.getBoundingClientRect();
            const s = getComputedStyle(e);
            const big = r.width > 64 && r.height > 64;
            const clip = (s as unknown as { webkitBackgroundClip: string }).webkitBackgroundClip;
            const hairline =
              e.tagName === 'LI' &&
              !!e.parentElement &&
              allowed.some((c) => e.parentElement!.classList.contains(c)) &&
              s.borderTopWidth === '1px';
            return (
              (big && s.backgroundImage !== 'none' && clip !== 'text') ||
              s.boxShadow !== 'none' ||
              (s.borderTopWidth !== '0px' &&
                s.borderTopStyle !== 'none' &&
                !e.classList.contains('btn') &&
                !hairline)
            );
          })
          .map((e) => e.className),
      HAIRLINES,
    );
    expect(bad).toEqual([]);
  });

  test('reveal: 900ms fade, 30px rise, 150ms stagger', async ({ browser }) => {
    const context = await browser.newContext({
      reducedMotion: 'no-preference',
      viewport: size(1440),
    });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/\breveal\b/);
    const item = page.locator('#more h2');
    // The hidden state fades in over 900ms from the visible server render; wait for it to settle.
    await expect.poll(() => item.evaluate((e) => getComputedStyle(e).opacity)).toBe('0');
    const css = await item.evaluate((e) => {
      const s = getComputedStyle(e);
      return { dur: s.transitionDuration, delay: s.transitionDelay, t: s.translate };
    });
    expect(css.dur).toBe('0.9s, 0.7s');
    expect(css.delay).toBe('0.15s');
    expect(css.t).toContain('30');
    await item.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 200));
    await expect
      .poll(() => item.evaluate((e) => getComputedStyle(e).opacity), { timeout: 2500 })
      .toBe('1');
    await context.close();
  });
});

test('heading ids land below the nav with the eyebrow visible', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  for (const id of TILES) {
    await page.goto(`/#${id}-title`);
    await page.waitForTimeout(150);
    const m = await page.evaluate((i) => {
      const s = document.getElementById(i)!;
      const eb = s.querySelector('.t-eyebrow');
      return {
        eyebrow: eb ? eb.getBoundingClientRect().top : null,
        h2: s.querySelector('h2')!.getBoundingClientRect().top,
      };
    }, id);
    expect(m.h2, id).toBeGreaterThanOrEqual(52);
    if (m.eyebrow !== null) expect(m.eyebrow, id).toBeGreaterThanOrEqual(52);
  }
});

test.describe('Deep links and metadata', () => {
  test('has Person JSON-LD on Home and Experiences and Open Graph tags', async ({ page }) => {
    for (const path of ['/', '/experiences/']) {
      await page.goto(path);
      const ld = JSON.parse(
        (await page.locator('script[type="application/ld+json"]').first().textContent()) ?? '{}',
      );
      expect(ld['@type']).toBe('Person');
      expect(ld.telephone).toBe('+84963378831');
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
        'content',
        'https://ryanparker97.github.io/og-default.png',
      );
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
        'content',
        'summary_large_image',
      );
    }
  });

  test('blog posts have BlogPosting JSON-LD', async ({ page }) => {
    await page.goto('/blog/neovim-setup-1-zero-to-editor/');
    const ld = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').first().textContent()) ?? '{}',
    );
    expect(ld['@type']).toBe('BlogPosting');
    expect(ld.inLanguage).toBe('en');
  });

  test('Vietnamese home mirrors the layout, is translated and has no banner', async ({ page }) => {
    await page.setViewportSize(size(1440));
    await page.goto('/vi/');
    await expect(page.getByRole('note')).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Senior Data Engineer & Team Lead');
    await expect(page.getByRole('link', { name: 'Tải CV' }).first()).toHaveAttribute(
      'href',
      '/vi/cv.pdf',
    );
    await expect(page.locator('link[hreflang="vi"]')).toHaveCount(1);
  });
});

test.describe('Home career tile', () => {
  test('career tile: one link per role in order, each ≥ 44px tall at 1440 and 375', async ({
    page,
  }) => {
    for (const width of [1440, 375]) {
      await page.setViewportSize(size(width, 900));
      await page.goto('/');
      const links = page.locator('#career [data-career] > li a.row-link');
      await expect(links, `@${width}`).toHaveCount(ROLES);
      const hrefs = await links.evaluateAll((els) => els.map((e) => e.getAttribute('href')));
      expect(hrefs, `@${width}`).toEqual(order.map((o) => `/experiences/${o.slug}/`));
      await expect(links.first().locator('.row-main')).toHaveText('FPT Software');
      await expect(links.first().locator('.row-sub')).toContainText('2026–now');
      for (const h of await links.evaluateAll((els) =>
        els.map((e) => e.getBoundingClientRect().height),
      ))
        expect(h, `@${width}`).toBeGreaterThanOrEqual(44);
      await expect(
        page.locator('#career').getByRole('link', { name: 'See every role' }),
      ).toHaveAttribute('href', '/experiences/');
    }
  });
});

test.describe('Home board', () => {
  test('tiles run in order', async ({ page }) => {
    await page.goto('/');
    const ids = await page
      .locator('#board .bento > li[id]')
      .evaluateAll((els) => els.map((e) => e.id));
    expect(ids).toEqual(TILES);
  });

  for (const [w, h] of [
    [1440, 900],
    [1069, 900],
  ])
    test(`board at ${w}: number tiles share one top and width; project is wider than skills; #more spans the board`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto('/');
      const box = async (sel: string) => (await page.locator(sel).boundingBox())!;
      const [years, team, result, project, skills, more, board, top, split] = await Promise.all([
        box('#years'),
        box('#team'),
        box('#result'),
        box('#project'),
        box('#skills'),
        box('#more'),
        box('#board .bento'),
        box('#top'),
        box('main > .home-split'),
      ]);
      // Half tiles pair up: years | team, then result | skills.
      expect(Math.abs(team.y - years.y)).toBeLessThanOrEqual(1);
      expect(team.x).toBeGreaterThan(years.x);
      expect(Math.abs(team.width - years.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(result.width - years.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(skills.y - result.y)).toBeLessThanOrEqual(1);
      expect(skills.x).toBeGreaterThan(result.x);
      expect(Math.abs(skills.width - result.width)).toBeLessThanOrEqual(1);
      expect(project.width).toBeGreaterThan(skills.width);
      // Full tiles span the board.
      for (const id of ['project', 'tools', 'career', 'goals', 'writing', 'more']) {
        const b = await box(`#${id}`);
        expect(Math.abs(b.x - board.x), id).toBeLessThanOrEqual(1);
        expect(Math.abs(b.width - board.width), id).toBeLessThanOrEqual(1);
      }
      expect(Math.abs(more.width - board.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(more.x - board.x)).toBeLessThanOrEqual(1);
      // The split: identity column on the left edge, board on the right edge, a gap between.
      expect(Math.abs(board.x + board.width - (split.x + split.width))).toBeLessThanOrEqual(1);
      expect(Math.abs(top.x - split.x)).toBeLessThanOrEqual(1);
      expect(board.x).toBeGreaterThanOrEqual(top.x + top.width + 20);
    });

  test('board at 390x844: one tile per row, same left and width, no horizontal scroll', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ['/', '/vi/']) {
      await page.goto(path);
      const boxes = await page.locator('#board .bento > li').evaluateAll((els) =>
        els.map((e) => {
          const r = e.getBoundingClientRect();
          return { x: r.left, w: r.width, top: r.top, bottom: r.bottom };
        }),
      );
      expect(boxes).toHaveLength(TILES.length);
      for (const b of boxes) {
        expect(Math.abs(b.x - boxes[0].x), path).toBeLessThanOrEqual(1);
        expect(Math.abs(b.w - boxes[0].w), path).toBeLessThanOrEqual(1);
      }
      boxes
        .slice(1)
        .forEach((b, i) => expect(b.top, path).toBeGreaterThanOrEqual(boxes[i].bottom - 1));
      // The identity block sits above the board, its H1 on the tiles' left edge.
      const id = await page.evaluate(() => ({
        bottom: document.querySelector('#top')!.getBoundingClientRect().bottom,
        board: document.querySelector('#board')!.getBoundingClientRect().top,
        h1: document.querySelector('#top h1')!.getBoundingClientRect().left,
      }));
      expect(id.bottom, path).toBeLessThanOrEqual(id.board + 1);
      expect(Math.abs(id.h1 - boxes[0].x), path).toBeLessThanOrEqual(1);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        path,
      ).toBeLessThanOrEqual(390);
    }
  });

  test('headings are one H1 then H2s only, one H2 per tile', async ({ page }) => {
    for (const path of ['/', '/vi/']) {
      await page.goto(path);
      const levels = await page
        .locator('main :is(h1,h2,h3,h4,h5,h6)')
        .evaluateAll((els) => els.map((e) => Number(e.tagName[1])));
      expect(levels[0], path).toBe(1);
      for (const l of levels.slice(1)) expect(l, path).toBe(2);
      for (const id of TILES)
        await expect(page.locator(`#${id} h2`), `${path} #${id}`).toHaveCount(1);
    }
  });

  test('number values use --hl-1..2 in light and dark', async ({ browser }) => {
    const want = {
      light: ['rgb(11, 93, 82)', 'rgb(140, 56, 0)'],
      dark: ['rgb(100, 210, 180)', 'rgb(255, 162, 77)'],
    };
    for (const scheme of ['light', 'dark'] as const) {
      const context = await browser.newContext({
        reducedMotion: 'reduce',
        viewport: size(1440),
        colorScheme: scheme,
      });
      const page = await context.newPage();
      await page.addInitScript((t) => localStorage.setItem('theme', t), scheme);
      await page.goto('/');
      const vals = page.locator('#board .num .stat-value');
      await expect(vals).toHaveCount(2);
      for (let i = 0; i < 2; i++)
        await expect(vals.nth(i), scheme).toHaveCSS('color', want[scheme][i]);
      await context.close();
    }
  });

  test('number tiles: two digit values with footnote refs that resolve', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#top .stat-strip')).toHaveCount(0);
    const vals = page.locator('#board .stat-value');
    await expect(vals).toHaveCount(2);
    for (const v of await vals.allTextContents()) expect(v).toMatch(/\d/);
    const hrefs = await page
      .locator('#board .fn-ref a')
      .evaluateAll((els) => els.map((e) => e.getAttribute('href')!));
    expect(hrefs).toEqual(['#fn-1', '#fn-2']);
    for (const [i, h] of hrefs.entries()) {
      await expect(page.locator(h)).toHaveCount(1);
      await expect(page.locator(`${h} .fn-back`)).toHaveAttribute('href', `#fnref-${i + 1}`);
    }
    await expect(page.locator('#fn-3, #fnref-3')).toHaveCount(0);
    const ids = await page.locator('[id]').evaluateAll((els) => els.map((e) => e.id));
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    await expect(page.locator('.stat--super')).toHaveCount(0);
  });

  test('Vietnamese board: career and writing headings', async ({ page }) => {
    await page.goto('/vi/');
    await expect(page.locator('#career h2')).toHaveText('Kinh nghiệm.');
    await expect(page.locator('#writing h2')).toHaveText('Ghi chú về dữ liệu và công cụ.');
    await expect(page.locator('#board')).toHaveAttribute('aria-label', 'Tóm tắt nhanh');
  });

  test('no closer look or STAR chapter on Home; the tiles link to the project and the stories', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('#closer-look, #story, #highlights, .gallery')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Take a closer look.' })).toHaveCount(0);
    await expect(page.locator('#result a')).toHaveCount(1);
    await expect(page.locator('#result a')).toHaveAttribute('href', '/star/');
    await expect(page.locator('#result').getByRole('link', { name: 'STAR stories' })).toHaveCount(
      1,
    );
    await expect(page.locator('#result .stat-value, #result .fn-ref')).toHaveCount(0);
    const titles = readdirSync('src/content/star/en')
      .filter((f) => f.endsWith('.md'))
      .map((f) => /^title: '(.+)'$/m.exec(readFileSync(`src/content/star/en/${f}`, 'utf8'))![1]);
    const resultText = await page.locator('#result').innerText();
    for (const t of titles) expect(resultText).not.toContain(t);
    const starHrefs = await page
      .locator('main a[href^="/star/"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect([...new Set(starHrefs)]).toEqual(['/star/']);
    await page.goto('/vi/');
    await expect(page.locator('#result a')).toHaveCount(1);
    await expect(page.locator('#result a')).toHaveAttribute('href', '/vi/star/');
    await expect(
      page.locator('#result').getByRole('link', { name: 'Câu chuyện STAR' }),
    ).toHaveCount(1);
    await page.goto('/');
    await expect(page.locator('#project a[href="/projects/agentic-coding-workflow/"]')).toHaveCount(
      1,
    );
    await expect(page.locator('#skills a[href="/skills/"]')).toHaveCount(1);
  });

  test('every destination Home linked before is still in main, in English and Vietnamese', async ({
    page,
  }) => {
    const BLOG = (lang: string) => `src/content/blog/${lang}`;
    for (const [path, prefix, lang] of [
      ['/', '', 'en'],
      ['/vi/', '/vi', 'vi'],
    ] as const) {
      const posts = readdirSync(BLOG(lang))
        .filter(
          (f) =>
            /\.mdx?$/.test(f) && !/^draft: true/m.test(readFileSync(`${BLOG(lang)}/${f}`, 'utf8')),
        )
        .map((f) => f.replace(/\.mdx?$/, ''));
      const want = [
        '/experiences/',
        '/cv.pdf',
        '/star/',
        '/projects/agentic-coding-workflow/',
        '/skills/',
        '/blog/',
        '/experiences/#next',
        ...order.map((o) => `/experiences/${o.slug}/`),
        ...posts.map((s) => `/blog/${s}/`),
      ].map((h) => `${prefix}${h}`);
      await page.goto(path);
      const hrefs = await page
        .locator('main a')
        .evaluateAll((els) => els.map((e) => e.getAttribute('href')!));
      for (const w of want) expect(hrefs, `${path} ${w}`).toContain(w);
      expect(
        hrefs.some((h) => h.startsWith('mailto:')),
        path,
      ).toBe(true);
      expect(
        hrefs.some((h) => h.startsWith('https://www.linkedin.com/')),
        path,
      ).toBe(true);
    }
  });

  test('reduced motion: every reveal item is shown without a transform', async ({ page }) => {
    await page.goto('/');
    const items = await page.locator('main [data-reveal]').evaluateAll((els) =>
      els.map((e) => {
        const s = getComputedStyle(e);
        return {
          id: e.id || e.tagName,
          opacity: s.opacity,
          transform: s.transform,
          translate: s.translate,
        };
      }),
    );
    expect(items.length).toBeGreaterThan(0);
    for (const i of items) {
      expect(i.opacity, i.id).toBe('1');
      expect(i.transform, i.id).toBe('none');
      expect(i.translate, i.id).toBe('none');
    }
  });

  test('keyboard: Tab from the hero reaches a board link and its tile shows a focus outline', async ({
    page,
    browserName,
  }) => {
    await page.setViewportSize(size(1440));
    await page.goto('/');
    await page.locator('#top .actions a').last().focus();
    if (browserName === 'webkit') {
      // WebKit does not Tab to links by default (same carve-out as experiences.spec.ts): focus
      // the first board link directly; the outline is the part under test.
      await page.keyboard.press('Shift');
      await page.locator('#board .bento-title a').first().focus();
    } else {
      let inBoard = false;
      for (let i = 0; i < 5 && !inBoard; i++) {
        await page.keyboard.press('Tab');
        inBoard = await page.evaluate(() => !!document.activeElement?.closest('#board'));
      }
      expect(inBoard).toBe(true);
    }
    expect(await page.evaluate(() => !!document.activeElement?.closest('#board'))).toBe(true);
    const ring = await page.evaluate(() => {
      const tile = document.activeElement!.closest('.bento-tile')!;
      const s = getComputedStyle(tile);
      return { style: s.outlineStyle, width: s.outlineWidth };
    });
    expect(ring.style).not.toBe('none');
    expect(ring.width).not.toBe('0px');
  });
});

test.describe('Home writing tile', () => {
  const BLOG = 'src/content/blog/en';
  const published = readdirSync(BLOG).filter(
    (f) => /\.mdx?$/.test(f) && !/^draft: true/m.test(readFileSync(`${BLOG}/${f}`, 'utf8')),
  );

  test('one link per published post, newest first, each ≥ 44px, plus All posts', async ({
    page,
  }) => {
    await page.goto('/');
    const links = page.locator('#writing [data-posts] a.row-link');
    await expect(links).toHaveCount(published.length);
    await expect(links.first()).toHaveAttribute('href', '/blog/git-config-multiple-identities/');
    await expect(links.first().locator('.row-kicker')).toHaveText('Article');
    for (const h of await links.evaluateAll((els) =>
      els.map((e) => e.getBoundingClientRect().height),
    ))
      expect(h).toBeGreaterThanOrEqual(44);
    await expect(page.locator('#writing').getByRole('link', { name: 'All posts' })).toHaveAttribute(
      'href',
      '/blog/',
    );
    await expect(page.locator('#writing .chip-mint')).toHaveCount(0);
  });
});

const ALT = (lang: string) =>
  JSON.parse(readFileSync(`src/i18n/${lang}.json`, 'utf8')) as Record<string, string>;
const ART = [
  ['years', 'exp.hl.yearsAlt'],
  ['team', 'exp.hl.teamAlt'],
  ['result', 'exp.hl.storiesAlt'],
  ['skills', 'exp.hl.skillsAlt'],
  ['career', 'exp.hl.careerAlt'],
] as const;

test.describe('Home tile diagrams', () => {
  test('five tiles carry a labelled 2:1 diagram outside the link; five diagrams on the board', async ({
    page,
  }) => {
    for (const [path, lang] of [
      ['/', 'en'],
      ['/vi/', 'vi'],
    ] as const) {
      const dict = ALT(lang);
      for (const w of [1440, 390]) {
        await page.setViewportSize(size(w));
        await page.goto(path);
        for (const [id, key] of ART) {
          const where = `${path} ${w} #${id}`;
          const tile = page.locator(`#${id}`);
          const svg = tile.locator('.tile-art svg[role="img"]');
          await expect(svg, where).toHaveCount(1);
          await expect(svg, where).toHaveAttribute('width', '640');
          await expect(svg, where).toHaveAttribute('height', '320');
          await expect(svg, where).toHaveAttribute('aria-label', dict[key]);
          const m = await tile.evaluate((el) => {
            const s = el.querySelector('.tile-art svg')!;
            const r = s.getBoundingClientRect();
            const t = el.getBoundingClientRect();
            const h2 = el.querySelector('h2')!;
            return {
              ratio: r.width / r.height,
              inside:
                r.left >= t.left - 1 &&
                r.right <= t.right + 1 &&
                r.top >= t.top - 1 &&
                r.bottom <= t.bottom + 1,
              inLink: s.closest('a') !== null,
              h2s: el.querySelectorAll('h2').length,
              named: el.getAttribute('aria-labelledby') === h2.id && h2.id !== '',
            };
          });
          expect(m.ratio, where).toBeGreaterThan(1.97);
          expect(m.ratio, where).toBeLessThan(2.03);
          expect(m.inside, where).toBe(true);
          expect(m.inLink, where).toBe(false);
          expect(m.h2s, where).toBe(1);
          expect(m.named, where).toBe(true);
        }
        await expect(page.locator('#board svg[role="img"]'), `${path} ${w}`).toHaveCount(5);
      }
    }
  });

  test('tile diagrams follow the theme', async ({ page }) => {
    await page.setViewportSize(size(1440));
    await page.goto('/');
    for (const [theme, fill] of [
      ['light', 'rgb(0, 80, 159)'],
      ['dark', 'rgb(92, 176, 255)'],
    ] as const) {
      await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme);
      for (const [id] of ART)
        await expect(
          page.locator(`#${id} .tile-art [style*="fill:var(--link)"]`).first(),
          `${theme} #${id}`,
        ).toHaveCSS('fill', fill);
    }
  });

  test('tile diagrams cause no layout shift', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'layout-shift entries are Chromium only');
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number; __shifts: Node[][] };
      w.__cls = 0;
      w.__shifts = [];
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as unknown as {
          value: number;
          hadRecentInput: boolean;
          sources?: { node?: Node }[];
        }[]) {
          if (e.hadRecentInput) continue;
          w.__cls += e.value;
          w.__shifts.push((e.sources ?? []).map((s) => s.node).filter((n): n is Node => !!n));
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    for (const sz of [
      { width: 1440, height: 900 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(sz);
      await page.goto('/');
      await page.locator('#skills').scrollIntoViewIfNeeded();
      await page.waitForTimeout(1500); // observation window for late shifts, not a readiness wait
      const r = await page.evaluate(() => {
        const w = window as unknown as { __cls: number; __shifts: Node[][] };
        return {
          cls: w.__cls,
          fromArt: w.__shifts.flat().filter((n) => !!n.parentElement?.closest('.tile-art')).length,
        };
      });
      expect(r.cls).toBeLessThan(0.05);
      expect(r.fromArt).toBe(0);
    }
  });
});

test.describe('Home identity portrait', () => {
  for (const [path, label] of [
    ['/', 'en'],
    ['/vi/', 'vi'],
  ] as const) {
    test(`${label}: one portrait named by the profile, no logo slot and no avatar class`, async ({
      page,
    }) => {
      await page.goto(path);
      await expect(page.locator('#top')).toBeVisible();
      await expect(page.locator('#top .hero-logo')).toHaveCount(0);
      await expect(page.locator('#top img')).toHaveCount(1);
      const img = page.locator('#top img.home-portrait');
      await expect(img).toHaveCount(1);
      await expect(img).toHaveAttribute('alt', 'Ryan Parker');
      await expect(img).toHaveAttribute('width', '240');
      await expect(img).toHaveAttribute('height', '240');
      await expect(img).toHaveAttribute('src', /^\/_astro\/avatar[^/]*\.webp$/);
      await expect(img).toHaveAttribute('srcset', / 2x$/);
      await expect
        .poll(() => img.evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth > 0))
        .toBe(true);
      await expect(page.locator('.hero-avatar')).toHaveCount(0);
    });
  }

  test('other heroes are unchanged: no avatar in any hero, role pages keep their logo', async ({
    page,
  }) => {
    for (const path of ['/experiences/', '/skills/', '/vi/experiences/']) {
      await page.goto(path);
      await expect(page.locator('.hero-avatar'), path).toHaveCount(0);
    }
    await page.goto(`/experiences/${order[0].slug}/`);
    await expect(page.locator('.hero-logo')).toHaveCount(1);
    await expect(page.locator('.hero-logo .hero-avatar')).toHaveCount(0);
  });
});

// Split Home (spec §4.1): identity column, its pinning, and the Tools and Next tiles.
const LANGS = [
  { path: '/', prefix: '', lang: 'en' },
  { path: '/vi/', prefix: '/vi', lang: 'vi' },
] as const;
// Offset of a pinned column under the stuck bars: --sticky-h (52px local nav) + 32px.
const STICK_TOP = 84;

const settle = (page: Page) =>
  page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );

const nbsp = (s: string) => s.replace(/ /g, ' ').trim();

/** A page in its own context; `reducedMotion` defaults to no-preference so the column can pin. */
const openIn = async (
  browser: Browser,
  path: string,
  opts: { width: number; height: number; reduce?: boolean; js?: boolean },
) => {
  const context = await browser.newContext({
    reducedMotion: opts.reduce ? 'reduce' : 'no-preference',
    javaScriptEnabled: opts.js ?? true,
    viewport: size(opts.width, opts.height),
  });
  const page = await context.newPage();
  await page.goto(path);
  return { context, page };
};

/**
 * The column, the board and the footnotes band, as plain rects, after a scroll to `y`. With JS off
 * no animation frame runs, so `frames: false` reads the (synchronous) layout without waiting.
 */
const layoutAt = async (page: Page, y: number | 'end', frames = true) => {
  await page.evaluate(
    (to) => window.scrollTo(0, to === 'end' ? document.documentElement.scrollHeight : to),
    y,
  );
  if (frames) await settle(page);
  return page.evaluate(() => {
    const r = (s: string) => {
      const b = document.querySelector(s)!.getBoundingClientRect();
      return { top: b.top, bottom: b.bottom, left: b.left, right: b.right };
    };
    const split = document.querySelector('main > .home-split')!;
    return {
      position: getComputedStyle(document.querySelector('#top')!).position,
      grid: getComputedStyle(split).display,
      pad: parseFloat(getComputedStyle(split).paddingBottom),
      top: r('#top'),
      board: r('#board'),
      years: r('#years'),
      notes: r('main > .footnotes'),
    };
  });
};

test.describe('Home identity column', () => {
  for (const { path, lang } of LANGS) {
    test(`${lang}: portrait, H1, subline, CV and Email pills, then the facts list`, async ({
      page,
    }) => {
      const dict = ALT(lang);
      await page.goto(path);
      const order = await page.evaluate(() => {
        const top = document.querySelector('#top')!;
        const parts = ['img.home-portrait', 'h1', '.t-subhead', '.actions', 'ul[data-facts]'];
        const els = parts.map((s) => top.querySelector(s));
        return {
          found: els.map((e) => e !== null),
          inOrder: els
            .slice(1)
            .every(
              (e, i) =>
                !!e &&
                !!els[i] &&
                !!(els[i]!.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING),
            ),
        };
      });
      expect(order.found).toEqual([true, true, true, true, true]);
      expect(order.inOrder).toBe(true);
      await expect(page.locator('#top h1')).toHaveText('Senior Data Engineer & Team Lead');
      await expect(page.locator('#top .t-subhead')).toHaveText(dict['home.hero.subline']);
      await expect(page.locator('#top .actions > a')).toHaveText([
        dict['common.download'],
        dict['home.contact.email'],
      ]);
      await expect(page.locator('#top .actions > a').first()).toHaveAttribute(
        'href',
        `${lang === 'vi' ? '/vi' : ''}/cv.pdf`,
      );
      await expect(page.locator('#top .actions > a').last()).toHaveAttribute(
        'href',
        `mailto:${profile(lang).email}`,
      );
    });

    test(`${lang}: location and languages are a list in the column, not in #more`, async ({
      page,
    }) => {
      const p = profile(lang);
      await page.goto(path);
      const facts = page.locator('#top ul[data-facts]');
      await expect(facts).toHaveCount(1);
      await expect(facts).toHaveAttribute('role', 'list');
      await expect(facts.locator('> li')).toHaveText([p.location, ...p.languages]);
      const more = await page.locator('#more').innerText();
      expect(more).not.toContain(p.location);
      for (const l of p.languages) {
        expect(more).not.toContain(l);
        expect(more).not.toContain(l.split(' — ')[0]);
      }
      await expect(page.locator('#more [data-real-name]')).toHaveCount(1);
    });
  }
});

test.describe('Home identity column pins at L', () => {
  // The height gate itself (sticky at and above it, static at GATE − 1, the column fits, the pills
  // stay in view, at 1069, 1280 and 1440 in EN and VI with two fonts) is the fit matrix in
  // home-split.spec.ts; these tests cover the scroll past the board and the owner's gate.
  for (const { path, lang } of LANGS) {
    test(`${lang}: at 1440x900 the column stays in view beside the board while it scrolls`, async ({
      browser,
    }) => {
      const { context, page } = await openIn(browser, path, { width: 1440, height: 900 });
      const m = await layoutAt(page, 1500);
      expect(m.position).toBe('sticky');
      expect(Math.abs(m.top.top - STICK_TOP)).toBeLessThanOrEqual(1);
      expect(m.top.bottom).toBeLessThanOrEqual(900);
      expect(m.years.bottom).toBeLessThan(0);
      expect(m.top.right).toBeLessThanOrEqual(m.board.left);
      const end = await layoutAt(page, 'end');
      expect(end.top.bottom).toBeLessThanOrEqual(end.notes.top + 1);
      await context.close();
    });
  }

  for (const [w, h] of [
    [1440, 900],
    [1280, 800],
    [1069, 768],
  ])
    for (const { path, lang } of LANGS)
      test(`${lang}: at the page end ${w}x${h} the column releases with a gap above the footnotes`, async ({
        browser,
      }) => {
        const { context, page } = await openIn(browser, path, { width: w, height: h });
        const end = await layoutAt(page, 'end');
        expect(end.position).toBe('sticky');
        expect(end.pad).toBeGreaterThan(0);
        // The column stops at the board's end; the split's bottom padding is the gap.
        expect(end.top.bottom).toBeLessThanOrEqual(end.board.bottom + 1);
        expect(end.notes.top - end.top.bottom).toBeGreaterThanOrEqual(end.pad - 1);
        expect(end.notes.top).toBeLessThan(h);
        await context.close();
      });
});

test.describe("Home identity column: owner's gate", () => {
  // Below the height gate (case c) is the GATE − 1 row of every fit test in home-split.spec.ts.
  for (const [name, opts] of [
    ['reduced motion', { reduce: true }],
    ['JavaScript off', { js: false }],
  ] as const)
    test(`${name}: the split stays and the column scrolls with the page at 1440x900`, async ({
      browser,
    }) => {
      const { context, page } = await openIn(browser, '/', { width: 1440, height: 900, ...opts });
      const m = await layoutAt(page, 1500, !('js' in opts));
      expect(m.position).toBe('static');
      expect(m.top.top).toBeLessThan(0);
      expect(m.grid).toBe('grid');
      expect(m.top.right).toBeLessThanOrEqual(m.board.left);
      await context.close();
    });

  for (const [w, h] of [
    [1068, 900],
    [390, 844],
  ])
    test(`below L at ${w}x${h}: static, stacked above the board`, async ({ browser }) => {
      const { context, page } = await openIn(browser, '/', { width: w, height: h });
      const m = await layoutAt(page, 0);
      expect(m.position).toBe('static');
      expect(m.top.bottom).toBeLessThanOrEqual(m.board.top + 1);
      expect(m.grid).not.toBe('grid');
      await context.close();
    });
});

async function gotoThemed(page: Page, path: string, theme: 'light' | 'dark') {
  await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}

test.describe('Home goals tile', () => {
  for (const { path, prefix, lang } of LANGS) {
    const exp = `${prefix}/experiences/`;
    test(`${lang}: the two goals of the Next group, one link to ${exp}#next`, async ({ page }) => {
      const dict = ALT(lang);
      await page.goto(exp);
      const eyebrows = (await page.locator('#next .group-card__eyebrow').allTextContents()).map(
        nbsp,
      );
      const titles = (await page.locator('#next .group-card h3').allTextContents()).map(nbsp);
      expect(titles).toHaveLength(2);
      await page.goto(path);
      const goals = page.locator('#goals');
      await expect(goals.locator('h2')).toHaveText(dict['exp.next.title']);
      await expect(goals.locator('h2')).toHaveText(lang === 'vi' ? 'Tiếp theo.' : 'Next.');
      expect((await goals.locator('.goals > li .t-eyebrow').allTextContents()).map(nbsp)).toEqual(
        eyebrows,
      );
      expect((await goals.locator('.goals > li .goal-title').allTextContents()).map(nbsp)).toEqual(
        titles,
      );
      for (const [i, year] of ['2029', '2031'].entries()) expect(eyebrows[i]).toContain(year);
      const link = goals.locator('a');
      await expect(link).toHaveCount(1);
      await expect(link).toHaveAttribute('href', `${exp}#next`);
      await expect(link).toHaveAccessibleName(dict['home.next.link']);
      const fields = [
        ...(await goals.locator('.goals > li .t-eyebrow').allInnerTexts()).map(withoutAllowed),
        ...(await goals.locator('.goals > li .goal-title').allInnerTexts()).map(withoutAllowed),
        ...(await goals.locator('h2').allInnerTexts()).map(norm),
        ...(await goals.locator('a').allInnerTexts()).map(norm),
        ...(
          await goals
            .locator('a')
            .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''))
        ).map(withoutTitleSuffix),
      ];
      for (const s of fields) for (const re of NEXT_FORBIDDEN) expect(s).not.toMatch(re);
      await link.click();
      await expect(page).toHaveURL(new RegExp(`${exp}#next$`));
      await expect(page.locator('#next')).toHaveCount(1);
      await expect(page.locator('#next')).toBeInViewport();
    });

    test(`${lang}: the goals share a row at 1440 and stack at 390`, async ({ page }) => {
      for (const [w, same] of [
        [1440, true],
        [390, false],
      ] as const) {
        await page.setViewportSize(size(w));
        await page.goto(path);
        const tops = await page
          .locator('#goals .goals > li')
          .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
        expect(tops, `@${w}`).toHaveLength(2);
        if (same) expect(tops[0], `@${w}`).toBe(tops[1]);
        else expect(tops[1], `@${w}`).toBeGreaterThan(tops[0]);
      }
    });

    for (const theme of ['light', 'dark'] as const)
      test(`${lang}: axe finds no violations in #goals (${theme})`, async ({ page }) => {
        await gotoThemed(page, path, theme);
        const { violations } = await new AxeBuilder({ page }).include('#goals').analyze();
        expect(violations.map((v) => v.id)).toEqual([]);
      });
  }
});

// The 15 locked brand rows (tests/unit/tool-icons.test.ts BRAND_ROWS) and their marks.
const TOOLS = [
  ['Python', 'logos:python'],
  ['PySpark', 'apache-spark'],
  ['Apache Airflow', 'logos:airflow-icon'],
  ['DBT', 'logos:dbt-icon'],
  ['Databricks', 'logos:databricks-icon'],
  ['Talend', 'talend'],
  ['AWS', 'logos:aws'],
  ['Azure', 'logos:microsoft-azure'],
  ['Git', 'logos:git-icon'],
  ['GitLab CI/CD', 'logos:gitlab-icon'],
  ['Docker', 'logos:docker-icon'],
  ['Kubernetes', 'logos:kubernetes'],
  ['Datadog', 'logos:datadog-icon'],
  ['Java', 'logos:java'],
  ['PostgreSQL', 'logos:postgresql'],
];
const PLATED = ['Python', 'Apache Airflow', 'AWS', 'Azure', 'Datadog', 'PostgreSQL'];

test.describe('Home tools tile', () => {
  for (const { path, prefix, lang } of LANGS) {
    test(`${lang}: 15 brand marks in order, hidden from AT, the disclaimer once, See all skills`, async ({
      page,
    }) => {
      const dict = ALT(lang);
      await page.goto(path);
      const tools = page.locator('#tools');
      const rows = await tools
        .locator('.tools > li')
        .evaluateAll((els) =>
          els.map((li) => [
            li.querySelector('span')?.textContent?.trim(),
            li.querySelector('svg')?.getAttribute('data-icon'),
          ]),
        );
      expect(rows).toEqual(TOOLS);
      await expect(tools.locator('svg')).toHaveCount(TOOLS.length);
      await expect(tools.locator('svg.tool-icon[aria-hidden="true"]')).toHaveCount(TOOLS.length);
      await expect(tools.locator('[data-icon^="lucide:"], img')).toHaveCount(0);
      await expect(tools.locator('.tools-note')).toHaveText(dict['skills.logosNote']);
      const main = await page.locator('main').innerText();
      expect(main.split(dict['skills.logosNote'])).toHaveLength(2);
      await expect(tools.locator('a')).toHaveCount(1);
      await expect(tools.getByRole('link', { name: dict['home.certs.cta'] })).toHaveAttribute(
        'href',
        `${prefix}/skills/`,
      );
    });

    test(`${lang}: dark theme plates the six low-contrast marks; light plates none`, async ({
      browser,
    }) => {
      for (const theme of ['light', 'dark'] as const) {
        const context = await browser.newContext({ reducedMotion: 'reduce' });
        const page = await context.newPage();
        await gotoThemed(page, path, theme);
        const bgs = await page
          .locator('#tools .tools > li')
          .evaluateAll((els) =>
            els.map((li) => [
              li.querySelector('span')!.textContent!.trim(),
              getComputedStyle(li.querySelector('svg')!).backgroundColor,
            ]),
          );
        expect(bgs, theme).toHaveLength(TOOLS.length);
        for (const [name, bg] of bgs)
          expect(bg, `${theme} ${name}`).toBe(
            theme === 'dark' && PLATED.includes(name) ? 'rgb(255, 255, 255)' : 'rgba(0, 0, 0, 0)',
          );
        await context.close();
      }
    });

    for (const theme of ['light', 'dark'] as const)
      test(`${lang}: axe finds no violations in #tools (${theme})`, async ({ page }) => {
        await gotoThemed(page, path, theme);
        const { violations } = await new AxeBuilder({ page }).include('#tools').analyze();
        expect(violations.map((v) => v.id)).toEqual([]);
      });
  }
});

test.describe('Home split on small screens', () => {
  for (const { path, lang } of LANGS)
    for (const w of [390, 320])
      test(`${lang} at ${w}: no sideways scroll and every column, tools and goals item inside its box at 100% and 200% text`, async ({
        page,
      }) => {
        await page.setViewportSize(size(w, 800));
        await page.goto(path);
        const read = () =>
          page.evaluate(() => {
            const out: string[] = [];
            for (const [sel, boxSel] of [
              ['#top > *, #top .actions > a, #top [data-facts] > li', '#top'],
              ['#tools li', '#tools'],
              ['#goals li', '#goals'],
            ]) {
              const box = document.querySelector(boxSel)!.getBoundingClientRect();
              document.querySelectorAll(sel).forEach((e, i) => {
                const r = e.getBoundingClientRect();
                if (r.left < box.left - 1 || r.right > box.right + 1) out.push(`${sel} [${i}]`);
              });
            }
            const fs = (s: string) =>
              parseFloat(getComputedStyle(document.querySelector(s)!).fontSize);
            return {
              sw: document.documentElement.scrollWidth,
              iw: window.innerWidth,
              out,
              goal: fs('#goals .goal-title'),
              tool: fs('#tools .tool span'),
            };
          });
        const base = await read();
        expect(base.sw, '100%').toBeLessThanOrEqual(base.iw);
        expect(base.out, '100%').toEqual([]);
        await page.addStyleTag({ content: 'html{font-size:200%!important}' });
        await settle(page);
        const big = await read();
        expect(big.sw, '200%').toBeLessThanOrEqual(big.iw);
        expect(big.out, '200%').toEqual([]);
        // rem text: doubling the root size doubles the goal titles and the tool names.
        expect(big.goal).toBeCloseTo(base.goal * 2, 1);
        expect(big.tool).toBeCloseTo(base.tool * 2, 1);
      });
});

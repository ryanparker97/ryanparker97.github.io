import { expect, test, type Page } from '@playwright/test';

const POST = '/blog/neovim-setup-1-zero-to-editor/';
const top = (page: Page, sel: string) =>
  page
    .locator(sel)
    .first()
    .evaluate((e) => e.getBoundingClientRect().top);

test.describe('Part A: review r3 fixes', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('no section header leaves an empty eyebrow or actions div (M1)', async ({ page }) => {
    for (const path of ['/', '/star/', '/experiences/', '/projects/', '/blog/', '/vi/star/']) {
      await page.goto(path);
      const empty = await page.evaluate(
        () =>
          [...document.querySelectorAll('.t-eyebrow, .lockup .actions')].filter(
            (e) => !e.textContent?.trim() && !e.querySelector('a, button, svg'),
          ).length,
      );
      expect(empty, path).toBe(0);
    }
  });

  test('the STAR chapter eyebrow is the dates, and the header sits 48px above the cards (M1)', async ({
    page,
  }) => {
    await page.goto('/star/');
    const chapter = page.locator('.chapter-star').first();
    await expect(chapter.locator('.t-eyebrow')).toHaveText(
      /^(\w{3} )?\d{4} – ((\w{3} )?\d{4}|Present)$/,
    );
    const gap = await chapter.evaluate((c) => {
      const header = c.querySelector('.section-header')!.getBoundingClientRect();
      const cards = c.querySelector('.cards')!.getBoundingClientRect();
      return cards.top - header.bottom;
    });
    expect(gap).toBeGreaterThanOrEqual(46);
    expect(gap).toBeLessThanOrEqual(50);
  });

  test('the gallery card body is cut at a word boundary (M2)', async ({ page }) => {
    await page.goto('/experiences/');
    const bodies = await page.locator('.gc-body').allInnerTexts();
    for (const b of bodies) {
      expect(b.length).toBeLessThanOrEqual(140);
      if (b.endsWith('…')) expect(b.slice(0, -1)).not.toMatch(/\s$/);
    }
    expect(bodies.join(' ')).not.toMatch(/metri…/);
  });

  for (const path of ['/star/', '/blog/tags/', '/blog/series/', '/vi/star/']) {
    test(`the footer has a top rule when the last band is grey: ${path} (M3)`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('.site-footer')).toHaveCSS('border-top-width', '1px');
    });
  }

  test('the footer has no rule when the last band is white (M3)', async ({ page }) => {
    await page.goto('/experiences/');
    await expect(page.locator('.site-footer')).toHaveCSS('border-top-width', '0px');
  });

  test('the STAR story hero is centred and the local nav title is the role (M4)', async ({
    page,
  }) => {
    await page.goto('/star/emr-cost-optimization/');
    await expect(page.locator('[data-local-nav] .title').first()).toHaveText(/Data Engineer/);
    await expect(page.locator('[data-local-nav] .title').first()).not.toContainText('Security');
    const m = await page.evaluate(() => {
      const mid = (r: DOMRect) => r.left + r.width / 2;
      const h1 = document.querySelector('h1')!;
      const bq = document.querySelector('.quote blockquote')!;
      const range = document.createRange();
      range.selectNodeContents(bq);
      const stepper = document.querySelector('.story-steps')!.getBoundingClientRect();
      return {
        h1: mid(h1.getBoundingClientRect()),
        quote: mid(range.getBoundingClientRect()),
        align: getComputedStyle(bq).textAlign,
        band: stepper.top + scrollY,
      };
    });
    expect(Math.abs(m.h1 - m.quote)).toBeLessThanOrEqual(4);
    expect(m.align).toBe('center');
    expect(m.band).toBeLessThanOrEqual(900 - 64);
  });

  test('the Home skills grid uses the wide content width (B8)', async ({ page }) => {
    await page.goto('/');
    const w = await page.locator('.skill-grid').evaluate((e) => e.getBoundingClientRect().width);
    expect(Math.round(w)).toBe(1260);
  });

  test('the post TOC lines up with the category and has a 26px pitch (B9)', async ({ page }) => {
    await page.goto(POST);
    const cat = await top(page, '.post .t-news-cat');
    const toc = await top(page, '.toc-side');
    expect(Math.abs(toc - cat)).toBeLessThanOrEqual(8);
    const tops = await page
      .locator('.toc-side li a')
      .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().top));
    expect(tops.length).toBeGreaterThan(2);
    for (let i = 1; i < tops.length; i++) expect(tops[i] - tops[i - 1]).toBeCloseTo(26, 0);
    const first = await page
      .locator('.toc-side li a')
      .first()
      .evaluate((e) => e.getBoundingClientRect().top);
    expect(first).toBeLessThan(400);
  });

  test('the post subhead is 24/500 in --text, 20px under the H1 (R7)', async ({ page }) => {
    await page.goto(POST);
    const s = await page.evaluate(() => {
      const sub = document.querySelector('.t-article-sub')!;
      const h1 = document.querySelector('.t-article-title')!;
      const cs = getComputedStyle(sub);
      const probe = document.createElement('i');
      probe.style.color = 'var(--text)';
      document.body.append(probe);
      const text = getComputedStyle(probe).color;
      probe.remove();
      return {
        weight: cs.fontWeight,
        size: cs.fontSize,
        lh: cs.lineHeight,
        color: cs.color === text,
        gap: sub.getBoundingClientRect().top - h1.getBoundingClientRect().bottom,
      };
    });
    expect(s.weight).toBe('500');
    expect(s.size).toBe('24px');
    expect(s.lh).toBe('28px');
    expect(s.color).toBe(true);
    expect(Math.round(s.gap)).toBe(20);
  });

  test('series chips are neutral, and the feature meta has a space before the dot (B7)', async ({
    page,
  }) => {
    await page.goto('/blog/');
    await expect(page.locator('#feature .chip-mint')).toHaveCount(0);
    await expect(page.locator('#feature .fmeta')).toHaveText(/\d{4} · \d+ min read/);
    await page.goto('/');
    await expect(page.locator('#writing .chip-mint')).toHaveCount(0);
  });

  test('"Permalink ›" has no underline at rest (B5)', async ({ page }) => {
    await page.goto('/star/');
    await expect(page.locator('.card.story .link-chevron').first()).toHaveCSS(
      'text-decoration-line',
      'none',
    );
  });

  test('successive reveal steps differ: the subhead follows the headline (minor 9)', async ({
    page,
  }) => {
    await page.goto('/experiences/');
    const steps = await page
      .locator('#more .lockup > *')
      .evaluateAll((els) => els.map((e) => (e as HTMLElement).style.getPropertyValue('--i')));
    expect(new Set(steps).size).toBe(steps.length);
  });
});

test.describe('Part A at 375', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('post details show a chevron and the meta line never starts with a dot (B10, B11)', async ({
    page,
  }) => {
    await page.goto(POST);
    for (const sel of ['.series-box summary', '.toc-narrow summary']) {
      const after = await page.locator(sel).evaluate((e) => getComputedStyle(e, '::after').content);
      expect(after, sel).not.toBe('none');
    }
    const starts = await page.locator('.meta-line').evaluate((el) => {
      const lines = new Map<number, string>();
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const text = n.textContent ?? '';
        for (let i = 0; i < text.length; i++) {
          if (/\s/.test(text[i])) continue;
          const r = document.createRange();
          r.setStart(n, i);
          r.setEnd(n, i + 1);
          const rect = r.getBoundingClientRect();
          const y = Math.round(rect.top);
          if (!lines.has(y)) lines.set(y, text[i]);
        }
      }
      return [...lines.values()];
    });
    expect(starts).not.toContain('·');
  });
});

test.describe('Part B: reveal (R1)', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });

  for (const path of ['/', '/vi/']) {
    test(`in-view content shows at once on ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForTimeout(1500);
      for (const sel of ['#experience .t-eyebrow', '#experience h2'])
        await expect(page.locator(sel)).toHaveCSS('opacity', '1');
    });
  }

  test('the 404 site index is always visible, and carries --g/--k in the HTML', async ({
    page,
  }) => {
    await page.goto('/nope-not-here/');
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);
    for (const a of await page.locator('.site-index a').all()) await expect(a).toBeVisible();
    const op = await page
      .locator('.site-index li')
      .evaluateAll((els) => els.map((e) => getComputedStyle(e).opacity));
    expect(new Set(op)).toEqual(new Set(['1']));
    const html = await (await page.request.get('/404.html')).text();
    expect(html).toMatch(/<li style="--g:0;--k:0">/);
  });

  test('a throwing reveal script removes html.reveal so nothing stays hidden', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
        constructor() {
          throw new Error('boom');
        }
      };
    });
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveClass(/\breveal\b/);
    await expect(page.locator('#skills h2')).toHaveCSS('opacity', '1');
  });
});

test.describe('Part B: Home composition (R2, R3, R5)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the hero stacks its stat strip 64px under the actions', async ({ page }) => {
    await page.goto('/');
    const gap = await page.evaluate(() => {
      const a = document.querySelector('#top .actions')!.getBoundingClientRect();
      const s = document.querySelector('#top .stat-strip')!.getBoundingClientRect();
      return s.top - a.bottom;
    });
    expect(Math.abs(gap - 64)).toBeLessThanOrEqual(2);
    expect(await top(page, '#experience')).toBeLessThanOrEqual(836);
  });

  test('Contact flows: 40px to the icons, under 500px tall', async ({ page }) => {
    await page.goto('/');
    const m = await page.evaluate(() => {
      const c = document.querySelector('#contact')!;
      const a = c.querySelector('.actions')!.getBoundingClientRect();
      const s = c.querySelector('.social')!.getBoundingClientRect();
      return { gap: s.top - a.bottom, h: c.getBoundingClientRect().height };
    });
    expect(Math.abs(m.gap - 40)).toBeLessThanOrEqual(2);
    expect(m.h).toBeLessThan(500);
  });

  test('every grid tile visual is at least 56px tall', async ({ page }) => {
    await page.goto('/');
    const hs = await page
      .locator('.grid-tile .unit__visual')
      .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
    expect(hs.length).toBeGreaterThanOrEqual(3);
    for (const h of hs) expect(h).toBeGreaterThanOrEqual(56);
  });

  test('the career rail has one row per company and bars inside the span', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#experience .rail > li')).toHaveCount(3);
    const bars = await page.locator('#experience .rail hr').evaluateAll((els) =>
      els.map((e) => ({
        s: parseFloat(getComputedStyle(e).getPropertyValue('--s')),
        w: parseFloat(getComputedStyle(e).getPropertyValue('--w')),
      })),
    );
    expect(bars.length).toBeGreaterThanOrEqual(3);
    for (const b of bars) {
      expect(b.w).toBeGreaterThan(0);
      expect(b.w).toBeLessThanOrEqual(1);
      expect(b.s + b.w).toBeLessThanOrEqual(1.001);
    }
    expect(
      await page.locator('#experience .rail').evaluate((e) => e.scrollWidth <= e.clientWidth),
    ).toBe(true);
  });

  test('centred subheads and copy are balanced (R3)', async ({ page }) => {
    for (const w of [1440, 900, 375]) {
      await page.setViewportSize({ width: w, height: 900 });
      for (const path of ['/', '/projects/', '/star/', '/blog/']) {
        await page.goto(path);
        const bad = await page.evaluate(() => {
          const out: string[] = [];
          for (const el of document.querySelectorAll<HTMLElement>(
            '.lockup:not(.lockup--start) .t-subhead, .lockup:not(.lockup--start) .t-lockup',
          )) {
            if (getComputedStyle(el).textAlign !== 'center') continue;
            const r = document.createRange();
            r.selectNodeContents(el);
            const rects = [...r.getClientRects()];
            const lines = new Map<number, number>();
            for (const q of rects) {
              const y = Math.round(q.top / 4);
              lines.set(y, Math.max(lines.get(y) ?? 0, q.right - q.left));
            }
            const widths = [...lines.values()];
            if (widths.length < 2) continue;
            // Per-line extents are fragmented by inline runs; use the union per line instead.
            const byLine = new Map<number, [number, number]>();
            for (const q of rects) {
              const y = Math.round(q.top / 4);
              const cur = byLine.get(y);
              byLine.set(
                y,
                cur ? [Math.min(cur[0], q.left), Math.max(cur[1], q.right)] : [q.left, q.right],
              );
            }
            const span = [...byLine.values()].map(([a, b]) => b - a);
            if (span[span.length - 1] < Math.max(...span) * 0.5)
              out.push(el.textContent!.slice(0, 40));
          }
          return out;
        });
        expect(bad, `${path} @${w}`).toEqual([]);
      }
    }
  });

  test('no skill item wraps inside itself', async ({ page }) => {
    for (const w of [1440, 900, 375]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto('/');
      const split = await page.locator('[data-skill-items] .nw').evaluateAll(
        (els) =>
          els.filter((e) => {
            const r = document.createRange();
            r.selectNodeContents(e);
            return new Set([...r.getClientRects()].map((q) => Math.round(q.top))).size > 1;
          }).length,
      );
      expect(split, `@${w}`).toBe(0);
    }
  });
});

test.describe('Part B: Experiences, STAR, Projects, Blog (R6, R8)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('every chapter with a card is sticky at L, with a one-line eyebrow (R6)', async ({
    page,
  }) => {
    await page.goto('/experiences/');
    const rows = await page.locator('.chapter').evaluateAll((els) =>
      els.map((c) => {
        const head = c.querySelector('.chapter-side .section-header')!.getBoundingClientRect();
        const wide = c.querySelector('.chapter-grid')!.getBoundingClientRect().width;
        const eb = c.querySelector('.t-eyebrow') as HTMLElement;
        return {
          cards: c.querySelectorAll('.hl-card').length,
          sticky: c.classList.contains('chapter--sticky'),
          ratio: head.width / wide,
          lines: eb.getBoundingClientRect().height / parseFloat(getComputedStyle(eb).fontSize),
        };
      }),
    );
    for (const r of rows) {
      if (r.cards >= 1) {
        expect(r.sticky).toBe(true);
        expect(Math.abs(r.ratio - 0.4)).toBeLessThanOrEqual(0.01);
      }
      expect(r.lines).toBeLessThanOrEqual(2.4);
    }
    await page.setViewportSize({ width: 900, height: 1000 });
    const stacked = await page
      .locator('.chapter-grid')
      .evaluateAll((els) => els.map((e) => getComputedStyle(e).display));
    expect(new Set(stacked)).toEqual(new Set(['flex']));
  });

  test('STAR Expand all ends at the story card edge, 12px above it (R8)', async ({ page }) => {
    await page.goto('/star/');
    const m = await page.evaluate(() => {
      const b = document.querySelector('[data-expand=toggle]')!.getBoundingClientRect();
      const card = document.querySelector('.card.story')!.getBoundingClientRect();
      const cards = document.querySelectorAll('[data-story]').length;
      return { right: b.right, card: card.right, gap: card.top - b.bottom, cards };
    });
    if (m.cards === 1) expect(Math.abs(m.right - m.card)).toBeLessThanOrEqual(10);
    expect(m.gap).toBeGreaterThanOrEqual(8);
    expect(m.gap).toBeLessThanOrEqual(16);
  });

  test('the spanning Projects tile puts the disc at the lockup column edge (R8)', async ({
    page,
  }) => {
    await page.goto('/projects/');
    const m = await page.evaluate(() => {
      const tile = document.querySelector('[data-project]')!;
      const disc = tile.querySelector('summary')!.getBoundingClientRect();
      const lock = tile.querySelector('.unit__lockup')!.getBoundingClientRect();
      const chips = tile.querySelector('.chips')!.getBoundingClientRect();
      const summary = tile.querySelector('.summary')!.getBoundingClientRect();
      return { disc: disc.right, col: lock.right, gap: chips.top - summary.bottom };
    });
    expect(m.disc).toBeLessThanOrEqual(m.col + 2);
  });

  test('parts-list "Coming soon" chips share a right-aligned column (R8)', async ({ page }) => {
    await page.goto('/blog/');
    const chips = await page.locator('#feature .soon').evaluateAll((els) =>
      els.map((e) => {
        const chip = e.querySelector('.chip')!.getBoundingClientRect();
        const title = e.querySelector('.ptitle')!.getBoundingClientRect();
        return { right: Math.round(chip.right), dy: chip.top - title.top };
      }),
    );
    expect(chips.length).toBeGreaterThan(0);
    expect(new Set(chips.map((c) => c.right)).size).toBe(1);
    for (const c of chips) expect(Math.abs(c.dy)).toBeLessThanOrEqual(6);
  });
});

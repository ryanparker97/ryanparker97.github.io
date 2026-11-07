import { test, expect } from '@playwright/test';

const P = '/projects/agentic-coding-workflow/';
const screenOf = (page: import('@playwright/test').Page) => page.locator('.term__screen').first();

test.describe('Project page (§4.6.1)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('structure: 200, one H1, local-nav link back', async ({ page }) => {
    const res = await page.goto(P);
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Multi-Agent Coding System');
    await expect(
      page.locator('[data-local-nav]').getByRole('link', { name: 'All projects' }),
    ).toHaveAttribute('href', '/projects/');
  });

  test('the laptop frame holds the cover, eager, 16:9', async ({ page }) => {
    await page.goto(P);
    const img = page.locator('.project-visual figure.device--laptop img');
    await expect(img).toHaveAttribute('alt', /^Illustration: three stages on a path/);
    await expect(img).toHaveAttribute('loading', 'eager');
    const box = (await img.boundingBox())!;
    expect(Math.abs(box.width / box.height - 16 / 9)).toBeLessThan(0.02);
  });

  test('big stats carry footnotes', async ({ page }) => {
    await page.goto(P);
    await expect(page.locator('.stat-strip > li .stat-value')).toHaveText(['2', '0', '286']);
    await expect(page.locator('.stat-strip > li')).toContainText([
      'human sign-offs per run',
      'auto-merges',
      'automated tests',
    ]);
    const hrefs = await page
      .locator('.fn-ref a')
      .evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hrefs).toEqual(['#fn-1', '#fn-2', '#fn-3']);
    await expect(page.locator('#fn-1')).toContainText('end of Inception');
    for (const li of await page.locator('.fn-list > li').all()) {
      const id = await li.getAttribute('id');
      const n = id!.replace('fn-', '');
      await expect(li.locator('.fn-back')).toHaveAttribute('href', `#fnref-${n}`);
    }
    const w = await page
      .locator('.fn-ref a')
      .first()
      .evaluate((e) => getComputedStyle(e, '::before').width);
    expect(w).toBe('44px');
  });

  test('sections, highlight cards and the approach band', async ({ page }) => {
    await page.goto(P);
    const h2 = await page.locator('h2').allTextContents();
    for (const s of [
      'The problem.',
      'The approach.',
      'The design.',
      'The workflow.',
      'The result.',
      'More from the work.',
    ])
      expect(h2).toContain(s);
    await expect(page.locator('section:has(#result-title) .hl-cards')).toHaveCount(0);
    await expect(page.locator('section:has(#design-title) .hl-cards > li')).toHaveCount(4);
    await expect(page.locator('section:has(#workflow-title) ol.hl-cards > li')).toHaveCount(5);
    await expect(page.locator('#result-look .closer-item')).toHaveCount(5);
    await expect(page.locator('#result-look img')).toHaveCount(0);
    const bg = await page
      .locator('#approach-title')
      .locator('xpath=ancestor::section[1]')
      .evaluate((e) => getComputedStyle(e).backgroundColor);
    expect(bg).toBe('rgb(255, 255, 255)');
  });

  test('design diagram has a text alternative and unique ids', async ({ page }) => {
    // Smallest effective font size over every <text> in the visible diagram (font-size x SVG scale).
    const minFont = () =>
      page.evaluate(() => {
        const vis = [...document.querySelectorAll('figure.diagram svg')].find(
          (s) => (s as SVGElement).getBoundingClientRect().width > 0,
        )!;
        return Math.min(
          ...[...vis.querySelectorAll('text')].map(
            (el) =>
              parseFloat(getComputedStyle(el).fontSize) * (el as SVGTextElement).getScreenCTM()!.a,
          ),
        );
      });
    await page.goto(P);
    const svg = page.locator('section:has(#design-title) figure.diagram svg:visible');
    await expect(svg).toHaveAttribute('role', 'img');
    await expect(svg.locator('title')).toHaveText('How a run moves through the AI-DLC kit');
    await expect(page.locator('figure.diagram ol.sr-only li')).toHaveCount(6);
    const ids = await page.locator('[id]').evaluateAll((els) => els.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const w of [320, 375, 767, 768, 1024, 1440]) {
      await page.setViewportSize({ width: w, height: 900 });
      expect(await minFont(), `min font at ${w}px`).toBeGreaterThanOrEqual(14);
    }
  });

  for (const [lang, prefix] of [
    ['en', ''],
    ['vi', '/vi'],
  ] as const) {
    for (const w of [320, 375, 768, 1024, 1440]) {
      test(`${lang} diagram labels fit their boxes and stay clear of each other at ${w}px`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: w, height: 900 });
        await page.goto(`${prefix}${P}`);
        const bad = await page.evaluate(() => {
          const svg = [...document.querySelectorAll('figure.diagram svg')].find(
            (s) => s.getBoundingClientRect().width > 0,
          )!;
          const out: string[] = [];
          const name = (t: Element) => `"${t.textContent!.trim().replace(/\s+/g, ' ')}"`;
          const box = svg.getBoundingClientRect();
          // The glyph box of an SVG <text> is taller than its ink; trim 3px top and bottom.
          const ink = (t: Element) => {
            const b = t.getBoundingClientRect();
            return { left: b.left, right: b.right, top: b.top + 3, bottom: b.bottom - 3 };
          };
          const hit = (
            a: { left: number; right: number; top: number; bottom: number },
            b: { left: number; right: number; top: number; bottom: number },
          ) =>
            a.left < b.right - 1 &&
            a.right > b.left + 1 &&
            a.top < b.bottom - 1 &&
            a.bottom > b.top + 1;

          const texts = [...svg.querySelectorAll('text')];

          // 1. Every text stays inside the SVG box, on both axes.
          for (const t of texts) {
            const b = t.getBoundingClientRect();
            if (b.left < box.left - 0.5 || b.right > box.right + 0.5)
              out.push(`${name(t)} leaves the SVG horizontally`);
            if (b.top < box.top - 0.5 || b.bottom > box.bottom + 0.5)
              out.push(`${name(t)} leaves the SVG vertically`);
          }

          // 2. Text in a box sits inside its smallest containing rect: 4px at the sides, 2px above and below.
          for (const t of svg.querySelectorAll('.node text')) {
            const tb = t.getBoundingClientRect();
            const cx = tb.left + tb.width / 2;
            const cy = tb.top + tb.height / 2;
            const r = [...t.closest('.node')!.querySelectorAll('rect')]
              .map((e) => e.getBoundingClientRect())
              .filter((e) => cx >= e.left && cx <= e.right && cy >= e.top && cy <= e.bottom)
              .sort((a, b) => a.width * a.height - b.width * b.height)[0];
            if (!r) out.push(`${name(t)} is in no rect`);
            else if (tb.left < r.left + 4 || tb.right > r.right - 4)
              out.push(`${name(t)} overflows its box horizontally`);
            else if (tb.top < r.top + 2 || tb.bottom > r.bottom - 2)
              out.push(`${name(t)} overflows its box vertically`);
          }

          // 3. Text outside any box (lane labels, edge labels) clears every box.
          const rects = [...svg.querySelectorAll('.node rect')].map((r) =>
            r.getBoundingClientRect(),
          );
          for (const t of svg.querySelectorAll('text:not(.node text)')) {
            const i = ink(t);
            if (rects.some((r) => hit(i, r))) out.push(`${name(t)} overlaps a box`);
          }

          // 4. Top-level boxes never overlap each other.
          const tops = [...svg.querySelectorAll(':scope > .node > rect:first-child')];
          tops.forEach((a, n) =>
            tops.slice(n + 1).forEach((b) => {
              if (hit(a.getBoundingClientRect(), b.getBoundingClientRect()))
                out.push(`two boxes overlap near ${name(a.parentElement!.querySelector('text')!)}`);
            }),
          );

          // 5. No two texts overlap, and no arrow or dotted tie runs through a text.
          texts.forEach((a, n) =>
            texts.slice(n + 1).forEach((b) => {
              if (hit(ink(a), ink(b))) out.push(`${name(a)} overlaps ${name(b)}`);
            }),
          );
          for (const p of svg.querySelectorAll('.links path, .ties path')) {
            const path = p as SVGPathElement;
            const m = path.getScreenCTM()!;
            const len = path.getTotalLength();
            for (const t of texts) {
              const i = ink(t);
              for (let d = 0; d <= len; d += 2) {
                const pt = path.getPointAtLength(d);
                const x = m.a * pt.x + m.c * pt.y + m.e;
                const y = m.b * pt.x + m.d * pt.y + m.f;
                if (x > i.left && x < i.right && y > i.top && y < i.bottom) {
                  out.push(`a line crosses ${name(t)}`);
                  break;
                }
              }
            }
          }

          // 6. Four gate bars and two sign-offs are drawn, and nothing pushes the page sideways.
          if (svg.querySelectorAll('.gate').length !== 4) out.push('gate count is not 4');
          if (svg.querySelectorAll('.signoff').length !== 2) out.push('sign-off count is not 2');
          if (document.documentElement.scrollWidth > window.innerWidth)
            out.push('page scrolls sideways');
          return [...new Set(out)];
        });
        expect(bad).toEqual([]);
      });
    }
  }

  for (const theme of ['light', 'dark']) {
    test(`bands never repeat a background next to each other (${theme})`, async ({ page }) => {
      await page.addInitScript((th) => {
        if (th === 'dark') localStorage.setItem('theme', 'dark');
      }, theme);
      await page.goto(P);
      const bgs = await page
        .locator('main section.hero, .project-visual, main section:not(.footnotes):not(.hero)')
        .evaluateAll((els) =>
          els
            .sort((a, b) => (a.compareDocumentPosition(b) & 4 ? -1 : 1))
            .map((e) => getComputedStyle(e).backgroundColor),
        );
      expect(bgs.length).toBeGreaterThanOrEqual(6);
      for (let i = 1; i < bgs.length; i++) expect(bgs[i]).not.toBe(bgs[i - 1]);
    });
  }

  test('closer look labels are buttons with JS, captions all visible without', async ({
    page,
    browser,
  }) => {
    await page.goto(P);
    const labels = await page.locator('#result-look .closer-label').allTextContents();
    expect(labels).toHaveLength(5);
    const btns = await page.locator('#result-look .closer-btn').allTextContents();
    expect(btns.map((b) => b.trim())).toEqual(labels.map((b) => b.trim()));
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const p2 = await ctx.newPage();
    await p2.goto(new URL(P, page.url()).toString());
    await expect(p2.locator('#result-look .closer-btn')).toHaveCount(0);
    for (const c of await p2.locator('#result-look .closer-cap').all())
      await expect(c).toBeVisible();
    await ctx.close();
  });

  test('the frame peeks above the fold', async ({ page }) => {
    for (const [w, h, max] of [
      [1440, 900, 836],
      [375, 812, 748],
    ] as const) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(P);
      const top = (await page.locator('.project-visual').boundingBox())!.y;
      expect(top).toBeLessThanOrEqual(max);
    }
  });

  test('terminal under reduced motion: no toggle, no animation', async ({ page }) => {
    await page.goto(P);
    await expect(page.locator('[data-term-toggle]')).toBeHidden();
    expect(await screenOf(page).evaluate((e) => getComputedStyle(e, '::after').display)).toBe(
      'none',
    );
  });

  test('Vietnamese page', async ({ page }) => {
    await page.goto('/vi' + P);
    await expect(page.locator('h2', { hasText: 'Vấn đề.' })).toHaveCount(1);
    await expect(page.locator('h2', { hasText: 'Thiết kế.' })).toHaveCount(1);
    await expect(page.locator('.stat-strip > li')).toContainText([
      'lần con người duyệt mỗi run',
      'lần tự động merge',
      'test tự động',
    ]);
    await expect(page.locator('.fn-list')).toContainText('Cuối Inception và cuối Review');
  });

  test('key sentences are whole, not ellipsized, and footnotes are numbered', async ({ page }) => {
    for (const url of [P, '/vi' + P]) {
      await page.goto(url);
      expect(await page.locator('main').innerText()).not.toContain('…');
      const type = await page
        .locator('.fn-list > li')
        .first()
        .evaluate((e) => getComputedStyle(e).listStyleType);
      expect(type).toBe('decimal');
    }
  });

  test('no horizontal overflow at 320', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(P);
    const o = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    );
    expect(o).toBe(true);
  });
});

test.describe('Project page terminal with motion', () => {
  test('toggle pauses and resumes', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'no-preference' });
    const page = await ctx.newPage();
    await page.goto(P);
    const toggle = page.locator('[data-term-toggle]');
    const state = () =>
      screenOf(page).evaluate((e) => getComputedStyle(e, '::after').animationPlayState);
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(await state()).toBe('running');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(await state()).toBe('paused');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await ctx.close();
  });
});

test.describe('Project page terminal without JS', () => {
  test.use({ javaScriptEnabled: false });
  test('static final frame, no toggle', async ({ page }) => {
    await page.goto(P);
    await expect(page.locator('[data-term-toggle]')).toBeHidden();
    expect(await screenOf(page).evaluate((e) => getComputedStyle(e, '::after').display)).toBe(
      'none',
    );
    await expect(page.locator('.term__lines li')).toHaveCount(6);
    for (const li of await page.locator('.term__lines li').all()) await expect(li).toBeVisible();
  });
});

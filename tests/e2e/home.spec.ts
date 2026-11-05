import { expect, test, type Page } from '@playwright/test';

const ANCHORS = ['experience', 'work', 'stories', 'writing', 'certifications'];

// Layout is measured without the reveal animation (its translate would skew the numbers).
test.use({ reducedMotion: 'reduce' });

const size = (width: number, height = 900) => ({ width, height });

/** Units and grid tiles, with their geometry. */
const blocks = (page: Page) =>
  page.locator('main .unit, main .grid-tile').evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return {
        id: e.id,
        tile: e.classList.contains('grid-tile'),
        left: r.left,
        right: r.right,
        top: r.top + scrollY,
        bottom: r.bottom + scrollY,
        height: r.height,
      };
    }),
  );

test.describe('Home structure', () => {
  test('units run Hero, Experiences, then the tile grid', async ({ page }) => {
    await page.goto('/');
    const ids = await page
      .locator('main .unit, main .grid-tile')
      .evaluateAll((els) => els.map((e) => e.id));
    expect(ids).toEqual(['top', 'experience', 'work', 'stories', 'writing', 'certifications']);
    await expect(page.locator('main .tiles-2up .grid-tile')).toHaveCount(4);
  });

  test('one H1, an H2 per unit and tile, H3 for certification cards, no skipped levels', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Ryan Parker');
    const levels = await page
      .locator('main :is(h1,h2,h3,h4,h5,h6)')
      .evaluateAll((els) => els.map((e) => Number(e.tagName[1])));
    expect(levels[0]).toBe(1);
    levels.slice(1).forEach((level, i) => expect(level).toBeLessThanOrEqual(levels[i] + 1));
    await expect(page.locator('main h2')).toHaveCount(5);
    await expect(page.locator('main h3')).toHaveCount(2);
    // Every unit headline is at most 6 words; the Writing headline follows its own 8-word rule.
    const words = await page
      .locator('main :is(h1,h2)')
      .evaluateAll((els) =>
        els.map((e) => ({ id: e.id, n: (e.textContent ?? '').trim().split(/\s+/).length })),
      );
    for (const w of words)
      expect(w.n, w.id).toBeLessThanOrEqual(
        ['writing-title', 'stories-title', 'work-title'].includes(w.id) ? 8 : 6,
      );
  });

  test('unit text is centred at L and no unit has more than two actions', async ({ page }) => {
    await page.setViewportSize(size(1440));
    await page.goto('/');
    for (const unit of await page.locator('main .unit, main .grid-tile').all()) {
      await expect(unit).toHaveCSS('text-align', 'center');
      expect(await unit.locator('.actions > a').count()).toBeLessThanOrEqual(2);
    }
    for (const id of ['top', 'experience', 'stories', 'writing'])
      expect(await page.locator(`#${id} .actions > a`).count()).toBe(2);
    await expect(page.locator('#certifications .actions > a')).toHaveCount(1);
    await expect(page.locator('#work .actions > a')).toHaveCount(2);
  });

  test('exactly one .text-gradient, the hero role; the hero holds only its parts', async ({
    page,
  }) => {
    for (const path of ['/', '/vi/']) {
      await page.goto(path);
      await expect(page.locator('.text-gradient')).toHaveCount(1);
      await expect(page.locator('#top .text-gradient')).toHaveText(
        'Senior Data Engineer & Team Lead',
      );
    }
  });

  test('Home has no long lockup at 375px (every lockup stays centred)', async ({ page }) => {
    await page.setViewportSize(size(375, 812));
    await page.goto('/');
    await expect(page.locator('.lockup--long')).toHaveCount(0);
  });

  test('no Home-specific script, rail or section index', async ({ page }) => {
    await page.goto('/');
    const scripts = await page
      .locator('script[src]')
      .evaluateAll((els) => els.map((e) => (e as HTMLScriptElement).src));
    for (const src of scripts) expect(src).not.toMatch(/rail|section-index|home/i);
    await expect(page.locator('aside, [data-section-index]')).toHaveCount(0);
  });
});

test.describe('Hero and stats', () => {
  test('shows the role, name, one line and two pills; no location or tagline', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('#top');
    await expect(hero).toContainText('Senior Data Engineer & Team Lead');
    await expect(hero).toContainText('Data pipelines and cloud platforms for banking markets.');
    await expect(hero).not.toContainText('Ho Chi Minh City');
    await expect(hero).not.toContainText('DBT, Airflow, PySpark, AWS & GitLab CI/CD');
    await expect(hero.locator('.t-eyebrow svg')).toHaveCount(0);
    await expect(hero.locator('.t-eyebrow .text-gradient')).toHaveText(
      'Senior Data Engineer & Team Lead',
    );
    await expect(
      hero.getByRole('link', { name: 'Learn more about my experience' }),
    ).toHaveAttribute('href', '/experiences/');
    const pdf = hero.getByRole('link', { name: 'Download PDF' });
    await expect(pdf).toHaveAttribute('href', '/cv.pdf');
    await expect(pdf).toHaveAttribute('download', 'Ryan-Parker-CV.pdf');
    const stats = page.locator('#experience .stat-strip > li');
    await expect(stats).toHaveCount(3);
    await expect(stats.nth(0)).toContainText('5+');
    await expect(stats.nth(0)).toContainText('years of experience');
    await expect(stats.nth(1)).toHaveText(/Led\s*7\s*engineers/);
    await expect(stats.nth(2)).toHaveText(/Cut\s*>50%\s*EMR costs/);
    for (const v of await page.locator('#experience .stat-value').allTextContents())
      expect(v).toMatch(/\d/);
    await expect(page.locator('#experience').getByLabel('At a glance')).toBeVisible();
    await expect(hero.locator('.stat-strip')).toHaveCount(0);
  });

  test('the pipeline: four stages, one row at 1440, two columns at 375, Observe in dark', async ({
    page,
  }) => {
    await page.setViewportSize(size(1440));
    await page.goto('/');
    const li = page.locator('#top [data-pipeline] > li');
    await expect(li).toHaveCount(4);
    const pairs = [
      ['Ingest', 'PySpark · EMR'],
      ['Transform', 'DBT · Airflow'],
      ['Store', 'S3 · Redshift'],
      ['Observe', 'Datadog SLOs'],
    ];
    for (const [i, [step, tools]] of pairs.entries()) {
      const text = await li.nth(i).innerText();
      expect(text).toContain(step);
      expect(text).toContain(tools);
    }
    const axis = (axisName: 'x' | 'y') =>
      li.evaluateAll(
        (els, a) =>
          new Set(els.map((e) => Math.round(e.getBoundingClientRect()[a as 'x' | 'y']))).size,
        axisName,
      );
    expect(await axis('x')).toBe(4);
    expect(await axis('y')).toBe(1);
    await expect(li.first().locator('.tools')).toHaveCSS('font-size', '24px');
    await expect(li.nth(3)).toHaveCSS('background-color', 'rgb(29, 29, 31)');
    await expect(li.nth(0)).toHaveCSS('background-color', 'rgb(245, 245, 247)');
    await page.setViewportSize(size(375, 812));
    expect(await axis('x')).toBe(2);
  });

  test('stats sit in one row at 1440px and stay three across at 375px (compact)', async ({
    page,
  }) => {
    await page.setViewportSize(size(1440));
    await page.goto('/');
    const tops = () =>
      page
        .locator('#experience .stat-strip > li')
        .evaluateAll(
          (els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().top))).size,
        );
    expect(await tops()).toBe(1);
    await page.setViewportSize(size(375, 812));
    await expect(page.locator('#experience .stat-strip')).toHaveClass(/stat-strip--compact/);
    expect(await tops()).toBe(1);
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

  test('peek rule: at least 64px of the next band shows at 1440x900 and 375x812', async ({
    page,
  }) => {
    for (const [w, h] of [
      [1440, 900],
      [375, 812],
    ]) {
      await page.setViewportSize(size(w, h));
      await page.goto('/');
      const next = (await page.locator('#experience').boundingBox())!;
      expect(h - next.y, `${w}x${h}`).toBeGreaterThanOrEqual(64);
    }
  });
});

test.describe('Experiences', () => {
  test('Experiences is a black tile: headline, role line, rail, two actions', async ({ page }) => {
    await page.goto('/');
    const unit = page.locator('#experience');
    await expect(unit.locator('h2')).toHaveText('Five years. One focus.');
    await expect(unit).toContainText('Senior Data Engineer (Team Lead) at FPT Software.');
    await expect(unit.locator('.rail > li')).toHaveCount(3);
    await expect(unit.locator('.rail > li .sr-only').first()).toHaveText(
      'FPT Software: 2020 to 2021, and 2026 to now.',
    );
    await expect(unit.getByRole('link', { name: 'See every role' })).toHaveAttribute(
      'href',
      '/experiences/',
    );
    await expect(unit.getByRole('link', { name: 'Download PDF' })).toBeVisible();
    await expect(unit).toHaveCSS('background-color', 'rgb(0, 0, 0)');
    await expect(unit.locator('h2')).toHaveCSS('color', 'rgb(245, 245, 247)');
    await expect(unit.locator('.t-eyebrow')).toHaveCSS('color', 'rgb(174, 174, 178)');
    await expect(unit.locator('.btn-primary')).toHaveCSS('background-color', 'rgb(92, 176, 255)');
    await expect(unit.locator('.btn-primary')).toHaveCSS('color', 'rgb(0, 0, 0)');
    await expect(page.locator('#top')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  });

  test('the big stats are 72px at 1440, 48px at 900 and 28px at 375', async ({ page }) => {
    for (const [w, px] of [
      [1440, '72px'],
      [900, '48px'],
      [375, '28px'],
    ] as const) {
      await page.setViewportSize(size(w, 900));
      await page.goto('/');
      await expect(page.locator('#experience .stat-value').first()).toHaveCSS('font-size', px);
    }
  });
});

test.describe('Backgrounds and grid geometry', () => {
  for (const width of [375, 1440, 1920]) {
    test(`units span the viewport and 12px of white separates them at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize(size(width, 1000));
      await page.goto('/');
      const all = await blocks(page);
      const units = all.filter((b) => !b.tile);
      for (const u of units) {
        expect(u.left).toBe(0);
        expect(u.right).toBe(width);
      }
      const bg = await page
        .locator('main .unit')
        .evaluateAll((els) => els.map((e) => getComputedStyle(e).borderRadius));
      for (const r of bg) expect(r).toBe('0px');
      for (let i = 1; i < units.length; i++) {
        const prev = all[all.indexOf(units[i]) - 1];
        const gap = units[i].top - prev.bottom;
        // Neighbouring units touch the grid through its own 12px padding.
        expect(Math.round(gap), `${prev.id} -> ${units[i].id}`).toBe(12);
      }
    });
  }

  for (const width of [1440, 1920]) {
    test(`the tile grid is two-up, fills the viewport minus 24px and has equal rows at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize(size(width, 1000));
      await page.goto('/');
      const t = (await blocks(page)).filter((b) => b.tile);
      expect(t).toHaveLength(4);
      expect(t[0].left).toBe(12);
      expect(t[1].right).toBe(width - 12);
      expect(t[0].top).toBe(t[1].top);
      expect(t[0].height).toBeCloseTo(t[1].height, 0);
      expect(t[0].height).toBeGreaterThanOrEqual(600);
      expect(t[2].top - t[0].bottom).toBeCloseTo(12, 0);
    });
  }

  test('tiles stack in one column with no side padding at 375px, min-height 500px', async ({
    page,
  }) => {
    await page.setViewportSize(size(375, 812));
    await page.goto('/');
    const t = (await blocks(page)).filter((b) => b.tile);
    for (const tile of t) {
      expect(tile.left).toBe(0);
      expect(tile.right).toBe(375);
      expect(tile.height).toBeGreaterThanOrEqual(500);
    }
  });

  test('unit min-height is 692px on a tall L viewport and 650px on a tall M viewport', async ({
    page,
  }) => {
    await page.setViewportSize(size(1440, 900));
    await page.goto('/');
    expect((await blocks(page))[0].height).toBeGreaterThanOrEqual(692);
    await page.setViewportSize(size(900, 800));
    expect((await blocks(page))[0].height).toBeGreaterThanOrEqual(650);
  });

  test('no pastel or gradient backgrounds on large elements, no shadows or borders', async ({
    page,
  }) => {
    await page.goto('/');
    const bad = await page.locator('main *').evaluateAll((els) =>
      els
        .filter((e) => {
          const r = e.getBoundingClientRect();
          const s = getComputedStyle(e);
          const big = r.width > 64 && r.height > 64;
          const clip = (s as unknown as { webkitBackgroundClip: string }).webkitBackgroundClip;
          return (
            (big && s.backgroundImage !== 'none' && clip !== 'text') ||
            s.boxShadow !== 'none' ||
            (s.borderTopWidth !== '0px' &&
              s.borderTopStyle !== 'none' &&
              !e.classList.contains('btn'))
          );
        })
        .map((e) => e.className),
    );
    expect(bad).toEqual([]);
  });

  test('a grid tile darkens by 2% on hover with a pointer', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit does not apply :hover through Playwright here');
    await page.setViewportSize(size(1440));
    await page.goto('/');
    const tile = page.locator('#work');
    const before = await tile.evaluate((e) => getComputedStyle(e).backgroundColor);
    await tile.hover({ position: { x: 20, y: 20 } });
    await expect
      .poll(() => tile.evaluate((e) => getComputedStyle(e).backgroundColor))
      .not.toBe(before);
  });

  test('the footer sits flush under the tile grid', async ({ page }) => {
    await page.goto('/');
    const grid = (await page.locator('main .tiles-2up').boundingBox())!;
    const footer = (await page.locator('footer').boundingBox())!;
    expect(Math.abs(footer.y - (grid.y + grid.height))).toBeLessThanOrEqual(1);
    await expect(page.locator('footer .crumbs')).toHaveCount(0);
  });

  test('has no horizontal scroll from 320px', async ({ page }) => {
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize(size(width, 700));
      await page.goto('/');
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      ).toBeLessThanOrEqual(0);
    }
  });
});

test.describe('Grid tile content', () => {
  test('project tile', async ({ page }) => {
    await page.setViewportSize(size(1440, 1000));
    await page.goto('/');
    const tile = page.locator('#work');
    await expect(tile.locator('h2')).toHaveText('Multi-Agent Coding System');
    await expect(tile.locator('.chip')).toHaveCount(0);
    await expect(tile.locator('[data-panes] .pane__name')).toHaveText([
      'claude',
      'gemini',
      'codex',
    ]);
    await expect(
      tile.getByRole('link', { name: 'See the project: Multi-Agent Coding System' }),
    ).toHaveAttribute('href', '/projects/#agentic-coding-workflow');
    await expect(tile.getByRole('link', { name: 'All projects' })).toHaveAttribute(
      'href',
      '/projects/',
    );
    const panes = await tile.locator('[data-panes]').boundingBox();
    const box = await tile.boundingBox();
    expect(Math.abs(panes!.y + panes!.height - (box!.y + box!.height))).toBeLessThanOrEqual(1);
  });

  test('STAR story tile: competencies as a line, the huge figure and two actions', async ({
    page,
  }) => {
    await page.setViewportSize(size(1440, 1000));
    await page.goto('/');
    const tile = page.locator('#stories');
    await expect(tile.locator('h2')).toHaveText('Cutting EMR costs by more than half');
    await expect(tile.locator('.chip')).toHaveCount(0);
    await expect(tile).toContainText('Ownership, technical depth, customer focus.');
    await expect(tile.locator('[data-figure] [aria-hidden="true"]')).toHaveText('>50%');
    await expect(tile.locator('[data-figure] .sr-only')).toHaveText('Cut >50% EMR costs');
    expect(await tile.locator('[data-figure]').evaluate((e) => getComputedStyle(e).fontSize)).toBe(
      '200px',
    );
    await expect(tile.getByRole('link', { name: /Read the story/ })).toHaveAttribute(
      'href',
      '/star/emr-cost-optimization/',
    );
    await expect(tile.getByRole('link', { name: 'All stories' })).toHaveAttribute('href', '/star/');
  });

  test('writing tile: the series, its line, Read part 5, and the editor window', async ({
    page,
  }) => {
    await page.goto('/');
    const tile = page.locator('#writing');
    await expect(tile.locator('h2')).toHaveText('Neovim setup guide');
    await expect(tile).toContainText('Five parts, from zero to a working editor.');
    await expect(tile.locator('a.chip')).toHaveCount(0);
    await expect(
      tile.getByRole('link', {
        name: 'Read part 5: Neovim setup guide, Part 5: debugging, testing and the daily workflow',
      }),
    ).toHaveAttribute('href', '/blog/neovim-setup-5-debugging-and-workflow/');
    await expect(tile.getByRole('link', { name: 'All posts' })).toHaveAttribute('href', '/blog/');
    await expect(tile.locator('[data-code] li')).toHaveCount(4);
    await expect(tile.locator('[data-code] li').first()).toContainText('vim.g.mapleader');
    await expect(tile.locator('img')).toHaveCount(0);
    await page.goto('/vi/');
    await expect(page.locator('#writing h2')).toHaveText('Hướng dẫn thiết lập Neovim');
  });

  test('certifications: two cards newest first, issuers as the subhead, no logos', async ({
    page,
  }) => {
    await page.goto('/');
    const tile = page.locator('#certifications');
    await expect(tile.locator('h2')).toHaveText('Certified on the platforms I use.');
    await expect(tile).toContainText('Amazon Web Services and Datadog.');
    const rows = tile.locator('[data-cert]');
    await expect(rows).toHaveCount(2);
    await expect(rows.locator('.cert-name')).toHaveText([
      'Datadog Certified: Datadog Fundamentals',
      'AWS Certified Solutions Architect – Associate',
    ]);
    await expect(rows.first()).toContainText('Datadog · 2023');
    await expect(tile.locator('svg, img')).toHaveCount(0);
    await expect(tile.getByRole('link')).toHaveCount(1);
    await expect(tile.getByRole('link', { name: 'See all skills' })).toHaveAttribute(
      'href',
      '/skills/',
    );
    await expect(tile.locator('[data-cert-more]')).toHaveCount(0);
  });
});

test.describe('Anchors and motion', () => {
  for (const id of ANCHORS) {
    test(`/#${id} lands below the global nav`, async ({ page }) => {
      await page.goto(`/#${id}`);
      await page.waitForTimeout(300);
      const top = (await page.locator(`#${id}`).boundingBox())!.y;
      expect(top).toBeGreaterThanOrEqual(0);
      if (!['certifications'].includes(id)) expect(top).toBeLessThan(80);
    });
  }

  test('every unit is visible with JavaScript off', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: size(1440) });
    const page = await context.newPage();
    await page.goto('/');
    for (const id of ['top', ...ANCHORS]) await expect(page.locator(`#${id}`)).toBeVisible();
    for (const el of await page.locator('main [data-reveal]').all())
      await expect(el).toHaveCSS('opacity', '1');
    await context.close();
  });

  test('reveal: 900ms fade, 30px rise, 150ms stagger; backgrounds never animate', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      reducedMotion: 'no-preference',
      viewport: size(1440),
    });
    const page = await context.newPage();
    await page.goto('/');
    expect(
      await page.locator('main .unit[data-reveal], main .grid-tile[data-reveal]').count(),
    ).toBe(0);
    await expect(page.locator('html')).toHaveClass(/\breveal\b/);
    const item = page.locator('#stories h2');
    // The hidden state fades in over 900ms from the visible server render; wait for it to settle.
    await expect.poll(() => item.evaluate((e) => getComputedStyle(e).opacity)).toBe('0');
    const css = await item.evaluate((e) => {
      const s = getComputedStyle(e);
      return {
        dur: s.transitionDuration,
        delay: s.transitionDelay,
        t: s.translate,
        o: s.opacity,
      };
    });
    expect(css.o).toBe('0');
    expect(css.dur).toBe('0.9s, 0.7s');
    expect(css.delay).toBe('0.15s');
    expect(css.t).toContain('30');
    await item.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 200));
    await expect
      .poll(() => item.evaluate((e) => getComputedStyle(e).opacity), {
        timeout: 2500,
      })
      .toBe('1');
    await context.close();
  });
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
    await expect(page.locator('main h2')).toHaveCount(5);
    await expect(page.locator('#experience h2')).toHaveText('Năm năm. Một trọng tâm.');
    await expect(page.getByRole('link', { name: 'Tải PDF' }).first()).toHaveAttribute(
      'href',
      '/vi/cv.pdf',
    );
    await expect(page.locator('link[hreflang="vi"]')).toHaveCount(1);
  });
});

test.describe('Feature tile visuals', () => {
  for (const w of [1440, 900, 390]) {
    test(`terminal and editor windows are sized per spec at ${w}`, async ({ page }) => {
      await page.setViewportSize(size(w));
      await page.goto('/');
      const m = await page.evaluate(() => {
        const box = (el: Element) => el.getBoundingClientRect();
        const win = (sel: string) => {
          const el = document.querySelector(sel) as HTMLElement;
          const tile = el.closest('.grid-tile') as HTMLElement;
          const cs = getComputedStyle(tile);
          const inner = box(tile).width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
          return { width: box(el).width, inner, tileRight: box(tile).right, right: box(el).right };
        };
        const over = (sel: string) =>
          [...document.querySelectorAll(sel)].filter((e) => e.scrollWidth > e.clientWidth).length;
        return {
          term: win('#work .panes--window'),
          editor: win('#writing .code-window'),
          paneNames: over('#work .pane__name'),
          editorLines: over('#writing .code-window li'),
          editorBox: over('#writing .code-window'),
          docW: document.documentElement.scrollWidth,
        };
      });
      for (const v of [m.term, m.editor]) {
        // 520 per spec, or 92% of the tile's content box when that is narrower (M); S only has to fit.
        if (w >= 735) {
          expect(Math.abs(v.width - Math.min(520, v.inner * 0.92))).toBeLessThanOrEqual(1);
        } else {
          expect(v.width).toBeGreaterThanOrEqual(250);
          expect(v.width).toBeLessThanOrEqual(v.inner);
        }
        expect(v.right).toBeLessThanOrEqual(v.tileRight + 0.5);
        if (w >= 1069) expect(Math.abs(v.width - 520)).toBeLessThanOrEqual(1);
      }
      expect(m.paneNames).toBe(0);
      expect(m.editorLines).toBe(0);
      expect(m.editorBox).toBe(0);
      expect(m.docW).toBeLessThanOrEqual(w);
    });
  }
});

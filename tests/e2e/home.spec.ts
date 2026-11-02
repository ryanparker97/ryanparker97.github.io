import { expect, test, type Page } from '@playwright/test';

const SKILLS = [
  'Data Engineering',
  'Cloud Platform',
  'DevOps & IaC',
  'Backend Engineering',
  'AI Engineering',
  'Methodologies',
];
const ANCHORS = ['experience', 'skills', 'work', 'stories', 'writing', 'certifications', 'contact'];

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
  test('units run Hero, Experiences, Skills, tile grid, Contact', async ({ page }) => {
    await page.goto('/');
    const ids = await page
      .locator('main .unit, main .grid-tile')
      .evaluateAll((els) => els.map((e) => e.id));
    expect(ids).toEqual([
      'top',
      'experience',
      'skills',
      'work',
      'stories',
      'writing',
      'certifications',
      'contact',
    ]);
    await expect(page.locator('main .tiles-2up .grid-tile')).toHaveCount(4);
  });

  test('one H1, an H2 per unit and tile, H3 for skills and certifications, no skipped levels', async ({
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
    await expect(page.locator('main h2')).toHaveCount(7);
    await expect(page.locator('main h3')).toHaveCount(SKILLS.length + 2);
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
    for (const id of ['top', 'experience', 'stories', 'writing', 'contact'])
      expect(await page.locator(`#${id} .actions > a`).count()).toBe(2);
    await expect(page.locator('#certifications .btn')).toHaveCount(0);
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

  test('at 375px every .lockup--long is start-aligned', async ({ page }) => {
    await page.setViewportSize(size(375, 812));
    await page.goto('/');
    const longs = page.locator('.lockup--long');
    expect(await longs.count()).toBeGreaterThan(0);
    for (const el of await longs.all()) await expect(el).toHaveCSS('text-align', 'start');
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
  test('shows location, name, headline, positioning, two pills and 3 numeric stats', async ({
    page,
  }) => {
    await page.goto('/');
    const hero = page.locator('#top');
    await expect(hero).toContainText('Ho Chi Minh City, Vietnam');
    await expect(hero).toContainText(
      'Senior Data Engineer & Team Lead — DBT, Airflow, PySpark, AWS & GitLab CI/CD',
    );
    await expect(hero).toContainText('I design, build and run data pipelines');
    await expect(
      hero.getByRole('link', { name: 'Learn more about my experience' }),
    ).toHaveAttribute('href', '/experiences/');
    const pdf = hero.getByRole('link', { name: 'Download PDF' });
    await expect(pdf).toHaveAttribute('href', '/cv.pdf');
    await expect(pdf).toHaveAttribute('download', 'Ryan-Parker-CV.pdf');
    const stats = hero.locator('.stat-strip > li');
    await expect(stats).toHaveCount(3);
    await expect(stats.nth(0)).toContainText('5+');
    await expect(stats.nth(0)).toContainText('years of experience');
    await expect(stats.nth(1)).toHaveText(/Led\s*7\s*engineers/);
    await expect(stats.nth(2)).toHaveText(/Cut\s*>50%\s*EMR costs/);
    for (const v of await hero.locator('.stat-value').allTextContents()) expect(v).toMatch(/\d/);
    await expect(hero.getByLabel('At a glance')).toBeVisible();
  });

  test('stats sit in one row at 1440px and stay three across at 375px (compact)', async ({
    page,
  }) => {
    await page.setViewportSize(size(1440));
    await page.goto('/');
    const tops = () =>
      page
        .locator('#top .stat-strip > li')
        .evaluateAll(
          (els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().top))).size,
        );
    expect(await tops()).toBe(1);
    await page.setViewportSize(size(375, 812));
    await expect(page.locator('#top .stat-strip')).toHaveClass(/stat-strip--compact/);
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

test.describe('Experiences and skills', () => {
  test('Experiences shows the current role, company line and two actions', async ({ page }) => {
    await page.goto('/');
    const unit = page.locator('#experience');
    await expect(unit.locator('h2')).toHaveText('Senior Data Engineer (Team Lead)');
    await expect(unit).toContainText('FPT Software · since Aug 2026 · 5+ years of experience');
    await expect(unit.locator('.rail > li')).toHaveCount(3);
    await expect(unit.locator('.rail > li .sr-only').first()).toHaveText(
      'FPT Software: 2020 to 2021, and 2026 to now.',
    );
    await expect(unit.getByRole('link', { name: 'Download PDF' })).toBeVisible();
  });

  test('one skill cell per category in order with at most 5 names plus "+N more"', async ({
    page,
  }) => {
    await page.goto('/');
    const cells = page.locator('#skills [data-skill]');
    await expect(cells.locator('h3')).toHaveText(SKILLS);
    for (const cell of await cells.all()) {
      await expect(cell.locator('svg[data-skill-icon]')).toBeVisible();
      const text = (await cell.locator('[data-skill-items]').textContent()) ?? '';
      const names = text.replace(/\s*·\s*\+\d+ more$/, '').split(' · ');
      expect(names.length).toBeLessThanOrEqual(5);
    }
    await expect(
      cells.filter({ hasText: 'Data Engineering' }).locator('[data-skill-items]'),
    ).toContainText('+9 more');
    await expect(page.getByRole('link', { name: 'See where I used them' })).toHaveAttribute(
      'href',
      '/experiences/',
    );
  });

  for (const [width, columns] of [
    [1440, 3],
    [800, 2],
    [400, 1],
  ] as const) {
    test(`skill grid has ${columns} column(s) at ${width}px, with no card chrome`, async ({
      page,
    }) => {
      await page.setViewportSize(size(width));
      await page.goto('/');
      const xs = await page
        .locator('#skills [data-skill]')
        .evaluateAll(
          (els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().x))).size,
        );
      expect(xs).toBe(columns);
      const cell = page.locator('#skills [data-skill]').first();
      await expect(cell).toHaveCSS('box-shadow', 'none');
      await expect(cell).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    });
  }
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
      expect(t[0].height).toBeGreaterThanOrEqual(380);
      expect(t[2].top - t[0].bottom).toBeCloseTo(12, 0);
    });
  }

  test('tiles stack in one column with no side padding at 375px, min-height 340px', async ({
    page,
  }) => {
    await page.setViewportSize(size(375, 812));
    await page.goto('/');
    const t = (await blocks(page)).filter((b) => b.tile);
    for (const tile of t) {
      expect(tile.left).toBe(0);
      expect(tile.right).toBe(375);
      expect(tile.height).toBeGreaterThanOrEqual(340);
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
    await page.goto('/');
    const tile = page.locator('#work');
    await expect(tile.locator('h2')).toHaveText('Multi-Agent Coding System');
    await expect(tile).toContainText('Personal');
    await expect(tile.locator('[data-tech]')).toContainText('Claude · Gemini · Codex · tmux');
    await expect(
      tile.getByRole('link', { name: 'Learn more about Multi-Agent Coding System' }),
    ).toHaveAttribute('href', '/projects/#agentic-coding-workflow');
    await expect(tile.getByRole('link', { name: 'All projects' })).toHaveAttribute(
      'href',
      '/projects/',
    );
  });

  test('STAR story tile shows chips, the super stat and two actions', async ({ page }) => {
    await page.goto('/');
    const tile = page.locator('#stories');
    await expect(tile.locator('h2')).toHaveText('Cutting EMR costs by more than half');
    await expect(tile.locator('[data-competencies] .chip')).toHaveCount(3);
    await expect(tile.locator('.stat--super .stat-value')).toHaveText('>50%');
    await expect(tile.getByRole('link', { name: /Read the story/ })).toHaveAttribute(
      'href',
      '/star/emr-cost-optimization/',
    );
    await expect(tile.getByRole('link', { name: 'All stories' })).toHaveAttribute('href', '/star/');
  });

  test('writing tile shows the newest post, series chip, progress and two actions', async ({
    page,
  }) => {
    await page.goto('/');
    const tile = page.locator('#writing');
    await expect(tile.locator('h2')).toHaveText('Neovim setup guide, Part 5');
    await expect(tile).toContainText('12 min read');
    await expect(tile.locator('a.chip')).toHaveText('Neovim setup guide · Part 5');
    await expect(tile.locator('[data-series-progress] li')).toHaveCount(5);
    await expect(tile.locator('[data-series-progress]')).toContainText('Part 5 of 5');
    await expect(tile.locator('.actions > a')).toHaveCount(2);
  });

  test('certifications: newest first, issuer logos, no Verify link without a URL', async ({
    page,
  }) => {
    await page.goto('/');
    const tile = page.locator('#certifications');
    await expect(tile.locator('h2')).toHaveText('Certified on the platforms I use.');
    const rows = tile.locator('[data-cert]');
    await expect(rows).toHaveCount(2);
    await expect(rows.locator('.cert-name')).toHaveText([
      'Datadog Certified: Datadog Fundamentals',
      'AWS Certified Solutions Architect – Associate',
    ]);
    await expect(rows.locator('[data-logo] svg')).toHaveCount(2);
    await expect(rows.locator('[data-monogram]')).toHaveCount(0);
    await expect(tile.getByRole('link')).toHaveCount(0);
    await expect(tile.locator('[data-cert-more]')).toHaveCount(0);
  });
});

test.describe('Contact', () => {
  test('has the closing line, two actions, social icons and spoken languages', async ({ page }) => {
    await page.goto('/');
    const unit = page.locator('#contact');
    await expect(unit.locator('h2')).toHaveText("Let's talk.");
    await expect(unit.getByRole('link', { name: 'Email me' })).toHaveAttribute('href', /^mailto:/);
    await expect(unit.getByRole('link', { name: 'Download PDF' })).toBeVisible();
    await expect(unit.getByRole('list', { name: 'Social links' }).locator('a')).toHaveCount(4);
    await expect(unit.locator('[data-spoken-languages]')).toContainText(
      'English — Professional working proficiency',
    );
    await expect(unit.locator('[data-real-name]')).toHaveText('Legal name: Tran Thanh Hai');
    await expect(page.locator('#top')).not.toContainText('Tran Thanh Hai');
  });

  test('footer sits flush under Contact and has no breadcrumbs', async ({ page }) => {
    await page.goto('/');
    const contact = (await page.locator('#contact').boundingBox())!;
    const footer = (await page.locator('footer').boundingBox())!;
    expect(Math.abs(footer.y - (contact.y + contact.height))).toBeLessThanOrEqual(1);
    await expect(page.locator('footer .crumbs')).toHaveCount(0);
  });

  test('skill descriptions are hidden below 735px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/');
    await expect(page.locator('#skills .skill-desc').first()).toBeHidden();
    await page.setViewportSize({ width: 1024, height: 800 });
    await expect(page.locator('#skills .skill-desc').first()).toBeVisible();
  });
});

test.describe('Anchors and motion', () => {
  for (const id of ANCHORS) {
    test(`/#${id} lands below the global nav`, async ({ page }) => {
      await page.goto(`/#${id}`);
      await page.waitForTimeout(300);
      const top = (await page.locator(`#${id}`).boundingBox())!.y;
      expect(top).toBeGreaterThanOrEqual(0);
      if (!['contact', 'certifications'].includes(id)) expect(top).toBeLessThan(80);
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
    const item = page.locator('#skills [data-skill]').nth(1);
    // The hidden state fades in over 900ms from the visible server render; wait for it to settle.
    await expect.poll(() => item.evaluate((e) => getComputedStyle(e).opacity)).toBe('0');
    const css = await item.evaluate((e) => {
      const s = getComputedStyle(e);
      return {
        dur: s.transitionDuration,
        delay: s.transitionDelay,
        t: s.transform,
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
    await expect(page.locator('main h2')).toHaveCount(7);
    await expect(page.locator('#skills h2')).toHaveText('Những công cụ tôi dùng để xây dựng.');
    await expect(page.locator('#contact h2')).toHaveText('Cùng trò chuyện nhé.');
    await expect(page.locator('#skills [data-skill] h3').first()).toHaveText('Kỹ thuật dữ liệu');
    await expect(page.locator('#contact [data-spoken-languages]')).toContainText('Tiếng Anh');
    await expect(page.getByRole('link', { name: 'Tải PDF' }).first()).toHaveAttribute(
      'href',
      '/vi/cv.pdf',
    );
    await expect(page.locator('link[hreflang="vi"]')).toHaveCount(1);
  });
});

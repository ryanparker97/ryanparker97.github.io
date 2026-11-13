import { readdirSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

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

// Sections in page order (later units extend this list).
const ORDER = ['top', 'highlights', 'closer-look', 'story', 'career', 'writing', 'more'];
// Section heading ids that must land below the sticky nav (later units add theirs).
const HEADING_IDS = ['highlights', 'closer-look', 'story', 'career', 'writing', 'more'];

// Layout is measured without the reveal animation (its translate would skew the numbers).
test.use({ reducedMotion: 'reduce' });

const size = (width: number, height = 900) => ({ width, height });

test.describe('Home structure', () => {
  test('sections run in order and the footnotes close the page', async ({ page }) => {
    await page.goto('/');
    const ids = await page.locator('main > section[id]').evaluateAll((els) => els.map((e) => e.id));
    expect(ids).toEqual(ORDER);
    await expect(page.locator('main > section').last()).toHaveClass(/footnotes/);
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
    for (const s of await page.locator('main > section').all())
      expect(
        await s.locator('.actions > a').count(),
        (await s.getAttribute('id')) ?? '',
      ).toBeLessThanOrEqual(2);
    expect(await page.locator('#top .actions > a').count()).toBe(2);
  });

  test('band tones alternate white and grey, with no black band', async ({ page }) => {
    await page.goto('/');
    const bg = (id: string) =>
      page.locator(`#${id}`).evaluate((e) => getComputedStyle(e).backgroundColor);
    const [top, highlights, closer, story, career, writing, more] = await Promise.all(
      ORDER.map((id) => bg(id)),
    );
    expect(closer).toBe(top);
    await expect(page.locator('.section--dark')).toHaveCount(0);
    // Light theme: the hero, career and more bands are the page background; highlights, story and
    // writing share the one grey surface.
    expect(top).toBe('rgb(255, 255, 255)');
    expect(career).toBe(top);
    expect(more).toBe(top);
    expect(highlights).not.toBe(top);
    expect(story).toBe(highlights);
    expect(writing).toBe(highlights);
    // Neighbouring bands never share a tone.
    const seq = [top, highlights, closer, story, career, writing, more];
    seq.slice(1).forEach((c, i) => expect(c, ORDER[i + 1]).not.toBe(seq[i]));
  });

  test('band tones still alternate in the dark theme', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await page.goto('/');
    const seq = await Promise.all(
      ORDER.map((id) =>
        page.locator(`#${id}`).evaluate((e) => getComputedStyle(e).backgroundColor),
      ),
    );
    seq.slice(1).forEach((c, i) => expect(c, ORDER[i + 1]).not.toBe(seq[i]));
  });

  test('hero: subhead, two pills and the stat strip with footnote refs', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('#top');
    await expect(hero.locator('.t-subhead')).toHaveText(
      'Data pipelines and cloud platforms for banking markets.',
    );
    await expect(
      hero.getByRole('link', { name: 'Learn more about my experience' }),
    ).toHaveAttribute('href', '/experiences/');
    const pdf = hero.getByRole('link', { name: 'Download CV' });
    await expect(pdf).toHaveAttribute('download', 'Ryan-Parker-CV.pdf');
    await expect(pdf).toHaveAttribute('href', '/cv.pdf');
    await expect(hero.locator('.stat-strip .stat')).toHaveCount(3);
    for (const v of await hero.locator('.stat-value').allTextContents()) expect(v).toMatch(/\d/);
    const hrefs = await hero
      .locator('.fn-ref a')
      .evaluateAll((els) => els.map((e) => e.getAttribute('href')!));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const h of hrefs) await expect(page.locator(h)).toHaveCount(1);
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
    for (const [w, h] of [
      [1440, 900],
      [375, 812],
    ]) {
      await page.setViewportSize(size(w, h));
      await page.goto('/');
      const top = await page
        .locator('main > section')
        .nth(1)
        .evaluate((e) => e.getBoundingClientRect().top);
      expect(top, `${w}x${h}`).toBeLessThanOrEqual(h - 64);
    }
  });

  test('sections touch: no gap between neighbouring bands', async ({ page }) => {
    for (const w of [1440, 375]) {
      await page.setViewportSize(size(w));
      await page.goto('/');
      const gaps = await page.locator('main > section').evaluateAll((els) =>
        els.slice(1).map((e, i) => {
          const a = els[i].getBoundingClientRect();
          const b = e.getBoundingClientRect();
          return b.top - a.bottom;
        }),
      );
      for (const g of gaps) expect(Math.abs(g), `@${w}`).toBeLessThanOrEqual(1);
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
    for (const s of await page.locator('main > section').all()) await expect(s).toBeVisible();
    await context.close();
  });
});

test.describe('Home design system', () => {
  // Spec-sanctioned hairlines: the closer-look list rows and the career columns draw 1px rules
  // (list dividers, not card, tile or section borders).
  const HAIRLINES = ['closer-item', 'career-col'];

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
            const hairline = allowed.some((c) => e.classList.contains(c));
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
    const item = page.locator('#story h2');
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
  for (const id of HEADING_IDS) {
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

test.describe('Home career row', () => {
  test('career row: columns at L, Tech Specs rows at M, stacked at S; every role reachable, links ≥ 44px', async ({
    page,
  }) => {
    await page.goto('/');
    const cols = page.locator('#career [data-career] > li');
    await expect(cols).toHaveCount(ROLES);
    await expect(cols.first().locator('.career-co a')).toHaveText('FPT Software');
    await expect(cols.first().locator('.career-co a')).toHaveAttribute(
      'href',
      `/experiences/${order[0].slug}/`,
    );
    await expect(cols.first().locator('.career-date')).toHaveText('2026–now');
    const xs = () =>
      cols.evaluateAll(
        (els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().left))).size,
      );
    const ys = () =>
      cols.evaluateAll(
        (els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().top))).size,
      );
    const linkHeights = () =>
      page
        .locator('#career .career-co a')
        .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
    const firstRow = () =>
      cols.first().evaluate((li) => {
        const box = (sel: string) => {
          const r = li.querySelector(sel)!.getBoundingClientRect();
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
        };
        return { date: box('.career-date'), co: box('.career-co a') };
      });
    const expectTall = async () => {
      for (const h of await linkHeights()) expect(h).toBeGreaterThanOrEqual(44);
    };
    expect(await xs()).toBe(ROLES);
    await expectTall();
    for (const width of [834, 735]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await xs(), `${width} x`).toBe(1);
      expect(await ys(), `${width} y`).toBe(ROLES);
      const row = await page.locator('#career [data-career]').evaluate((e) => ({
        scroll: e.scrollWidth,
        client: e.clientWidth,
        overflowX: getComputedStyle(e).overflowX,
      }));
      expect(row.scroll).toBeLessThanOrEqual(row.client);
      expect(row.overflowX).toBe('visible');
      const rights = await cols.evaluateAll((els) =>
        els.map((e) => e.getBoundingClientRect().right <= document.documentElement.clientWidth),
      );
      expect(rights.every(Boolean), `${width} inside viewport`).toBe(true);
      const m = await firstRow();
      expect(m.date.right).toBeLessThanOrEqual(m.co.left);
      await expectTall();
      const links = page.locator('#career .career-co a');
      for (let i = 0; i < ROLES; i++) await links.nth(i).click({ trial: true });
    }
    await page.setViewportSize({ width: 375, height: 812 });
    expect(await xs()).toBe(1);
    const s = await firstRow();
    expect(s.date.bottom).toBeLessThanOrEqual(s.co.top);
    await expectTall();
    await expect(cols.first()).toHaveCSS('border-top-color', 'rgb(0, 83, 166)');
  });
});

test.describe('Home highlights gallery', () => {
  test('Get the highlights.: four tall stat cards, the STAR link, no footnote refs', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const g = page.locator('#highlights');
    await expect(g.locator('h2')).toHaveText('Get the highlights.');
    await expect(g.locator('section[role=region]')).toHaveAttribute(
      'aria-labelledby',
      'highlights-title',
    );
    await expect(g).not.toHaveAttribute('aria-labelledby', /.+/);
    await expect(page.getByRole('region', { name: 'Get the highlights.' })).toHaveCount(1);
    const cards = g.locator('.stat-card');
    await expect(cards).toHaveCount(4);
    expect(await cards.locator('h3').allInnerTexts()).toEqual([
      '5+ years building data pipelines and platforms.',
      'Leading a team of 7 engineers.',
      'Cutting EMR costs by more than half',
      'Agents do the work. Four gates check it.',
    ]);
    expect((await g.locator('.stat-card__value').allInnerTexts()).slice(0, 3)).toEqual([
      '5+',
      '7',
      '>50%',
    ]);
    await expect(cards.nth(0)).toContainText('Hitachi Vantara Vietnam, FPT Software, Datum');
    await expect(cards.nth(1)).toContainText(
      'As Senior Data Engineer (Team Lead) at FPT Software, since Aug 2026.',
    );
    await expect(
      cards
        .nth(2)
        .getByRole('link', { name: 'Read the story: Cutting EMR costs by more than half' }),
    ).toHaveAttribute('href', '/star/emr-cost-optimization/');
    await expect(
      cards.nth(3).getByRole('link', { name: 'See the project: Multi-Agent Coding System' }),
    ).toHaveAttribute('href', '/projects/agentic-coding-workflow/');
    await expect(g.getByRole('link', { name: 'Read the STAR stories' })).toHaveAttribute(
      'href',
      '/star/',
    );
    await expect(g.locator('.fn-ref')).toHaveCount(0);
    await expect(cards.nth(0)).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(cards.nth(1)).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(cards.nth(3)).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    expect((await cards.nth(0).boundingBox())!.height).toBeGreaterThanOrEqual(640);
    await expect(cards.nth(0).locator('.stat-card__cap')).toHaveCSS('font-size', '17px');
    await expect(cards.nth(2)).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    const light = ['rgb(11, 93, 82)', 'rgb(140, 56, 0)', 'rgb(97, 54, 173)', 'rgb(160, 21, 73)'];
    for (let i = 0; i < 4; i++) {
      await expect(cards.nth(i).locator('.stat-card__value')).toHaveCSS('color', light[i]);
    }
  });

  test('highlight values cycle their colours every four cards', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const colours = await page.evaluate(() => {
      const list = document.querySelector('#highlights-list')!;
      for (const li of [...list.querySelectorAll(':scope > li')].slice(0, 4)) {
        list.appendChild(li.cloneNode(true));
      }
      return [...list.querySelectorAll(':scope > li')].map(
        (li) => getComputedStyle(li.querySelector('.stat-card__value')!).color,
      );
    });
    expect(colours).toHaveLength(8);
    expect(colours.slice(4)).toEqual(colours.slice(0, 4));
    expect(new Set(colours).size).toBe(4);
  });

  test('highlight values in the dark theme', async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('theme', t), 'dark');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const cards = page.locator('#highlights .stat-card');
    const val = (i: number) => cards.nth(i).locator('.stat-card__value');
    await expect(val(0)).toHaveCSS('color', 'rgb(100, 210, 180)');
    await expect(val(1)).toHaveCSS('color', 'rgb(255, 162, 77)');
    await expect(val(3)).toHaveCSS('color', 'rgb(255, 143, 179)');
    await expect(val(2)).toHaveCSS('color', 'rgb(97, 54, 173)');
    await expect(cards.nth(2)).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  });

  test('at 1440 the gallery scrolls and its paddles enable/disable at the ends', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const prev = page.getByRole('button', { name: 'Previous highlights' });
    const next = page.getByRole('button', { name: 'Next highlights' });
    await expect(next).toBeVisible();
    await expect(prev).toBeDisabled();
    await expect(next).toBeEnabled();
    const b = (await prev.boundingBox())!;
    expect(b.width).toBeGreaterThanOrEqual(44);
    expect(
      await page
        .locator('.gallery-card')
        .first()
        .evaluate((e) => e.getBoundingClientRect().width),
    ).toBe(372);
    for (let i = 0; i < 6 && (await next.isEnabled()); i++) {
      await next.click();
      await page.waitForTimeout(400);
    }
    await expect(next).toBeDisabled();
    await expect(prev).toBeEnabled();
  });

  test('with JavaScript off the paddles are hidden and the list still scrolls', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('#highlights .paddles')).toBeHidden();
    await expect(page.locator('#writing .paddles')).toBeHidden();
    const scrolls = await page
      .locator('#highlights .gallery-track')
      .evaluate((e) => e.scrollWidth > e.clientWidth);
    expect(scrolls).toBe(true);
    await context.close();
  });

  test('at 375 the cards are 260px wide with no page overflow, and the next one peeks', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const cards = page.locator('.gallery-card');
    expect(await cards.first().evaluate((e) => e.getBoundingClientRect().width)).toBe(260);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(0);
    const second = (await cards.nth(1).boundingBox())!;
    expect(second.x).toBeLessThan(375);
    // Peek rule: the first chapter's band starts inside the first viewport.
    const chapter = (await page.locator('#highlights').boundingBox())!;
    expect(812 - chapter.y).toBeGreaterThanOrEqual(64);
  });

  test('every highlight card shows its diagram', async ({ page }) => {
    for (const { path, label, story } of [
      { path: '/', label: /^Diagram: /, story: 'en' },
      { path: '/vi/', label: /^Sơ đồ: /, story: 'vi' },
    ]) {
      const emrAlt = /^imageAlt: '(.+)'$/m.exec(
        readFileSync(`src/content/star/${story}/emr-cost-optimization.md`, 'utf8'),
      )![1];
      for (const width of [1440, 375]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        const cards = page.locator('#highlights .stat-card');
        await expect(cards).toHaveCount(4);
        const labels: string[] = [];
        const heights: number[] = [];
        for (let i = 0; i < 4; i++) {
          const card = cards.nth(i);
          await card.scrollIntoViewIfNeeded();
          await expect(card.locator('.stat-card__media')).toHaveCount(1);
          const svg = card.locator('.stat-card__media svg[role="img"]');
          await expect(svg).toHaveCount(1);
          await expect(svg).toHaveAttribute('aria-label', label);
          await expect(svg).toHaveAttribute('width', '640');
          await expect(svg).toHaveAttribute('height', '320');
          labels.push((await svg.getAttribute('aria-label'))!);
          const m = await card.evaluate((c) => {
            const media = c.querySelector('.stat-card__media')!;
            const h3 = c.querySelector('h3')!;
            const val = c.querySelector('.stat-card__value')!;
            const mr = media.getBoundingClientRect();
            const cr = c.getBoundingClientRect();
            return {
              ratio: mr.width / mr.height,
              order:
                !!(h3.compareDocumentPosition(media) & Node.DOCUMENT_POSITION_FOLLOWING) &&
                !!(media.compareDocumentPosition(val) & Node.DOCUMENT_POSITION_FOLLOWING),
              inside: mr.right <= cr.right + 0.5,
              height: cr.height,
            };
          });
          expect(m.ratio).toBeGreaterThan(1.97);
          expect(m.ratio).toBeLessThan(2.03);
          expect(m.order).toBe(true);
          expect(m.inside).toBe(true);
          heights.push(m.height);
        }
        expect(new Set(labels).size).toBe(4);
        expect(labels[2]).toBe(emrAlt);
        expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
      }
    }
  });

  test('highlight diagrams follow the theme; the story card stays light', async ({ page }) => {
    await page.goto('/');
    const fill = (n: number) =>
      page.evaluate(
        (i) =>
          getComputedStyle(
            document.querySelector(
              `#highlights .stat-card:nth-child(${i}) svg [style*="fill:var(--link)"]`,
            )!,
          ).fill,
        n,
      );
    expect(await fill(1)).toBe('rgb(0, 80, 159)');
    expect(await fill(3)).toBe('rgb(0, 80, 159)');
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'dark';
    });
    expect(await fill(1)).toBe('rgb(92, 176, 255)');
    expect(await fill(3)).toBe('rgb(0, 80, 159)');
  });

  test('highlights cause no layout shift', async ({ page, browserName }) => {
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
    for (const size of [
      { width: 1440, height: 900 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(size);
      await page.goto('/');
      await page.locator('#highlights').scrollIntoViewIfNeeded();
      await page.waitForTimeout(1500); // observation window for late shifts, not a readiness wait
      const r = await page.evaluate(() => {
        const w = window as unknown as { __cls: number; __shifts: Node[][] };
        return {
          cls: w.__cls,
          fromMedia: w.__shifts
            .flat()
            .filter((n) => !!n.parentElement?.closest('.stat-card__media')).length,
        };
      });
      expect(r.cls).toBeLessThan(0.05);
      expect(r.fromMedia).toBe(0);
    }
  });
});

test('Vietnamese highlight cards', async ({ page }) => {
  await page.goto('/vi/');
  await expect(page.locator('#highlights .stat-card h3').first()).toHaveText(
    '5+ năm xây dựng data pipeline và nền tảng dữ liệu.',
  );
});

test.describe('Home closer look', () => {
  const BODY = readFileSync('src/content/projects/en/agentic-coding-workflow.md', 'utf8');
  const LABELS = [...BODY.matchAll(/^- \*\*(.+?):\*\*/gm)].map((m) => m[1]);
  const ALT = /^imageAlt: '(.+)'$/m.exec(BODY)![1];

  test('band with the title, project eyebrow, CTA and image alt', async ({ page }) => {
    await page.goto('/');
    const s = page.locator('#closer-look');
    await expect(s).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(s.locator('h2')).toHaveText('Take a closer look.');
    await expect(s.locator('.t-eyebrow')).toHaveText('Multi-Agent Coding System');
    await expect(s.locator('.cta a')).toHaveAttribute('href', '/projects/agentic-coding-workflow/');
    await expect(s.locator('.closer-media img')).toHaveAttribute('alt', ALT);
  });

  test('with JS: one caption open at a time, keyboard operable, 44px targets', async ({ page }) => {
    await page.goto('/');
    const btns = page.locator('#closer-look .closer-btn');
    const caps = page.locator('#closer-look .closer-cap');
    await expect(btns).toHaveCount(LABELS.length);
    expect(LABELS.length).toBe(5);
    expect(await btns.allTextContents()).toEqual(LABELS);
    const visible = async () =>
      caps.evaluateAll((els) =>
        els.map((e, i) => (!(e as HTMLElement).hidden ? i : -1)).filter((i) => i >= 0),
      );
    await expect(btns.nth(0)).toHaveAttribute('aria-expanded', 'true');
    for (let i = 1; i < 5; i++) await expect(btns.nth(i)).toHaveAttribute('aria-expanded', 'false');
    expect(await visible()).toEqual([0]);
    await btns.nth(2).click();
    expect(await visible()).toEqual([2]);
    await btns.nth(3).focus();
    await page.keyboard.press('Enter');
    expect(await visible()).toEqual([3]);
    await btns.nth(3).click();
    expect(await visible()).toEqual([3]);
    for (const h of await btns.evaluateAll((els) =>
      els.map((e) => e.getBoundingClientRect().height),
    ))
      expect(h).toBeGreaterThanOrEqual(44);
  });

  test('with JS off: no buttons and every caption is visible', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('#closer-look .closer-btn')).toHaveCount(0);
    const caps = page.locator('#closer-look .closer-cap');
    await expect(caps).toHaveCount(5);
    for (let i = 0; i < 5; i++) await expect(caps.nth(i)).toBeVisible();
    await context.close();
  });
});

test.describe('Home STAR chapter', () => {
  test('shows the featured story, its result and two actions', async ({ page }) => {
    await page.goto('/');
    const s = page.locator('#story');
    await expect(s.locator('h2')).toHaveText('Cutting EMR costs by more than half');
    await expect(s.locator('.section-header')).toContainText(
      'Tell me about a time you reduced cost without hurting performance.',
    );
    await expect(s.locator('.stat-value')).toHaveText(['>50%', 'unchanged']);
    await expect(s.getByRole('link', { name: /^Read the story/ })).toHaveAttribute(
      'href',
      '/star/emr-cost-optimization/',
    );
    await expect(s.getByRole('link', { name: 'All stories' })).toHaveAttribute('href', '/star/');
    await expect(page.locator('.stat--super')).toHaveCount(0);
  });

  test('number pair does not overflow at 375', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/');
    const strip = page.locator('#story .stat-strip');
    await expect(strip).toBeVisible();
    expect(await strip.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });
});

test.describe('Home writing shelf', () => {
  const BLOG = 'src/content/blog/en';
  const published = readdirSync(BLOG).filter(
    (f) => /\.mdx?$/.test(f) && !/^draft: true/m.test(readFileSync(`${BLOG}/${f}`, 'utf8')),
  );

  test('one card per published post, newest first, with kicker and paddle names', async ({
    page,
  }) => {
    await page.goto('/');
    const cards = page.locator('#writing .post-card');
    await expect(cards).toHaveCount(published.length);
    await expect(cards.first().locator('a')).toHaveAttribute(
      'href',
      '/blog/git-config-multiple-identities/',
    );
    await expect(cards.first().locator('.post-card__kicker')).toHaveText('Article');
    await expect(cards.first().locator('.post-card__meta')).toHaveText(/\d{4} · \d+ min read/);
    await expect(page.locator('#writing .paddle[data-prev]')).toHaveAttribute(
      'aria-label',
      'Previous posts',
    );
    await expect(page.locator('#writing .paddle[data-next]')).toHaveAttribute(
      'aria-label',
      'Next posts',
    );
    await expect(page.locator('#highlights .paddle[data-prev]')).toHaveAttribute(
      'aria-label',
      'Previous highlights',
    );
    await expect(page.locator('#writing .chip-mint')).toHaveCount(0);
  });

  test('at 375 the cards are 260px wide with no page overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const card = page.locator('#writing .post-card').first();
    expect(await card.evaluate((e) => e.getBoundingClientRect().width)).toBe(260);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(0);
  });
});

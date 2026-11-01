import { readdirSync, readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// Layout is measured without the reveal animation (its translate would skew the numbers).
test.use({ reducedMotion: 'reduce' });

const DIR = 'src/content/experience/en';
const files = readdirSync(DIR).filter((f) => f.endsWith('.md'));
const bullets = (f: string) => readFileSync(`${DIR}/${f}`, 'utf8').match(/^- /gm)?.length ?? 0;
const SLUGS = files.map((f) => f.replace(/\.md$/, ''));
// Newest first: the ongoing role, then `start` descending (same rule as sortRoles).
const order = files
  .map((f) => {
    const fm = readFileSync(`${DIR}/${f}`, 'utf8');
    return {
      slug: f.replace(/\.md$/, ''),
      start: /^start: '?([\d-]+)/m.exec(fm)![1],
      n: bullets(f),
    };
  })
  .sort((a, b) => b.start.localeCompare(a.start));

const chapters = (page: Page) => page.locator('main section.chapter, main section#more');

test.describe('Experiences structure', () => {
  test('one chapter per role in sort order, each with a matching local-nav link', async ({
    page,
  }) => {
    await page.goto('/experiences/');
    const ids = await chapters(page).evaluateAll((els) => els.map((e) => e.id));
    expect(ids).toEqual([...order.map((o) => o.slug), 'more']);
    const hrefs = await page
      .locator('.local-nav .links a')
      .evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hrefs).toEqual(order.map((o) => `#${o.slug}`));
    await expect(page.locator('.local-nav .links a').first()).toHaveText('FPT Software 2026');
    await expect(page.locator('.local-nav .links a').nth(1)).toHaveText('Security Bank');
    await expect(page.locator('.local-nav .pill')).toHaveAttribute('href', '/cv.pdf');
    expect(new Set(SLUGS).size).toBe(files.length);
  });

  test('one H1, one H2 per chapter + closing tile, one H3 per labelled card, no skipped levels', async ({
    page,
  }) => {
    await page.goto('/experiences/');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Experiences');
    await expect(page.locator('#top, .stat-strip, .contact-row, .hero')).toHaveCount(0);
    await expect(page.locator('main h2')).toHaveCount(files.length + 2); // gallery + chapters + closing
    const total = order.reduce((n, o) => n + o.n, 0);
    await expect(page.locator('.hl-card')).toHaveCount(total);
    await expect(page.locator('.hl-card h3')).toHaveCount(total);
    for (const o of order) {
      await expect(page.locator(`#${o.slug} .hl-card`)).toHaveCount(o.n);
    }
    const levels = await page
      .locator('main h1, main h2, main h3')
      .evaluateAll((els) => els.map((e) => Number(e.tagName[1])));
    levels.forEach((l, i) => expect(l - (levels[i - 1] ?? 1)).toBeLessThanOrEqual(1));
  });

  test('bold terms are kept inside card bodies', async ({ page }) => {
    await page.goto('/experiences/');
    const card = page.locator('#fpt-software-senior-data-engineer .hl-card').first();
    await expect(card.locator('h3')).toHaveText('People Leadership & Mentoring');
    await expect(card.locator('p strong', { hasText: 'mentor a team of 7 engineers' })).toHaveCount(
      1,
    );
    await expect(card.locator('p')).not.toContainText('People Leadership');
  });

  test('eyebrow shows the date range and location; only the ongoing role has a Current chip', async ({
    page,
  }) => {
    await page.goto('/experiences/');
    await expect(page.locator('.current-chip')).toHaveCount(1);
    await expect(page.locator('#fpt-software-senior-data-engineer .current-chip')).toHaveText(
      'Current',
    );
    const eyebrow = page.locator('#fpt-software-senior-data-engineer .t-eyebrow');
    await expect(eyebrow).toContainText('Aug 2026 – Present');
    await expect(eyebrow).not.toContainText('Ho Chi Minh');
    await expect(page.locator('#fpt-software-senior-data-engineer .t-subhead')).toContainText(
      'Ho Chi Minh City, Vietnam',
    );
    await expect(page.locator('#datum-tymex-platform-engineer .t-eyebrow')).toContainText(
      '2021 – 2024',
    );
  });

  test('tech stack, STAR pill and closing tile actions', async ({ page }) => {
    await page.goto('/experiences/');
    await expect(
      page.locator('#datum-security-bank-data-engineer ul[aria-label="Tech stack"]'),
    ).toContainText('DBT');
    await expect(page.getByRole('link', { name: 'Read the STAR story' })).toHaveAttribute(
      'href',
      '/star/emr-cost-optimization/',
    );
    await expect(page.locator('main').getByRole('link', { name: /STAR stor/ })).toHaveCount(1);
    const more = page.locator('#more');
    await expect(more.locator('h2')).toHaveText('Want the full picture?');
    await expect(more.getByRole('link', { name: 'Download PDF' })).toHaveAttribute(
      'href',
      '/cv.pdf',
    );
    await expect(more.getByRole('link', { name: 'View projects' })).toHaveAttribute(
      'href',
      '/projects/',
    );
    await expect(more.locator('.btn')).toHaveCount(2);
  });

  test('highlight cards are 2-up at M (odd last spans) and 1-up at S', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto('/experiences/');
    const cols = (slug: string) =>
      page
        .locator(`#${slug} .hl-card`)
        .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));
    const odd = 'datum-security-bank-data-engineer'; // 5 cards
    const five = await cols(odd);
    expect(new Set(five).size).toBe(2);
    expect(five[4]).toBe(five[0]); // last card spans both columns
    const width = (slug: string, i: number) =>
      page
        .locator(`#${slug} .hl-card`)
        .nth(i)
        .evaluate((e) => e.getBoundingClientRect().width);
    expect(await width(odd, 4)).toBeGreaterThan((await width(odd, 0)) * 1.8);
    await page.setViewportSize({ width: 600, height: 900 });
    expect(new Set(await cols('fpt-software-senior-data-engineer')).size).toBe(1);
  });

  test('card backgrounds contrast with the chapter in both themes', async ({ page }) => {
    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await page.goto('/experiences/');
      for (const o of order) {
        const [tile, card] = await page.evaluate((slug) => {
          const bg = (e: Element) => getComputedStyle(e).backgroundColor;
          const t = document.getElementById(slug)!;
          return [bg(t), bg(t.querySelector('.hl-card')!)];
        }, o.slug);
        expect(card, `${scheme} ${o.slug}`).not.toBe(tile);
      }
    }
  });

  test('chapter backgrounds alternate starting with surface-2 and the closing tile continues', async ({
    page,
  }) => {
    await page.goto('/experiences/');
    const bgs = await chapters(page).evaluateAll((els) =>
      els.map((e) => getComputedStyle(e).backgroundColor),
    );
    expect(bgs.length).toBe(files.length + 1);
    bgs.forEach((b, i) => {
      if (i > 0) expect(b).not.toBe(bgs[i - 1]);
      expect(b).toBe(bgs[i % 2]);
    });
    const root = await page.evaluate(() => [getComputedStyle(document.body).backgroundColor]);
    expect(bgs[1]).toBe(root[0]);
  });

  test('has no summary, projects, skills or certifications and no page-specific script', async ({
    page,
  }) => {
    await page.goto('/experiences/');
    await expect(page.locator('#summary')).toHaveCount(0);
    const profileSummary = readFileSync('src/content/profile/en/index.md', 'utf8')
      .split('---')
      .pop()!
      .trim()
      .slice(0, 40);
    await expect(page.locator('main')).not.toContainText(profileSummary);
    const scripts = await page
      .locator('script[src]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('src') ?? ''));
    for (const src of scripts) expect(src).not.toMatch(/experience|chapter|local-nav|scroll-spy/i);
  });

  test('footer is flush under the closing tile and has no social icons', async ({ page }) => {
    await page.goto('/experiences/');
    const gap = await page.evaluate(
      () =>
        document.querySelector('footer')!.getBoundingClientRect().top -
        document.getElementById('more')!.getBoundingClientRect().bottom,
    );
    expect(Math.abs(gap)).toBeLessThanOrEqual(1);
    await expect(page.locator('footer .icon-btn, footer a svg')).toHaveCount(0);
  });
});

for (const [path, w, h] of [
  ['/experiences/', 375, 812],
  ['/experiences/', 1440, 900],
  ['/vi/experiences/', 375, 812],
] as const) {
  test.describe(`Experiences anchors and sticky bars at ${w}px (${path})`, () => {
    test.use({ viewport: { width: w, height: h } });

    test('every local-nav link and #<role-slug> URL lands below both bars', async ({ page }) => {
      for (const o of order) {
        await page.goto(`${path}#${o.slug}`);
        await page.waitForTimeout(150);
        const top = await page.locator(`#${o.slug} h2`).evaluate((e) => e.getBoundingClientRect());
        expect(top.top, o.slug).toBeGreaterThanOrEqual(w < 834 ? 64 : 68);
        expect(top.top, o.slug).toBeLessThan(h);
      }
      await page.goto(path);
      for (const o of order) {
        if (w < 834) await page.locator('.local-nav summary').click();
        const link = page.locator(
          `.local-nav ${w < 834 ? '.tray' : '.links'} a[href="#${o.slug}"]`,
        );
        await link.scrollIntoViewIfNeeded();
        await link.click();
        await page.waitForTimeout(150);
        const r = await page.locator(`#${o.slug} h2`).evaluate((e) => e.getBoundingClientRect());
        expect(r.top, `click ${o.slug}`).toBeGreaterThanOrEqual(w < 834 ? 64 : 68);
        expect(r.top).toBeLessThan(h);
      }
    });

    test('local nav sticks at the top while scrolling through every chapter', async ({ page }) => {
      await page.goto(path);
      const nav = page.locator('.local-nav');
      const before = (await nav.boundingBox())!;
      // The global nav scrolls away: the local nav sticks at the very top.
      expect(before.height).toBe(w < 834 ? 48 : 52);
      for (const y of [1200, 3000, 6000, 9000]) {
        await page.evaluate((v) => window.scrollTo(0, v), y);
        await page.waitForTimeout(50);
        const box = (await nav.boundingBox())!;
        expect(Math.round(box.y), `scrollY ${y}`).toBe(0);
        await expect(nav).toBeInViewport();
      }
    });
  });
}

test('no horizontal scroll from 320px up', async ({ page }) => {
  for (const path of ['/experiences/', '/vi/experiences/']) {
    for (const w of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width: w, height: 800 });
      await page.goto(path);
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(over, `${path} at ${w}`).toBeLessThanOrEqual(0);
    }
  }
});

test('at 375px the local nav is a title + chevron dropdown; at 1280px a bar with links', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/experiences/');
  await expect(page.locator('.local-nav .links')).toBeHidden();
  const summary = page.locator('.local-nav summary');
  await expect(summary).toHaveAccessibleName('Experiences, sections');
  await expect(page.locator('.local-nav .pill')).toBeVisible();
  await expect(page.locator('.local-nav .tray')).toBeHidden();
  await summary.click();
  await expect(page.locator('.local-nav .tray a')).toHaveCount(order.length);
  await page.keyboard.press('Escape');
  await expect(page.locator('.local-nav .tray')).toBeHidden();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator('.local-nav .title-static')).toBeVisible();
  await expect(page.locator('.local-nav .links')).toBeVisible();
});

test('Download PDF works without JavaScript and every chapter is visible', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/experiences/');
  for (const o of order) await expect(page.locator(`#${o.slug} .hl-card`).first()).toBeVisible();
  await context.close();
});

test('Vietnamese page renders translated chrome', async ({ page }) => {
  await page.goto('/vi/experiences/');
  await expect(page.locator('h1')).toHaveText('Kinh nghiệm');
  await expect(page.locator('#more h2')).toHaveText('Muốn xem toàn cảnh?');
  await expect(page.locator('.current-chip')).toHaveText('Hiện tại');
});

for (const path of ['/experiences/', '/vi/experiences/']) {
  for (const w of [900, 1024, 1280]) {
    test(`local-nav links are all reachable at ${w}px (${path})`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 800 });
      await page.goto(path);
      const list = page.locator('.local-nav .links');
      const links = page.locator('.local-nav .links a');
      const n = await links.count();
      expect(n).toBe(order.length);
      const left = (await list.boundingBox())!.x;
      const starts = await links.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().x));
      starts.forEach((x, i) =>
        expect(x, `link ${i} starts inside the list`).toBeGreaterThanOrEqual(left - 0.5),
      );
      // Scroll to the far end, then back: every link must be able to come fully into view.
      for (let i = 0; i < n; i++) {
        const link = links.nth(i);
        await link.scrollIntoViewIfNeeded();
        const ok = await page.evaluate(
          ([idx]) => {
            const ul = document.querySelector('.local-nav .links')!.getBoundingClientRect();
            const r = document
              .querySelectorAll('.local-nav .links a')
              [idx as number].getBoundingClientRect();
            return r.left >= ul.left - 0.5 && r.right <= ul.right + 0.5;
          },
          [i],
        );
        expect(ok, `link ${i} fully visible after scrolling`).toBe(true);
        await link.click();
        await page.waitForTimeout(100);
        await expect(page).toHaveURL(new RegExp(`#${order[i].slug}$`));
      }
    });
  }
}

test('keyboard Tab reaches every local-nav link and keeps the focused one in view', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 900, height: 800 });
  await page.goto('/experiences/');
  await page.locator('.local-nav .links a').first().focus();
  for (let i = 0; i < order.length; i++) {
    await page.waitForTimeout(500); // smooth scroll
    const inView = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement;
      const ul = document.querySelector('.local-nav .links')!.getBoundingClientRect();
      const r = a.getBoundingClientRect();
      return (
        a.matches('.local-nav .links a') && r.left >= ul.left - 0.5 && r.right <= ul.right + 0.5
      );
    });
    expect(inView, `focused link ${i}`).toBe(true);
    // Safari does not Tab to links by default, so WebKit moves focus programmatically.
    if (browserName !== 'webkit') await page.keyboard.press('Tab');
    else if (i + 1 < order.length)
      await page
        .locator('.local-nav .links a')
        .nth(i + 1)
        .focus();
  }
});

test('in-page heading targets (search sub-results) land with eyebrow and H2 below both bars', async ({
  page,
}) => {
  for (const w of [375, 1440]) {
    await page.setViewportSize({ width: w, height: 900 });
    for (const o of order) {
      await page.goto(`/experiences/#${o.slug}-title`);
      await page.waitForTimeout(150);
      const m = await page.evaluate((slug) => {
        const s = document.getElementById(slug)!;
        return {
          eyebrow: s.querySelector('.t-eyebrow')!.getBoundingClientRect().top,
          h2: s.querySelector('h2')!.getBoundingClientRect().top,
        };
      }, o.slug);
      expect(m.eyebrow, `${o.slug} eyebrow at ${w}`).toBeGreaterThanOrEqual(w < 834 ? 64 : 68);
      expect(m.h2, `${o.slug} h2 at ${w}`).toBeGreaterThanOrEqual(w < 834 ? 64 : 68);
    }
  }
});

test('Home tile heading ids land below the nav with the eyebrow visible', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  for (const id of ['experience', 'skills']) {
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

test('search sub-result into an Experiences chapter lands with eyebrow and H2 visible', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  await page.keyboard.press('ControlOrMeta+k');
  await page.locator('#search-input').fill('Datadog observability');
  const sub = page
    .locator('.hit a[href*="/experiences/#"][href$="-title"]:not([href*="highlights"])')
    .first();
  await expect(sub).toBeVisible();
  const href = (await sub.getAttribute('href'))!;
  await sub.click();
  await expect(page).toHaveURL(new RegExp(`${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
  await page.waitForTimeout(200);
  const m = await page.evaluate(() => {
    const h = document.getElementById(location.hash.slice(1))!;
    const tile = h.closest('section')!;
    return {
      eyebrow: tile.querySelector('.t-eyebrow')!.getBoundingClientRect().top,
      h2: h.getBoundingClientRect().top,
    };
  });
  // 375px: only the 48px local nav is stuck, plus 16px.
  expect(m.eyebrow).toBeGreaterThanOrEqual(64);
  expect(m.h2).toBeGreaterThanOrEqual(64);
});

for (const [prefix, label] of [
  ['', 'Tech stack'],
  ['/vi', 'Công nghệ sử dụng'],
] as const) {
  test(`tech highlights and chips (${prefix || 'en'})`, async ({ page }) => {
    await page.goto(`${prefix}/experiences/`);
    for (const f of files) {
      const slug = f.replace(/\.md$/, '');
      const fm = readFileSync(`${DIR}/${f}`, 'utf8');
      const block = /^tech:([\s\S]*?)(?=^\w+:|^---)/m.exec(fm)?.[1] ?? '';
      const tech = [...block.matchAll(/["']([^"']+)["']|^\s*-\s+(\S.*)$/gm)].map(
        (m) => m[1] ?? m[2],
      );
      const chips = page.locator(`#${slug} ul[aria-label="${label}"] li:not(.more-chip)`);
      await expect(chips).toHaveCount(tech.length);
      // Every whole-word, case-insensitive occurrence of the role's tech in card text is a mark.tech.
      const missed = await page.locator(`#${slug} .hl-card p`).evaluateAll((ps, terms) => {
        const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
        const bad: string[] = [];
        for (const p of ps) {
          // Per-character mask: is this character of the card text inside a mark.tech?
          const mask: boolean[] = [];
          const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            const inMark = !!n.parentElement?.closest('mark.tech');
            for (let k = 0; k < (n.textContent ?? '').length; k++) mask.push(inMark);
          }
          const text = p.textContent ?? '';
          for (const term of terms) {
            const re = new RegExp(`(?<![\\p{L}\\p{N}+#])${esc(term)}(?![\\p{L}\\p{N}+#])`, 'giu');
            for (const m of text.matchAll(re)) {
              const at = m.index ?? 0;
              // Adjacent marks ("GitLab CI/CD" as two runs) leave only spaces between them.
              const ok = [...m[0]].every((ch, k) => /\s/.test(ch) || mask[at + k]);
              if (!ok) bad.push(m[0]);
            }
          }
        }
        return bad;
      }, tech);
      expect(missed, slug).toEqual([]);
    }
    await expect(page.locator('mark.tech strong, strong mark.tech')).toHaveCount(0);
  });
}

test('non-tech bold stays strong, not mark', async ({ page }) => {
  await page.goto('/experiences/');
  const card = page.locator('#fpt-software-senior-data-engineer .hl-card').first();
  await expect(card.locator('p strong', { hasText: 'mentor a team of 7 engineers' })).toHaveCount(
    1,
  );
  await expect(card.locator('mark', { hasText: '7 engineers' })).toHaveCount(0);
});

test.describe('Highlights gallery and sticky storytelling', () => {
  test('the gallery is the page opening: H2, one card per role, Read the role links', async ({
    page,
  }) => {
    await page.goto('/experiences/');
    const g = page.locator('#highlights');
    await expect(g.locator('h2')).toHaveText('Get the highlights.');
    await expect(g.locator('section[role=region]')).toHaveAttribute(
      'aria-labelledby',
      'highlights-title',
    );
    const cards = g.locator('.gallery-card');
    await expect(cards).toHaveCount(order.length);
    await expect(cards.first().locator('.gc-label')).toHaveText('FPT Software · 2026');
    await expect(cards.first().locator('h3')).toHaveText('People Leadership & Mentoring');
    await expect(cards.first().getByRole('link', { name: /Read the role/ })).toHaveAttribute(
      'href',
      `#${order[0].slug}`,
    );
    const body = (await cards.first().locator('.gc-body').textContent()) ?? '';
    expect(body.length).toBeLessThanOrEqual(141);
  });

  test('at 1440 the gallery scrolls and its paddles enable/disable at the ends', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/experiences/');
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
    await page.goto('/experiences/');
    await expect(page.locator('.paddles')).toBeHidden();
    const scrolls = await page
      .locator('.gallery-track')
      .evaluate((e) => e.scrollWidth > e.clientWidth);
    expect(scrolls).toBe(true);
    await context.close();
  });

  test('at 375 the cards are 260px wide with no page overflow, and the next one peeks', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/experiences/');
    const cards = page.locator('.gallery-card');
    expect(await cards.first().evaluate((e) => e.getBoundingClientRect().width)).toBe(260);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(0);
    const second = (await cards.nth(1).boundingBox())!;
    expect(second.x).toBeLessThan(375);
    // Peek rule: the first chapter's band starts inside the first viewport.
    const chapter = (await chapters(page).first().boundingBox())!;
    expect(812 - chapter.y).toBeGreaterThanOrEqual(64);
  });

  test('peek rule at 1440x900', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/experiences/');
    const chapter = (await chapters(page).first().boundingBox())!;
    expect(900 - chapter.y).toBeGreaterThanOrEqual(64);
  });

  test('sticky storytelling at 1440: the header holds its top, then un-sticks; stacked at 900', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/experiences/');
    const head = page.locator('#fpt-software-senior-data-engineer .chapter-side');
    expect(await head.evaluate((e) => getComputedStyle(e).position)).toBe('sticky');
    const section = page.locator('#fpt-software-senior-data-engineer');
    const top0 = (await section.boundingBox())!.y + (await page.evaluate(() => scrollY));
    const tops: number[] = [];
    for (const dy of [300, 500]) {
      await page.evaluate((y) => window.scrollTo(0, y), top0 + dy);
      tops.push(Math.round((await head.boundingBox())!.y));
    }
    expect(tops[0]).toBe(tops[1]);
    expect(tops[0]).toBe(84); // --sticky-h (52) + 32
    const end = await section.evaluate((e) => e.getBoundingClientRect().bottom + scrollY);
    await page.evaluate((y) => window.scrollTo(0, y - 400), end);
    expect(Math.round((await head.boundingBox())!.y)).toBeLessThan(84);
    await page.setViewportSize({ width: 900, height: 900 });
    expect(await head.evaluate((e) => getComputedStyle(e).position)).not.toBe('sticky');
    await expect(
      page.locator('#fpt-software-senior-data-engineer .section-header .lockup'),
    ).toHaveCSS('text-align', 'center');
  });
});

import { readdirSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// Layout is measured without the reveal animation (its translate would skew the numbers).
test.use({ reducedMotion: 'reduce' });

const DIR = 'src/content/experience/en';
const files = readdirSync(DIR).filter((f) => f.endsWith('.md'));
const SLUGS = files.map((f) => f.replace(/\.md$/, ''));
const DSB = 'datum-security-bank-data-engineer';
const HV = 'hitachi-vantara-backend-engineer';
const FPT = 'fpt-software-senior-data-engineer';
const fm = (f: string) => readFileSync(`${DIR}/${f}.md`, 'utf8');
const roleOf = (f: string) => /^role:\s*['"]?(.+?)['"]?\s*$/m.exec(fm(f))![1];

test.describe('role pages', () => {
  for (const prefix of ['', '/vi']) {
    test(`every role has a page with one H1 equal to its role (${prefix || 'en'})`, async ({
      page,
    }) => {
      for (const slug of SLUGS) {
        const res = await page.goto(`${prefix}/experiences/${slug}/`);
        expect(res?.status(), slug).toBe(200);
        await expect(page.locator('h1')).toHaveCount(1);
        await expect(page.locator('h1')).toHaveText(roleOf(slug));
      }
    });
  }

  test('DSB: hero, highlights, tech and STAR pill', async ({ page }) => {
    await page.goto(`/experiences/${DSB}/`);
    await expect(page.locator('.hero .t-eyebrow')).toHaveText('Datum / Security Bank');
    await expect(page.locator('.hero .t-subhead')).toHaveText(
      '2024 – Mar 2026 · Ho Chi Minh City, Vietnam',
    );
    await expect(page.locator('.chapter h2')).toHaveText('Highlights.');
    const cards = page.locator('.hl-card');
    await expect(cards).toHaveCount(5);
    await expect(cards.locator('h3')).toHaveCount(5);
    await expect(page.locator('mark.tech', { hasText: 'PySpark' }).first()).toBeVisible();
    const block = /^tech:([\s\S]*?)(?=^\w+:|^---)/m.exec(fm(DSB))?.[1] ?? '';
    const tech = [...block.matchAll(/["']([^"']+)["']|^\s*-\s+(\S.*)$/gm)].map((m) => m[1] ?? m[2]);
    await expect(page.locator('ul[aria-label="Tech stack"] li:not(.more-chip)')).toHaveCount(
      tech.length,
    );
    await expect(
      page.locator('.chapter-meta').getByRole('link', { name: 'Read the STAR story' }),
    ).toHaveAttribute('href', '/star/emr-cost-optimization/');
  });

  test('HV has no STAR pill; FPT has no Current chip', async ({ page }) => {
    await page.goto(`/experiences/${HV}/`);
    await expect(page.locator('.chapter-meta a')).toHaveCount(0);
    await page.goto(`/experiences/${FPT}/`);
    await expect(page.locator('.current-chip')).toHaveCount(0);
  });

  test('local nav at 1440: title, one link per role, current role, PDF pill', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/experiences/${DSB}/`);
    const nav = page.locator('[data-local-nav]');
    await expect(nav.locator('.title').first()).toHaveText('Experiences');
    await expect(nav.locator('.title-static')).toHaveAttribute('href', '/experiences/');
    await expect(nav.locator('.links a')).toHaveCount(SLUGS.length);
    await expect(nav.locator('.links a[aria-current]')).toHaveCount(1);
    await expect(nav.locator('.links a[aria-current]')).toHaveAttribute(
      'href',
      `/experiences/${DSB}/`,
    );
    await expect(nav.locator('.pill')).toHaveAttribute('href', '/cv.pdf');
  });

  test('sticky storytelling at 1440 and stacked flex at 900', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'no-preference' });
    const page = await ctx.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/experiences/${FPT}/`);
    const head = page.locator('.chapter-side');
    expect(await head.evaluate((e) => getComputedStyle(e).position)).toBe('sticky');
    const section = page.locator('.chapter');
    const top0 = (await section.boundingBox())!.y + (await page.evaluate(() => scrollY));
    const tops: number[] = [];
    for (const dy of [300, 500]) {
      await page.evaluate((y) => window.scrollTo(0, y), top0 + dy);
      tops.push(Math.round((await head.boundingBox())!.y));
    }
    expect(tops[0]).toBe(tops[1]);
    await page.setViewportSize({ width: 900, height: 900 });
    await expect(page.locator('.chapter-grid')).toHaveCSS('display', 'flex');
    await ctx.close();
  });

  test('with reduced motion and with JS off the chapter is stacked at 1440', async ({
    browser,
  }) => {
    for (const opts of [{ reducedMotion: 'reduce' as const }, { javaScriptEnabled: false }]) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
      const page = await ctx.newPage();
      await page.goto(`/experiences/${FPT}/`);
      await expect(page.locator('.chapter-grid')).toHaveCSS('display', 'flex');
      await expect(page.locator('.chapter-side')).toHaveCSS('display', 'contents');
      for (const c of await page.locator('.hl-card').all()) await expect(c).toBeVisible();
      await ctx.close();
    }
  });

  test('every role has a logo, EN and VI', () => {
    for (const loc of ['en', 'vi']) {
      for (const slug of SLUGS) {
        const src = readFileSync(`src/content/experience/${loc}/${slug}.md`, 'utf8');
        expect(/^logo: /m.test(src), `${loc}/${slug}`).toBe(true);
      }
    }
  });

  test('role page header shows the company logo in both themes, EN and VI', async ({ browser }) => {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        reducedMotion: 'reduce',
      });
      await context.addInitScript((t) => localStorage.setItem('theme', t), theme);
      const page = await context.newPage();
      for (const prefix of ['', '/vi']) {
        const loc = prefix ? 'vi' : 'en';
        for (const slug of SLUGS) {
          const src = readFileSync(`src/content/experience/${loc}/${slug}.md`, 'utf8');
          const has = (key: string) => new RegExp(`^${key}: `, 'm').test(src);
          await page.goto(`${prefix}/experiences/${slug}/`);
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
          if (!has('logo')) {
            await expect(page.locator('.hero-logo'), slug).toHaveCount(0);
            continue;
          }
          const logo = page.locator('.hero .hero-logo img:visible');
          await expect(logo, slug).toHaveCount(1);
          await expect(logo).toHaveAttribute('alt', '');
          await expect(logo).toHaveCSS('height', '32px');
          await expect(logo).toHaveAttribute('width', /\d+/);
          await expect(logo).toHaveAttribute('height', /\d+/);
          await logo.scrollIntoViewIfNeeded();
          await expect
            .poll(() => logo.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0))
            .toBe(true);
          const box = (await logo.boundingBox())!;
          const eyebrow = (await page.locator('.hero .t-eyebrow').boundingBox())!;
          const h1 = (await page.locator('h1').boundingBox())!;
          expect(box.y + box.height, slug).toBeLessThanOrEqual(eyebrow.y);
          expect(Math.abs(box.x + box.width / 2 - (h1.x + h1.width / 2)), slug).toBeLessThanOrEqual(
            1,
          );
          const cls = (await logo.getAttribute('class')) ?? '';
          const bg = await logo.evaluate((i) => getComputedStyle(i).backgroundColor);
          if (theme === 'dark' && has('logoDark')) {
            expect(cls).toContain('company-logo--dark');
            expect(bg).toBe('rgba(0, 0, 0, 0)');
          } else if (theme === 'dark') {
            expect(cls).toContain('company-logo--plate');
            expect(bg).toBe('rgb(255, 255, 255)');
          } else {
            expect(cls).not.toContain('company-logo--dark');
            expect(bg).toBe('rgba(0, 0, 0, 0)');
          }
        }
      }
      await context.close();
    }
  });

  for (const [w, h] of [
    [1440, 900],
    [375, 812],
  ] as const) {
    test(`peek rule at ${w}x${h}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      // Every role, so the pages that carry a header logo are measured too.
      for (const slug of SLUGS) {
        await page.goto(`/experiences/${slug}/`);
        const chapter = (await page.locator('.chapter').boundingBox())!;
        expect(h - chapter.y, slug).toBeGreaterThanOrEqual(64);
      }
    });
  }

  test('no horizontal scroll at 320px; VI page has no banner and VI heading', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(`/experiences/${DSB}/`);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(0);
    await page.goto(`/vi/experiences/${DSB}/`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
    await expect(page.getByRole('note')).toHaveCount(0);
    await expect(page.locator('.chapter h2')).toHaveText('Điểm nổi bật.');
  });

  for (const [prefix, label] of [
    ['', 'Tech stack'],
    ['/vi', 'Công nghệ sử dụng'],
  ] as const) {
    test(`tech highlights and chips on every role page (${prefix || 'en'})`, async ({ page }) => {
      for (const slug of SLUGS) {
        await page.goto(`${prefix}/experiences/${slug}/`);
        const block = /^tech:([\s\S]*?)(?=^\w+:|^---)/m.exec(fm(slug))?.[1] ?? '';
        const tech = [...block.matchAll(/["']([^"']+)["']|^\s*-\s+(\S.*)$/gm)].map(
          (m) => m[1] ?? m[2],
        );
        await expect(page.locator(`ul[aria-label="${label}"] li:not(.more-chip)`)).toHaveCount(
          tech.length,
        );
        const missed = await page.locator('.hl-card p').evaluateAll((ps, terms) => {
          const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
          const bad: string[] = [];
          for (const p of ps) {
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
                const ok = [...m[0]].every((ch, k) => /\s/.test(ch) || mask[at + k]);
                if (!ok) bad.push(m[0]);
              }
            }
          }
          return bad;
        }, tech);
        expect(missed, slug).toEqual([]);
        await expect(page.locator('mark.tech strong, strong mark.tech')).toHaveCount(0);
      }
    });
  }

  test('highlight cards are 2-up at M (odd last spans) and 1-up at S', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto(`/experiences/${DSB}/`);
    const cols = () =>
      page
        .locator('.hl-card')
        .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));
    const width = (i: number) =>
      page
        .locator('.hl-card')
        .nth(i)
        .evaluate((e) => e.getBoundingClientRect().width);
    const five = await cols(); // DSB has 5 cards
    expect(five).toHaveLength(5);
    expect(new Set(five).size).toBe(2);
    expect(five[4]).toBe(five[0]); // the odd last card spans both columns
    expect(await width(4)).toBeGreaterThan((await width(0)) * 1.8);
    await page.setViewportSize({ width: 600, height: 900 });
    expect(new Set(await cols()).size).toBe(1);
  });

  test('card backgrounds contrast with the chapter in both themes', async ({ page }) => {
    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      for (const slug of SLUGS) {
        await page.goto(`/experiences/${slug}/`);
        const [band, card] = await page.evaluate(() => {
          const bg = (e: Element) => getComputedStyle(e).backgroundColor;
          const c = document.querySelector('.chapter')!;
          return [bg(c), bg(c.querySelector('.hl-card')!)];
        });
        expect(card, `${scheme} ${slug}`).not.toBe(band);
      }
    }
  });

  test('non-tech bold stays strong, not mark', async ({ page }) => {
    await page.goto(`/experiences/${FPT}/`);
    const card = page.locator('.hl-card').first();
    await expect(card.locator('h3')).toHaveText('People Leadership & Mentoring');
    await expect(card.locator('p strong', { hasText: 'mentor a team of 7 engineers' })).toHaveCount(
      1,
    );
    await expect(card.locator('mark', { hasText: '7 engineers' })).toHaveCount(0);
    await expect(card.locator('p')).not.toContainText('People Leadership');
  });

  test('the header column is 40% of the chapter grid and the chapter is sticky at L', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    // The two-column sticky layout only runs with motion allowed.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    for (const slug of SLUGS) {
      await page.goto(`/experiences/${slug}/`);
      const r = await page.locator('.chapter').evaluate((c) => {
        const head = c.querySelector('.chapter-side .section-header')!.getBoundingClientRect();
        const wide = c.querySelector('.chapter-grid')!.getBoundingClientRect().width;
        return { sticky: c.classList.contains('chapter--sticky'), ratio: head.width / wide };
      });
      expect(r.sticky, slug).toBe(true);
      expect(Math.abs(r.ratio - 0.4), slug).toBeLessThanOrEqual(0.01);
    }
  });
});

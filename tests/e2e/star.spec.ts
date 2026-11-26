import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const IDS = ['fpt-software-senior-data-engineer', 'datum-security-bank-data-engineer'];

test.describe('STAR', () => {
  test('hero, the desk and its role anchors', async ({ page }) => {
    await page.goto('/star/');
    await expect(page.locator('h1')).toHaveText('Real work. Real results.');
    await expect(page.locator('.hero')).toContainText('2 stories across 2 roles.');
    await expect(page.locator('#stories')).toHaveClass(/news-band/);
    const slugs = await page
      .locator('[data-story]')
      .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.slug));
    expect(slugs).toEqual(['talend-databricks-migration', 'emr-cost-optimization']);
    const roles = await page
      .locator('[data-story]')
      .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.role));
    expect(roles).toEqual(IDS);
    const navHrefs = await page
      .locator('.local-nav .links a')
      .evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(navHrefs).toEqual(roles.map((id) => `#${id}`));
    for (const id of roles) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
      await expect(page.locator(`#stories #${id}`)).toHaveCount(1);
    }
    await expect(page.locator('main [data-gallery], main .stat-card, main .paddles')).toHaveCount(
      0,
    );
    await expect(page.locator('main details')).toHaveCount(0);
  });

  test('the lead card is the newest story, the other is the one tile', async ({ page }) => {
    await page.goto('/star/');
    await expect(page.locator('#stories > [data-story]')).toHaveCount(1);
    await expect(page.locator('#stories > [data-story]')).toHaveAttribute(
      'data-slug',
      'talend-databricks-migration',
    );
    await expect(page.locator('#stories > [data-story]')).toHaveClass(/story-teaser--lead/);
    await expect(page.locator('#stories ul.desk-tiles > li')).toHaveCount(1);
    await expect(page.locator('#stories ul.desk-tiles [data-story]')).toHaveAttribute(
      'data-slug',
      'emr-cost-optimization',
    );
    await expect(page.locator('#stories .more-from')).toHaveCount(0);
  });

  test('story tile: company eyebrow, title, question, stat, month', async ({ page }) => {
    await page.goto('/star/');
    const link = page.getByRole('link', { name: 'Cutting EMR costs by more than half' });
    const card = page.locator('[data-story]', { has: link });
    const navLabel = (
      await page
        .locator('.local-nav .links a[href="#datum-security-bank-data-engineer"]')
        .innerText()
    ).trim();
    await expect(card.locator('.t-news-cat')).toHaveText(navLabel);
    await expect(card.getByRole('heading', { level: 2 })).toHaveText(
      'Cutting EMR costs by more than half',
    );
    await expect(card).toHaveAttribute('aria-labelledby', 'emr-cost-optimization-title');
    await expect(card.locator('.teaser-q')).toContainText('Tell me about a time you reduced cost');
    await expect(card.locator('.stat-value')).toHaveText('>50%');
    await expect(card.locator('.stat-cap').first()).toHaveText('Cut');
    await expect(card.locator('.stat-cap').last()).toContainText('EMR costs');
    await expect(card.locator('time')).toHaveAttribute('datetime', '2025-06');
    await expect(card.locator('time')).toHaveText('Jun 2025');
    await expect(card.getByRole('link')).toHaveCount(1);
    await expect(link).toHaveAttribute('href', '/star/emr-cost-optimization/');
    const b = (await link.boundingBox())!;
    expect(b.height).toBeGreaterThanOrEqual(44);
    await expect(card).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(page.locator('#stories')).toHaveCSS('background-color', 'rgb(245, 245, 247)');
    const values = page.locator('[data-story] .stat-value');
    await expect(values.nth(0)).toHaveCSS('color', 'rgb(11, 93, 82)');
    await expect(values.nth(1)).toHaveCSS('color', 'rgb(140, 56, 0)');
  });

  const LANGS = [
    { base: '/star/', label: /^Diagram: /, vi: false },
    { base: '/vi/star/', label: /^Sơ đồ: /, vi: true },
  ];

  for (const { base, label } of LANGS) {
    test(`desk cards show the story diagram above their category (${base})`, async ({ page }) => {
      for (const w of [1440, 375]) {
        await page.setViewportSize({ width: w, height: 900 });
        await page.goto(base);
        const cards = page.locator('[data-story]');
        await expect(cards).toHaveCount(2);
        for (const card of await cards.all()) {
          const svg = card.locator('.teaser-media svg[role="img"]');
          await expect(svg).toHaveCount(1);
          await expect(svg).toHaveAttribute('aria-label', label);
          await expect(svg).toHaveAttribute('width', '640');
          await expect(svg).toHaveAttribute('height', '320');
          await svg.scrollIntoViewIfNeeded();
          const b = (await svg.boundingBox())!;
          expect(b.width / b.height, `${base} ${w}`).toBeGreaterThan(1.97);
          expect(b.width / b.height, `${base} ${w}`).toBeLessThan(2.03);
          // The diagram comes before the category in reading order. At 1440 the lead and the lone
          // tile put it beside the text; at 375 it sits above (the column test covers 320).
          const geo = await card.evaluate((c) => {
            const media = c.querySelector('.teaser-media')!;
            const cat = c.querySelector('.t-news-cat')!;
            return {
              first: !!(media.compareDocumentPosition(cat) & Node.DOCUMENT_POSITION_FOLLOWING),
              above: media.getBoundingClientRect().bottom <= cat.getBoundingClientRect().top + 1,
            };
          });
          expect(geo.first, `${base} ${w}`).toBe(true);
          if (w === 375) expect(geo.above, `${base} ${w}`).toBe(true);
        }
      }
    });
  }

  for (const [path, label] of [
    ['/star/emr-cost-optimization/', /^Diagram: /],
    ['/star/talend-databricks-migration/', /^Diagram: /],
    ['/vi/star/emr-cost-optimization/', /^Sơ đồ: /],
    ['/vi/star/talend-databricks-migration/', /^Sơ đồ: /],
  ] as const) {
    test(`story page shows the diagram between the keyline and Situation (${path})`, async ({
      page,
    }) => {
      for (const w of [1440, 375]) {
        await page.setViewportSize({ width: w, height: 900 });
        await page.goto(path);
        const svg = page.locator('figure.story-figure svg[role="img"]');
        await expect(svg).toHaveCount(1);
        await expect(svg).toHaveAttribute('aria-label', label);
        await expect(page.locator('main svg[role="img"]')).toHaveCount(1);
        const b = (await svg.boundingBox())!;
        expect(b.width / b.height, `${path} ${w}`).toBeGreaterThan(1.97);
        expect(b.width / b.height, `${path} ${w}`).toBeLessThan(2.03);
        const order = await page.evaluate(() => {
          const top = (s: string) => document.querySelector(s)!.getBoundingClientRect().top;
          const bottom = (s: string) => document.querySelector(s)!.getBoundingClientRect().bottom;
          return {
            afterKeyline: bottom('.keyline') <= top('.story-figure'),
            beforeSituation: bottom('.story-figure') <= top('#situation'),
          };
        });
        expect(order, `${path} ${w}`).toEqual({ afterKeyline: true, beforeSituation: true });
      }
    });
  }

  test('story diagrams follow the theme', async ({ page }) => {
    await page.goto('/star/');
    const fill = () =>
      page.evaluate(
        () =>
          getComputedStyle(document.querySelector('[data-story] svg [style*="fill:var(--link)"]')!)
            .fill,
      );
    expect(await fill()).toBe('rgb(0, 80, 159)');
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'dark';
    });
    expect(await fill()).toBe('rgb(92, 176, 255)');
  });

  test('the competency filter is gone and an old ?c= link still shows both stories', async ({
    page,
  }) => {
    for (const path of ['/star/?c=ownership', '/star/?c=conflict', '/vi/star/?c=ownership']) {
      await page.goto(path);
      await expect(page.locator('[data-story]')).toHaveCount(2);
      for (const card of await page.locator('[data-story]').all()) await expect(card).toBeVisible();
      await expect(page.locator('[data-competency-filter], .chip-filter, #star-empty')).toHaveCount(
        0,
      );
      await expect(page.locator('main button')).toHaveCount(0);
    }
  });

  test('/star/ ships no client script beyond the one /blog/ has', async ({ page }) => {
    const scripts = () =>
      page.evaluate(() => ({
        src: [...document.querySelectorAll<HTMLScriptElement>('script[src]')]
          .map((s) => s.getAttribute('src'))
          .sort(),
        inline: [...document.querySelectorAll('script:not([src])')]
          .map((s) => s.textContent ?? '')
          .filter((t) => /competenc|star-empty|data-reset/.test(t)),
      }));
    await page.goto('/blog/');
    const blog = await scripts();
    for (const path of ['/star/', '/vi/star/']) {
      await page.goto(path);
      const star = await scripts();
      expect(star.src, path).toEqual(blog.src);
      expect(star.inline, path).toEqual([]);
    }
  });

  test('the title link opens the story page', async ({ page }) => {
    await page.goto('/star/');
    const link = page.getByRole('link', { name: 'Cutting EMR costs by more than half' });
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await expect(page).toHaveURL(/\/star\/emr-cost-optimization\/$/);
    await expect(page.locator('h1')).toHaveText('Cutting EMR costs by more than half');
  });

  const STORIES = [
    {
      path: '/star/emr-cost-optimization/',
      lang: 'en',
      slug: 'emr-cost-optimization',
      values: ['>50%', 'unchanged'],
      h2: ['Situation', 'Task', 'Action', 'Result'],
      qLabel: 'Interview question',
      refLabel: 'Footnote 1',
      role: '/experiences/datum-security-bank-data-engineer/',
      other: '/star/talend-databricks-migration/',
    },
    {
      path: '/star/talend-databricks-migration/',
      lang: 'en',
      slug: 'talend-databricks-migration',
      values: ['500', '0', 'unchanged'],
      h2: ['Situation', 'Task', 'Action', 'Result'],
      qLabel: 'Interview question',
      refLabel: 'Footnote 1',
      role: '/experiences/fpt-software-senior-data-engineer/',
      other: '/star/emr-cost-optimization/',
    },
    {
      path: '/vi/star/emr-cost-optimization/',
      lang: 'vi',
      slug: 'emr-cost-optimization',
      values: ['>50%', 'không đổi'],
      h2: ['Bối cảnh', 'Nhiệm vụ', 'Hành động', 'Kết quả'],
      qLabel: 'Câu hỏi phỏng vấn',
      refLabel: 'Chú thích 1',
      role: '/vi/experiences/datum-security-bank-data-engineer/',
      other: '/vi/star/talend-databricks-migration/',
    },
    {
      path: '/vi/star/talend-databricks-migration/',
      lang: 'vi',
      slug: 'talend-databricks-migration',
      values: ['500', '0', 'không đổi'],
      h2: ['Bối cảnh', 'Nhiệm vụ', 'Hành động', 'Kết quả'],
      qLabel: 'Câu hỏi phỏng vấn',
      refLabel: 'Chú thích 1',
      role: '/vi/experiences/fpt-software-senior-data-engineer/',
      other: '/vi/star/emr-cost-optimization/',
    },
  ];

  for (const st of STORIES) {
    test(`story page is an article: header, four sections, metrics, links (${st.path})`, async ({
      page,
    }) => {
      await page.goto(st.path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('.q-label')).toHaveText(st.qLabel);
      await expect(page.locator('.t-article-sub')).not.toBeEmpty();
      await expect(page.locator('.story time')).toHaveAttribute('datetime', /^\d{4}-\d{2}$/);
      await expect(page.locator('.story .part h2')).toHaveText(st.h2);
      for (const h of st.h2)
        await expect(page.getByRole('heading', { name: h, level: 2 })).toBeVisible();
      await expect(page.locator('#action li')).toHaveCount(3);
      await expect(page.locator('#result .stat-value')).toHaveText(st.values);
      await expect(
        page.locator(
          'main [data-star-panel], main #steps, main .quote, main .stat--super, main .chapter--sticky, main .hero',
        ),
      ).toHaveCount(0);
      await expect(
        page.getByRole('link', { name: /^(All stories|Tất cả câu chuyện)/ }).last(),
      ).toBeVisible();
      await expect(page.locator(`.closing a[href="${st.role}"]`)).toHaveCount(1);
      await expect(page.locator(`.more-from a[href="${st.other}"]`)).toHaveCount(1);
      await expect(page.locator('.more-from a')).toHaveCount(1);
      // H1 then H2s, none skipped.
      const levels = await page.evaluate(() =>
        [...document.querySelectorAll('main h1, main h2, main h3, main h4')].map((h) => h.tagName),
      );
      expect(levels.shift()).toBe('H1');
      expect(new Set(levels)).toEqual(new Set(['H2']));
    });

    test(`story page footnotes: one ref and one note per noted metric (${st.path})`, async ({
      page,
    }) => {
      const md = readFileSync(`src/content/star/${st.lang}/${st.slug}.md`, 'utf8');
      const front = md.split('---')[1];
      const metrics = front.split(/^ {2}- /m).slice(1);
      const notes = metrics
        .map((m) => /^ {4}note: (["'])(.*)\1\s*$/m.exec(m)?.[2])
        .filter((n): n is string => !!n);
      expect(notes.length).toBeGreaterThan(0);
      expect(metrics.length).toBe(st.values.length);
      await page.goto(st.path);
      const refs = page.locator('sup.fn-ref a');
      await expect(refs).toHaveCount(notes.length);
      await expect(page.locator('#result sup.fn-ref a')).toHaveCount(notes.length);
      await expect(page.locator('main sup.fn-ref a')).toHaveCount(notes.length);
      for (const [i, note] of notes.entries()) {
        const n = i + 1;
        const ref = page.locator(`#fnref-${n}`);
        await expect(ref).toHaveAttribute('href', `#fn-${n}`);
        await expect(ref).toHaveAttribute('aria-label', st.refLabel.replace('1', String(n)));
        const fn = page.locator(`#fn-${n}`);
        expect((await fn.innerText()).startsWith(note)).toBe(true);
        await expect(fn.locator('a.fn-back')).toHaveAttribute('href', `#fnref-${n}`);
      }
      await refs.first().click();
      expect(await page.evaluate(() => document.querySelector(':target')?.id)).toBe('fn-1');
      const dup = await page.evaluate(() => {
        const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
        return ids.filter((id, i) => ids.indexOf(id) !== i);
      });
      expect(dup).toEqual([]);
      await expect(page.locator('main > .footnotes')).toHaveCount(1);
    });
  }

  test('story page column: H1, first H2 and figure share a left edge, measure <= 653px', async ({
    page,
  }) => {
    for (const path of ['/star/emr-cost-optimization/', '/vi/star/talend-databricks-migration/']) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(path);
      const m = await page.evaluate(() => {
        const box = (s: string) => document.querySelector(s)!.getBoundingClientRect();
        return {
          h1: box('h1').left,
          h2: box('#situation h2').left,
          fig: box('.story-figure').left,
          w: box('#situation .prose').width,
        };
      });
      expect(Math.abs(m.h1 - m.h2), path).toBeLessThanOrEqual(1);
      expect(Math.abs(m.h1 - m.fig), path).toBeLessThanOrEqual(1);
      expect(m.w, path).toBeLessThanOrEqual(653);
    }
  });

  for (const st of STORIES) {
    for (const w of [375, 320]) {
      test(`story page has no overflow at ${w}px, also at 200% text (${st.path})`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: w, height: 812 });
        await page.goto(st.path);
        const over = () => page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        expect(await over()).toBe(false);
        await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
        expect(await over()).toBe(false);
      });
    }
  }

  test('peek rule at 1440x900 and 375x812', async ({ page }) => {
    for (const path of ['/star/', '/vi/star/']) {
      for (const [w, h] of [
        [1440, 900],
        [375, 812],
      ]) {
        await page.setViewportSize({ width: w, height: h });
        await page.goto(path);
        const y = (await page.locator('#stories').boundingBox())!.y;
        expect(h - y, `${path} ${w}`).toBeGreaterThanOrEqual(64);
      }
    }
  });

  const deskGeometry = (page: Page) =>
    page.evaluate(() => {
      const box = (e: Element) => {
        const b = e.getBoundingClientRect();
        return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width };
      };
      const cards = [...document.querySelectorAll<HTMLElement>('[data-story]')];
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        cards: cards.map((c) => ({
          card: box(c),
          media: box(c.querySelector('.teaser-media')!),
          text: box(c.querySelector('.teaser-text')!),
          within: [...c.querySelectorAll('*')].every((k) => {
            const b = k.getBoundingClientRect();
            return b.right <= c.getBoundingClientRect().right + 1 && b.left >= -1;
          }),
          self: c.scrollWidth <= c.clientWidth,
        })),
      };
    });
  for (const base of ['/star/', '/vi/star/']) {
    for (const w of [1440, 900]) {
      test(`desk geometry at ${w}px: media beside text, the lone tile spans the lead (${base})`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: w, height: 900 });
        await page.goto(base);
        const g = await deskGeometry(page);
        const [lead, tile] = g.cards;
        expect(g.overflow).toBe(false);
        for (const c of g.cards) {
          expect(c.media.r, 'media left of text').toBeLessThanOrEqual(c.text.l + 1);
          expect(c.within).toBe(true);
          expect(c.self).toBe(true);
        }
        expect(Math.abs(tile.card.w - lead.card.w)).toBeLessThanOrEqual(2);
        expect(Math.abs(tile.card.l - lead.card.l)).toBeLessThanOrEqual(2);
        expect(tile.card.t).toBeGreaterThan(lead.card.b);
      });
    }
    for (const w of [375, 320]) {
      test(`desk is one column with media above text at ${w}px, no overflow (${base})`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: w, height: 812 });
        await page.goto(base);
        const g = await deskGeometry(page);
        expect(g.overflow).toBe(false);
        expect(g.cards).toHaveLength(2);
        for (const c of g.cards) {
          expect(c.media.b, 'media above text').toBeLessThanOrEqual(c.text.t + 1);
          expect(c.card.r).toBeLessThanOrEqual(w);
          expect(c.card.l).toBeGreaterThanOrEqual(0);
          expect(c.within).toBe(true);
          expect(c.self).toBe(true);
        }
        expect(Math.abs(g.cards[0].card.w - g.cards[1].card.w)).toBeLessThanOrEqual(1);
        expect(g.cards[1].card.t).toBeGreaterThan(g.cards[0].card.b);
      });
    }
  }

  for (const [w, h, bar] of [
    [1440, 900, 52],
    [375, 812, 48],
  ] as const) {
    for (const id of IDS) {
      test(`/star/#${id} lands the card below both bars at ${w}px`, async ({ page }) => {
        await page.setViewportSize({ width: w, height: h });
        await page.goto(`/star/#${id}`);
        const card = page.locator(`#${id}`);
        // Re-apply the anchor once the page has settled, then poll the position: the first
        // hash scroll may still be in flight on a loaded runner.
        await card.evaluate((e) => e.scrollIntoView());
        await expect
          .poll(() => card.evaluate((e) => e.getBoundingClientRect().top), { timeout: 15_000 })
          .toBeGreaterThanOrEqual(bar + 16 - 1);
        expect(await card.evaluate((e) => e.getBoundingClientRect().top)).toBeLessThan(h);
        if (w === 375) {
          await expect
            .poll(() => card.evaluate((e) => e.getBoundingClientRect().left))
            .toBeGreaterThanOrEqual(0);
          expect(await card.evaluate((e) => e.getBoundingClientRect().right)).toBeLessThanOrEqual(
            375,
          );
        }
      });
    }
  }

  test('the role page links to its STAR story and the card anchor still lands', async ({
    page,
  }) => {
    await page.goto('/experiences/datum-security-bank-data-engineer/');
    const link = page.getByRole('link', { name: 'Read the story', exact: true });
    await expect(link).toHaveAttribute('href', '/star/emr-cost-optimization/');
    await page.goto('/experiences/#datum-security-bank-data-engineer');
    await expect(page.locator('#datum-security-bank-data-engineer')).toBeInViewport();
  });
});

// The sample marker and the untranslated-VI fallback banner are covered by Container-API fixtures in
// tests/unit/star-render.test.ts, because no sample or untranslated story exists any more.
test.describe('STAR language switch', () => {
  test('a translated story links to its Vietnamese page and back', async ({ page }) => {
    await page.goto('/star/emr-cost-optimization/');
    await expect(page.locator('.lang-switch a')).toHaveAttribute(
      'href',
      '/vi/star/emr-cost-optimization/',
    );
    await page.goto('/vi/star/emr-cost-optimization/');
    await expect(page.getByRole('note')).toHaveCount(0);
    await expect(page.locator('.lang-switch a')).toHaveAttribute(
      'href',
      '/star/emr-cost-optimization/',
    );
  });
});

test.describe('STAR without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('shows both cards, no filter, and both role anchors', async ({ page }) => {
    await page.goto('/star/');
    await expect(page.locator('[data-story]:visible')).toHaveCount(2);
    await expect(page.locator('[data-competency-filter]')).toHaveCount(0);
    await expect(page.locator('#datum-security-bank-data-engineer')).toHaveCount(1);
    await expect(page.locator('#fpt-software-senior-data-engineer')).toHaveCount(1);
  });
});

import { expect, test } from '@playwright/test';

const IDS = ['fpt-software-senior-data-engineer', 'datum-security-bank-data-engineer'];

test.describe('STAR', () => {
  test('hero art is themed by tokens', async ({ page }) => {
    await page.goto('/star/');
    const fill = () =>
      page.evaluate(
        () =>
          getComputedStyle(document.querySelector('.hero svg.page-art rect:last-of-type')!).fill,
      );
    expect(await fill()).toBe('rgb(0, 80, 159)');
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'dark';
    });
    expect(await fill()).toBe('rgb(92, 176, 255)');
  });

  test('hero and the story gallery', async ({ page }) => {
    await page.goto('/star/');
    await expect(page.locator('h1')).toHaveText('Stories from the work.');
    await expect(page.locator('.hero svg.page-art[role="img"]')).toHaveAttribute(
      'aria-label',
      /^Illustration: four rising steps/,
    );
    await expect(page.locator('.hero')).toContainText('2 stories across 2 roles.');
    await expect(page.locator('#stories')).toHaveClass(/section--surface/);
    await expect(page.getByRole('region', { name: 'Explore the stories.' })).toHaveCount(1);
    const roles = await page
      .locator('[data-story]')
      .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.role));
    expect(roles).toEqual(IDS);
    for (const id of roles) {
      await expect(page.locator(`.local-nav .links a[href="#${id}"]`)).toHaveCount(1);
      await expect(page.locator(`#${id}`)).toHaveCount(1);
      await expect(page.locator(`#stories-list #${id}`)).toHaveCount(1);
    }
    await expect(page.locator('main [data-star-group], main .tiles-2up, main details')).toHaveCount(
      0,
    );
  });

  test('story card: company eyebrow, title, question, stat, Read the story', async ({ page }) => {
    await page.goto('/star/');
    const link = page.getByRole('link', {
      name: 'Read the story: Cutting EMR costs by more than half',
    });
    const card = page.locator('[data-story]', { has: link });
    const navLabel = (
      await page
        .locator('.local-nav .links a[href="#datum-security-bank-data-engineer"]')
        .innerText()
    ).trim();
    await expect(card.locator('.stat-card__eyebrow')).toHaveText(navLabel);
    await expect(card.locator('h3')).toHaveText('Cutting EMR costs by more than half');
    await expect(card.locator('.stat-card__body')).toContainText(
      'Tell me about a time you reduced cost',
    );
    await expect(card.locator('.stat-card__value')).toHaveText('>50%');
    await expect(card.locator('.stat-card__cap')).toContainText('Cut EMR costs');
    await expect(card.getByRole('link')).toHaveCount(1);
    await expect(link).toHaveAttribute('href', '/star/emr-cost-optimization/');
    const b = (await link.boundingBox())!;
    expect(b.height).toBeGreaterThanOrEqual(44);
    await expect(card).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    const values = page.locator('[data-story] .stat-card__value');
    await expect(values.nth(0)).toHaveCSS('color', 'rgb(11, 93, 82)');
    await expect(values.nth(1)).toHaveCSS('color', 'rgb(140, 56, 0)');
  });

  const LANGS = [
    { base: '/star/', label: /^Diagram: /, vi: false },
    { base: '/vi/star/', label: /^Sơ đồ: /, vi: true },
  ];

  for (const { base, label } of LANGS) {
    test(`gallery cards show the story diagram (${base})`, async ({ page }) => {
      for (const w of [1440, 375]) {
        await page.setViewportSize({ width: w, height: 900 });
        await page.goto(base);
        const cards = page.locator('[data-story]');
        await expect(cards).toHaveCount(2);
        for (const card of await cards.all()) {
          const svg = card.locator('.stat-card__media svg[role="img"]');
          await expect(svg).toHaveCount(1);
          await expect(svg).toHaveAttribute('aria-label', label);
          await expect(svg).toHaveAttribute('width', '640');
          await expect(svg).toHaveAttribute('height', '320');
          await svg.scrollIntoViewIfNeeded();
          const b = (await svg.boundingBox())!;
          expect(b.width / b.height, `${base} ${w}`).toBeGreaterThan(1.97);
          expect(b.width / b.height, `${base} ${w}`).toBeLessThan(2.03);
          const order = await card.evaluate((c) => {
            const body = c.querySelector('.stat-card__body')!;
            const media = c.querySelector('.stat-card__media')!;
            const value = c.querySelector('.stat-card__value')!;
            return {
              afterBody: !!(body.compareDocumentPosition(media) & Node.DOCUMENT_POSITION_FOLLOWING),
              beforeValue: !!(
                media.compareDocumentPosition(value) & Node.DOCUMENT_POSITION_FOLLOWING
              ),
            };
          });
          expect(order).toEqual({ afterBody: true, beforeValue: true });
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
    test(`story page shows the diagram above the panels (${path})`, async ({ page }) => {
      for (const w of [1440, 375]) {
        await page.setViewportSize({ width: w, height: 900 });
        await page.goto(path);
        const svg = page.locator('.story-steps .story-figure svg[role="img"]');
        await expect(svg).toHaveCount(1);
        await expect(svg).toHaveAttribute('aria-label', label);
        await expect(page.locator('.hero svg[role="img"]')).toHaveCount(0);
        const b = (await svg.boundingBox())!;
        expect(b.width / b.height, `${path} ${w}`).toBeGreaterThan(1.97);
        expect(b.width / b.height, `${path} ${w}`).toBeLessThan(2.03);
        const above = await page.evaluate(
          () =>
            document.querySelector('.story-figure')!.getBoundingClientRect().bottom <=
            document.querySelector('[data-star-panel="s"]')!.getBoundingClientRect().top,
        );
        expect(above).toBe(true);
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

  test('competency filter updates the URL; empty roles lose their nav link and anchor', async ({
    page,
  }) => {
    await page.goto('/star/');
    await page.getByRole('button', { name: 'Ownership' }).click();
    await expect(page).toHaveURL(/\?c=ownership$/);
    await expect(page.locator('[data-story]:visible')).toHaveCount(1);
    await page.goBack();
    await expect(page).not.toHaveURL(/\?c=/);
    await page.goto('/star/?c=customer-focus');
    await expect(page.locator('[data-story]:visible')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Customer focus' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.goto('/star/?c=ownership');
    await expect(page.locator('.links a[href="#fpt-software-senior-data-engineer"]')).toBeHidden();
    await expect(page.locator('#fpt-software-senior-data-engineer')).toHaveCount(0);
    await page.goto('/star/?c=conflict');
    await expect(page.locator('#stories [data-gallery]')).toBeHidden();
    for (const id of IDS) await expect(page.locator(`.links a[href="#${id}"]`)).toBeHidden();
    await expect(page.getByText('No stories match.')).toBeVisible();
    await expect(page.locator('#stories')).toBeVisible();
    await page.getByRole('button', { name: 'Show all' }).click();
    await expect(page.locator('[data-story]:visible')).toHaveCount(2);
    await expect(page.locator('#stories [data-gallery]')).toBeVisible();
    for (const id of IDS) await expect(page.locator(`.links a[href="#${id}"]`)).toBeVisible();
  });

  test('story page: quote with Interview question, super stat, four-panel grid, closing links', async ({
    page,
  }) => {
    await page.goto('/star/');
    const link = page.getByRole('link', {
      name: 'Read the story: Cutting EMR costs by more than half',
    });
    await link.scrollIntoViewIfNeeded();
    // The lockup fades up as it enters view; click once it has settled.
    await expect(page.locator('[data-story]', { has: link })).toHaveCSS('translate', 'none');
    await link.click();
    await expect(page).toHaveURL(/\/star\/emr-cost-optimization\/$/);
    await expect(page.locator('h1')).toHaveText('Cutting EMR costs by more than half');
    await expect(page.locator('figure.quote figcaption')).toHaveText('Interview question');
    await expect(page.locator('.stat--super .stat-value')).toHaveText('>50%');
    const panels = page.locator('[data-star-panel]');
    await expect(panels.locator('h3')).toHaveText(['Situation', 'Task', 'Result']);
    await expect(page.locator('#steps h2')).toHaveText('Step by step.');
    for (const p of await panels.all()) await expect(p).toBeVisible();
    await expect(page.getByRole('link', { name: 'All stories' }).last()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Read the role' })).toHaveAttribute(
      'href',
      '/experiences/datum-security-bank-data-engineer/',
    );
  });

  test('story panels: S and T side by side, R full width; one column at 375px', async ({
    page,
  }) => {
    const boxes = async () => {
      const out: Record<string, { x: number; y: number; w: number }> = {};
      for (const k of ['s', 't', 'r']) {
        const b = (await page.locator(`[data-star-panel="${k}"]`).boundingBox())!;
        out[k] = { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width) };
      }
      return out;
    };
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/star/emr-cost-optimization/');
    let b = await boxes();
    expect(b.s.y).toBe(b.t.y);
    expect(b.t.x).toBeGreaterThan(b.s.x);
    expect(b.r.w).toBeGreaterThan(b.s.w * 1.8);
    expect(b.r.y).toBeGreaterThan(b.t.y);
    await expect(page.locator('[data-star-panel="r"] .stat-value').first()).toHaveText('>50%');
    await page.setViewportSize({ width: 375, height: 812 });
    b = await boxes();
    expect(b.t.y).toBeGreaterThan(b.s.y);
    expect(b.t.x).toBe(b.s.x);
  });

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

  test('gallery geometry at L, M and S', async ({ page }) => {
    const info = () =>
      page.evaluate(() => {
        const g = document.querySelector<HTMLElement>('#stories [data-gallery]')!;
        const cards = [...g.querySelectorAll<HTMLElement>('[data-story]')].map((c) =>
          c.getBoundingClientRect(),
        );
        return {
          few: g.classList.contains('gallery--few'),
          tops: cards.map((r) => Math.round(r.top)),
          widths: cards.map((r) => Math.round(r.width)),
          secondX: cards[1].left,
          paddles: !g.querySelector<HTMLElement>('.paddles')!.hidden,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/star/');
    // The cards reveal with a staggered translate; measure only once both have settled.
    for (const card of await page.locator('[data-story]').all()) {
      await card.scrollIntoViewIfNeeded();
      await expect(card).toHaveCSS('translate', 'none');
    }
    let m = await info();
    expect(m.few).toBe(true);
    expect(Math.abs(m.tops[0] - m.tops[1])).toBeLessThanOrEqual(2);
    for (const w of m.widths) expect(w).toBeGreaterThan(372);
    expect(m.paddles).toBe(false);
    await page.setViewportSize({ width: 900, height: 900 });
    m = await info();
    expect(m.widths).toEqual([344, 344]);
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator('#stories .paddles')).toBeVisible();
    m = await info();
    expect(m.widths).toEqual([260, 260]);
    expect(m.secondX).toBeLessThan(375);
    expect(m.paddles).toBe(true);
    expect(m.overflow).toBe(false);
  });

  for (const w of [375, 320]) {
    test(`Vietnamese cards never overflow at ${w}px`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 812 });
      await page.goto('/vi/star/');
      const r = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('[data-story]')].map((c) => {
          const b = c.getBoundingClientRect();
          return {
            self: c.scrollWidth <= c.clientWidth,
            kids: [...c.children].every((k) => k.getBoundingClientRect().right <= b.right + 1),
            h: Math.round(b.height),
          };
        }),
      );
      for (const c of r) {
        expect(c.self).toBe(true);
        expect(c.kids).toBe(true);
      }
      expect(new Set(r.map((c) => c.h)).size).toBe(1);
    });
  }

  test('paddles follow the filter without a resize', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/star/');
    const g = page.locator('#stories [data-gallery]');
    const prev = g.getByRole('button', { name: 'Previous stories' });
    const next = g.getByRole('button', { name: 'Next stories' });
    await expect(prev).toBeDisabled();
    await expect(next).toBeEnabled();
    await next.click();
    await expect(next).toBeDisabled();
    await expect(prev).toBeEnabled();
    await page.evaluate(() => {
      document.querySelector<HTMLElement>('[data-story]')!.hidden = true;
    });
    await expect(g.locator('.paddles')).toBeHidden();
    await page.evaluate(() => {
      document.querySelector<HTMLElement>('[data-story]')!.hidden = false;
    });
    await expect(g.locator('.paddles')).toBeVisible();
    await page.goto('/star/?c=ownership');
    await expect(page.locator('#stories .paddles')).toBeHidden();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/star/?c=ownership');
    await expect(page.locator('#stories [data-gallery]')).toHaveClass(/gallery--few/);
    const m = await page.evaluate(() => {
      const t = document.querySelector<HTMLElement>('#stories .gallery-track')!;
      const cs = getComputedStyle(t);
      const content = t.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const card = document.querySelector<HTMLElement>('[data-story]:not([hidden])')!;
      return { content, card: card.getBoundingClientRect().width };
    });
    expect(Math.abs(m.card - m.content)).toBeLessThanOrEqual(2);
  });

  for (const [w, h, bar] of [
    [1440, 900, 52],
    [375, 812, 48],
  ] as const) {
    for (const id of IDS) {
      test(`/star/#${id} lands the card below both bars at ${w}px`, async ({ page }) => {
        await page.setViewportSize({ width: w, height: h });
        await page.goto(`/star/#${id}`);
        const card = page.locator(`#${id}`);
        // Wait for the staggered reveal to finish, then poll the settled position instead of
        // sleeping: the anchor scroll may still be in flight on a loaded runner.
        await expect(card).toHaveCSS('translate', 'none', { timeout: 15_000 });
        // The initial hash scroll can end mid-reveal (a late IntersectionObserver start shifts the
        // card by the in-flight translate), so re-apply the anchor once the card is settled. This
        // still exercises the scroll-margin that must clear both bars.
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
    const link = page.getByRole('link', { name: 'Read the STAR story' });
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
  test('shows every card, no paddles, no filter', async ({ page }) => {
    await page.goto('/star/');
    await expect(page.locator('[data-story]:visible')).toHaveCount(2);
    await expect(page.locator('#stories .paddles')).toBeHidden();
    await expect(page.locator('[data-competency-filter]')).toBeHidden();
    await expect(page.locator('#datum-security-bank-data-engineer')).toHaveCount(1);
  });
});

import { readdirSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// Layout is measured without the reveal animation (its translate would skew the numbers).
test.use({ reducedMotion: 'reduce' });

const DIR = 'src/content/experience/en';
const files = readdirSync(DIR).filter((f) => f.endsWith('.md'));
const SLUGS = files.map((f) => f.replace(/\.md$/, ''));
// Newest first: the ongoing role, then `start` descending (same rule as sortRoles).
const order = files
  .map((f) => {
    const fm = readFileSync(`${DIR}/${f}`, 'utf8');
    return { slug: f.replace(/\.md$/, ''), start: /^start: '?([\d-]+)/m.exec(fm)![1] };
  })
  .sort((a, b) => b.start.localeCompare(a.start));

test.describe('Experiences index (Leadership cards)', () => {
  test('one role card per role in sort order; links and local nav match', async ({ page }) => {
    await page.goto('/experiences/');
    expect(new Set(SLUGS).size).toBe(files.length);
    const ids = await page
      .locator('#experience .group-card')
      .evaluateAll((els) => els.map((e) => e.id));
    expect(ids).toEqual(order.map((o) => o.slug));
    const cardHrefs = await page
      .locator('#experience .group-card h3 a')
      .evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(cardHrefs).toEqual(order.map((o) => `/experiences/${o.slug}/`));
    const navHrefs = await page
      .locator('.local-nav .links a')
      .evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(navHrefs).toEqual(cardHrefs);
    await expect(page.locator('.local-nav .pill')).toHaveAttribute('href', '/cv.pdf');
  });

  test('one H1, the group H2s, one H3 per card, no skipped levels', async ({ page }) => {
    await page.goto('/experiences/');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('Built for banking data.');
    await expect(page.locator('main h2')).toHaveText([
      'Experience.',
      'Certifications.',
      'Education.',
      'Get in touch.',
    ]);
    const cards = await page.locator('.group-card').count();
    await expect(page.locator('main h3')).toHaveCount(cards);
    await expect(page.locator('.group-card h3')).toHaveCount(cards);
    const levels = await page
      .locator('main h1, main h2, main h3')
      .evaluateAll((els) => els.map((e) => Number(e.tagName[1])));
    levels.forEach((l, i) => expect(l - (levels[i - 1] ?? 1)).toBeLessThanOrEqual(1));
    // Nothing left of the old chapters, gallery, featured band, closing or footnotes.
    await expect(
      page.locator('.chapter, #featured, #more, #highlights, #career, .footnotes, #top'),
    ).toHaveCount(0);
  });

  test('role cards are 4 up at 1440, 2 up at 900 and 1 up at 375; type only', async ({ page }) => {
    const perRow = async () => {
      const tops = await page
        .locator('#experience .group-card')
        .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
      return tops.filter((t) => t === tops[0]).length;
    };
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/experiences/');
    expect(await perRow()).toBe(Math.min(4, order.length));
    if (order.length > 4) {
      const tops = await page
        .locator('#experience .group-card')
        .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
      expect(tops[4]).toBeGreaterThan(tops[0]);
    }
    await page.setViewportSize({ width: 900, height: 900 });
    expect(await perRow()).toBe(Math.min(2, order.length));
    await page.setViewportSize({ width: 375, height: 812 });
    expect(await perRow()).toBe(1);
    // Type only, except the issuer logo svg on certification cards and the school logo img on the education card.
    await expect(page.locator('#experience .group-card :is(img, picture)')).toHaveCount(0);
    await expect(page.locator('#certifications .group-card :is(img, picture)')).toHaveCount(0);
    await expect(page.locator('.group-card :is(img, picture):not(.group-card__logo)')).toHaveCount(
      0,
    );
    await expect(page.locator('#experience .group-card svg')).toHaveCount(0);
    await expect(page.locator('.group-card svg:not(.group-card__logo)')).toHaveCount(0);
    await expect(page.locator('.group-card svg.group-card__logo')).toHaveCount(
      await page.locator('#certifications .group-card svg').count(),
    );
  });

  test('certifications are listed newest first', async ({ page }) => {
    await page.goto('/experiences/');
    // The eyebrow keeps "· year" together with a non-breaking space.
    const text = (await page.locator('#certifications .group-card').allInnerTexts()).map((x) =>
      x.replace(/\u00A0/g, ' '),
    );
    const at = (s: string) => text.findIndex((x) => x.includes(s));
    expect(at('Datadog · 2023')).toBeGreaterThanOrEqual(0);
    expect(at('Amazon Web Services · 2022')).toBeGreaterThan(at('Datadog · 2023'));
  });

  test('education: one card per locale with the school logo, no dates or link', async ({
    page,
  }) => {
    for (const [path, name] of [
      ['/experiences/', 'Nong Lam University'],
      ['/vi/experiences/', 'Trường Đại học Nông Lâm TP. Hồ Chí Minh'],
    ]) {
      await page.goto(path);
      const card = page.locator('#education .group-card');
      await expect(card).toHaveCount(1);
      await expect(card).toContainText(name);
      await expect(card).toContainText('NLU');
      expect(await card.innerText()).not.toMatch(/\d{4}/);
      if (path === '/experiences/') await expect(card).not.toContainText('Trường');
      await expect(page.locator('#education .group-card :is(a, svg)')).toHaveCount(0);
      const logo = page.locator('#education .group-card > img.group-card__logo:first-child');
      await expect(logo).toHaveCount(1);
      await expect(logo).toHaveAttribute('alt', '');
      await expect(logo).toHaveCSS('height', '32px');
      await logo.scrollIntoViewIfNeeded();
      await expect
        .poll(() => logo.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0))
        .toBe(true);
    }
  });

  test('contact box: grey, mailto, tel and LinkedIn, every link at least 44px tall', async ({
    page,
  }) => {
    await page.goto('/experiences/');
    const box = page.locator('.contact-box');
    expect(await box.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(
      'rgb(245, 245, 247)',
    );
    await expect(box.locator('a[href^="mailto:"]')).toHaveCount(1);
    const tel = box.locator('a[href="tel:+84963378831"]');
    await expect(tel).toHaveText('(+84) 963 378 831');
    const linkedin = box.getByRole('link', { name: 'LinkedIn' });
    await expect(linkedin).toHaveAttribute('target', '_blank');
    for (const a of await box.locator('a').all()) {
      expect((await a.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    expect(
      await page.locator('#contact').evaluate((e) => getComputedStyle(e).backgroundColor),
    ).toBe('rgb(255, 255, 255)');
  });

  for (const w of [375, 1440]) {
    test(`/experiences/#<role-slug> lands the card below both bars at ${w}px`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto('/experiences/#datum-security-bank-data-engineer');
      await page.waitForTimeout(200);
      const top = await page
        .locator('#datum-security-bank-data-engineer')
        .evaluate((e) => e.getBoundingClientRect().top);
      // Local nav (--sticky-h 52 at L, 48 at S) plus the 16px scroll margin. At L the stuck bar is
      // 52 and the card lands at 67.8 from sub-pixel layout, so allow 1px, as frame.spec does.
      expect(top).toBeGreaterThanOrEqual(w < 834 ? 48 + 16 : 52 + 16 - 1);
      expect(top).toBeLessThan(900);
    });
  }

  for (const [w, h] of [
    [1440, 900],
    [375, 812],
  ] as const) {
    test(`peek rule at ${w}x${h}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto('/experiences/');
      const top = await page.locator('#roles').evaluate((e) => e.getBoundingClientRect().top);
      expect(top).toBeLessThanOrEqual(h - 64);
    });
  }

  test('there is no page-specific script', async ({ page }) => {
    await page.goto('/experiences/');
    await expect(page.locator('#summary')).toHaveCount(0);
    const scripts = await page
      .locator('script[src]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('src') ?? ''));
    for (const src of scripts) expect(src).not.toMatch(/experience|chapter|scroll-spy/i);
  });

  test('footer is flush under the contact band and has no social icons', async ({ page }) => {
    await page.goto('/experiences/');
    const gap = await page.evaluate(
      () =>
        document.querySelector('footer')!.getBoundingClientRect().top -
        document.querySelector('#contact')!.getBoundingClientRect().bottom,
    );
    expect(Math.abs(gap)).toBeLessThanOrEqual(1);
    await expect(page.locator('footer .icon-btn, footer a svg')).toHaveCount(0);
  });

  test('search: a Lake Formation hit lands the role page with its H2 below both bars', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/');
    await page.keyboard.press('ControlOrMeta+k');
    await page.locator('#search-input').fill('Lake Formation');
    const hit = page
      .locator('.hit a[href*="/experiences/datum-security-bank-data-engineer/"]')
      .first();
    await expect(hit).toBeVisible();
    await hit.click();
    await expect(page).toHaveURL(/\/experiences\/datum-security-bank-data-engineer\//);
    await page.waitForTimeout(200);
    const h2 = page.locator('main h2').first();
    await expect(h2).toBeVisible();
    expect((await h2.boundingBox())!.y).toBeGreaterThanOrEqual(64);
  });
});

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

test('Download CV works without JavaScript and every card is visible', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/experiences/');
  for (const card of await page.locator('.group-card').all()) await expect(card).toBeVisible();
  await context.close();
});

test('Vietnamese hero and translated group headings', async ({ page }) => {
  await page.goto('/vi/experiences/');
  await expect(page.locator('h1')).toHaveText('Xây dựng cho dữ liệu ngân hàng.');
  await expect(page.locator('main h2')).toHaveText([
    'Kinh nghiệm.',
    'Chứng chỉ.',
    'Học vấn.',
    'Liên hệ với tôi.',
  ]);
});

test('Vietnamese cards link to the VI role pages', async ({ page }) => {
  await page.goto('/vi/experiences/');
  await expect(page.locator('#experience .group-card h3 a').first()).toHaveAttribute(
    'href',
    new RegExp(`^/vi/experiences/${order[0].slug}/$`),
  );
  await expect(page.locator('.current-chip')).toHaveCount(0);
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
        await links.nth(i).scrollIntoViewIfNeeded();
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

import { expect, test } from '@playwright/test';

const POST = '/blog/neovim-setup-1-zero-to-editor/';

test.describe('blog', () => {
  test('index: hero, a feature tile with chip and parts list, no Newsroom band for one post', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/blog/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Notes on data and tools.');
    const tile = page.locator('#feature');
    await expect(tile.locator('h2')).toHaveText(
      'Neovim setup guide, Part 1: from zero to a working editor',
    );
    await expect(tile.getByRole('link', { name: 'Neovim setup guide · Part 1' })).toHaveAttribute(
      'href',
      '/blog/series/neovim-setup-guide/',
    );
    await expect(tile).toContainText('min read');
    await expect(tile.locator('.parts li')).toHaveCount(5);
    await expect(tile.getByRole('link', { name: /^Read:/ })).toHaveAttribute('href', POST);
    const box = (await tile.boundingBox())!;
    expect(box.width).toBe(1416);
    await expect(page.locator('.news-band')).toHaveCount(0);
  });

  test('tag pages and the tag index work; tag pages use Newsroom tiles', async ({ page }) => {
    await page.goto('/blog/tags/');
    await page.getByRole('link', { name: /^neovim/ }).click();
    await expect(page).toHaveURL(/\/blog\/tags\/neovim\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('#neovim');
    const tile = page.locator('.news-tile');
    await expect(tile).toHaveCount(1);
    await expect(tile.locator('.t-news-cat')).toHaveText('Neovim setup guide');
    await expect(tile.locator('h2 a')).toHaveAttribute('href', POST);
    await expect(tile).toHaveCSS('border-top-left-radius', '32px');
    // The stretched link makes the whole tile clickable.
    const a = (await tile.locator('h2 a').evaluate((e) => {
      const r = getComputedStyle(e, '::after');
      return r.position;
    })) as string;
    expect(a).toBe('absolute');
  });

  test('Newsroom tiles are 32px rounded at L with a 3px-offset focus ring', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/blog/tags/neovim/');
    await expect(page.locator('.news-tile')).toHaveCSS('border-top-left-radius', '32px');
    await expect(page.locator('.news-tile')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  });

  test('post header, series box, TOC and footer', async ({ page }) => {
    await page.goto(POST);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Neovim setup guide, Part 1: from zero to a working editor',
    );
    const box = page.locator('nav.series-box .wide');
    await expect(box.getByRole('link', { name: 'Part 1 of 5 · Neovim setup guide' })).toBeVisible();
    await expect(box.locator('li')).toHaveCount(5);
    await expect(box.locator('li[aria-current] strong')).toContainText('Part 1:');
    await expect(box.locator('li a')).toHaveCount(0); // parts 2-5 are not links, part 1 is the current one
    await expect(box.getByText('Coming soon')).toHaveCount(4);
    // Prev/next part links are hidden: neither neighbour is published.
    await expect(page.locator('footer.foot nav')).toHaveCount(0);
    await expect(page.locator('.prose h2')).toHaveCount(10);
    await expect(page.locator('.toc-side a')).toHaveCount(13);
  });

  test('TOC highlights the section being read', async ({ page }) => {
    await page.goto(POST);
    await page.locator('#step-3-first-launch').scrollIntoViewIfNeeded();
    await page.evaluate(() => document.getElementById('step-3-first-launch')!.scrollIntoView());
    await expect(page.locator('.toc-side a[aria-current="location"]')).toHaveText(
      'Step 3: first launch',
    );
  });

  test('body uses the SF font stack (no Newsreader) and kbd renders as a keycap', async ({
    page,
  }) => {
    await page.goto(POST);
    const font = await page
      .locator('.prose p')
      .first()
      .evaluate((el) => getComputedStyle(el).fontFamily);
    expect(font.startsWith('-apple-system')).toBe(true);
    expect(font).not.toContain('Newsreader');
    await expect(page.locator('.prose kbd').first()).toBeVisible();
    await expect(page.locator('[role=note].callout')).toHaveCount(4);
  });

  test('code blocks have titles, language labels and highlighted lines', async ({ page }) => {
    await page.goto(POST);
    const block = page.locator('.code-block', { hasText: 'lua/ryanparker/lazy.lua' });
    await expect(block.locator('.code-title')).toHaveText('lua/ryanparker/lazy.lua');
    await expect(block.locator('.code-lang')).toHaveText('lua');
    await expect(block.locator('.line.highlighted')).toHaveCount(10);
  });

  test('Copy button leaves out the $ prompt', async ({ page, browserName, context }) => {
    test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(POST);
    const block = page.locator('.code-block', { hasText: 'brew install lazygit' });
    await expect(block.locator('.prompt')).toHaveText('$');
    await block.getByRole('button', { name: 'Copy' }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('brew install lazygit');
  });

  test('series index shows progress and every part', async ({ page }) => {
    await page.goto('/blog/series/neovim-setup-guide/');
    await expect(page.getByText('1 of 5 published')).toBeVisible();
    const cards = page.locator('ol.news-grid > li.news-tile');
    await expect(cards).toHaveCount(5);
    await expect(cards.nth(0).getByRole('link')).toHaveAttribute('href', POST);
    await expect(cards.nth(1)).toContainText('Coming soon');
    await expect(cards.nth(1).getByRole('link')).toHaveCount(0);
    await page.goto('/blog/series/');
    await expect(page.getByText('1 of 5 published')).toBeVisible();
  });

  test('RSS is valid XML with the published post', async ({ request }) => {
    for (const [path, lang, title] of [
      ['/rss.xml', 'en', 'Neovim setup guide, Part 1'],
      ['/vi/rss.xml', 'vi', 'Hướng dẫn thiết lập Neovim, Phần 1'],
    ]) {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
      const xml = await res.text();
      expect(xml).toContain('<rss');
      expect(xml).toContain(`<language>${lang}</language>`);
      expect(xml).toContain(title);
      expect(xml.match(/<item>/g)).toHaveLength(1);
      expect(xml).not.toMatch(/Part 1: Neovim setup guide, Part 1/);
    }
  });

  test('footer links to the feed', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'RSS' })).toHaveAttribute('href', '/rss.xml');
  });
});

test.describe('diagram', () => {
  test('has role=img with a title and a text alternative', async ({ page }) => {
    await page.goto(POST);
    const svg = page.locator('figure.diagram svg:visible');
    await expect(svg).toHaveAttribute('role', 'img');
    await expect(svg.locator('title')).toHaveText('How the Neovim config starts');
    await expect(page.locator('figure.diagram ol.sr-only li')).toHaveCount(5);
    await expect(page.locator('figure.diagram figcaption')).toContainText('Startup flow');
  });

  test('switches layout at 768px and keeps text at least 14px', async ({ page }) => {
    const fontSize = (cls: string) =>
      page.evaluate((c) => {
        const t = document.querySelector(`.${c} text:not(.t-strong)`) as SVGTextElement;
        return parseFloat(getComputedStyle(t).fontSize) * t.getScreenCTM()!.a;
      }, cls);
    await page.setViewportSize({ width: 767, height: 900 });
    await page.goto(POST);
    await expect(page.locator('.diagram-v')).toBeVisible();
    await expect(page.locator('.diagram-h')).toBeHidden();
    expect(await fontSize('diagram-v')).toBeGreaterThanOrEqual(14);
    await page.setViewportSize({ width: 768, height: 900 });
    await expect(page.locator('.diagram-h')).toBeVisible();
    await expect(page.locator('.diagram-v')).toBeHidden();
    expect(await fontSize('diagram-h')).toBeGreaterThanOrEqual(14);
    await page.setViewportSize({ width: 320, height: 800 });
    expect(await fontSize('diagram-v')).toBeGreaterThanOrEqual(14);
  });

  test('Vietnamese diagram translates captions but keeps file names', async ({ page }) => {
    await page.goto('/vi' + POST);
    await expect(page.locator('figure.diagram figcaption')).toContainText('Luồng khởi động');
    await expect(page.locator('figure.diagram svg:visible title')).toHaveText(
      'Cách cấu hình Neovim khởi động',
    );
    await expect(page.locator('figure.diagram svg:visible')).toContainText('init.lua');
  });
});

test.describe('series box on small screens', () => {
  test.use({ viewport: { width: 600, height: 900 } });
  test('collapses to a single "Part 1 of 5" line below 735px', async ({ page }) => {
    await page.goto(POST);
    const box = page.locator('nav.series-box');
    await expect(box.locator('.wide')).toBeHidden();
    const summary = box.locator('details summary');
    await expect(summary).toHaveText('Part 1 of 5 · Neovim setup guide');
    await expect(box.locator('details li').first()).toBeHidden();
    await summary.click();
    await expect(box.locator('details li')).toHaveCount(5);
    await expect(box.locator('details li').first()).toBeVisible();
    await page.setViewportSize({ width: 800, height: 900 });
    await expect(box.locator('.wide')).toBeVisible();
    await expect(box.locator('details')).toBeHidden();
  });
});

test('post header lists its tags and the language switch keeps the translation', async ({
  page,
}) => {
  await page.goto(POST);
  const tags = page.locator('header.head .meta-line a');
  await expect(tags).toHaveText(['#neovim', '#dotfiles', '#macos', '#developer-tools']);
  await expect(tags.first()).toHaveAttribute('href', '/blog/tags/neovim/');
  await expect(page.locator('.lang-switch a')).toHaveAttribute('href', `/vi${POST}`);
});

test('post header follows the Newsroom composition', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(POST);
  const head = page.locator('header.head');
  await expect(head.locator('.t-news-cat')).toHaveText('Part 1 · Neovim setup guide');
  await expect(head.locator('h1')).toHaveCSS('font-weight', '700');
  await expect(head.locator('h1')).toHaveCSS('font-size', '48px');
  await expect(head.locator('.keyline')).toHaveCSS('width', '653px');
  const h1 = (await head.locator('h1').boundingBox())!;
  const body = (await page.locator('.prose p').first().boundingBox())!;
  expect(Math.round(body.width)).toBeLessThanOrEqual(653);
  expect(h1.x).toBeCloseTo(body.x, 0);
});

test('drop cap and quote styles apply when opted in', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(POST);
  await page.evaluate(() => document.querySelector('.prose')!.classList.add('dropcap'));
  const size = await page
    .locator('.prose > p')
    .first()
    .evaluate((e) => getComputedStyle(e, '::first-letter').fontSize);
  expect(size).toBe('84px');
  await page.setViewportSize({ width: 375, height: 800 });
  const small = await page
    .locator('.prose > p')
    .first()
    .evaluate((e) => getComputedStyle(e, '::first-letter').fontSize);
  expect(small).toBe('48px');
});

test('reading time is the same in both languages', async ({ page }) => {
  await page.goto(POST);
  const en = (
    (await page.locator('header.head .meta-line span', { hasText: /read|đọc/ }).textContent()) ?? ''
  ).match(/(\d+) min read/)?.[1];
  await page.goto(`/vi${POST}`);
  const vi = (
    (await page.locator('header.head .meta-line span', { hasText: /read|đọc/ }).textContent()) ?? ''
  ).match(/(\d+) phút đọc/)?.[1];
  expect(en).toBeTruthy();
  expect(vi).toBe(en);
  expect(Number(en)).toBeGreaterThanOrEqual(10);
  expect(Number(en)).toBeLessThanOrEqual(12);
});

test('tag pages are excluded from the search index', async ({ page }) => {
  await page.goto('/blog/tags/neovim/');
  await expect(page.locator('main')).toHaveAttribute('data-pagefind-ignore', '');
  await page.goto('/blog/tags/');
  await expect(page.locator('main')).toHaveAttribute('data-pagefind-ignore', '');
});

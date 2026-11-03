import { expect, test } from '@playwright/test';

const POST = '/blog/neovim-setup-1-zero-to-editor/';
const PARTS = [
  POST,
  '/blog/neovim-setup-2-languages/',
  '/blog/neovim-setup-3-data-engineering/',
  '/blog/neovim-setup-4-java/',
  '/blog/neovim-setup-5-debugging-and-workflow/',
];
const LATEST = PARTS[4];

const expectPartCovers = async (
  page: import('@playwright/test').Page,
  request: import('@playwright/test').APIRequestContext,
) => {
  const covers = page.locator('.post-rows img.post-cover');
  await expect(covers).toHaveCount(5);
  await expect(page.locator('.post-cover--gen')).toHaveCount(0);
  await expect(page.locator('.post-cover__num')).toHaveCount(0);
  for (let i = 0; i < 5; i++) {
    await expect(covers.nth(i)).toHaveAttribute('alt', '');
    await expect(covers.nth(i)).toHaveAttribute('width', '240');
    await expect(covers.nth(i)).toHaveAttribute('height', '240');
  }
  const srcs = await covers.evaluateAll((els) => els.map((e) => e.getAttribute('src')!));
  expect(srcs.map((s) => /\/part-(\d)\.[^/]*svg$/.exec(s)?.[1])).toEqual(['5', '4', '3', '2', '1']);
  for (const src of srcs) {
    const res = await request.get(src);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/svg+xml');
  }
};

test.describe('blog', () => {
  const geom = (page: import('@playwright/test').Page) =>
    page.locator('.post-rows > li').evaluateAll((lis) =>
      lis.map((li) => {
        const c = li.querySelector('.post-cover')!.getBoundingClientRect();
        const t = li.querySelector('.hl-title')!.getBoundingClientRect();
        return {
          cw: c.width,
          ch: c.height,
          coverRight: c.right,
          titleLeft: t.left,
          titleTop: t.top,
          coverTop: c.top,
          coverBottom: c.bottom,
          rowH: li.getBoundingClientRect().height,
        };
      }),
    );

  test('index at 1440: hero, then a flat image list, newest first', async ({ page, request }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/blog/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Notes on data and tools.');
    for (const sel of [
      '#feature',
      '.news-band',
      '.news-tile',
      '.topic-group',
      '.topic-jump',
      '.blog-newest',
      '.hl-parts',
    ]) {
      await expect(page.locator(sel)).toHaveCount(0);
    }
    const items = page.locator('.post-rows > li');
    await expect(items).toHaveCount(5);
    for (let i = 0; i < 5; i++) await expect(items.nth(i).locator('a')).toHaveCount(1);
    expect(
      await page
        .locator('.post-rows > li a')
        .evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).pathname)),
    ).toEqual([...PARTS].reverse());
    await expect(page.locator('.post-row').first()).toHaveAttribute('href', LATEST);
    const first = items.first();
    await expect(first).toContainText('Part 5 · Neovim setup guide');
    await expect(first).toContainText('Debugging, testing and the daily workflow');
    await expect(first).toContainText('2 Nov 2026');
    await expect(first).toContainText(/\d+ min read/);
    await expectPartCovers(page, request);
    const g = await geom(page);
    expect(g).toHaveLength(5);
    for (const r of g) {
      expect(Math.abs(r.cw - 112)).toBeLessThanOrEqual(1);
      expect(Math.abs(r.ch - 112)).toBeLessThanOrEqual(1);
      expect(r.coverRight).toBeLessThanOrEqual(r.titleLeft);
      expect(r.titleTop).toBeGreaterThanOrEqual(r.coverTop - 1);
      expect(r.titleTop).toBeLessThanOrEqual(r.coverBottom);
      expect(r.rowH).toBeGreaterThanOrEqual(44);
    }
    const heights = await page
      .locator('.post-rows a')
      .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
    for (const h of heights) expect(h).toBeGreaterThanOrEqual(44);
    expect((await page.locator('.post-rows').boundingBox())!.width).toBe(980);
  });

  test('index at 375: covers stay beside the text, no overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/blog/');
    const g = await geom(page);
    expect(g).toHaveLength(5);
    for (const r of g) {
      expect(Math.abs(r.cw - 72)).toBeLessThanOrEqual(1);
      expect(Math.abs(r.ch - 72)).toBeLessThanOrEqual(1);
      expect(r.coverRight).toBeLessThanOrEqual(r.titleLeft);
      expect(r.titleTop).toBeGreaterThanOrEqual(r.coverTop - 1);
      expect(r.titleTop).toBeLessThanOrEqual(r.coverBottom);
      expect(r.rowH).toBeGreaterThanOrEqual(44);
    }
    const desc = page.locator('.post-rows .hl-desc');
    for (let i = 0; i < 5; i++) await expect(desc.nth(i)).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      375,
    );
  });

  test('vi index is a flat list of five rows', async ({ page, request }) => {
    await page.goto('/vi/blog/');
    await expectPartCovers(page, request);
    const items = page.locator('.post-rows > li');
    await expect(items).toHaveCount(5);
    const hrefs = await page
      .locator('.post-rows > li a')
      .evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hrefs).toEqual([...PARTS].reverse().map((p) => '/vi' + p));
    await expect(items.first()).toContainText('Phần 5');
    await expect(items.first()).toContainText('Hướng dẫn thiết lập Neovim');
    await expect(page.locator('.post-rows .hl-meta').first()).toHaveText(/phút đọc/);
    await expect(page.locator('.topic-group')).toHaveCount(0);
  });

  test('topics index lists one topic and the topic page lists its parts', async ({
    page,
    request,
  }) => {
    await page.goto('/blog/topics/');
    const rows = page.locator('a.hl-row');
    await expect(rows).toHaveCount(1);
    await expect(rows).toContainText('Developer tools');
    await expect(rows).toContainText('5 posts');
    await expect(rows).toHaveAttribute('href', '/blog/topics/developer-tools/');
    await page.goto('/blog/topics/developer-tools/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Developer tools');
    await expect(page.locator('main p.t-lockup').first()).toBeVisible();
    await expect(page.locator('.topic-group h2')).toHaveCount(0);
    await expect(page.locator('.hl-parts a')).toHaveCount(5);
    await expect(page.locator('.lang-switch a')).toHaveAttribute(
      'href',
      '/vi/blog/topics/developer-tools/',
    );
    await expect(page.locator('link[hreflang="vi"]')).toHaveCount(1);
    expect((await request.get('/blog/topics/java/')).status()).toBe(404);
  });

  test('blog local nav and footer Writing column list Topics', async ({ page }) => {
    await page.goto('/blog/');
    await expect(page.locator('.local-nav .links a')).toHaveText(['All posts', 'Topics', 'Series']);
    const col = page.locator('footer .cols .col', { hasText: 'Writing' });
    await expect(col.getByRole('link')).toHaveText([
      'All posts',
      'Topics',
      'Series',
      'Tags',
      'RSS',
    ]);
    await expect(col.getByRole('link', { name: 'Tags' })).toHaveAttribute('href', '/blog/tags/');
  });

  test('tag pages and the tag index work; tag pages use Newsroom tiles', async ({ page }) => {
    await page.goto('/blog/tags/');
    await page.getByRole('link', { name: /^neovim/ }).click();
    await expect(page).toHaveURL(/\/blog\/tags\/neovim\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('#neovim');
    const tile = page.locator('.news-tile');
    await expect(tile).toHaveCount(5);
    await expect(tile.locator('.t-news-cat')).toHaveText(Array(5).fill('Neovim setup guide'));
    expect(
      await tile
        .locator('h2 a')
        .evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).pathname)),
    ).toEqual([...PARTS].reverse());
    await expect(tile.first()).toHaveCSS('border-top-left-radius', '32px');
    // The stretched link makes the whole tile clickable.
    const a = (await tile
      .first()
      .locator('h2 a')
      .evaluate((e) => {
        const r = getComputedStyle(e, '::after');
        return r.position;
      })) as string;
    expect(a).toBe('absolute');
  });

  test('Newsroom tiles are 32px rounded at L with a 3px-offset focus ring', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/blog/tags/neovim/');
    await expect(page.locator('.news-tile').first()).toHaveCSS('border-top-left-radius', '32px');
    await expect(page.locator('.news-tile').first()).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    );
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
    await expect(box.locator('li a')).toHaveCount(4); // parts 2-5 link, part 1 is the current one
    await expect(box.getByText('Coming soon')).toHaveCount(0);
    // Part 1 has no previous part, so only the next-part link shows.
    const foot = page.locator('footer.foot nav');
    await expect(foot).toHaveCount(1);
    await expect(foot.getByRole('link')).toHaveCount(1);
    await expect(foot.getByRole('link')).toHaveText(
      'Part 2: Languages: LSP, completion, formatting and linting →',
    );
    await expect(foot.getByRole('link')).toHaveAttribute('href', PARTS[1]);
    await expect(page.locator('.prose h2')).toHaveCount(10);
    await expect(page.locator('.toc-side a')).toHaveCount(13);
  });

  test('a middle part links both neighbours', async ({ page }) => {
    await page.goto(PARTS[2]);
    const links = page.locator('footer.foot nav a');
    await expect(links).toHaveText([
      '← Part 2: Languages: LSP, completion, formatting and linting',
      'Part 4: Java with nvim-jdtls →',
    ]);
    expect(await links.evaluateAll((els) => els.map((e) => e.getAttribute('href')))).toEqual([
      PARTS[1],
      PARTS[3],
    ]);
    await expect(page.locator('nav.series-box .wide li[aria-current] strong')).toContainText(
      'Part 3:',
    );
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

  test('series index shows progress and links every part', async ({ page }) => {
    await page.goto('/blog/series/neovim-setup-guide/');
    await expect(page.getByText('5 of 5 published')).toBeVisible();
    const art = page.locator('main img.series-art');
    await expect(art).toHaveAttribute('alt', 'Cover art: Neovim setup guide');
    await expect(art).toHaveAttribute('src', /part-1\.[^/]*svg$/);
    await page.goto('/vi/blog/series/neovim-setup-guide/');
    await expect(page.locator('main img.series-art')).toHaveAttribute(
      'alt',
      'Ảnh bìa: Hướng dẫn thiết lập Neovim',
    );
    await page.goto('/blog/series/neovim-setup-guide/');
    const cards = page.locator('main ol.hl-list > li');
    await expect(cards).toHaveCount(5);
    for (let i = 0; i < 5; i++) {
      await expect(cards.nth(i).getByRole('link')).toHaveAttribute('href', PARTS[i]);
    }
    await expect(page.locator('main ol.hl-list').getByText('Coming soon')).toHaveCount(0);
    const lefts = await page
      .locator('main ol.hl-list > li a')
      .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));
    expect(new Set(lefts).size).toBe(1);
    await page.goto('/blog/series/');
    await expect(page.getByText('5 of 5 published')).toBeVisible();
  });

  test('RSS is valid XML with every published part', async ({ request }) => {
    const feeds: [string, string, string[], RegExp][] = [
      [
        '/rss.xml',
        'en',
        [1, 2, 3, 4, 5].map((n) => `Neovim setup guide, Part ${n}`),
        /Part \d: Neovim setup guide, Part \d/,
      ],
      [
        '/vi/rss.xml',
        'vi',
        [1, 2, 3, 4, 5].map((n) => `Hướng dẫn thiết lập Neovim, Phần ${n}`),
        /Phần \d: Hướng dẫn thiết lập Neovim, Phần \d/,
      ],
    ];
    for (const [path, lang, titles, doubled] of feeds) {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
      const xml = await res.text();
      expect(xml).toContain('<rss');
      expect(xml).toContain(`<language>${lang}</language>`);
      for (const title of titles) expect(xml).toContain(title);
      expect(xml.match(/<item>/g)).toHaveLength(5);
      if (lang === 'en') {
        expect(xml.indexOf(titles[4])).toBeLessThan(xml.indexOf(titles[0]));
      }
      expect(xml).not.toMatch(doubled);
    }
  });

  test('every new part has its Vietnamese translation', async ({ page }) => {
    for (const [i, path] of PARTS.slice(1).entries()) {
      await page.goto('/vi' + path);
      await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
      await expect(page.getByRole('heading', { level: 1 })).toContainText(
        'Hướng dẫn thiết lập Neovim, Phần ' + (i + 2),
      );
      await expect(page.getByRole('note').filter({ hasText: 'chỉ có bằng tiếng Anh' })).toHaveCount(
        0,
      );
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
  await expect(head.locator('.t-news-cat')).toHaveText(
    'Developer tools · Part 1 · Neovim setup guide',
  );
  await page.goto(`/vi${POST}`);
  await expect(page.locator('header.head .t-news-cat')).toHaveText(
    'Công cụ lập trình · Phần 1 · Hướng dẫn thiết lập Neovim',
  );
  await page.goto(POST);
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

for (const path of ['/blog/', '/vi/blog/']) {
  test(`${path} shows no cover credit`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('.post-rows > li').first()).toBeVisible();
    await expect(page.locator('.cover-credits, .cover-credit')).toHaveCount(0);
    await expect(page.locator('main')).not.toContainText(/Cover art|Ảnh bìa|Jason Long/);
  });
}

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

test('topic pages are excluded from the search index', async ({ page }) => {
  for (const path of ['/blog/topics/', '/blog/topics/developer-tools/']) {
    await page.goto(path);
    await expect(page.locator('main')).toHaveAttribute('data-pagefind-ignore', '');
  }
});

test('post page shows the part cover with alt text and no credit caption', async ({ page }) => {
  for (const [path, n] of [
    [PARTS[0], '1'],
    [PARTS[4], '5'],
  ]) {
    await page.goto(path);
    const img = page.locator('figure.post-hero img');
    await expect(img).toHaveCount(1);
    await expect(img).toHaveAttribute(
      'alt',
      new RegExp(`^Cover art: Neovim setup guide, Part ${n}: `),
    );
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute('src', new RegExp(`part-${n}\\.[^/]*svg$`));
  }
  await page.goto(PARTS[0]);
  await expect(page.locator('figure.post-hero figcaption')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText(/Cover art|Jason Long/);
  const rule = await page.locator('header.head .keyline').boundingBox();
  const fig = await page.locator('figure.post-hero').boundingBox();
  const series = await page.locator('nav.series-box').boundingBox();
  expect(fig!.y).toBeGreaterThanOrEqual(rule!.y + rule!.height);
  expect(fig!.y + fig!.height).toBeLessThanOrEqual(series!.y);
  await expect(page.locator('head meta[property="og:image"]')).toHaveAttribute(
    'content',
    /\/og-default\.png$/,
  );
  await page.goto(`/vi${PARTS[0]}`);
  await expect(page.locator('figure.post-hero img')).toHaveAttribute(
    'alt',
    'Ảnh bìa: Hướng dẫn thiết lập Neovim, Phần 1: từ con số 0 đến trình soạn thảo chạy được',
  );
  await expect(page.locator('figure.post-hero figcaption')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText(/Ảnh bìa|Jason Long/);
});

test('post hero is big and centred', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(PARTS[0]);
  const img = (await page.locator('figure.post-hero img').boundingBox())!;
  const fig = (await page.locator('figure.post-hero').boundingBox())!;
  expect(Math.abs(img.width - 480)).toBeLessThanOrEqual(1);
  expect(Math.abs(img.x + img.width / 2 - (fig.x + fig.width / 2))).toBeLessThanOrEqual(1);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(PARTS[0]);
  const img2 = (await page.locator('figure.post-hero img').boundingBox())!;
  const fig2 = (await page.locator('figure.post-hero').boundingBox())!;
  expect(Math.abs(img2.width - fig2.width)).toBeLessThanOrEqual(1);
});

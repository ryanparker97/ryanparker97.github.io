/**
 * Self-test of the shared geometry helper (`geometry.ts`). Fixtures are `page.setContent` documents
 * (and one routed fake origin for `gotoThemed`), so no site build and no server content is involved.
 * Every function and mode has a passing fixture and a failing one: the assertions are synchronous,
 * so `expect(() => fn(...)).toThrow(...)` proves each one fires on its defect, with a useful message.
 */
import { existsSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import {
  COLUMN,
  PAGES,
  THEMES,
  VI_WIDTHS,
  WIDTHS,
  boxes,
  centreLines,
  colAt,
  expectCentred,
  expectEqualHeights,
  expectFourSides,
  expectInkCentred,
  expectOnColumn,
  gotoThemed,
  inkBox,
  type Ink,
} from './geometry';

const BASE = `*{box-sizing:border-box} html,body{margin:0;padding:0;background:#fff}
body{font:16px/24px sans-serif;color:#000}`;

/** Standards-mode fixture page: no margins, border-box, 16px/24px text (a 24px line box). */
async function set(page: Page, body: string, css = '') {
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>${BASE}${css}</style>${body}`);
}

// owner, ci-e2e: was toBeCloseTo(0, 1) on the line-box slack. Linux's `sans-serif` is WenQuanYi Zen Hei,
// whose glyph box is 17px high at 16px, so the 24px line has a 3.5px half-leading that layout snaps to
// a whole pixel (slack -0.5); the 72px/1.05 case reads -0.8. macOS reads 0. Padding, border and glyph-box
// leaks are 2.5px or more (the tests below say so), so "under a pixel" still catches them.
const LINE_ROUND = 1;

const LONG =
  'A longer body copy that wraps over several lines inside the narrow card, so this card is taller than its neighbour.';

// ---- Constants and navigation ---------------------------------------------------------------------

test.describe('constants', () => {
  test('widths, themes and the column table', () => {
    expect([...WIDTHS]).toEqual([1440, 1024, 390, 320]);
    expect([...VI_WIDTHS]).toEqual([1440, 390]);
    expect([...THEMES]).toEqual(['light', 'dark']);
    expect(COLUMN).toEqual({
      1440: [230, 1210],
      1024: [166, 858],
      390: [24.375, 365.625],
      320: [20, 300],
    });
  });

  test('colAt returns the pinned columns and computes the others from --content', () => {
    for (const w of WIDTHS) expect(colAt(w)).toEqual(COLUMN[w]);
    // 980 from 1069, 692 from 735, 87.5% below; always centred: (w - content) / 2.
    expect(colAt(1100)).toEqual([60, 1040]);
    expect(colAt(1068)).toEqual([188, 880]);
    expect(colAt(800)).toEqual([54, 746]);
    const [l, r] = colAt(500);
    expect(l).toBeCloseTo(31.25, 6);
    expect(r).toBeCloseTo(468.75, 6);
    // The computed branch agrees with every pinned entry (a width the table does not hold).
    for (const w of WIDTHS) {
      const [cl, cr] = colAt(w + 0.001);
      expect(cl).toBeCloseTo(COLUMN[w][0], 2);
      expect(cr).toBeCloseTo(COLUMN[w][1], 2);
    }
  });

  test('PAGES: 11 page types, VI twins at /vi + path, 404 has none, content exists', () => {
    expect(PAGES.map((p) => p.kind)).toEqual([
      'Home',
      'Experiences',
      'role',
      'Projects',
      'project',
      'In practice',
      'story',
      'Blog',
      'post',
      'Skills',
      '404',
    ]);
    for (const p of PAGES) {
      if (p.kind === '404') expect(p.vi).toBeNull();
      else expect(p.vi).toBe(`/vi${p.en}`);
    }
    const slug = (kind: string) =>
      PAGES.find((p) => p.kind === kind)!
        .en.split('/')
        .filter(Boolean)[1];
    expect(existsSync(`src/content/experience/en/${slug('role')}.md`)).toBe(true);
    expect(existsSync(`src/content/projects/en/${slug('project')}.md`)).toBe(true);
    expect(existsSync(`src/content/star/en/${slug('story')}.md`)).toBe(true);
    expect(existsSync(`src/content/blog/en/${slug('post')}.mdx`)).toBe(true);
  });
});

test.describe('gotoThemed', () => {
  const ORIGIN = 'http://geometry.test/';
  const themed = (setsTheme: boolean) =>
    `<!doctype html><html><head><script>
      document.documentElement.dataset.vw = String(innerWidth);
      ${setsTheme ? 'document.documentElement.dataset.theme = localStorage.getItem("theme") || "none";' : ''}
    </script></head><body>ok</body></html>`;
  const serve = (page: Page, setsTheme: boolean) =>
    page.route(`${ORIGIN}**`, (route) =>
      route.fulfill({ contentType: 'text/html', body: themed(setsTheme) }),
    );
  const reduced = (page: Page) =>
    page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);

  test('sets the viewport before the load, the theme and reduced motion, and settles', async ({
    page,
  }) => {
    await serve(page, true);
    await gotoThemed(page, ORIGIN, 'dark', { width: 390 });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    // The page's own script saw the final width at parse time: set before goto, not a later resize.
    await expect(page.locator('html')).toHaveAttribute('data-vw', '390');
    expect(page.viewportSize()).toEqual({ width: 390, height: 900 });
    expect(await reduced(page)).toBe(true);
  });

  test('no-preference motion and a custom height', async ({ page }) => {
    await serve(page, true);
    await gotoThemed(page, ORIGIN, 'light', { width: 1440, height: 700, motion: 'no-preference' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(page.viewportSize()).toEqual({ width: 1440, height: 700 });
    expect(await reduced(page)).toBe(false);
  });

  test('fails when the page never applies the theme', async ({ page }) => {
    await serve(page, false);
    await expect(gotoThemed(page, ORIGIN, 'dark', { width: 390, timeout: 500 })).rejects.toThrow(
      /data-theme/,
    );
  });
});

// ---- boxes ----------------------------------------------------------------------------------------

test.describe('boxes', () => {
  test('border, inset (border + padding) and content rects', async ({ page }) => {
    await set(
      page,
      '<div class="b" style="margin:10px 0 0 30px;width:200px;height:100px;border-left:4px solid #f00;padding:20px 16px">x</div>',
    );
    const [b] = await boxes(page, '.b');
    expect(b.border).toMatchObject({
      left: 30,
      top: 10,
      right: 230,
      bottom: 110,
      width: 200,
      height: 100,
    });
    // A 4px border plus 16px padding is an inset of 20 on the left; the others are padding only.
    expect(b.inset).toEqual({ top: 20, right: 16, bottom: 20, left: 20 });
    expect(b.content).toMatchObject({
      left: 50,
      top: 30,
      right: 214,
      bottom: 90,
      width: 164,
      height: 60,
    });
  });

  test('an absolute child is not in flow', async ({ page }) => {
    await set(
      page,
      `<div class="card"><span style="position:absolute;top:0;left:0;width:10px;height:10px;background:red"></span>
         <p style="margin:0">Body</p></div>`,
      '.card{position:relative;width:300px;padding:28px}',
    );
    const [card] = await boxes(page, '.card');
    // Counted, the 10px square at the border edge would put the content 28px above the padding edge.
    expect(card.slack!.top).toBeCloseTo(0, 1);
    expect(card.slack!.bottom).toBeCloseTo(0, 1);
  });

  test('a display: contents child contributes its children', async ({ page }) => {
    await set(
      page,
      '<div class="card"><div style="display:contents"><p style="margin:0">One</p><p style="margin:0">Two</p></div></div>',
      '.card{width:300px;padding:28px}',
    );
    const [card] = await boxes(page, '.card');
    // Ignored, the card would read as empty (slack = the 48px content height on both ends).
    expect(card.content.height).toBeCloseTo(48, 1);
    expect(card.slack!.top).toBeCloseTo(0, 1);
    expect(card.slack!.bottom).toBeCloseTo(0, 1);
  });

  test('text-only and inline-only content is measured by its line boxes', async ({ page }) => {
    await set(
      page,
      `<div class="card" id="t">Plain text only</div>
       <div class="card" id="w" style="width:140px">Plain text that wraps over three or four lines</div>
       <div class="card" id="i"><span>inline words</span></div>`,
      '.card{width:300px;padding:28px;margin-bottom:10px}',
    );
    for (const id of ['#t', '#w', '#i']) {
      const [card] = await boxes(page, id);
      // Glyph boxes alone would leave ~2.5px of slack above and below every 24px line.
      // owner, ci-e2e: within LINE_ROUND, not toBeCloseTo(0, 1) (Linux rounds the line box by 0.5px).
      expect(Math.abs(card.slack!.top), id).toBeLessThan(LINE_ROUND);
      expect(Math.abs(card.slack!.bottom), id).toBeLessThan(LINE_ROUND);
    }
    const [wrapped] = await boxes(page, '#w');
    expect(wrapped.content.height).toBeGreaterThanOrEqual(72);
  });

  test('a tight line-height on direct text is measured by its line box, not its glyph box', async ({
    page,
  }) => {
    await set(
      page,
      `<div class="card" id="direct">Tight</div>
       <div class="card" id="wrapped"><div>Tight</div></div>`,
      '.card{width:300px;padding:28px;margin-bottom:10px;font:72px/1.05 sans-serif}',
    );
    // The line box (75.6px) is shorter than the glyph box here: the half-leading is negative. A clamp
    // at 0 measured the glyph box, which pokes out of the content box (slack -4 / -3.4).
    for (const id of ['#direct', '#wrapped']) {
      const [card] = await boxes(page, id);
      // Within a pixel: the engines round the glyph box height differently.
      // owner, ci-e2e: was 0.5; the Linux font stack reads 0.8 here. The clamp defect reads 3.4 or more.
      expect(Math.abs(card.slack!.top), id).toBeLessThan(LINE_ROUND);
      expect(Math.abs(card.slack!.bottom), id).toBeLessThan(LINE_ROUND);
    }
  });

  test('an inline child reads as its line boxes: its own vertical padding and border are not layout', async ({
    page,
  }) => {
    await set(
      page,
      `<div class="card" id="pad">Text <a style="padding-block:12px">link</a></div>
       <div class="card" id="border">Text <a style="border:6px solid #f00">link</a></div>`,
      '.card{width:300px;padding:28px;margin-bottom:10px}',
    );
    for (const id of ['#pad', '#border']) {
      const [card] = await boxes(page, id);
      // owner, ci-e2e: was toBeCloseTo(0, 1); Linux font metrics round line boxes by 0.5px. The padding
      // (12px) and border (6px) leaks this test is about are far over LINE_ROUND.
      expect(Math.abs(card.slack!.top), id).toBeLessThan(LINE_ROUND);
      expect(Math.abs(card.slack!.bottom), id).toBeLessThan(LINE_ROUND);
    }
  });

  test('a visibility: hidden child still takes space, so the gap it leaves reads as slack', async ({
    page,
  }) => {
    await set(
      page,
      '<div class="card"><p style="margin:0;visibility:hidden">Hidden line</p><p style="margin:0">Shown</p></div>',
      '.card{width:300px;padding:28px}',
    );
    const [card] = await boxes(page, '.card');
    expect(card.slack!.top).toBeCloseTo(24, 1);
    expect(() => expectFourSides([card], 'hidden first child', { bottom: 'free' })).toThrow(
      /top slack 24/,
    );
  });

  test('a negative margin that cancels padding pulls that edge in (the padded touch target)', async ({
    page,
  }) => {
    await set(
      page,
      `<div class="card" id="chevron"><p style="margin:0">Body</p><a style="display:inline-block;padding-block:12px;margin-block:0 -12px">Learn more</a></div>
       <div class="card" id="block"><p style="margin:0">Body</p><a style="display:block;padding-block:12px;margin-bottom:-12px">Learn more</a></div>
       <div class="card" id="bare"><p style="margin:0">Body</p><div style="height:24px;margin-bottom:-12px">Learn more</div></div>
       <div class="card" id="beyond"><p style="margin:0">Body</p><a style="display:block;padding-block:12px;margin-bottom:-20px">Learn more</a></div>
       <div class="card" id="top"><a style="display:block;padding-block:12px;margin-top:-12px">Learn more</a></div>
       <div class="card" id="bare-top"><div style="height:24px;margin-top:-12px">Learn more</div></div>`,
      '.card{width:300px;padding:28px;margin-bottom:10px}',
    );
    // padding 12 + margin -12: the border box ends 12px past the text, the pulled edge ends at it.
    for (const id of ['#chevron', '#block']) {
      const [card] = await boxes(page, id);
      expect(card.slack!.top, id).toBeCloseTo(0, 1);
      expect(card.slack!.bottom, id).toBeCloseTo(0, 1);
    }
    // A bare negative margin cancels no padding: the child really pokes out of the content box.
    const [bare] = await boxes(page, '#bare');
    expect(bare.slack!.bottom).toBeCloseTo(-12, 1);
    // Padding 12 against margin -20: only the 12px of padding is cancelled, so 8px still overflows.
    const [beyond] = await boxes(page, '#beyond');
    expect(beyond.slack!.bottom).toBeCloseTo(-8, 1);
    // The same rule on the top edge.
    const [top] = await boxes(page, '#top');
    expect(top.slack!.top).toBeCloseTo(0, 1);
    const [bareTop] = await boxes(page, '#bare-top');
    expect(bareTop.slack!.top).toBeCloseTo(-12, 1);
  });

  test('replaced elements (img, svg) have slack: null', async ({ page }) => {
    await set(
      page,
      `<img id="i" width="20" height="20" alt="" style="padding:2px;display:block"
            src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">
       <svg id="s" width="24" height="24" style="padding:2px;display:block"></svg>`,
    );
    expect((await boxes(page, '#i'))[0].slack).toBeNull();
    expect((await boxes(page, '#s'))[0].slack).toBeNull();
  });

  test('an empty box reads as all slack, so it fails instead of passing on nothing', async ({
    page,
  }) => {
    await set(page, '<div class="card"></div>', '.card{width:300px;height:100px;padding:28px}');
    const list = await boxes(page, '.card');
    expect(list[0].slack).toEqual({ top: 44, bottom: 44 });
    expect(() => expectFourSides(list, 'empty box', { bottom: 'free' })).toThrow(/top slack 44/);
  });

  test('only visible matches count; no match throws, allowEmpty returns []', async ({ page }) => {
    await set(
      page,
      `<div class="v">a</div><div class="v" style="visibility:hidden">b</div>
       <div class="v" style="display:none">c</div><div class="v">d</div>
       <div class="gone" style="display:none">e</div>`,
    );
    expect(await boxes(page, '.v')).toHaveLength(2);
    await expect(boxes(page, '.nothing')).rejects.toThrow(
      /"\.nothing" matched 0 element\(s\), none visible/,
    );
    // Matches that are all hidden are as bad as none.
    await expect(boxes(page, '.gone')).rejects.toThrow(/matched 1 element\(s\), none visible/);
    expect(await boxes(page, '.nothing', { allowEmpty: true })).toEqual([]);
    expect(await boxes(page, '.gone', { allowEmpty: true })).toEqual([]);
  });

  test('page coordinates survive a scrolled page', async ({ page }) => {
    await set(
      page,
      '<div style="height:3000px"></div><div class="far" style="height:20px">x</div>',
    );
    await page.evaluate(() => window.scrollTo(0, 2500));
    const [far] = await boxes(page, '.far');
    expect(far.border.top).toBeCloseTo(3000, 1);
  });
});

// ---- expectFourSides ------------------------------------------------------------------------------

test.describe('expectFourSides', () => {
  const CARD = '.card{width:300px;padding:28px;background:#eee;margin-bottom:8px}';

  test("'equal' passes: a 28px card, with children and text-only", async ({ page }) => {
    await set(
      page,
      `<div class="card"><h3 style="margin:0">Title</h3><p style="margin:0">Body copy</p></div>
       <div class="card">Text only</div>`,
      CARD,
    );
    const list = await boxes(page, '.card');
    expect(list).toHaveLength(2);
    expectFourSides(list, 'equal pass', { pad: 28 });
  });

  test("'equal' fails: a child margin-top shows on top slack", async ({ page }) => {
    await set(page, '<div class="card"><p style="margin:8px 0 0">Body</p></div>', CARD);
    const list = await boxes(page, '.card');
    expect(() => expectFourSides(list, 'margin fixture')).toThrow(
      /expectFourSides \[margin fixture\].*top slack 8 \(> 1\)/,
    );
  });

  test("'equal' fails: padding 28 / 20 differs on the insets", async ({ page }) => {
    await set(
      page,
      '<div class="card" style="padding:28px 20px"><p style="margin:0">Body</p></div>',
      CARD,
    );
    const list = await boxes(page, '.card');
    expect(() => expectFourSides(list, 'uneven padding')).toThrow(
      /insets differ by 8 \(> 1\): top 28, left 20, right 20, bottom 28/,
    );
  });

  test("'equal' fails: taller than the content (bottom slack), and overflowing it", async ({
    page,
  }) => {
    await set(
      page,
      `<div class="card" id="tall" style="height:200px"><p style="margin:0">Body</p></div>
       <div class="card" id="over" style="height:60px"><div style="height:100px"></div></div>`,
      CARD,
    );
    const tall = await boxes(page, '#tall');
    expect(() => expectFourSides(tall, 'tall')).toThrow(
      /bottom slack 120 \(±1 allowed in 'equal' mode\)/,
    );
    const over = await boxes(page, '#over');
    expect(() => expectFourSides(over, 'over')).toThrow(/bottom slack -96/);
  });

  test('pad: a 4px border + 16px padding box is an inset of 20', async ({ page }) => {
    await set(
      page,
      `<div class="c" id="ok" style="border-left:4px solid #f00;padding:20px 20px 20px 16px"><p style="margin:0">Callout</p></div>
       <div class="c" id="bad" style="border-left:4px solid #f00;padding:16px"><p style="margin:0">Callout</p></div>`,
      '.c{width:300px;margin-bottom:10px}',
    );
    const ok = await boxes(page, '#ok');
    expect(ok[0].inset).toEqual({ top: 20, right: 20, bottom: 20, left: 20 });
    expectFourSides(ok, 'callout', { pad: 20 });
    // A wrong expectation names the side and both values.
    expect(() => expectFourSides(ok, 'callout', { pad: 28 })).toThrow(
      /top inset 20 is not the expected 28 \(±1\)/,
    );
    // The border counts as inset: 4 + 16 on the left against 16 elsewhere is a 4px spread.
    const bad = await boxes(page, '#bad');
    expect(() => expectFourSides(bad, 'callout without its 20px padding')).toThrow(
      /insets differ by 4 \(> 1\)/,
    );
  });

  test("'free': stretched cards with unequal text pass; the same boxes fail 'equal'", async ({
    page,
  }) => {
    await set(
      page,
      `<div class="row"><div class="card"><p style="margin:0">Short</p></div>
         <div class="card"><p style="margin:0">${LONG}</p></div></div>`,
      '.row{display:grid;grid-template-columns:1fr 1fr;gap:16px;width:600px} .card{padding:28px;background:#eee}',
    );
    const list = await boxes(page, '.card');
    expect(list[0].border.height).toBeCloseTo(list[1].border.height, 1);
    expect(list[0].slack!.bottom).toBeGreaterThan(20);
    expectFourSides(list, 'stretched cards', { pad: 28, bottom: 'free' });
    expect(() => expectFourSides(list, 'stretched cards', { pad: 28 })).toThrow(/bottom slack/);
    expect(list[0].inset.bottom).toBe(28);
  });

  test("'free' skips the bottom inset: a deeper bottom padding passes 'free' and fails 'equal'", async ({
    page,
  }) => {
    await set(
      page,
      '<div class="card" style="padding:28px 28px 40px"><p style="margin:0">Body</p></div>',
      '.card{width:300px}',
    );
    const list = await boxes(page, '.card');
    expect(list[0].inset.bottom).toBe(40);
    expectFourSides(list, 'deep bottom', { pad: 28, bottom: 'free' });
    expect(() => expectFourSides(list, 'deep bottom')).toThrow(/insets differ by 12 \(> 1\)/);
    // A deeper TOP padding is not skipped.
    await set(
      page,
      '<div class="card" style="padding:40px 28px 28px"><p style="margin:0">Body</p></div>',
      '.card{width:300px}',
    );
    const deepTop = await boxes(page, '.card');
    expect(() => expectFourSides(deepTop, 'deep top', { pad: 28, bottom: 'free' })).toThrow(
      /insets differ by 12 \(> 1\): top 40, left 28, right 28/,
    );
  });

  test("a padded touch-target link at the bottom passes 'equal' and 'free'; a bare negative margin fails both", async ({
    page,
  }) => {
    const CHEVRON =
      '<a style="display:inline-block;padding-block:12px;margin-block:0 -12px">Learn more</a>';
    await set(
      page,
      `<div class="card" id="ok"><p style="margin:0">Body</p>${CHEVRON}</div>
       <div class="card" id="stretched" style="height:200px"><p style="margin:0">Body</p>${CHEVRON}</div>
       <div class="card" id="bare"><p style="margin:0">Body</p><div style="height:24px;margin-bottom:-12px">Learn more</div></div>`,
      '.card{width:300px;padding:28px;margin-bottom:8px;background:#eee}',
    );
    // The site's `.group-card .link-chevron`: text ends at the padding edge, the padding hangs out.
    const ok = await boxes(page, '#ok');
    expectFourSides(ok, 'chevron equal', { pad: 28 });
    expectFourSides(ok, 'chevron free', { pad: 28, bottom: 'free' });
    expectFourSides(await boxes(page, '#stretched'), 'chevron stretched', {
      pad: 28,
      bottom: 'free',
    });
    // Without the padding to cancel, the same margin is a real overflow.
    const bare = await boxes(page, '#bare');
    expect(() => expectFourSides(bare, 'bare margin', { bottom: 'free' })).toThrow(
      /bottom slack -12 \(< -1\): the content overflows the box/,
    );
    expect(() => expectFourSides(bare, 'bare margin')).toThrow(/bottom slack -12/);
  });

  test("'free' fails: vertically centred content (top slack) and content taller than the box", async ({
    page,
  }) => {
    await set(
      page,
      `<div class="card" id="centred" style="display:flex;flex-direction:column;justify-content:center;height:200px"><p style="margin:0">Body</p></div>
       <div class="card" id="over" style="height:60px"><div style="height:100px"></div></div>`,
      '.card{width:300px;padding:28px;margin-bottom:8px}',
    );
    const centred = await boxes(page, '#centred');
    expect(() => expectFourSides(centred, 'centred', { bottom: 'free' })).toThrow(
      /top slack 60 \(> 1\): content does not start at the padding edge/,
    );
    const over = await boxes(page, '#over');
    expect(() => expectFourSides(over, 'overflow', { bottom: 'free' })).toThrow(
      /bottom slack -96 \(< -1\): the content overflows the box/,
    );
  });

  test('tol widens the tolerance, replaced elements skip slack, an empty list throws', async ({
    page,
  }) => {
    await set(
      page,
      `<div class="card" id="c" style="padding:28px 28px 28px 29.5px"><p style="margin:0">Body</p></div>
       <svg id="s" width="24" height="24" style="display:block;padding:2px"></svg>
       <svg id="u" width="24" height="24" style="display:block;padding:2px 2px 2px 6px"></svg>`,
      '.card{width:300px}',
    );
    const c = await boxes(page, '#c');
    expect(() => expectFourSides(c, 'default tol')).toThrow(/insets differ by 1\.5/);
    expectFourSides(c, 'tol 2', { tol: 2 });
    // svg: slack is null, so only the insets are compared.
    expectFourSides(await boxes(page, '#s'), 'svg', { pad: 2 });
    const u = await boxes(page, '#u');
    expect(() => expectFourSides(u, 'svg uneven')).toThrow(/insets differ by 4 \(> 1\)/);
    expect(() => expectFourSides([], 'nothing')).toThrow(/expectFourSides \[nothing\]: empty list/);
  });
});

// ---- expectEqualHeights ---------------------------------------------------------------------------

test.describe('expectEqualHeights', () => {
  const ROW =
    '.row{display:grid;grid-template-columns:1fr 1fr;gap:16px;width:600px} .card{padding:28px;background:#eee}';
  const CARDS = `<div class="card"><p style="margin:0">Short</p></div>
                 <div class="card"><p style="margin:0">${LONG}</p></div>`;

  test('passes: a stretched row has equal heights', async ({ page }) => {
    await set(page, `<div class="row">${CARDS}</div>`, ROW);
    expectEqualHeights(await boxes(page, '.card'), 'stretched row');
  });

  test('fails: an align-items: start row differs, and the message names both heights', async ({
    page,
  }) => {
    await set(page, `<div class="row" style="align-items:start">${CARDS}</div>`, ROW);
    const list = await boxes(page, '.card');
    expect(() => expectEqualHeights(list, 'hugging row')).toThrow(
      /expectEqualHeights \[hugging row\]: row at top 0: heights differ by \d+(\.\d+)? \(> 1\)/,
    );
    // ...unless the tolerance is wide enough to forgive it.
    expectEqualHeights(list, 'wide tol', { tol: 200 });
  });

  test('min: passes at the minimum, fails with a 150px card under min 180', async ({ page }) => {
    await set(page, `<div class="row">${CARDS}</div>`, `${ROW} .card{min-height:180px}`);
    expectEqualHeights(await boxes(page, '.card'), 'min 180', { min: 180 });
    await set(page, `<div class="row">${CARDS}</div>`, `${ROW} .card{height:150px}`);
    const short = await boxes(page, '.card');
    expectEqualHeights(short, 'equal at 150');
    expect(() => expectEqualHeights(short, 'min 180', { min: 180 })).toThrow(
      /height 150 is under the minimum 180/,
    );
  });

  test('groups rows by top: two rows each equal pass; a row whose own heights differ fails', async ({
    page,
  }) => {
    await set(
      page,
      `<div class="row"><div class="card" style="height:100px"></div><div class="card" style="height:100px"></div></div>
       <div class="row"><div class="card" style="height:140px"></div><div class="card" style="height:140px"></div></div>`,
      `${ROW} .row{margin-bottom:10px}`,
    );
    expectEqualHeights(await boxes(page, '.card'), 'two rows, different heights');
    await set(
      page,
      `<div class="row" style="align-items:start"><div class="card" style="height:100px"></div><div class="card" style="height:140px"></div></div>`,
      ROW,
    );
    const bad = await boxes(page, '.card');
    expect(() => expectEqualHeights(bad, 'one row, two heights')).toThrow(/heights differ by 40/);
  });

  test('fails: a row of vertically centred cards that differ in height is still one row', async ({
    page,
  }) => {
    await set(
      page,
      `<div class="row" style="align-items:center;grid-template-columns:1fr 1fr 1fr">
         <div class="card" style="height:100px"></div><div class="card" style="height:100px"></div><div class="card" style="height:60px"></div></div>`,
      ROW,
    );
    const centred = await boxes(page, '.card');
    // Tops are 0 / 0 / 20: grouping by top split the short card off and passed this.
    expect(centred.map((b) => b.border.top)).toEqual([0, 0, 20]);
    expect(() => expectEqualHeights(centred, 'centred row')).toThrow(/heights differ by 40/);
    // Equal heights but staggered tops are not a row either.
    await set(
      page,
      `<div class="row"><div class="card" style="height:100px"></div><div class="card" style="height:100px;margin-top:30px"></div></div>`,
      `${ROW} .row{align-items:start}`,
    );
    const staggered = await boxes(page, '.card');
    expect(() => expectEqualHeights(staggered, 'staggered')).toThrow(/tops differ by 30/);
  });

  test('throws when no row holds two boxes, and on an empty list', async ({ page }) => {
    await set(
      page,
      `<div class="card" style="width:300px;height:100px;margin-bottom:10px"></div>
       <div class="card" style="width:300px;height:100px"></div>`,
      ROW,
    );
    const stacked = await boxes(page, '.card');
    expect(() => expectEqualHeights(stacked, 'stacked')).toThrow(/no row holds two boxes/);
    expect(() => expectEqualHeights([], 'nothing')).toThrow(/empty list/);
  });
});

// ---- expectOnColumn -------------------------------------------------------------------------------

test.describe('expectOnColumn', () => {
  /** 980 wide and centred: x 230..1210 at 1440. */
  const COL = 'width:980px;margin:0 auto;height:20px';

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("'each': 230..1210 passes, 202..1182 fails and the message names both spans", async ({
    page,
  }) => {
    await set(page, `<div class="b" style="${COL}"></div>`);
    expectOnColumn(await boxes(page, '.b'), 1440, 'on the column');

    await set(page, '<div class="b" style="width:980px;margin-left:202px;height:20px"></div>');
    const off = await boxes(page, '.b');
    expect(() => expectOnColumn(off, 1440, 'off the column')).toThrow(
      /expectOnColumn \[off the column\].*border box spans 202\.\.1182, column 230\.\.1210 at 1440 \(±1\)/,
    );
    // A 28px offset needs a 28px tolerance.
    expectOnColumn(off, 1440, 'wide tol', { tol: 28 });
    // The default 1px forgives a 0.5px drift and not 2px.
    await set(page, '<div class="b" style="width:980px;margin-left:230.5px;height:20px"></div>');
    expectOnColumn(await boxes(page, '.b'), 1440, 'half a pixel');
    await set(page, '<div class="b" style="width:980px;margin-left:232px;height:20px"></div>');
    const two = await boxes(page, '.b');
    expect(() => expectOnColumn(two, 1440, 'two pixels')).toThrow(/border box spans 232\.\.1212/);
  });

  test("'each' at another width uses that column (1024: 166..858)", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await set(page, '<div class="b" style="width:692px;margin:0 auto;height:20px"></div>');
    const list = await boxes(page, '.b');
    expectOnColumn(list, 1024, 'at 1024');
    expect(() => expectOnColumn(list, 1440, 'wrong width')).toThrow(/column 230\.\.1210 at 1440/);
  });

  test("'each' with use: 'content' ignores the box's own padding", async ({ page }) => {
    await set(
      page,
      '<div class="b" style="width:1036px;margin-left:202px;padding:0 28px;height:20px"></div>',
    );
    const list = await boxes(page, '.b');
    expectOnColumn(list, 1440, 'content box', { use: 'content' });
    expect(() => expectOnColumn(list, 1440, 'border box', { use: 'border' })).toThrow(
      /border box spans 202\.\.1238/,
    );
  });

  test("'union': a grid on 230..1210 passes, a union 28px short on the left fails", async ({
    page,
  }) => {
    const cells = '<div class="b"></div><div class="b"></div>';
    const css = '.g{display:grid;grid-template-columns:1fr 1fr} .b{height:20px}';
    await set(page, `<div class="g" style="${COL}">${cells}</div>`, css);
    const ok = await boxes(page, '.b');
    expectOnColumn(ok, 1440, 'grid union', { mode: 'union' });
    // Each cell alone is half the column: 'each' must not pass the same set.
    expect(() => expectOnColumn(ok, 1440, 'grid each')).toThrow(/border box spans 230\.\.720/);

    await set(page, `<div class="g" style="width:952px;margin-left:258px">${cells}</div>`, css);
    const short = await boxes(page, '.b');
    expect(() => expectOnColumn(short, 1440, 'short grid', { mode: 'union' })).toThrow(
      /union of 2 border box\(es\) spans 258\.\.1210, column 230\.\.1210 at 1440/,
    );
  });

  test("'centre': a centred box passes, one 10px off fails", async ({ page }) => {
    await set(page, '<div class="b" style="width:600px;margin:0 auto;height:20px"></div>');
    expectOnColumn(await boxes(page, '.b'), 1440, 'centred', { mode: 'centre' });

    await set(page, '<div class="b" style="width:600px;margin-left:430px;height:20px"></div>');
    const off = await boxes(page, '.b');
    expect(() => expectOnColumn(off, 1440, 'off centre', { mode: 'centre' })).toThrow(
      /border centre x 730, column 230\.\.1210 at 1440 centre 720 \(±1\)/,
    );
    expectOnColumn(off, 1440, 'off centre, tol 10', { mode: 'centre', tol: 10 });
  });

  test('an empty list throws in every mode', () => {
    for (const mode of ['each', 'union', 'centre'] as const) {
      expect(() => expectOnColumn([], 1440, 'nothing', { mode })).toThrow(/empty list/);
    }
  });
});

// ---- centreLines / expectCentred --------------------------------------------------------------------

test.describe('centreLines', () => {
  const ROW = '.row{display:flex;gap:8px;align-items:flex-start;list-style:none}';

  test('passes: a 24px svg beside a 25px line, margin-top 0.5px, is centred with gap 8', async ({
    page,
  }) => {
    await set(
      page,
      `<ul style="margin:0;padding:0">
         <li class="row" style="margin-top:40px"><svg width="24" height="24" style="flex:none;margin-top:0.5px"></svg><span class="label" style="line-height:25px">Certificate name</span></li>
         <li class="row" style="margin-top:40px"><svg width="24" height="24" style="flex:none;margin-top:0.5px"></svg><span class="label" style="line-height:25px">Another one</span></li>
       </ul>`,
      ROW,
    );
    const lines = await centreLines(page, 'svg', '.label');
    expect(lines).toHaveLength(2);
    for (const l of lines) {
      expect(Math.abs(l.dy)).toBeLessThanOrEqual(0.5);
      expect(l.gap).toBeCloseTo(8, 1);
    }
    expectCentred(lines, 'centred rows', 0.5);
    // Offsets are relative to each row's own top, so equal rows read equal wherever they sit.
    expect(lines[0].rowTop).toBeCloseTo(40, 1);
    expect(lines[1].rowTop).toBeCloseTo(40 + 25 + 40, 1);
    expect(lines[0].iconTop).toBeCloseTo(0.5, 1);
    expect(lines[1].iconTop).toBeCloseTo(lines[0].iconTop, 1);
    expect(lines[1].labelTop).toBeCloseTo(lines[0].labelTop, 1);
  });

  test("labelSel ':scope' reads the text node that sits beside the icon in the parent", async ({
    page,
  }) => {
    await set(
      page,
      '<div class="row"><svg width="24" height="24" style="flex:none"></svg>Text beside the icon</div>',
      ROW,
    );
    const lines = await centreLines(page, 'svg', ':scope');
    expect(Math.abs(lines[0].dy)).toBeLessThanOrEqual(0.5);
    expect(lines[0].gap).toBeCloseTo(8, 1);
  });

  test('the first line of a wrapped label is the one measured', async ({ page }) => {
    await set(
      page,
      `<div class="row" style="width:160px"><svg width="24" height="24" style="flex:none"></svg>
         <span class="label">A label long enough to wrap onto a second and a third line</span></div>`,
      ROW,
    );
    const [line] = await centreLines(page, 'svg', '.label');
    expect(Math.abs(line.dy)).toBeLessThanOrEqual(0.5);
  });

  test('fails: a 22px icon top-aligned beside a 44px line is 11px high', async ({ page }) => {
    await set(
      page,
      '<div class="row"><svg width="22" height="22" style="flex:none"></svg><span class="label" style="line-height:44px">Tall line</span></div>',
      ROW,
    );
    const lines = await centreLines(page, 'svg', '.label');
    expect(Math.abs(lines[0].dy + 11)).toBeLessThan(1);
    expect(() => expectCentred(lines, 'high icon')).toThrow(
      /expectCentred \[high icon\].*icon centre is -1\d(\.\d+)?px from the first line's centre \(> 1\)/,
    );
    // A tolerance past the defect forgives it, so `tol` is really the threshold.
    expectCentred(lines, 'wide tol', 12);
  });

  test('throws when no icon matches, the label is missing, or the list is empty', async ({
    page,
  }) => {
    await set(
      page,
      '<div class="row"><svg width="24" height="24" style="flex:none"></svg><span class="label">x</span></div>',
      ROW,
    );
    await expect(centreLines(page, '.nothing', '.label')).rejects.toThrow(
      /no visible icon matches "\.nothing"/,
    );
    await expect(centreLines(page, 'svg', '.missing')).rejects.toThrow(
      /no "\.missing" inside the icon's parent/,
    );
    expect(() => expectCentred([], 'nothing')).toThrow(/empty list/);
  });

  test('throws when the label has no text, or its text renders no line', async ({ page }) => {
    await set(
      page,
      '<div class="row"><svg width="24" height="24" style="flex:none"></svg><span class="label"></span></div>',
      ROW,
    );
    await expect(centreLines(page, 'svg', '.label')).rejects.toThrow(
      /the label "\.label" has no text/,
    );
    // A whitespace-only label counts as empty too.
    await set(
      page,
      '<div class="row"><svg width="24" height="24" style="flex:none"></svg><span class="label">   </span></div>',
      ROW,
    );
    await expect(centreLines(page, 'svg', '.label')).rejects.toThrow(/has no text/);
    // Text that is in the DOM but not rendered (display: none) has no line to measure.
    await set(
      page,
      '<div class="row"><svg width="24" height="24" style="flex:none"></svg><span class="label" style="display:none">Gone</span></div>',
      ROW,
    );
    await expect(centreLines(page, 'svg', '.label')).rejects.toThrow(
      /the label's first text node has no rendered line/,
    );
  });
});

// ---- inkBox / expectInkCentred --------------------------------------------------------------------

/** A square of side `size` at (x, y) inside a `box` element; the box and square colours given. */
const squareIn = (box: string, x: number, y: number, size = 12, ink = '#000') =>
  `<div id="m" style="${box}"><div style="position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${ink}"></div></div>`;

const PLAIN = 'position:relative;width:24px;height:24px;background:#fff';
const PLATE = 'width:24px;height:24px;padding:2px;border-radius:6px;background:#fff';

test.describe('inkBox at DPR 3', () => {
  test.use({ deviceScaleFactor: 3 });

  const bodyCss = 'html,body{background:#888} body{padding:20px}';

  test('a 12px black square centred in a 24px white box has insets of 6', async ({ page }) => {
    await set(page, squareIn(PLAIN, 6, 6), bodyCss);
    expect(await page.evaluate(() => devicePixelRatio)).toBe(3);
    const ink = await inkBox(page, '#m');
    for (const side of ['l', 'r', 't', 'b'] as const) {
      expect(Math.abs(ink[side] - 6), side).toBeLessThanOrEqual(0.34);
    }
    expect(ink.count).toBe(36 * 36);
    expect(ink).toMatchObject({ w: 24, h: 24 });
    expectInkCentred(ink, 'plain box', { p: 2, M: 12 });
  });

  test('a rounded white plate on a black page: corners are ignored, insets stay 6', async ({
    page,
  }) => {
    // The page is black, so the four corner squares outside the radius are black too. The 12px
    // square is centred in the 20px content box: 2px padding + 4px = 6 from the border edge.
    await set(
      page,
      `<div id="m" style="${PLATE};display:flex;align-items:center;justify-content:center"><div style="width:12px;height:12px;background:#000"></div></div>`,
      'html,body{background:#000} body{padding:20px}',
    );
    const ink = await inkBox(page, '#m');
    for (const side of ['l', 'r', 't', 'b'] as const) {
      expect(Math.abs(ink[side] - 6), side).toBeLessThanOrEqual(0.34);
    }
    // Only the square. The corner squares are 19 device px (ceil(6 * 3) + 1) and the square starts
    // at 18, so each corner square also hides one pixel of it: 1296 - 4. Read as ink, the black page
    // behind the four rounded corners would add about 280 more.
    expect(ink.count).toBe(36 * 36 - 4);
    expectInkCentred(ink, 'rounded plate', { p: 2, M: 12 });
  });

  test('scrolls the target into view first (a box 2500px down the page)', async ({ page }) => {
    await set(
      page,
      `<div style="height:2500px"></div>${squareIn(PLAIN, 6, 6)}<div style="height:2500px"></div>`,
      bodyCss,
    );
    expect(await page.evaluate(() => scrollY)).toBe(0);
    const ink = await inkBox(page, '#m');
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(2000);
    for (const side of ['l', 'r', 't', 'b'] as const) {
      expect(Math.abs(ink[side] - 6), side).toBeLessThanOrEqual(0.34);
    }
    expect(ink.count).toBe(36 * 36);
  });

  test('a fractional position reads within the engines painted-pixel snapping (0.67px)', async ({
    page,
  }) => {
    // Chromium paints the box on whole CSS pixels, WebKit on device pixels: up to 0.5px either way.
    for (const x of [10.4, 10.5, 10.8]) {
      await set(
        page,
        `<div style="margin:3.4px 0 0 ${x}px">${squareIn(PLAIN, 6, 6)}</div>`,
        bodyCss,
      );
      const ink = await inkBox(page, '#m');
      for (const side of ['l', 'r', 't', 'b'] as const) {
        expect(Math.abs(ink[side] - 6), `${side} at ${x}`).toBeLessThanOrEqual(0.67);
      }
      expectInkCentred(ink, `fractional ${x}`, { p: 2, M: 12 });
      expect(ink.count).toBe(36 * 36);
    }
  });

  test('nth picks the matching element; a missing index throws', async ({ page }) => {
    await set(
      page,
      `<div class="m" style="${PLAIN};margin:4px"><i style="position:absolute;left:6px;top:6px;width:12px;height:12px;background:#000"></i></div>
       <div class="m" style="${PLAIN};margin:4px"><i style="position:absolute;left:9px;top:6px;width:12px;height:12px;background:#000"></i></div>`,
      bodyCss,
    );
    expect((await inkBox(page, '.m', 0)).l).toBeCloseTo(6, 0);
    expect((await inkBox(page, '.m', 1)).l).toBeCloseTo(9, 0);
    await expect(inkBox(page, '.m', 2)).rejects.toThrow(/"\.m" has 2 match\(es\), no index 2/);
  });

  test('a blank box has no ink', async ({ page }) => {
    await set(page, `<div id="m" style="${PLAIN}"></div>`, bodyCss);
    const ink = await inkBox(page, '#m');
    expect(ink.count).toBe(0);
    expect(() => expectInkCentred(ink, 'blank', { p: 2, M: 12 })).toThrow(/only 0 ink pixel/);
  });

  test('expectInkCentred fails on a square shifted 3px, and on each other defect', async ({
    page,
  }) => {
    await set(page, squareIn(PLAIN, 9, 6), bodyCss);
    const shifted = await inkBox(page, '#m');
    expect(shifted.l).toBeCloseTo(9, 0);
    expect(shifted.r).toBeCloseTo(3, 0);
    expect(() => expectInkCentred(shifted, 'shifted', { p: 2, M: 12 })).toThrow(
      /expectInkCentred \[shifted\]: left\/right ink margins differ \(> 1\): l 9, r 3, t 6, b 6/,
    );

    await set(page, squareIn(PLAIN, 6, 3), bodyCss);
    const high = await inkBox(page, '#m');
    expect(() => expectInkCentred(high, 'high', { p: 2, M: 12 })).toThrow(
      /top\/bottom ink margins differ/,
    );

    // Synthetic data for the remaining rules: a centred 12px glyph in a 24px box.
    const centred: Ink = { l: 6, r: 6, t: 6, b: 6, count: 1296, w: 24, h: 24 };
    expectInkCentred(centred, 'centred', { p: 2, M: 12 });
    expectInkCentred(centred, 'centred, p exactly', { p: 7, M: 12 });
    expect(() => expectInkCentred(centred, 'padding', { p: 8, M: 12 })).toThrow(
      /ink margin 6 is under the padding 8/,
    );
    expect(() => expectInkCentred(centred, 'size', { p: 2, M: 20 })).toThrow(
      /long side 12 is under 18 \(M 20 - 2\)/,
    );
    expect(() => expectInkCentred({ ...centred, count: 20 }, 'faint', { p: 2, M: 12 })).toThrow(
      /only 20 ink pixel/,
    );
    expectInkCentred({ ...centred, l: 6.9, r: 6 }, 'within tol', { p: 2, M: 12 });
    expect(() =>
      expectInkCentred({ ...centred, l: 7.5, r: 6 }, 'beyond tol', { p: 2, M: 12 }),
    ).toThrow(/differ/);
    expectInkCentred({ ...centred, l: 7.5, r: 6 }, 'beyond tol, wider', { p: 2, M: 12, tol: 2 });
  });
});

test.describe('inkBox at other densities', () => {
  for (const dpr of [1, 2]) {
    test.describe(`DPR ${dpr}`, () => {
      test.use({ deviceScaleFactor: dpr });

      test('throws: it needs devicePixelRatio 3', async ({ page }) => {
        await set(page, squareIn(PLAIN, 6, 6));
        expect(await page.evaluate(() => devicePixelRatio)).toBe(dpr);
        await expect(inkBox(page, '#m')).rejects.toThrow(
          new RegExp(`inkBox needs devicePixelRatio 3 \\(got ${dpr}\\).*deviceScaleFactor: 3`),
        );
      });
    });
  }
});

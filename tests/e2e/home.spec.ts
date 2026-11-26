import { readdirSync, readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { WALL_SHOTS, wallHref } from '../../src/lib/wall';
import { colAt } from './geometry';
import { NEXT_FORBIDDEN, norm, withoutAllowed, withoutTitleSuffix } from './next-words';

const DIR = 'src/content/experience/en';
const files = readdirSync(DIR).filter((f) => f.endsWith('.md'));
// Newest first: same rule as sortRoles.
const order = files
  .map((f) => ({
    slug: f.replace(/\.md$/, ''),
    start: /^start: '?([\d-]+)/m.exec(readFileSync(`${DIR}/${f}`, 'utf8'))![1],
  }))
  .sort((a, b) => b.start.localeCompare(a.start));

// Profile facts, read from the source like the roles above. Home shows the name and the email; the
// location and the spoken languages must stay off it (owner decision, spec §4.1).
const profile = (lang: 'en' | 'vi') => {
  const src = readFileSync(`src/content/profile/${lang}/index.md`, 'utf8');
  return {
    name: /^name: '(.+)'$/m.exec(src)![1],
    headline: /^headline: '(.+)'$/m.exec(src)![1],
    email: /^email: '(.+)'$/m.exec(src)![1],
    location: /^location: '(.+)'$/m.exec(src)![1],
    languages: [...src.matchAll(/- language: '(.+)'\n\s+proficiency: '(.+)'/g)].map(
      (m) => `${m[1]} — ${m[2]}`,
    ),
    years: /^yearsOfExperience: '(.+)'$/m.exec(src)![1],
    linkedin: /^\s+linkedin: '(.+)'$/m.exec(src)![1],
  };
};
const EMAIL = profile('en').email;
const NAME = profile('en').name;

// The Wall (home-alt-6, spec §4.1) in page order: `main` holds `section#top` (the wall and the identity
// row), `section#next` and `section#more`, nothing else.
const BLOCKS = ['top', 'next', 'more'];
// Every block with an H2 `<id>-title` (every block below the wall).
const HEADED = ['next', 'more'];
// The four "›" links of the identity row: href and the i18n key of the visible label, in order.
const LINKS = [
  ['/experiences/', 'home.experience.cta'],
  ['/projects/agentic-coding-workflow/', 'projects.view'],
  ['/star/', 'star.all'],
  ['/blog/', 'home.posts.all'],
] as const;
// The name's font size per width band (HomeWall.astro: 2.75rem / 3.5rem / 4.5rem, capped at 19vw), the
// clip height, and the warm frame behind the photo (--warm) as computed.
// owner, photo-logos: "bigger photo, slightly smaller name": the L step is 72px (was 80, 5rem).
const STEP = (w: number) => (w >= 1069 ? 72 : w >= 735 ? 56 : 44);
const CLIP_H = (w: number) => (w >= 1069 ? 560 : w >= 735 ? 400 : 300);
const CLEAR = 'rgba(0, 0, 0, 0)'; // owner, avatar-title: the portrait frame has no fill (was WARM per theme)
const SURFACE = { light: 'rgb(245, 245, 247)', dark: 'rgb(29, 29, 31)' };

// Byte caps for the optimized wall pictures, from U4's awaited-body measurement (max of EN and VI
// x 1.25, rounded up to 10 KB): 1440 light 110.6/116.2 KB, 390 at DPR 2 light 125.9/131.8 KB, 1440
// dark 165.2/174.2 KB (1 KB = 1024 bytes).
const CAP_KB = { light1440: 150, light390: 170, dark1440: 220 };

// The WCAG 1.4.4 / 1.4.10 text modes from reflow.spec.ts: 200% text in the forced wide face
// (Verdana / DejaVu Sans) and in Inter.
const MODES = {
  'text-200-wide-font':
    ':root{--font-sans:Verdana,"DejaVu Sans",sans-serif!important} html{font-size:200%!important}',
  'text-200-inter':
    ':root{--font-sans:"Inter Variable",sans-serif!important} html{font-size:200%!important}',
} as const;
const TEXT_200 = 'html{font-size:200%!important}';
// The stack narrowed to Inter and its metric-matched stand-in. With the Inter files blocked this
// renders WebKit's `Inter Fallback`, the widest real face of the system stack (6.09em).
const FORCE_INTER = ':root{--font-sans:"Inter Variable","Inter Fallback",sans-serif!important}';
const INTER_FILES = '**/*inter*.woff2';

// Layout is measured without the reveal animation (its translate would skew the numbers).
test.use({ reducedMotion: 'reduce' });

const size = (width: number, height = 900) => ({ width, height });

const LANGS = [
  { path: '/', prefix: '', lang: 'en' },
  { path: '/vi/', prefix: '/vi', lang: 'vi' },
] as const;

const ALT = (lang: string) =>
  JSON.parse(readFileSync(`src/i18n/${lang}.json`, 'utf8')) as Record<string, string>;

/** stripBold from src/lib/home.ts: the `**…**` markers of an i18n line removed. */
const stripBold = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1');

/** STAR story titles in one language (Home's own text must name none of them). */
const storyTitles = (lang: string) =>
  readdirSync(`src/content/star/${lang}`)
    .filter((f) => f.endsWith('.md'))
    .map(
      (f) =>
        /^title: ['"](.+)['"]$/m.exec(readFileSync(`src/content/star/${lang}/${f}`, 'utf8'))![1],
    );

const settle = (page: Page) =>
  page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );

/** Waits until every font the page asked for has loaded or failed, then for two frames. */
const fontsSettled = async (page: Page) => {
  await settle(page);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await settle(page);
};

const nbsp = (s: string) => s.replace(/ /g, ' ').trim();

async function gotoThemed(page: Page, path: string, theme: 'light' | 'dark') {
  await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}

// ---- The wall's pictures -------------------------------------------------------------------------

const WALL_IDS = WALL_SHOTS.map((s) => s.id);
/** `/_astro/<id>-<lang>-<theme>.<hash>…webp`: the three groups are the id, the language and the theme. */
const WALL_URL = new RegExp(`/_astro/(${WALL_IDS.join('|')})-(en|vi)-(light|dark)\\.`);

/** How many wall pictures are displayed (computed `display`), per variant. */
const shownVariants = (page: Page) =>
  page.evaluate(() => {
    const out = { light: 0, dark: 0 };
    for (const i of document.querySelectorAll('.w-shot'))
      if (getComputedStyle(i).display !== 'none')
        out[i.classList.contains('w-shot--dark') ? 'dark' : 'light']++;
    return out;
  });

/** The displayed wall pictures, and how many of them have loaded (decoded size known). */
const shownLoaded = (page: Page) =>
  page.evaluate(() => {
    const shown = [...document.querySelectorAll<HTMLImageElement>('.w-shot')].filter(
      (i) => getComputedStyle(i).display !== 'none',
    );
    return {
      shown: shown.length,
      loaded: shown.filter((i) => i.complete && i.naturalWidth > 0).length,
    };
  });

/** Every displayed wall picture loads (12 of 12): lazy ones included, nothing is scrolled. */
const expectAllShownLoaded = (page: Page, where: string) =>
  expect
    .poll(() => shownLoaded(page), { message: where, timeout: 10_000 })
    .toEqual({ shown: WALL_SHOTS.length, loaded: WALL_SHOTS.length });

/** The six eager light tiles (the two rows inside the clip at S) have loaded. */
const eagerLoaded = (page: Page) =>
  page.evaluate(() => {
    const eager = [...document.querySelectorAll<HTMLImageElement>('.w-tile')]
      .slice(0, 6)
      .map((t) => t.querySelector<HTMLImageElement>('.w-shot--light')!);
    return {
      eager: eager.length,
      loaded: eager.filter((i) => i.complete && i.naturalWidth > 0).length,
    };
  });

/** Records every /_astro webp response of the page: status, type, URL and the awaited body length. */
function trackWebp(page: Page) {
  const seen: { url: string; bad: string | null; bytes: Promise<number> }[] = [];
  page.on('response', (r) => {
    const url = r.url();
    if (!/\/_astro\/.*\.webp/.test(url)) return;
    const type = r.headers()['content-type'];
    seen.push({
      url,
      bad: r.status() === 200 && type === 'image/webp' ? null : `${r.status()} ${type} ${url}`,
      bytes: r.body().then(
        (b) => b.length,
        () => -1,
      ),
    });
  });
  return seen;
}

/**
 * The mean RGB of a strip of the page as drawn: a screenshot of `clip`, decoded in the page (so both
 * engines read their own pixels without a PNG decoder here).
 */
async function stripMean(
  page: Page,
  clip: { x: number; y: number; width: number; height: number },
) {
  const png = await page.screenshot({ clip });
  return page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const cv = document.createElement('canvas');
    cv.width = bmp.width;
    cv.height = bmp.height;
    const cx = cv.getContext('2d')!;
    cx.drawImage(bmp, 0, 0);
    const d = cx.getImageData(0, 0, bmp.width, bmp.height).data;
    const sum = [0, 0, 0];
    for (let i = 0; i < d.length; i += 4) {
      sum[0] += d[i];
      sum[1] += d[i + 1];
      sum[2] += d[i + 2];
    }
    const n = d.length / 4;
    return sum.map((v) => v / n);
  }, png.toString('base64'));
}

// ---- The name, as rendered -----------------------------------------------------------------------

/**
 * The name as rendered: the H1's font size, its line rects (a Range over each text node, so advance
 * widths, not the H1 box), the text of each line, and the content box of `#top .w-text` (the column the
 * name must stay inside).
 */
const nameplate = (page: Page) =>
  page.evaluate(() => {
    const h1 = document.querySelector('#top h1')!;
    const col = document.querySelector('#top .w-text')!;
    const range = document.createRange();
    const rects: { left: number; right: number; top: number }[] = [];
    const byLine = new Map<number, string>();
    const walk = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const text = n.textContent ?? '';
      if (!text.trim()) continue;
      range.selectNodeContents(n);
      for (const r of range.getClientRects())
        if (r.width > 0) rects.push({ left: r.left, right: r.right, top: r.top });
      for (let i = 0; i < text.length; i++) {
        range.setStart(n, i);
        range.setEnd(n, i + 1);
        const r = range.getClientRects()[0];
        if (!r || r.width === 0) continue;
        const k = Math.round(r.top);
        byLine.set(k, (byLine.get(k) ?? '') + text[i]);
      }
    }
    const b = col.getBoundingClientRect();
    const s = getComputedStyle(col);
    const box = {
      left: b.left + parseFloat(s.borderLeftWidth) + parseFloat(s.paddingLeft),
      right: b.right - parseFloat(s.borderRightWidth) - parseFloat(s.paddingRight),
    };
    const left = Math.min(...rects.map((r) => r.left));
    const right = Math.max(...rects.map((r) => r.right));
    return {
      font: parseFloat(getComputedStyle(h1).fontSize),
      lines: new Set(rects.map((r) => Math.round(r.top))).size,
      lineTexts: [...byLine.entries()].sort((a, b) => a[0] - b[0]).map(([, t]) => t.trim()),
      rects,
      left,
      right,
      width: right - left,
      box: { ...box, width: box.right - box.left },
      sw: document.documentElement.scrollWidth,
      iw: window.innerWidth,
    };
  });
type Plate = Awaited<ReturnType<typeof nameplate>>;

/** Every line of the name inside `#top .w-text` (±1: the Wall's name has no optical margin). */
const expectLinesInside = (m: Plate, where: string) => {
  expect(m.rects.length, `${where} rects`).toBeGreaterThan(0);
  for (const r of m.rects) {
    expect(r.left, `${where} line left`).toBeGreaterThanOrEqual(m.box.left - 1);
    expect(r.right, `${where} line right`).toBeLessThanOrEqual(m.box.right + 1);
  }
};

/** A wrap falls between the words: each line is the whole name or one whole word of it. */
const expectWordBreaks = (m: Plate, name: string, where: string) => {
  const words = name.split(/\s+/);
  for (const t of m.lineTexts)
    expect([nbsp(name), ...words], `${where} line "${t}"`).toContain(nbsp(t));
  expect(m.lineTexts.join(' '), `${where} text`).toBe(nbsp(name));
};

/** N1': one line at 100% text, inside the column, at the width band's font size. */
const expectOneLine = (m: Plate, w: number, where: string) => {
  expect(m.lines, `${where} lines`).toBe(1);
  expect(m.right, `${where} right`).toBeLessThanOrEqual(m.box.right + 1);
  expect(m.left, `${where} left`).toBeGreaterThanOrEqual(m.box.left - 1);
  expect(Math.abs(m.font - STEP(w)), `${where} font`).toBeLessThanOrEqual(0.5);
  expect(m.sw, `${where} scrollWidth`).toBeLessThanOrEqual(m.iw);
};

test.describe('Home structure', () => {
  test('main is the wall, "Next." and the closing band; no split, board, footnotes or old columns', async ({
    page,
  }) => {
    await page.goto('/');
    const children = await page
      .locator('main > *')
      .evaluateAll((els) => els.map((e) => `${e.tagName}${e.id ? `#${e.id}` : ''}`));
    expect(children).toEqual(['SECTION#top', 'SECTION#next', 'SECTION#more']);
    const ids = await page
      .locator('main :is(section, article)[id]')
      .evaluateAll((els) => els.map((e) => e.id));
    expect(ids).toEqual(BLOCKS);
    expect(
      await page.evaluate(() => document.querySelector('main')!.lastElementChild!.id),
      'main > :last-child',
    ).toBe('more');
    await expect(
      page.locator('.home-split, #board, .footnotes, .bento-tile, .band-body'),
    ).toHaveCount(0);
    // No class of the old Front page layout (its `fp-` prefix) survives anywhere in main.
    await expect(page.locator('main [class*="fp-"]')).toHaveCount(0);
  });

  test('one H1 is the name in ink; the role line sits directly below it; no gradient and no eyebrow', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText(NAME);
    await expect(page.locator('#top h1')).toHaveCount(1);
    await expect(page.locator('#top h1#top-title')).toHaveCount(1);
    // The mock sets the name in ink: the gradient left Home.
    await expect(page.locator('.text-gradient')).toHaveCount(0);
    await expect(page.locator('#top .t-eyebrow, #top .home-kicker')).toHaveCount(0);
    // owner, title-below-name: was above the H1 (the mock order); the role line now comes directly after the H1.
    // owner, avatar-title: was profile('en').headline; two lines, the title and the areas.
    await expect(page.locator('#top .w-role .w-title')).toHaveText('Data Engineer');
    await expect(page.locator('#top .w-role .w-areas')).toHaveText(
      'Data Engineering | Backend | DevOps',
    );
    expect(
      await page.evaluate(() => {
        const role = document.querySelector('#top .w-role')!;
        const h1 = document.querySelector('#top h1')!;
        return {
          dom: !!(h1.compareDocumentPosition(role) & Node.DOCUMENT_POSITION_FOLLOWING),
          adjacent: h1.nextElementSibling === role,
          titleFirst: !!role.firstElementChild?.matches('.w-title'),
          below: role.getBoundingClientRect().top >= h1.getBoundingClientRect().bottom - 1,
        };
      }),
    ).toEqual({ dom: true, adjacent: true, titleFirst: true, below: true });
  });

  test('the H1 is the profile name in both languages, with no gradient', async ({ page }) => {
    for (const { path, lang } of LANGS) {
      await page.goto(path);
      await expect(page.locator('.text-gradient'), path).toHaveCount(0);
      await expect(page.locator('#top h1'), path).toHaveText(profile(lang).name);
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

  test('no block has more than two actions; the wall row, "Next." and the band carry their "›" links', async ({
    page,
  }) => {
    await page.setViewportSize(size(1440));
    await page.goto('/');
    for (const s of await page.locator('main :is(section, article)').all())
      expect(
        await s.locator('.actions > a').count(),
        (await s.getAttribute('id')) ?? '',
      ).toBeLessThanOrEqual(2);
    expect(await page.locator('#top .actions > a').count()).toBe(2);
    expect(await page.locator('#more .actions > a').count()).toBe(2);
    expect(await page.locator('#top .w-links a.link-chevron').count()).toBe(4);
    expect(await page.locator('#next a.link-chevron').count()).toBe(2);
    expect(await page.locator('#more a.link-chevron').count()).toBe(0);
    // Every other link outside the wall is a "›" link: not a pill. The wall's tiles are pointer links.
    const plain = await page.evaluate((ids) => {
      const out: string[] = [];
      for (const id of ids)
        for (const a of document.querySelectorAll(`#${id} a`))
          if (
            !a.closest('.w-clip') &&
            !a.matches('.actions > a') &&
            !a.classList.contains('link-chevron')
          )
            out.push(`${id} ${a.getAttribute('href')}`);
      return out;
    }, BLOCKS);
    expect(plain).toEqual([]);
  });

  test('one grey band: the page, the wall block and "Next." are white; #more is grey; the tiles are grey; the clip has no background', async ({
    page,
  }) => {
    await page.goto('/');
    const bg = (sel: string) =>
      page.locator(sel).evaluate((e) => getComputedStyle(e).backgroundColor);
    const clear = ['rgb(255, 255, 255)', 'rgba(0, 0, 0, 0)'];
    await expect(page.locator('.section--dark')).toHaveCount(0);
    for (const sel of ['main', '#top', '#next']) expect(clear, sel).toContain(await bg(sel));
    expect(await bg('#more')).toBe(SURFACE.light);
    const tiles = page.locator('.w-tile');
    await expect(tiles).toHaveCount(WALL_SHOTS.length);
    for (const t of await tiles.all())
      expect(await t.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(SURFACE.light);
    // owner, avatar-title: was WARM.light; the frame has no fill.
    expect(await page.locator('.pop').evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(
      CLEAR,
    );
    await expect(page.locator('.w-clip')).toHaveCSS('background-image', 'none');
  });

  test('in the dark theme the tiles differ from the page, #more is the dark surface and the warm frame is dark', async ({
    page,
  }) => {
    await gotoThemed(page, '/', 'dark');
    const bg = (sel: string) =>
      page.locator(sel).evaluate((e) => getComputedStyle(e).backgroundColor);
    const body = await bg('body');
    const tiles = page.locator('.w-tile');
    await expect(tiles).toHaveCount(WALL_SHOTS.length);
    for (const t of await tiles.all())
      expect(await t.evaluate((e) => getComputedStyle(e).backgroundColor)).not.toBe(body);
    expect(await bg('#more')).toBe(SURFACE.dark);
    for (const sel of ['#top', '#next'])
      expect(['rgba(0, 0, 0, 0)', body], sel).toContain(await bg(sel));
    // owner, avatar-title: was WARM.dark; the frame has no fill.
    expect(await page.locator('.pop').evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(
      CLEAR,
    );
  });

  test('the identity row: labelled by the H1, the sentence, four named links, two pills, no stat strip', async ({
    page,
  }) => {
    await page.goto('/');
    const hero = page.locator('#top');
    const dict = ALT('en');
    await expect(page.locator('main > section#top')).toHaveCount(1);
    // Labelled by the page's one H1.
    await expect(hero).toHaveAttribute('aria-labelledby', 'top-title');
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(hero.locator('h1#top-title')).toHaveCount(1);
    // The first-person sentence, markers removed, with exactly its two bold phrases.
    const copy = dict['home.intro'];
    await expect(hero.locator('.w-say')).toHaveText(stripBold(copy));
    const bold = [...copy.matchAll(/\*\*(.+?)\*\*/g)].map((m) => m[1]);
    expect(bold).toHaveLength(2);
    await expect(hero.locator('.w-say strong')).toHaveText(bold);
    // The four links: hrefs and visible names, in order.
    const links = hero.locator('.w-links a');
    await expect(links).toHaveCount(4);
    expect(await links.evaluateAll((els) => els.map((e) => e.getAttribute('href')))).toEqual(
      LINKS.map(([href]) => href),
    );
    for (const [i, [, key]] of LINKS.entries()) {
      await expect(links.nth(i).locator('> span:not(.chev)')).toHaveText(dict[key]);
      await expect(links.nth(i)).toHaveAccessibleName(dict[key]);
    }
    await expect(hero.getByRole('link', { name: 'Email me' })).toHaveAttribute(
      'href',
      `mailto:${EMAIL}`,
    );
    const pdf = hero.getByRole('link', { name: 'Download CV' });
    await expect(pdf).toHaveAttribute('download', 'Ryan-Parker-CV.pdf');
    await expect(pdf).toHaveAttribute('href', '/cv.pdf');
    await expect(hero.locator('.stat-strip')).toHaveCount(0);
    await expect(hero.locator('.stat-value')).toHaveCount(0);
    // One picture in the row (the cut-out photo) and the wall's 24 variants, every alt empty.
    await expect(hero.locator('.w-id img')).toHaveCount(1);
    await expect(hero.locator('.w-id img')).toHaveAttribute('alt', '');
    await expect(hero.locator('.w-clip img')).toHaveCount(WALL_SHOTS.length * 2);
    for (const img of await hero.locator('.w-clip img').all())
      await expect(img).toHaveAttribute('alt', '');
  });

  test('one nav row: no local nav, the global nav stays at the top, one CV download in main', async ({
    page,
  }) => {
    // Owner decision: Home drops its local nav (one global nav row, spec §4.0 / §5.8).
    for (const { path, prefix } of LANGS) {
      for (const w of [1440, 900]) {
        await page.setViewportSize(size(w));
        await page.goto(path);
        const where = `${path} @${w}`;
        await expect(page.locator('[data-local-nav]'), where).toHaveCount(0);
        await expect(page.locator('.local-nav'), where).toHaveCount(0);
        await page.evaluate(() => window.scrollTo(0, 800));
        await expect.poll(() => page.evaluate(() => window.scrollY), where).toBeGreaterThan(0);
        expect(Math.round((await page.locator('header[data-nav]').boundingBox())!.y), where).toBe(
          0,
        );
        await expect(page.locator('main a[download]'), where).toHaveCount(1);
        await expect(page.locator('main a[download]'), where).toHaveAttribute(
          'href',
          `${prefix}/cv.pdf`,
        );
      }
    }
  });

  for (const theme of ['light', 'dark'] as const)
    test(`identity row: the CV pill shows its focus ring outside the pill (${theme})`, async ({
      page,
      browserName,
    }) => {
      await page.setViewportSize(size(1440));
      await gotoThemed(page, '/', theme);
      const pill = page.locator('#top .actions a.btn-primary');
      if (browserName === 'webkit') {
        // WebKit does not Tab to links by default: a real key press first, so focus is
        // keyboard-modality, then focus the pill directly; the ring is the part under test.
        await page.keyboard.press('Shift');
        await pill.focus();
      } else {
        let on = false;
        for (let i = 0; i < 40 && !on; i++) {
          await page.keyboard.press('Tab');
          on = await pill.evaluate((e) => e === document.activeElement);
        }
        expect(on, 'Tab reaches the pill').toBe(true);
      }
      await expect(pill).toBeFocused();
      const ring = await pill.evaluate((e) => {
        const s = getComputedStyle(e);
        return {
          visible: e.matches(':focus-visible'),
          style: s.outlineStyle,
          width: parseFloat(s.outlineWidth),
          offset: parseFloat(s.outlineOffset),
        };
      });
      expect(ring.visible).toBe(true);
      expect(ring.style).toBe('solid');
      expect(ring.width).toBeGreaterThanOrEqual(2);
      // An accent ring inset into the accent pill is invisible; it must sit on or outside the edge.
      expect(ring.offset).toBeGreaterThanOrEqual(0);
    });

  // Named change (peek-rule exception settled by the lead): the old rule asked for 64px of the
  // ruled columns below the fold. The Wall's first screen is the wall, the photo, the name, the role line, the intro, the links and the pills (the
  // 3x intro of hero-intro-longer).
  for (const { path, lang } of LANGS)
    test(`${lang}: the first screen holds the wall, the name and the pills (at 375: the whole intro)`, async ({
      page,
    }) => {
      const rect = (sel: string) =>
        page.locator(sel).evaluate((e) => {
          const r = e.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom };
        });
      await page.setViewportSize(size(1440, 900));
      await page.goto(path);
      // owner, profile-image-full: new, the whole photo is on the first screen too.
      expect((await rect('#top .pop')).bottom, `${path} 1440x900 photo`).toBeLessThanOrEqual(900);
      expect((await rect('#top h1')).bottom, `${path} 1440x900 h1`).toBeLessThanOrEqual(900);
      expect((await rect('#top .w-links')).bottom, `${path} 1440x900 links`).toBeLessThanOrEqual(
        900,
      );
      expect((await rect('#top .actions')).bottom, `${path} 1440x900 pills`).toBeLessThanOrEqual(
        900,
      );
      // The wall starts right under the one nav row.
      expect(
        Math.abs((await rect('.w-clip')).top - (await rect('header[data-nav]')).bottom),
        `${path} wall under the nav`,
      ).toBeLessThanOrEqual(1);
      await page.setViewportSize(size(375, 812));
      await page.goto(path);
      expect((await rect('#top .pop')).bottom, `${path} 375x812 photo`).toBeLessThanOrEqual(812);
      // owner, hero-intro-longer: the owner accepted the links and pills below the first screen at 375 x 812
      // (the intro is about 3x longer); the photo, the name and the whole intro stay on it.
      expect((await rect('#top h1')).bottom, `${path} 375x812 h1`).toBeLessThanOrEqual(812);
      expect((await rect('#top .w-say')).bottom, `${path} 375x812 intro`).toBeLessThanOrEqual(812);
    });

  // owner, photo-logos: the bigger photo and the Inter-blocked case (WebKit's widest face, 6.09em) must
  // keep the first screen: the identity row and the pills at 1440 x 900 and, at 375 x 812, the whole intro (the owner accepted pills below the fold there, hero-intro-longer), Inter loaded and blocked.
  for (const { path, lang } of LANGS)
    for (const blocked of [true, false])
      test(`${lang}: the first screen holds with Inter ${blocked ? 'blocked (Inter Fallback)' : 'loaded'}`, async ({
        page,
      }) => {
        const rect = (sel: string) =>
          page.locator(sel).evaluate((e) => {
            const r = e.getBoundingClientRect();
            return { top: r.top, bottom: r.bottom };
          });
        if (blocked) await page.route(INTER_FILES, (r) => r.abort());
        for (const [w, h] of [
          [1440, 900],
          [375, 812],
        ] as const) {
          await page.setViewportSize(size(w, h));
          await page.goto(path);
          await page.addStyleTag({ content: FORCE_INTER });
          await page.evaluate(() =>
            document.fonts.load('600 100px "Inter Variable"', 'Ryan Parker').catch(() => []),
          );
          await fontsSettled(page);
          const where = `${path} ${w}x${h} inter${blocked ? ' blocked' : ''}`;
          const inter = await page.evaluate(() =>
            [...document.fonts]
              .filter((f) => f.family.replace(/['"]/g, '') === 'Inter Variable')
              .map((f) => f.status),
          );
          if (blocked) expect(inter, where).not.toContain('loaded');
          else expect(inter, where).toContain('loaded');
          if (w === 1440) {
            expect((await rect('#top h1')).bottom, `${where} h1`).toBeLessThanOrEqual(h);
            expect((await rect('#top .w-links')).bottom, `${where} links`).toBeLessThanOrEqual(h);
          }
          // owner, hero-intro-longer: the owner accepted the pills below the fold at 375; there the intro is the last thing held.
          const last = w === 1440 ? '#top .actions' : '#top .w-say';
          expect((await rect(last)).bottom, `${where} ${last}`).toBeLessThanOrEqual(h);
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
            `${where} scroll`,
          ).toBeLessThanOrEqual(w);
        }
      });

  test('hero H1 is not animated, the wall and the photo never are, and the intro runs on the other parts', async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: 'no-preference' });
    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const r = await page.evaluate(() => {
      const h1 = document.querySelector('h1')!;
      const targets = document.getAnimations().map((a) => (a.effect as KeyframeEffect).target);
      return {
        own: targets.filter((t) => t === h1).length,
        wall: targets.filter((t) => t?.closest('.w-clip, .pop')).length,
        intro: targets.filter((t) => t?.classList?.contains('intro')).length,
      };
    });
    expect(r.own).toBe(0);
    expect(r.wall).toBe(0);
    expect(r.intro).toBeGreaterThan(0);
    await context.close();
  });

  test('no horizontal scroll at 320, 390, 768, 1069 and 1440 and no long lockup at 375x812', async ({
    page,
  }) => {
    for (const w of [320, 390, 768, 1069, 1440]) {
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

  test('with JavaScript off every section is visible and the first wall picture has loaded', async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: size(1440) });
    const page = await context.newPage();
    await page.goto('/');
    const blocks = await page.locator('main section, main article').all();
    expect(blocks.length).toBe(BLOCKS.length);
    for (const s of blocks) await expect(s).toBeVisible();
    const first = page.locator('.w-shot--light').first();
    await expect(first).toBeVisible();
    await expect
      .poll(() => first.evaluate((i: HTMLImageElement) => i.naturalWidth))
      .toBeGreaterThan(0);
    await context.close();
  });

  test('nothing pins: after a scroll no element in main is sticky and the hero has left', async ({
    browser,
  }) => {
    // The owner replaced the pinned identity column and its gate with the stack (O6).
    const context = await browser.newContext({
      reducedMotion: 'no-preference',
      viewport: size(1440, 900),
    });
    const page = await context.newPage();
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, 1500));
    await settle(page);
    const m = await page.evaluate(() => ({
      sticky: [...document.querySelectorAll('main, main *')]
        .filter((e) => getComputedStyle(e).position === 'sticky')
        .map((e) => e.id || e.className),
      top: document.querySelector('#top')!.getBoundingClientRect().bottom,
    }));
    expect(m.sticky).toEqual([]);
    expect(m.top).toBeLessThan(0);
    await context.close();
  });
});

test.describe('Home name', () => {
  const WIDTHS = [1440, 1069, 768, 390, 320];

  for (const { path, lang } of LANGS) {
    test(`${lang}: the name sits on one line at 100% text at ${WIDTHS.join(', ')}`, async ({
      page,
    }) => {
      await page.goto(path);
      for (const w of WIDTHS) {
        await page.setViewportSize(size(w));
        await fontsSettled(page);
        expectOneLine(await nameplate(page), w, `${path} @${w}`);
      }
    });

    for (const blocked of [true, false])
      test(`${lang}: one line in Inter ${blocked ? 'with its files blocked (Inter Fallback)' : 'loaded'} at ${WIDTHS.join(', ')}`, async ({
        page,
      }) => {
        if (blocked) await page.route(INTER_FILES, (r) => r.abort());
        await page.goto(path);
        await page.addStyleTag({ content: FORCE_INTER });
        await page.evaluate(() =>
          document.fonts.load('600 100px "Inter Variable"', 'Ryan Parker').catch(() => []),
        );
        for (const w of WIDTHS) {
          await page.setViewportSize(size(w));
          await fontsSettled(page);
          const where = `${path} @${w} inter${blocked ? ' blocked' : ''}`;
          // The face under test really rendered: Inter loaded, or Inter failed and the stand-in drew.
          const inter = await page.evaluate(() =>
            [...document.fonts]
              .filter((f) => f.family.replace(/['"]/g, '') === 'Inter Variable')
              .map((f) => f.status),
          );
          if (blocked) expect(inter, where).not.toContain('loaded');
          else expect(inter, where).toContain('loaded');
          expectOneLine(await nameplate(page), w, where);
        }
      });

    test(`${lang}: at 200% text the name is 19vw, at most two lines, inside its column at 390 and 320`, async ({
      page,
    }) => {
      for (const [mode, css] of [['text-200', TEXT_200], ...Object.entries(MODES)] as const)
        for (const w of [390, 320]) {
          await page.setViewportSize(size(w, 800));
          await page.goto(path);
          await page.addStyleTag({ content: css });
          await fontsSettled(page);
          const where = `${path} @${w} ${mode}`;
          const m = await nameplate(page);
          expect(Math.abs(m.font - 0.19 * m.iw), `${where} font`).toBeLessThanOrEqual(0.5);
          expect(m.lines, `${where} lines`).toBeLessThanOrEqual(2);
          expectLinesInside(m, where);
          expect(m.sw, `${where} scrollWidth`).toBeLessThanOrEqual(m.iw);
        }
    });

    // The Wall's name shares its row with the photo and the pills (rem-sized, so they widen at 200%).
    // owner, photo-logos: the row sits on the 980 column (was the 1260 box), so the text track is
    // about 980 - 288 - 236 - 72 = 384px at 200% (was about 1260 - 196 - 260 - 72 = 732px) while "Ryan Parker"
    // in SF at 144px (2 x 72, the name is a step smaller than the 160px of the old 80px name) is
    // 4.759 x 144 = 685px. Even the narrowest face wraps, so "at most two lines,
    // between the words, inside the column" replaces the old full-width nameplate's one line.
    // owner, photo-tall: the pills are under the text at L (was beside it), so the text track is
    // 980 - 288 - 36 = 656px; "Ryan Parker" in SF is 685px and still wraps; "Parker" in Verdana is about
    // 498px and fits. The pills are under the text in every face (was: only in the widest).
    const rowOf = (page: Page) =>
      page.evaluate(() => {
        const r = (sel: string) => document.querySelector(sel)!.getBoundingClientRect();
        const text = r('.w-id .w-text');
        const acts = r('.w-id .actions');
        return {
          textBottom: text.bottom,
          textLeft: text.left,
          actsTop: acts.top,
          actsLeft: acts.left,
          actsRight: acts.right,
        };
      });
    test(`${lang}: at 200% text at 1440 the name keeps its size and wraps only between words, inside its column`, async ({
      page,
    }) => {
      const name = profile(lang).name;
      await page.setViewportSize(size(1440));
      await page.goto(path);
      await fontsSettled(page);
      const base = await nameplate(page);
      await page.addStyleTag({ content: TEXT_200 });
      await fontsSettled(page);
      const big = await nameplate(page);
      // owner, photo-logos: 160 -> 144 (2 x the new 72px L step; the name is a step smaller than 80px).
      expect(Math.abs(big.font - 2 * STEP(1440)), `${path} 200% font`).toBeLessThanOrEqual(0.5);
      expect(Math.abs(big.font - base.font * 2), `${path} 200% doubles`).toBeLessThanOrEqual(0.5);
      expect(big.lines, `${path} 200% lines`).toBeLessThanOrEqual(2);
      expectLinesInside(big, `${path} 200%`);
      expectWordBreaks(big, name, `${path} 200%`);
      expect(big.sw, `${path} 200% scrollWidth`).toBeLessThanOrEqual(big.iw);
      // New (owner, photo-logos): the pills never leave the 980 column (230..1210), beside or under.
      // owner, photo-tall: and they are under the text, never beside it.
      const bigRow = await rowOf(page);
      expect(bigRow.actsTop, `${path} 200% pills under the text`).toBeGreaterThanOrEqual(
        bigRow.textBottom - 1,
      );
      expect(bigRow.actsLeft, `${path} 200% pills left`).toBeGreaterThanOrEqual(230 - 1);
      expect(bigRow.actsRight, `${path} 200% pills right`).toBeLessThanOrEqual(1210 + 1);
      await page.goto(path);
      await page.addStyleTag({ content: MODES['text-200-wide-font'] });
      await fontsSettled(page);
      const wide = await nameplate(page);
      expect(wide.lines, `${path} wide`).toBeLessThanOrEqual(2);
      expectLinesInside(wide, `${path} wide`);
      expectWordBreaks(wide, name, `${path} wide`);
      expect(wide.sw, `${path} wide scrollWidth`).toBeLessThanOrEqual(wide.iw);
      // New (owner, photo-logos): in the widest face the pills wrap under the name, on the column.
      const wideRow = await rowOf(page);
      expect(wideRow.actsTop, `${path} wide pills under the text`).toBeGreaterThanOrEqual(
        wideRow.textBottom - 1,
      );
      // owner, photo-tall: was |pills left - 230| <= 1 (the column's left); the pills now start on the
      // text's left edge, which is right of the photo.
      expect(
        Math.abs(wideRow.actsLeft - wideRow.textLeft),
        `${path} wide pills left`,
      ).toBeLessThanOrEqual(1);
    });
  }
});

// owner, profile-image-full: "show complete my profile image": the whole photo (photo.jpg, 600 x 894) on
// its grey backdrop; the frame is the image box at the photo's own ratio: 288 x 429.1 at L, 216 x 321.8 at
// M, 160 x 238.4 at S (was a cut-out in 288 x 288, 216 x 216 and 192 x 160 frames, the image 288 / 216 / 160px
// tall, centred, with the head row at 13.3% and no band above). 6.09em above is WebKit's Inter
// Fallback (Arial Bold at 107.12%), was written 5.758em.
// owner, photo-align-cutout: "align my photo equal with intro and remove the background": the photo is the
// cut-out (photo-cutout.png) and from M its frame is as tall as the intro beside it (was 288 x 429.1 / 216 x
// 321.8, the photo's own ratio); the picture is drawn contained at the frame's bottom. Only S keeps 160 x 238.4.
test.describe('Home photo frame', () => {
  const RATIO = 894 / 600;
  // Width and radius; the height is the intro's (L: text top to pills bottom, M: the text block, S: 160 x 238.4).
  const FRAMES = [
    { w: 1440, pop: [288], edge: 'pills', radius: 18 },
    { w: 1069, pop: [288], edge: 'pills', radius: 18 },
    { w: 1024, pop: [216], edge: 'text', radius: 18 },
    { w: 900, pop: [216], edge: 'text', radius: 18 },
    { w: 390, pop: [160, 160 * RATIO], edge: 'ratio', radius: 12 },
    { w: 320, pop: [160, 160 * RATIO], edge: 'ratio', radius: 12 },
  ] as const;
  const measure = (page: Page) =>
    page.evaluate(() => {
      const frame = document.querySelector('#top .pop')!;
      const img = frame.querySelector('img')!;
      const f = frame.getBoundingClientRect();
      const i = img.getBoundingClientRect();
      const cs = getComputedStyle(frame);
      // owner, photo-align-cutout: the intro beside the frame: the text block and the pills row.
      const t = document.querySelector('#top .w-text')!.getBoundingClientRect();
      const a = document.querySelector('#top .home-acts')!.getBoundingClientRect();
      // owner, profile-image-full: every ancestor up to #top that clips (overflow not visible).
      const clips: { left: number; right: number; top: number; bottom: number }[] = [];
      for (let e: Element | null = frame; e && e.id !== 'top'; e = e.parentElement) {
        if (getComputedStyle(e).overflow !== 'visible') {
          const r = e.getBoundingClientRect();
          clips.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
        }
      }
      return {
        clips,
        nW: img.naturalWidth,
        nH: img.naturalHeight,
        objectFit: getComputedStyle(img).objectFit,
        f: { left: f.left, right: f.right, top: f.top, bottom: f.bottom, w: f.width, h: f.height },
        i: { left: i.left, right: i.right, top: i.top, bottom: i.bottom, w: i.width, h: i.height },
        text: { top: t.top, bottom: t.bottom },
        acts: { top: a.top, bottom: a.bottom },
        radius: cs.borderTopLeftRadius,
        transform: getComputedStyle(img).transform,
      };
    });

  for (const { w, pop, edge, radius } of FRAMES)
    for (const { path, lang } of LANGS) {
      // owner, photo-tall: VI runs at every width (was only 1069 and 390).
      test(`${lang}: at ${w} the photo frame is ${pop[0]}px wide on the column and equal with the intro (${edge})`, async ({
        page,
      }) => {
        await page.setViewportSize(size(w));
        await page.goto(path);
        await fontsSettled(page);
        const m = await measure(page);
        const where = `${path} @${w}`;
        expect(Math.abs(m.f.w - pop[0]), `${where} width`).toBeLessThanOrEqual(0.5);
        // owner, photo-align-cutout (was: height = width x 894/600 at every width): L top on the text top and
        // bottom on the pills' bottom, M top and bottom on the text's, S 160 x 238.4. Within 1px.
        if (edge === 'ratio') {
          expect(Math.abs(m.f.h - pop[1]!), `${where} height`).toBeLessThanOrEqual(0.5);
        } else {
          expect(Math.abs(m.f.top - m.text.top), `${where} top = text top`).toBeLessThanOrEqual(1);
          const bottom = edge === 'pills' ? m.acts.bottom : m.text.bottom;
          expect(
            Math.abs(m.f.bottom - bottom),
            `${where} bottom = ${edge} bottom`,
          ).toBeLessThanOrEqual(1);
        }
        expect(m.radius, `${where} radius`).toBe(`${radius}px`);
        // owner, profile-image-full (was: image square, `img` tall, bottom on the frame, no band above,
        // head row 80 inside the frame, centred): the image box is the frame box, at the photo's own ratio.
        for (const k of ['left', 'right', 'top', 'bottom'] as const)
          expect(Math.abs(m.i[k] - m.f[k]), `${where} image ${k} = frame ${k}`).toBeLessThanOrEqual(
            0.5,
          );
        // owner, photo-align-cutout (was: the image box ratio = the natural ratio): the box is the frame's, and
        // the picture is drawn `contain` (the natural ratio), inside the frame, filling one axis, its bottom on
        // the frame's bottom. At S the frame ratio is the photo's (600:894).
        expect(m.objectFit, `${where} object-fit`).toBe('contain');
        const k = Math.min(m.f.w / m.nW, m.f.h / m.nH);
        const dw = m.nW * k;
        const dh = m.nH * k;
        expect(dw, `${where} drawn width inside`).toBeLessThanOrEqual(m.f.w + 0.5);
        expect(dh, `${where} drawn height inside`).toBeLessThanOrEqual(m.f.h + 0.5);
        expect(
          Math.min(Math.abs(dw - m.f.w), Math.abs(dh - m.f.h)),
          `${where} drawn picture fills one axis`,
        ).toBeLessThanOrEqual(0.5);
        if (edge === 'ratio')
          expect(Math.abs(m.f.w / m.f.h - 600 / 894), `${where} S ratio`).toBeLessThanOrEqual(
            0.005,
          );
        expect(Math.abs(m.nH / m.nW - 1264 / 848), `${where} natural 848:1264`).toBeLessThanOrEqual(
          0.01,
        );
        for (const c of m.clips) {
          expect(m.i.left, `${where} inside clip left`).toBeGreaterThanOrEqual(c.left - 0.5);
          expect(m.i.right, `${where} inside clip right`).toBeLessThanOrEqual(c.right + 0.5);
          expect(m.i.top, `${where} inside clip top`).toBeGreaterThanOrEqual(c.top - 0.5);
          expect(m.i.bottom, `${where} inside clip bottom`).toBeLessThanOrEqual(c.bottom + 0.5);
        }
        expect(m.transform, `${where} no transform`).toBe('none');
        expect(Math.abs(m.f.left - colAt(w)[0]), `${where} left on the column`).toBeLessThanOrEqual(
          1,
        );
      });
    }

  // The image never renders above the 600px source at the device pixel ratio, and the picked candidate
  // carries at least the rendered device pixels (sharp). Every density the owner's displays use.
  for (const [w, h, dpr] of [
    [1440, 900, 1],
    [1440, 900, 2],
    [390, 844, 2],
    [390, 844, 3],
  ] as const)
    test(`the photo is sharp at ${w} and DPR ${dpr}: the candidate holds the rendered pixels, never past the source`, async ({
      browser,
    }) => {
      const ctx = await browser.newContext({
        viewport: size(w, h),
        deviceScaleFactor: dpr,
        reducedMotion: 'reduce',
      });
      const page = await ctx.newPage();
      await page.goto('/');
      const img = page.locator('#top .pop img');
      await expect
        .poll(() => img.evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth > 0))
        .toBe(true);
      // naturalWidth of a srcset image is the candidate's width divided by its density, so the picked
      // file's real pixels are read by decoding it.
      const r = await img.evaluate(async (e: HTMLImageElement) => {
        const bitmap = await createImageBitmap(await (await fetch(e.currentSrc)).blob());
        return {
          natural: bitmap.width,
          rendered: e.getBoundingClientRect().width,
          dpr: window.devicePixelRatio,
        };
      });
      const where = `@${w} DPR ${dpr} (${r.natural}px for ${r.rendered.toFixed(1)}px)`;
      expect(r.dpr, `${where} dpr`).toBe(dpr);
      expect(r.natural, `${where} sharp`).toBeGreaterThanOrEqual(r.rendered * dpr - 1);
      expect(r.rendered * dpr, `${where} not above the 600px source`).toBeLessThanOrEqual(600);
      await ctx.close();
    });

  for (const theme of ['light', 'dark'] as const)
    // owner, avatar-title: was "the frame is the warm tint" (WARM[theme]); the frame has no fill at all.
    test(`${theme}: the frame has no background, transparent and no image`, async ({ page }) => {
      await page.setViewportSize(size(1440));
      await gotoThemed(page, '/', theme);
      await expect(page.locator('#top .pop')).toHaveCSS('background-color', CLEAR);
      await expect(page.locator('#top .pop')).toHaveCSS('background-image', 'none');
    });
});

// owner, photo-align-cutout: "remove the background": the photo is the owner cut out of the grey studio
// backdrop (photo-cutout.png, alpha). The served file keeps alpha 0 on the backdrop and 255 on the person
// with no grey halo, and the page's warm tint shows through in light and dark.
test.describe('Home photo cut-out', () => {
  for (const { path, lang } of LANGS)
    for (const w of [1440, 390])
      test(`${lang}: at ${w} the served photo has a transparent backdrop, an opaque person and no grey halo`, async ({
        page,
      }) => {
        await page.setViewportSize(size(w));
        await page.goto(path);
        const img = page.locator('#top .pop img');
        await expect
          .poll(() => img.evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth > 0))
          .toBe(true);
        const r = await img.evaluate(async (e: HTMLImageElement) => {
          const bmp = await createImageBitmap(await (await fetch(e.currentSrc)).blob());
          const cv = document.createElement('canvas');
          cv.width = bmp.width;
          cv.height = bmp.height;
          const cx = cv.getContext('2d')!;
          cx.drawImage(bmp, 0, 0);
          const d = cx.getImageData(0, 0, bmp.width, bmp.height).data;
          const at = (nx: number, ny: number) => {
            const x = Math.round(nx * (bmp.width - 1));
            const y = Math.round(ny * (bmp.height - 1));
            return d[(y * bmp.width + x) * 4 + 3];
          };
          // The backdrop probes and the person probes of tests/unit/brand-images.test.ts (U1).
          const back = [
            [0, 0],
            [1, 0],
            [0, 1],
            [1, 1],
            [0.05, 0.3],
            [0.95, 0.3],
            [0.5, 0.03],
            [0.1, 0.95],
            [0.9, 0.95],
            [159 / 599, 622 / 893],
          ].map(([x, y]) => at(x, y));
          const person = [
            [0.5, 0.25],
            [0.5, 0.7],
            [0.45, 0.13],
          ].map(([x, y]) => at(x, y));
          // Halo: the grey share of the partly transparent edge band (U1's formula, backdrop 163,160,167).
          let band = 0;
          let grey = 0;
          for (let p = 0; p < d.length; p += 4) {
            const a = d[p + 3] / 255;
            if (a <= 0.08 || a >= 0.92) continue;
            band += a;
            const dr = d[p] - 163;
            const dg = d[p + 1] - 160;
            const db = d[p + 2] - 167;
            const light = (dr + dg + db) / 3;
            const chroma = Math.max(
              Math.abs(dr - light),
              Math.abs(dg - light),
              Math.abs(db - light),
            );
            if (Math.abs(light) * 0.55 + chroma * 2.2 <= 1.5 * 26) grey += a;
          }
          return { back, person, band, share: band ? grey / band : 0 };
        });
        // The served file is a resized webp, so an edge pixel may be a few alpha steps off 0 / 255.
        for (const a of r.back) expect(a, `${path} @${w} backdrop alpha`).toBeLessThanOrEqual(8);
        for (const a of r.person)
          expect(a, `${path} @${w} person alpha`).toBeGreaterThanOrEqual(247);
        expect(r.band, `${path} @${w} edge band exists`).toBeGreaterThan(0);
        expect(r.share, `${path} @${w} grey halo share`).toBeLessThanOrEqual(0.03);
      });

  for (const { path, lang } of LANGS)
    for (const theme of ['light', 'dark'] as const)
      for (const w of [1440, 390])
        test(`${lang}: at ${w} the person stands on the page with no panel behind (${theme})`, async ({
          page,
        }) => {
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await page.setViewportSize(size(w));
          await gotoThemed(page, path, theme);
          const img = page.locator('#top .pop img');
          await expect
            .poll(() => img.evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth > 0))
            .toBe(true);
          await fontsSettled(page);
          await page.locator('#top .pop').evaluate((e) => e.scrollIntoView({ block: 'center' }));
          await settle(page);
          const f = await page.locator('#top .pop').evaluate((e) => {
            const r = e.getBoundingClientRect();
            return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, h: r.height };
          });
          // owner, avatar-title: was "the empty corner and right band are the warm tint" (WARM[theme]) and
          // "the bottom centre is not the tint". The frame has no fill now: it is transparent, and the
          // person is what is drawn at the bottom centre, so hiding the picture must change those pixels.
          const where = `${path} @${w} ${theme}`;
          await expect(page.locator('#top .pop'), `${where} frame`).toHaveCSS(
            'background-color',
            CLEAR,
          );
          const clip = {
            x: (f.left + f.right) / 2 - 12,
            y: f.bottom - 10,
            width: 24,
            height: 8,
          };
          const withPerson = await stripMean(page, clip);
          await page.addStyleTag({ content: '#top .pop img { visibility: hidden !important; }' });
          const without = await stripMean(page, clip);
          expect(
            Math.max(...withPerson.map((v, c) => Math.abs(v - without[c]))),
            `${where} bottom centre is the person, not the page`,
          ).toBeGreaterThan(40);
        });
});

// Lead decision (U1b, extended to every width in review round 1): the four identity-row links are a
// 2 x 2 grid at every width, two columns with left edges aligned, the first column on the text track,
// so none is orphaned or ragged (390 and 320 included, where a flex-wrap line used to break two per
// row with the second column's left edges up to 32px apart). From L the columns are equal (1fr); below
// L they size to their labels (auto), so the two columns are not equal there.
test.describe('Home links 2 x 2 grid at every width', () => {
  for (const { path, lang } of LANGS)
    for (const w of [1440, 1069, 1024, 390, 320])
      for (const theme of ['light', 'dark'] as const)
        test(`${lang} ${theme}: at ${w} the four links are two rows of two with aligned left edges`, async ({
          page,
        }) => {
          await page.setViewportSize(size(w, 900));
          await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
          await page.goto(path);
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
          await fontsSettled(page);
          const m = await page.evaluate(() => {
            const row = document.querySelector('#top .w-links')!;
            const text = document.querySelector('#top .w-text')!.getBoundingClientRect();
            const links = [...row.querySelectorAll('a')].map((a) => {
              const r = a.getBoundingClientRect();
              return { left: r.left, top: r.top, h: r.height };
            });
            return {
              display: getComputedStyle(row).display,
              cols: getComputedStyle(row).gridTemplateColumns.split(' ').length,
              textLeft: text.left,
              links,
            };
          });
          const where = `${path} ${theme} @${w}`;
          expect(m.display, `${where} display`).toBe('grid');
          expect(m.cols, `${where} two columns`).toBe(2);
          expect(m.links.length, where).toBe(4);
          const [a, b, c, d] = m.links;
          expect(Math.abs(a.top - b.top), `${where} row 1`).toBeLessThanOrEqual(1);
          expect(Math.abs(c.top - d.top), `${where} row 2`).toBeLessThanOrEqual(1);
          expect(c.top, `${where} two rows`).toBeGreaterThan(a.top + 20);
          expect(Math.abs(a.left - c.left), `${where} column 1 edges`).toBeLessThanOrEqual(1);
          expect(Math.abs(b.left - d.left), `${where} column 2 edges`).toBeLessThanOrEqual(1);
          expect(b.left, `${where} column 2 right of column 1`).toBeGreaterThan(a.left + 100);
          expect(Math.abs(a.left - m.textLeft), `${where} on the text track`).toBeLessThanOrEqual(
            1,
          );
          for (const l of m.links)
            expect(l.h, `${where} tap target`).toBeGreaterThanOrEqual(44 - 0.05);
        });
});

test.describe('Home wall geometry', () => {
  const geometry = (page: Page) =>
    page.evaluate(() => {
      const rect = (s: string) => {
        const b = document.querySelector(s)!.getBoundingClientRect();
        return { top: b.top, bottom: b.bottom, left: b.left, right: b.right };
      };
      const clip = document.querySelector('.w-clip')!;
      const cs = getComputedStyle(clip);
      const wall = getComputedStyle(document.querySelector('.w-wall')!);
      const id = document.querySelector('#top .w-id')!;
      const ids = getComputedStyle(id);
      const ib = id.getBoundingClientRect();
      return {
        clip: { ...rect('.w-clip'), overflow: cs.overflow },
        // The computed mask (WebKit may report it only under the prefixed property).
        mask:
          cs.maskImage && cs.maskImage !== 'none'
            ? cs.maskImage
            : cs.getPropertyValue('-webkit-mask-image'),
        tracks: wall.gridTemplateColumns.split(' ').length,
        transform: wall.transform,
        cw: document.documentElement.clientWidth,
        pop: rect('#top .pop'),
        text: rect('#top .w-text'),
        acts: rect('#top .actions'),
        col: {
          left: ib.left + parseFloat(ids.paddingLeft),
          right: ib.right - parseFloat(ids.paddingRight),
        },
      };
    });
  const overlap = (a: { top: number; bottom: number }, b: { top: number; bottom: number }) =>
    a.top < b.bottom && b.top < a.bottom;

  for (const w of [1440, 1069, 900, 390, 320])
    test(`at ${w}: the clip is full width at the band's height, faded, with a 3D-tilted wall of ${w >= 735 ? 4 : 3} columns`, async ({
      page,
    }) => {
      await page.setViewportSize(size(w));
      await page.goto('/');
      const g = await geometry(page);
      expect(
        Math.abs(g.clip.bottom - g.clip.top - CLIP_H(w)),
        `${w} clip height`,
      ).toBeLessThanOrEqual(1);
      expect(Math.abs(g.clip.right - g.clip.left - g.cw), `${w} clip width`).toBeLessThanOrEqual(1);
      expect(g.clip.overflow, `${w} overflow`).toBe('clip');
      // Fades into the page: a linear gradient from opaque to transparent (computed as rgba(0,0,0,0)).
      expect(g.mask, `${w} mask`).toMatch(/linear-gradient\(.*(transparent|rgba\(0, 0, 0, 0\))/);
      expect(g.tracks, `${w} tracks`).toBe(w >= 735 ? 4 : 3);
      expect(g.transform, `${w} tilt`).toMatch(/^matrix3d\(/);
    });

  // owner, photo-tall: was "the photo, the text and the pills sit in one row, in that order" (pills stacked
  // right of the text); now the photo spans the text and, under it, the pills, so .w-text ends on the column.
  for (const w of [1440, 1069])
    test(`at ${w}: the photo spans the text and, under it, the pills`, async ({ page }) => {
      await page.setViewportSize(size(w));
      await page.goto('/');
      const g = await geometry(page);
      expect(g.pop.left, 'pop left of text').toBeLessThan(g.text.left);
      expect(
        Math.abs(g.acts.left - g.text.left),
        'pills start on the text left',
      ).toBeLessThanOrEqual(1);
      expect(g.acts.top, 'pills under the text').toBeGreaterThanOrEqual(g.text.bottom - 1);
      expect(overlap(g.pop, g.text), 'pop / text overlap vertically').toBe(true);
      expect(overlap(g.pop, g.acts), 'pop / pills overlap vertically').toBe(true);
      // owner, profile-image-full: was "pop centred on the text and pills" (centre within 1px); the photo
      // is taller than text + pills now and grows up into the fade, so its bottom is the pills' bottom.
      expect(
        Math.abs(g.pop.bottom - g.acts.bottom),
        'pop bottom on the pills bottom',
      ).toBeLessThanOrEqual(1);
      // owner, photo-align-cutout (was: top at or above the text top, bottom on the pills): equal with the
      // intro, so the top is the text's top.
      expect(Math.abs(g.pop.top - g.text.top), 'pop top on the text top').toBeLessThanOrEqual(1);
      expect(Math.abs(g.text.right - colAt(w)[1]), 'text ends on the column').toBeLessThanOrEqual(
        1,
      );
    });

  test('at 900: the pills sit under the photo and the text', async ({ page }) => {
    await page.setViewportSize(size(900));
    await page.goto('/');
    const g = await geometry(page);
    expect(g.acts.top).toBeGreaterThanOrEqual(g.text.bottom - 1);
    expect(g.acts.top).toBeGreaterThanOrEqual(g.pop.bottom - 1);
  });

  for (const w of [390, 320])
    test(`at ${w}: the photo, the text and the pills stack in DOM order inside the column`, async ({
      page,
    }) => {
      await page.setViewportSize(size(w));
      await page.goto('/');
      const g = await geometry(page);
      expect(g.text.top, 'text under the photo').toBeGreaterThanOrEqual(g.pop.bottom - 1);
      expect(g.acts.top, 'pills under the text').toBeGreaterThanOrEqual(g.text.bottom - 1);
      for (const [k, b] of Object.entries({ pop: g.pop, text: g.text, acts: g.acts })) {
        expect(b.left, `${k} left`).toBeGreaterThanOrEqual(g.col.left - 1);
        expect(b.right, `${k} right`).toBeLessThanOrEqual(g.col.right + 1);
      }
    });

  // The fade: the strip is the clip's bottom 4px rows, across the clip's full width (the identity row is
  // hidden while it is read). Light fades to --bg (white), dark to black.
  // A strip at 30% of the clip (inside the opaque part of the mask) must still show the wall, so an
  // empty wall cannot pass for a fade.
  for (const theme of ['light', 'dark'] as const)
    for (const w of [1440, 390])
      test(`the wall fades into the page at ${w} (${theme})`, async ({ page }) => {
        await page.setViewportSize(size(w));
        await gotoThemed(page, '/', theme);
        // Wide: all twelve shown pictures load. Narrow: the lazy tiles below the fold are not asked
        // for, so the network going quiet is the readiness signal (the tile surface shows either way).
        if (w === 1440) await expectAllShownLoaded(page, `${theme} @${w}`);
        else await page.waitForLoadState('networkidle');
        const g = await page.evaluate(() => {
          const c = document.querySelector('.w-clip')!.getBoundingClientRect();
          return {
            left: c.left,
            right: c.right,
            top: c.top,
            bottom: c.bottom,
          };
        });
        // The strip runs the clip's full width, from its left edge to its right. The identity row paints
        // over the fade (the name's capitals reach the clip's last rows, and the photo sits at the left),
        // so it is hidden while sampling (visibility keeps its layout): what is read is the wall and its
        // mask alone, and a fade defect anywhere across the clip turns this red.
        await page.addStyleTag({ content: '#top .w-id { visibility: hidden; }' });
        const x = Math.ceil(g.left);
        const width = Math.floor(g.right - g.left);
        const bottom = await stripMean(page, { x, y: Math.round(g.bottom - 4), width, height: 4 });
        const mid = await stripMean(page, {
          x,
          y: Math.round(g.top + 0.3 * (g.bottom - g.top)),
          width,
          height: 4,
        });
        const avg = (c: number[]) => (c[0] + c[1] + c[2]) / 3;
        if (theme === 'light') {
          for (const c of bottom)
            expect(c, `${theme} @${w} bottom ${bottom}`).toBeGreaterThanOrEqual(250);
          expect(avg(mid), `${theme} @${w} mid ${mid}`).toBeLessThan(252);
        } else {
          for (const c of bottom)
            expect(c, `${theme} @${w} bottom ${bottom}`).toBeLessThanOrEqual(5);
          expect(avg(mid), `${theme} @${w} mid ${mid}`).toBeGreaterThan(8);
        }
      });
});

test.describe('Home wall is static', () => {
  test('the tilt is the same with and without motion preference; nothing on the wall animates or transitions', async ({
    browser,
  }) => {
    const read = async (reducedMotion: 'no-preference' | 'reduce') => {
      const context = await browser.newContext({ reducedMotion, viewport: size(1440) });
      const page = await context.newPage();
      await page.goto('/');
      await settle(page);
      const r = await page.evaluate(() => {
        const wall = document.querySelector('.w-wall')!;
        const clip = document.querySelector('.w-clip')!;
        const dur = (e: Element) => getComputedStyle(e).transitionDuration;
        return {
          transform: getComputedStyle(wall).transform,
          animations: clip.getAnimations({ subtree: true }).length,
          wallDur: dur(wall),
          tileDur: dur(document.querySelector('.w-tile')!),
        };
      });
      await context.close();
      return r;
    };
    const motion = await read('no-preference');
    const still = await read('reduce');
    expect(motion.transform).toMatch(/^matrix3d\(/);
    expect(motion.transform, 'tilt with / without motion').toBe(still.transform);
    for (const [k, r] of Object.entries({ motion, still })) {
      expect(r.animations, `${k} animations`).toBe(0);
      expect(r.wallDur, `${k} .w-wall transition`).toBe('0s');
      expect(r.tileDur, `${k} .w-tile transition`).toBe('0s');
    }
  });
});

test.describe('Home design system', () => {
  test('no pastel or gradient backgrounds on large elements, no shadows, no borders but the pills', async ({
    page,
  }) => {
    for (const theme of ['light', 'dark'] as const)
      for (const w of [1440, 900, 390]) {
        await page.setViewportSize(size(w));
        await gotoThemed(page, '/', theme);
        const where = `${theme} @${w}`;
        const r = await page.evaluate(() => {
          const probe = document.createElement('div');
          probe.style.outline = '1px solid var(--keyline)';
          document.body.append(probe);
          const keyline = getComputedStyle(probe).outlineColor;
          probe.remove();
          const sides = ['top', 'right', 'bottom', 'left'] as const;
          const bad: string[] = [];
          for (const e of document.querySelectorAll('main *')) {
            const b = e.getBoundingClientRect();
            const s = getComputedStyle(e);
            const big = b.width > 64 && b.height > 64;
            const clip = (s as unknown as { webkitBackgroundClip: string }).webkitBackgroundClip;
            const name = `${e.tagName}.${e.className}`;
            if (big && s.backgroundImage !== 'none' && clip !== 'text') bad.push(`bg ${name}`);
            if (s.boxShadow !== 'none') bad.push(`shadow ${name}`);
            if (s.filter.includes('drop-shadow')) bad.push(`drop-shadow ${name}`);
            if (e.classList.contains('btn')) continue;
            // Home has no hairlines now: every border side is 0 (the tiles use an outline).
            for (const k of sides)
              if (
                s.getPropertyValue(`border-${k}-style`) !== 'none' &&
                s.getPropertyValue(`border-${k}-width`) !== '0px'
              )
                bad.push(`border-${k} ${name}`);
          }
          // Positive: every tile outlines itself 1px solid in the --keyline colour.
          const tiles = [...document.querySelectorAll('.w-tile')].map((e) => {
            const s = getComputedStyle(e);
            return `${s.outlineWidth} ${s.outlineStyle} ${s.outlineColor}`;
          });
          return { bad, keyline, tiles };
        });
        expect(r.keyline, where).not.toBe('');
        expect(r.bad, where).toEqual([]);
        expect(r.tiles, where).toHaveLength(WALL_SHOTS.length);
        for (const t of r.tiles) expect(t, where).toBe(`1px solid ${r.keyline}`);
      }
  });

  test('reveal: 900ms fade, 30px rise, 150ms stagger', async ({ browser }) => {
    const context = await browser.newContext({
      reducedMotion: 'no-preference',
      viewport: size(1440),
    });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/\breveal\b/);
    const item = page.locator('#more h2');
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
  for (const id of HEADED) {
    await page.goto(`/#${id}-title`);
    // Every headed block sits below the wall, so the fragment must have scrolled the page.
    await expect.poll(() => page.evaluate(() => window.scrollY), id).toBeGreaterThan(0);
    await settle(page);
    const m = await page.evaluate((i) => {
      const s = document.getElementById(i)!;
      const eb = s.querySelector('.t-eyebrow, .home-kicker');
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
    await expect(page.locator('h1')).toHaveText(profile('vi').name);
    await expect(page.getByRole('link', { name: 'Tải CV' }).first()).toHaveAttribute(
      'href',
      '/vi/cv.pdf',
    );
    await expect(page.locator('link[hreflang="vi"]')).toHaveCount(1);
  });
});

test.describe('Home blocks', () => {
  test('blocks at 390x844: every H2 in view, no horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ['/', '/vi/']) {
      await page.goto(path);
      const h2s = await page.evaluate(() =>
        [...document.querySelectorAll('main h2')].map((e) => {
          const r = e.getBoundingClientRect();
          return { id: e.id, left: r.left, right: r.right };
        }),
      );
      expect(h2s.length, path).toBe(HEADED.length);
      for (const h of h2s) {
        expect(h.left, `${path} ${h.id}`).toBeGreaterThanOrEqual(-1);
        expect(h.right, `${path} ${h.id}`).toBeLessThanOrEqual(391);
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        path,
      ).toBeLessThanOrEqual(390);
    }
  });

  test('headings are one H1, one H2 per headed block, and H3 only for the two goals', async ({
    page,
  }) => {
    for (const path of ['/', '/vi/']) {
      await page.goto(path);
      const levels = await page
        .locator('main :is(h1,h2,h3,h4,h5,h6)')
        .evaluateAll((els) => els.map((e) => Number(e.tagName[1])));
      expect(levels[0], path).toBe(1);
      expect(
        levels.filter((l) => l === 1),
        path,
      ).toHaveLength(1);
      expect(
        levels.filter((l) => l === 2),
        path,
      ).toHaveLength(HEADED.length);
      expect(
        levels.filter((l) => l > 3),
        path,
      ).toEqual([]);
      await expect(page.locator('#top h1'), path).toHaveCount(1);
      await expect(page.locator('#top h2'), path).toHaveCount(0);
      for (const id of HEADED)
        await expect(page.locator(`#${id} h2`), `${path} #${id}`).toHaveCount(1);
      await expect(page.locator('main h3'), path).toHaveCount(2);
      await expect(page.locator('#next h3.goal-title'), path).toHaveCount(2);
    }
  });

  test('no number tiles: no stat values, footnotes or stat strips; ids are unique', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(
      page.locator('main .stat-value, main .fn-ref, .footnotes, .stat-strip, .stat--super'),
    ).toHaveCount(0);
    const ids = await page.locator('[id]').evaluateAll((els) => els.map((e) => e.id));
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  test('Vietnamese blocks: translated headings and link names, no old blocks', async ({ page }) => {
    await page.goto('/vi/');
    await expect(page.locator('#next h2')).toHaveText('Tiếp theo.');
    await expect(page.locator('#more h2')).toHaveText('Cùng trò chuyện nhé.');
    await expect(page.locator('#practice, #project, #team, #writing, #skills')).toHaveCount(0);
    await expect(page.locator('#top .w-links a > span:not(.chev)')).toHaveText([
      'Xem mọi vai trò',
      'Xem dự án',
      'Tất cả câu chuyện',
      'Tất cả bài viết',
    ]);
    for (const name of ['Xem mọi vai trò', 'Xem dự án', 'Tất cả câu chuyện', 'Tất cả bài viết'])
      await expect(
        page.locator('#top .w-links').getByRole('link', { name, exact: true }),
      ).toHaveCount(1);
    await expect(page.locator('[aria-label="Tóm tắt nhanh"]')).toHaveCount(0);
  });

  test('no closer look and no story title in Home text; the stories index is the one story link outside the wall', async ({
    page,
  }) => {
    const wallStar = WALL_SHOTS.filter((s) => s.path.startsWith('/star/')).map((s) => s.path);
    for (const { path, prefix, lang } of LANGS) {
      const dict = ALT(lang);
      await page.goto(path);
      await expect(page.locator('#closer-look, #story, #highlights, .gallery, #board')).toHaveCount(
        0,
      );
      await expect(page.getByRole('heading', { name: 'Take a closer look.' })).toHaveCount(0);
      // Owner decision: story titles may appear inside the captures; Home's own text names none.
      const mainText = await page.locator('main').innerText();
      for (const t of storyTitles(lang)) expect(mainText, path).not.toContain(t);
      // Outside the wall the only story link is the index; inside it the hrefs are the wall's own.
      const outside = await page
        .locator(`main a[href^="${prefix}/star/"]`)
        .evaluateAll((els) =>
          els.filter((e) => !e.closest('.w-clip')).map((e) => e.getAttribute('href')),
        );
      expect([...new Set(outside)], path).toEqual([`${prefix}/star/`]);
      await expect(
        page.locator(`main a[href="${prefix}/star/"]:not(.w-tile)`),
        path,
      ).toHaveAccessibleName(dict['star.all']);
      const inside = await page
        .locator(`.w-clip a[href^="${prefix}/star/"]`)
        .evaluateAll((els) => els.map((e) => e.getAttribute('href')));
      expect(inside.sort(), path).toEqual(wallStar.map((p) => wallHref(p, lang)).sort());
      // The project: one link outside the wall, named "See the project".
      const project = page.locator(
        `main a[href="${prefix}/projects/agentic-coding-workflow/"]:not(.w-tile)`,
      );
      await expect(project, path).toHaveCount(2); // the row's link and the second goal's evidence link
      await expect(project.first(), path).toHaveAccessibleName(dict['projects.view']);
      await expect(
        page.locator('#top .w-links a[href$="/projects/agentic-coding-workflow/"]'),
        path,
      ).toHaveCount(1);
    }
    await page.goto('/');
    await expect(
      page.locator('#top .w-links').getByRole('link', { name: 'All stories' }),
    ).toHaveCount(1);
    await expect(
      page.locator('#top .w-links').getByRole('link', { name: 'See the project' }),
    ).toHaveCount(1);
  });

  test('main links to exactly the Wall destinations, in English and Vietnamese', async ({
    page,
  }) => {
    // The goals link to their evidence pages (as on /experiences/), so `/experiences/#next` left
    // Home; the second goal's evidence is the featured project, so its href appears once in the set.
    for (const { path, prefix, lang } of LANGS) {
      const p = profile(lang);
      await page.goto(`${prefix}/experiences/`);
      const goal1 = (await page.locator('#next .group-card a').first().getAttribute('href'))!;
      const want = [
        ...new Set([
          ...[
            '/cv.pdf',
            '/experiences/',
            '/projects/agentic-coding-workflow/',
            '/star/',
            '/blog/',
          ].map((h) => `${prefix}${h}`),
          goal1,
          `mailto:${p.email}`,
          p.linkedin,
        ]),
      ].sort();
      await page.goto(path);
      const outside = await page
        .locator('main a')
        .evaluateAll((els) =>
          els.filter((e) => !e.closest('.w-clip')).map((e) => e.getAttribute('href')!),
        );
      expect([...new Set(outside)].sort(), path).toEqual(want);
      expect(outside, path).not.toContain(`${prefix}/experiences/#next`);
      // The wall's tiles: exactly the twelve captured pages, in wall order.
      const tiles = await page
        .locator('.w-clip a')
        .evaluateAll((els) => els.map((e) => e.getAttribute('href')!));
      expect(tiles, path).toEqual(WALL_SHOTS.map((s) => wallHref(s.path, lang)));
      for (const h of new Set([...outside, ...tiles]))
        if (!/^(mailto:|https?:)/.test(h))
          expect((await page.request.get(h)).status(), h).toBe(200);
    }
  });

  test('reduced motion: every reveal item is shown without a transform and nothing on the wall animates', async ({
    page,
  }) => {
    await page.goto('/');
    const items = await page.locator('main [data-reveal]').evaluateAll((els) =>
      els.map((e) => {
        const s = getComputedStyle(e);
        return {
          id: e.id || e.tagName,
          opacity: s.opacity,
          transform: s.transform,
          translate: s.translate,
        };
      }),
    );
    expect(items.length).toBeGreaterThan(0);
    for (const i of items) {
      expect(i.opacity, i.id).toBe('1');
      expect(i.transform, i.id).toBe('none');
      expect(i.translate, i.id).toBe('none');
    }
    expect(
      await page.evaluate(
        () => document.querySelector('.w-clip')!.getAnimations({ subtree: true }).length,
      ),
    ).toBe(0);
  });

  test('keyboard: Tab from the top of the page reaches the row links first, never a wall tile, then the pills', async ({
    page,
    browserName,
  }) => {
    await page.setViewportSize(size(1440));
    await page.goto('/');
    // Every tile is a pointer link only.
    expect(
      await page
        .locator('.w-clip a')
        .evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).tabIndex)),
    ).toEqual(WALL_SHOTS.map(() => -1));
    const where = () =>
      page.evaluate(() => {
        const a = document.activeElement;
        return {
          wall: !!a?.closest('.w-clip'),
          inMain: !!a?.closest('main'),
          first: a === document.querySelector('#top .w-links a'),
          pill: !!a?.matches('#top .actions a'),
        };
      });
    if (browserName === 'webkit') {
      // WebKit does not Tab to links by default (same carve-out as experiences.spec.ts): focus
      // the first row link directly; the outline is the part under test.
      await page.keyboard.press('Shift');
      await page.locator('#top .w-links a').first().focus();
      expect((await where()).first).toBe(true);
    } else {
      const seen: Awaited<ReturnType<typeof where>>[] = [];
      for (let i = 0; i < 30 && !seen.some((s) => s.pill); i++) {
        await page.keyboard.press('Tab');
        seen.push(await where());
      }
      expect(
        seen.filter((s) => s.wall),
        'a wall tile took focus',
      ).toEqual([]);
      // The first focused element inside main is "See every role".
      expect(seen.find((s) => s.inMain)?.first, 'first stop in main').toBe(true);
      expect(
        seen.some((s) => s.pill),
        'the pills are reached',
      ).toBe(true);
      await page.locator('#top .w-links a').first().focus();
    }
    const ring = await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement!);
      return { style: s.outlineStyle, width: s.outlineWidth };
    });
    expect(ring.style).not.toBe('none');
    expect(ring.width).not.toBe('0px');
  });
});

test.describe('Home wall pictures', () => {
  test('twelve tiles, each with one light and one dark picture: empty alt, set size, shown per theme', async ({
    page,
  }) => {
    for (const { path, lang } of LANGS) {
      await page.setViewportSize(size(1440));
      await page.goto(path);
      const where = `${path}`;
      await expect(page.locator('.w-clip[aria-hidden="true"]'), where).toHaveCount(1);
      const tiles = page.locator('.w-tile');
      await expect(tiles, where).toHaveCount(WALL_SHOTS.length);
      for (const [i, s] of WALL_SHOTS.entries()) {
        const tile = tiles.nth(i);
        const at = `${where} tile ${i + 1} ${s.id}`;
        await expect(tile, at).toHaveAttribute('tabindex', '-1');
        await expect(tile, at).toHaveAttribute('href', wallHref(s.path, lang));
        await expect(tile.locator('img'), at).toHaveCount(2);
        const light = tile.locator('img.w-shot--light');
        const dark = tile.locator('img.w-shot--dark');
        await expect(light, at).toHaveCount(1);
        await expect(dark, at).toHaveCount(1);
        for (const img of [light, dark]) {
          await expect(img, at).toHaveAttribute('alt', '');
          await expect(img, at).toHaveAttribute('width', /^\d+$/);
          await expect(img, at).toHaveAttribute('height', /^\d+$/);
        }
        // Light is the default theme: only the light picture is displayed.
        await expect(light, at).not.toHaveCSS('display', 'none');
        await expect(dark, at).toHaveCSS('display', 'none');
      }
      // All twelve displayed pictures load, lazy ones included, and each is that tile's capture in this
      // language and theme, served as webp.
      await expectAllShownLoaded(page, `${where} light`);
      const srcs = await page
        .locator('.w-shot--light')
        .evaluateAll((els) => els.map((e) => (e as HTMLImageElement).currentSrc));
      for (const [i, s] of WALL_SHOTS.entries()) {
        expect(srcs[i], `${where} ${s.id}`).toMatch(
          new RegExp(`/_astro/${s.id}-${lang}-light\\.[^/]+\\.webp$`),
        );
      }
    }
  });

  test('at 390 the six eager light tiles load', async ({ page }) => {
    await page.setViewportSize(size(390, 844));
    for (const { path } of LANGS) {
      await page.goto(path);
      await expect
        .poll(() => eagerLoaded(page), { message: path })
        .toEqual({ eager: 6, loaded: 6 });
    }
  });

  // EN and VI, light and dark, at 1440: every wall request is a 200 webp, in this language only, in
  // light never a dark file, and in dark all twelve dark files.
  for (const { path, lang } of LANGS)
    for (const theme of ['light', 'dark'] as const)
      test(`${lang} ${theme}: the wall serves real webp captures of one language and the right theme`, async ({
        page,
      }) => {
        const seen = trackWebp(page);
        await page.setViewportSize(size(1440));
        await gotoThemed(page, path, theme);
        await expectAllShownLoaded(page, `${lang} ${theme}`);
        await page.waitForLoadState('networkidle');
        expect(
          seen.filter((s) => s.bad).map((s) => s.bad),
          'every webp response is 200 image/webp',
        ).toEqual([]);
        const wall = seen
          .map((s) => WALL_URL.exec(s.url))
          .filter((m): m is RegExpExecArray => m !== null);
        expect(wall.length, 'wall requests').toBeGreaterThan(0);
        for (const m of wall) expect(m[2], `language of ${m[0]}`).toBe(lang);
        if (theme === 'light')
          expect(
            wall.filter((m) => m[3] === 'dark').map((m) => m[0]),
            'no dark capture in a light visit',
          ).toEqual([]);
        const shown = new Set(wall.filter((m) => m[3] === theme).map((m) => m[1]));
        expect([...shown].sort(), `all twelve ${theme} captures`).toEqual([...WALL_IDS].sort());
      });

  test('the pictures follow the theme: dark shows the dark captures and the dark warm frame, light brings the light ones back', async ({
    page,
  }) => {
    await page.setViewportSize(size(1440));
    await page.goto('/');
    for (const theme of ['light', 'dark', 'light'] as const) {
      await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme);
      const where = `-> ${theme}`;
      expect(await shownVariants(page), where).toEqual(
        theme === 'dark' ? { light: 0, dark: 12 } : { light: 12, dark: 0 },
      );
      await expectAllShownLoaded(page, where);
      // owner, avatar-title: was WARM[theme]; the frame has no fill.
      expect(
        await page.locator('.pop').evaluate((e) => getComputedStyle(e).backgroundColor),
        where,
      ).toBe(CLEAR);
    }
  });

  // The system preference: no stored theme but "system", so the OS scheme decides.
  for (const scheme of ['dark', 'light'] as const)
    test(`system theme with the OS in ${scheme}: only the ${scheme} captures are shown, loaded, and the warm frame follows`, async ({
      browser,
    }) => {
      const ctx = await browser.newContext({
        colorScheme: scheme,
        reducedMotion: 'reduce',
        viewport: size(1440),
      });
      const page = await ctx.newPage();
      await page.addInitScript(() => localStorage.setItem('theme', 'system'));
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('data-pref', 'system');
      expect(await shownVariants(page)).toEqual(
        scheme === 'dark' ? { light: 0, dark: 12 } : { light: 12, dark: 0 },
      );
      await expectAllShownLoaded(page, `system ${scheme}`);
      // owner, avatar-title: was WARM[scheme]; the frame has no fill.
      expect(await page.locator('.pop').evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(
        CLEAR,
      );
      await ctx.close();
    });

  // Chromium only: the cap is the sum of the awaited webp bodies, read after the pictures loaded and
  // the network went idle (a lazy tile still in flight would let the cap pass early).
  const bytesKb = async (seen: ReturnType<typeof trackWebp>) =>
    (await Promise.all(seen.map((s) => s.bytes))).reduce((a, b) => a + b, 0) / 1024;

  for (const { path, lang } of LANGS) {
    test(`${lang}: the wall's webp bytes stay under the caps (1440 light, 390 at DPR 2 light, 1440 dark)`, async ({
      browser,
      browserName,
    }) => {
      test.skip(browserName !== 'chromium', 'the caps were measured in Chromium');
      for (const [label, viewport, dpr, theme, cap] of [
        ['1440 light', size(1440), 1, 'light', CAP_KB.light1440],
        ['390 DPR2 light', size(390, 844), 2, 'light', CAP_KB.light390],
        ['1440 dark', size(1440), 1, 'dark', CAP_KB.dark1440],
      ] as const) {
        const ctx = await browser.newContext({
          viewport,
          deviceScaleFactor: dpr,
          reducedMotion: 'reduce',
        });
        const page = await ctx.newPage();
        const seen = trackWebp(page);
        await gotoThemed(page, path, theme);
        if (viewport.width === 1440) await expectAllShownLoaded(page, label);
        else
          await expect
            .poll(() => eagerLoaded(page), { message: label })
            .toEqual({ eager: 6, loaded: 6 });
        await page.waitForLoadState('networkidle');
        const kb = await bytesKb(seen);
        expect(
          kb,
          `${path} ${label}: ${kb.toFixed(1)} KB over ${seen.length} files`,
        ).toBeGreaterThan(20);
        expect(
          kb,
          `${path} ${label}: ${kb.toFixed(1)} KB over ${seen.length} files`,
        ).toBeLessThanOrEqual(cap);
        await ctx.close();
      }
    });
  }

  test('every picture in main is named or hidden; main has 25 pictures and one SVG, the decorative Claude mark in #next', async ({
    page,
  }) => {
    for (const { path } of LANGS) {
      await page.goto(path);
      // owner, photo-logos: old "no SVG picture" (main svg count 0). Exactly one SVG now, the
      // Claude mark on the dated step in #next: decorative (aria-hidden), no role, no label.
      await expect(page.locator('main svg[role="img"]'), path).toHaveCount(0);
      await expect(page.locator('main svg'), path).toHaveCount(1);
      await expect(page.locator('#next [data-next-step] svg'), path).toHaveCount(1);
      await expect(page.locator('main img'), path).toHaveCount(WALL_SHOTS.length * 2 + 1);
      const pics = await page.locator('main').evaluate((m) =>
        [...m.querySelectorAll('svg, img')]
          .filter((e) => !e.parentElement?.closest('svg'))
          .map((e) => ({
            where: `${e.closest('[id]')?.id} ${e.tagName.toLowerCase()}`,
            svg: e.tagName.toLowerCase() === 'svg',
            role: e.getAttribute('role'),
            label: (e.getAttribute('aria-label') ?? '').trim(),
            hidden: e.getAttribute('aria-hidden') === 'true',
            alt: e.getAttribute('alt'),
            inLink: e.closest('a') ? e.closest('a')!.className : null,
          })),
      );
      expect(pics.length, path).toBeGreaterThan(0);
      for (const p of pics) {
        // Named: an SVG with role="img" and a label, or an img with a non-empty alt.
        const named = p.svg ? p.role === 'img' && p.label !== '' : !!p.alt?.trim();
        // Decorative: hidden from assistive tech (an SVG needs aria-hidden; an img alt="").
        const decorative = p.hidden || (!p.svg && p.alt === '');
        expect(named || decorative, `${path} ${p.where}`).toBe(true);
        if (decorative) expect(p.label, `${path} ${p.where} hidden but labelled`).toBe('');
        // Owner rule: the wall is decorative, so every img's alt is empty (an svg has no alt). The
        // only pictures inside a link are the wall's, inside `a.w-tile`.
        if (!p.svg) expect(p.alt, `${path} ${p.where} alt`).toBe('');
        else expect(p.where, `${path} the one svg`).toBe('next svg');
        if (p.inLink !== null) expect(p.inLink, `${path} ${p.where} link`).toMatch(/\bw-tile\b/);
      }
      // The decorative chevron glyph of every "›" link is hidden and kept out of its name.
      const chevrons = page.locator('main .link-chevron');
      expect(await chevrons.count(), path).toBe(6);
      for (const a of await chevrons.all()) {
        await expect(a.locator('.chev'), path).toHaveAttribute('aria-hidden', 'true');
        await expect(a, path).not.toHaveAccessibleName(/›/);
      }
    }
  });

  test('wall and photo cause no layout shift', async ({ page, browserName }) => {
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
    for (const sz of [
      { width: 1440, height: 900 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(sz);
      await page.goto('/');
      const read = () =>
        page.evaluate(() => {
          const w = window as unknown as { __cls: number; __shifts: Node[][] };
          return {
            cls: w.__cls,
            fromArt: w.__shifts.flat().filter((n) => !!n.parentElement?.closest('.w-clip, .pop'))
              .length,
          };
        });
      // Late shifts come from fonts and pictures: wait for both and for the network to go quiet. The
      // wall and the photo are on screen first (layout shifts count only inside the viewport), then
      // the page is scrolled to "Next." and read again.
      await fontsSettled(page);
      await page.waitForLoadState('networkidle');
      await settle(page);
      const top = await read();
      expect(top.cls, `${sz.width} wall in view`).toBeLessThan(0.05);
      expect(top.fromArt, `${sz.width} shifts from the wall or photo`).toBe(0);
      await page.locator('#next').scrollIntoViewIfNeeded();
      await settle(page);
      const r = await read();
      expect(r.cls).toBeLessThan(0.05);
      expect(r.fromArt).toBe(0);
    }
  });
});

test.describe('Home photo', () => {
  for (const [path, label] of [
    ['/', 'en'],
    ['/vi/', 'vi'],
  ] as const) {
    // Reversed by the owner (photo in the page): the photo sits in the identity row. It is decorative (the
    // H1 names the page), not a link, and the old slots stay gone. owner, profile-image-full: the whole
    // photo (was the cut-out headshot, src /_astro/avatar-cutout.).
    test(`${label}: the whole photo is in the identity row, decorative, loaded, not a link`, async ({
      page,
    }) => {
      await page.goto(path);
      await expect(page.locator('#top')).toBeVisible();
      const img = page.locator('#top .pop img');
      await expect(img).toHaveCount(1);
      await expect(img).toHaveAttribute('alt', '');
      await expect(img).toHaveAttribute('src', /\/_astro\/photo-cutout\./);
      await expect(page.locator('#top .pop a')).toHaveCount(0);
      expect(await img.evaluate((e) => e.closest('a'))).toBeNull();
      await expect
        .poll(() => img.evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth > 0))
        .toBe(true);
      await expect(page.locator('#top .hero-logo')).toHaveCount(0);
      await expect(page.locator('main img.home-portrait')).toHaveCount(0);
      await expect(page.locator('.hero-avatar')).toHaveCount(0);
    });
  }

  test('other heroes are unchanged: no avatar in any hero, role pages keep their logo', async ({
    page,
  }) => {
    for (const path of ['/experiences/', '/skills/', '/vi/experiences/']) {
      await page.goto(path);
      await expect(page.locator('.hero-avatar'), path).toHaveCount(0);
    }
    await page.goto(`/experiences/${order[0].slug}/`);
    await expect(page.locator('.hero-logo')).toHaveCount(1);
    await expect(page.locator('.hero-logo .hero-avatar')).toHaveCount(0);
  });
});

// owner, avatar-title (hierarchy) and owner, title-black (was --accent, "highlight title"): the role title is in
// the name's --text token, plain text (no underline), the areas line is lighter, in --text-2 at weight 500.
// Hierarchy is size and weight (title 600 > areas 500). Colours are compared with what the tokens compute to, in light and dark, EN and VI.
test.describe('Home role line hierarchy', () => {
  for (const { path, lang } of LANGS)
    for (const theme of ['light', 'dark'] as const)
      test(`${lang} ${theme}: the title is --text like the name, the areas lighter`, async ({
        page,
      }) => {
        await page.setViewportSize(size(1440, 900));
        await gotoThemed(page, path, theme);
        const r = await page.evaluate(() => {
          const cs = (sel: string) => getComputedStyle(document.querySelector(sel)!);
          const token = (v: string) => {
            const e = document.createElement('i');
            e.style.color = `var(${v})`;
            document.body.append(e);
            const c = getComputedStyle(e).color;
            e.remove();
            return c;
          };
          const t = cs('#top .w-title');
          const a = cs('#top .w-areas');
          return {
            title: t.color,
            titleSize: t.fontSize,
            titleWeight: t.fontWeight,
            titleDeco: t.textDecorationLine,
            areas: a.color,
            areasSize: a.fontSize,
            areasWeight: a.fontWeight,
            name: cs('#top .w-name').color,
            nameSize: cs('#top .w-name').fontSize,
            accent: token('--accent'),
            text: token('--text'),
            text2: token('--text-2'),
          };
        });
        // owner, title-black: was `title = --accent` and `!= name`.
        expect(r.title, 'title = --text').toBe(r.text);
        expect(r.title, 'title equals the name colour').toBe(r.name);
        expect(r.title, 'title is not the accent').not.toBe(r.accent);
        expect(r.name, 'name stays in ink').toBe(r.text);
        expect(r.areas, 'areas = --text-2').toBe(r.text2);
        expect(r.areas, 'areas differ from the title').not.toBe(r.title);
        expect(r.titleWeight, 'title weight 600').toBe('600');
        expect(r.areasWeight, 'areas lighter than the title').toBe('500');
        expect(Number(r.titleWeight), 'title heavier than the areas').toBeGreaterThan(
          Number(r.areasWeight),
        );
        expect(parseFloat(r.titleSize), 'title bigger than the areas').toBeGreaterThan(
          parseFloat(r.areasSize),
        );
        expect(r.titleDeco, 'title is not link-like').toBe('none');
        // owner, title-below-name: was `areasSize == titleSize`; the title is now bigger than the areas line.
        expect(r.titleSize, 'title is 32px at 1440').toBe('32px');
        expect(r.areasSize, 'areas stay 17px at 1440').toBe('17px');
        expect(parseFloat(r.titleSize), 'title smaller than the name').toBeLessThan(
          parseFloat(r.nameSize),
        );
      });
});

// owner, title-below-name: the role title sits directly under the name, bigger (32 / 28 / 24px at L / M / S, was
// 17 / 17 / 14px), the areas line keeps its size; the H1 is the top of the text block (and of the frame from L).
test.describe('Home title below the name', () => {
  for (const { path, lang } of LANGS)
    for (const [w, title, areas] of [
      [1440, 32, 17],
      [1024, 28, 17],
      [390, 24, 14],
      [320, 24, 14],
    ] as const)
      test(`${lang} ${w}: the title is ${title}px directly under the name, then the areas line`, async ({
        page,
      }) => {
        await page.setViewportSize(size(w, 900));
        await page.goto(path);
        await fontsSettled(page);
        const r = await page.evaluate(() => {
          const el = (s: string) => document.querySelector(s)!;
          const box = (s: string) => el(s).getBoundingClientRect();
          return {
            h1: box('#top .w-name'),
            title: box('#top .w-title'),
            areas: box('#top .w-areas'),
            say: box('#top .w-say'),
            text: box('#top .w-text'),
            pop: box('#top .pop'),
            titleSize: parseFloat(getComputedStyle(el('#top .w-title')).fontSize),
            areasSize: parseFloat(getComputedStyle(el('#top .w-areas')).fontSize),
            nameSize: parseFloat(getComputedStyle(el('#top .w-name')).fontSize),
            sw: document.documentElement.scrollWidth,
          };
        });
        expect(r.titleSize, 'title size').toBe(title);
        expect(r.areasSize, 'areas size').toBe(areas);
        expect(r.nameSize, 'the name is larger than the title').toBeGreaterThan(r.titleSize);
        expect(
          Math.abs(r.title.top - r.h1.bottom - 6),
          'title 6px under the name',
        ).toBeLessThanOrEqual(1);
        expect(r.title.bottom, 'areas under the title').toBeLessThanOrEqual(r.areas.top + 1);
        expect(r.areas.bottom, 'intro under the areas').toBeLessThanOrEqual(r.say.top + 1);
        expect(Math.abs(r.h1.top - r.text.top), 'the H1 is the text top').toBeLessThanOrEqual(1);
        if (w >= 1024)
          expect(
            Math.abs(r.pop.top - r.h1.top),
            'the frame top is the name top',
          ).toBeLessThanOrEqual(1);
        expect(r.sw, 'no sideways scroll').toBeLessThanOrEqual(w);
      });
});

test.describe('Home identity row order', () => {
  for (const { path, lang } of LANGS) {
    test(`${lang}: the H1, the role line, the sentence, the four links, then the CV and Email pills`, async ({
      page,
    }) => {
      const dict = ALT(lang);
      await page.goto(path);
      const order = await page.evaluate(() => {
        const top = document.querySelector('#top')!;
        // owner, title-below-name: was ['.w-role', 'h1', ...]; the H1 comes first.
        const parts = ['h1', '.w-role', '.w-say', '.w-links', '.actions'];
        const els = parts.map((s) => top.querySelector(s));
        return {
          found: els.map((e) => e !== null),
          inOrder: els
            .slice(1)
            .every(
              (e, i) =>
                !!e &&
                !!els[i] &&
                !!(els[i]!.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING),
            ),
        };
      });
      expect(order.found).toEqual([true, true, true, true, true]);
      expect(order.inOrder).toBe(true);
      await expect(page.locator('#top h1')).toHaveText(profile(lang).name);
      // owner, avatar-title: was profile(lang).headline; two lines, the title and the areas.
      await expect(page.locator('#top .w-role .w-title')).toHaveText(dict['home.role']);
      await expect(page.locator('#top .w-role .w-areas')).toHaveText(dict['home.roleAreas']);
      await expect(page.locator('#top .w-role')).not.toContainText('Senior');
      await expect(page.locator('#top .w-say')).toHaveText(stripBold(dict['home.intro']));
      const links = page.locator('#top .w-links a');
      expect(await links.evaluateAll((els) => els.map((e) => e.getAttribute('href')))).toEqual(
        LINKS.map(([href]) => `${lang === 'vi' ? '/vi' : ''}${href}`),
      );
      await expect(links.locator('> span:not(.chev)')).toHaveText(
        LINKS.map(([, key]) => dict[key]),
      );
      const pills = page.locator('#top .actions > a');
      await expect(pills).toHaveText([dict['common.download'], dict['home.contact.email']]);
      await expect(pills.first()).toHaveAttribute('href', `${lang === 'vi' ? '/vi' : ''}/cv.pdf`);
      await expect(pills.first()).toHaveAttribute('download', 'Ryan-Parker-CV.pdf');
      await expect(pills.first()).toHaveClass(/\bbtn-primary\b/);
      await expect(pills.last()).toHaveAttribute('href', `mailto:${profile(lang).email}`);
      await expect(pills.last()).toHaveClass(/\bbtn-secondary\b/);
    });

    test(`${lang}: no location, languages or years figure in main; #more keeps the legal name`, async ({
      page,
    }) => {
      // Owner decision: the location, the spoken languages and "5+ years" are dropped from Home. The
      // role page capture (a wall tile) may show the location: the rule is about Home's own text.
      const p = profile(lang);
      await page.goto(path);
      const main = await page.locator('main').innerText();
      expect(main).not.toContain(p.location);
      for (const l of p.languages) {
        expect(main).not.toContain(l);
        expect(main).not.toContain(l.split(' — ')[0]);
      }
      expect(main).not.toContain(p.years);
      expect(main).not.toMatch(/\b\d+\s*\+?\s*(years?|yrs?)\b/i);
      expect(main).not.toMatch(/\d+\s*\+?\s*năm/i);
      const facts = page.locator('main [data-facts]');
      await expect(facts).toHaveCount(1);
      await expect(page.locator('#more [data-facts]')).toHaveCount(1);
      await expect(facts.locator('> li')).toHaveCount(1);
      await expect(facts.locator('> li[data-real-name]')).toHaveCount(1);
    });
  }
});

test.describe('Home next cell', () => {
  // The "So far" link keys of NEXT_STEPS (src/lib/career-next.ts), in display order.
  const LINK_KEYS = ['exp.next.architecture.link', 'exp.next.deployed.link'];
  for (const { path, prefix, lang } of LANGS) {
    const exp = `${prefix}/experiences/`;
    test(`${lang}: the two goals of ${exp}#next, each linking to its evidence page`, async ({
      page,
    }) => {
      const dict = ALT(lang);
      await page.goto(exp);
      // owner, next-card: old `#next .group-card` (2 goals); /experiences/ now also has the Claude card first.
      const cards = page.locator('#next .group-card:not(#next-cert)');
      const eyebrows = (await cards.locator('.group-card__eyebrow').allTextContents()).map(nbsp);
      const titles = (await cards.locator('h3').allTextContents()).map(nbsp);
      const texts = (await cards.locator('.group-card__text').allTextContents()).map(nbsp);
      const hrefs = await cards
        .locator('a')
        .evaluateAll((els) => els.map((e) => e.getAttribute('href')!));
      expect(titles).toHaveLength(2);
      expect(hrefs).toHaveLength(2);
      await page.goto(path);
      const goals = page.locator('#next');
      await expect(goals.locator('h2')).toHaveText(dict['exp.next.title']);
      await expect(goals.locator('h2')).toHaveText(lang === 'vi' ? 'Tiếp theo.' : 'Next.');
      const items = goals.locator('.goals > li');
      expect((await items.locator('.home-kicker').allTextContents()).map(nbsp)).toEqual(eyebrows);
      expect((await items.locator('.goal-title').allTextContents()).map(nbsp)).toEqual(titles);
      expect((await items.locator('.home-text').allTextContents()).map(nbsp)).toEqual(texts);
      for (const [i, year] of ['2028', '2030'].entries()) expect(eyebrows[i]).toContain(year);
      const links = goals.locator('a');
      await expect(links).toHaveCount(2);
      expect(await links.evaluateAll((els) => els.map((e) => e.getAttribute('href')))).toEqual(
        hrefs,
      );
      for (const [i, key] of LINK_KEYS.entries()) {
        await expect(links.nth(i)).toHaveAccessibleName(dict[key]);
        await expect(links.nth(i)).not.toHaveAttribute('aria-label', /.*/);
      }
      const fields = [
        ...(await items.locator('.home-kicker').allInnerTexts()).map(withoutAllowed),
        ...(await items.locator('.goal-title').allInnerTexts()).map(withoutAllowed),
        ...(await goals.locator('h2').allInnerTexts()).map(norm),
        ...(await items.locator('.home-text').allInnerTexts()).map(norm),
        ...(await links.allInnerTexts()).map(norm),
        ...(
          await links.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''))
        ).map(withoutTitleSuffix),
      ];
      for (const s of fields) for (const re of NEXT_FORBIDDEN) expect(s).not.toMatch(re);
      for (const h of hrefs) expect((await page.request.get(h)).status(), h).toBe(200);
      // One real click per language: the first goal lands on its evidence page.
      await links.first().click();
      await expect(page).toHaveURL(new RegExp(`${hrefs[0]}$`));
      await expect(page.locator('h1')).toBeVisible();
    });

    test(`${lang}: the goals share a row at 1440 and stack at 390`, async ({ page }) => {
      for (const [w, same] of [
        [1440, true],
        [390, false],
      ] as const) {
        await page.setViewportSize(size(w));
        await page.goto(path);
        const tops = await page
          .locator('#next .goals > li')
          .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
        expect(tops, `@${w}`).toHaveLength(2);
        if (same) expect(tops[0], `@${w}`).toBe(tops[1]);
        else expect(tops[1], `@${w}`).toBeGreaterThan(tops[0]);
      }
    });

    for (const theme of ['light', 'dark'] as const)
      test(`${lang}: axe finds no violations in #next (${theme})`, async ({ page }) => {
        await gotoThemed(page, path, theme);
        const { violations } = await new AxeBuilder({ page }).include('#next').analyze();
        expect(violations.map((v) => v.id)).toEqual([]);
      });
  }
});

test.describe('Home wall axe', () => {
  // The wall is aria-hidden with tabindex="-1" links (no focusable content inside a hidden region).
  for (const { path, lang } of LANGS)
    for (const theme of ['light', 'dark'] as const)
      test(`${lang}: axe finds no violations in #top (${theme})`, async ({ page }) => {
        await page.setViewportSize(size(1440));
        await gotoThemed(page, path, theme);
        await expectAllShownLoaded(page, `${lang} ${theme}`);
        const { violations } = await new AxeBuilder({ page }).include('#top').analyze();
        expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`)).toEqual(
          [],
        );
      });
});

test.describe('Home has no logo wall', () => {
  for (const { path, lang } of LANGS)
    test(`${lang}: no tool marks; the logo note only under the one mark, in #next`, async ({
      page,
    }) => {
      // O6: the tools tile left Home; /skills/ keeps the marks and plates (skills.spec.ts). Owner,
      // photo-logos: old "no logo disclaimer in main" -> the Claude mark on the Next. step brings the
      // owners / no-endorsement note, once, in #next (the note appears only where a mark shows).
      const dict = ALT(lang);
      await page.goto(path);
      await expect(page.locator('main .tool-icon')).toHaveCount(0);
      const note = dict['skills.logosNote'];
      const main = await page.locator('main').innerText();
      expect(main.split(note).length - 1, 'note occurrences in main').toBe(1);
      await expect(page.locator('#next .logos-note')).toHaveText(note);
      expect(await page.locator('#top').innerText()).not.toContain(note);
    });
});

test.describe('Home links, focus and footer (review round 1)', () => {
  for (const { path, lang } of LANGS)
    test(`${lang}: wrapped "›" links keep the chevron on the last line, their gap and 44px, and never overlap`, async ({
      page,
    }) => {
      // Reads every chevron link: the "›" against the last line of its label, the 44px box, the gap
      // from the element above the link row to the first link's text, and box overlaps. The row is
      // `.w-links` (the wall's four links) or `.home-links` (a goal's link).
      const read = () =>
        page.evaluate(() => {
          const links = [...document.querySelectorAll('main .link-chevron')];
          const range = document.createRange();
          const rows = links.map((a) => {
            const label = a.querySelector(':scope > span:not(.chev)')!;
            range.selectNodeContents(label);
            const lines = [...range.getClientRects()].filter((r) => r.width > 0);
            const last = lines[lines.length - 1];
            const c = a.querySelector('.chev')!.getBoundingClientRect();
            const row = a.closest('.home-links, .w-links');
            const above = row?.previousElementSibling;
            return {
              name: `${a.closest('[id]')?.id} ${a.textContent?.trim()}`,
              fs: parseFloat(getComputedStyle(a).fontSize),
              lines: lines.length,
              lead: c.left - last.right,
              mid: Math.abs((c.top + c.bottom) / 2 - (last.top + last.bottom) / 2),
              height: a.getBoundingClientRect().height,
              gap:
                row && above && row.querySelector('.link-chevron') === a
                  ? lines[0].top - above.getBoundingClientRect().bottom
                  : null,
            };
          });
          const boxes = links.map((a) => a.getBoundingClientRect());
          const overlaps: string[] = [];
          boxes.forEach((a, i) =>
            boxes.slice(i + 1).forEach((b, j) => {
              const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
              const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
              if (x > 0.5 && y > 0.5) overlaps.push(`${rows[i].name} / ${rows[i + 1 + j].name}`);
            }),
          );
          return { rows, overlaps };
        });
      for (const w of [1440, 1069, 320])
        for (const [mode, css] of [
          ['100%', ''],
          ['200%', TEXT_200],
        ] as const) {
          await page.setViewportSize(size(w));
          await page.goto(path);
          if (css) await page.addStyleTag({ content: css });
          await settle(page);
          const where = `${path} @${w} ${mode}`;
          const m = await read();
          // Four links in the wall row and one per goal.
          expect(m.rows.length, where).toBe(6);
          // The gap is measured for the first link of `.w-links` and of each goal's row: exactly 3, so
          // the new row cannot be skipped by a null.
          expect(m.rows.filter((r) => r.gap !== null).length, `${where} measured gaps`).toBe(3);
          // The one-line gap: the same rows with every label kept on one line.
          await page.addStyleTag({
            content: 'main .link-chevron > span:not(.chev){white-space:nowrap!important}',
          });
          await settle(page);
          const one = await read();
          for (const [i, r] of m.rows.entries()) {
            const at = `${where} ${r.name}`;
            expect(r.lead, `${at} › after the last word`).toBeGreaterThanOrEqual(-1);
            expect(r.lead, `${at} › within 0.5em`).toBeLessThanOrEqual(0.5 * r.fs);
            expect(r.mid, `${at} › on the last line`).toBeLessThanOrEqual(0.3 * r.fs);
            expect(r.height, `${at} height`).toBeGreaterThanOrEqual(44 - 0.05);
            if (r.gap !== null)
              expect(
                Math.abs(r.gap - one.rows[i].gap!),
                `${at} gap (${r.lines} lines)`,
              ).toBeLessThanOrEqual(2);
          }
          expect(m.overlaps, where).toEqual([]);
        }
      // The check is live: at 320 with 200% text at least one label wraps.
      await page.setViewportSize(size(320));
      await page.goto(path);
      await page.addStyleTag({ content: TEXT_200 });
      await settle(page);
      expect(Math.max(...(await read()).rows.map((r) => r.lines)), lang).toBeGreaterThan(1);
    });

  const RINGS = [
    '#top .actions a.btn-secondary',
    '#more .actions a.btn-primary',
    '#more .actions a.btn-secondary',
    '#top .w-links .link-chevron',
    '#next .link-chevron',
  ];
  for (const theme of ['light', 'dark'] as const)
    test(`focus rings show on the Email pill, the #more pills and a "›" link in the wall row and in "Next." (${theme})`, async ({
      page,
    }) => {
      await page.setViewportSize(size(1440));
      await gotoThemed(page, '/', theme);
      // A real key press first, so focus is keyboard-modality; then focus each target directly.
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift');
      for (const sel of RINGS) {
        const el = page.locator(sel).first();
        await el.focus();
        await expect(el, sel).toBeFocused();
        const ring = await el.evaluate((e) => {
          const s = getComputedStyle(e);
          return {
            visible: e.matches(':focus-visible'),
            style: s.outlineStyle,
            width: parseFloat(s.outlineWidth),
            offset: parseFloat(s.outlineOffset),
            color: s.outlineColor,
            fill: s.backgroundColor,
          };
        });
        expect(ring.visible, sel).toBe(true);
        expect(ring.style, sel).toBe('solid');
        expect(ring.width, sel).toBeGreaterThanOrEqual(2);
        // On or outside the edge, or inset in a colour the fill does not hide.
        expect(ring.offset >= 0 || ring.color !== ring.fill, `${sel} ${JSON.stringify(ring)}`).toBe(
          true,
        );
      }
    });

  for (const { path } of LANGS)
    test(`${path}: at 1440 the footer's first row sits at least 20px below the footer's top edge`, async ({
      page,
    }) => {
      // Home has no footer breadcrumbs, so without its own room the directory meets the edge.
      await page.setViewportSize(size(1440));
      await page.goto(path);
      const m = await page.evaluate(() => {
        const f = document.querySelector('.site-footer')!;
        const top = f.getBoundingClientRect().top;
        const first = [...f.querySelectorAll('.inner > *')].find(
          (e) => e.getBoundingClientRect().height > 0,
        )!;
        const title = [...f.querySelectorAll('.col-title')].find(
          (e) => e.getBoundingClientRect().height > 0,
        )!;
        const range = document.createRange();
        range.selectNodeContents(title);
        return {
          row: first.getBoundingClientRect().top - top,
          text: range.getBoundingClientRect().top - top,
        };
      });
      expect(m.row).toBeGreaterThanOrEqual(20);
      expect(m.text).toBeGreaterThanOrEqual(20);
    });
});

test.describe('Home on small screens', () => {
  for (const { path, lang } of LANGS)
    for (const w of [390, 320])
      test(`${lang} at ${w}: no sideways scroll and every item inside its block at 100% and 200% text`, async ({
        page,
      }) => {
        await page.setViewportSize(size(w, 800));
        await page.goto(path);
        const read = () =>
          page.evaluate(() => {
            const out: string[] = [];
            // The wall is clipped decoration: its clip must sit inside `#top` with `overflow: clip`,
            // and its descendants are skipped. Every other rendered element of main outside SVG
            // internals is held to its `main > *` block (±1, the H1 included).
            const clip = document.querySelector('.w-clip')!;
            const cb = clip.getBoundingClientRect();
            const tb = document.querySelector('#top')!.getBoundingClientRect();
            if (
              cb.left < tb.left - 1 ||
              cb.right > tb.right + 1 ||
              cb.top < tb.top - 1 ||
              cb.bottom > tb.bottom + 1
            )
              out.push('w-clip outside #top');
            if (getComputedStyle(clip).overflow !== 'clip') out.push('w-clip overflow');
            const items = [...document.querySelectorAll('main *')].filter((e) => {
              if (e.parentElement?.closest('svg')) return false;
              if (e.closest('.w-clip') && e !== clip) return false;
              const r = e.getBoundingClientRect();
              return r.width > 0 && r.height > 0;
            });
            items.forEach((e, i) => {
              const block = e.closest('main > *')!;
              const box = block.getBoundingClientRect();
              const r = e.getBoundingClientRect();
              if (r.left < box.left - 1 || r.right > box.right + 1)
                out.push(`${block.id || block.className} ${e.tagName}.${e.className} [${i}]`);
            });
            return {
              sw: document.documentElement.scrollWidth,
              iw: window.innerWidth,
              n: items.length,
              out,
              goal: parseFloat(
                getComputedStyle(document.querySelector('#next .goal-title')!).fontSize,
              ),
            };
          });
        const base = await read();
        expect(base.n, '100%').toBeGreaterThan(0);
        expect(base.sw, '100%').toBeLessThanOrEqual(base.iw);
        expect(base.out, '100%').toEqual([]);
        await page.addStyleTag({ content: TEXT_200 });
        await settle(page);
        const big = await read();
        expect(big.sw, '200%').toBeLessThanOrEqual(big.iw);
        expect(big.out, '200%').toEqual([]);
        // rem text: doubling the root size doubles the goal titles.
        expect(big.goal).toBeCloseTo(base.goal * 2, 1);
      });

  // The wall and the row never push the page sideways at 200% text, in the system face and the
  // forced wide face, at every width the Wall is built for.
  for (const { path, lang } of LANGS)
    test(`${lang}: no horizontal overflow at 200% text at 320, 390, 768, 1069 and 1440`, async ({
      page,
    }) => {
      for (const [mode, css] of [
        ['text-200', TEXT_200],
        ['wide-face', MODES['text-200-wide-font']],
      ] as const)
        for (const w of [320, 390, 768, 1069, 1440]) {
          await page.setViewportSize(size(w, 800));
          await page.goto(path);
          await page.addStyleTag({ content: css });
          await fontsSettled(page);
          const m = await page.evaluate(() => ({
            sw: document.documentElement.scrollWidth,
            iw: window.innerWidth,
          }));
          expect(m.sw, `${path} @${w} ${mode}`).toBeLessThanOrEqual(m.iw);
        }
    });
});

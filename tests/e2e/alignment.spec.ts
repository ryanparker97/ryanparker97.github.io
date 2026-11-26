/**
 * Site-wide column alignment (owner, photo-logos: "make everything properly aligned on all sides";
 * "keep both columns, align edges"). Every page type has its nav, local nav, footer and content on the
 * same column (x 230..1210 at 1440, 166..858 at 1024, 87.5% at 390 and 320), wide boxes keep their
 * 1260 box but their CONTENT is the column, and full-bleed art (the Home wall, the Projects tile band)
 * stays edge to edge.
 *
 * Built on `geometry.ts` (U6). One test per page x width x language; light loads in `page`, dark in a
 * second page of the same context and the two measurements must agree within 0.5px. Tests run in
 * parallel (each is independent). Layout is measured with reduced motion (no reveal transforms); the
 * role page's sticky layout needs motion and is measured separately, x only.
 */
import { expect, test, type Page } from '@playwright/test';
import {
  PAGES,
  THEMES,
  WIDTHS,
  boxes,
  centreLines,
  colAt,
  expectCentred,
  expectEqualHeights,
  expectFourSides,
  expectOnColumn,
  gotoThemed,
  type Box,
  type Theme,
} from './geometry';

test.describe.configure({ mode: 'parallel' });

type Sig = [string, ...number[]];

/** Vietnamese widths: the shared pair (1440, 390) plus 1024, where the 692px column makes VI labels tightest. */
const VI_ALIGN_WIDTHS = [1440, 1024, 390] as const;

/** Local-nav bars per page kind (the Home and 404 pages have none). */
const LOCAL_NAV: Record<string, number> = {
  Home: 0,
  Experiences: 1,
  role: 1,
  Projects: 1,
  project: 1,
  'In practice': 1,
  story: 1,
  Blog: 1,
  post: 1,
  Skills: 1,
  '404': 0,
};

/**
 * The fewest `.section-inner`, `.container-wide` and `.chapter-grid` boxes a page has (counted in the
 * built pages), so a selector that stops matching turns a test red. 0 = the page uses none.
 */
const CONTAINERS: Record<string, number> = {
  Home: 2,
  Experiences: 2,
  role: 1,
  Projects: 0, // its one .section-inner is a hidden empty band
  project: 9,
  'In practice': 0,
  story: 1,
  Blog: 1,
  // owner, blog-like-experiences: post 0 -> 1 (the closing grey band of cards has one .section-inner)
  post: 1,
  Skills: 1,
  '404': 0,
};

const round = (n: number) => Math.round(n * 100) / 100;
const rectSig = (name: string, list: readonly Box[], use: 'border' | 'content' = 'border') =>
  list.map((b): Sig => {
    const r = use === 'content' ? b.content : b.border;
    return [name, round(r.left), round(r.right)];
  });

/** Chrome, containers and the nav's own geometry: the checks every page type shares. */
async function checkChrome(page: Page, kind: string, width: number, where: string): Promise<Sig[]> {
  const sigs: Sig[] = [];
  const [colL, colR] = colAt(width);

  // Nav bar and footer row: content boxes on the column (the bar's padding is 0 now, but its content
  // box is the claim, not the border box).
  const nav = await boxes(page, 'header[data-nav] .bar');
  expectOnColumn(nav, width, `${where} nav bar`, { use: 'content' });
  sigs.push(...rectSig('nav', nav, 'content'));
  const foot = await boxes(page, '.site-footer > .chrome-row');
  expectOnColumn(foot, width, `${where} footer row`, { use: 'content' });
  sigs.push(...rectSig('footer', foot, 'content'));

  // Local nav: the expected number of bars, each on the column.
  const local = await boxes(page, '.local-nav .bar', { allowEmpty: LOCAL_NAV[kind] === 0 });
  expect(local, `${where} local nav bars`).toHaveLength(LOCAL_NAV[kind]);
  if (local.length) {
    expectOnColumn(local, width, `${where} local nav bar`, { use: 'content' });
    sigs.push(...rectSig('local', local, 'content'));
  }

  // Every container's content box: the column (a wide box's padding inset puts its content there).
  const min = CONTAINERS[kind];
  const containers = await boxes(page, '.section-inner, .container-wide, .chapter-grid', {
    allowEmpty: min === 0,
  });
  expect(containers.length, `${where} containers`).toBeGreaterThanOrEqual(min);
  if (containers.length) {
    expectOnColumn(containers, width, `${where} containers`, { use: 'content' });
    sigs.push(...rectSig('containers', containers, 'content'));
  }

  // Nav icons: every visible svg sits at the centre of its button.
  const icons = await page.evaluate(() =>
    [...document.querySelectorAll('header[data-nav] .icon-btn')].flatMap((btn) =>
      [...btn.querySelectorAll('svg')]
        .map((svg) => ({ svg: svg.getBoundingClientRect(), btn: btn.getBoundingClientRect() }))
        .filter((m) => m.svg.width > 0 && m.svg.height > 0)
        .map((m) => ({
          dx: m.svg.left + m.svg.width / 2 - (m.btn.left + m.btn.width / 2),
          dy: m.svg.top + m.svg.height / 2 - (m.btn.top + m.btn.height / 2),
        })),
    ),
  );
  expect(icons.length, `${where} nav icons`).toBeGreaterThan(0);
  for (const i of icons) {
    expect(Math.abs(i.dx), `${where} nav icon dx`).toBeLessThanOrEqual(0.5);
    expect(Math.abs(i.dy), `${where} nav icon dy`).toBeLessThanOrEqual(0.5);
  }

  // Compact nav: the menu lines end on the column.
  if (width <= 833) {
    const line = await boxes(page, 'header[data-nav] .menu-btn .line');
    expect(line, `${where} menu lines`).toHaveLength(2);
    for (const l of line) {
      expect(Math.abs(l.border.right - colR), `${where} menu line right`).toBeLessThanOrEqual(0.5);
    }
    sigs.push(...rectSig('menu-lines', line));
  } else if (LOCAL_NAV[kind] > 0) {
    // The keyline under the local nav starts and ends at the column's margins at rest.
    const key = await page.evaluate(() => {
      const nav = document.querySelector('.local-nav')!;
      const s = getComputedStyle(nav, '::after');
      return { left: parseFloat(s.left), right: parseFloat(s.right), w: nav.clientWidth };
    });
    expect(Math.abs(key.left - colL), `${where} keyline left`).toBeLessThanOrEqual(1);
    expect(Math.abs(key.w - key.right - colR), `${where} keyline right`).toBeLessThanOrEqual(1);
    sigs.push(['keyline', round(key.left), round(key.right)]);
  }
  return sigs;
}

/** Highlight cards (role and project pages): equal heights in a row, top/left/right inset 28 (24 at S). */
async function checkHlCards(page: Page, width: number, where: string): Promise<Sig[]> {
  const cards = await boxes(page, '.hl-card');
  expectFourSides(cards, `${where} hl-card`, { pad: width >= 735 ? 28 : 24, bottom: 'free' });
  if (width >= 735) expectEqualHeights(cards, `${where} hl-card`);
  return cards.map((c): Sig => ['hl-card', round(c.border.left), round(c.border.height)]);
}

/** Checks that belong to one page type. */
async function checkPage(page: Page, kind: string, width: number, where: string): Promise<Sig[]> {
  const sigs: Sig[] = [];
  const [colL, colR] = colAt(width);
  switch (kind) {
    case 'Home': {
      // The photo starts on the column; the pills start on the text's left edge under it from L, on the
      // column under the row below L.
      const pop = await boxes(page, '.w-id .pop');
      expect(Math.abs(pop[0].border.left - colL), `${where} photo left`).toBeLessThanOrEqual(1);
      sigs.push(...rectSig('pop', pop));
      const acts = await boxes(page, '.w-id .actions');
      if (width >= 1069) {
        // owner, photo-tall: was `|pills right - colR| <= 1` (the pills stacked at the right of the
        // text); now the pills sit under the text, on its left edge.
        const text = await boxes(page, '.w-id .w-text');
        expect(
          Math.abs(acts[0].border.left - text[0].border.left),
          `${where} pills left on the text`,
        ).toBeLessThanOrEqual(1);
      } else {
        expect(Math.abs(acts[0].border.left - colL), `${where} pills left`).toBeLessThanOrEqual(1);
      }
      sigs.push(...rectSig('actions', acts));
      // The logo note under Next. starts on the column and ends within it (owner, photo-logos).
      const note = await boxes(page, '#next .logos-note');
      expect(note, `${where} Home logo note`).toHaveLength(1);
      expect(Math.abs(note[0].border.left - colL), `${where} note left`).toBeLessThanOrEqual(1);
      expect(note[0].border.right, `${where} note right`).toBeLessThanOrEqual(colR + 1);
      sigs.push(...rectSig('home-note', note));
      break;
    }
    case 'Experiences': {
      // Group cards (owner, photo-logos: equal heights kept, 180px minimum, content top-aligned,
      // extra height at the bottom): equal top/left/right inset 28 (24 at S) from the card edge,
      // equal heights and >= 180 in a row (a stacked column has no row: S is not compared), the
      // card grid on the column, the logo note on the column's start edge.
      const cards = await boxes(page, '.group-card');
      // lead, techstack: old >= 10 group cards -> + the 4 Tech stack cards (>= 14).
      // owner, techstack-trim: old 4 -> 6 Tech stack cards (>= 16).
      expect(cards.length, `${where} group cards`).toBeGreaterThanOrEqual(16);
      expectFourSides(cards, `${where} group-card`, {
        pad: width >= 735 ? 28 : 24,
        bottom: 'free',
      });
      if (width >= 735) expectEqualHeights(cards, `${where} group-card`, { min: 180 });
      const grids = await boxes(page, '.group-cards');
      // lead, techstack: old 4 -> 5 grids (Experience, Tech stack, Certifications, Education, Next).
      expect(grids, `${where} group-cards grids`).toHaveLength(5);
      expectOnColumn(grids, width, `${where} group-cards`, { use: 'border' });
      // Tech stack: 2 cards per row from 735, 1 below; the first tool starts on the card's content
      // edge; the first tools of a row's cards share a top; no tool passes the content's right edge.
      const stackCards = await boxes(page, '#stack .group-card');
      // owner, techstack-trim: old 4 -> 6 role cards.
      expect(stackCards, `${where} stack cards`).toHaveLength(6);
      const perRow = stackCards.filter(
        (c) => Math.abs(c.border.top - stackCards[0].border.top) < 1,
      );
      expect(perRow.length, `${where} stack cards per row`).toBe(width >= 735 ? 2 : 1);
      const tools = await page.evaluate(() =>
        Array.from(document.querySelectorAll('#stack .group-card')).map((card) => {
          const cs = getComputedStyle(card);
          const r = card.getBoundingClientRect();
          return {
            left: r.left + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth),
            right: r.right - parseFloat(cs.paddingRight) - parseFloat(cs.borderRightWidth),
            tools: Array.from(card.querySelectorAll('.group-card__tool')).map((li) => {
              const b = li.getBoundingClientRect();
              return { left: b.left, top: b.top, right: b.right };
            }),
          };
        }),
      );
      tools.forEach((c, i) => {
        expect(
          Math.abs(c.tools[0].left - c.left),
          `${where} stack ${i} first tool left`,
        ).toBeLessThanOrEqual(1);
        for (const tl of c.tools)
          expect(tl.right, `${where} stack ${i} tool right`).toBeLessThanOrEqual(c.right + 1);
      });
      // Inside a card the tools fill down the columns (two from 735 at L, 1 at M and S where the
      // 280px content has no room for a second 176px column; lead, techstack, ui round 1): the
      // lefts are the card's content edge and one column pitch, each column's tops step by one row
      // pitch, the second column starts level with the first and is the shorter (owner, techstack-trim: n = 4 -> 2 + 2, 3 -> 2 + 1).
      const colsWanted = width >= 1069 ? 2 : 1;
      const pitches: number[] = [];
      const rowSteps: number[] = [];
      tools.forEach((c, i) => {
        const lefts = [...new Set(c.tools.map((t) => Math.round(t.left)))].sort((x, y) => x - y);
        expect(lefts.length, `${where} stack ${i} columns`).toBe(
          Math.min(colsWanted, c.tools.length),
        );
        const cols = lefts.map((l) => c.tools.filter((t) => Math.abs(t.left - l) <= 1));
        expect(
          cols.reduce((n, col) => n + col.length, 0),
          `${where} stack ${i} every tool is in a column`,
        ).toBe(c.tools.length);
        // Balanced: the first column holds ceil(n / columns), the next the rest.
        expect(cols[0].length, `${where} stack ${i} first column`).toBe(
          Math.ceil(c.tools.length / cols.length),
        );
        // Filled down the columns, in DOM order: the first column is the first tools, not every other one.
        c.tools.forEach((t, k) => {
          const col = Math.floor(k / cols[0].length);
          expect(
            Math.abs(t.left - lefts[col]),
            `${where} stack ${i} tool ${k} is in column ${col} (column flow)`,
          ).toBeLessThanOrEqual(1);
        });
        for (const col of cols) {
          expect(
            Math.abs(col[0].top - cols[0][0].top),
            `${where} stack ${i} columns start level`,
          ).toBeLessThanOrEqual(1);
          col.slice(1).forEach((t, k) => rowSteps.push(t.top - col[k].top));
        }
        if (cols.length > 1) pitches.push(cols[1][0].left - cols[0][0].left);
      });
      // One row pitch for every tool in every card, one column pitch across the cards.
      for (const st of rowSteps)
        expect(Math.abs(st - rowSteps[0]), `${where} stack row pitch`).toBeLessThanOrEqual(1);
      for (const pt of pitches)
        expect(Math.abs(pt - pitches[0]), `${where} stack column pitch`).toBeLessThanOrEqual(1);
      // techstack-trim: the Orchestration card has one tool, so only the cards with more than one
      // tool have a second column (old 4 -> 5 of 6).
      const multi = tools.filter((c) => c.tools.length > 1).length;
      expect(multi, `${where} stack cards with more than one tool`).toBe(5);
      expect(pitches.length, `${where} stack cards with two columns`).toBe(
        colsWanted === 2 ? multi : 0,
      );
      sigs.push(
        ...tools.flatMap((c, i): Sig[] =>
          c.tools.map((t, k): Sig => [`stack-tool-${i}-${k}`, round(t.left), round(t.top)]),
        ),
      );
      // techstack-trim: at every width (320 and 390 too) every role heading is one line (the names are the owner's: a wrap
      // is a finding, not something to loosen).
      const h3s = await page.evaluate(() =>
        Array.from(document.querySelectorAll('#stack .group-card h3')).map((h) => ({
          text: h.textContent!.trim(),
          height: h.getBoundingClientRect().height,
          line: parseFloat(getComputedStyle(h).lineHeight) || 0,
        })),
      );
      for (const h of h3s)
        expect(
          h.height,
          `${where} H3 "${h.text}" at ${width} is one line (height ${h.height})`,
        ).toBeLessThanOrEqual(1.5 * h.line);
      if (width >= 735)
        for (let i = 0; i + 1 < tools.length; i += 2)
          expect(
            Math.abs(tools[i].tools[0].top - tools[i + 1].tools[0].top),
            `${where} stack row ${i / 2} first tools share a top`,
          ).toBeLessThanOrEqual(1);
      const note = await boxes(page, '.logos-note');
      expect(note, `${where} logo note`).toHaveLength(1);
      expectOnColumn(note, width, `${where} logo note`);
      sigs.push(
        ...cards.map((c): Sig => ['group-card', round(c.border.left), round(c.border.height)]),
        ...rectSig('group-cards', grids),
        ...rectSig('logo-note', note),
      );

      // Contact box (owner, photo-logos, RC7): the box IS the column, equal padding on four sides
      // (40 at L, 32 at M, 24 at S). Its last link is a 44px padded target pulled into the box's
      // bottom padding (margin -12px), so the TEXT, not the target's padding, sits 40/32/24 above
      // the edge, as the h2 sits below the top edge.
      const box = await boxes(page, '.contact-box');
      expectOnColumn(box, width, `${where} contact box`);
      expectFourSides(box, `${where} contact box`, {
        pad: width >= 1069 ? 40 : width >= 735 ? 32 : 24,
      });
      sigs.push(...rectSig('contact-box', box));
      const link = await page.evaluate(() => {
        const a = document.querySelector('.contact-lines li:last-child a')!;
        const r = a.getBoundingClientRect();
        const cs = getComputedStyle(a);
        const bx = document.querySelector('.contact-box')!.getBoundingClientRect();
        const bs = getComputedStyle(document.querySelector('.contact-box')!);
        return {
          textBottomGap: bx.bottom - (r.bottom - parseFloat(cs.paddingBottom)),
          pad: parseFloat(bs.paddingBottom),
          target: r.height,
        };
      });
      expect(
        Math.abs(link.textBottomGap - link.pad),
        `${where} last link text sits ${link.pad} above the box edge`,
      ).toBeLessThanOrEqual(1);
      expect(link.target, `${where} last link keeps a 44px target`).toBeGreaterThanOrEqual(44);
      break;
    }
    case 'role': {
      const cards = await boxes(page, '.hl-cards');
      expectOnColumn(cards, width, `${where} hl-cards`);
      sigs.push(...rectSig('hl-cards', cards));
      sigs.push(...(await checkHlCards(page, width, where)));
      break;
    }
    case 'project': {
      const cards = await boxes(page, '.hl-cards');
      expectOnColumn(cards, width, `${where} hl-cards`);
      sigs.push(...rectSig('hl-cards', cards));
      sigs.push(...(await checkHlCards(page, width, where)));
      const closer = await boxes(page, '#result-look.closer');
      expectOnColumn(closer, width, `${where} closer`);
      sigs.push(...rectSig('closer', closer));
      // The device frame and the big strip sit on the column (owner, photo-logos, RC2); the laptop
      // base spans the frame (its negative margin is the frame's padding); the terminal is a fixed
      // monospace measure, centred on the column.
      const device = await boxes(page, '.device');
      expectOnColumn(device, width, `${where} device`);
      sigs.push(...rectSig('device', device));
      const base = await page.evaluate(() => {
        const d = document.querySelector('.device')!;
        return {
          margin: parseFloat(getComputedStyle(d, '::after').marginLeft),
          pad: parseFloat(getComputedStyle(d).paddingLeft),
        };
      });
      expect(
        Math.abs(base.margin + base.pad),
        `${where} device base margin vs padding`,
      ).toBeLessThanOrEqual(0.5);
      const strip = await boxes(page, '.stat-strip--big');
      expectOnColumn(strip, width, `${where} big strip`);
      sigs.push(...rectSig('strip', strip));
      const term = await boxes(page, '.term');
      expectOnColumn(term, width, `${where} terminal`, { mode: 'centre' });
      sigs.push(...rectSig('term', term));
      break;
    }
    case 'In practice': {
      // Desk teasers (RC8): equal padding on four sides (32 at L, 24 below) and the same split, so
      // the lead's and the lone tile's text and media start at the same x.
      const teasers = await boxes(page, '.story-teaser');
      expectFourSides(teasers, `${where} story teasers`, { pad: width >= 1069 ? 32 : 24 });
      sigs.push(...rectSig('teaser', teasers));
      if (width >= 735) {
        const lead = (a: string) => `.story-teaser--lead ${a}`;
        const lone = (a: string) => `.desk-tiles > li:only-child ${a}`;
        for (const part of ['.teaser-text', '.teaser-media']) {
          const a = (await boxes(page, lead(part)))[0].border.left;
          const b = (await boxes(page, lone(part)))[0].border.left;
          expect(
            Math.abs(a - b),
            `${where} lead ${part} left ${a} vs lone tile ${b}`,
          ).toBeLessThanOrEqual(1);
          sigs.push(['teaser-split', round(a), round(b)]);
        }
      }
      break;
    }
    case 'Blog': {
      // owner, blog-like-experiences: lead card pad 32 / 24 -> the Experiences group-card shell (pad
      // 28, 24 at S, bottom free, equal heights >= 180 in a row), grids on the column (Latest. and
      // More posts.).
      const cards = await boxes(page, '.group-card');
      expect(cards, `${where} post cards`).toHaveLength(6);
      expectFourSides(cards, `${where} post card`, {
        pad: width >= 735 ? 28 : 24,
        bottom: 'free',
      });
      if (width >= 735) expectEqualHeights(cards, `${where} post card`, { min: 180 });
      const grids = await boxes(page, '.group-cards');
      expect(grids, `${where} post grids`).toHaveLength(2);
      expectOnColumn(grids, width, `${where} post grids`, { use: 'border' });
      sigs.push(...rectSig('post-card', cards));
      break;
    }
    case 'post': {
      // Callouts: 20px from the border edge on every side (4px border + 16px padding at the start),
      // the icon's centre on the title's first line (±0.5: the old 2px offset was 0.6 off).
      const callouts = await boxes(page, '.callout');
      expectFourSides(callouts, `${where} callout`, { pad: 20 });
      sigs.push(...rectSig('callout', callouts));
      const lines = await centreLines(page, '.callout-icon', '.callout-title');
      expectCentred(lines, `${where} callout icon`, 0.5);
      sigs.push(...lines.map((l): Sig => ['callout-dy', round(l.dy), round(l.dy)]));
      // owner, blog-like-experiences: the closing band's cards use the Experiences card shell (pad 28,
      // 24 at S, bottom free).
      const more = await boxes(page, '#more-reading .group-card');
      expectFourSides(more, `${where} closing card`, {
        pad: width >= 735 ? 28 : 24,
        bottom: 'free',
      });
      sigs.push(...rectSig('closing-card', more));
      break;
    }
    case 'Projects': {
      const pill = await boxes(page, '.local-nav .pill');
      expect(Math.abs(pill[0].border.right - colR), `${where} pill right`).toBeLessThanOrEqual(1);
      sigs.push(...rectSig('pill', pill));
      // The tile band is full bleed; its content is capped to the column.
      const kids = await boxes(page, '.grid-tile > *');
      expectOnColumn(kids, width, `${where} tile content`);
      sigs.push(...rectSig('tile-content', kids));
      break;
    }
    case '404': {
      if (width >= 735) {
        // The site-index groups start on a footer column (the footer's four equal columns).
        const groups = await boxes(page, '.si-group');
        const cols = await boxes(page, '.site-footer .col');
        for (const g of groups) {
          const hit = cols.some((c) => Math.abs(c.border.left - g.border.left) <= 1);
          expect(hit, `${where} ${g.label} left ${g.border.left} is on a footer column`).toBe(true);
        }
        sigs.push(...rectSig('si-group', groups));
      }
      break;
    }
    default:
      break;
  }
  return sigs;
}

function sameWithin(light: Sig[], dark: Sig[], where: string, tol = 0.5) {
  expect(dark.length, `${where} light and dark measure the same boxes`).toBe(light.length);
  light.forEach((l, i) => {
    const d = dark[i];
    expect(d[0], `${where} #${i}`).toBe(l[0]);
    l.slice(1).forEach((v, j) => {
      expect(
        Math.abs((d[j + 1] as number) - (v as number)),
        `${where} ${l[0]} light ${l.slice(1).join('..')} vs dark ${d.slice(1).join('..')}`,
      ).toBeLessThanOrEqual(tol);
    });
  });
}

for (const entry of PAGES) {
  for (const lang of ['en', 'vi'] as const) {
    const path = lang === 'en' ? entry.en : entry.vi;
    if (path === null) continue;
    const widths = lang === 'en' ? WIDTHS : VI_ALIGN_WIDTHS;
    for (const width of widths) {
      test(`${entry.kind} ${lang} @${width}: chrome and content sit on the column, light and dark`, async ({
        page,
      }) => {
        const measured: Record<Theme, Sig[]> = { light: [], dark: [] };
        for (const theme of THEMES) {
          const p = theme === 'light' ? page : await page.context().newPage();
          await gotoThemed(p, path, theme, { width });
          const where = `${entry.kind} ${lang} ${theme}@${width}`;
          measured[theme] = [
            ...(await checkChrome(p, entry.kind, width, where)),
            ...(await checkPage(p, entry.kind, width, where)),
          ];
          if (theme === 'dark') await p.close();
        }
        sameWithin(measured.light, measured.dark, `${entry.kind} ${lang}@${width}`);
      });
    }
  }
}

// ---- Role page, sticky layout --------------------------------------------------------------------

const ROLE = PAGES.find((p) => p.kind === 'role')!;
for (const lang of ['en', 'vi'] as const) {
  test(`role ${lang} @1440 sticky layout: content box, header and cards sit on the column (x only)`, async ({
    page,
  }) => {
    await gotoThemed(page, lang === 'en' ? ROLE.en : ROLE.vi!, 'light', {
      width: 1440,
      motion: 'no-preference',
    });
    expect(
      await page
        .locator('.chapter--sticky .chapter-side')
        .evaluate((e) => getComputedStyle(e).position),
      'the sticky layout is on',
    ).toBe('sticky');
    const grid = await boxes(page, '.chapter-grid');
    expectOnColumn(grid, 1440, `role ${lang} sticky chapter-grid`, { use: 'content' });
    const head = await boxes(page, '.chapter-side .section-header');
    expect(
      Math.abs(head[0].border.left - 230),
      `role ${lang} sticky header left`,
    ).toBeLessThanOrEqual(1);
    const cards = await boxes(page, '.chapter-cards');
    expect(
      Math.abs(cards[0].border.right - 1210),
      `role ${lang} sticky cards right`,
    ).toBeLessThanOrEqual(1);
  });
}

// ---- Blog post: article and TOC rail on the column from 1280 -------------------------------------

// Owner, photo-logos: "blog-post TOC goes ONTO THE COLUMN at >=1280 (its right edge on the nav/footer
// edge; the article starts at the column's left edge on wide screens)". Below 1280 nothing changes: the
// article stays centred in its own track, the rail is the in-article <details>, and nothing scrolls
// sideways.
const POST = PAGES.find((p) => p.kind === 'post')!;
for (const lang of ['en', 'vi'] as const)
  for (const theme of THEMES)
    for (const width of [1440, 1280, 1279, 1024, 390]) {
      test(`post ${lang} ${theme} @${width}: ${width >= 1280 ? 'article and TOC rail end on the column' : 'article stays centred, no rail'}`, async ({
        page,
      }) => {
        await gotoThemed(page, lang === 'en' ? POST.en : POST.vi!, theme, { width });
        const where = `post ${lang} ${theme}@${width}`;
        const [colL, colR] = colAt(width);
        const head = (await boxes(page, '.post .head'))[0].border;
        const body = (await boxes(page, '.post .body'))[0].border;
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          `${where} no horizontal scroll`,
        ).toBe(true);
        if (width >= 1280) {
          const toc = (await boxes(page, '.toc-side'))[0].border;
          expect(
            Math.abs(head.left - colL),
            `${where} header left ${head.left}`,
          ).toBeLessThanOrEqual(1);
          expect(Math.abs(body.left - colL), `${where} body left ${body.left}`).toBeLessThanOrEqual(
            1,
          );
          expect(Math.abs(toc.right - colR), `${where} TOC right ${toc.right}`).toBeLessThanOrEqual(
            1,
          );
          expect(toc.left, `${where} TOC clear of the article`).toBeGreaterThan(body.right + 24);
        } else {
          expect(
            await page.locator('.toc-side').evaluate((e) => getComputedStyle(e).display),
            `${where} rail hidden`,
          ).toBe('none');
          for (const [name, r] of [
            ['header', head],
            ['body', body],
          ] as const)
            expect(
              Math.abs((r.left + r.right) / 2 - width / 2),
              `${where} ${name} centred`,
            ).toBeLessThanOrEqual(1);
        }
      });
    }

// ---- Search panel and footer columns -------------------------------------------------------------

for (const width of [1440, 1024, 390] as const) {
  for (const theme of THEMES) {
    test(`the open search panel's row sits on the column at ${width} (${theme})`, async ({
      page,
    }) => {
      await gotoThemed(page, '/', theme, { width });
      await page.keyboard.press('ControlOrMeta+k');
      await expect(page.locator('#search-dialog .inner')).toBeVisible();
      const inner = await boxes(page, '#search-dialog .inner.chrome-row');
      expectOnColumn(inner, width, `search panel ${theme}@${width}`, { use: 'content' });
    });
  }
}

for (const lang of ['en', 'vi'] as const) {
  test(`footer columns at 1024 (${lang}): first column on the column, equal pitch, one-line titles`, async ({
    page,
  }) => {
    await gotoThemed(page, lang === 'en' ? '/projects/' : '/vi/projects/', 'light', {
      width: 1024,
    });
    const [colL, colR] = colAt(1024);
    const cols = await boxes(page, '.site-footer .col');
    expect(cols, 'four footer columns').toHaveLength(4);
    expect(Math.abs(cols[0].border.left - colL), 'first column left').toBeLessThanOrEqual(1);
    const pitch = cols.slice(1).map((c, i) => c.border.left - cols[i].border.left);
    for (const p of pitch) expect(Math.abs(p - pitch[0]), `pitch ${pitch}`).toBeLessThanOrEqual(1);
    expect(cols[3].border.right, 'last column right').toBeLessThanOrEqual(colR + 1);
    const lines = await page.evaluate(() =>
      [...document.querySelectorAll('.site-footer .col-title')].map((t) => {
        const range = document.createRange();
        range.selectNodeContents(t);
        return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
      }),
    );
    expect(lines, 'each column title is one line').toEqual([1, 1, 1, 1]);
  });
}

// ---- Home identity row (owner, photo-tall) -------------------------------------------------------

// "align right .w-text with the Next. path" and "make the photo longer": the text column ends on the
// column's right edge, where .next-path ends; owner, profile-image-full: the photo is the whole photo at its
// own ratio, 288 x 429.1 from 1069, 216 x 321.8 from 735 and 160 x 238.4 below (was 288 x 288, 216 x 216 and
// 192 x 160), on the column's left edge, its bottom on the pills' bottom at L (was centred on the text and pills).
// owner, photo-align-cutout: "align my photo equal with intro": the photo is the cut-out and its frame is as
// tall as the intro beside it from M: L top = text top and bottom = pills bottom, M top and bottom = the
// text's (was 288 x 429.1 and 216 x 321.8, bottom on the pills at L, centred on the text at M). S is
// unchanged, stacked at 160 x 238.4. So POP is the width, and the height is only fixed at S.
const HOME = PAGES.find((p) => p.kind === 'Home')!;
const POP = (w: number): readonly [number, number | null] =>
  w >= 1069 ? [288, null] : w >= 735 ? [216, null] : [160, 238.4];
for (const lang of ['en', 'vi'] as const)
  for (const theme of THEMES)
    for (const width of [1440, 1069, 1024, 390, 320]) {
      test(`home ${lang} ${theme} @${width}: the text ends where Next. ends, the photo is ${POP(width).join(' x ')} and equal with the intro`, async ({
        page,
      }) => {
        await gotoThemed(page, lang === 'en' ? HOME.en : HOME.vi!, theme, { width });
        const where = `home ${lang} ${theme}@${width}`;
        const [colL, colR] = colAt(width);
        const text = (await boxes(page, '#top .w-text'))[0].border;
        const path = (await boxes(page, '#next .next-path'))[0].border;
        expect(
          Math.abs(text.right - colR),
          `${where} .w-text right ${text.right}`,
        ).toBeLessThanOrEqual(1);
        expect(
          Math.abs(path.right - colR),
          `${where} .next-path right ${path.right}`,
        ).toBeLessThanOrEqual(1);
        expect(Math.abs(text.right - path.right), `${where} text vs next-path`).toBeLessThanOrEqual(
          1,
        );
        // owner, "straight left": the Next. path starts on the text column's left edge too (S: both on
        // the column's left; M and L: after the photo and its gap).
        expect(
          Math.abs(text.left - path.left),
          `${where} .w-text left ${text.left} vs .next-path left ${path.left}`,
        ).toBeLessThanOrEqual(1);
        const pop = (await boxes(page, '#top .pop'))[0].border;
        const [pw, ph] = POP(width);
        expect(Math.abs(pop.width - pw), `${where} photo width`).toBeLessThanOrEqual(0.5);
        if (ph !== null)
          expect(Math.abs(pop.height - ph), `${where} photo height`).toBeLessThanOrEqual(0.5);
        expect(Math.abs(pop.left - colL), `${where} photo left`).toBeLessThanOrEqual(1);
        // owner, profile-image-full: the image is the whole photo, its box is the frame box.
        const imgEl = await page.locator('#top .pop img').evaluate((e: HTMLImageElement) => {
          const r = e.getBoundingClientRect();
          return {
            l: r.left,
            r: r.right,
            t: r.top,
            b: r.bottom,
            w: r.width,
            h: r.height,
            nW: e.naturalWidth,
            nH: e.naturalHeight,
            fit: getComputedStyle(e).objectFit,
          };
        });
        for (const [k, v] of [
          ['left', [imgEl.l, pop.left]],
          ['right', [imgEl.r, pop.right]],
          ['top', [imgEl.t, pop.top]],
          ['bottom', [imgEl.b, pop.bottom]],
        ] as const)
          expect(Math.abs(v[0] - v[1]), `${where} image ${k} = frame`).toBeLessThanOrEqual(0.5);
        // owner, photo-align-cutout (was: image box ratio = natural ratio, not cover): the box is the frame's
        // and the picture is drawn `contain` inside it, filling one axis, its bottom on the frame's bottom.
        expect(imgEl.fit, `${where} object-fit`).toBe('contain');
        const k = Math.min(imgEl.w / imgEl.nW, imgEl.h / imgEl.nH);
        expect(imgEl.nW * k, `${where} drawn width inside`).toBeLessThanOrEqual(imgEl.w + 0.5);
        expect(imgEl.nH * k, `${where} drawn height inside`).toBeLessThanOrEqual(imgEl.h + 0.5);
        expect(
          Math.min(Math.abs(imgEl.nW * k - imgEl.w), Math.abs(imgEl.nH * k - imgEl.h)),
          `${where} drawn picture fills one axis`,
        ).toBeLessThanOrEqual(0.5);
        if (width < 735)
          expect(
            Math.abs(pop.width / pop.height - 600 / 894),
            `${where} S ratio`,
          ).toBeLessThanOrEqual(0.005);
        if (width >= 1069) {
          const acts = (await boxes(page, '#top .w-id .actions'))[0].border;
          // owner, profile-image-full: was "photo centred on the text and pills" (within 1px).
          // owner, photo-align-cutout: top on the text's top (was at or above it), bottom on the pills'.
          expect(
            Math.abs(pop.bottom - acts.bottom),
            `${where} photo bottom on the pills bottom`,
          ).toBeLessThanOrEqual(1);
          expect(
            Math.abs(pop.top - text.top),
            `${where} photo top on the text top`,
          ).toBeLessThanOrEqual(1);
        } else if (width >= 735) {
          // owner, photo-align-cutout (was: photo centred on the text): top and bottom are the text's.
          expect(
            Math.abs(pop.top - text.top),
            `${where} photo top on the text top`,
          ).toBeLessThanOrEqual(1);
          expect(
            Math.abs(pop.bottom - text.bottom),
            `${where} photo bottom on the text bottom`,
          ).toBeLessThanOrEqual(1);
        } else {
          const id = (await boxes(page, '#top .w-id'))[0].content;
          expect(Math.abs(pop.top - id.top), `${where} photo top on the row`).toBeLessThanOrEqual(
            1,
          );
        }
      });
    }

// "straight left", round 2: the Next. goals are one column from 735 to 1068 and keep every title word
// whole at 200% text (an inner break would show as a title taller than its words need).
for (const lang of ['en', 'vi'] as const)
  for (const width of [734, 900, 1024, 1068]) {
    test(`home ${lang} @${width}: no goal-title word breaks at 200% text, edges still match`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(lang === 'en' ? HOME.en : HOME.vi!);
      await page.addStyleTag({ content: 'html{font-size:200%!important}' });
      await page.evaluate(() => document.fonts.ready);
      const r = await page.evaluate(() => {
        const out: string[] = [];
        for (const t of document.querySelectorAll('#next .goal-title')) {
          const node = t.firstChild!;
          const text = node.textContent ?? '';
          const range = document.createRange();
          const words = [...text.matchAll(/\S+/g)];
          for (const m of words) {
            range.setStart(node, m.index!);
            range.setEnd(node, m.index! + m[0].length);
            // A whole word is one line box; a word broken inside gives two rects on different lines.
            const tops = new Set([...range.getClientRects()].map((q) => Math.round(q.top)));
            if (tops.size > 1) out.push(m[0]);
          }
        }
        const b = (s: string) => document.querySelector(s)!.getBoundingClientRect();
        return {
          broken: out,
          tl: b('#top .w-text').left,
          pl: b('#next .next-path').left,
          tr: b('#top .w-text').right,
          pr: b('#next .next-path').right,
          sw: document.documentElement.scrollWidth,
          iw: window.innerWidth,
        };
      });
      const where = `home ${lang} @${width}`;
      expect(r.broken, `${where} broken title words`).toEqual([]);
      if (width >= 735) {
        expect(Math.abs(r.tl - r.pl), `${where} left`).toBeLessThanOrEqual(1);
        expect(Math.abs(r.tr - r.pr), `${where} right`).toBeLessThanOrEqual(1);
      }
      expect(r.sw, `${where} scroll`).toBeLessThanOrEqual(r.iw);
    });
  }

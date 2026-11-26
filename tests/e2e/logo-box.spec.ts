/**
 * The mark-box rule on /skills/ (owner, photo-logos: "icons must be properly aligned on all sides";
 * wide marks keep the SAME SQUARE BOX; the planned certification now has the Claude mark too).
 *
 * One rule, written once (spec §4.8 "Mark box"): a mark beside a label is an svg whose border box is
 * the square B = M + 2p (`box-sizing: content-box`, equal padding p, no negative margin; the dark
 * plate IS the box); the glyph is contained and centred in M x M; the box's start edge is the row's
 * start edge, the label starts at B + g, the box centre is the label's first-line centre, and the
 * lines under the label indent by B + g. Contexts: tool row 24 = 20 + 2 x 2, g 8; sub-item 20 =
 * 16 + 2 x 2, g 6; certification row 24 = 20 + 2 x 2, g 8. An empty slot is B x B.
 *
 * Geometry comes from `geometry.ts` (U6). One test per width x language (light loaded in `page`,
 * dark in a second page of the same context; the two must agree within 0.5px), plus ink tests that
 * read real pixels at 3x (`inkBox`).
 */
import { expect, test, type Page } from '@playwright/test';
import {
  THEMES,
  VI_WIDTHS,
  WIDTHS,
  boxes,
  centreLines,
  expectCentred,
  expectFourSides,
  gotoThemed,
  inkBox,
  expectInkCentred,
  type Box,
  type Theme,
} from './geometry';

test.describe.configure({ mode: 'parallel' });

interface Context {
  name: string;
  /** The marks. */
  icon: string;
  /** Marks on /skills/ (EN and VI alike). */
  count: number;
  /** Border box side, glyph side, padding, gap to the label. */
  B: number;
  M: number;
  p: number;
  g: number;
  /** Empty slots (rows without a brand mark) and their side, when the context has them. */
  slot?: string;
  /** The line(s) under the label: how to find where the first one starts. */
  sub?: 'children' | 'text';
}

const CONTEXTS: readonly Context[] = [
  {
    name: 'tool',
    icon: '.tool-name > svg.tool-icon',
    count: 16,
    B: 24,
    M: 20,
    p: 2,
    g: 8,
    slot: '.tool-name > .tool-slot',
    sub: 'children',
  },
  {
    name: 'sub-item',
    icon: '.spec-child > svg.tool-icon--child',
    count: 8,
    B: 20,
    M: 16,
    p: 2,
    g: 6,
    slot: '.spec-child > .tool-slot--child',
  },
  {
    name: 'cert',
    icon: '#certifications .cert-name > svg.cert-logo',
    count: 3,
    B: 24,
    M: 20,
    p: 2,
    g: 8,
    sub: 'text',
  },
];

/** lead, techstack: the Tech stack tool on /experiences/, the same box rule as the /skills/ tool row. */
const STACK: Context = {
  name: 'stack',
  icon: '#stack .group-card__tool > svg.group-card__tool-mark',
  count: 16, // owner: PySpark and Apache Spark are one entry; owner, techstack-trim: old 22 -> 16
  B: 24,
  M: 20,
  p: 2,
  g: 8,
};

interface RowFacts {
  /** The row's (li) left edge, the mark's left edge, where the label's first line starts. */
  rowLeft: number;
  iconLeft: number;
  labelLeft: number;
  /** Where the first line under the label starts (null: this row has none). */
  subLeft: number | null;
  /** Where the credential link starts (certification rows that have one). */
  linkLeft: number | null;
  plate: boolean;
  background: string;
}

/** Per mark: the row edge, the label's first-line start, the sub-line start. One `page.evaluate`. */
async function rowFacts(page: Page, ctx: Context): Promise<RowFacts[]> {
  return page.evaluate(
    ({ icon, sub }) => {
      const firstLineLeft = (root: Element, skip?: Element): number | null => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let t = walker.nextNode(); t; t = walker.nextNode()) {
          if ((skip && skip.contains(t)) || !t.textContent?.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(t);
          const line = Array.from(range.getClientRects()).find((r) => r.width > 0);
          if (line) return line.left;
        }
        return null;
      };
      return Array.from(document.querySelectorAll(icon))
        .filter((el) => el.getBoundingClientRect().width > 0)
        .map((el) => {
          const li = el.closest('li')!;
          const parent = el.parentElement!;
          const subEl = li.querySelector(':scope > .spec-sub');
          let subLeft: number | null = null;
          if (subEl && sub === 'children') {
            const first = subEl.querySelector(':scope > li > :first-child');
            subLeft = first ? first.getBoundingClientRect().left : null;
          } else if (subEl && sub === 'text') {
            subLeft = firstLineLeft(subEl);
          }
          const link = li.querySelector(':scope > a.link-chevron');
          const cs = getComputedStyle(el);
          return {
            rowLeft: li.getBoundingClientRect().left,
            iconLeft: el.getBoundingClientRect().left,
            labelLeft: firstLineLeft(parent, el) ?? NaN,
            subLeft,
            linkLeft: link ? link.getBoundingClientRect().left : null,
            plate: /--plate\b/.test(el.getAttribute('class') ?? ''),
            background: cs.backgroundColor,
          };
        });
    },
    { icon: ctx.icon, sub: ctx.sub ?? null },
  );
}

const near = (a: number, b: number, tol: number, what: string) =>
  expect(Math.abs(a - b), `${what}: ${a} vs ${b}`).toBeLessThanOrEqual(tol);

function sameRects(light: Box[], dark: Box[], where: string) {
  expect(dark.length, where).toBe(light.length);
  dark.forEach((d, i) => {
    for (const k of ['left', 'top', 'width', 'height'] as const) {
      near(d.border[k], light[i].border[k], 0.5, `${where} #${i} ${k}`);
    }
  });
}

async function checkTheme(
  page: Page,
  where: string,
  theme: Theme,
  contexts: readonly Context[] = CONTEXTS,
) {
  const out: Record<string, Box[]> = {};
  for (const ctx of contexts) {
    const at = `${where} ${theme} ${ctx.name}`;
    const marks = await boxes(page, ctx.icon);
    // Counts (a selector that stops matching must not pass on nothing).
    expect(marks, `${at}: mark count`).toHaveLength(ctx.count);
    // The box is the square B, equal padding p on every side.
    for (const m of marks) {
      near(m.border.width, ctx.B, 0.25, `${at} ${m.label} width`);
      near(m.border.height, ctx.B, 0.25, `${at} ${m.label} height`);
    }
    expectFourSides(marks, at, { pad: ctx.p });
    // Centre line: the box centre is the label's first-line centre, gap g to the label.
    const lines = await centreLines(page, ctx.icon, ':scope');
    expect(lines, `${at}: centre lines`).toHaveLength(ctx.count);
    expectCentred(lines, at, 1);
    for (const l of lines) near(l.gap, ctx.g, 0.5, `${at} ${l.label} gap`);
    // Row start edge, label start, sub-line indent.
    const facts = await rowFacts(page, ctx);
    expect(facts, `${at}: row facts`).toHaveLength(ctx.count);
    for (const f of facts) {
      near(f.iconLeft, f.rowLeft, 0.5, `${at} box left vs row left`);
      near(f.labelLeft, f.rowLeft + ctx.B + ctx.g, 0.5, `${at} label start (B + g)`);
      if (f.subLeft !== null) {
        near(f.subLeft, f.labelLeft, 0.5, `${at} sub-line start vs label text`);
      }
      if (f.linkLeft !== null) {
        near(f.linkLeft, f.labelLeft, 0.5, `${at} credential link start vs label text`);
      }
      // Dark plate: plated marks white, the rest transparent (the plate is the box); light: none.
      const want = theme === 'dark' && f.plate ? 'rgb(255, 255, 255)' : 'rgba(0, 0, 0, 0)';
      expect(f.background, `${at} background (plate ${f.plate})`).toBe(want);
    }
    if (ctx.sub) {
      expect(
        facts.filter((f) => f.subLeft !== null).length,
        `${at}: rows with a sub-line`,
      ).toBeGreaterThan(0);
    }
    // Empty slots are B x B.
    if (ctx.slot) {
      const slots = await boxes(page, ctx.slot);
      for (const s of slots) {
        near(s.border.width, ctx.B, 0.25, `${at} slot width`);
        near(s.border.height, ctx.B, 0.25, `${at} slot height`);
      }
    }
    out[ctx.name] = marks;
  }
  return out;
}

/** Row-relative offsets of the three certification rows (the planned row lines up with the earned). */
async function certOffsets(page: Page) {
  const rows = await centreLines(page, '#certifications .cert-name > svg.cert-logo', ':scope');
  expect(rows).toHaveLength(3);
  return rows;
}

for (const [lang, path, widths] of [
  ['EN', '/skills/', WIDTHS],
  ['VI', '/vi/skills/', VI_WIDTHS],
] as const) {
  for (const width of widths) {
    test(`mark boxes on ${path} at ${width} (light and dark)`, async ({ page }) => {
      const where = `${lang} ${width}`;
      await gotoThemed(page, path, 'light', { width });
      const light = await checkTheme(page, where, 'light');
      const offsets = await certOffsets(page);
      // The planned row (the last) sits exactly where the earned rows do: same mark offset and
      // same label offset from the row top (it used to sit 22px high).
      for (const row of offsets.slice(1)) {
        near(row.iconTop, offsets[0].iconTop, 0.5, `${where} cert mark top from row top`);
        near(row.labelTop, offsets[0].labelTop, 0.5, `${where} cert label top from row top`);
      }

      const dark = await page.context().newPage();
      await gotoThemed(dark, path, 'dark', { width });
      const night = await checkTheme(dark, where, 'dark');
      // The plate is the box: the rects equal the light ones, nothing shifts with the theme.
      for (const ctx of CONTEXTS)
        sameRects(light[ctx.name], night[ctx.name], `${where} ${ctx.name}`);
      await dark.close();
    });
  }
}

// ---- /experiences/ Tech stack tools (lead, techstack) -----------------------------------------------
for (const [lang, path, widths] of [
  ['EN', '/experiences/', WIDTHS],
  ['VI', '/vi/experiences/', VI_WIDTHS],
] as const) {
  for (const width of widths) {
    test(`Tech stack mark boxes on ${path} at ${width} (light and dark)`, async ({ page }) => {
      const where = `${lang} ${width}`;
      await gotoThemed(page, path, 'light', { width });
      const light = await checkTheme(page, where, 'light', [STACK]);
      const dark = await page.context().newPage();
      await gotoThemed(dark, path, 'dark', { width });
      const night = await checkTheme(dark, where, 'dark', [STACK]);
      sameRects(light[STACK.name], night[STACK.name], `${where} ${STACK.name}`);
      // Exactly the 7 plated marks carry the plate (the dark white box). owner, techstack-trim: old 12 -> 7.
      const plated = await dark
        .locator(STACK.icon)
        .evaluateAll(
          (els) => els.filter((e) => /--plate\b/.test(e.getAttribute('class') ?? '')).length,
        );
      expect(plated, `${where}: plated marks`).toBe(7);
      await dark.close();
    });
  }
}

test.describe('the planned certification', () => {
  for (const [lang, path] of [
    ['EN', '/skills/'],
    ['VI', '/vi/skills/'],
  ] as const) {
    for (const theme of THEMES) {
      test(`shows the Claude mark on its own row, aligned with the earned rows (${lang}, ${theme})`, async ({
        page,
      }) => {
        await gotoThemed(page, path, theme, { width: 1440 });
        const planned = page.locator('#certifications [data-planned] svg.cert-logo');
        await expect(planned).toHaveCount(1);
        await expect(planned).toHaveAttribute('data-icon', 'logos:claude-icon');
        await expect(planned).toHaveAttribute('aria-hidden', 'true');
        // Its box is the earned rows' box, level with them (one row in the three-column grid).
        const marks = await boxes(page, '#certifications svg.cert-logo');
        expect(marks).toHaveLength(3);
        const plannedBox = marks[marks.length - 1];
        for (const m of marks.slice(0, -1)) {
          near(m.border.width, plannedBox.border.width, 0.25, 'width');
          near(m.border.height, plannedBox.border.height, 0.25, 'height');
        }
        // The Claude mark needs no plate in either theme (5.4:1 on the dark surface).
        await expect(planned).not.toHaveClass(/cert-logo--plate/);
        expect(await planned.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(
          'rgba(0, 0, 0, 0)',
        );
      });
    }
  }
});

/**
 * Ink is read from an isolated CLONE of the mark on a whole pixel (fixed at 200, 200, margin 0).
 * The live marks sit at fractional positions (grid columns at x 474.2 / 727.5, the 0.5px first-line
 * margin), and the engines snap a painted box to whole pixels while `getBoundingClientRect` keeps the
 * fraction: that alone moves the ink margins up to 0.5px each way, so a centred glyph can read
 * |l - r| = 1.0 against a layout rect. The clone keeps the classes (so the scoped CSS, the plate and
 * the box rule still apply) and the `<use>` of the same symbol; where the live box sits is pinned by
 * the geometry tests above, so this measures only what the glyph does inside its box.
 */
async function inkOfClone(page: Page, selector: string, nth: number, backing = false) {
  await page.evaluate(
    ({ selector, nth, backing }) => {
      document.getElementById('ink-probe')?.remove();
      document.getElementById('ink-backing')?.remove();
      if (backing) {
        // A page-coloured square behind the clone, for a mark with no plate of its own: the
        // reference pixel must be the page, not whatever art sits at (200, 200) (the Home wall).
        const back = document.createElement('div');
        back.id = 'ink-backing';
        back.setAttribute(
          'style',
          'position:fixed;left:180px;top:180px;width:80px;height:80px;z-index:98;background:var(--bg)',
        );
        document.body.appendChild(back);
      }
      const live = document.querySelectorAll(selector)[nth];
      const clone = live.cloneNode(true) as SVGElement;
      clone.id = 'ink-probe';
      clone.setAttribute('style', 'position:fixed;left:200px;top:200px;margin:0;z-index:99');
      document.body.appendChild(clone);
    },
    { selector, nth, backing },
  );
  try {
    return await inkBox(page, '#ink-probe');
  } finally {
    await page.evaluate(() => {
      document.getElementById('ink-probe')?.remove();
      document.getElementById('ink-backing')?.remove();
    });
  }
}

test.describe('ink is centred in every mark box (3x pixels)', () => {
  test.use({ deviceScaleFactor: 3 });

  for (const theme of THEMES) {
    for (const ctx of CONTEXTS) {
      test(`${ctx.name} marks, ${theme}, 1440 EN`, async ({ page }) => {
        await gotoThemed(page, '/skills/', theme, { width: 1440 });
        const count = await page.locator(ctx.icon).count();
        expect(count).toBe(ctx.count);
        for (let i = 0; i < count; i++) {
          const id = await page.locator(ctx.icon).nth(i).getAttribute('data-icon');
          const ink = await inkOfClone(page, ctx.icon, i);
          expect(ink, `${id} box`).toMatchObject({ w: ctx.B, h: ctx.B });
          expectInkCentred(ink, `${ctx.name} #${i} ${id} (${theme})`, { p: ctx.p, M: ctx.M });
        }
      });
    }
  }
});

// ---- /experiences/ certificate cards and the Next. step (photo-logos U4) ---------------------------
//
// A mark ABOVE a label (the cards) is an M x M = 32 box on the label's start edge, 12px above the
// eyebrow, its plate drawn outside as a 4px ring (CompanyLogo's, the existing "no shadows"
// exception), so ink stays on the eyebrow edge and a plated mark's footprint is the same 4px as the
// FPT image's. A mark BESIDE a label (the Next. step) follows the same box rule as /skills/ (24 =
// 20 + 2 x 2, gap 8, centred on the name's first line) with its box on the date line's start edge.

// owner, next-card: the Next. group's planned Claude card is a card mark too (old: Certifications only).
const CARD = '#certifications svg.group-card__logo, #next svg.group-card__logo';
const STEP = '#next [data-next-step] svg.next-step__logo';

interface CardFacts {
  icon: string | null;
  plate: boolean;
  /** Mark left minus the eyebrow's left; eyebrow top minus mark bottom. */
  dLeft: number;
  gap: number;
  background: string;
  ring: string;
}

async function cardFacts(page: Page): Promise<CardFacts[]> {
  return page.evaluate((sel) => {
    return Array.from(document.querySelectorAll(sel)).map((el) => {
      const r = el.getBoundingClientRect();
      const eyebrow = el.closest('.group-card')!.querySelector('.group-card__eyebrow')!;
      const range = document.createRange();
      range.selectNodeContents(eyebrow);
      const line = Array.from(range.getClientRects()).find((x) => x.width > 0)!;
      const cs = getComputedStyle(el);
      return {
        icon: el.getAttribute('data-icon'),
        plate: el.classList.contains('group-card__logo--plate'),
        dLeft: r.left - line.left,
        gap: eyebrow.getBoundingClientRect().top - r.bottom,
        background: cs.backgroundColor,
        ring: cs.boxShadow,
      };
    });
  }, CARD);
}

/** Where the date line's text starts, and the name's first line (for the Next. step). */
async function stepFacts(page: Page) {
  return page.evaluate((sel) => {
    return Array.from(document.querySelectorAll(sel)).map((el) => {
      const step = el.closest('[data-next-step]')!;
      const range = document.createRange();
      range.selectNodeContents(step.querySelector('.next-step__when')!);
      const when = Array.from(range.getClientRects()).find((x) => x.width > 0)!;
      return {
        whenLeft: when.left,
        iconLeft: el.getBoundingClientRect().left,
        plate: el.classList.contains('next-step__logo--plate'),
        background: getComputedStyle(el).backgroundColor,
      };
    });
  }, STEP);
}

for (const [lang, path, widths] of [
  ['EN', '/experiences/', WIDTHS],
  ['VI', '/vi/experiences/', VI_WIDTHS],
] as const) {
  for (const width of widths) {
    test(`certificate card marks on ${path} at ${width}: one 32px box on the eyebrow edge (light and dark)`, async ({
      page,
    }) => {
      const where = `${lang} ${width}`;
      const run = async (p: Page, theme: Theme) => {
        await gotoThemed(p, path, theme, { width });
        const marks = await boxes(p, CARD);
        // owner, claude-card: old 2 -> 3, the planned Claude card has its mark (unplated) too.
        // owner, next-card: Certifications back to 2, plus the Next. group's Claude card = 3.
        expect(marks, `${where} ${theme}: card marks`).toHaveLength(3);
        for (const m of marks) {
          near(m.border.width, 32, 0.25, `${where} ${theme} ${m.label} width`);
          near(m.border.height, 32, 0.25, `${where} ${theme} ${m.label} height`);
        }
        const facts = await cardFacts(p);
        for (const f of facts) {
          near(f.dLeft, 0, 0.5, `${where} ${theme} ${f.icon} left vs eyebrow`);
          near(f.gap, 12, 0.5, `${where} ${theme} ${f.icon} eyebrow gap`);
          // The plate is a white box with a 4px white ring in dark, nothing in light.
          const plated = theme === 'dark' && f.plate;
          expect(f.background, `${where} ${theme} ${f.icon} background`).toBe(
            plated ? 'rgb(255, 255, 255)' : 'rgba(0, 0, 0, 0)',
          );
          if (plated) expect(f.ring).toMatch(/^rgb\(255, 255, 255\) 0px 0px 0px 4px/);
          else expect(f.ring).toBe('none');
        }
        expect(
          facts.filter((f) => f.plate).map((f) => f.icon),
          `${where} ${theme}: plated marks`,
        ).toEqual(['logos:datadog-icon', 'logos:aws']);
        return marks;
      };
      const light = await run(page, 'light');
      const dark = await page.context().newPage();
      const night = await run(dark, 'dark');
      sameRects(light, night, `${where} card marks`);
      await dark.close();
    });
  }
}

// owner, next-card: the step line is Home only now (on /experiences/ it is a card, checked above).
for (const [lang, path, widths] of [
  ['EN', '/', WIDTHS],
  ['VI', '/vi/', VI_WIDTHS],
] as const) {
  for (const width of widths) {
    test(`Next. step mark on ${path} at ${width}: 24px box on the date line's edge, centred on the name (light and dark)`, async ({
      page,
    }) => {
      const where = `${lang} ${path} ${width}`;
      const run = async (p: Page, theme: Theme) => {
        await gotoThemed(p, path, theme, { width });
        const marks = await boxes(p, STEP);
        expect(marks, `${where} ${theme}: step marks`).toHaveLength(1);
        near(marks[0].border.width, 24, 0.25, `${where} ${theme} width`);
        near(marks[0].border.height, 24, 0.25, `${where} ${theme} height`);
        expectFourSides(marks, `${where} ${theme}`, { pad: 2 });
        const lines = await centreLines(p, STEP, ':scope');
        expectCentred(lines, `${where} ${theme}`, 1);
        near(lines[0].gap, 8, 0.5, `${where} ${theme} gap to the name`);
        for (const f of await stepFacts(p)) {
          near(f.iconLeft, f.whenLeft, 0.5, `${where} ${theme} box left vs date line`);
          // The Claude mark needs no plate in either theme.
          expect(f.plate).toBe(false);
          expect(f.background).toBe('rgba(0, 0, 0, 0)');
        }
        return marks;
      };
      const light = await run(page, 'light');
      const dark = await page.context().newPage();
      sameRects(light, await run(dark, 'dark'), `${where} step mark`);
      await dark.close();
    });
  }
}

test.describe('ink is centred in the card marks and the step mark (3x pixels)', () => {
  test.use({ deviceScaleFactor: 3 });

  for (const theme of THEMES) {
    // lead, techstack: every Tech stack tool mark, with the Java and Terraform shifts at 20px.
    test(`Tech stack marks, ${theme}, 1440 EN: centred in the 24px box`, async ({ page }) => {
      await gotoThemed(page, '/experiences/', theme, { width: 1440 });
      const count = await page.locator(STACK.icon).count();
      expect(count).toBe(STACK.count);
      for (let i = 0; i < count; i++) {
        const id = await page.locator(STACK.icon).nth(i).getAttribute('data-icon');
        const ink = await inkOfClone(page, STACK.icon, i, true);
        expect(ink, `${id} box`).toMatchObject({ w: STACK.B, h: STACK.B });
        expectInkCentred(ink, `stack #${i} ${id} (${theme})`, { p: STACK.p, M: STACK.M });
      }
    });

    test(`certificate card marks, ${theme}, 1440 EN: centred in the 32px box, AWS legible on its plate`, async ({
      page,
    }) => {
      await gotoThemed(page, '/experiences/', theme, { width: 1440 });
      const count = await page.locator(CARD).count();
      // owner, claude-card: old 2 -> 3 (the unplated Claude mark is the third).
      // owner, next-card: 3 -> 2 earned in Certifications + the Next. Claude card = 3 (the Claude card is last).
      expect(count).toBe(3);
      for (let i = 0; i < count; i++) {
        const id = await page.locator(CARD).nth(i).getAttribute('data-icon');
        const ink = await inkOfClone(page, CARD, i);
        expect(ink, `${id} box`).toMatchObject({ w: 32, h: 32 });
        // p 0: the card mark has no padding, the glyph fills the 32px box. The ink is read against
        // the pixel at the box's left edge, so AWS on a white plate shows its navy letters (on the
        // black card in dark, unplated, the ring would be the only thing the engine sees).
        expectInkCentred(ink, `card #${i} ${id} (${theme})`, { p: 0, M: 32 });
      }
    });

    for (const path of ['/']) {
      test(`Next. step mark, ${theme}, 1440 ${path}: the Claude glyph is centred in its 24px box`, async ({
        page,
      }) => {
        await gotoThemed(page, path, theme, { width: 1440 });
        const ink = await inkOfClone(page, STEP, 0, true);
        expect(ink).toMatchObject({ w: 24, h: 24 });
        expectInkCentred(ink, `step mark ${path} (${theme})`, { p: 2, M: 20 });
      });
    }
  }
});

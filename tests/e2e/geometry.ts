/**
 * Shared geometry helper for the alignment specs (owner, photo-logos: "properly aligned on all
 * sides"). Not a spec itself (no `.spec`), so Playwright does not collect it; `geometry.spec.ts`
 * is its self-test.
 *
 * Shape: measuring is async (`gotoThemed`, `boxes`, `centreLines`, `inkBox` read the page), but
 * every assertion (`expectFourSides`, `expectEqualHeights`, `expectOnColumn`, `expectCentred`,
 * `expectInkCentred`) is a synchronous function over the measured data. That is what lets the
 * self-test prove each one throws on its defect with `expect(() => fn(...)).toThrow(...)`.
 *
 * Every assertion throws on an empty list, and `boxes` throws on no match unless `allowEmpty`, so a
 * selector that stops matching turns a test red instead of passing on nothing.
 */
import { expect, type Page } from '@playwright/test';

// ---- Constants -----------------------------------------------------------------------------------

/** Viewport widths every page type is measured at (EN). */
export const WIDTHS = [1440, 1024, 390, 320] as const;
/** Viewport widths measured in Vietnamese (only text length differs, so two are enough). */
export const VI_WIDTHS = [1440, 390] as const;
export const THEMES = ['light', 'dark'] as const;

export type Theme = (typeof THEMES)[number];

/** The nav/footer column (`--content`: 980 / 692 / 87.5%) as [left, right] per viewport width. */
export const COLUMN: Record<number, readonly [number, number]> = {
  1440: [230, 1210],
  1024: [166, 858],
  390: [24.375, 365.625],
  320: [20, 300],
};

/** The 11 page types alignment is pinned on. `vi: null` = no Vietnamese twin (not run in VI). */
export const PAGES: readonly { kind: string; en: string; vi: string | null }[] = [
  { kind: 'Home', en: '/', vi: '/vi/' },
  { kind: 'Experiences', en: '/experiences/', vi: '/vi/experiences/' },
  {
    kind: 'role',
    en: '/experiences/fpt-software-senior-data-engineer/',
    vi: '/vi/experiences/fpt-software-senior-data-engineer/',
  },
  { kind: 'Projects', en: '/projects/', vi: '/vi/projects/' },
  {
    kind: 'project',
    en: '/projects/agentic-coding-workflow/',
    vi: '/vi/projects/agentic-coding-workflow/',
  },
  { kind: 'In practice', en: '/star/', vi: '/vi/star/' },
  {
    kind: 'story',
    en: '/star/talend-databricks-migration/',
    vi: '/vi/star/talend-databricks-migration/',
  },
  { kind: 'Blog', en: '/blog/', vi: '/vi/blog/' },
  {
    kind: 'post',
    en: '/blog/neovim-setup-1-zero-to-editor/',
    vi: '/vi/blog/neovim-setup-1-zero-to-editor/',
  },
  { kind: 'Skills', en: '/skills/', vi: '/vi/skills/' },
  { kind: '404', en: '/404.html', vi: null },
];

/**
 * The column as [left, right] at any viewport width: the pinned `COLUMN` entry, else computed from
 * the `--content` rule (980 from 1069, 692 from 735, 87.5% below), centred: `(w - content) / 2`.
 */
export function colAt(width: number): readonly [number, number] {
  const known = COLUMN[width];
  if (known) return known;
  const content = width >= 1069 ? 980 : width >= 735 ? 692 : width * 0.875;
  const left = (width - content) / 2;
  return [left, left + content];
}

// ---- Navigation ----------------------------------------------------------------------------------

export interface GotoOptions {
  width: number;
  height?: number;
  /** `reduce` (default) lays the page out without reveal transforms; `no-preference` is the live page. */
  motion?: 'reduce' | 'no-preference';
  /** Passed to the `html[data-theme]` expectation (default: the expect timeout). */
  timeout?: number;
}

/**
 * Open `path` at one viewport width in one theme and wait until it has settled. The viewport is set
 * BEFORE `goto` (one `goto` per width, never a resize of a loaded page: a resize re-runs layout
 * observers and media queries mid-measurement), then `html[data-theme]`, `document.fonts.ready` and
 * two animation frames (layout after the font swap) are awaited. With `no-preference` the mouse is
 * parked at (0, 0) so no `:hover` transform moves a rect.
 */
export async function gotoThemed(
  page: Page,
  path: string,
  theme: Theme,
  { width, height = 900, motion = 'reduce', timeout }: GotoOptions,
): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: motion });
  await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
  await page.goto(path);
  try {
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme, { timeout });
  } catch (error) {
    throw new Error(
      `gotoThemed: ${path} never set html[data-theme="${theme}"] (is the theme init script gone?)\n${(error as Error).message}`,
    );
  }
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((done) =>
      requestAnimationFrame(() => requestAnimationFrame(() => done())),
    );
  });
  if (motion === 'no-preference') await page.mouse.move(0, 0);
}

// ---- Boxes ---------------------------------------------------------------------------------------

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface Sides {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** One measured element (page coordinates, CSS px). */
export interface Box {
  /** `index:<tag.class> "text"`, for failure messages. */
  label: string;
  /** The border box. */
  border: Rect;
  /** Border edge to content box per side: border width + padding (a 4px border + 16px padding = 20). */
  inset: Sides;
  /** The content box (`border` minus `inset`). */
  content: Rect;
  /**
   * Block axis only: `top` = content box top to the first in-flow content, `bottom` = last in-flow
   * content to the content box bottom (negative = overflow). `null` for replaced elements (svg, img).
   * Horizontal slack is not measured: text lines are ragged and block children always fill.
   */
  slack: { top: number; bottom: number } | null;
}

/**
 * Measure every VISIBLE element matching `selector` (width and height > 0, not `visibility: hidden`)
 * in one `page.evaluate`. Throws when nothing matches, unless `allowEmpty` (then returns `[]`).
 *
 * Slack is measured against the in-flow children's BORDER boxes, not their margin boxes: a first
 * child with `margin-top: 8px` really starts 8px lower than the padding says, and a margin box would
 * hide exactly that (see the self-test's "child margin-top" fixture). One exception per side: where
 * a negative margin cancels that side's padding (`padding-block: 12px; margin-block: 0 -12px`, the
 * padded touch target) the edge is pulled in by `min(padding, -margin)`, so the text reads as flush.
 * In-flow = not `position: absolute|fixed`, not `display: none` or `visibility: hidden` (a hidden
 * child still takes space, so the gap it leaves reads as slack), not zero-size; a `display: contents`
 * child contributes its own children. Text (direct text nodes, and non-replaced `display: inline`
 * children, minus their padding and border, which take no layout space) counts as its LINE boxes
 * (the Range rect widened by the signed half-leading), because a Range rect is only the glyph box
 * and would show ~2px of slack above every line of ordinary text.
 */
export async function boxes(
  page: Page,
  selector: string,
  { allowEmpty = false }: { allowEmpty?: boolean } = {},
): Promise<Box[]> {
  const found = await page.evaluate((sel) => {
    const REPLACED = new Set([
      'img',
      'svg',
      'video',
      'canvas',
      'iframe',
      'object',
      'embed',
      'picture',
      'input',
      'textarea',
      'select',
    ]);
    const px = (v: string) => parseFloat(v) || 0;
    const sx = window.scrollX;
    const sy = window.scrollY;
    const rectOf = (r: DOMRect) => ({
      left: r.left + sx,
      top: r.top + sy,
      right: r.right + sx,
      bottom: r.bottom + sy,
      width: r.width,
      height: r.height,
    });
    /** [top, bottom] spans of the in-flow content of `parent`, in page coordinates. */
    const spans: [number, number][] = [];
    /**
     * `trimTop` / `trimBottom`: vertical padding + border that a rect carries but layout does not
     * (an inline box's rect includes them, its line box does not). The half-leading is signed: a
     * line-height under the glyph box (a tight `72px/1.05`) pulls the line box INSIDE the glyph box.
     */
    const lineSpans = (
      rects: DOMRectList | DOMRect[],
      lineHeight: string,
      trimTop = 0,
      trimBottom = 0,
    ) => {
      const lh = parseFloat(lineHeight); // NaN for `normal`: the content area is the line
      for (const r of Array.from(rects)) {
        if (r.width === 0 && r.height === 0) continue;
        const height = r.height - trimTop - trimBottom;
        const half = Number.isNaN(lh) ? 0 : (lh - height) / 2;
        spans.push([r.top + sy + trimTop - half, r.bottom + sy - trimBottom + half]);
      }
    };
    const collect = (parent: Element) => {
      for (const node of Array.from(parent.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
          if (!node.textContent?.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          lineSpans(range.getClientRects(), getComputedStyle(parent).lineHeight);
          continue;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const child = node as Element;
        const cs = getComputedStyle(child);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        if (cs.position === 'absolute' || cs.position === 'fixed') continue;
        if (cs.display === 'contents') {
          collect(child);
          continue;
        }
        if (cs.display === 'inline' && !REPLACED.has(child.tagName.toLowerCase())) {
          lineSpans(
            child.getClientRects(),
            cs.lineHeight,
            px(cs.paddingTop) + px(cs.borderTopWidth),
            px(cs.paddingBottom) + px(cs.borderBottomWidth),
          );
          continue;
        }
        const r = child.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        // Border box, except where a negative margin cancels padding on that side: the padded
        // touch-target pattern (`padding-block: 12px; margin-block: 0 -12px`) puts its text, not its
        // padding, at the edge, so it reads as flush. A bare negative margin cancels no padding and
        // still reads as overflow; a positive margin-top is never pulled in (it is visible extra
        // padding above the first child).
        const pullTop = Math.max(0, Math.min(px(cs.paddingTop), -px(cs.marginTop)));
        const pullBottom = Math.max(0, Math.min(px(cs.paddingBottom), -px(cs.marginBottom)));
        spans.push([r.top + sy + pullTop, r.bottom + sy - pullBottom]);
      }
    };

    const all = Array.from(document.querySelectorAll(sel));
    const out: unknown[] = [];
    all.forEach((el, i) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0 || cs.visibility === 'hidden') return;
      const border = rectOf(r);
      const inset = {
        top: px(cs.borderTopWidth) + px(cs.paddingTop),
        right: px(cs.borderRightWidth) + px(cs.paddingRight),
        bottom: px(cs.borderBottomWidth) + px(cs.paddingBottom),
        left: px(cs.borderLeftWidth) + px(cs.paddingLeft),
      };
      const content = {
        left: border.left + inset.left,
        top: border.top + inset.top,
        right: border.right - inset.right,
        bottom: border.bottom - inset.bottom,
        width: border.width - inset.left - inset.right,
        height: border.height - inset.top - inset.bottom,
      };
      let slack: { top: number; bottom: number } | null = null;
      if (!REPLACED.has(el.tagName.toLowerCase())) {
        spans.length = 0;
        collect(el);
        if (spans.length === 0) {
          // No in-flow content at all: all of the content box is slack (an empty card is a defect).
          slack = { top: content.height, bottom: content.height };
        } else {
          const top = Math.min(...spans.map((s) => s[0]));
          const bottom = Math.max(...spans.map((s) => s[1]));
          slack = { top: top - content.top, bottom: content.bottom - bottom };
        }
      }
      const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : '';
      const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 24);
      out.push({
        label: `${i}:<${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''}>${text ? ` "${text}"` : ''}`,
        border,
        inset,
        content,
        slack,
      });
    });
    return { total: all.length, visible: out as Box[] };
  }, selector);

  if (found.visible.length === 0 && !allowEmpty) {
    throw new Error(
      `boxes: "${selector}" matched ${found.total} element(s), none visible: a selector that finds nothing would pass every assertion on nothing`,
    );
  }
  return found.visible;
}

// ---- Assertions (all synchronous over measured data) ----------------------------------------------

const n = (v: number) => String(Math.round(v * 100) / 100);

function fail(fn: string, where: string, message: string): never {
  throw new Error(`${fn} [${where}]: ${message}`);
}

function requireNonEmpty(list: readonly unknown[], fn: string, where: string) {
  if (list.length === 0) {
    fail(fn, where, 'empty list: nothing was measured, so nothing can be asserted');
  }
}

/**
 * Four-sides inset check. Per box: top, left and right insets (and bottom when `bottom: 'equal'`) are
 * within `tol` of each other and of `pad` when given; the first in-flow content starts at the
 * padding edge (|top slack| <= tol, i.e. content top-aligned); then
 *  - `equal`: the content ends there too (|bottom slack| <= tol),
 *  - `free`: the box may be taller than its content (equal-height cards), extra height at the
 *    bottom accepted, only overflow fails (bottom slack >= -tol).
 * Slack is skipped for replaced elements (`slack: null`).
 *
 * Stricter than the plan's "slack.top <= tol": a negative top slack (content poking above the
 * padding edge) and a negative bottom slack in `equal` mode (overflow) fail too; they are the same
 * defect seen from the other side.
 */
export function expectFourSides(
  list: readonly Box[],
  where: string,
  {
    pad,
    bottom = 'equal',
    tol = 1,
  }: { pad?: number; bottom?: 'equal' | 'free'; tol?: number } = {},
): void {
  const fnName = 'expectFourSides';
  requireNonEmpty(list, fnName, where);
  for (const box of list) {
    const sides: [string, number][] = [
      ['top', box.inset.top],
      ['left', box.inset.left],
      ['right', box.inset.right],
    ];
    if (bottom === 'equal') sides.push(['bottom', box.inset.bottom]);
    const values = sides.map(([, v]) => v);
    const spread = Math.max(...values) - Math.min(...values);
    const listing = sides.map(([k, v]) => `${k} ${n(v)}`).join(', ');
    if (spread > tol) {
      fail(fnName, where, `${box.label}: insets differ by ${n(spread)} (> ${tol}): ${listing}`);
    }
    if (pad !== undefined) {
      for (const [side, v] of sides) {
        if (Math.abs(v - pad) > tol) {
          fail(
            fnName,
            where,
            `${box.label}: ${side} inset ${n(v)} is not the expected ${pad} (±${tol})`,
          );
        }
      }
    }
    if (!box.slack) continue;
    if (Math.abs(box.slack.top) > tol) {
      fail(
        fnName,
        where,
        `${box.label}: top slack ${n(box.slack.top)} (> ${tol}): content does not start at the padding edge (centred, or a margin/gap above the first child)`,
      );
    }
    if (bottom === 'equal') {
      if (Math.abs(box.slack.bottom) > tol) {
        fail(
          fnName,
          where,
          `${box.label}: bottom slack ${n(box.slack.bottom)} (±${tol} allowed in 'equal' mode): the box is taller than its content, or the content overflows it`,
        );
      }
    } else if (box.slack.bottom < -tol) {
      fail(
        fnName,
        where,
        `${box.label}: bottom slack ${n(box.slack.bottom)} (< -${tol}): the content overflows the box`,
      );
    }
  }
}

/**
 * Equal heights in a row. Boxes are grouped into rows by overlapping vertical extent (a box joins
 * the current row when it starts more than 1px above the row's lowest bottom), so a row whose boxes
 * are centred or end-aligned is still one row. Inside a row the tops and the heights agree within
 * `tol`; with `min`, every box is at least `min - 0.5` tall. Throws when no row holds two boxes (a
 * stacked layout has no row to compare, so the caller must not assert it there).
 */
export function expectEqualHeights(
  list: readonly Box[],
  where: string,
  { min, tol = 1 }: { min?: number; tol?: number } = {},
): void {
  const fnName = 'expectEqualHeights';
  requireNonEmpty(list, fnName, where);
  const sorted = [...list].sort((a, b) => a.border.top - b.border.top);
  const groups: Box[][] = [];
  let groupBottom = -Infinity;
  for (const box of sorted) {
    const group = groups[groups.length - 1];
    if (group && box.border.top < groupBottom - 1) {
      group.push(box);
      groupBottom = Math.max(groupBottom, box.border.bottom);
    } else {
      groups.push([box]);
      groupBottom = box.border.bottom;
    }
  }
  if (!groups.some((g) => g.length >= 2)) {
    fail(
      fnName,
      where,
      `no row holds two boxes (${list.length} box(es), ${groups.length} row(s)): nothing to compare`,
    );
  }
  for (const group of groups) {
    const heights = group.map((b) => b.border.height);
    const spread = Math.max(...heights) - Math.min(...heights);
    if (spread > tol) {
      fail(
        fnName,
        where,
        `row at top ${n(group[0].border.top)}: heights differ by ${n(spread)} (> ${tol}): ${group.map((b) => `${b.label} ${n(b.border.height)}`).join(', ')}`,
      );
    }
    const tops = group.map((b) => b.border.top);
    const offset = Math.max(...tops) - Math.min(...tops);
    if (offset > tol) {
      fail(
        fnName,
        where,
        `row at top ${n(Math.min(...tops))}: tops differ by ${n(offset)} (> ${tol}): ${group.map((b) => `${b.label} ${n(b.border.top)}`).join(', ')}`,
      );
    }
  }
  if (min !== undefined) {
    for (const box of list) {
      if (box.border.height < min - 0.5) {
        fail(
          fnName,
          where,
          `${box.label}: height ${n(box.border.height)} is under the minimum ${min}`,
        );
      }
    }
  }
}

/**
 * Edges against the nav/footer column at viewport `width` (`colAt`). `use` picks the border or the
 * content box. `each`: every box's left and right are the column's; `union`: the leftmost left and
 * rightmost right of the set are; `centre`: each box's centre x is the column's centre.
 */
export function expectOnColumn(
  list: readonly Box[],
  width: number,
  where: string,
  {
    use = 'border',
    mode = 'each',
    tol = 1,
  }: { use?: 'border' | 'content'; mode?: 'each' | 'union' | 'centre'; tol?: number } = {},
): void {
  const fnName = 'expectOnColumn';
  requireNonEmpty(list, fnName, where);
  const [colL, colR] = colAt(width);
  const rects = list.map((b) => ({
    label: b.label,
    rect: use === 'content' ? b.content : b.border,
  }));
  const col = `column ${n(colL)}..${n(colR)} at ${width}`;
  if (mode === 'union') {
    const left = Math.min(...rects.map((r) => r.rect.left));
    const right = Math.max(...rects.map((r) => r.rect.right));
    if (Math.abs(left - colL) > tol || Math.abs(right - colR) > tol) {
      fail(
        fnName,
        where,
        `union of ${list.length} ${use} box(es) spans ${n(left)}..${n(right)}, ${col} (±${tol})`,
      );
    }
    return;
  }
  for (const { label, rect } of rects) {
    if (mode === 'centre') {
      const centre = (rect.left + rect.right) / 2;
      if (Math.abs(centre - (colL + colR) / 2) > tol) {
        fail(
          fnName,
          where,
          `${label}: ${use} centre x ${n(centre)}, ${col} centre ${n((colL + colR) / 2)} (±${tol})`,
        );
      }
    } else if (Math.abs(rect.left - colL) > tol || Math.abs(rect.right - colR) > tol) {
      fail(
        fnName,
        where,
        `${label}: ${use} box spans ${n(rect.left)}..${n(rect.right)}, ${col} (±${tol})`,
      );
    }
  }
}

// ---- Icon / label centre lines -------------------------------------------------------------------

export interface CentreLine {
  label: string;
  /** Icon centre y minus the label's first-line centre y (0 = centred on the first line). */
  dy: number;
  /** First line's left edge minus the icon's right edge. */
  gap: number;
  /** Icon top and first-line top, relative to the row's top. */
  iconTop: number;
  labelTop: number;
  /** The row's top in page coordinates (row = `icon.closest('li, p, div')`). */
  rowTop: number;
}

/**
 * For each visible icon matching `iconSel`: the label is `labelSel` resolved inside the icon's
 * parent (`''` or `':scope'` = the parent itself, for a text node that sits beside the icon). Its
 * first line is the first client rect with width > 0 of a `Range` over the first non-empty text node
 * outside the icon. Throws when no icon matches or a label cannot be resolved.
 */
export async function centreLines(
  page: Page,
  iconSel: string,
  labelSel: string,
): Promise<CentreLine[]> {
  const res = await page.evaluate(
    ({ iconSel, labelSel }) => {
      const sy = window.scrollY;
      const out: unknown[] = [];
      const icons = Array.from(document.querySelectorAll(iconSel)).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
      });
      const errors: string[] = [];
      icons.forEach((icon, i) => {
        const tag = `${i}:<${icon.tagName.toLowerCase()}>`;
        const parent = icon.parentElement;
        const label =
          labelSel === '' || labelSel === ':scope' ? parent : parent?.querySelector(labelSel);
        if (!parent || !label) {
          errors.push(`${tag}: no "${labelSel}" inside the icon's parent`);
          return;
        }
        const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
        let text: Node | null = null;
        for (let t = walker.nextNode(); t; t = walker.nextNode()) {
          if (icon.contains(t) || !t.textContent?.trim()) continue;
          text = t;
          break;
        }
        if (!text) {
          errors.push(`${tag}: the label "${labelSel}" has no text`);
          return;
        }
        const range = document.createRange();
        range.selectNodeContents(text);
        const line = Array.from(range.getClientRects()).find((r) => r.width > 0);
        if (!line) {
          errors.push(`${tag}: the label's first text node has no rendered line`);
          return;
        }
        const ir = icon.getBoundingClientRect();
        const row = (icon.closest('li, p, div') ?? parent).getBoundingClientRect();
        out.push({
          label: `${tag} beside "${(text.textContent ?? '').trim().slice(0, 24)}"`,
          dy: ir.top + ir.height / 2 - (line.top + line.height / 2),
          gap: line.left - ir.right,
          iconTop: ir.top - row.top,
          labelTop: line.top - row.top,
          rowTop: row.top + sy,
        });
      });
      return { total: icons.length, out: out as CentreLine[], errors };
    },
    { iconSel, labelSel },
  );
  if (res.total === 0) {
    throw new Error(`centreLines: no visible icon matches "${iconSel}"`);
  }
  if (res.errors.length > 0) {
    throw new Error(`centreLines: ${res.errors.join('; ')}`);
  }
  return res.out;
}

/** Every icon's centre is within `tol` of its label's first-line centre. */
export function expectCentred(list: readonly CentreLine[], where: string, tol = 1): void {
  requireNonEmpty(list, 'expectCentred', where);
  for (const line of list) {
    if (Math.abs(line.dy) > tol) {
      fail(
        'expectCentred',
        where,
        `${line.label}: icon centre is ${n(line.dy)}px from the first line's centre (> ${tol}); gap ${n(line.gap)}`,
      );
    }
  }
}

// ---- Ink -----------------------------------------------------------------------------------------

export interface Ink {
  /** Ink-free margins between the element's border box and the drawn ink, CSS px. */
  l: number;
  r: number;
  t: number;
  b: number;
  /** Number of ink pixels (device pixels). */
  count: number;
  /** The element's border box, CSS px. */
  w: number;
  h: number;
}

/**
 * Where a mark's ink really is, from pixels (astro-icon svgs are `<symbol>/<use>`, so the DOM cannot
 * say). Needs `devicePixelRatio === 3` (open a context with `deviceScaleFactor: 3`; throws
 * otherwise). Scrolls the element to the viewport centre, screenshots its box in device pixels and
 * decodes the PNG in the page (the engine's own pixels, no decoder here).
 *
 * Reference colour = the pixel 2 device px in from the left edge at mid-height (inside any plate,
 * clear of the corners). Ink = any channel differs from it by more than 48. The four corner squares
 * (side `ceil(radius * 3) + 1` device px) are ignored, so a rounded plate on a different page
 * background is not read as ink. Returned margins are device px / 3, from the element's layout
 * rect: exact for integer-aligned boxes, within about 0.5 CSS px for fractional ones (Chromium
 * snaps painted boxes to CSS pixels, WebKit to device pixels).
 */
export async function inkBox(page: Page, selector: string, nth = 0): Promise<Ink> {
  const dpr = await page.evaluate(() => window.devicePixelRatio);
  if (dpr !== 3) {
    throw new Error(
      `inkBox needs devicePixelRatio 3 (got ${dpr}): open the page in a context with deviceScaleFactor: 3`,
    );
  }
  const target = page.locator(selector);
  const count = await target.count();
  if (nth >= count)
    throw new Error(`inkBox: "${selector}" has ${count} match(es), no index ${nth}`);
  const el = target.nth(nth);
  await el.evaluate((node) => node.scrollIntoView({ block: 'center', inline: 'center' }));
  await page.evaluate(
    () =>
      new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))),
  );
  const rect = await el.evaluate((node) => {
    const r = node.getBoundingClientRect();
    const cs = getComputedStyle(node);
    const radius = Math.max(
      ...[
        cs.borderTopLeftRadius,
        cs.borderTopRightRadius,
        cs.borderBottomLeftRadius,
        cs.borderBottomRightRadius,
      ].map((v) =>
        v.endsWith('%') ? (parseFloat(v) / 100) * Math.min(r.width, r.height) : parseFloat(v) || 0,
      ),
    );
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, radius };
  });
  const x0 = Math.floor(rect.left);
  const y0 = Math.floor(rect.top);
  const clip = {
    x: x0,
    y: y0,
    width: Math.ceil(rect.right) - x0,
    height: Math.ceil(rect.bottom) - y0,
  };
  const png = await page.screenshot({ clip });
  // The box in the screenshot's device pixels (fractional). Chromium paints boxes snapped to CSS
  // pixels and WebKit to device pixels, so the painted edge can sit up to 1.5 device px inside this
  // rect: scanning stops 2 device px short of every edge, and the reference pixel is 2 px in.
  const region = {
    l: (rect.left - x0) * 3,
    t: (rect.top - y0) * 3,
    r: (rect.right - x0) * 3,
    b: (rect.bottom - y0) * 3,
    corner: Math.ceil(rect.radius * 3) + 1,
  };
  const px = await page.evaluate(
    async ({ b64, region }) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const cv = document.createElement('canvas');
      cv.width = bmp.width;
      cv.height = bmp.height;
      const cx = cv.getContext('2d')!;
      cx.drawImage(bmp, 0, 0);
      const d = cx.getImageData(0, 0, bmp.width, bmp.height).data;
      const at = (x: number, y: number) => (y * bmp.width + x) * 4;
      const ref = at(Math.ceil(region.l) + 2, Math.floor((region.t + region.b) / 2));
      let minX = Infinity;
      let maxX = -1;
      let minY = Infinity;
      let maxY = -1;
      let count = 0;
      for (let y = Math.ceil(region.t) + 2; y < Math.floor(region.b) - 2; y++) {
        for (let x = Math.ceil(region.l) + 2; x < Math.floor(region.r) - 2; x++) {
          const inCornerX = x < region.l + region.corner || x >= region.r - region.corner;
          const inCornerY = y < region.t + region.corner || y >= region.b - region.corner;
          if (inCornerX && inCornerY) continue;
          const i = at(x, y);
          const diff = Math.max(
            Math.abs(d[i] - d[ref]),
            Math.abs(d[i + 1] - d[ref + 1]),
            Math.abs(d[i + 2] - d[ref + 2]),
          );
          if (diff <= 48) continue;
          count++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
      return { minX, maxX, minY, maxY, count };
    },
    { b64: png.toString('base64'), region },
  );
  const w = (region.r - region.l) / 3;
  const h = (region.b - region.t) / 3;
  if (px.count === 0) return { l: NaN, r: NaN, t: NaN, b: NaN, count: 0, w, h };
  return {
    l: (px.minX - region.l) / 3,
    r: (region.r - (px.maxX + 1)) / 3,
    t: (px.minY - region.t) / 3,
    b: (region.b - (px.maxY + 1)) / 3,
    count: px.count,
    w,
    h,
  };
}

/**
 * A mark is centred in its box with at least `p` clear on every side: |l - r| and |t - b| within
 * `tol`, each margin >= `p - tol`, the long side of the ink >= `M - 2` (the glyph actually fills its
 * M x M), and more than 20 ink pixels (a blank box, or a mark that failed to load, is not "centred").
 */
export function expectInkCentred(
  ink: Ink,
  where: string,
  { p, M, tol = 1 }: { p: number; M: number; tol?: number },
): void {
  const fnName = 'expectInkCentred';
  if (!(ink.count > 20)) {
    fail(fnName, where, `only ${ink.count} ink pixel(s): the mark is missing or invisible`);
  }
  const margins = `l ${n(ink.l)}, r ${n(ink.r)}, t ${n(ink.t)}, b ${n(ink.b)}`;
  if (Math.abs(ink.l - ink.r) > tol)
    fail(fnName, where, `left/right ink margins differ (> ${tol}): ${margins}`);
  if (Math.abs(ink.t - ink.b) > tol)
    fail(fnName, where, `top/bottom ink margins differ (> ${tol}): ${margins}`);
  for (const [side, v] of [
    ['l', ink.l],
    ['r', ink.r],
    ['t', ink.t],
    ['b', ink.b],
  ] as const) {
    if (v < p - tol)
      fail(
        fnName,
        where,
        `${side} ink margin ${n(v)} is under the padding ${p} (-${tol}): ${margins}`,
      );
  }
  const long = Math.max(ink.w - ink.l - ink.r, ink.h - ink.t - ink.b);
  if (long < M - 2)
    fail(
      fnName,
      where,
      `ink's long side ${n(long)} is under ${M - 2} (M ${M} - 2): the glyph is too small`,
    );
}

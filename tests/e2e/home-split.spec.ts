import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// The Home identity column pins at L only from the height gate up (spec §4.1.2). The gate is read
// from the source, so these tests follow it when it is re-measured.
const SRC = readFileSync('src/components/home/HomeIdentity.astro', 'utf8');
const GATE = Number(/min-height:\s*([\d.]+)em/.exec(SRC)![1]) * 16;
// Offset under the stuck bars: --sticky-h (52px local nav) + 32px.
const STICK_TOP = 84;
// A pinned column keeps this much room: the 84px offset and 16px below its foot.
const ROOM = 100;

const WIDTHS = [1069, 1280, 1440];
// GATE - 1 proves the column stops pinning just below the gate.
const HEIGHTS = [GATE - 1, 768, 800, 900, GATE];
const PATHS = ['/', '/vi/'];
// The wide-font fallback as in reflow.spec.ts, at the default text size.
const FONTS = {
  default: '',
  verdana: ':root{--font-sans:Verdana,"DejaVu Sans",sans-serif!important}',
} as const;

test.use({ reducedMotion: 'no-preference' });

const settle = (page: Page) =>
  page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  });

const open = async (page: Page, path: string, css: string) => {
  await page.goto(path);
  if (css) await page.addStyleTag({ content: css });
  await settle(page);
};

/** Scrolls into the board, then reads the column's state. */
const read = async (page: Page) => {
  await page.evaluate(() => window.scrollTo(0, 1500));
  await settle(page);
  return page.evaluate(() => {
    const top = document.querySelector<HTMLElement>('#top')!;
    const r = top.getBoundingClientRect();
    const actions = top.querySelector('.actions')!.getBoundingClientRect();
    return {
      position: getComputedStyle(top).position,
      top: r.top,
      bottom: r.bottom,
      height: r.height,
      actionsBottom: actions.bottom,
      innerHeight: window.innerHeight,
    };
  });
};

test.describe('Home split: identity column height gate', () => {
  test('measure: tallest #top at L, EN/VI, default and Verdana', async ({ page }) => {
    const heights: string[] = [];
    let max = 0;
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 1200 });
      for (const path of PATHS) {
        for (const [font, css] of Object.entries(FONTS)) {
          await open(page, path, css);
          const h = await page.evaluate(() =>
            Math.ceil(document.querySelector('#top')!.getBoundingClientRect().height),
          );
          heights.push(`${width} ${path} ${font}: ${h}`);
          max = Math.max(max, h);
        }
      }
    }
    test.info().annotations.push(
      { type: 'tallest-top', description: `${max}px` },
      { type: 'heights', description: heights.join('; ') },
      {
        type: 'gate',
        description: `${Math.ceil((max + ROOM) / 16)}em from the measure; source ${GATE / 16}em`,
      },
    );
    // The source gate leaves the column its room.
    expect(max + ROOM).toBeLessThanOrEqual(GATE);
  });

  for (const width of WIDTHS) {
    for (const path of PATHS) {
      for (const [font, css] of Object.entries(FONTS)) {
        test(`fit: ${width} ${path} ${font}`, async ({ page }) => {
          for (const height of HEIGHTS) {
            await page.setViewportSize({ width, height });
            await open(page, path, css);
            const s = await read(page);
            const at = `${width}x${height}`;
            expect(s.position, `${at}: sticky exactly at or above the gate`).toBe(
              height >= GATE ? 'sticky' : 'static',
            );
            if (s.position === 'sticky') {
              expect(Math.abs(s.top - STICK_TOP), `${at}: stuck at 84px`).toBeLessThanOrEqual(1);
              expect(s.height, `${at}: column fits`).toBeLessThanOrEqual(s.innerHeight - ROOM);
              expect(s.bottom, `${at}: foot in view`).toBeLessThanOrEqual(s.innerHeight);
              // The CV and Email pills stay reachable while the column is pinned.
              expect(s.actionsBottom, `${at}: pills in view`).toBeLessThanOrEqual(s.innerHeight);
            } else {
              expect(s.bottom, `${at}: scrolls with the page`).toBeLessThan(0);
            }
          }
        });
      }
    }
  }

  for (const path of PATHS) {
    test(`pins at 1440x900 ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await open(page, path, '');
      const s = await read(page);
      expect(s.position).toBe('sticky');
      expect(Math.abs(s.top - STICK_TOP)).toBeLessThanOrEqual(1);
      expect(s.actionsBottom).toBeLessThanOrEqual(900);
    });
  }
});

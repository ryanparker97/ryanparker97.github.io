// The Home wall's page captures (home-alt-6): real screenshots of the built site's own pages.
//
//   pnpm build && pnpm exec tsx scripts/capture-wall.ts [id ...] && pnpm build
//
// Reads the built dist/ through a static server on a random port (closed before the script exits)
// and writes src/assets/wall/<id>-<lang>-<theme>.png for every shot in src/lib/wall.ts, in EN and
// VI, light and dark. With ids, only those shots are rewritten (4 files each). The second build
// picks up the new pictures. Home is never captured, so the captures never depend on the page that
// shows them. Rerun it by hand when a pictured page changes; `pnpm build` never runs it.
//
// Deterministic by construction: a fresh 1280x800 context per file at DPR 2 (sharp downscales, which
// supersamples the text), reduced motion (the site shows every reveal at once), the theme forced
// through the same localStorage key the site reads, `networkidle`, fonts settled, every image in
// the window decoded. The screenshot keeps the page's own scroll-driven state (no `animations:
// 'disabled'`: that cancels the nav's scroll-timeline rest state and shows its no-support
// fallback); Playwright hides the caret by default. Only the local server is reachable: any other
// request is aborted and fails that file. Each file is checked for the right <html lang> and
// data-theme before it is shot. The output is an opaque RGB PNG with the image
// chunks only (sharp attaches no EXIF/ICC; libvips' pHYs is dropped).
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import {
  WALL_LANGS,
  WALL_SHOTS,
  WALL_SIZE,
  WALL_THEMES,
  wallFile,
  wallHref,
} from '../src/lib/wall';
import type { WallShot } from '../src/lib/wall';
import { imageChunksOnly } from './lib/png';
import { loadSharp, type Sharp } from './lib/sharp';
import { serve } from './static-server';

const OUT = 'src/assets/wall';

/** Scrolls so the anchor's top sits `offset` px below the window top; fails if it is missing. */
async function scrollToAnchor(page: Page, anchor: NonNullable<WallShot['anchor']>) {
  const y = await page.evaluate(
    ({ selector, nth, offset }) => {
      const el = document.querySelectorAll(selector)[nth];
      if (!el) return null;
      const top = Math.max(0, el.getBoundingClientRect().top + scrollY + offset);
      window.scrollTo({ top, behavior: 'instant' });
      return top;
    },
    { selector: anchor.selector, nth: anchor.nth ?? 0, offset: anchor.offset },
  );
  if (y === null) throw new Error(`no match ${anchor.nth ?? 0} for ${anchor.selector}`);
}

/** Waits until the page is still: network idle, fonts loaded, the window's images decoded. */
async function settle(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(
    () =>
      document.fonts.status === 'loaded' &&
      [...document.images]
        .filter((img) => {
          const r = img.getBoundingClientRect();
          return r.width > 0 && r.bottom > 0 && r.top < innerHeight;
        })
        .every((img) => img.complete && img.naturalWidth > 0),
    undefined,
    { timeout: 10_000 },
  );
  // Two frames, then a short pause, so layout and paint have caught up with the scroll.
  await page.evaluate(
    () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))),
  );
  await page.waitForTimeout(300);
}

type Target = { browser: Browser; url: string; sharp: Sharp };

async function shoot({ browser, url, sharp }: Target, shot: WallShot, lang: string, theme: string) {
  const ctx = await browser.newContext({
    viewport: { width: WALL_SIZE.width, height: WALL_SIZE.height },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
    colorScheme: 'light',
  });
  const origin = new URL(url).origin;
  const blocked: string[] = [];
  await ctx.route(
    (u) => u.origin !== origin,
    (route) => {
      blocked.push(route.request().url());
      return route.abort();
    },
  );
  try {
    await ctx.addInitScript((t) => localStorage.setItem('theme', t), theme);
    const page = await ctx.newPage();
    const res = await page.goto(url + wallHref(shot.path, lang), { waitUntil: 'networkidle' });
    if (!res?.ok()) throw new Error(`HTTP ${res?.status()}`);
    const seen = await page.evaluate(() => ({
      theme: document.documentElement.dataset.theme,
      lang: document.documentElement.lang,
    }));
    if (seen.theme !== theme || seen.lang !== lang)
      throw new Error(`page is ${seen.lang}/${seen.theme}, wanted ${lang}/${theme}`);
    await page.evaluate(() => document.fonts.ready);
    if (shot.anchor) await scrollToAnchor(page, shot.anchor);
    await settle(page);
    if (blocked.length) throw new Error(`requests outside ${origin}: ${blocked.join(', ')}`);
    const png = await page.screenshot({ type: 'png' });
    const out = await sharp(png)
      .resize(WALL_SIZE.width, WALL_SIZE.height)
      .flatten({ background: '#ffffff' })
      .png({ compressionLevel: 9 })
      .toBuffer();
    const file = imageChunksOnly(out);
    await writeFile(join(OUT, wallFile(shot.id, lang, theme)), file);
    return file.length;
  } finally {
    await ctx.close();
  }
}

async function main() {
  const only = process.argv.slice(2);
  const unknown = only.filter((id) => !WALL_SHOTS.some((s) => s.id === id));
  if (unknown.length) throw new Error(`unknown shot id: ${unknown.join(', ')}`);
  if (!existsSync('dist/index.html'))
    throw new Error('dist/index.html is missing: run `pnpm build` first');
  const shots = WALL_SHOTS.filter((s) => !only.length || only.includes(s.id));
  await mkdir(OUT, { recursive: true });

  const sharp = await loadSharp();
  let failed = 0;
  const { server, url } = await serve('dist', 0);
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch();
    for (const lang of WALL_LANGS) {
      for (const theme of WALL_THEMES) {
        for (const shot of shots) {
          const name = wallFile(shot.id, lang, theme);
          try {
            const bytes = await shoot({ browser, url, sharp }, shot, lang, theme);
            console.log(`ok   ${name}  ${Math.round(bytes / 1024)} KB`);
          } catch (e) {
            failed++;
            console.log(
              `FAIL ${name}: ${(e instanceof Error ? e.message : String(e)).split('\n')[0]}`,
            );
          }
        }
      }
    }
  } finally {
    await browser?.close();
    await new Promise((ok) => server.close(ok));
  }
  if (failed) throw new Error(`${failed} capture(s) failed`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

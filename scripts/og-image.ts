// Share card (photo-logo): public/og-default.png, 1200x630, white, name + headline and the round
// portrait, set in the site's Inter (600). Composed by Playwright (chromium), re-encoded by sharp.
//
//   pnpm exec tsx scripts/og-image.ts
//
// Reads only the stripped crop src/assets/profile/avatar.jpg, never the original photo. The output
// keeps the PNG image chunks and nothing else (no pHYs, text, time, ICC). It fails rather than write
// a card whose photo or font did not load.
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { readEntry } from './lib/frontmatter';
import { imageChunksOnly } from './lib/png';
import { loadSharp } from './lib/sharp';

const AVATAR = 'src/assets/profile/avatar.jpg';
const OUT = 'public/og-default.png';
const SIZE = { width: 1200, height: 630 };
const PHOTO = 440;

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

async function main() {
  const profile = await readEntry('src/content/profile/en/index.md');
  const name = String(profile.name);
  const headline = String(profile.headline);
  const fontPath = createRequire(import.meta.url).resolve(
    '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  );
  const font = (await readFile(fontPath)).toString('base64');
  const photo = (await readFile(AVATAR)).toString('base64');

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Inter; font-weight: 100 900; src: url(data:font/woff2;base64,${font}) format('woff2'); }
* { box-sizing: border-box; margin: 0; }
body { width: ${SIZE.width}px; height: ${SIZE.height}px; background: #ffffff; padding: 80px;
  display: flex; align-items: center; justify-content: space-between; gap: 64px;
  font-family: Inter, sans-serif; font-weight: 600; }
.text { flex: 1; min-width: 0; }
h1 { font-size: 72px; line-height: 1.08; letter-spacing: -0.02em; color: #1d1d1f; font-weight: 600; }
p { margin-top: 20px; font-size: 40px; line-height: 1.2; color: #515154; font-weight: 600; }
img { width: ${PHOTO}px; height: ${PHOTO}px; border-radius: 50%; object-fit: cover; display: block; flex: none; }
</style></head><body>
<div class="text"><h1>${esc(name)}</h1><p>${esc(headline)}</p></div>
<img src="data:image/jpeg;base64,${photo}" alt="">
</body></html>`;

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: SIZE, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load' });
    const state = await page.evaluate(async () => {
      await document.fonts.ready;
      const img = document.querySelector('img')!;
      await img.decode();
      return {
        naturalWidth: img.naturalWidth,
        font: document.fonts.check('600 72px Inter'),
        loaded: [...document.fonts].some((f) => f.family === 'Inter' && f.status === 'loaded'),
      };
    });
    if (state.naturalWidth === 0) throw new Error('the photo did not load; refusing to write');
    if (!state.font || !state.loaded) throw new Error('Inter did not load; refusing to write');
    const shot = await page.screenshot({ type: 'png' });
    const sharp = await loadSharp();
    const png = await sharp(shot)
      .flatten({ background: '#ffffff' })
      .png({ compressionLevel: 9 })
      .toBuffer();
    const out = imageChunksOnly(png);
    await writeFile(OUT, out);
    console.log(`${OUT}  ${out.length} B`);
  } finally {
    await browser.close();
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

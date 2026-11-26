import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { builtPages } from './pages';

test.skip(({ browserName }) => browserName !== 'chromium', 'reads dist; one browser is enough');

// The CV pages render their own head, not BaseLayout's (no icon links, no og tags).
const NO_BASE_HEAD = new Set(['/cv/', '/vi/cv/']);
const OG = 'https://ryanparker97.github.io/og-default.png';

const all = builtPages();
const scoped = all.filter((p) => p.kind !== 'print' && !NO_BASE_HEAD.has(p.path));
const attr = (tag: string, name: string) =>
  new RegExp(`\\b${name}=["']([^"']*)["']`).exec(tag)?.[1];
const links = (html: string, rel: string) =>
  (html.match(/<link\b[^>]*>/g) ?? []).filter((t) => attr(t, 'rel') === rel);

test('the pages without the BaseLayout head are exactly print pages plus /cv/ and /vi/cv/', () => {
  // /cv/ and /vi/cv/ are redirect stubs, which builtPages() skips; read them from dist directly.
  const stubs = [...NO_BASE_HEAD].map((path) => ({
    path,
    html: readFileSync(join('dist', path, 'index.html'), 'utf8'),
  }));
  const excluded = [...all.filter((p) => !scoped.includes(p)), ...stubs];
  expect(excluded.map((p) => p.path).sort()).toEqual(
    [...all.filter((p) => p.kind === 'print').map((p) => p.path), ...NO_BASE_HEAD].sort(),
  );
  for (const p of excluded) expect(links(p.html, 'icon'), p.path).toHaveLength(0);
  expect(scoped.length).toBeGreaterThan(20);
});

test('every BaseLayout page links both icons and the default share card', () => {
  for (const p of scoped) {
    const icon = links(p.html, 'icon');
    expect(icon, p.path).toHaveLength(1);
    expect([attr(icon[0], 'href'), attr(icon[0], 'type'), attr(icon[0], 'sizes')], p.path).toEqual([
      '/favicon-48.png',
      'image/png',
      '48x48',
    ]);
    const touch = links(p.html, 'apple-touch-icon');
    expect(touch, p.path).toHaveLength(1);
    expect([attr(touch[0], 'href'), attr(touch[0], 'sizes')], p.path).toEqual([
      '/apple-touch-icon.png',
      '180x180',
    ]);
    for (const name of ['og:image', 'twitter:image']) {
      const tag = (p.html.match(/<meta\b[^>]*>/g) ?? []).filter(
        (t) => attr(t, 'property') === name || attr(t, 'name') === name,
      );
      expect(
        tag.map((t) => attr(t, 'content')),
        `${p.path} ${name}`,
      ).toEqual([OG]);
    }
  }
});

test('no built page references favicon.svg', () => {
  expect(all.filter((p) => p.html.includes('favicon.svg')).map((p) => p.path)).toEqual([]);
});

test('icon and card files are served as PNGs of the right size', async ({ request }) => {
  const want = {
    '/favicon-48.png': [48, 48],
    '/apple-touch-icon.png': [180, 180],
    '/og-default.png': [1200, 630],
  };
  for (const [path, size] of Object.entries(want)) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    expect(res.headers()['content-type'], path).toContain('image/png');
    const b = await res.body();
    expect([b.readUInt32BE(16), b.readUInt32BE(20)], path).toEqual(size);
  }
});

test('the share card shows the photo and dark text, not the old gradient', async ({
  page,
  request,
}) => {
  const served = await (await request.get('/og-default.png')).body();
  expect(served.length).toBeGreaterThan(60 * 1024);
  await page.goto('/404.html');
  const r = await page.evaluate(async () => {
    const img = new Image();
    img.src = '/og-default.png';
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const [cr, cg, cb] = ctx.getImageData(900, 315, 1, 1).data;
    const d = ctx.getImageData(80, 150, 520, 330).data;
    let dark = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] < 90 && d[i + 1] < 90 && d[i + 2] < 90) dark++;
    return { centre: [cr, cg, cb], dark };
  });
  expect(Math.min(...r.centre)).toBeLessThan(200);
  expect(r.dark).toBeGreaterThanOrEqual(500);
});

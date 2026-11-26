// The Home wall (home-alt-6, U1): the twelve page captures are committed, complete and clean.
// scripts/capture-wall.ts makes them from a built dist/; this file proves the set is exactly the
// list in src/lib/wall.ts, each file is a 1280x800 RGB PNG with no metadata chunk, and each theme
// pair really differs (the dark file is darker in the nav corner), without sharp.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  WALL_LANGS,
  WALL_SHOTS,
  WALL_SIZE,
  WALL_THEMES,
  wallFile,
  wallHref,
} from '../../src/lib/wall';
import { walkPng } from './png-walk';

const DIR = 'src/assets/wall';
const KB = 1024;

const ORDER = [
  'nvim-diagram',
  'role-top',
  'story',
  'blog',
  'project-workflow',
  'project-diagram',
  'star-desk',
  'post-code',
  'skills',
  'role',
  'project-top',
  'story-emr',
];

const names = WALL_SHOTS.flatMap((s) =>
  WALL_LANGS.flatMap((lang) => WALL_THEMES.map((theme) => wallFile(s.id, lang, theme))),
);

/** Where each pictured page comes from, per language. */
function sources(path: string, lang: string): string[] {
  const [, kind, slug] = path.split('/');
  if (!slug) return [`src/pages/[...lang]/${kind}/index.astro`];
  const folders: Record<string, string> = {
    blog: 'blog',
    star: 'star',
    experiences: 'experience', // the collection folder is singular
    projects: 'projects',
  };
  const folder = folders[kind];
  if (!folder) return [];
  const base = `src/content/${folder}/${lang}/${slug}`;
  return kind === 'blog' ? [`${base}.mdx`, `${base}.md`] : [`${base}.md`];
}

/** RGB of the top-left pixel. In row 0 every PNG filter leaves the first pixel raw. */
function firstPixel(b: Buffer): [number, number, number] {
  const idat: Buffer[] = [];
  for (let i = 8; i < b.length;) {
    const len = b.readUInt32BE(i);
    if (b.toString('latin1', i + 4, i + 8) === 'IDAT') idat.push(b.subarray(i + 8, i + 8 + len));
    i += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  return [raw[1], raw[2], raw[3]];
}

describe('wall list (src/lib/wall.ts)', () => {
  it('has the twelve planned shots, unique, in wall order', () => {
    expect(WALL_SHOTS.map((s) => s.id)).toEqual(ORDER);
    expect(new Set(WALL_SHOTS.map((s) => s.id)).size).toBe(12);
    expect(WALL_SIZE).toEqual({ width: 1280, height: 800 });
  });

  it('never pictures Home, and every path is a site path with both slashes', () => {
    for (const s of WALL_SHOTS) {
      expect(s.path, s.id).toMatch(/^\/.+\/$/);
      expect(s.path, s.id).not.toBe('/');
    }
  });

  it('every pictured page has a source in both languages', () => {
    for (const s of WALL_SHOTS) {
      for (const lang of WALL_LANGS) {
        const found = sources(s.path, lang).filter((f) => existsSync(f));
        expect(found.length, `${s.id} ${lang}: ${sources(s.path, lang).join(' | ')}`).toBe(1);
      }
    }
  });

  it('wallHref adds /vi only for Vietnamese, and wallFile names the variant', () => {
    expect(wallHref('/star/', 'vi')).toBe('/vi/star/');
    expect(wallHref('/star/', 'en')).toBe('/star/');
    expect(wallFile('blog', 'vi', 'dark')).toBe('blog-vi-dark.png');
  });
});

describe('wall captures (src/assets/wall/)', () => {
  it('holds exactly the 48 files the list names (12 pages x EN/VI x light/dark)', () => {
    expect(names).toHaveLength(48);
    expect(readdirSync(DIR).sort()).toEqual([...names].sort());
  });

  it('each is a 1280x800 RGB PNG with image chunks only, <= 250 KB; <= 7 MB in all', () => {
    let total = 0;
    for (const f of names) {
      const b = readFileSync(join(DIR, f));
      const w = walkPng(b);
      expect(w.disallowed, `${f} chunks: ${w.segments.join(' ')}`).toEqual([]);
      expect([w.width, w.height, w.colorType], f).toEqual([WALL_SIZE.width, WALL_SIZE.height, 2]);
      expect(b.length, f).toBeLessThanOrEqual(250 * KB);
      total += statSync(join(DIR, f)).size;
    }
    expect(total).toBeLessThanOrEqual(7 * KB * KB);
  });

  it('no two files are the same picture', () => {
    const hashes = names.map((f) =>
      createHash('sha256')
        .update(readFileSync(join(DIR, f)))
        .digest('hex'),
    );
    expect(new Set(hashes).size).toBe(48);
  });

  it('each dark capture is darker than its light twin in the nav corner', () => {
    for (const s of WALL_SHOTS) {
      for (const lang of WALL_LANGS) {
        const sum = (theme: string) =>
          firstPixel(readFileSync(join(DIR, wallFile(s.id, lang, theme)))).reduce((a, v) => a + v);
        expect(sum('dark'), `${s.id} ${lang}`).toBeLessThan(sum('light'));
      }
    }
  });
});

describe('scripts/capture-wall.ts (source guard)', () => {
  const src = readFileSync('scripts/capture-wall.ts', 'utf8');
  it('serves dist/ on a random port and always closes the server', () => {
    expect(src).toContain("serve('dist', 0)");
    expect(src).not.toMatch(/4321/);
    expect(src).toMatch(/finally\s*\{[^}]*server\.close/);
  });
});

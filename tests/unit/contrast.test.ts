import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { composite, contrastRatio } from '../../src/lib/contrast';

const css = readFileSync('src/styles/tokens.css', 'utf8');

function token(name: string): [string, string] {
  const m = css.match(new RegExp(`${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`token ${name} not found`);
  const v = m[1].trim();
  const ld = v.match(/^light-dark\(\s*(#[0-9a-f]{3,6})\s*,\s*(#[0-9a-f]{3,6})\s*\)$/i);
  const norm = (h: string) =>
    h.length === 4 ? '#' + [...h.slice(1)].map((c) => c + c).join('') : h;
  if (ld) return [norm(ld[1]), norm(ld[2])];
  if (/^#[0-9a-f]{3,6}$/i.test(v)) return [norm(v), norm(v)];
  throw new Error(`cannot parse ${name}: ${v}`);
}

type Rgba = [number, number, number, number];

function rgbaToken(name: string): [Rgba, Rgba] {
  const m = css.match(new RegExp(`${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`token ${name} not found`);
  const found = [...m[1].matchAll(/rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)/g)];
  if (found.length !== 2) throw new Error(`cannot parse ${name}: ${m[1]}`);
  const toRgba = (x: RegExpMatchArray): Rgba => [+x[1], +x[2], +x[3], +x[4]];
  return [toRgba(found[0]), toRgba(found[1])];
}

const hex2 = (n: number) => n.toString(16).padStart(2, '0');
const rgbHex = ([r, g, b]: Rgba) => '#' + hex2(r) + hex2(g) + hex2(b);

/** Token `name` in theme `i` composited over the hex `baseHex`. */
function ink(name: string, i: number, baseHex: string): string {
  const c = rgbaToken(name)[i];
  return composite(rgbHex(c), c[3], baseHex);
}

const themes = [0, 1];
const label = (i: number) => (i ? 'dark' : 'light');

const hex7: [string, string][] = [
  ['--text', '--bg'],
  ['--text', '--surface-2'],
  ['--text', '--fill'],
  ['--text-2', '--bg'],
  ['--text-2', '--surface-2'],
  ['--text-2', '--nav-solid'],
  ['--menu-ink', '--nav-solid'],
  ['--link', '--bg'],
  ['--link', '--surface-2'],
  ['--on-accent', '--accent'],
  ['--on-accent', '--accent-hover'],
  ['--on-accent', '--accent-active'],
  ['--on-link', '--link'],
];

const hex45: [string, string][] = [['--text-2', '--fill']];

const fgHex = (fg: string, i: number) => (fg === '#fff' ? '#ffffff' : token(fg)[i]);

describe('token contrast (7:1 text and blues, 4.5:1 named exceptions; both themes)', () => {
  for (const [fg, bg] of hex7)
    for (const i of themes)
      it(`7:1 ${fg} on ${bg} (${label(i)})`, () => {
        expect(contrastRatio(fgHex(fg, i), token(bg)[i])).toBeGreaterThanOrEqual(7);
      });

  for (const [fg, bg] of hex45)
    for (const i of themes)
      it(`4.5:1 ${fg} on ${bg} (${label(i)})`, () => {
        expect(contrastRatio(fgHex(fg, i), token(bg)[i])).toBeGreaterThanOrEqual(4.5);
      });

  for (const fg of ['--ft-text', '--ft-link', '--ft-title'])
    for (const i of themes)
      it(`7:1 ${fg} over --surface-2 (${label(i)})`, () => {
        const base = token('--surface-2')[i];
        expect(contrastRatio(ink(fg, i, base), base)).toBeGreaterThanOrEqual(7);
      });

  for (const i of themes)
    it(`7:1 --nav-ink over --nav-solid (${label(i)})`, () => {
      const base = token('--nav-solid')[i];
      expect(contrastRatio(ink('--nav-ink', i, base), base)).toBeGreaterThanOrEqual(7);
    });

  for (const fill of ['--paddle-fill', '--paddle-fill-hover', '--paddle-fill-active'])
    for (const band of ['--bg', '--surface-2'])
      for (const i of themes)
        it(`7:1 --paddle-ink over ${fill} over ${band} (${label(i)})`, () => {
          const disc = ink(fill, i, token(band)[i]);
          expect(contrastRatio(ink('--paddle-ink', i, disc), disc)).toBeGreaterThanOrEqual(7);
        });

  for (const i of themes)
    it(`4.5:1 --ft-pipe over --surface-2 (${label(i)})`, () => {
      const base = token('--surface-2')[i];
      expect(contrastRatio(ink('--ft-pipe', i, base), base)).toBeGreaterThanOrEqual(4.5);
    });
});

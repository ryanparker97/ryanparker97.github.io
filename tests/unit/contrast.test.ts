import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../../src/lib/contrast';

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

const pairs: [string, string, string][] = [
  ['--text', '--bg', '--bg'],
  ['--text', '--surface-2', '--surface-2'],
  ['--text-2', '--bg', '--bg'],
  ['--text-2', '--surface-2', '--surface-2'],
  ['--link', '--bg', '--bg'],
  ['--link', '--surface-2', '--surface-2'],
  ['#fff', '--accent', '--accent'],
  ['#fff', '--accent-hover', '--accent-hover'],
  ['#fff', '--accent-active', '--accent-active'],
  ['--on-link', '--link', '--link'],
];

describe('token contrast (AA 4.5:1, both themes)', () => {
  for (const [fg, bg] of pairs)
    for (const i of [0, 1]) {
      it(`${fg} on ${bg} (${i ? 'dark' : 'light'})`, () => {
        const f = fg === '#fff' ? '#ffffff' : token(fg)[i];
        expect(contrastRatio(f, token(bg)[i])).toBeGreaterThanOrEqual(4.5);
      });
    }
});

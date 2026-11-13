import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const sets = [
  { dir: 'src/assets/star', names: ['emr-cost-optimization', 'talend-databricks-migration'] },
  { dir: 'src/assets/highlights', names: ['agents', 'team', 'years'] },
];
const allowed = ['--link', '--accent', '--text-2', '--fill', '--border', '--bg', '--surface-2'];
const header =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320" width="640" height="320">';

describe.each(sets)('diagrams in $dir', ({ dir, names }) => {
  it('holds exactly the listed diagrams', () => {
    expect(readdirSync(dir).sort()).toEqual(names.map((n) => `${n}.svg`).sort());
  });

  describe.each(names)('%s', (name) => {
    const path = join(dir, `${name}.svg`);
    const src = readFileSync(path, 'utf8');

    it('has the 2:1 header and stays under 6 KB', () => {
      expect(src.startsWith(header)).toBe(true);
      expect(statSync(path).size).toBeLessThan(6144);
    });

    it('has no text, scripts, images, links, ids, classes or hard-coded colours', () => {
      expect(src).not.toMatch(/<(text|script|image|style|use|foreignObject)\b/i);
      expect(src).not.toMatch(/\shref=|\sxlink:href=/);
      expect(src).not.toMatch(/\s(id|class)=/);
      expect(src).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(src).not.toMatch(/rgba?\(|hsla?\(/i);
      expect(src).not.toMatch(/\s(fill|stroke)="(?!none")/);
    });

    it('colours only through style tokens', () => {
      expect(src).toMatch(/style="[^"]*var\(--/);
      const used = [...src.matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1]);
      expect(used.filter((v) => !allowed.includes(v))).toEqual([]);
      const values = [...src.matchAll(/(?:fill|stroke):([^;"]+)/g)].map((m) => m[1].trim());
      expect(values.filter((v) => v !== 'none' && !/^var\(--[\w-]+\)$/.test(v))).toEqual([]);
    });

    it.runIf(dir.endsWith('highlights'))('has no faint (below .5) fill or stroke opacity', () => {
      expect(src).not.toMatch(/(fill|stroke)-opacity="0?\.[0-4]/);
    });

    it('has a link-filled shape and strokes of at least 4 units', () => {
      expect(src).toMatch(/fill:var\(--link\)/);
      const widths = [...src.matchAll(/stroke-width="([\d.]+)"/g)].map((m) => Number(m[1]));
      expect(widths.length).toBeGreaterThan(0);
      expect(widths.filter((w) => w < 4)).toEqual([]);
    });
  });
});

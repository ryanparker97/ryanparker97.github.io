import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = 'src/assets/art';
const inline = ['experiences-path', 'star-steps', 'not-found'];
const files = readdirSync(dir).filter((f) => f.endsWith('.svg'));

describe('art svgs', () => {
  it('has the four expected files', () => {
    expect(files.sort()).toEqual([...inline, 'project-agentic-loop'].map((n) => `${n}.svg`).sort());
  });

  describe.each(files)('%s', (file) => {
    const path = join(dir, file);
    const src = readFileSync(path, 'utf8');
    const isInline = inline.includes(file.replace(/\.svg$/, ''));

    it('is small, an svg with a viewBox, and has no text, scripts, images or links', () => {
      expect(statSync(path).size).toBeLessThan(4096);
      expect(src).toMatch(/^<svg[^>]*viewBox="/);
      expect(src).not.toMatch(/<(text|script|image)\b|href=/);
    });

    if (isInline) {
      it('is theme-aware through style tokens only', () => {
        expect(src).not.toMatch(/#[0-9a-f]{3,8}\b/i);
        expect(src).not.toMatch(/\sid=/);
        expect(src).not.toMatch(/\sfill="var\(/);
        expect(src).toMatch(/style="[^"]*var\(--/);
        const allowed = [
          '--link',
          '--accent',
          '--text-2',
          '--fill',
          '--border',
          '--bg',
          '--surface-2',
        ];
        const used = [...src.matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1]);
        expect(used.filter((v) => !allowed.includes(v))).toEqual([]);
      });
    }
  });
});

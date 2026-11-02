import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Element } from 'hast';
import { contrastRatio, ensureContrast } from '../../src/lib/contrast';
import {
  HIGHLIGHT_BG,
  codeHeader,
  liftContrast,
  titleNodes,
} from '../../src/lib/shiki-transformer';

const span = (style: string): Element => ({
  type: 'element',
  tagName: 'span',
  properties: { style },
  children: [{ type: 'text', value: 'x' }],
});

describe('contrast', () => {
  it('computes WCAG ratios', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 0);
    expect(contrastRatio('#ffffff', '#ffffff')).toBe(1);
  });
  it('lifts only failing colours', () => {
    const out = ensureContrast('#66707B', '#e8e8ed');
    expect(out).not.toBe('#66707B');
    expect(contrastRatio(out, '#e8e8ed')).toBeGreaterThanOrEqual(4.5);
    expect(ensureContrast('#0E1116', '#e8e8ed')).toBe('#0E1116');
  });
});

describe('liftContrast', () => {
  it('darkens failing light colours and leaves the rest', () => {
    const a = span('--shiki-light:#66707B;--shiki-dark:#BDC4CC');
    const b = span('--shiki-light:#A0111F;--shiki-dark:#FF9492');
    const line: Element = {
      type: 'element',
      tagName: 'span',
      properties: { class: 'line highlighted' },
      children: [a, b],
    };
    liftContrast(line);
    const sa = a.properties.style as string;
    expect(sa).not.toContain('--shiki-light:#66707B');
    expect(sa).toContain('--shiki-dark:#BDC4CC');
    expect(b.properties.style).toBe('--shiki-light:#A0111F;--shiki-dark:#FF9492');
  });
  it('leaves #RRGGBBAA colours untouched', () => {
    const style = '--shiki-light:#66707B80;--shiki-dark:#BDC4CC80';
    const line: Element = {
      type: 'element',
      tagName: 'span',
      properties: {},
      children: [span(style)],
    };
    liftContrast(line);
    expect((line.children[0] as Element).properties.style).toBe(style);
  });
  it('HIGHLIGHT_BG matches --fill in tokens.css', () => {
    const css = readFileSync('src/styles/tokens.css', 'utf8');
    const m = /--fill:\s*light-dark\((#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\)/i.exec(css);
    expect(m?.[1]).toBe(HIGHLIGHT_BG.light);
    expect(m?.[2]).toBe(HIGHLIGHT_BG.dark);
  });
});

describe('code header', () => {
  it('puts a wbr after every slash in the title', () => {
    const n = titleNodes('lua/a/b.lua');
    expect(n.map((x) => (x.type === 'text' ? x.value : (x as Element).tagName))).toEqual([
      'lua/',
      'wbr',
      'a/',
      'wbr',
      'b.lua',
    ]);
  });
  it('keeps the language label and Copy button out of the search index', () => {
    const h = codeHeader('x', 'sh');
    const [title, lang, btn] = h.children as Element[];
    expect(title.properties['data-pagefind-ignore']).toBeUndefined();
    expect(lang.properties['data-pagefind-ignore']).toBe('');
    expect(btn.properties['data-pagefind-ignore']).toBe('');
  });
});

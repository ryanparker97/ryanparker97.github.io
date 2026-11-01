import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import GraphBars from '../../src/components/tile/GraphBars.astro';
import Quote from '../../src/components/blog/Quote.astro';
import { foldChips, parseHighlights, pickHighlight, truncateSpans } from '../../src/lib/cv';
import { graphBars, headlineStat } from '../../src/lib/star';

const render = async (component: never, props: Record<string, unknown>, slots = {}) =>
  (await AstroContainer.create()).renderToString(component, { props, slots });

describe('GraphBars (fixture: no real content sets compare)', () => {
  const compare = [
    { label: 'Before', value: 100 },
    { label: 'After', value: 48 },
  ];
  it('renders one aria-hidden bar per entry with its width and a hidden sentence', async () => {
    const html = await render(GraphBars as never, { compare, lang: 'en' });
    expect(html.match(/<hr[^>]*aria-hidden="true"/g)).toHaveLength(2);
    expect(html).toContain('--w:1');
    expect(html).toContain('--w:0.48');
    expect(html).toContain('Before: 100, After: 48');
    expect(html).toContain('sr-only');
  });
  it('computes proportional widths and marks the last bar as the "after" bar', () => {
    const bars = graphBars(compare);
    expect(bars.map((b) => b.w)).toEqual([1, 0.48]);
    expect(bars.map((b) => b.after)).toEqual([false, true]);
  });
});

describe('Quote', () => {
  it('wraps bare text in a paragraph and renders the credit', async () => {
    const html = await render(
      Quote as never,
      { by: 'Ada', role: 'Engineer' },
      { default: 'Hello' },
    );
    expect(html).toContain('<blockquote><p>Hello</p></blockquote>');
    expect(html).toContain('Ada');
    expect(html).toContain('<span>Engineer</span>');
  });
  it('has a reduced variant', async () => {
    const html = await render(Quote as never, { reduced: true }, { default: 'Q' });
    expect(html).toContain('quote--reduced');
  });
});

describe('cv helpers for the gallery and chips', () => {
  it('cuts card text at a word boundary to 140 characters', () => {
    const long = [{ text: 'word '.repeat(60).trim(), bold: false }];
    const out = truncateSpans(long, 140);
    const text = out.map((s) => s.text).join('');
    expect(text.length).toBeLessThanOrEqual(140);
    expect(text.endsWith('…')).toBe(true);
    expect(truncateSpans([{ text: 'short', bold: false }])).toEqual([
      { text: 'short', bold: false },
    ]);
  });
  it('never cuts mid-word when the overflowing span starts with a space', () => {
    const text = (spans: { text: string }[]) => spans.map((s) => s.text).join('');
    const spans = [
      { text: 'Defined SLO/SLI', bold: false },
      {
        text: ' metrics, and alerting across every one of the platform services in production today',
        bold: false,
      },
    ];
    const out = truncateSpans(spans, 28);
    expect(text(out)).toBe('Defined SLO/SLI metrics,…'.replace(',…', '…'));
    for (const max of [16, 17, 18, 20, 24, 30, 40]) {
      const t = text(truncateSpans(spans, max)).replace(/…$/, '');
      const whole = text(spans);
      expect(whole.startsWith(t)).toBe(true);
      expect(t === whole || /[\s,;:.]/.test(whole[t.length])).toBe(true);
    }
  });
  it('drops a cut highlight whole and keeps the ellipsis outside it', () => {
    const spans = [
      { text: 'Built queries on ', bold: false },
      { text: 'Athena', bold: false, tech: true },
      { text: ' for the data lake in every region', bold: false },
    ];
    const out = truncateSpans(spans, 22);
    expect(out.some((s) => s.tech && s.text !== 'Athena')).toBe(false);
    expect(out[out.length - 1].tech).toBeFalsy();
    const out2 = truncateSpans(spans, 26);
    expect(out2[out2.length - 1]).toEqual({ text: '…', bold: false });
  });
  it('picks the highlight bullet (1-based, default 1)', () => {
    const cards = parseHighlights('- **A:** one\n- **B:** two\n- **C:** three');
    expect(pickHighlight(cards)?.label).toBe('A');
    expect(pickHighlight(cards, 2)?.label).toBe('B');
    expect(pickHighlight(cards, 9)?.label).toBe('C');
  });
  it('folds tech chips into two rows plus a +N chip', () => {
    const tech = Array.from({ length: 20 }, (_, i) => `Technology${i}`);
    const f = foldChips(tech);
    expect(f.shown).toBeLessThan(20);
    expect(f.more).toBe(20 - f.shown);
    expect(foldChips(['a', 'b']).more).toBe(0);
  });
  it('headlineStat needs a digit in the first metric', () => {
    expect(headlineStat([{ label: 'x', value: '>50%' }])?.value).toBe('>50%');
    expect(headlineStat([{ label: 'x', value: 'unchanged' }])).toBeUndefined();
  });
});

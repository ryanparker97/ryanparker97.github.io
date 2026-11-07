import { describe, expect, it } from 'vitest';
import {
  clampSubline,
  boldHtml,
  highlightStats,
  pickStory,
  uniqueCompanies,
} from '../../src/lib/home';

describe('uniqueCompanies', () => {
  it('lists each company once, keeping order', () => {
    expect(uniqueCompanies([{ company: 'FPT' }, { company: 'Datum' }, { company: 'FPT' }])).toEqual(
      ['FPT', 'Datum'],
    );
  });
});

describe('highlightStats', () => {
  const base = { years: '5+', yearsLabel: 'years of experience' };
  it('has up to three numeric stats with captions', () => {
    const all = highlightStats({
      ...base,
      metric: { value: '7', label: 'engineers' },
      metricPrefix: 'Led',
      story: { prefix: 'Cut', value: '>50%', label: 'EMR costs' },
    });
    expect(all).toEqual([
      { value: '5+', below: 'years of experience' },
      { above: 'Led', value: '7', below: 'engineers' },
      { above: 'Cut', value: '>50%', below: 'EMR costs' },
    ]);
  });
  it('carries the notes onto the right stats', () => {
    const out = highlightStats({
      ...base,
      yearsNote: 'y',
      metric: { value: '7', label: 'engineers', note: 'm' },
      story: { value: '>50%', label: 'EMR costs', note: 's' },
    });
    expect(out.map((s) => s.note)).toEqual(['y', 'm', 's']);
  });
  it('leaves out sources that are empty or have no digit', () => {
    const out = highlightStats({
      ...base,
      story: { value: 'unchanged', label: 'pipeline performance' },
    });
    expect(out).toHaveLength(1);
    expect(highlightStats({ years: '', yearsLabel: 'x' })).toEqual([]);
  });
});

describe('boldHtml', () => {
  it('turns **bold** into strong and escapes markup', () => {
    expect(boldHtml('a **b** <i>')).toBe('a <strong>b</strong> &#60;i&#62;');
  });
});

describe('pickStory', () => {
  const s = (id: string, featured: boolean, day: number) =>
    ({ id, data: { featured, date: new Date(2026, 0, day) } }) as const;
  it('prefers the newest featured story', () => {
    expect(pickStory([s('a', false, 9), s('b', true, 1), s('c', true, 5)])?.id).toBe('c');
  });
  it('falls back to the newest story, or nothing', () => {
    expect(pickStory([s('a', false, 2), s('b', false, 7)])?.id).toBe('b');
    expect(pickStory([])).toBeUndefined();
  });
});

describe('clampSubline', () => {
  it('leaves lines up to 120 characters alone', () => {
    const s = 'a'.repeat(120);
    expect(clampSubline(s)).toBe(s);
  });

  it('cuts at a word boundary with an ellipsis beyond 120 characters', () => {
    const s = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ');
    const out = clampSubline(s);
    expect(out.length).toBeLessThanOrEqual(120);
    expect(out.endsWith('…')).toBe(true);
    expect(s.startsWith(out.slice(0, -1))).toBe(true);
    expect(s[out.length - 1]).toBe(' ');
  });
});

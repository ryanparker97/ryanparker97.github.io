import { describe, expect, it } from 'vitest';
import {
  clampSubline,
  gridPlan,
  boldHtml,
  highlightStats,
  isLongCopy,
  pickStory,
  skillNames,
  tileHeadline,
  uniqueCompanies,
} from '../../src/lib/home';

describe('gridPlan', () => {
  const ids = (p: ReturnType<typeof gridPlan>) => p.map((x) => x.id);
  const spans = (p: ReturnType<typeof gridPlan>) => p.filter((x) => x.span).map((x) => x.id);

  it('renders all four tiles in order and never spans with an even count', () => {
    const plan = gridPlan({ project: true, story: true, certs: true });
    expect(ids(plan)).toEqual(['work', 'stories', 'writing', 'certifications']);
    expect(spans(plan)).toEqual([]);
  });

  it('leaves out a kind with no content, closes up and spans the last tile when odd', () => {
    const noProject = gridPlan({ project: false, story: true, certs: true });
    expect(ids(noProject)).toEqual(['stories', 'writing', 'certifications']);
    expect(spans(noProject)).toEqual(['certifications']);

    const noCerts = gridPlan({ project: true, story: true, certs: false });
    expect(ids(noCerts)).toEqual(['work', 'stories', 'writing']);
    expect(spans(noCerts)).toEqual(['writing']);
  });

  it('keeps the Writing tile (empty state) even when everything else is missing', () => {
    const plan = gridPlan({ project: false, story: false, certs: false });
    expect(plan).toEqual([{ id: 'writing', span: true }]);
    expect(ids(gridPlan({ project: false, story: false, certs: true }))).toEqual([
      'writing',
      'certifications',
    ]);
  });

  it('never leaves an empty cell: only the last tile of an odd grid spans', () => {
    for (const project of [true, false])
      for (const story of [true, false])
        for (const certs of [true, false]) {
          const plan = gridPlan({ project, story, certs });
          expect(spans(plan).length).toBe(plan.length % 2);
          if (plan.length % 2) expect(plan.at(-1)!.span).toBe(true);
        }
  });
});

describe('tileHeadline', () => {
  it('keeps headlines of up to 8 words', () => {
    expect(tileHeadline('Agentic Coding Workflow')).toBe('Agentic Coding Workflow');
    expect(tileHeadline('one two three four five six seven eight')).toBe(
      'one two three four five six seven eight',
    );
  });
  it('cuts a long title at its first colon', () => {
    expect(tileHeadline('Neovim setup guide, Part 1: from zero to a working editor')).toBe(
      'Neovim setup guide, Part 1',
    );
  });
  it('truncates to 8 words when there is no usable colon', () => {
    const out = tileHeadline('one two three four five six seven eight nine ten');
    expect(out).toBe('one two three four five six seven eight…');
    expect(tileHeadline('Sample: one two three four five six seven eight nine')).toBe(
      'Sample: one two three four five six seven…',
    );
  });
});

describe('uniqueCompanies / skillNames', () => {
  it('lists each company once, keeping order', () => {
    expect(uniqueCompanies([{ company: 'FPT' }, { company: 'Datum' }, { company: 'FPT' }])).toEqual(
      ['FPT', 'Datum'],
    );
  });
  it('shows at most 5 names and counts the rest', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((name) => ({ name }));
    expect(skillNames(items)).toEqual({ names: ['a', 'b', 'c', 'd', 'e'], more: 2 });
    expect(skillNames(items.slice(0, 5)).more).toBe(0);
    expect(skillNames(items.slice(0, 2))).toEqual({ names: ['a', 'b'], more: 0 });
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
  it('leaves out sources that are empty or have no digit', () => {
    const out = highlightStats({
      ...base,
      story: { value: 'unchanged', label: 'pipeline performance' },
    });
    expect(out).toHaveLength(1);
    expect(highlightStats({ years: '', yearsLabel: 'x' })).toEqual([]);
  });
});

describe('isLongCopy and boldHtml', () => {
  it('flags copy over 120 characters', () => {
    expect(isLongCopy('a'.repeat(60), 'b'.repeat(61))).toBe(true);
    expect(isLongCopy('short', 'also short')).toBe(false);
  });
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

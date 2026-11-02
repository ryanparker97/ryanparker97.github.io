import { expect, test } from '@playwright/test';
import { builtPages, type BuiltPage } from './pages';

test.skip(({ browserName }) => browserName !== 'chromium', 'reads dist; one browser is enough');

const decode = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();

function titleOf(p: BuiltPage): string {
  const m = /<title>([\s\S]*?)<\/title>/.exec(p.html);
  return m ? decode(m[1]) : '';
}

function descriptionOf(p: BuiltPage): string {
  const tag = /<meta\b[^>]*\bname=["']description["'][^>]*>/.exec(p.html)?.[0] ?? '';
  const m = /\bcontent=(?:"([^"]*)"|'([^']*)')/.exec(tag);
  return m ? decode(m[1] ?? m[2] ?? '') : '';
}

function duplicates(pages: BuiltPage[], pick: (p: BuiltPage) => string): string[] {
  const groups = new Map<string, string[]>();
  for (const p of pages) {
    const v = pick(p);
    groups.set(v, [...(groups.get(v) ?? []), p.path]);
  }
  return [...groups]
    .filter(([, paths]) => paths.length > 1)
    .map(([v, paths]) => `"${v}": ${paths.join(', ')}`);
}

const pages = builtPages();

test('the walker finds the whole site', () => {
  expect(pages.length).toBeGreaterThan(50);
});

for (const lang of ['en', 'vi'] as const) {
  const set = pages.filter((p) => p.lang === lang && p.kind !== 'print');

  test(`${lang}: every page has a unique non-empty title`, () => {
    expect(set.length).toBeGreaterThan(0);
    expect(set.filter((p) => !titleOf(p)).map((p) => p.path)).toEqual([]);
    expect(duplicates(set, titleOf)).toEqual([]);
  });

  test(`${lang}: every page has a unique non-empty description`, () => {
    expect(set.filter((p) => !descriptionOf(p)).map((p) => p.path)).toEqual([]);
    expect(duplicates(set, descriptionOf)).toEqual([]);
  });
}

test('the vi home title differs from the en home title', () => {
  const en = pages.find((p) => p.path === '/');
  const vi = pages.find((p) => p.path === '/vi/');
  expect(en).toBeDefined();
  expect(vi).toBeDefined();
  expect(titleOf(vi!)).not.toBe(titleOf(en!));
});

test('no built page links or loads over http://', () => {
  const bad = pages.filter((p) => /\b(?:href|src)=["']http:\/\//.test(p.html)).map((p) => p.path);
  expect(bad).toEqual([]);
});

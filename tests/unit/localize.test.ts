import { describe, expect, it } from 'vitest';
import { isFallback, localize } from '../../src/lib/localize';

const entry = (id: string) => ({ id, data: { title: id } });

describe('localize', () => {
  it('uses the VI entry when it exists and does not fall back', () => {
    const { items, fallback } = localize([entry('en/a'), entry('vi/a')], 'vi');
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ slug: 'a', contentLang: 'vi', available: ['en', 'vi'] });
    expect(items[0].id).toBe('vi/a');
    expect(fallback).toBe(false);
    expect(isFallback(items[0].contentLang, 'vi')).toBe(false);
  });

  it('falls back to EN when the VI entry is missing', () => {
    const { items, fallback } = localize([entry('en/a'), entry('en/b'), entry('vi/a')], 'vi');
    const b = items.find((i) => i.slug === 'b')!;
    expect(b).toMatchObject({ id: 'en/b', contentLang: 'en', available: ['en'] });
    expect(isFallback(b.contentLang, 'vi')).toBe(true);
    expect(fallback).toBe(true);
  });

  it('never reports a fallback for English', () => {
    const { items, fallback } = localize([entry('en/a')], 'en');
    expect(fallback).toBe(false);
    expect(isFallback(items[0].contentLang, 'en')).toBe(false);
  });
});

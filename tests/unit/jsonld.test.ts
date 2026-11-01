import { describe, expect, it } from 'vitest';
import { blogPostingLd, personLd } from '../../src/lib/jsonld';

describe('JSON-LD', () => {
  it('builds a Person', () => {
    const ld = personLd(
      {
        name: 'Ryan Parker',
        realName: 'Tran Thanh Hai',
        headline: 'Senior Data Engineer',
        tagline: 'Pipelines',
        location: 'Ho Chi Minh City',
        email: 'a@b.co',
        phone: '+84963378831',
        socials: { linkedin: 'https://l', github: 'https://g' },
      },
      'https://x/',
      'en',
    );
    expect(ld['@type']).toBe('Person');
    expect(ld.sameAs).toEqual(['https://l', 'https://g']);
    expect(ld.telephone).toBe('+84963378831');
    expect(ld.alternateName).toBe('Tran Thanh Hai');
  });
  it('builds a BlogPosting with dateModified falling back to pubDate', () => {
    const ld = blogPostingLd(
      { title: 'T', description: 'D', pubDate: new Date('2026-01-02'), tags: ['a', 'b'] },
      {
        url: 'https://x/p/',
        image: 'https://x/i.png',
        author: 'Me',
        authorUrl: 'https://x/',
        lang: 'vi',
      },
    );
    expect(ld['@type']).toBe('BlogPosting');
    expect(ld.dateModified).toBe(ld.datePublished);
    expect(ld.inLanguage).toBe('vi');
    expect(ld.keywords).toBe('a, b');
  });
});

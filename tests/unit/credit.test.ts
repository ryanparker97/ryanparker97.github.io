import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import CoverCredit from '../../src/components/blog/CoverCredit.astro';
import { creditParts } from '../../src/lib/credit';

const EN =
  'Neovim logo by [Jason Long](http://x.com/jasonlong), [CC BY 3.0](http://creativecommons.org/licenses/by/3.0/), modified';

describe('creditParts', () => {
  it('splits text and links in order', () => {
    const p = creditParts(EN);
    expect(p).toHaveLength(5);
    expect(p.filter((x) => x.href).map((x) => x.href)).toEqual([
      'http://x.com/jasonlong',
      'http://creativecommons.org/licenses/by/3.0/',
    ]);
  });
  it('keeps non-http links as plain text', () => {
    const p = creditParts('a [x](javascript:alert(1)) b');
    expect(p.every((x) => !x.href)).toBe(true);
    expect(p.map((x) => x.text).join('')).toBe('a [x](javascript:alert(1)) b');
  });
  it('returns one text part when there are no links', () => {
    expect(creditParts('plain')).toEqual([{ text: 'plain' }]);
  });
});

describe('CoverCredit', () => {
  for (const [lang, prefix] of [
    ['en', 'Cover art:'],
    ['vi', 'Ảnh bìa:'],
  ] as const) {
    it(`renders ${lang} with external links`, async () => {
      const html = await (
        await AstroContainer.create()
      ).renderToString(CoverCredit as never, {
        props: { lang, credit: EN },
      });
      expect(html).toContain(prefix);
      expect(html.match(/<a [^>]*target="_blank"[^>]*rel="noopener noreferrer"/g)).toHaveLength(2);
    });
  }

  it('keeps punctuation after a link inside one nowrap span', async () => {
    const html = await (
      await AstroContainer.create()
    ).renderToString(CoverCredit as never, {
      props: { lang: 'en', credit: EN },
    });
    expect(html).toMatch(/<span class="nw[^>]*>\s*<a [^>]*>\s*CC BY 3\.0\s*<\/a>\s*,\s*<\/span>/);
    expect(html).toContain(' modified');
    expect(html).not.toContain(', modified');
  });
});

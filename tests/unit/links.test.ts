import { describe, expect, it } from 'vitest';
import type { Root, Element } from 'hast';
import { externalAttrs, isExternal } from '../../src/lib/links';
import { rehypeExternalLinks } from '../../src/lib/rehype-external-links';

describe('isExternal', () => {
  it('is true for other hosts', () => {
    for (const h of ['https://www.linkedin.com/in/x', 'http://brew.sh', '//cdn.example.com'])
      expect(isExternal(h)).toBe(true);
  });
  it('is false for same-site and non-web links', () => {
    for (const h of [
      'https://ryanparker97.github.io/blog/',
      '/blog/',
      '#x',
      'mailto:a@b.c',
      'tel:+84123',
      '',
      undefined,
    ])
      expect(isExternal(h)).toBe(false);
  });
});

describe('externalAttrs', () => {
  it('returns nothing for internal hrefs', () => {
    expect(externalAttrs('/blog/')).toEqual({});
    expect(externalAttrs(undefined)).toEqual({});
  });
  it('returns target and rel for external hrefs', () => {
    expect(externalAttrs('https://brew.sh')).toEqual({
      target: '_blank',
      rel: 'noopener noreferrer',
    });
  });
});

const a = (href: string, extra: Element['properties'] = {}): Element => ({
  type: 'element',
  tagName: 'a',
  properties: { href, ...extra },
  children: [{ type: 'text', value: 'x' }],
});

describe('rehypeExternalLinks', () => {
  it('rewrites only external anchors, including nested ones', () => {
    const ext = a('https://brew.sh');
    const internal = a('/blog/');
    const mail = a('mailto:a@b.c');
    const nested = a('https://github.com/x');
    const withRel = a('https://example.com', { rel: ['me'] });
    const tree: Root = {
      type: 'root',
      children: [
        ext,
        internal,
        mail,
        { type: 'element', tagName: 'div', properties: {}, children: [nested] },
        withRel,
      ],
    };
    rehypeExternalLinks()(tree);
    expect(ext.properties.target).toBe('_blank');
    expect(ext.properties.rel).toEqual(['noopener', 'noreferrer']);
    expect(nested.properties.target).toBe('_blank');
    expect(internal.properties.target).toBeUndefined();
    expect(mail.properties.target).toBeUndefined();
    expect(mail.properties.rel).toBeUndefined();
    expect(withRel.properties.rel).toEqual(['me', 'noopener', 'noreferrer']);
  });
});

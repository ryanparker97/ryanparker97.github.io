import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import PostList from '../../src/components/blog/PostList.astro';
import PostRows from '../../src/components/blog/PostRows.astro';
import TopicSections from '../../src/components/blog/TopicSections.astro';
import type { ListItem, ListPost, PostRow, TopicGroup } from '../../src/lib/topics';

const render = async (component: never, props: Record<string, unknown>) =>
  (await AstroContainer.create()).renderToString(component, { props });

const post = (slug: string, extra: Partial<ListPost> = {}): ListPost => ({
  slug,
  title: `Title ${slug}`,
  description: `Desc ${slug}`,
  pubDate: new Date('2026-11-01T00:00:00Z'),
  minutes: 10,
  ...extra,
});

const series = {
  slug: 'g',
  title: 'Guide',
  description: 'A guide',
  parts: [
    { part: 1, title: 'First' },
    { part: 2, title: 'Second' },
  ],
};

const items: ListItem[] = [
  { kind: 'post', date: new Date('2026-11-01T00:00:00Z'), post: post('a') },
  {
    kind: 'series',
    date: new Date('2026-10-01T00:00:00Z'),
    series,
    published: 1,
    parts: [
      { part: 1, title: 'First', post: post('g-1', { series: 'g', seriesPart: 1 }) },
      { part: 2, title: 'Second' },
    ],
  },
];

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

const group = (slug: string, withTopic = true, count = 2): TopicGroup => ({
  slug,
  title: `Group ${slug}`,
  description: `About ${slug}`,
  topic: withTopic ? { slug, title: `Group ${slug}`, description: '', order: 1 } : undefined,
  items,
  count,
  newest: new Date('2026-11-01T00:00:00Z'),
});

describe('PostList', () => {
  it('renders post and series rows in English', async () => {
    const html = await render(PostList as never, { lang: 'en', items });
    expect(html).toContain('href="/blog/a/"');
    expect(html).toContain('href="/blog/series/g/"');
    expect(html.match(/href="\/blog\/g-1\/"/g)).toHaveLength(1);
    expect(html.match(/Coming soon/g)).toHaveLength(1);
    expect(html).toContain('Series · 2 parts');
    expect(text(html)).toContain('1 Nov 2026 · 10 min read');
    expect(html).not.toMatch(/<a[^>]*>(?:(?!<\/a>)[\s\S])*<a[\s>]/);
  });
  it('localises links and meta in Vietnamese', async () => {
    const html = await render(PostList as never, { lang: 'vi', items });
    expect(html).toContain('href="/vi/blog/a/"');
    expect(text(html)).toMatch(/\S+ · 10 phút đọc/);
  });
});

describe('TopicSections', () => {
  it('has no jump links for a single group', async () => {
    const html = await render(TopicSections as never, { lang: 'en', groups: [group('x')] });
    expect(html).not.toContain('topic-jump');
    expect(html).toContain('aria-labelledby="topic-x-title"');
    expect(html).toContain('id="topic-x-title"');
    expect(text(html)).toContain('2 posts');
  });
  it('uses the singular count', async () => {
    const html = await render(TopicSections as never, {
      lang: 'en',
      groups: [group('x', true, 1)],
    });
    expect(text(html)).toContain('1 post');
    expect(text(html)).not.toContain('1 posts');
  });
  it('has ordered jump links and an unlinked fallback heading', async () => {
    const html = await render(TopicSections as never, {
      lang: 'en',
      groups: [group('x'), group('other', false)],
    });
    expect(html).toContain('topic-jump');
    expect(html).toContain('href="#topic-x"');
    expect(html).toContain('href="#topic-other"');
    expect(html.indexOf('href="#topic-x"')).toBeLessThan(html.indexOf('href="#topic-other"'));
    expect(html).toContain('href="/blog/topics/x/"');
    expect(html).not.toContain('href="/blog/topics/other/"');
  });
});

describe('PostRows', () => {
  const rows: PostRow[] = [
    {
      post: post('g-1', { series: 'g', seriesPart: 1 }),
      part: 1,
      seriesSlug: 'g',
      seriesTitle: 'Guide',
      partTitle: 'First',
    },
    { post: post('a') },
  ];
  const noNested = (html: string) => expect(html).not.toMatch(/<a\b[^>]*>(?:(?!<\/a>)[\s\S])*<a\b/);

  it('renders one link per row with kicker, short title, meta and covers in English', async () => {
    const html = await render(PostRows as never, { lang: 'en', rows });
    expect(html.match(/class="hl-row post-row/g)).toHaveLength(2);
    expect(html).toContain('href="/blog/g-1/"');
    expect(html).toContain('href="/blog/a/"');
    const t = text(html);
    expect(t).toContain('Part 1 · Guide');
    expect(t).toContain('First');
    expect(t).not.toContain('Title g-1');
    expect(t).toContain('Title a');
    expect(t).toContain('1 Nov 2026 · 10 min read');
    expect(html).toMatch(/post-cover--gen[^>]*aria-hidden="true"/);
    expect(html).toMatch(/post-cover__num[^>]*>\s*1\s*</);
    expect(html).toMatch(/post-cover__label[^>]*>\s*Article\s*</);
    noNested(html);
  });
  it('localises links and meta in Vietnamese', async () => {
    const html = await render(PostRows as never, { lang: 'vi', rows });
    expect(html).toContain('href="/vi/blog/g-1/"');
    expect(html).toContain('href="/vi/blog/a/"');
    const t = text(html);
    expect(t).toContain('Phần 1');
    expect(t).toContain('Bài viết');
    expect(t).toContain('phút đọc');
  });
  it('uses the title initial as the cover glyph for a standalone post', async () => {
    for (const lang of ['en', 'vi']) {
      const html = await render(PostRows as never, {
        lang,
        rows: [{ post: post('z', { title: 'Zed notes' }) }],
      });
      expect(html).toMatch(/post-cover__num[^>]*>\s*Z\s*</);
      expect(html).not.toMatch(/post-cover__num[^>]*>\s*(A|B)\s*</);
    }
  });
  it('renders heroImage as a decorative img instead of a generated cover', async () => {
    const image = { src: '/x.png', width: 800, height: 600, format: 'png' } as const;
    const html = await render(PostRows as never, {
      lang: 'en',
      rows: [{ post: post('a', { image }) }],
    });
    expect(html).toContain('<img');
    expect(html).toMatch(/<img[^>]* alt(?:="")?[ >]/);
    expect(html).not.toContain('post-cover--gen');
  });
});

import { describe, expect, it } from 'vitest';
import {
  OTHER_TOPIC,
  listItems,
  postRows,
  postTopic,
  topicGroups,
  validateTopics,
  type ListPost,
  type ListSeries,
  type ListTopic,
} from '../../src/lib/topics';

const post = (slug: string, date: string, extra: Partial<ListPost> = {}): ListPost => ({
  slug,
  title: slug,
  description: `${slug} description`,
  pubDate: new Date(date),
  minutes: 3,
  ...extra,
});
const series = (slug: string, n: number, topic?: string): ListSeries => ({
  slug,
  title: slug,
  description: `${slug} description`,
  topic,
  parts: Array.from({ length: n }, (_, i) => ({ part: i + 1, title: `Part ${i + 1}` })),
});
const topic = (slug: string, order: number): ListTopic => ({
  slug,
  title: slug.toUpperCase(),
  description: `${slug} description`,
  order,
});
const other = { title: 'Notes', description: 'Everything else' };
const topics = [topic('dev', 1), topic('data', 2), topic('java', 3), topic('sre', 4)];

const nv = (n: number, date: string, extra: Partial<ListPost> = {}) =>
  post(`nv-${n}`, date, { series: 'nv', seriesPart: n, ...extra });

describe('postTopic', () => {
  const map = new Map([
    ['nv', { topic: 'dev' }],
    ['bare', { topic: undefined }],
  ]);
  it('uses the series topic for a post in a known series', () => {
    expect(postTopic({ series: 'nv', topic: 'data' }, map)).toBe('dev');
  });
  it('returns undefined when the series has no topic', () => {
    expect(postTopic({ series: 'bare', topic: 'data' }, map)).toBeUndefined();
  });
  it('falls back to the post topic', () => {
    expect(postTopic({ topic: 'data' }, map)).toBe('data');
    expect(postTopic({ series: 'gone', topic: 'java' }, map)).toBe('java');
  });
});

describe('listItems', () => {
  it('makes one series item dated by its newest part, parts in order', () => {
    const items = listItems(
      [nv(2, '2026-02-01'), nv(1, '2026-01-01'), nv(3, '2026-03-01')],
      [series('nv', 3)],
    );
    expect(items).toHaveLength(1);
    const it0 = items[0];
    if (it0.kind !== 'series') throw new Error('expected series');
    expect(it0.date).toEqual(new Date('2026-03-01'));
    expect(it0.parts.map((p) => p.part)).toEqual([1, 2, 3]);
    expect(it0.published).toBe(3);
  });
  it('hides draft posts, drops draft-only series, and includeDrafts shows them', () => {
    const posts = [post('a', '2026-01-01', { draft: true }), nv(1, '2026-02-01', { draft: true })];
    expect(listItems(posts, [series('nv', 1)])).toEqual([]);
    expect(listItems(posts, [series('nv', 1)], { includeDrafts: true })).toHaveLength(2);
  });
  it('keeps unpublished planned parts without a post', () => {
    const items = listItems(
      [nv(1, '2026-01-01'), nv(3, '2026-03-01', { draft: true })],
      [series('nv', 3)],
    );
    const s = items[0];
    if (s.kind !== 'series') throw new Error('expected series');
    expect(s.parts.map((p) => !!p.post)).toEqual([true, false, false]);
    expect(s.published).toBe(1);
    expect(s.date).toEqual(new Date('2026-01-01'));
  });
  it('sorts newest first, ties by slug', () => {
    const items = listItems(
      [post('b', '2026-01-01'), post('a', '2026-01-01'), post('c', '2026-05-01')],
      [],
    );
    expect(items.map((i) => (i.kind === 'post' ? i.post.slug : ''))).toEqual(['c', 'a', 'b']);
  });
});

describe('topicGroups', () => {
  it('groups a single series: one group, one item, count = parts', () => {
    const g = topicGroups(
      [nv(1, '2026-01-01'), nv(2, '2026-02-01')],
      [series('nv', 2, 'dev')],
      topics,
      other,
    );
    expect(g).toHaveLength(1);
    expect(g[0].slug).toBe('dev');
    expect(g[0].items).toHaveLength(1);
    expect(g[0].count).toBe(2);
    expect(g[0].newest).toEqual(new Date('2026-02-01'));
    expect(g[0].topic?.title).toBe('DEV');
  });
  it('orders a standalone post and a series newest first, both ways', () => {
    const s = [series('nv', 1, 'dev')];
    const a = topicGroups(
      [nv(1, '2026-01-01'), post('x', '2026-02-01', { topic: 'dev' })],
      s,
      topics,
      other,
    );
    expect(a[0].items.map((i) => i.kind)).toEqual(['post', 'series']);
    const b = topicGroups(
      [nv(1, '2026-03-01'), post('x', '2026-02-01', { topic: 'dev' })],
      s,
      topics,
      other,
    );
    expect(b[0].items.map((i) => i.kind)).toEqual(['series', 'post']);
    expect(b[0].count).toBe(2);
  });
  it('never interleaves two series in one topic', () => {
    const posts = [
      post('p1', '2026-01-01', { series: 'one', seriesPart: 1 }),
      post('q1', '2026-02-01', { series: 'two', seriesPart: 1 }),
      post('p2', '2026-03-01', { series: 'one', seriesPart: 2 }),
      post('q2', '2026-01-15', { series: 'two', seriesPart: 2 }),
    ];
    const g = topicGroups(posts, [series('one', 2, 'dev'), series('two', 2, 'dev')], topics, other);
    expect(g).toHaveLength(1);
    expect(g[0].items.map((i) => (i.kind === 'series' ? i.series.slug : ''))).toEqual([
      'one',
      'two',
    ]);
    expect(g[0].count).toBe(4);
  });
  it('orders topics by newest item', () => {
    const g = topicGroups(
      [post('a', '2026-01-01', { topic: 'dev' }), post('b', '2026-02-01', { topic: 'data' })],
      [],
      topics,
      other,
    );
    expect(g.map((x) => x.slug)).toEqual(['data', 'dev']);
  });
  it('breaks a newest-date tie by topic order', () => {
    const g = topicGroups(
      [post('a', '2026-01-01', { topic: 'data' }), post('b', '2026-01-01', { topic: 'dev' })],
      [],
      topics,
      other,
    );
    expect(g.map((x) => x.slug)).toEqual(['dev', 'data']);
  });
  it('shows only the one topic with content among four', () => {
    const g = topicGroups([post('a', '2026-01-01', { topic: 'java' })], [], topics, other);
    expect(g.map((x) => x.slug)).toEqual(['java']);
  });
  it('lets a post inherit its series topic over its own', () => {
    const g = topicGroups(
      [nv(1, '2026-01-01', { topic: 'data' })],
      [series('nv', 1, 'dev')],
      topics,
      other,
    );
    expect(g.map((x) => x.slug)).toEqual(['dev']);
  });
  it('sends missing and unknown topics to the other group, sorted last on ties', () => {
    const g = topicGroups(
      [
        post('a', '2026-01-01'),
        post('b', '2026-01-01', { topic: 'nope' }),
        post('c', '2026-01-01', { topic: 'dev' }),
      ],
      [],
      topics,
      other,
    );
    expect(g.map((x) => x.slug)).toEqual(['dev', OTHER_TOPIC]);
    expect(g[1].title).toBe('Notes');
    expect(g[1].description).toBe('Everything else');
    expect(g[1].topic).toBeUndefined();
    expect(g[1].count).toBe(2);
  });
  it('counts only published parts of a series', () => {
    const g = topicGroups([nv(1, '2026-01-01')], [series('nv', 4, 'dev')], topics, other);
    expect(g[0].count).toBe(1);
  });
  it('hides draft posts and shows them with includeDrafts', () => {
    const posts = [post('a', '2026-01-01', { topic: 'dev', draft: true })];
    expect(topicGroups(posts, [], topics, other)).toEqual([]);
    expect(topicGroups(posts, [], topics, other, { includeDrafts: true })).toHaveLength(1);
  });
});

describe('postRows', () => {
  const s = [series('nv', 2)];
  it('lists every post newest first across a series and a standalone post', () => {
    const rows = postRows([nv(1, '2026-01-01'), post('x', '2026-02-01'), nv(2, '2026-03-01')], s);
    expect(rows.map((r) => r.post.slug)).toEqual(['nv-2', 'x', 'nv-1']);
  });
  it('makes each part its own row with part and series fields', () => {
    const rows = postRows([nv(1, '2026-01-01'), nv(2, '2026-02-01')], s);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      part: 2,
      seriesSlug: 'nv',
      seriesTitle: 'nv',
      partTitle: 'Part 2',
    });
    expect(rows[1]).toMatchObject({ part: 1, seriesTitle: 'nv', partTitle: 'Part 1' });
  });
  it('gives a standalone post no part or series fields', () => {
    const [r] = postRows([post('x', '2026-01-01')], s);
    expect(r.part).toBeUndefined();
    expect(r.seriesTitle).toBeUndefined();
    expect(r.partTitle).toBeUndefined();
  });
  it('gives a post with an unknown series no series fields', () => {
    const [r] = postRows([post('x', '2026-01-01', { series: 'gone', seriesPart: 1 })], s);
    expect(r.part).toBeUndefined();
    expect(r.seriesSlug).toBeUndefined();
    expect(r.seriesTitle).toBeUndefined();
  });
  it('hides drafts and shows them with includeDrafts', () => {
    const posts = [post('a', '2026-01-01', { draft: true }), post('b', '2026-01-02')];
    expect(postRows(posts, s).map((r) => r.post.slug)).toEqual(['b']);
    expect(postRows(posts, s, { includeDrafts: true })).toHaveLength(2);
  });
  it('breaks a date tie by slug', () => {
    const rows = postRows([post('b', '2026-01-01'), post('a', '2026-01-01')], s);
    expect(rows.map((r) => r.post.slug)).toEqual(['a', 'b']);
  });
  it('sorts newest first, with a slug tie-break inside equal dates', () => {
    const rows = postRows(
      [post('c', '2026-03-01'), post('b', '2026-01-01'), post('a', '2026-01-01')],
      s,
    );
    expect(rows.map((r) => r.post.slug)).toEqual(['c', 'a', 'b']);
  });
});

describe('validateTopics', () => {
  it('is clean for valid data', () => {
    expect(
      validateTopics(
        [
          { id: 'p', series: 'nv', topic: 'dev' },
          { id: 'q', topic: 'data' },
        ],
        [{ id: 'nv', topic: 'dev' }],
        ['dev', 'data'],
      ),
    ).toEqual([]);
  });
  it('flags a post or series with a missing topic', () => {
    const e = validateTopics([{ id: 'p', topic: 'zzz' }], [{ id: 's', topic: 'yyy' }], ['dev']);
    expect(e).toHaveLength(2);
    expect(e.every((m) => m.includes('does not exist'))).toBe(true);
  });
  it('flags a post conflicting with its series topic', () => {
    const e = validateTopics(
      [{ id: 'p', series: 'nv', topic: 'data' }],
      [{ id: 'nv', topic: 'dev' }],
      ['dev', 'data'],
    );
    expect(e).toHaveLength(1);
    expect(e[0]).toContain('conflicts with series');
  });
  it('flags the reserved slug', () => {
    const e = validateTopics([], [], ['other']);
    expect(e).toHaveLength(1);
    expect(e[0]).toContain('reserved');
  });
});

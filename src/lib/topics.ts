import type { ImageMetadata } from 'astro';
import { seriesParts } from './blog';

export interface ListPost {
  slug: string;
  title: string;
  description: string;
  pubDate: Date;
  minutes: number;
  draft?: boolean;
  series?: string;
  seriesPart?: number;
  topic?: string;
  image?: ImageMetadata;
  imageCredit?: string;
}

export interface ListSeries {
  slug: string;
  title: string;
  description: string;
  topic?: string;
  parts: { part: number; title: string; description?: string }[];
}

export interface ListTopic {
  slug: string;
  title: string;
  description: string;
  order: number;
}

export type ListPart = { part: number; title: string; post?: ListPost };

export type ListItem =
  | { kind: 'post'; date: Date; post: ListPost }
  | { kind: 'series'; date: Date; series: ListSeries; parts: ListPart[]; published: number };

export interface TopicGroup {
  slug: string;
  title: string;
  description: string;
  topic?: ListTopic;
  items: ListItem[];
  count: number;
  newest: Date;
}

/** Slug of the fallback group; reserved, so no real topic may use it. */
export const OTHER_TOPIC = 'other';

/** A post in a known series takes the series topic (even when that is undefined). */
export function postTopic(
  post: Pick<ListPost, 'series' | 'topic'>,
  seriesById: Map<string, Pick<ListSeries, 'topic'>>,
): string | undefined {
  const s = post.series ? seriesById.get(post.series) : undefined;
  return s ? s.topic : post.topic;
}

const itemKey = (i: ListItem) => (i.kind === 'post' ? i.post.slug : i.series.slug);

/** One item per series (dated by its newest part) or standalone post, newest first. */
export function listItems(
  posts: ListPost[],
  series: ListSeries[],
  opts: { includeDrafts?: boolean } = {},
): ListItem[] {
  const visible = posts.filter((p) => opts.includeDrafts || !p.draft);
  const known = new Set(series.map((s) => s.slug));
  const items: ListItem[] = visible
    .filter((p) => !(p.series && known.has(p.series)))
    .map((post) => ({ kind: 'post', date: post.pubDate, post }));
  for (const s of series) {
    const parts = seriesParts(
      s.parts,
      visible.filter((p) => p.series === s.slug),
    );
    const published = parts.filter((p) => p.post);
    if (published.length === 0) continue;
    const date = new Date(Math.max(...published.map((p) => p.post!.pubDate.getTime())));
    items.push({ kind: 'series', date, series: s, parts, published: published.length });
  }
  return items.sort(
    (a, b) => b.date.getTime() - a.date.getTime() || itemKey(a).localeCompare(itemKey(b)),
  );
}

/** Items bucketed by topic; groups newest first, empty topics left out. */
export function topicGroups(
  posts: ListPost[],
  series: ListSeries[],
  topics: ListTopic[],
  other: { title: string; description: string },
  opts: { includeDrafts?: boolean } = {},
): TopicGroup[] {
  const seriesById = new Map(series.map((s) => [s.slug, s]));
  const byTopic = new Map(topics.map((t) => [t.slug, t]));
  const buckets = new Map<string, ListItem[]>();
  for (const item of listItems(posts, series, opts)) {
    const t = postTopic(
      item.kind === 'post' ? item.post : { series: item.series.slug },
      seriesById,
    );
    const key = t && byTopic.has(t) ? t : OTHER_TOPIC;
    buckets.set(key, [...(buckets.get(key) ?? []), item]);
  }
  const groups: TopicGroup[] = [];
  for (const [slug, items] of buckets) {
    const topic = byTopic.get(slug);
    groups.push({
      slug,
      title: topic ? topic.title : other.title,
      description: topic ? topic.description : other.description,
      topic,
      items,
      count: items.reduce((n, i) => n + (i.kind === 'series' ? i.published : 1), 0),
      newest: items[0].date,
    });
  }
  return groups.sort(
    (a, b) =>
      b.newest.getTime() - a.newest.getTime() ||
      (a.topic?.order ?? Infinity) - (b.topic?.order ?? Infinity) ||
      a.slug.localeCompare(b.slug),
  );
}

/** Build-time checks; one message per problem. */
export function validateTopics(
  posts: { id: string; series?: string; topic?: string }[],
  series: { id: string; topic?: string }[],
  topics: string[],
): string[] {
  const errors: string[] = [];
  const known = new Set(topics);
  const seriesTopic = new Map(series.map((s) => [s.id, s.topic]));
  if (known.has(OTHER_TOPIC)) errors.push(`topic "${OTHER_TOPIC}" is reserved`);
  for (const s of series)
    if (s.topic && !known.has(s.topic))
      errors.push(`series ${s.id}: topic "${s.topic}" does not exist`);
  for (const p of posts) {
    if (p.topic && !known.has(p.topic)) errors.push(`${p.id}: topic "${p.topic}" does not exist`);
    if (p.topic && p.series && seriesTopic.has(p.series) && seriesTopic.get(p.series) !== p.topic)
      errors.push(`${p.id}: topic "${p.topic}" conflicts with series "${p.series}"`);
  }
  return errors;
}

export interface PostRow {
  post: ListPost;
  part?: number;
  seriesSlug?: string;
  seriesTitle?: string;
  /** Short part title from the series, when the post is a known series part. */
  partTitle?: string;
}

/** One row per post (every series part is its own row), newest first, ties by slug. */
export function postRows(
  posts: ListPost[],
  series: ListSeries[],
  opts: { includeDrafts?: boolean } = {},
): PostRow[] {
  const byId = new Map(series.map((s) => [s.slug, s]));
  return posts
    .filter((p) => opts.includeDrafts || !p.draft)
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime() || a.slug.localeCompare(b.slug))
    .map((post) => {
      const s = post.series ? byId.get(post.series) : undefined;
      if (!s || !post.seriesPart) return { post };
      const partTitle = s.parts.find((x) => x.part === post.seriesPart)?.title;
      return {
        post,
        part: post.seriesPart,
        seriesSlug: s.slug,
        seriesTitle: s.title,
        partTitle,
      };
    });
}

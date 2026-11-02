import { getCollection } from 'astro:content';
import { getLocalized, type Localized } from './content';
import {
  filterPublished,
  seriesParts,
  sharedReadingMinutes,
  sortPosts,
  validateSeries,
} from './blog';
import { useT, type Lang } from '../i18n';
import {
  topicGroups,
  validateTopics,
  type ListPost,
  type ListSeries,
  type ListTopic,
  postRows,
} from './topics';

export type Post = Localized<'blog'> & { minutes: number };
const slugOf = (id: string) => id.split('/').slice(1).join('/');

let checked: Promise<void> | undefined;
/** Fails the build when post, series or topic metadata contradicts the collections. */
function checkSeries(): Promise<void> {
  checked ??= (async () => {
    const [posts, series, topics] = await Promise.all([
      getCollection('blog'),
      getCollection('series'),
      getCollection('topics'),
    ]);
    const errors = [
      ...validateSeries(
        posts.map((p) => ({ id: p.id, lang: p.id.split('/')[0], ...pick(p.data) })),
        series.map((s) => ({ id: slugOf(s.id), parts: s.data.parts })),
      ),
      ...validateTopics(
        posts.map((p) => ({ id: p.id, series: p.data.series, topic: p.data.topic })),
        series.map((s) => ({ id: slugOf(s.id), topic: s.data.topic })),
        [...new Set(topics.map((t) => slugOf(t.id)))],
      ),
    ];
    if (errors.length) throw new Error(`Invalid blog metadata:\n- ${errors.join('\n- ')}`);
  })();
  return checked;
}
const pick = (d: { series?: string; seriesPart?: number }) => ({
  series: d.series,
  seriesPart: d.seriesPart,
});

/** Published posts for `lang` (drafts only in `astro dev`), newest first. */
export async function getPosts(lang: Lang) {
  await checkSeries();
  const { items, fallback } = await getLocalized('blog', lang);
  const english = new Map(
    (await getCollection('blog'))
      .filter((p) => p.id.startsWith('en/'))
      .map((p) => [slugOf(p.id), p.body]),
  );
  const posts: Post[] = sortPosts(filterPublished(items, import.meta.env.DEV)).map((p) => ({
    ...p,
    minutes: sharedReadingMinutes({ en: english.get(p.slug), own: p.body }),
  }));
  return { posts, fallback: fallback && posts.some((p) => p.contentLang !== lang) };
}

export async function getSeriesList(lang: Lang) {
  await checkSeries();
  const { items, fallback } = await getLocalized('series', lang);
  return { series: items, fallback };
}

/** A series with all of its planned parts and the published post for each. */
export async function getSeriesDetail(slug: string, lang: Lang) {
  const { series } = await getSeriesList(lang);
  const entry = series.find((s) => s.slug === slug);
  if (!entry) return undefined;
  const { posts } = await getPosts(lang);
  const inSeries = posts.filter((p) => p.data.series === slug);
  const parts = seriesParts(
    entry.data.parts,
    inSeries.map((p) => ({ ...p, seriesPart: p.data.seriesPart })),
  );
  return { entry, parts, published: parts.filter((p) => p.post).length };
}

/** Topics for `lang`, in curated order. */
export async function getTopics(lang: Lang) {
  await checkSeries();
  const { items, fallback } = await getLocalized('topics', lang);
  const topics = [...items].sort(
    (a, b) => a.data.order - b.data.order || a.slug.localeCompare(b.slug),
  );
  return { topics, fallback };
}

export const toListPost = (p: Post): ListPost => ({
  slug: p.slug,
  title: p.data.title,
  description: p.data.description,
  pubDate: p.data.pubDate,
  minutes: p.minutes,
  draft: p.data.draft,
  series: p.data.series,
  seriesPart: p.data.seriesPart,
  topic: p.data.topic,
  image: p.data.heroImage,
  imageCredit: p.data.heroImageCredit,
});

export const toListSeries = (s: Localized<'series'>): ListSeries => ({
  slug: s.slug,
  title: s.data.title,
  description: s.data.description,
  topic: s.data.topic,
  parts: s.data.parts,
});

const toListTopic = (t: Localized<'topics'>): ListTopic => ({
  slug: t.slug,
  title: t.data.title,
  description: t.data.description,
  order: t.data.order,
});

/** Posts and series bucketed by topic for the blog list. */
export async function getTopicGroups(lang: Lang) {
  const [{ posts, fallback: postsFallback }, { series }, { topics, fallback: topicsFallback }] =
    await Promise.all([getPosts(lang), getSeriesList(lang), getTopics(lang)]);
  const t = useT(lang);
  const groups = topicGroups(
    posts.map(toListPost),
    series.map(toListSeries),
    topics.map(toListTopic),
    { title: t('topics.other'), description: t('topics.otherDescription') },
    { includeDrafts: import.meta.env.DEV },
  );
  return { groups, topics, fallback: postsFallback || topicsFallback };
}

/** Every published post as one flat row, newest first, for the blog index. */
export async function getPostRows(lang: Lang) {
  const [{ posts, fallback }, { series }] = await Promise.all([
    getPosts(lang),
    getSeriesList(lang),
  ]);
  const rows = postRows(posts.map(toListPost), series.map(toListSeries), {
    includeDrafts: import.meta.env.DEV,
  });
  return { rows, fallback };
}

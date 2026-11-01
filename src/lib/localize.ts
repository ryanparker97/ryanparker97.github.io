import type { Lang } from '../i18n';

export type WithLang<E> = E & {
  /** Entry slug shared by translations (the filename without extension). */
  slug: string;
  /** Language the content is actually written in (English when a translation is missing). */
  contentLang: Lang;
  /** Languages in which this entry really exists. */
  available: Lang[];
};

const slugOf = (id: string) => id.split('/').slice(1).join('/');

/** True when a `/vi/` page shows content written in another language (drives the banner). */
export const isFallback = (contentLang: Lang, lang: Lang): boolean => contentLang !== lang;

/**
 * Pure localisation: entry ids look like `<lang>/<slug>`. Each slug resolves to its `lang` entry,
 * else the English one (`contentLang: 'en'`). `fallback` is true when any slug fell back.
 */
export function localize<E extends { id: string }>(
  all: E[],
  lang: Lang,
): { items: WithLang<E>[]; fallback: boolean } {
  const available = new Map<string, Lang[]>();
  for (const entry of all) {
    const slug = slugOf(entry.id);
    available.set(slug, [...(available.get(slug) ?? []), entry.id.split('/')[0] as Lang]);
  }
  const items = new Map<string, WithLang<E>>();
  for (const entry of all) {
    const entryLang = entry.id.split('/')[0] as Lang;
    const slug = slugOf(entry.id);
    const base = { ...entry, slug, available: available.get(slug)! };
    if (entryLang === 'en' && !items.has(slug)) items.set(slug, { ...base, contentLang: 'en' });
    if (entryLang === lang) items.set(slug, { ...base, contentLang: lang });
  }
  const list = [...items.values()];
  return {
    items: list,
    fallback: lang !== 'en' && list.some((i) => isFallback(i.contentLang, lang)),
  };
}

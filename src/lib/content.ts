import { getCollection, render, type CollectionEntry, type CollectionKey } from 'astro:content';
import type { Lang } from '../i18n';
import { localize } from './localize';

export type Localized<K extends CollectionKey> = CollectionEntry<K> & {
  /** Entry slug shared by translations (the filename without extension). */
  slug: string;
  /** Language the content is actually written in (English when a translation is missing). */
  contentLang: Lang;
  /** Languages in which this entry really exists. */
  available: Lang[];
};

/**
 * Entries of a collection for `lang`. Entries with no translation fall back to the English file,
 * and `fallback` is true when any did, so the page can show the "English only" banner.
 */
export async function getLocalized<K extends CollectionKey>(
  name: K,
  lang: Lang,
): Promise<{ items: Localized<K>[]; fallback: boolean }> {
  return localize((await getCollection(name)) as CollectionEntry<K>[], lang) as {
    items: Localized<K>[];
    fallback: boolean;
  };
}

export async function getProfile(lang: Lang) {
  const { items, fallback } = await getLocalized('profile', lang);
  const entry = items[0];
  if (!entry) throw new Error('Missing profile: add src/content/profile/en/index.md');
  return { entry, data: entry.data, fallback };
}

export { render };

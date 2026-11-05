import { existsSync, readdirSync } from 'node:fs';

const count = (collection: string, lang: string) => {
  const dir = `src/content/${collection}/${lang}`;
  return existsSync(dir) ? readdirSync(dir).filter((f) => /\.mdx?$/.test(f)).length : 0;
};
const hasFile = (collection: string, slug: string) =>
  ['md', 'mdx'].some((ext) => existsSync(`src/content/${collection}/vi/${slug}.${ext}`));
/** Every English entry of the collection has a Vietnamese translation. */
const translated = (...collections: string[]) =>
  collections.every((c) => count(c, 'vi') >= count(c, 'en') && count(c, 'en') > 0);

/**
 * Whether a `/vi/...` page has real Vietnamese content (so it belongs in the sitemap).
 * Pages that would show the English fallback banner return false.
 */
export function viPageHasContent(pathname: string): boolean {
  const path = pathname.replace(/^\/vi/, '') || '/';
  const slug = (prefix: string) =>
    path.startsWith(prefix) ? path.slice(prefix.length).split('/')[0] : '';
  if (path.startsWith('/blog/series/') && slug('/blog/series/'))
    return hasFile('series', slug('/blog/series/'));
  if (path.startsWith('/blog/topics/') && slug('/blog/topics/'))
    return hasFile('topics', slug('/blog/topics/'));
  if (path === '/blog/topics/') return translated('blog', 'topics');
  if (path.startsWith('/blog/tags/') || path === '/blog/series/' || path === '/blog/')
    return translated('blog');
  if (path.startsWith('/blog/')) return hasFile('blog', slug('/blog/'));
  if (path.startsWith('/star/') && slug('/star/')) return hasFile('star', slug('/star/'));
  if (path === '/star/') return translated('star');
  if (path.startsWith('/skills/')) return translated('skills', 'certifications', 'profile');
  if (path.startsWith('/experiences/')) return translated('profile', 'experience');
  if (path.startsWith('/projects/')) return translated('projects');
  return translated('profile'); // home
}

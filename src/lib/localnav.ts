// Local nav definitions for the inner pages (spec §4.0, §5.8).
import { useT, type Lang } from '../i18n';
import { localePath } from '../i18n/routes';

export interface NavLink {
  href: string;
  label: string;
  current?: boolean;
  data?: Record<string, string>;
  jsOnly?: boolean;
  toggleLabel?: string;
}
export interface LocalNavProps {
  title: string;
  titleHref?: string;
  links: NavLink[];
  pill?: { href: string; label: string; download?: string };
}

/** Blog index, topics and series pages: All posts · Topics · Series, plus the RSS pill. */
export function blogNav(lang: Lang, current?: 'all' | 'topics' | 'series'): LocalNavProps {
  const t = useT(lang);
  return {
    title: t('blog.title'),
    links: [
      { href: localePath('/blog/', lang), label: t('blog.all'), current: current === 'all' },
      {
        href: localePath('/blog/topics/', lang),
        label: t('blog.topics'),
        current: current === 'topics',
      },
      {
        href: localePath('/blog/series/', lang),
        label: t('blog.series'),
        current: current === 'series',
      },
    ],
    pill: { href: localePath('/rss.xml', lang), label: t('blog.rss') },
  };
}

/**
 * Projects: the kind links drive the filter (`data-kind`), plus Expand all. Kinds with no projects
 * are hidden, and with fewer than two kinds the kind links are left out. Labels carry counts
 * ("Personal 1"); the kind links need JavaScript, so they are hidden without it.
 */
export function projectsNav(
  lang: Lang,
  kinds: string[],
  counts: Record<string, number> = {},
): LocalNavProps {
  const t = useT(lang);
  const base = localePath('/projects/', lang);
  const kindLabel = (k: string) => t(`projects.kind.${k}` as 'projects.kind.all');
  const total = kinds.reduce((n, k) => n + (counts[k] ?? 0), 0);
  const count = (k: string) => {
    const n = k === 'all' ? total : counts[k];
    return n === undefined || (k === 'all' && !total) ? '' : ` ${n}`;
  };
  const kindLinks =
    kinds.length < 2
      ? []
      : ['all', ...kinds].map((k) => ({
          href: k === 'all' ? base : `${base}?kind=${k}`,
          label: `${kindLabel(k)}${count(k)}`,
          current: k === 'all',
          data: { kind: k },
          jsOnly: true,
        }));
  return {
    title: t('projects.title'),
    links: [
      ...kindLinks,
      {
        href: `${base}#expand`,
        label: t('projects.expandAll'),
        toggleLabel: t('projects.collapseAll'),
        data: { expand: 'all' },
        jsOnly: true,
      },
    ],
  };
}

/** Single-link variant (blog post, STAR story): the title plus a chevron text link. */
export function singleNav(title: string, link: NavLink, titleHref?: string): LocalNavProps {
  return { title, titleHref, links: [link] };
}

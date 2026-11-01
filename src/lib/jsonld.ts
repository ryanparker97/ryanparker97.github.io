import { htmlLang, type Lang } from '../i18n';

interface PersonInput {
  name: string;
  realName?: string;
  headline: string;
  tagline: string;
  location: string;
  email: string;
  phone: string;
  socials: { linkedin: string; github: string; x?: string; bluesky?: string };
}

/** schema.org Person for the Home and Experiences pages. */
export function personLd(p: PersonInput, url: string, lang: Lang) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: p.name,
    ...(p.realName && { alternateName: p.realName }),
    jobTitle: p.headline,
    description: `${p.headline}: ${p.tagline}`,
    url,
    email: `mailto:${p.email}`,
    telephone: p.phone,
    address: { '@type': 'PostalAddress', addressLocality: p.location },
    sameAs: [p.socials.linkedin, p.socials.github, p.socials.x, p.socials.bluesky].filter(Boolean),
    knowsLanguage: htmlLang(lang),
  };
}

interface PostInput {
  title: string;
  description: string;
  pubDate: Date;
  updatedDate?: Date;
  tags: string[];
}

/** schema.org BlogPosting for a post page. */
export function blogPostingLd(
  post: PostInput,
  opts: { url: string; image: string; author: string; authorUrl: string; lang: Lang },
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.pubDate.toISOString(),
    dateModified: (post.updatedDate ?? post.pubDate).toISOString(),
    author: { '@type': 'Person', name: opts.author, url: opts.authorUrl },
    inLanguage: htmlLang(opts.lang),
    keywords: post.tags.join(', '),
    image: opts.image,
    mainEntityOfPage: { '@type': 'WebPage', '@id': opts.url },
  };
}

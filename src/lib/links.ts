// Must match `site` in astro.config.mjs.
export const SITE_HOST = 'ryanparker97.github.io';

export const EXTERNAL_REL = 'noopener noreferrer';

/** True for absolute http(s) or protocol-relative URLs that point away from this site. */
export function isExternal(href: string | undefined, siteHost: string = SITE_HOST): boolean {
  if (!href || !/^(https?:)?\/\//i.test(href)) return false;
  try {
    return new URL(href, 'https://' + siteHost).host !== siteHost;
  } catch {
    return false;
  }
}

/** Attributes for an anchor; spread them: `<a href={h} {...externalAttrs(h)}>`. */
export function externalAttrs(href: string | undefined): { target?: '_blank'; rel?: string } {
  return isExternal(href) ? { target: '_blank', rel: EXTERNAL_REL } : {};
}

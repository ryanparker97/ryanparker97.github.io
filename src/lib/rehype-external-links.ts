import type { Root, Element, Parent } from 'hast';
import { isExternal } from './links';

function walk(node: Parent): void {
  for (const child of node.children) {
    if (child.type === 'element') {
      const el = child as Element;
      const href = el.properties?.href;
      if (el.tagName === 'a' && typeof href === 'string' && isExternal(href)) {
        const rel: unknown = el.properties.rel;
        const existing = Array.isArray(rel)
          ? rel.map(String)
          : typeof rel === 'string'
            ? rel.split(/\s+/)
            : [];
        el.properties.target = '_blank';
        el.properties.rel = [...new Set([...existing.filter(Boolean), 'noopener', 'noreferrer'])];
      }
    }
    if ('children' in child && Array.isArray(child.children)) walk(child as Parent);
  }
}

/** Open links to other sites in a new tab, in rendered Markdown/MDX. Raw JSX <a> in MDX is not rewritten. */
export function rehypeExternalLinks() {
  return (tree: Root): void => walk(tree);
}

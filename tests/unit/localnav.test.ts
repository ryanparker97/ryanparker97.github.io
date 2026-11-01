import { describe, expect, it } from 'vitest';
import { blogNav, projectsNav, singleNav } from '../../src/lib/localnav';

describe('local nav definitions (spec §4.0)', () => {
  it('blog: All posts, Series, Tags and an RSS pill', () => {
    const nav = blogNav('en', 'series');
    expect(nav.title).toBe('Blog');
    expect(nav.links.map((l) => l.label)).toEqual(['All posts', 'Series', 'Tags']);
    expect(nav.links.map((l) => l.current)).toEqual([false, true, false]);
    expect(nav.pill).toEqual({ href: '/rss.xml', label: 'RSS' });
  });

  it('blog in Vietnamese keeps the /vi/ prefix', () => {
    expect(blogNav('vi').links[0].href).toBe('/vi/blog/');
    expect(blogNav('vi').pill?.href).toBe('/vi/rss.xml');
  });

  it('projects: All, each kind that exists, then Expand all', () => {
    const nav = projectsNav('en', ['personal', 'work']);
    expect(nav.links.map((l) => l.label)).toEqual(['All', 'Personal', 'Work', 'Expand all']);
    expect(nav.links[1].href).toBe('/projects/?kind=personal');
    expect(nav.links[0].current).toBe(true);
    expect(nav.links[3].data).toEqual({ expand: 'all' });
  });

  it('projects: labels carry counts and the kind links need JavaScript', () => {
    const nav = projectsNav('en', ['personal', 'work'], { personal: 1, work: 3 });
    expect(nav.links.map((l) => l.label)).toEqual(['All 4', 'Personal 1', 'Work 3', 'Expand all']);
    expect(nav.links.map((l) => !!l.jsOnly)).toEqual([true, true, true, true]);
  });

  it('projects: with fewer than two kinds the kind links are left out', () => {
    expect(projectsNav('en', ['personal'], { personal: 1 }).links.map((l) => l.label)).toEqual([
      'Expand all',
    ]);
  });

  it('single-link pages carry exactly one link', () => {
    const nav = singleNav('Blog', { href: '/blog/', label: 'All posts' });
    expect(nav.links).toHaveLength(1);
    expect(nav.pill).toBeUndefined();
  });
});

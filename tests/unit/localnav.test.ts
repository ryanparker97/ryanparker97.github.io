import { describe, expect, it } from 'vitest';
import { blogNav, experiencesNav, homeNav, projectsNav, singleNav } from '../../src/lib/localnav';

describe('local nav definitions (spec §4.0)', () => {
  it('blog: All posts, Topics, Series and an RSS pill', () => {
    const nav = blogNav('en', 'series');
    expect(nav.title).toBe('Blog');
    expect(nav.links.map((l) => l.label)).toEqual(['All posts', 'Topics', 'Series']);
    expect(nav.links.map((l) => l.current)).toEqual([false, false, true]);
    expect(nav.pill).toEqual({ href: '/rss.xml', label: 'RSS' });
  });

  it('blog: topics page marks Topics current', () => {
    const nav = blogNav('en', 'topics');
    expect(nav.links.map((l) => l.current)).toEqual([false, true, false]);
    expect(nav.links[1].href).toBe('/blog/topics/');
  });

  it('blog in Vietnamese keeps the /vi/ prefix', () => {
    expect(blogNav('vi').links[0].href).toBe('/vi/blog/');
    expect(blogNav('vi').pill?.href).toBe('/vi/rss.xml');
  });

  it('projects: All and each kind that exists, then the PDF pill', () => {
    const nav = projectsNav('en', ['personal', 'work']);
    expect(nav.links.map((l) => l.label)).toEqual(['All', 'Personal', 'Work']);
    expect(nav.links[1].href).toBe('/projects/?kind=personal');
    expect(nav.links[0].current).toBe(true);
    expect(nav.pill?.href).toBe('/cv.pdf');
  });

  it('projects: labels carry counts and the kind links need JavaScript', () => {
    const nav = projectsNav('en', ['personal', 'work'], { personal: 1, work: 3 });
    expect(nav.links.map((l) => l.label)).toEqual(['All 4', 'Personal 1', 'Work 3']);
    expect(nav.links.map((l) => !!l.jsOnly)).toEqual([true, true, true]);
  });

  it('projects: with fewer than two kinds the kind links are left out', () => {
    expect(projectsNav('en', ['personal'], { personal: 1 }).links).toEqual([]);
  });

  it('single-link pages carry exactly one link', () => {
    const nav = singleNav('Blog', { href: '/blog/', label: 'All posts' });
    expect(nav.links).toHaveLength(1);
    expect(nav.pill).toBeUndefined();
  });

  it('home: Overview, Experiences, Skills and the PDF pill', () => {
    const nav = homeNav('en');
    expect(nav.links.map((l) => l.label)).toEqual(['Overview', 'Experiences', 'Skills']);
    expect(nav.links.map((l) => !!l.current)).toEqual([true, false, false]);
    expect(nav.pill?.href).toBe('/cv.pdf');
    const vi = homeNav('vi');
    expect(vi.links.map((l) => l.href)).toEqual(['/vi/', '/vi/experiences/', '/vi/skills/']);
    expect(vi.pill?.href).toBe('/vi/cv.pdf');
  });

  it('experiences: one role-page link per role, the open one current, plus the PDF pill', () => {
    const roles = ['a', 'b', 'c', 'd', 'e'].map((slug, i) => ({
      slug,
      data: { company: `Co${i}`, start: `201${i}-01` },
    }));
    const nav = experiencesNav('en', roles, 'c');
    expect(nav.title).toBe('Experiences');
    expect(nav.titleHref).toBe('/experiences/');
    expect(nav.links.map((l) => l.href)).toEqual(roles.map((r) => `/experiences/${r.slug}/`));
    expect(nav.links.map((l) => !!l.current)).toEqual([false, false, true, false, false]);
    expect(nav.pill?.href).toBe('/cv.pdf');
    expect(experiencesNav('vi', roles).links[0].href).toBe('/vi/experiences/a/');
  });
});

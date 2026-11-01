import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import CareerRail from '../../src/components/home/CareerRail.astro';
import Chapter from '../../src/components/experiences/Chapter.astro';
import DotList from '../../src/components/ui/DotList.astro';
import SectionHeader from '../../src/components/tile/SectionHeader.astro';
import SiteIndex from '../../src/components/ui/SiteIndex.astro';
import { careerRail } from '../../src/lib/home';
import { projectsNav } from '../../src/lib/localnav';

const render = async (component: never, props: Record<string, unknown>, slots = {}) =>
  (await AstroContainer.create()).renderToString(component, { props, slots });

describe('SectionHeader slots', () => {
  it('renders the eyebrow prop and no empty eyebrow or actions', async () => {
    const html = await render(SectionHeader as never, {
      title: 'Data Engineer.',
      eyebrow: 'Jan 2023 – Jul 2026',
      subline: 'Datum',
    });
    expect(html).toContain('Jan 2023 – Jul 2026');
    expect(html).not.toMatch(/<p class="t-eyebrow[^"]*"[^>]*>\s*<\/p>/);
    expect(html).not.toContain('class="actions');
  });
  it('leaves out the eyebrow when there is none', async () => {
    const html = await render(SectionHeader as never, { title: 'Get the highlights.' });
    expect(html).not.toContain('t-eyebrow');
    expect(html).not.toContain('class="actions');
  });
  it('renders a slotted eyebrow and actions when given', async () => {
    const html = await render(
      SectionHeader as never,
      { title: 'T' },
      { eyebrow: 'Slotted', actions: '<a href="/x">Go</a>' },
    );
    expect(html).toContain('Slotted');
    expect(html).toContain('<a href="/x">Go</a>');
  });
});

describe('Chapter layout', () => {
  const role = {
    slug: 'acme',
    body: '- **A:** one',
    data: {
      company: 'Acme',
      role: 'Engineer',
      location: 'Ho Chi Minh City, Vietnam',
      start: '2024',
      end: '2025-03',
      tech: [],
    },
  };
  it('is sticky with one card, the eyebrow is the date, the location is in the subhead', async () => {
    const html = await render(Chapter as never, { role, lang: 'en', tone: 'bg', stories: [] });
    expect(html).toContain('chapter--sticky');
    expect(html).toMatch(/<span class="date-range">2024 – Mar 2025<\/span>/);
    expect(html).toContain('Acme · Ho Chi Minh City, Vietnam');
  });
  it('is not sticky with no cards', async () => {
    const html = await render(Chapter as never, {
      role: { ...role, body: '' },
      lang: 'en',
      tone: 'bg',
      stories: [],
    });
    expect(html).not.toContain('chapter--sticky');
  });
});

describe('careerRail', () => {
  const roles = [
    { company: 'FPT Software', start: '2026-08', end: null },
    { company: 'Datum', start: '2024', end: '2026-03' },
    { company: 'Datum', start: '2021', end: '2024' },
    { company: 'FPT Software', start: '2020', end: '2021' },
    { company: 'Hitachi Vantara Vietnam', start: '2019', end: '2020' },
  ];
  const rail = careerRail(roles, new Date(2026, 9, 31));
  it('has one row per company, newest first, and merges back-to-back stints', () => {
    expect(rail.rows.map((r) => r.company)).toEqual([
      'FPT Software',
      'Datum',
      'Hitachi Vantara Vietnam',
    ]);
    expect(rail.rows[0].stints).toHaveLength(2);
    expect(rail.rows[1].stints).toHaveLength(1);
    expect(rail.firstYear).toBe('2019');
    expect(rail.lastYear).toBe('2026');
  });
  it('keeps every stint inside the career span', () => {
    for (const row of rail.rows)
      for (const s of row.stints) {
        expect(s.w).toBeGreaterThan(0);
        expect(s.w).toBeLessThanOrEqual(1);
        expect(s.s + s.w).toBeLessThanOrEqual(1.001);
      }
    expect(rail.rows[0].stints.map((s) => s.current)).toEqual([false, true]);
  });
  it('renders aria-hidden bars, years and a hidden sentence per row', async () => {
    const html = await render(CareerRail as never, { lang: 'en', rail });
    expect(html.match(/<li[ >]/g)).toHaveLength(3);
    expect(html.match(/<hr[^>]*aria-hidden/g) ?? html.match(/<hr/g)).toBeTruthy();
    expect(html).toContain('2020–2021 · 2026–now');
    expect(html).toContain('FPT Software: 2020 to 2021, and 2026 to now.');
    expect(html).toContain('data-reveal-group');
  });
  it('is empty with no roles', () => {
    expect(careerRail([]).rows).toEqual([]);
  });
});

describe('DotList', () => {
  it('keeps each item in a nowrap span that carries its own trailing separator', async () => {
    const html = await render(DotList as never, { items: ['A', 'B', { text: 'C', href: '/c' }] });
    expect(html.match(/class="nw"/g)).toHaveLength(3);
    expect(html.match(/class="sep"/g)).toHaveLength(2);
    expect(html).toContain('<a href="/c">C</a>');
    expect(html.replace(/<[^>]+>/g, '')).toBe('A · B · C');
  });
});

describe('SiteIndex', () => {
  it('writes the stagger positions into the HTML at build time', async () => {
    const html = await render(SiteIndex as never, {
      label: 'Site index',
      groups: [
        {
          title: 'One',
          links: [
            { href: '/a', label: 'A' },
            { href: '/b', label: 'B' },
          ],
        },
        { title: 'Two', links: [{ href: '/c', label: 'C' }] },
      ],
    });
    expect(html).toContain('--g:0;--k:1');
    expect(html).toContain('--g:1;--k:0');
  });
});

describe('Projects Expand all', () => {
  it('is a toggle with a collapse label', () => {
    const nav = projectsNav('en', ['personal'], { personal: 1 });
    const expand = nav.links.find((l) => l.data?.expand);
    expect(expand?.label).toBe('Expand all');
    expect(expand?.toggleLabel).toBe('Collapse all');
  });
});

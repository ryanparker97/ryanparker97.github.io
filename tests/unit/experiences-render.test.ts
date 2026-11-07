import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Chapter from '../../src/components/experiences/Chapter.astro';

const render = async (props: Record<string, unknown>) =>
  (await AstroContainer.create()).renderToString(Chapter as never, { props });

const role = (body: string, extra: Record<string, unknown> = {}) => ({
  slug: 'acme-engineer',
  body,
  data: {
    company: 'Acme',
    client: undefined,
    role: 'Engineer',
    location: 'Hanoi',
    start: '2024',
    end: '2025-03',
    tech: ['Python', 'SQL'],
    ...extra,
  },
});

describe('Chapter', () => {
  it('highlights tech terms (bold or not) and keeps other bold plain', async () => {
    const html = await render({
      role: role('- **A:** Led **7 engineers** on **Python** and sql.'),
      lang: 'en',
      tone: 'surface',
      stories: [],
    });
    expect(html).toContain('<mark class="tech">Python</mark>');
    expect(html).toContain('<mark class="tech tech--end">sql</mark>');
    expect(html).toContain('<strong>7 engineers</strong>');
  });

  it('renders one card per bullet, with bold kept and body-only cards for unlabelled bullets', async () => {
    const html = await render({
      role: role('- **A:** one **x**\n- no label **y**\n- **C**: three'),
      lang: 'en',
      tone: 'surface',
      stories: [],
    });
    expect(html.match(/class="card hl-card"/g)).toHaveLength(3);
    expect(html.match(/<h3 class="t-card"/g)).toHaveLength(2);
    expect(html).toContain('<strong>x</strong>');
    expect(html).toContain('<strong>y</strong>');
    expect(html).toContain('2024 – Mar 2025');
    expect(html).toContain('Acme · Hanoi');
    expect(html).not.toContain('Current');
    expect(html).toContain('aria-label="Tech stack"');
    expect(html.match(/<li class="chip chip-mint"[^>]*>/g)).toHaveLength(2);
    expect(html).not.toContain('tech-line');
    expect(html).not.toContain('STAR');
  });

  it('with a heading prop: plain H2, no dates or Current chip, cards and chips still render', async () => {
    const html = await render({
      role: role('- **A:** x\n- **B:** y', { end: undefined }),
      lang: 'en',
      tone: 'surface',
      stories: [],
      heading: { title: 'Highlights.' },
    });
    expect(html).toMatch(/<h2[^>]*>\s*Highlights\.\s*<\/h2>/);
    expect(html).not.toContain('date-range');
    expect(html).not.toContain('current-chip');
    expect(html.match(/class="card hl-card"/g)).toHaveLength(2);
    expect(html).toContain('aria-label="Tech stack"');
  });

  it('shows the Current chip for an ongoing role and picks the STAR pill by story count', async () => {
    const one = await render({
      role: role('- **A:** x', { end: undefined }),
      lang: 'en',
      tone: 'bg',
      stories: ['s1'],
    });
    expect(one).toContain('Current');
    expect(one).toContain('href="/star/s1/"');
    expect(one).toContain('Read the STAR story');
    const many = await render({
      role: role('- **A:** x'),
      lang: 'vi',
      tone: 'bg',
      stories: ['a', 'b'],
    });
    expect(many).toContain('href="/vi/star/#acme-engineer"');
    expect(many).toContain('2 câu chuyện STAR');
  });
});

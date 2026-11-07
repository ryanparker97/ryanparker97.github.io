import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Stat from '../../src/components/tile/Stat.astro';
import StatStrip from '../../src/components/tile/StatStrip.astro';

const render = async (component: never, props: Record<string, unknown>) =>
  (await AstroContainer.create()).renderToString(component, { props });

describe('stat lockup (spec §5.10.5)', () => {
  it('renders caption above, value and caption below in reading order', async () => {
    const html = await render(Stat as never, { above: 'Cut', value: '>50%', below: 'EMR costs' });
    expect(html.indexOf('Cut')).toBeLessThan(html.indexOf('&gt;50%'));
    expect(html.indexOf('&gt;50%')).toBeLessThan(html.indexOf('EMR costs'));
    expect(html).toContain('class="stat-value"');
    expect(html).not.toContain('aria-label');
  });

  it('marks the super stat', async () => {
    const html = await render(Stat as never, { value: '7', below: 'engineers', super: true });
    expect(html).toContain('stat--super');
  });
});

describe('stat strip', () => {
  const stats = [
    { value: '7', below: 'engineers' },
    { value: '>50%', below: 'EMR costs' },
    { value: '2019', below: 'first role' },
  ];

  it('renders a footnote ref after the lower caption, outside the value', async () => {
    const html = await render(Stat as never, {
      value: '>50%',
      below: 'EMR costs',
      ref: { n: 2, label: 'Footnote 2' },
    });
    expect(html).toContain('href="#fn-2"');
    expect(html).toContain('id="fnref-2"');
    expect(html).toContain('aria-label="Footnote 2"');
    expect(html).toMatch(/class="stat-value">&gt;50%<\/span>/);
  });

  it('is a labelled list that stays three across at S when values are short', async () => {
    const html = await render(StatStrip as never, { stats, label: 'At a glance' });
    expect(html).toContain('<ul');
    expect(html).toContain('aria-label="At a glance"');
    expect(html).toContain('stat-strip--compact');
    expect(html.match(/<li/g)).toHaveLength(3);
  });

  it('stacks when a value is longer than five characters, and keeps at most three', async () => {
    const long = [...stats, { value: 'Azure Databricks', below: 'platform' }];
    const html = await render(StatStrip as never, { stats: long, label: 'At a glance' });
    expect(html).not.toContain('stat-strip--compact');
    expect(html.match(/<li/g)).toHaveLength(3);
  });

  it('uses the card sizes for the card variant', async () => {
    const html = await render(StatStrip as never, {
      stats,
      label: 'At a glance',
      variant: 'card',
    });
    expect(html).toContain('stat-strip--card');
  });
});

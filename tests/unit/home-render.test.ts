import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import StatStrip from '../../src/components/tile/StatStrip.astro';
import { highlightStats } from '../../src/lib/home';
import { t } from '../../src/i18n';

const render = async (component: never, props: Record<string, unknown>) =>
  (await AstroContainer.create()).renderToString(component, { props });

describe('StatStrip', () => {
  it('renders one lockup per stat, with the caption above and below', async () => {
    const stats = highlightStats({
      years: '5+',
      yearsLabel: 'years of experience',
      metric: { value: '7', label: 'engineers' },
      metricPrefix: 'Led',
    });
    const html = await render(StatStrip as never, { stats, label: 'At a glance' });
    expect(html.match(/class="stat-value"/g)).toHaveLength(2);
    expect(html).toContain('Led');
    expect(html).toContain('stat-strip--compact');
  });
});

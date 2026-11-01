import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import CertificationsTile from '../../src/components/home/CertificationsTile.astro';
import StatStrip from '../../src/components/tile/StatStrip.astro';
import StoryTile from '../../src/components/home/StoryTile.astro';
import WritingTile from '../../src/components/home/WritingTile.astro';
import { highlightStats } from '../../src/lib/home';
import { t } from '../../src/i18n';

const render = async (component: never, props: Record<string, unknown>) =>
  (await AstroContainer.create()).renderToString(component, { props });

const cert = (n: number, extra: Record<string, unknown> = {}) =>
  ({
    data: { name: `Cert ${n}`, issuer: 'Issuer', year: '2024', monogram: `C${n}`, ...extra },
  }) as never;

describe('WritingTile', () => {
  it('shows the empty state with no actions when there are no posts', async () => {
    const html = await render(WritingTile as never, { lang: 'en' });
    expect(html).toContain(t('en', 'home.writing.empty'));
    expect(html).not.toContain('class="btn');
    expect(html).toContain('id="writing"');
  });

  it('shows a short headline, the date and two actions for a post', async () => {
    const post = {
      slug: 'p',
      minutes: 7,
      data: {
        title: 'Neovim setup guide, Part 1: from zero to a working editor',
        pubDate: new Date('2026-10-30'),
        series: 'neovim-setup-guide',
        seriesPart: 1,
      },
    };
    const html = await render(WritingTile as never, {
      lang: 'en',
      post,
      seriesTitle: 'Neovim setup guide',
    });
    expect(html).toMatch(/<h2[^>]*>Neovim setup guide, Part 1<\/h2>/);
    expect(html.match(/class="btn /g)).toHaveLength(2);
    expect(html).toContain('/blog/series/neovim-setup-guide/');
  });
});

describe('CertificationsTile', () => {
  it('shows 3 rows, "+N more", a monogram fallback and Verify only with a URL', async () => {
    const certs = [
      cert(1, { credentialUrl: 'https://example.com/v' }),
      cert(2),
      cert(3),
      cert(4),
      cert(5),
    ];
    const html = await render(CertificationsTile as never, { lang: 'en', certs });
    expect(html.match(/\sdata-cert(?=[\s>])/g)).toHaveLength(3);
    expect(html).toContain('+2 more');
    expect(html).toContain('data-monogram');
    expect(html.match(/>\s*Verify\s*</g)).toHaveLength(1);
    expect(html).toContain('rel="noopener"');
    expect(html).not.toContain('class="btn');
  });

  it('shows the issuer logo instead of the monogram when one is set', async () => {
    const html = await render(CertificationsTile as never, {
      lang: 'en',
      certs: [cert(1, { logo: 'logos:aws' })],
    });
    expect(html).toContain('data-logo');
    expect(html).toContain('<svg');
    expect(html).not.toContain('data-monogram');
  });

  it('omits "+N more" at three or fewer', async () => {
    const html = await render(CertificationsTile as never, {
      lang: 'en',
      certs: [cert(1), cert(2)],
    });
    expect(html).not.toContain('more');
    expect(html).not.toContain('tile--span');
  });

  it('adds the span class for an odd-count grid', async () => {
    const html = await render(CertificationsTile as never, {
      lang: 'en',
      certs: [cert(1)],
      span: true,
    });
    expect(html).toContain('grid-tile--span');
  });
});

describe('StoryTile', () => {
  const story = (metrics: { label: string; value: string }[]) =>
    ({
      slug: 's',
      data: {
        title: 'A story',
        question: 'Tell me about a time?',
        competencies: ['leadership', 'ownership', 'technical-depth', 'communication'],
        metrics,
      },
    }) as never;

  it('shows the super stat, max 3 chips and two actions', async () => {
    const html = await render(StoryTile as never, {
      lang: 'en',
      story: story([{ label: 'jobs migrated', value: '120' }]),
    });
    expect(html).toContain('stat--super');
    expect(html).toContain('jobs migrated');
    expect(html.match(/class="chip"/g)).toHaveLength(3);
    expect(html.match(/class="btn /g)).toHaveLength(2);
    expect(html).toContain('/star/s/');
  });

  it('has no super stat when no metric has a digit', async () => {
    const html = await render(StoryTile as never, {
      lang: 'en',
      story: story([{ label: 'x', value: 'unchanged' }]),
    });
    expect(html).not.toContain('stat--super');
  });
});

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

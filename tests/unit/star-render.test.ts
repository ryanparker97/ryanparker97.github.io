import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it, vi } from 'vitest';
import StoryCard from '../../src/components/star/StoryCard.astro';
import Art from '../../src/assets/art/star-steps.svg';
import StatCard from '../../src/components/tile/StatCard.astro';
import BaseLayout from '../../src/layouts/BaseLayout.astro';

// The footer reads the profile collection, whose data store only exists after `astro build`
// (not after `astro check` or `astro sync`), so CI's unit-test job gets a fixture instead.
vi.mock('../../src/lib/content', async (original) => ({
  ...(await original<typeof import('../../src/lib/content')>()),
  getProfile: async () => ({
    entry: {},
    fallback: false,
    data: {
      email: 'me@example.com',
      phone: '+10000000000',
      socials: { linkedin: 'https://example.com/in', github: 'https://example.com/gh' },
    },
  }),
}));

const story = (sample: boolean, metrics: unknown[] = [], image?: unknown, imageAlt?: string) =>
  ({
    slug: 'fixture',
    data: {
      title: 'Fixture story',
      question: 'Q?',
      competencies: ['ownership'],
      metrics,
      sample,
      image,
      imageAlt,
    },
  }) as never;

const render = async (
  sample: boolean,
  metrics: unknown[] = [],
  anchor = false,
  image?: unknown,
  imageAlt?: string,
) =>
  (await AstroContainer.create()).renderToString(StoryCard as never, {
    props: {
      story: story(sample, metrics, image, imageAlt),
      lang: 'en',
      roleId: 'other',
      anchor,
      index: 0,
    },
  });

describe('StoryCard', () => {
  it('shows the Sample marker only for sample stories', async () => {
    expect(await render(true)).toContain('Sample');
    expect(await render(false)).not.toContain('Sample');
  });
  it('carries the filter and anchor hooks', async () => {
    const html = await render(false);
    expect(html).toContain('data-story');
    expect(html).toContain('data-slug="fixture"');
    expect(html).toContain('data-role="other"');
    expect(html).toContain('data-competencies="ownership"');
    expect(html).not.toContain('id="other"');
    expect(await render(false, [], true)).toContain('id="other"');
  });
  it('renders the question as the card body', async () => {
    expect(await render(false)).toMatch(/stat-card__body[^>]*>Q\?</);
  });
  it('has no value without metrics, and a words value for a word-only metric', async () => {
    expect(await render(false)).not.toContain('stat-card__value');
    expect(await render(false, [{ label: 'scope', value: 'unchanged' }])).toContain(
      'stat-card__value--words',
    );
    expect(await render(false, [{ label: 'cost', value: '52%' }])).not.toContain(
      'stat-card__value--words',
    );
  });
});

describe('StoryCard image', () => {
  it('renders one inline labelled SVG between the body and the value', async () => {
    const html = await render(false, [{ label: 'cost', value: '52%' }], false, Art, 'A diagram');
    expect(html.match(/stat-card__media/g)).toHaveLength(1);
    expect(html).toMatch(/stat-card__media[^>]*>\s*<svg[^>]*role="img"[^>]*aria-label="A diagram"/);
    expect(html.indexOf('stat-card__body')).toBeLessThan(html.indexOf('stat-card__media'));
    expect(html.indexOf('stat-card__media')).toBeLessThan(html.indexOf('stat-card__value'));
  });
  it('renders no media without an image or without alt text', async () => {
    expect(await render(false)).not.toContain('stat-card__media');
    expect(await render(false, [], false, Art, ' ')).not.toContain('stat-card__media');
  });
});

describe('StatCard without the story props', () => {
  it('renders no eyebrow, body or data attribute', async () => {
    const html = await (
      await AstroContainer.create()
    ).renderToString(StatCard as never, {
      props: { headline: 'H', value: '1', index: 0 },
    });
    expect(html).not.toContain('stat-card__eyebrow');
    expect(html).not.toContain('stat-card__body');
    expect(html).not.toContain('stat-card__media');
    expect(html).not.toMatch(/ data-(?!reveal|stat-card|astro-cid)/);
  });
});

// The untranslated-VI fallback has no real content any more, so the layout is rendered directly.
describe('BaseLayout fallback banner', () => {
  const page = async (fallback: boolean) =>
    (
      await AstroContainer.create({
        astroConfig: { site: 'https://ryanparker97.github.io' } as never,
      })
    ).renderToString(BaseLayout as never, {
      props: { title: 'T', description: 'D', lang: 'vi', fallback },
      request: new Request('https://ryanparker97.github.io/vi/star/fixture/'),
      slots: { default: '<p>body</p>' },
    });

  it('shows the English-only note, English html lang and no vi alternate', async () => {
    const html = await page(true);
    expect(html).toContain('role="note"');
    expect(html).toContain('Nội dung này hiện chỉ có bằng tiếng Anh.');
    expect(html).toMatch(/<html[^>]*lang="en"/);
    expect(html).not.toContain('hreflang="vi"');
    expect(html).toContain('rel="canonical" href="https://ryanparker97.github.io/star/fixture/"');
  });
  it('has no note for a translated page', async () => {
    expect(await page(false)).not.toContain('role="note"');
  });
});

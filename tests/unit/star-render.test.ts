import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import StarCard from '../../src/components/star/StarCard.astro';
import BaseLayout from '../../src/layouts/BaseLayout.astro';

const story = (sample: boolean) =>
  ({
    slug: 'fixture',
    data: {
      title: 'Fixture story',
      question: 'Q?',
      competencies: ['ownership'],
      metrics: [],
      sample,
    },
    rendered: {
      html: '<p>Lead note</p><h2>Situation</h2><p>s</p><h2>Task</h2><p>t</p><h2>Action</h2><p>a</p><h2>Result</h2><p>r</p>',
    },
  }) as never;

const render = async (sample: boolean) =>
  (await AstroContainer.create()).renderToString(StarCard as never, {
    props: { story: story(sample), lang: 'en' },
  });

// The sample marker has no real content any more, so it is covered with an in-test fixture.
describe('StarCard sample marker', () => {
  it('shows the Sample chip and the lead note only for sample stories', async () => {
    const sample = await render(true);
    expect(sample).toContain('>Sample<');
    expect(sample).toContain('Lead note');
    expect(await render(false)).not.toContain('>Sample<');
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

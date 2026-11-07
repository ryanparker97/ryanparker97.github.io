import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import StoryChapter from '../../src/components/home/StoryChapter.astro';

const render = async (metrics: { value: string; label: string; prefix?: string }[]) =>
  (await AstroContainer.create()).renderToString(StoryChapter as never, {
    props: {
      lang: 'en',
      story: {
        slug: 's',
        data: { title: 'The title', question: 'The question?', metrics },
      },
    },
  });

describe('StoryChapter', () => {
  it('shows title, question, two actions and the first two metrics', async () => {
    const html = await render([
      { value: '>50%', label: 'cost', prefix: 'Cut' },
      { value: 'unchanged', label: 'performance' },
    ]);
    expect(html).toMatch(/<h2[^>]*>The title<\/h2>/);
    expect(html).toContain('The question?');
    expect(html.match(/class="stat[" ]/g)).toHaveLength(2);
    expect(html).toContain('&gt;50%');
    expect(html).toContain('unchanged');
    expect(html.match(/class="btn /g)).toHaveLength(2);
    expect(html).toContain('href="/star/s/"');
    expect(html).toContain('href="/star/"');
  });

  it('uses only the first two metrics, digits or not', async () => {
    const html = await render([
      { value: 'unchanged', label: 'a' },
      { value: 'zero', label: 'b' },
      { value: '9x', label: 'c' },
    ]);
    expect(html).toContain('unchanged');
    expect(html).toContain('zero');
    expect(html).not.toContain('9x');
  });

  it('omits the strip when the story has no metrics', async () => {
    const html = await render([]);
    expect(html).not.toContain('stat-strip');
  });
});

import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import CloserLook from '../../src/components/tile/CloserLook.astro';

const render = async (props: Record<string, unknown>) =>
  (await AstroContainer.create()).renderToString(CloserLook as never, { props });

const item = (label: string | null, text: string) => ({
  label,
  body: [{ text, bold: false }],
});
const items = [
  item('One', 'first body'),
  item(null, 'unlabelled body'),
  item('Two', 'second body'),
  item('Three', 'third body'),
];

describe('CloserLook', () => {
  it('renders one item per labelled entry with every caption and no buttons', async () => {
    const html = await render({ id: 'closer', items, labelledby: 'x' });
    expect(html.match(/class="closer-item/g)).toHaveLength(3);
    expect(html.match(/<h3[^>]*class="[^"]*closer-label/g)).toHaveLength(3);
    expect(html.match(/class="[^"]*closer-cap/g)).toHaveLength(3);
    for (const b of ['first body', 'second body', 'third body']) expect(html).toContain(b);
    expect(html).not.toContain('unlabelled body');
    expect(html).not.toContain('<button');
    expect(html).toContain('id="closer-c2"');
    expect(html).toContain('data-closer');
  });

  it('has no media block without an image', async () => {
    const html = await render({ id: 'closer', items, labelledby: 'x' });
    expect(html).not.toContain('closer-media');
  });
});

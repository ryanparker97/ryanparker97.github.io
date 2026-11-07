import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Footnotes from '../../src/components/tile/Footnotes.astro';
import { numberNotes } from '../../src/lib/footnotes';

const render = async (props: Record<string, unknown>) =>
  (await AstroContainer.create()).renderToString(Footnotes as never, { props });

describe('numberNotes', () => {
  it('numbers only items with a note, in order', () => {
    const { items, notes } = numberNotes(
      [{ note: 'a' }, {}, { note: 'b' }],
      (n) => `Footnote ${n}`,
    );
    expect(items[0]?.ref).toEqual({ n: 1, label: 'Footnote 1' });
    expect(items[1]?.ref).toBeUndefined();
    expect(items[2]?.ref).toEqual({ n: 2, label: 'Footnote 2' });
    expect(notes).toEqual([
      { n: 1, text: 'a' },
      { n: 2, text: 'b' },
    ]);
  });

  it('returns no notes when none exist', () => {
    expect(numberNotes([{}, {}], (n) => `${n}`).notes).toEqual([]);
  });
});

describe('Footnotes component', () => {
  const back = (n: number) => `Back to reference ${n}`;

  it('renders ids, back links and a screen-reader title', async () => {
    const html = await render({
      notes: [
        { n: 1, text: 'a' },
        { n: 2, text: 'b' },
      ],
      title: 'Footnotes',
      back,
    });
    expect(html).toContain('id="fn-1"');
    expect(html).toContain('href="#fnref-2"');
    expect(html).toContain('aria-label="Back to reference 2"');
    expect(html).toContain('class="sr-only"');
  });

  it('renders nothing for no notes', async () => {
    expect((await render({ notes: [], title: 'Footnotes', back })).trim()).toBe('');
  });
});

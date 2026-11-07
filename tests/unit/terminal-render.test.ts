import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import TerminalLoop from '../../src/components/media/TerminalLoop.astro';

const props = {
  title: 'AI-DLC Conductor',
  lines: ['spec', 'plan', 'implement', 'test', 'ship', 'maintain'],
  pauseLabel: 'Pause animation',
  caption: 'Terminal loop: AI-DLC Conductor',
};

describe('terminal loop', () => {
  it('renders a hidden window, a static transcript and a pause button', async () => {
    const html = await (
      await AstroContainer.create()
    ).renderToString(TerminalLoop as never, {
      props,
    });
    expect(html).toMatch(
      /class="[^"]*term__window[^"]*"[^>]*aria-hidden="true"|aria-hidden="true"[^>]*class="[^"]*term__window/,
    );
    expect(html.match(/<li/g)).toHaveLength(6);
    expect(html).toContain(
      'Terminal loop: AI-DLC Conductor: spec, plan, implement, test, ship, maintain.',
    );
    expect(html).toContain('aria-pressed="false"');
    expect(html).toMatch(/<button[^>]*\shidden/);
    expect(html).toContain('--n:6');
  });
});

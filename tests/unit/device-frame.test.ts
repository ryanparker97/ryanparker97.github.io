import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import DeviceFrame from '../../src/components/media/DeviceFrame.astro';

const slot = '<img alt="Dashboard" width="1280" height="720" src="/x.png">';

const render = async (props: Record<string, unknown> = {}) =>
  (await AstroContainer.create()).renderToString(DeviceFrame as never, {
    props,
    slots: { default: slot },
  });

describe('device frame', () => {
  it('renders the laptop by default and keeps the slotted alt', async () => {
    const html = await render();
    expect(html).toContain('device device--laptop');
    expect(html).toContain('data-device="laptop"');
    expect(html).toContain('alt="Dashboard"');
  });

  it('renders the screen kind', async () => {
    expect(await render({ kind: 'screen' })).toContain('device--screen');
  });

  it('adds no svg, text or aria-label', async () => {
    const html = await render();
    expect(html).not.toContain('<svg');
    expect(html).not.toContain('<text');
    expect(html).not.toContain('aria-label');
  });
});

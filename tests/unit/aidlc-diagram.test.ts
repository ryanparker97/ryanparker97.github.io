import { readFileSync } from 'node:fs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import AidlcKitDiagram from '../../src/components/blog/diagrams/AidlcKitDiagram.astro';

const path = 'src/components/blog/diagrams/AidlcKitDiagram.astro';

const render = async (lang: 'en' | 'vi') =>
  (await AstroContainer.create()).renderToString(AidlcKitDiagram as never, { props: { lang } });

const EN_TITLE = 'How a run moves through the AI-DLC kit';
const GATES = ['spec_ready', 'unit_done', 'review_now', 'review_risk'];
const PHASES = ['Inception', 'Construction', 'Review'];

const svgOf = (html: string, kind: 'h' | 'v') =>
  html.match(new RegExp(`<svg class="diagram-${kind}"[\\s\\S]*?</svg>`))![0];

describe.each(['en', 'vi'] as const)('AidlcKitDiagram (%s)', (lang) => {
  it('renders two labelled SVGs with a screen-reader list', async () => {
    const html = await render(lang);
    expect(html.match(/role="img"/g)).toHaveLength(2);
    expect(html).toContain('<title id="aidlc-h-title">');
    expect(html).toContain('<title id="aidlc-v-title">');
    expect(html).toContain('<desc id="aidlc-h-desc"');
    expect(html).toContain('<desc id="aidlc-v-desc"');
    const list = html.match(/<ol class="[^"]*sr-only[^"]*"[^>]*>([\s\S]*?)<\/ol>/);
    expect(list).not.toBeNull();
    expect(list![1].match(/<li/g)).toHaveLength(6);
  });

  it('has unique ids, all prefixed aidlc-h- or aidlc-v-', async () => {
    const html = await render(lang);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^aidlc-[hv]-/);
  });

  it('keeps tool, gate and phase names untranslated', async () => {
    const html = await render(lang);
    for (const name of ['Codex', 'Jev', ...GATES, ...PHASES]) expect(html).toContain(name);
    expect(html.includes(EN_TITLE)).toBe(lang === 'en');
  });

  it.each(['h', 'v'] as const)('draws the whole lifecycle in the %s layout', async (kind) => {
    const svg = svgOf(await render(lang), kind);
    for (const name of [...GATES, ...PHASES, 'Antigravity', 'Codex', 'Claude', 'Jev'])
      expect(svg, name).toContain(name);
    // four gate bars, two sign-off chips (the intent chip is human but not a sign-off)
    expect(svg.match(/class="gate"/g)).toHaveLength(4);
    expect(svg.match(/class="node human signoff"/g)).toHaveLength(2);
    expect(svg.match(/class="node human"/g)).toHaveLength(1);
    expect(svg.match(/class="node phase"/g)).toHaveLength(3);
  });

  it('lists the phases in order in both layouts', async () => {
    const html = await render(lang);
    for (const kind of ['h', 'v'] as const) {
      const svg = svgOf(html, kind);
      const at = (n: string) => svg.indexOf(`>${n}<`);
      expect(at('Inception')).toBeGreaterThan(-1);
      expect(at('Inception')).toBeLessThan(at('Construction'));
      expect(at('Construction')).toBeLessThan(at('Review'));
    }
  });

  it('keeps the vertical viewBox 300 wide and at most 960 tall', async () => {
    const vb = svgOf(await render(lang), 'v').match(/viewBox="0 0 300 ([\d.]+)"/);
    expect(vb).not.toBeNull();
    expect(Number(vb![1])).toBeLessThanOrEqual(960);
  });
});

describe('AidlcKitDiagram vi label length', () => {
  // Heuristic only: the e2e fit test is the real guard. Each label is checked against the
  // width of the nearest rect that precedes it in the markup (its own box: the component
  // writes every box before its labels). About 8 SVG units per Vietnamese character at 15.5px.
  it.each(['h', 'v'] as const)(
    'keeps every %s-layout label short enough for its box',
    async (kind) => {
      const svg = svgOf(await render('vi'), kind);
      let width = 0;
      let checked = 0;
      for (const m of svg.matchAll(/<rect[^>]*>|<text[^>]*>([\s\S]*?)<\/text>/g)) {
        if (m[0].startsWith('<rect')) {
          const w = Number(m[0].match(/\bwidth="([\d.]+)"/)?.[1]);
          // the lane band is a background, not a label box
          width = m[0].includes('lane-bg') ? 0 : w;
          continue;
        }
        if (!width) continue; // lane labels sit outside any box
        const label = m[1]
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        expect(label.length, `${label} in a ${width}-wide box`).toBeLessThanOrEqual(
          Math.floor((width - 8) / 8),
        );
        checked += 1;
      }
      expect(checked).toBeGreaterThan(20);
    },
  );
});

describe('AidlcKitDiagram source', () => {
  it('uses only CSS tokens for colour in its style block', () => {
    const style = readFileSync(path, 'utf8').match(/<style>([\s\S]*?)<\/style>/);
    expect(style).not.toBeNull();
    expect(style![1]).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(style![1]).not.toMatch(/\b(rgb|hsl)a?\(/);
  });

  it('keeps text at 15.5px or larger', () => {
    const src = readFileSync(path, 'utf8');
    const sizes = [...src.matchAll(/font-size:\s*([\d.]+)px/g)].map((m) => Number(m[1]));
    expect(sizes.length).toBeGreaterThan(0);
    for (const s of sizes) expect(s).toBeGreaterThanOrEqual(15.5);
  });
});

import type { ShikiConfig } from 'astro';
import type { Element, ElementContent } from 'hast';
import { ensureContrast } from './contrast';

type ShikiTransformer = NonNullable<ShikiConfig['transformers']>[number];

const SHELL = new Set(['sh', 'shell', 'bash', 'zsh', 'console']);

/** Parses a meta string such as `title="lua/lazy.lua" {3-5,8}`. */
export function parseCodeMeta(meta = ''): { title?: string; highlight: Set<number> } {
  const title = /title="([^"]*)"/.exec(meta)?.[1];
  const highlight = new Set<number>();
  for (const part of /\{([\d,\s-]+)\}/.exec(meta)?.[1].split(',') ?? []) {
    const [from, to = from] = part.split('-').map((n) => parseInt(n, 10));
    for (let i = from; i <= to; i++) if (Number.isFinite(i)) highlight.add(i);
  }
  return { title, highlight };
}

/** Must equal `--fill` in src/styles/tokens.css (guarded by a unit test). */
export const HIGHLIGHT_BG = { light: '#e8e8ed', dark: '#333336' } as const;

/** Darkens/lightens token colours on a highlighted line until they reach 4.5:1 on `--fill`. */
export function liftContrast(line: Element): void {
  const walk = (node: Element) => {
    for (const child of node.children) {
      if (child.type !== 'element') continue;
      const style = child.properties.style;
      if (typeof style === 'string') {
        child.properties.style = style.replace(
          /--shiki-(light|dark):(#[0-9a-fA-F]{6})(?![0-9a-fA-F])/g,
          (_m, mode: 'light' | 'dark', c: string) =>
            `--shiki-${mode}:${ensureContrast(c, HIGHLIGHT_BG[mode])}`,
        );
      }
      walk(child);
    }
  };
  walk(line);
}

const el = (
  tagName: string,
  properties: Element['properties'],
  children: Element['children'],
): Element => ({
  type: 'element',
  tagName,
  properties,
  children,
});
const text = (value: string) => ({ type: 'text' as const, value });

/** Title text with a `<wbr>` after every `/`, so long paths break at separators only. */
export function titleNodes(title: string): ElementContent[] {
  const out: ElementContent[] = [];
  title.split(/(?<=\/)/).forEach((part, i, all) => {
    out.push(text(part));
    if (part.endsWith('/') && i < all.length - 1) out.push(el('wbr', {}, []));
  });
  return out;
}

/** Header bar. The language label and Copy button are kept out of the search index. */
export function codeHeader(title: string | undefined, lang: string): Element {
  return el('div', { class: 'code-header' }, [
    el('span', { class: 'code-title' }, title ? titleNodes(title) : []),
    el('span', { class: 'code-lang', 'data-pagefind-ignore': '' }, [text(lang)]),
    el(
      'button',
      { type: 'button', class: 'copy-btn', 'data-copy': '', 'data-pagefind-ignore': '' },
      [text('Copy')],
    ),
  ]);
}

/**
 * Adds a header bar (filename title, language label, Copy button), `{3-5}` line highlights and a
 * non-copyable `$` prompt for shell blocks.
 * Highlighted lines have their token colours lifted to AA contrast on the highlight fill. The Copy button script ignores `.prompt` elements.
 */
export function codeBlockTransformer(): ShikiTransformer {
  return {
    name: 'code-block',
    preprocess(code, options) {
      const { title, highlight } = parseCodeMeta(options.meta?.__raw);
      const prompts = new Set<number>();
      let out = code;
      if (SHELL.has(options.lang)) {
        out = code
          .split('\n')
          .map((l, i) => {
            if (!l.startsWith('$ ')) return l;
            prompts.add(i + 1);
            return l.slice(2);
          })
          .join('\n');
      }
      Object.assign(this.meta, { title, highlight, prompts });
      return out;
    },
    line(node, line) {
      const { highlight, prompts } = this.meta as unknown as {
        highlight: Set<number>;
        prompts: Set<number>;
      };
      if (highlight.has(line)) {
        this.addClassToHast(node, 'highlighted');
        liftContrast(node);
      }
      if (prompts.has(line)) {
        node.children.unshift(el('span', { class: 'prompt', 'aria-hidden': 'true' }, [text('$ ')]));
      }
    },
    root(root) {
      const { title } = this.meta as unknown as { title?: string };
      const lang = this.options.lang;
      const header = codeHeader(title, lang);
      root.children = [
        el('div', { class: 'code-block' }, [header, ...(root.children as Element[])]),
      ];
    },
  };
}

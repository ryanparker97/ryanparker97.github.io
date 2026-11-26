import { readFileSync } from 'node:fs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import HomeNext from '../../src/components/home/HomeNext.astro';
import LetsTalk from '../../src/components/home/LetsTalk.astro';
import { NEXT_MILESTONE, NEXT_STEPS, nextHref } from '../../src/lib/career-next';
import { NEXT_FORBIDDEN, withoutAllowed, withoutStepAllowed } from '../e2e/next-words';
import en from '../../src/i18n/en.json';
import vi from '../../src/i18n/vi.json';

// The profile collection's data store only exists after a build, so the frontmatter is read directly.
const profile = (lang: 'en' | 'vi') => {
  const raw = readFileSync(`src/content/profile/${lang}/index.md`, 'utf8');
  const field = (key: string) => raw.match(new RegExp(`^${key}: '([^']*)'`, 'm'))?.[1] ?? '';
  const spokenLanguages = [
    ...raw.matchAll(/^\s+- language: '([^']*)'\n\s+proficiency: '([^']*)'/gm),
  ].map((m) => ({ language: m[1], proficiency: m[2] }));
  return {
    name: field('name'),
    realName: field('realName'),
    tagline: field('tagline'),
    location: field('location'),
    email: field('email'),
    socials: { linkedin: 'https://www.linkedin.com/in/jomatran' },
    spokenLanguages,
  };
};

const render = (component: unknown, props: Record<string, unknown>) =>
  AstroContainer.create()
    .then((c) => c.renderToString(component as never, { props }))
    .then((html) => html.replace(/ data-astro-cid-\w+/g, ''));

const anchors = (html: string) =>
  [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({
    attrs: m[1],
    // The › is aria-hidden, so the accessible name is the text without it.
    text: m[2]
      .replace(/<span[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/span>/g, '')
      .replace(/<[^>]+>/g, '')
      .trim(),
  }));

const prefixOf = (lang: 'en' | 'vi') => (lang === 'en' ? '' : '/vi');
const strip = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#32;|&nbsp;| /g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ');

describe.each(['en', 'vi'] as const)('HomeNext (%s)', (lang) => {
  const dict = (lang === 'en' ? en : vi) as Record<string, string>;
  const prefix = prefixOf(lang);
  const render1 = () => render(HomeNext, { lang });
  const items = (html: string) =>
    [...html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1]);

  it('is section#next labelled by h2#next-title.home-big, not t-unit', async () => {
    const html = await render1();
    expect(html).toMatch(/<section\b[^>]*\bid="next"[^>]*aria-labelledby="next-title"/);
    expect(html).toMatch(/<h2\b[^>]*id="next-title"[^>]*class="home-big"/);
    expect(html).toContain(`${dict['exp.next.title']}</h2>`);
    expect(html).not.toContain('t-unit');
    expect(html).toContain('data-reveal-group');
  });

  it('holds 2 goals: eyebrow (with a year), h3 title, text and a link to nextHref', async () => {
    const html = await render1();
    const lis = items(html);
    expect(NEXT_STEPS).toHaveLength(2);
    expect(lis).toHaveLength(2);
    NEXT_STEPS.forEach((s, i) => {
      const li = lis[i];
      expect(dict[s.eyebrow]).toMatch(/20\d\d/);
      expect(li).toContain('<p class="home-kicker">');
      expect(strip(li)).toContain(dict[s.eyebrow].replace(/ /g, ' '));
      expect(li).toMatch(/<h3\b[^>]*class="goal-title"/);
      expect(strip(li)).toContain(dict[s.title]);
      expect(strip(li)).toContain(dict[s.text]);
      const links = anchors(li);
      expect(links).toHaveLength(1);
      expect(links[0].attrs).toContain(`href="${nextHref(s, lang)}"`);
      expect(links[0].attrs).toContain(`href="${prefix}/`);
      // Visible text is the accessible name: no aria-label that could differ.
      expect(links[0].attrs).not.toContain('aria-label');
      expect(links[0].text).toBe(dict[s.link]);
    });
    // No link to the old #next anchor on /experiences/.
    expect(html).not.toContain('/experiences/#next');
  });

  it('holds the dated step once, before the goals, as plain text', async () => {
    const html = await render1();
    const step = html.match(/<p\b[^>]*data-next-step[^>]*>[\s\S]*?<\/p>/)![0];
    expect(html.match(/data-next-step/g)).toHaveLength(1);
    const text = strip(step);
    expect(text).toContain(dict[NEXT_MILESTONE.eyebrow]);
    expect(text).toContain(dict[NEXT_MILESTONE.title]);
    expect(html.indexOf(step)).toBeLessThan(html.indexOf('<li'));
    expect(step).not.toMatch(/<a\b|<h\d/);
    expect(html).not.toMatch(/Anthropic/i);
  });

  // owner, photo-logos: old "no svg in the step" -> the milestone's Claude mark, decorative, once.
  it('shows the Claude mark in the step, hidden from assistive tech, with no title', async () => {
    const html = await render1();
    const step = html.match(/<p\b[^>]*data-next-step[^>]*>[\s\S]*?<\/p>/)![0];
    expect(step.match(/<svg\b/g)).toHaveLength(1);
    expect(step).toContain(`data-icon="${NEXT_MILESTONE.logo}"`);
    expect(NEXT_MILESTONE.logo).toBe('logos:claude-icon');
    const svg = step.match(/<svg\b[^>]*>/)![0];
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).not.toMatch(/role=|aria-label/);
    expect(step).not.toMatch(/<title\b|<img\b/);
    expect(html.match(/<svg\b/g)).toHaveLength(1);
  });

  // owner, photo-logos: the owners / no-endorsement note shows with the mark, once, as plain text.
  it('ends with the logo note (skills.logosNote), once, as plain text under the columns', async () => {
    const html = await render1();
    const note = html.match(/<p\b[^>]*class="logos-note"[^>]*>([\s\S]*?)<\/p>/);
    expect(note).not.toBeNull();
    expect(html.match(/logos-note/g)).toHaveLength(1);
    expect(strip(note![1]).trim()).toBe(dict['skills.logosNote']);
    expect(note![1]).not.toMatch(/<a\b|<svg\b/);
    expect(html.indexOf(note![0])).toBeGreaterThan(html.lastIndexOf('</li>'));
  });

  it('has no job-hunt phrase once the two allowed titles and years are removed', async () => {
    const html = await render1();
    // The dated step is carved out and checked against its own exact allow-list.
    const step = html.match(/<p\b[^>]*data-next-step[^>]*>[\s\S]*?<\/p>/);
    expect(step).not.toBeNull();
    const text = strip(html.replace(step![0], ''));
    for (const re of NEXT_FORBIDDEN) expect(withoutAllowed(text), String(re)).not.toMatch(re);
    for (const re of NEXT_FORBIDDEN)
      expect(withoutStepAllowed(strip(step![0])), String(re)).not.toMatch(re);
    // Goal text and link text are checked raw: the allow-list covers only titles and eyebrows.
    for (const s of NEXT_STEPS)
      for (const raw of [dict[s.text], dict[s.link]])
        for (const re of NEXT_FORBIDDEN) expect(raw, String(re)).not.toMatch(re);
  });
});

describe.each(['en', 'vi'] as const)('LetsTalk (%s)', (lang) => {
  const dict = (lang === 'en' ? en : vi) as Record<string, string>;
  const p = profile(lang);
  const render1 = () => render(LetsTalk, { lang, profile: p });

  it('holds no location, no language and no art; only the legal-name line', async () => {
    const html = await render1();
    expect(html).not.toContain(p.location);
    for (const l of p.spokenLanguages) expect(html).not.toContain(l.language);
    expect(html).not.toMatch(/<svg\b|<img\b/);
    expect(html.match(/<li\b/g)).toHaveLength(1);
    expect(html).toMatch(/<li\b[^>]*data-real-name[^>]*>[^<]*Tran Thanh Hai/);
    expect(html).toContain(`>${dict['home.contact.title'].replace(/'/g, '&#39;')}</h2>`);
  });

  it('has the line, then Email me and LinkedIn as centred pills', async () => {
    const html = await render1();
    expect(html).toContain(dict['home.contact.text']);
    const actions = html.match(/class="[^"]*\bactions\b[^"]*"[^>]*>([\s\S]*?)<\/div>/)![1];
    expect(html).toMatch(/class="[^"]*\bactions home-acts\b/);
    const links = anchors(actions);
    expect(links).toHaveLength(2);
    expect(links[0].attrs).toContain(`href="mailto:${p.email}"`);
    expect(links[0].attrs).toContain('btn-primary');
    expect(links[0].text).toBe(dict['home.contact.email']);
    expect(links[1].attrs).toContain(`href="${p.socials.linkedin}"`);
    expect(links[1].attrs).toContain('btn-secondary');
    expect(links[1].text).toBe(dict['cv.linkedin']);
  });

  it('drops the facts list without a legal name', async () => {
    const html = await render(LetsTalk, { lang, profile: { ...p, realName: '' } });
    expect(html).not.toContain('data-facts');
    expect(html).not.toMatch(/<ul\b/);
  });

  it('is section#more with h2#more-title.home-big, not t-unit or t-section', async () => {
    const html = await render1();
    expect(html).toMatch(/<section\b[^>]*\bid="more"[^>]*aria-labelledby="more-title"/);
    // The grey closing band: the house surface section plus the Home band class.
    const cls = html.match(/<section\b[^>]*\bid="more"[^>]*class="([^"]*)"/)?.[1].split(' ');
    expect(cls).toEqual(expect.arrayContaining(['section', 'section--surface', 'home-talk']));
    expect(html).toMatch(/<h2\b[^>]*id="more-title"[^>]*class="home-big"/);
    expect(html).not.toContain('t-unit');
    expect(html).not.toContain('t-section');
  });
});

describe('sources', () => {
  const read = (f: string) => readFileSync(`src/components/home/${f}.astro`, 'utf8');

  it.each(['HomeNext', 'LetsTalk'])('%s: no script, shadow, px text, hex or border', (f) => {
    const src = read(f);
    expect(src).not.toContain('<script');
    expect(src).not.toContain('box-shadow');
    expect(src).not.toMatch(/font-size:\s*[\d.]+px/);
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b(?![\w-])/);
    expect(src).not.toMatch(/border/);
  });

  it('the H2 | path split is photo + gap | 1fr from 735px; the goals are one column until 1069px, then two', () => {
    const src = read('HomeNext');
    expect(src).toMatch(/\.goals \{[^}]*grid-template-columns: minmax\(0, 1fr\);/);
    expect(src).toMatch(
      /@media \(min-width: 735px\) \{[^@]*\.next-in \{[^}]*grid-template-columns: calc\(var\(--home-photo\) \+ var\(--home-photo-gap\)\) minmax\(0, 1fr\);/,
    );
    expect(src).toMatch(
      /@media \(min-width: 1069px\) \{[^@]*\.goals \{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
    );
    expect(src).not.toMatch(/@media \(min-width: 735px\) \{[^@]*repeat\(2/);
    expect(src).not.toContain('margin-left');
  });

  it('HomeNext is a full-width section with 48 / 72 / 96px padding-block', () => {
    const src = read('HomeNext');
    expect(src).toMatch(/<section id="next" class="container-wide next"/);
    expect(src).toMatch(/\.next \{[^}]*padding-block: 48px;/);
    expect(src).toMatch(/@media \(min-width: 735px\) \{[^@]*\.next \{[^}]*padding-block: 72px;/);
    expect(src).toMatch(/@media \(min-width: 1069px\) \{[^@]*\.next \{[^}]*padding-block: 96px;/);
  });

  it('HomeNext: .goals has margin 0, a 28px grid gap below 735px, tops aligned from M', () => {
    const src = read('HomeNext');
    expect(src).not.toMatch(/margin:\s*18px/);
    expect(src).toMatch(/\.goals \{[^}]*margin: 0;/);
    expect(src).toMatch(/\.next-in \{[^}]*grid-template-columns: minmax\(0, 1fr\);[^}]*gap: 28px;/);
    expect(src).toMatch(
      /@media \(min-width: 735px\) \{[^@]*\.next-in \{[^}]*gap: 28px 0;[^}]*align-items: start;/,
    );
  });

  it('chevron links flow as text with a 44px target, and stacked targets do not overlap', () => {
    const src = read('HomeNext');
    expect(src).toMatch(/\.home-links \{[^}]*gap: 22px;/);
    expect(src).toMatch(
      /\.home-links :global\(\.link-chevron\) \{\s*display: inline-block;\s*min-height: 0;\s*padding-block: 11px;\s*margin-block: -11px;/,
    );
  });

  it('the pills are centred with a 12px 14px gap', () => {
    expect(read('LetsTalk')).toMatch(
      /\.home-acts \{[^}]*justify-content: center;[^}]*gap: 12px 14px;/,
    );
  });

  it('LetsTalk is centred and its lead line is in --text-2', () => {
    const src = read('LetsTalk');
    expect(src).toMatch(/text-align: center;/);
    expect(src).toMatch(/\.t-intro \{[^}]*color: var\(--text-2\);/);
  });
});

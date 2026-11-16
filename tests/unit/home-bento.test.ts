import { readFileSync } from 'node:fs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import HomeBento from '../../src/components/home/HomeBento.astro';
import { NEXT_STEPS } from '../../src/lib/career-next';
import { NEXT_FORBIDDEN, withoutAllowed } from '../e2e/next-words';
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

const render = async (lang: 'en' | 'vi', props: Record<string, unknown> = {}) =>
  AstroContainer.create().then((c) =>
    c.renderToString(HomeBento as never, {
      props: {
        lang,
        profile: profile(lang),
        numbers: [],
        hasStories: false,
        roles: [],
        rows: [],
        ...props,
      },
    }),
  );

/** Each tile `<li>` with its id and span class, in DOM order. */
const tiles = (html: string) =>
  [...html.matchAll(/<li\b[^>]*\bid="([^"]+)"[^>]*>/g)].map((m) => ({
    id: m[1],
    span: m[0].match(/bento-tile--(\w+)/)?.[1],
  }));

const full = {
  numbers: [
    { id: 'years', title: 'Years', href: '/experiences/', value: '5+', below: 'years' },
    { id: 'team', title: 'Team', href: '/experiences/acme/', value: '7', below: 'engineers' },
  ],
  project: { slug: 'demo', data: { title: 'Demo project', summary: 'A summary.' } },
  hasStories: true,
  roles: [
    {
      slug: 'acme',
      data: { company: 'Acme', role: 'Engineer', start: '2024-01', end: null },
    },
  ],
  rows: [{ post: { slug: 'hello', title: 'Hello' } }],
};

describe.each(['en', 'vi'] as const)('HomeBento (%s)', (lang) => {
  it('renders skills (half), goals, then more (full) when nothing else exists', async () => {
    const html = await render(lang);
    expect(tiles(html)).toEqual([
      { id: 'skills', span: 'half' },
      { id: 'goals', span: 'full' },
      { id: 'more', span: 'full' },
    ]);
  });

  it('keeps the tile order and two-column spans', async () => {
    const html = await render(lang, full);
    expect(tiles(html)).toEqual([
      { id: 'years', span: 'half' },
      { id: 'team', span: 'half' },
      { id: 'project', span: 'full' },
      { id: 'result', span: 'half' },
      { id: 'skills', span: 'half' },
      { id: 'career', span: 'full' },
      { id: 'goals', span: 'full' },
      { id: 'writing', span: 'full' },
      { id: 'more', span: 'full' },
    ]);
  });

  it('leaves location and languages out of #more but keeps the legal-name line', async () => {
    const html = await render(lang);
    const p = profile(lang);
    const more = html.slice(html.indexOf('id="more"'));
    expect(more).not.toContain(p.location);
    for (const l of p.spokenLanguages) expect(more).not.toContain(l.language);
    expect(more).toMatch(/<li\b[^>]*data-real-name[^>]*>[^<]*Tran Thanh Hai/);
    expect(
      more.match(/<ul\b[^>]*data-facts[^>]*>([\s\S]*?)<\/ul>/)![1].match(/<li\b/g),
    ).toHaveLength(1);
  });
});

describe.each(['en', 'vi'] as const)('goals tile (%s)', (lang) => {
  const dict = (lang === 'en' ? en : vi) as Record<string, string>;
  const prefix = lang === 'en' ? '' : '/vi';
  const slice = async () => {
    const html = await render(lang);
    const a = html.indexOf('id="goals"');
    return html.slice(a, html.indexOf('</li>', html.indexOf('</ul>', a)) + 5);
  };

  it('is one whole-tile link to /experiences/#next, named by home.next.link', async () => {
    const goals = await slice();
    const links = [...goals.matchAll(/<a\b[^>]*>/g)].map((m) => m[0]);
    expect(links).toHaveLength(1);
    expect(links[0]).toContain(`href="${prefix}/experiences/#next"`);
    expect(links[0]).toContain(`aria-label="${dict['home.next.link']}"`);
    expect(dict['home.next.link']).toBeTruthy();
  });

  it('shows both goals, eyebrow (with year) then title, from NEXT_STEPS', async () => {
    const goals = await slice();
    const text = goals.replace(/&#32;|&nbsp;|\u00a0/g, ' ');
    expect(NEXT_STEPS).toHaveLength(2);
    for (const s of NEXT_STEPS) {
      expect(text).toContain(dict[s.eyebrow].replace(/\u00a0/g, ' '));
      expect(text).toContain(dict[s.title]);
      expect(dict[s.eyebrow]).toMatch(/20\d\d/);
    }
    expect(goals.match(/class="goal-title"/g)).toHaveLength(2);
    expect(goals).toContain(`>${dict['exp.next.title']}</a>`);
  });

  it('has no job-hunt phrase once the two allowed titles and years are removed', async () => {
    const goals = await slice();
    const text = goals.replace(/<[^>]+>/g, ' ') + ' ' + dict['home.next.link'];
    for (const re of NEXT_FORBIDDEN) expect(withoutAllowed(text), String(re)).not.toMatch(re);
  });

  it('has the tools strings in both languages', () => {
    for (const k of [
      'home.tools.eyebrow',
      'home.tools.title',
      'home.next.link',
      'skills.logosNote',
    ])
      expect(dict[k], k).toBeTruthy();
  });
});

describe('tools tile source', () => {
  const bento = readFileSync('src/components/home/HomeBento.astro', 'utf8');
  const page = readFileSync('src/pages/[...lang]/index.astro', 'utf8');

  it('shows only brand marks, aria-hidden, plated per brandTools, with the disclaimer once', () => {
    expect(bento).toMatch(/tools\??:\s*\{ name: string; icon: string; plate: boolean \}\[\]/);
    expect(bento).toMatch(/<Icon[^>]*aria-hidden="true"/);
    expect(bento).toContain('tool-icon--plate');
    expect(bento.match(/skills\.logosNote/g)).toHaveLength(1);
    expect(bento).not.toMatch(/lucide:/);
    expect(bento).toMatch(/localePath\('\/skills\/', lang\)/);
    expect(bento).toMatch(/id="tools"[\s\S]*span="full"/);
    expect(bento).not.toContain('Enterprise Data Architect');
  });

  it('the page feeds it from brandTools over the skills groups', () => {
    expect(page).toMatch(/brandTools\(/);
    expect(page).toMatch(/getLocalized\('skills', lang\)/);
    expect(page).toMatch(/\{tools\}/);
  });

  it('the board bottom padding sits on .home-split, not on the board', () => {
    expect(bento).toMatch(/\.bento-band \{\s*padding-block: 0;/);
    expect(page).toMatch(/\.home-split \{[^}]*padding-bottom: var\(--section-pad\);/);
  });
});

describe('BentoTile and board grid', () => {
  const tile = readFileSync('src/components/home/BentoTile.astro', 'utf8');
  const bento = readFileSync('src/components/home/HomeBento.astro', 'utf8');

  it('BentoTile spans are half or full only: 1 or 2 board columns from 735px', () => {
    expect(tile).toMatch(/span:\s*'half'\s*\|\s*'full';/);
    expect(tile).not.toMatch(/third/);
    expect(tile).toMatch(
      /@media \(min-width: 735px\) \{\s*\.bento-tile--half \{\s*grid-column: span 1;\s*\}\s*\.bento-tile--full \{\s*grid-column: span 2;\s*\}\s*\}/,
    );
  });

  it('the board is 1 column below 735px and 2 columns from there', () => {
    expect(bento).toMatch(/\.bento \{[^}]*grid-template-columns: 1fr;[^}]*gap: 12px;/);
    expect(bento).toMatch(
      /@media \(min-width: 735px\) \{\s*\.bento \{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);\s*gap: 16px;/,
    );
    expect(bento).toMatch(/@media \(min-width: 1069px\) \{\s*\.bento \{\s*gap: 20px;/);
    expect(bento).not.toMatch(/repeat\((6|12),/);
    expect(bento).toMatch(/\.bento-band > \.section-inner \{\s*width: 100%;/);
  });
});

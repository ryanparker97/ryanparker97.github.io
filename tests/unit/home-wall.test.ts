import { readFileSync } from 'node:fs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import HomeWall from '../../src/components/home/HomeWall.astro';
import { boldHtml } from '../../src/lib/home';
import { WALL_SHOTS, wallHref } from '../../src/lib/wall';
import en from '../../src/i18n/en.json';
import vi from '../../src/i18n/vi.json';

// The profile collection's data store only exists after a build, so the frontmatter is read directly.
const profile = (lang: 'en' | 'vi') => {
  const raw = readFileSync(`src/content/profile/${lang}/index.md`, 'utf8');
  const field = (key: string) => raw.match(new RegExp(`^${key}: '([^']*)'`, 'm'))?.[1] ?? '';
  return { name: field('name'), headline: field('headline'), email: field('email') };
};

const PROJECT = 'agentic-coding-workflow';

const render = (props: Record<string, unknown>) =>
  AstroContainer.create()
    .then((c) => c.renderToString(HomeWall as never, { props }))
    .then((html) => html.replace(/ data-astro-cid-\w+(="true")?/g, ''));

const decode = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&quot;/g, '"');
const text = (html: string) =>
  decode(html.replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
// The accessible name leaves out the aria-hidden ›.
const anchors = (html: string) =>
  [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({
    attrs: m[1],
    text: text(m[2].replace(/<span[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/span>/g, '')),
  }));
const imgs = (html: string) => [...html.matchAll(/<img\b([^>]*)>/g)].map((m) => m[1]);
// An empty alt is serialized as a bare `alt` or as alt="".
const emptyAlt = /\balt(?:="")?(?=\s|$)/;
const attr = (attrs: string, name: string) =>
  attrs.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];

const dict = { en, vi } as const;
const prefixOf = (lang: 'en' | 'vi') => (lang === 'en' ? '' : '/vi');

describe.each(['en', 'vi'] as const)('HomeWall (%s)', (lang) => {
  const p = profile(lang);
  const props = {
    lang,
    ...p,
    projectSlug: PROJECT,
    stories: true,
    posts: true,
  };
  const html = () => render(props);
  const wallOf = (out: string) =>
    out.match(/<div class="w-clip"[^>]*>([\s\S]*?)<\/div><\/div>\s*<div class="w-id/)?.[0] ?? '';

  it('the profile fields are present', () => {
    expect(p.name).not.toBe('');
    expect(p.headline).not.toBe('');
    expect(p.email).toContain('@');
  });

  it('section#top holds one H1, the name in ink, before the role line', async () => {
    const out = await html();
    expect(out).toMatch(/<section\b[^>]*\bid="top"[^>]*>/);
    expect(out).toMatch(/<section\b[^>]*\baria-labelledby="top-title"/);
    expect(out.match(/<h1\b/g)).toHaveLength(1);
    const h1 = out.match(/<h1\b([^>]*)>([\s\S]*?)<\/h1>/);
    expect(h1?.[1]).toMatch(/\bid="top-title"/);
    expect(h1?.[1]).toMatch(/\bclass="w-name"/);
    expect(text(h1![2])).toBe(p.name);
    expect(out).not.toContain('text-gradient');
    expect(out).not.toContain('t-eyebrow');
    expect(out).not.toContain('home-kicker');
    const role = out.match(/<p class="w-role[^"]*"[^>]*>([\s\S]*?)<\/p>/);
    expect(role).not.toBeNull();
    // owner, avatar-title: was `toBe(p.headline)` ("Senior Data Engineer"); the role line is now two lines,
    // the title and the areas, from the home.role and home.roleAreas strings.
    expect(text(role![1]).replace(/\s+/g, ' ')).toBe(
      `${dict[lang]['home.role']} ${dict[lang]['home.roleAreas']}`,
    );
    expect(role![1]).toMatch(/class="w-title"[^>]*>Data Engineer</);
    expect(role![1]).toMatch(/class="w-areas"[^>]*>Data Engineering \| Backend \| DevOps</);
    expect(out).not.toContain('Senior Data Engineer &amp; Team Lead');
    // owner, title-below-name: was `class="w-role` before `<h1`; the role line now follows the H1 directly and
    // starts with the title span.
    expect(out.indexOf('<h1')).toBeLessThan(out.indexOf('class="w-role'));
    expect(out).toMatch(/<\/h1>\s*<p class="w-role/);
    expect(role![1]).toMatch(/^\s*<span class="w-title"/);
  });

  it('the sentence is the first-person line with its bold phrases', async () => {
    const out = await html();
    const say = out.match(/<p class="w-say[^"]*"[^>]*>([\s\S]*?)<\/p>/);
    expect(say).not.toBeNull();
    const copy = dict[lang]['home.intro'];
    expect(say![1]).toBe(boldHtml(copy));
    expect(say![1].match(/<strong>/g)).toHaveLength(2);
  });

  it('four chevron links, named by their visible text', async () => {
    const out = await html();
    const row = out.match(/<p class="w-links[^"]*"[^>]*>([\s\S]*?)<\/p>/);
    expect(row).not.toBeNull();
    const links = anchors(row![1]);
    expect(links).toHaveLength(4);
    expect((row![1].match(/class="link-chevron/g) ?? []).length).toBe(4);
    const pre = prefixOf(lang);
    expect(links.map((l) => attr(l.attrs, 'href'))).toEqual([
      `${pre}/experiences/`,
      `${pre}/projects/${PROJECT}/`,
      `${pre}/star/`,
      `${pre}/blog/`,
    ]);
    const d = dict[lang];
    expect(links.map((l) => l.text)).toEqual([
      d['home.experience.cta'],
      d['projects.view'],
      d['star.all'],
      d['home.posts.all'],
    ]);
    for (const l of links) expect(l.attrs).not.toContain('aria-label');
  });

  it('the pills: Download CV, then Email me, in .actions.home-acts', async () => {
    const out = await html();
    const acts = out.match(/<div class="actions home-acts[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    expect(acts).not.toBeNull();
    const links = anchors(acts![1]);
    expect(links).toHaveLength(2);
    const [cv, mail] = links;
    expect(cv.text).toBe(dict[lang]['common.download']);
    expect(cv.attrs).toContain(`href="${prefixOf(lang)}/cv.pdf"`);
    expect(cv.attrs).toMatch(/\bdownload="Ryan-Parker-CV\.pdf"/);
    expect(cv.attrs).toMatch(/class="btn btn-primary"/);
    expect(mail.text).toBe(dict[lang]['home.contact.email']);
    expect(mail.attrs).toContain(`href="mailto:${p.email}"`);
    expect(mail.attrs).toMatch(/class="btn btn-secondary"/);
  });

  it('the wall: aria-hidden, 12 tabindex=-1 tiles in order, 24 empty-alt images', async () => {
    const out = await html();
    expect(out).toMatch(/<div class="w-clip" aria-hidden="true">/);
    const wall = wallOf(out);
    expect(wall).not.toBe('');
    const tiles = anchors(wall);
    expect(tiles).toHaveLength(12);
    tiles.forEach((tile, i) => {
      expect(tile.attrs).toMatch(/\bclass="w-tile"/);
      expect(tile.attrs).toMatch(/\btabindex="-1"/);
      expect(attr(tile.attrs, 'href')).toBe(wallHref(WALL_SHOTS[i].path, lang));
    });
    const all = imgs(wall);
    expect(all).toHaveLength(24);
    for (const a of all) {
      expect(a).toMatch(emptyAlt);
      expect(attr(a, 'width')).toBeTruthy();
      expect(attr(a, 'height')).toBeTruthy();
      const srcset = attr(a, 'srcset') ?? '';
      for (const w of ['320w', '512w', '960w']) expect(srcset).toContain(w);
      expect(attr(a, 'sizes')).toBe('(max-width: 734px) 292px, (max-width: 1068px) 363px, 474px');
    }
  });

  it('every wall image is the WebP of its capture in this language, two per tile', async () => {
    const wall = wallOf(await html());
    const all = imgs(wall);
    WALL_SHOTS.forEach((s, i) => {
      const light = all[i * 2];
      const dark = all[i * 2 + 1];
      expect(light).toMatch(/\bclass="w-shot w-shot--light"/);
      expect(dark).toMatch(/\bclass="w-shot w-shot--dark"/);
      for (const [a, theme] of [
        [light, 'light'],
        [dark, 'dark'],
      ] as const) {
        expect(attr(a, 'src')).toContain(`${s.id}-${lang}-${theme}`);
        expect(attr(a, 'src')).toMatch(/\.webp|f=webp/);
        expect(attr(a, 'srcset')).toContain(`${s.id}-${lang}-${theme}`);
      }
    });
  });

  it('loading: light 1-6 eager, light 7-12 and all dark lazy; priority on light 2 and 5 only', async () => {
    const all = imgs(wallOf(await html()));
    const light = all.filter((_, i) => i % 2 === 0);
    const dark = all.filter((_, i) => i % 2 === 1);
    light.forEach((a, i) => expect(attr(a, 'loading')).toBe(i < 6 ? 'eager' : 'lazy'));
    for (const a of dark) {
      expect(attr(a, 'loading')).toBe('lazy');
      expect(a).not.toContain('fetchpriority');
    }
    const high = light
      .map((a, i) => (attr(a, 'fetchpriority') === 'high' ? i : -1))
      .filter((i) => i >= 0);
    expect(high).toEqual([1, 4]);
    expect(light.filter((a) => a.includes('fetchpriority'))).toHaveLength(2);
  });

  // owner, photo-logos: horizontal photo, larger at L. Was: an inner span and the 270, 320, 540 steps with
  // sizes 161 / 201 / 263px; now no inner span, 320 / 400 / 480 / 600 and 158 / 177 / 236px (the image is
  // 9/11 of the frame: 192, 216 and 288px frames; 236px at 2x = 472px, within the 600px source).
  // owner, photo-tall: the image is as tall as the frame from M, so sizes 177 / 236px -> 216 / 288px
  // (288px at 2x = 576px, within the 600px source).
  // owner, photo-tall (Q1): S frame 192 x 160, so sizes 158px -> 160px at S.
  // owner, profile-image-full: the photo is photo.jpg, the whole photo (was the avatar-cutout.png head
  // cut-out); sizes, widths, alt and loading are unchanged.
  // owner, photo-align-cutout: the photo is photo-cutout.png, the owner cut out of the backdrop (was photo.jpg,
  // asserted as 'photo' and not avatar-cutout); sizes, widths, alt and loading are still unchanged.
  it('the photo: one eager decorative photo with the 320, 400, 480 and 600 steps', async () => {
    const out = await html();
    const pop = out.match(/<span class="pop">([\s\S]*?)<\/span>/)?.[1] ?? '';
    expect(pop).not.toContain('<span');
    const photo = imgs(pop);
    expect(photo).toHaveLength(1);
    expect(photo[0]).toMatch(emptyAlt);
    expect(attr(photo[0], 'loading')).toBe('eager');
    expect(attr(photo[0], 'src')).toContain('photo-cutout');
    expect(attr(photo[0], 'src')).not.toContain('avatar-cutout');
    const srcset = attr(photo[0], 'srcset') ?? '';
    for (const w of ['320w', '400w', '480w', '600w']) expect(srcset).toContain(w);
    expect(attr(photo[0], 'sizes')).toBe(
      '(max-width: 734px) 160px, (max-width: 1068px) 216px, 288px',
    );
    expect(attr(photo[0], 'width')).toBeTruthy();
    expect(attr(photo[0], 'height')).toBeTruthy();
    expect(out.match(/class="pop"/g)).toHaveLength(1);
    // The wall plus the photo are the only images.
    expect(imgs(out)).toHaveLength(25);
  });

  it.each([true, false])('missing data: project %s', async (hasProject) => {
    for (const stories of [true, false]) {
      for (const posts of [true, false]) {
        const out = await render({
          lang,
          ...p,
          projectSlug: hasProject ? PROJECT : undefined,
          stories,
          posts,
        });
        const row = out.match(/<p class="w-links[^"]*"[^>]*>([\s\S]*?)<\/p>/);
        expect(row, 'the link row stays').not.toBeNull();
        const links = anchors(row![1]);
        expect(links).toHaveLength(1 + Number(hasProject) + Number(stories) + Number(posts));
        expect(attr(links[0].attrs, 'href')).toBe(`${prefixOf(lang)}/experiences/`);
      }
    }
  });
});

describe('HomeWall source', () => {
  const src = readFileSync('src/components/home/HomeWall.astro', 'utf8');
  const style = src.slice(src.indexOf('<style>')).replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = (selector: string) =>
    style.match(
      new RegExp(`(?:^|\\n)\\s*${selector.replace(/[.[\]]/g, '\\$&')}\\s*\\{([^}]*)\\}`),
    )?.[1] ?? '';

  it('no script, shadow, hex colour, px font size, font face, motion or nowrap', () => {
    expect(src).not.toContain('<script');
    expect(src).not.toContain('box-shadow');
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b(?![\w-])/);
    expect(src).not.toMatch(/font-size:\s*[\d.]+px/);
    expect(src).not.toContain('font-family');
    expect(src).not.toContain('transition');
    expect(src).not.toContain('animation');
    expect(src).not.toContain('nowrap');
  });

  it('the one transform is the static tilt on .w-wall', () => {
    expect(style.match(/transform:/g)).toHaveLength(1);
    expect(rule('.w-wall')).toContain(
      'transform: perspective(2400px) rotateX(28deg) rotateZ(-8deg)',
    );
    expect(rule('.w-wall')).toContain('transform-origin: 50% 40%');
    expect(style).not.toMatch(/translate|scale\(/);
  });

  it('the clip is the containing block, clips, and fades with a mask', () => {
    const clip = rule('.w-clip');
    expect(clip).toContain('position: relative');
    expect(clip).toContain('overflow: clip');
    expect(clip).toContain('mask-image: linear-gradient(180deg, black 48%, transparent 90%)');
    expect(clip).toContain(
      '-webkit-mask-image: linear-gradient(180deg, black 48%, transparent 90%)',
    );
  });

  it('the wall geometry at S, M and L', () => {
    expect(style).toMatch(/\.w-clip \{[^}]*height: 300px/);
    expect(style).toMatch(/\.w-wall \{[^}]*width: 900px[^}]*margin-left: -450px/);
    expect(style).toContain('width: 1500px');
    expect(style).toContain('margin-left: -750px');
    expect(style).toContain('width: 1960px');
    expect(style).toContain('margin-left: -980px');
    expect(style).toContain('repeat(3, minmax(0, 1fr))');
    expect(style).toContain('repeat(4, minmax(0, 1fr))');
    // owner, profile-image-full: the row grows up into the fade so the whole photo fits: S -135px (was
    // -56px), M -81px (was -44px), L -143px (new, was none) with rows 1fr auto.
    // owner, photo-align-cutout: L -134px (was -143px) and no 1fr row: the frame stretches to the intro.
    // owner, avatar-title: S -153px (was -135px), M -102px (was -81px), L -155px (was -134px): the role line has a
    // second line (18 / 21 / 21px), so the row starts that much higher and the name and text stay where they were.
    // owner, title-below-name: S -163px (was -153px), M -113px (was -102px), L -170px (was -155px): the bigger
    // title under the name adds 10 / 11 / 15px net (the H1 loses its 6px top margin), so the intro, links and
    // pills stay where they were.
    const baseId = style.slice(0, style.indexOf('@media (min-width: 735px)'));
    expect(baseId.match(/\.w-id \{([^}]*)\}/)?.[1] ?? '').toContain('margin-top: -163px');
    const mId = style.slice(
      style.indexOf('@media (min-width: 735px)'),
      style.indexOf('@media (min-width: 1069px)'),
    );
    expect(mId.match(/\.w-id \{([^}]*)\}/)?.[1] ?? '').toContain('margin-top: -113px');
    const lId = style.slice(style.indexOf('@media (min-width: 1069px)'));
    const lRow = lId.match(/\.w-id \{([^}]*)\}/)?.[1] ?? '';
    expect(lRow).toContain('margin-top: -170px');
    expect(lRow).not.toContain('grid-template-rows');
    expect(lRow).not.toContain('1fr');
  });

  it('the theme swap includes the system preference', () => {
    expect(rule('.w-shot--dark')).toContain('display: none');
    expect(style).toContain(":root[data-theme='dark']) .w-shot--light");
    const media =
      style.match(/@media \(prefers-color-scheme: dark\) \{([\s\S]*?)\n {4}\}/)?.[1] ?? '';
    expect(media).toContain(":root[data-pref='system']) .w-shot--light");
    expect(media).toContain(":root[data-pref='system']) .w-shot--dark");
    expect(style).toMatch(/@media screen \{[\s\S]*prefers-color-scheme: dark/);
  });

  // owner, photo-logos: a bigger photo with a slightly smaller name at L: min(5rem, 19vw) -> min(4.5rem, 19vw).
  it('the name is capped at 19vw at every step', () => {
    for (const v of ['min(2.75rem, 19vw)', 'min(3.5rem, 19vw)', 'min(4.5rem, 19vw)']) {
      expect(style).toContain(`font-size: ${v}`);
    }
  });

  // owner, profile-image-full: was "a warm frame, square from M, with a square image on its bottom edge"
  // (--pop-h calc(var(--pop) * 5 / 6), --pop-img, a flex frame, height: var(--pop-img), width: auto); now the
  // frame is the image box: width var(--pop), the image width 100% and height auto, the photo's own ratio.
  // owner, photo-align-cutout: the frame stretches to the intro from M (was the image box at the photo's own
  // ratio, height auto). Now `.pop` has aspect-ratio 600 / 894 (S) and the img is absolute, inset 0, 100% x
  // 100%, object-fit contain at the bottom (was width 100%, height auto, no object-fit).
  it('the photo frame stretches to the intro: the cut-out drawn contained at the bottom, nothing cropped', () => {
    const frame = rule('.pop');
    expect(frame).toContain('--pop: var(--home-photo)');
    expect(frame).toContain('width: var(--pop)');
    expect(frame).toContain('display: block');
    expect(frame).toContain('overflow: hidden');
    expect(frame).toContain('border-radius: var(--radius-sm)');
    // owner, avatar-title: was `background: var(--warm)`; the frame has no fill, the person stands on the wall.
    expect(frame).not.toMatch(/background/);
    expect(frame).toContain('position: relative');
    expect(frame).toContain('aspect-ratio: 600 / 894');
    expect(frame).not.toMatch(/--pop-h|--pop-img|height:/);
    const img = rule('.pop img');
    expect(img).toContain('position: absolute');
    expect(img).toContain('inset: 0');
    expect(img).toContain('width: 100%');
    expect(img).toContain('height: 100%');
    expect(img).toContain('object-fit: contain');
    expect(img).toContain('object-position: 50% 100%');
    expect(img).not.toMatch(/cover|transform|margin/);
    const M = style.slice(
      style.indexOf('@media (min-width: 735px)'),
      style.indexOf('@media (min-width: 1069px)'),
    );
    const mFrame = M.match(/\.pop \{([^}]*)\}/)?.[1] ?? '';
    expect(mFrame).not.toContain('--pop-h'); // owner, profile-image-full: was --pop-h: var(--pop)
    expect(mFrame).toContain('border-radius: var(--radius-md)');
    expect(mFrame).toContain('aspect-ratio: auto'); // owner, photo-align-cutout
    expect(mFrame).toContain('align-self: stretch');
    expect(style).not.toContain('.pop::before');
    expect(style).not.toContain('.pop > span');
    // The size is one token shared with #next (tokens.css): 160 / 216 / 288px at S / M / L (was 192 at S), gap 16 / 28 / 36.
    expect(style).not.toMatch(/--pop:\s*\d+px/);
    const tokens = readFileSync('src/styles/tokens.css', 'utf8');
    const sizes = [...tokens.matchAll(/--home-photo:\s*(\d+)px/g)].map((m) => Number(m[1]));
    expect(sizes).toEqual([288, 216, 160]);
    expect([...tokens.matchAll(/--home-photo-gap:\s*(\d+)px/g)].map((m) => Number(m[1]))).toEqual([
      36, 28, 16,
    ]);
    // The largest rendered image is the L frame, 288px; at 2x it stays within the 600px source.
    expect(288 * 2).toBeLessThanOrEqual(600);
    expect(Math.max(...sizes)).toBeGreaterThan(240);
  });

  // owner, photo-tall: at L the photo spans two rows and the pills sit under the text, so .w-text ends on
  // the column's right edge where .next-path ends. Was a flex row with the pills stacked on the right.
  it('at L the photo spans two rows and the pills sit under the text', () => {
    const L = style.slice(style.indexOf('@media (min-width: 1069px)'));
    const id = L.match(/\.w-id \{([^}]*)\}/)?.[1] ?? '';
    expect(id).toContain('gap: 16px var(--home-photo-gap)');
    expect(id).not.toMatch(/display:\s*flex|flex-wrap/);
    expect(L.match(/\.pop \{([^}]*)\}/)?.[1] ?? '').toContain('grid-row: 1 / 3');
    // owner, profile-image-full: the photo and the text end on the row's bottom (the photo on the pills').
    // owner, photo-align-cutout: the photo stretches over both rows and the text starts at the top
    // (was align-self: end on both).
    expect(L.match(/\.pop \{([^}]*)\}/)?.[1] ?? '').toContain('align-self: stretch');
    expect(L.match(/\.w-text \{([^}]*)\}/)?.[1] ?? '').toContain('align-self: start');
    const acts = L.match(/\.actions\.home-acts \{([^}]*)\}/)?.[1] ?? '';
    expect(acts).toContain('grid-area: 2 / 2');
    expect(acts).not.toContain('flex-direction: column');
    expect(L).not.toContain('min-width: min-content');
  });

  // Lead decision (U1b, every width after review round 1): the four links are a 2 x 2 grid at every
  // width, never a wrapping flex row; L makes the two columns equal.
  it('the links row is a grid of two columns at every width, equal columns from L', () => {
    const base = style.slice(0, style.indexOf('@media (min-width: 735px)'));
    const row = base.match(/\.w-links \{([^}]*)\}/)?.[1] ?? '';
    expect(row).toContain('display: grid');
    expect(row).toContain('grid-template-columns: repeat(2, auto)');
    expect(row).toContain('justify-items: start');
    expect(row).not.toContain('flex-wrap');
    const L = style.slice(style.indexOf('@media (min-width: 1069px)'));
    const links = L.match(/\.w-links \{([^}]*)\}/)?.[1] ?? '';
    expect(links).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
  });

  // owner, avatar-title: the HomeWall style no longer uses var(--warm) (the frame is unfilled).
  // owner, title-accent: the role title is the accent token; the areas line is lighter (500) in --text-2.
  it('the role title is the accent, the areas lighter, both from tokens', () => {
    expect(style).toMatch(/\.w-title \{[^}]*color: var\(--accent\);/);
    expect(style).toMatch(/\.w-areas \{[^}]*font-weight: 500;/);
    expect(rule('.w-role')).toContain('color: var(--text-2)');
  });

  // owner, title-below-name: the title is bigger (was the role line's 14 / 17 / 17px) and sits directly under
  // the name: the H1 has no top margin (was 6px) and the role line has it (was 0).
  it('the title is 24 / 28 / 32px and the 6px gap moved from the name to the role line', () => {
    const M = style.slice(
      style.indexOf('@media (min-width: 735px)'),
      style.indexOf('@media (min-width: 1069px)'),
    );
    const L = style.slice(style.indexOf('@media (min-width: 1069px)'));
    expect(rule('.w-title')).toContain('font-size: 1.5rem');
    expect(rule('.w-title')).toContain('line-height: 1.1667');
    expect(M.match(/\.w-title \{([^}]*)\}/)?.[1] ?? '').toContain('font-size: 1.75rem');
    expect(L.match(/\.w-title \{([^}]*)\}/)?.[1] ?? '').toContain('font-size: 2rem');
    expect(rule('.w-name')).toContain('margin: 0;');
    expect(rule('.w-role')).toContain('margin: 6px 0 0');
    expect(rule('.w-areas')).not.toContain('font-size');
  });

  it('tokens: the keyline; no warm panel in HomeWall', () => {
    expect(style).not.toContain('var(--warm)');
    expect(style).toContain('var(--keyline)');
    expect(readFileSync('src/styles/tokens.css', 'utf8')).toMatch(
      /--warm:\s*light-dark\(#f1e7e0,\s*#413226\);/,
    );
  });

  it('the wall is left out of print', () => {
    expect(style).toMatch(/@media print \{\s*\.w-clip \{\s*display: none/);
  });
});

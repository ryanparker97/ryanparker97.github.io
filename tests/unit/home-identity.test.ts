import { readFileSync } from 'node:fs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import avatar from '../../src/assets/profile/avatar.jpg';
import HomeIdentity from '../../src/components/home/HomeIdentity.astro';
import { t } from '../../src/i18n';

// The profile collection's data store only exists after a build, so the frontmatter is read directly.
const profile = (lang: 'en' | 'vi') => {
  const raw = readFileSync(`src/content/profile/${lang}/index.md`, 'utf8');
  const field = (key: string) => raw.match(new RegExp(`^${key}: '([^']*)'`, 'm'))?.[1] ?? '';
  const spokenLanguages = [
    ...raw.matchAll(/^\s+- language: '([^']*)'\n\s+proficiency: '([^']*)'/gm),
  ].map((m) => ({ language: m[1], proficiency: m[2] }));
  return {
    name: field('name'),
    headline: field('headline'),
    location: field('location'),
    email: field('email'),
    avatarPath: field('avatar'),
    avatar,
    spokenLanguages,
  };
};

const render = async (lang: 'en' | 'vi') =>
  AstroContainer.create()
    .then((c) =>
      c.renderToString(HomeIdentity as never, { props: { lang, profile: profile(lang) } }),
    )
    .then((html) => html.replace(/ data-astro-cid-\w+/g, ''));

const SRC = readFileSync('src/components/home/HomeIdentity.astro', 'utf8');
const CSS = SRC.slice(SRC.indexOf('>', SRC.indexOf('<style')) + 1, SRC.lastIndexOf('</style>'));

describe.each(['en', 'vi'] as const)('HomeIdentity (%s)', (lang) => {
  it('is section#top, labelled by its one gradient H1, and not a hero', async () => {
    const html = await render(lang);
    const p = profile(lang);
    expect(html).toMatch(/<section\b[^>]*\bid="top"[^>]*>/);
    expect(html.match(/<section\b[^>]*>/)![0]).toContain('aria-labelledby="top-title"');
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    const h1 = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/)![0];
    expect(h1).toContain('id="top-title"');
    expect(h1).toMatch(/class="[^"]*\bt-unit\b/);
    expect(h1).toMatch(/<span class="text-gradient"[^>]*>/);
    expect(h1).toContain(p.headline.replace('&', '&amp;'));
    expect(html.match(/text-gradient/g)).toHaveLength(1);
    expect(html).toContain(t(lang, 'home.hero.subline'));
    expect(html).not.toMatch(/data-hero|class="[^"]*\bhero\b/);
  });

  it('has exactly two actions: Download CV and an Email me mailto', async () => {
    const html = await render(lang);
    const actions = html.match(/<div class="actions[^"]*"[^>]*>([\s\S]*?)<\/div>/)![1];
    const links = actions.match(/<a\b[^>]*>[\s\S]*?<\/a>/g)!;
    expect(links).toHaveLength(2);
    const cvPrefix = lang === 'vi' ? '/vi' : '';
    expect(links[0]).toContain(`href="${cvPrefix}/cv.pdf"`);
    expect(links[0]).toContain('download="Ryan-Parker-CV.pdf"');
    expect(links[0]).toContain('btn-primary');
    expect(links[0]).toContain(t(lang, 'common.download'));
    expect(links[1]).toContain(`href="mailto:${profile(lang).email}"`);
    expect(links[1]).toContain('btn-secondary');
    expect(links[1]).toContain(t(lang, 'home.contact.email'));
    expect(html).not.toContain('/experiences/');
  });

  it('shows one size-reserved, eager WebP portrait named by the profile name, with a 2x srcset', async () => {
    const html = await render(lang);
    const p = profile(lang);
    expect(p.avatarPath).toBe('../../../assets/profile/avatar.jpg');
    expect(html.match(/<img\b/g)).toHaveLength(1);
    const img = html.match(/<img\b[^>]*>/)![0];
    expect(img).toMatch(/class="[^"]*\bhome-portrait\b/);
    expect(img).toContain('alt="Ryan Parker"');
    expect(img).toContain(`alt="${p.name}"`);
    expect(img).toContain('width="240"');
    expect(img).toContain('height="240"');
    expect(img).toContain('loading="eager"');
    expect(img.match(/\ssrc="([^"]*)"/)![1]).toMatch(/f=webp|\.webp/);
    expect(img.match(/srcset="([^"]*)"/)![1]).toMatch(/\s2x\b/);
    expect(html).not.toContain('hero-avatar');
    // The portrait comes before the H1.
    expect(html.indexOf('<img')).toBeLessThan(html.indexOf('<h1'));
  });

  it('lists the location and every spoken language in the facts list', async () => {
    const html = await render(lang);
    const p = profile(lang);
    expect(p.spokenLanguages.length).toBeGreaterThan(0);
    const facts = html.match(/<ul\b[^>]*data-facts[^>]*>([\s\S]*?)<\/ul>/)!;
    expect(facts[0]).toMatch(/class="[^"]*\bid-facts\b/);
    expect(facts[0]).toContain('role="list"');
    expect(facts[1]).toContain(`<li>${p.location}</li>`);
    for (const l of p.spokenLanguages)
      expect(facts[1]).toContain(`${l.language} — ${l.proficiency}`);
  });
});

describe('HomeIdentity source', () => {
  it('has no hero exit attribute and no hero-avatar class', () => {
    expect(SRC).not.toContain('data-hero');
    expect(SRC).not.toContain('hero-avatar');
    expect(SRC).not.toMatch(/<script\b/);
  });

  it('pins only at L, at the height gate, with no reduced motion and JS on', () => {
    expect(CSS.match(/position:\s*sticky/g)).toHaveLength(1);
    const blocks = [...CSS.matchAll(/@media([^{]*)\{\s*([^{}]*)\{([^{}]*)\}\s*\}/g)];
    const sticky = blocks.filter((b) => /position:\s*sticky/.test(b[3]));
    expect(sticky).toHaveLength(1);
    const [, query, selector, body] = sticky[0];
    expect(query).toMatch(/\(min-width:\s*1069px\)/);
    expect(query).toMatch(/\(min-height:\s*[\d.]+em\)/);
    expect(query).toMatch(/\(prefers-reduced-motion:\s*no-preference\)/);
    expect(selector).toContain('html.js');
    expect(selector).toContain('.home-id');
    expect(body).toMatch(/top:\s*calc\(var\(--sticky-h\) \+ 32px\)/);
  });

  it('keeps the page background and steps the H1 to 3rem at narrow L', () => {
    expect(CSS).toMatch(/\.home-id\s*\{[^}]*background:\s*var\(--bg\)/);
    expect(CSS).toMatch(
      /@media[^{]*\(min-width:\s*1069px\)[^{]*\(max-width:\s*1279px\)[^{]*\{\s*\.home-id :global\(\.t-unit\)\s*\{\s*font-size:\s*3rem;/,
    );
  });

  it('styles the portrait with tokens only and steps it to 144px below 1280px', () => {
    expect(CSS).toMatch(
      /\.home-id :global\(img\.home-portrait\) \{[^}]*width: 240px;[^}]*height: 240px;[^}]*border-radius: var\(--radius-lg\);[^}]*background: var\(--surface-2\);/,
    );
    expect(CSS).toMatch(
      /@media \(max-width: 1279px\) \{\s*\.home-id :global\(img\.home-portrait\) \{\s*width: 144px;\s*height: 144px;/,
    );
    const rules = CSS.match(/img\.home-portrait\) \{[^}]*\}/g)!;
    for (const r of rules) expect(r).not.toMatch(/border:|outline|box-shadow|#[0-9a-f]{3,8}\b/i);
  });

  it('sizes text in rem only', () => {
    expect(CSS).toMatch(/font-size:\s*[\d.]+rem/);
    expect(CSS).not.toMatch(/font-size:\s*[\d.]+px/);
  });
});

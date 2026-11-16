import { readFileSync } from 'node:fs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import avatar from '../../src/assets/profile/avatar.jpg';
import NavAvatar from '../../src/components/nav/NavAvatar.astro';

// The profile collection's data store only exists after a build, so the frontmatter is read directly.
const profile = (lang: 'en' | 'vi') => {
  const raw = readFileSync(`src/content/profile/${lang}/index.md`, 'utf8');
  const field = (key: string) => raw.match(new RegExp(`^${key}: '([^']*)'`, 'm'))?.[1];
  return { avatar: field('avatar') };
};

const render = async () =>
  AstroContainer.create().then((c) => c.renderToString(NavAvatar, { props: { src: avatar } }));

describe('NavAvatar', () => {
  it('renders one decorative, size-reserved, eager, non-focusable WebP image with a 2x srcset', async () => {
    const html = await render();
    expect(html.match(/<img\b/g)).toHaveLength(1);
    const img = html.match(/<img\b[^>]*>/)![0];
    expect(img).toMatch(/class="[^"]*\bnav-avatar\b/);
    // Astro prints an empty alt as a bare attribute.
    expect(img).toMatch(/\salt(=""|(?=[\s>]))/);
    expect(img).not.toMatch(/\salt="[^"]/);
    expect(img).toContain('width="28"');
    expect(img).toContain('height="28"');
    expect(img).toContain('loading="eager"');
    expect(img).not.toMatch(/tabindex|fetchpriority/);
    expect(img.match(/\ssrc="([^"]*)"/)![1]).toMatch(/f=webp|\.webp/);
    expect(img.match(/srcset="([^"]*)"/)![1]).toMatch(/\s2x\b/);
    expect(html).not.toMatch(/<a\b/);
  });

  it('is styled by token colours only and only through img.nav-avatar', () => {
    const src = readFileSync('src/components/nav/NavAvatar.astro', 'utf8');
    const css = src.slice(src.indexOf('>', src.indexOf('<style')) + 1);
    expect(css).toContain('var(--keyline)');
    expect(css).toContain('var(--surface-2)');
    expect(css).toMatch(/border-radius:\s*50%/);
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|box-shadow|animation|transition|@media/i);
    const selectors = css.match(/[^{}]+(?=\{)/g) ?? [];
    expect(selectors.length).toBeGreaterThan(0);
    for (const sel of selectors) expect(sel.trim()).toBe('img.nav-avatar');
  });

  it('is used in the GlassNav brand link, which keeps its name, a 44px target and a round ring', () => {
    const src = readFileSync('src/components/nav/GlassNav.astro', 'utf8');
    const link = src.match(/<a\b[^>]*class="logo"[^>]*>[\s\S]*?<\/a>/)![0];
    expect(link).toContain("aria-label={t('nav.home')}");
    expect(link).toContain('href={localePath(');
    expect(link).toContain('<NavAvatar');
    expect(src).toMatch(/\.logo\s*\{[^}]*min-width:\s*44px/);
    // Only the photo variant drops the link's own ring; the text fallback keeps the normal one.
    expect(src).toMatch(
      /\.nav \.logo:has\(img\.nav-avatar\):focus-visible\s*\{\s*outline:\s*none;/,
    );
    expect(src).not.toMatch(/\.nav \.logo:focus-visible\s*\{/);
    expect(src).toMatch(
      /\.nav \.logo:focus-visible :global\(img\.nav-avatar\)\s*\{[^}]*outline:\s*2px solid var\(--accent\);[^}]*outline-offset:\s*2px/,
    );
  });

  it.each(['en', 'vi'] as const)('profile %s sets the avatar', (lang) => {
    expect(profile(lang).avatar).toBe('../../../assets/profile/avatar.jpg');
  });
});

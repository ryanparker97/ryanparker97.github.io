import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import { unified } from '@astrojs/markdown-remark';
import tailwindcss from '@tailwindcss/vite';
import { remarkStarSections } from './src/lib/remark-star-sections';
import { viPageHasContent } from './src/lib/vi-coverage';
import { codeBlockTransformer } from './src/lib/shiki-transformer';

export default defineConfig({
  site: 'https://ryanparker97.github.io',
  trailingSlash: 'always',
  // Old web CV URLs (the PDFs stay at /cv.pdf). Static hosting: Astro emits meta-refresh pages.
  redirects: { '/cv/': '/experiences/', '/vi/cv/': '/vi/experiences/' },
  build: { format: 'directory' },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'vi'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    mdx(),
    icon(),
    sitemap({
      // Skip the print layout and /vi/ pages that only show the English fallback.
      filter: (page) => {
        const { pathname } = new URL(page);
        if (pathname.includes('/experiences/print/')) return false;
        if (pathname === '/cv/' || pathname === '/vi/cv/') return false; // redirect pages
        return !pathname.startsWith('/vi/') || viPageHasContent(pathname);
      },
      i18n: { defaultLocale: 'en', locales: { en: 'en-GB', vi: 'vi-VN' } },
    }),
  ],
  markdown: {
    // Astro 7 defaults to Sätteri; remark plugins need the unified processor.
    processor: unified({ remarkPlugins: [remarkStarSections] }),
    shikiConfig: {
      themes: { light: 'github-light-high-contrast', dark: 'github-dark-high-contrast' },
      defaultColor: false,
      transformers: [codeBlockTransformer()],
    },
  },
  vite: { plugins: [tailwindcss()] },
});

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export type BuiltPage = {
  path: string;
  html: string;
  lang: 'en' | 'vi';
  kind: 'page' | 'print' | '404';
};

const SKIP_DIRS = new Set(['_astro', 'pagefind']);

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, out);
    } else if (entry.name === 'index.html') {
      out.push(full);
    }
  }
}

/** Every built HTML page in dist/ (redirect stubs and stray files excluded). */
export function builtPages(): BuiltPage[] {
  const dist = join(process.cwd(), 'dist');
  if (!existsSync(dist)) throw new Error('dist/ is missing: run pnpm build first');
  const files: string[] = [];
  walk(dist, files);
  const notFound = join(dist, '404.html');
  if (existsSync(notFound)) files.push(notFound);

  const pages: BuiltPage[] = [];
  for (const file of files) {
    const html = readFileSync(file, 'utf8');
    if (/http-equiv=["']?refresh/i.test(html)) continue;
    const rel = relative(dist, file).split(sep).join('/');
    const path = '/' + rel.replace(/(^|\/)index\.html$/, '$1');
    const kind = rel === '404.html' ? '404' : /(^|\/)print\//.test(rel) ? 'print' : 'page';
    pages.push({
      path,
      html,
      lang: path === '/vi/' || path.startsWith('/vi/') ? 'vi' : 'en',
      kind,
    });
  }
  return pages;
}

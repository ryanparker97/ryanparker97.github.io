// Checks dist/cv.pdf and dist/vi/cv.pdf (spec §12): Letter size, <= 2 pages, expected text and links.
import { readFile } from 'node:fs/promises';
import { appendFileSync } from 'node:fs';
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFString } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import en from '../src/i18n/en.json';
import vi from '../src/i18n/vi.json';
import { readCollection } from './lib/frontmatter';

// Each PDF with the label of its "Languages" skills row (UI strings are translated).
const PDFS: { path: string; lang: 'en' | 'vi'; languages: string }[] = [
  { path: 'dist/cv.pdf', lang: 'en', languages: 'Languages' },
  { path: 'dist/vi/cv.pdf', lang: 'vi', languages: 'Ngôn ngữ' },
];
const LETTER = [612, 792];

// Whitespace is dropped because PDF text extraction can split glyph runs (e.g. Vietnamese marks).
// pdf.js extracts the embedded font's Đ glyph as U+00D0 (Ð), so fold ð to đ after lowercasing.
const norm = (s: string) =>
  s.normalize('NFC').replace(/[–—]/g, '-').replace(/\s+/g, '').toLowerCase().replace(/ð/g, 'đ');

async function expectedText(lang: 'en' | 'vi', languagesLabel: string) {
  const str = (v: unknown) => String(v);
  const [profile] = await readCollection('profile', lang);
  const inPdf = (p: Record<string, unknown>) => (p.inPdf ?? p.featured) === true;
  const ui = lang === 'vi' ? vi : en;
  return [
    str(profile.name),
    str(profile.headline),
    ...(await readCollection('experience', lang)).map((r) => str(r.role)),
    ...(await readCollection('projects', lang)).filter(inPdf).map((p) => str(p.title)),
    ...(await readCollection('skills', lang)).map((g) => str(g.group)),
    languagesLabel,
    ...(await readCollection('certifications', lang)).map((c) => str(c.name)),
    ...(await readCollection('education', lang)).map((e) => str(e.name)),
    // Section headings (rendered in capitals; matching is case-insensitive).
    ui['cv.summary'],
    ui['cv.experience'],
    ui['cv.print.projects'],
    ui['cv.print.skills'],
    ui['cv.print.certifications'],
    ui['cv.print.education'],
  ];
}

function linkUris(pdf: PDFDocument): string[] {
  const uris: string[] = [];
  for (const page of pdf.getPages()) {
    const annots = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
    for (let i = 0; i < (annots?.size() ?? 0); i++) {
      const action = annots?.lookup(i, PDFDict).lookupMaybe(PDFName.of('A'), PDFDict);
      const uri = action?.lookupMaybe(PDFName.of('URI'), PDFString);
      if (uri) uris.push(uri.decodeText());
    }
  }
  return uris;
}

async function check(path: string, expected: string[], summary: string[]) {
  const errors: string[] = [];
  const bytes = await readFile(path).catch(() => null);
  if (!bytes) return [`${path} does not exist`];

  const pdf = await PDFDocument.load(bytes);
  const pages = pdf.getPageCount();
  if (pages > 2) errors.push(`${pages} pages (max 2)`);
  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    if (Math.round(width) !== LETTER[0] || Math.round(height) !== LETTER[1])
      errors.push(`page size ${width}x${height} is not US Letter`);
  }

  const doc = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise;
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    text += content.items.map((it) => ('str' in it ? it.str : '')).join(' ') + ' ';
  }
  const haystack = norm(text);
  if (haystack.length < 500) errors.push('little or no selectable text');
  for (const s of expected) if (!haystack.includes(norm(s))) errors.push(`missing text: "${s}"`);

  const uris = linkUris(pdf);
  for (const prefix of ['mailto:', 'tel:', 'https://www.linkedin.com', 'https://github.com'])
    if (!uris.some((u) => u.startsWith(prefix))) errors.push(`missing ${prefix} link`);

  console.log(
    `${path}: ${pages} page(s), ${(bytes.length / 1024).toFixed(0)} KB, ${uris.length} links`,
  );
  summary.push(`- ${path}: ${pages} page(s), ${(bytes.length / 1024).toFixed(0)} KB`);
  return errors;
}

let failed = false;
const summary: string[] = ['### CV PDFs'];
for (const { path, lang, languages } of PDFS) {
  const errors = await check(path, await expectedText(lang, languages), summary);
  for (const e of errors) console.error(`  FAIL ${path}: ${e}`);
  failed ||= errors.length > 0;
}
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary.join('\n') + '\n');
process.exit(failed ? 1 : 0);

import { t, type Lang } from '../i18n';

/** `YYYY` or `YYYY-MM`. */
export const CV_DATE_RE = /^\d{4}(-(0[1-9]|1[0-2]))?$/;

const MONTHS_EN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** `2026-08` → "Aug 2026" (EN) / "08/2026" (VI); `2024` → "2024"; empty → "Present". */
export function formatCvDate(value: string | null | undefined, lang: Lang): string {
  if (!value) return t(lang, 'common.present');
  const [year, month] = value.split('-');
  if (!month) return year;
  return lang === 'vi' ? `${month}/${year}` : `${MONTHS_EN[Number(month) - 1]} ${year}`;
}

export const formatDateRange = (start: string, end: string | null | undefined, lang: Lang) =>
  `${formatCvDate(start, lang)} – ${formatCvDate(end, lang)}`;

/** Months since year 0; a year-only date counts as January. */
export function dateKey(value: string | null | undefined): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const [year, month] = value.split('-');
  return Number(year) * 12 + (month ? Number(month) - 1 : 0);
}

interface Dated {
  start: string;
  end?: string | null;
}

const ongoingFirst = (a: Dated, b: Dated) => Number(!b.end) - Number(!a.end);

/** Newest first. An ongoing role (empty `end`) always comes first, then by `start` descending. */
export function sortRoles<T extends Dated>(roles: T[]): T[] {
  return [...roles].sort(
    (a, b) =>
      ongoingFirst(a, b) || dateKey(b.start) - dateKey(a.start) || dateKey(b.end) - dateKey(a.end),
  );
}

/** Featured first, then `start` descending, then ongoing before finished. */
export function sortProjects<T extends Dated & { featured?: boolean }>(projects: T[]): T[] {
  return [...projects].sort(
    (a, b) =>
      Number(!!b.featured) - Number(!!a.featured) ||
      dateKey(b.start) - dateKey(a.start) ||
      ongoingFirst(a, b),
  );
}

/** "Datum / Security Bank" when a client is set, otherwise the company alone. */
export const companyLabel = (company: string, client?: string | null) =>
  client ? `${company} / ${client}` : company;

/**
 * Local-nav labels for the roles (spec §4.2.0): `shortName`, else the client, else the company; the
 * start year is added only to labels that appear more than once.
 */
export function roleNavLabels(
  roles: { company: string; client?: string | null; shortName?: string | null; start: string }[],
): string[] {
  const base = roles.map((r) => r.shortName || r.client || r.company);
  return roles.map((r, i) =>
    base.filter((b) => b === base[i]).length > 1 ? `${base[i]} ${startYear(r.start)}` : base[i],
  );
}

/** Plain-text display of a skill item: `AWS (EMR, S3)`. */
export const skillItemText = (item: { name: string; children?: string[] }) =>
  item.children?.length ? `${item.name} (${item.children.join(', ')})` : item.name;

/** `https://www.linkedin.com/in/x` → `linkedin.com/in/x`. */
export const displayUrl = (url: string) =>
  url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

/** A run of card text: plain, or any mix of bold, italic, code and link. */
export interface Span {
  text: string;
  bold: boolean;
  italic?: boolean;
  code?: boolean;
  href?: string;
  /** A tech-stack term (spec §4.2.3); never set together with `bold`. */
  tech?: boolean;
}

/** One highlight card (spec §4.2.3): an optional label (the card's H3) and the body spans. */
export interface Highlight {
  label: string | null;
  body: Span[];
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
};
const ENTITY = /^&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([a-zA-Z]+));/;
const LINK = /^\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/;
const ESCAPABLE = /[\\`*_{}[\]()#+\-.!|<>~&"'$%^=:;,/?@]/;
/** Links may be http(s), mailto, or site-relative; anything else (javascript:) is dropped. */
// `/` but not `//` or `/\` (protocol-relative, which browsers resolve off-site).
/** NUL, surrogates and out-of-range values decode to U+FFFD, as in CommonMark. */
function codePoint(n: number): string {
  return n === 0 || n > 0x10ffff || (n >= 0xd800 && n <= 0xdfff)
    ? '\uFFFD'
    : String.fromCodePoint(n);
}

const SAFE_URL = /^(https?:\/\/|mailto:|\/(?![/\\])|#)/i;

type Style = Pick<Span, 'bold' | 'italic' | 'href'>;

/**
 * Parses the inline Markdown a highlight bullet may use: `**bold**`, `*italic*`/`_italic_`,
 * `` `code` ``, `[text](url)`, backslash escapes and HTML entities. Anything unmatched stays
 * literal text.
 */
function parseInline(src: string, style: Style): Span[] {
  const out: Span[] = [];
  let buf = '';
  const flush = () => {
    if (!buf) return;
    out.push({
      text: buf,
      bold: !!style.bold,
      ...(style.italic && { italic: true }),
      ...(style.href && { href: style.href }),
    });
    buf = '';
  };
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const rest = src.slice(i);
    if (c === '\\' && i + 1 < src.length && ESCAPABLE.test(src[i + 1])) {
      buf += src[i + 1];
      i += 2;
    } else if (c === '`') {
      const end = src.indexOf('`', i + 1);
      if (end > i + 1) {
        flush();
        out.push({
          text: src.slice(i + 1, end),
          bold: !!style.bold,
          code: true,
          ...(style.italic && { italic: true }),
          ...(style.href && { href: style.href }),
        });
        i = end + 1;
      } else buf += src[i++];
    } else if (c === '[' && LINK.test(rest)) {
      const m = LINK.exec(rest)!;
      flush();
      const href = SAFE_URL.test(m[2]) ? m[2] : undefined;
      out.push(...parseInline(m[1], href ? { ...style, href } : style));
      i += m[0].length;
    } else if (c === '*' && src[i + 1] === '*') {
      let end = src.indexOf('**', i + 2);
      // `***x***`: close on the last two stars so the inner `*x*` is italic.
      while (end > i + 2 && src[end + 2] === '*') end++;
      if (end < 0) buf += src[i++];
      else {
        flush();
        const inner = src.slice(i + 2, end);
        if (inner.trim()) out.push(...parseInline(inner, { ...style, bold: true }));
        i = end + 2;
      }
    } else if (c === '*' || c === '_') {
      const before = src[i - 1] ?? ' ';
      const opens = !/\s/.test(src[i + 1] ?? ' ') && (c === '*' || !/[A-Za-z0-9]/.test(before));
      let end = -1;
      if (opens) {
        for (let j = i + 1; j < src.length; j++) {
          if (src[j] === '\\') j++;
          else if (
            src[j] === c &&
            src[j + 1] !== c &&
            !/\s/.test(src[j - 1]) &&
            (c === '*' || !/[A-Za-z0-9]/.test(src[j + 1] ?? ' '))
          ) {
            end = j;
            break;
          }
        }
      }
      if (end > i + 1) {
        flush();
        out.push(...parseInline(src.slice(i + 1, end), { ...style, italic: true }));
        i = end + 1;
      } else buf += src[i++];
    } else if (c === '&' && ENTITY.test(rest)) {
      const m = ENTITY.exec(rest)!;
      const decoded = m[1]
        ? codePoint(Number(m[1]))
        : m[2]
          ? codePoint(parseInt(m[2], 16))
          : ENTITIES[m[3]];
      if (decoded === undefined) buf += src[i++];
      else {
        buf += decoded;
        i += m[0].length;
      }
    } else buf += src[i++];
  }
  flush();
  return out;
}

const sameStyle = (a: Span, b: Span) =>
  a.bold === b.bold && !a.italic === !b.italic && !a.code === !b.code && a.href === b.href;

function spans(src: string): Span[] {
  // Merge neighbours of the same kind (an empty `****` can split plain text in two).
  return parseInline(src, { bold: false }).reduce<Span[]>((acc, s) => {
    const last = acc[acc.length - 1];
    if (last && !s.code && sameStyle(last, s)) last.text += s.text;
    else acc.push({ ...s });
    return acc;
  }, []);
}

/** The first colon that ends a label: followed by whitespace or the end ("10:30" is not one). */
const LABEL_COLON = /:(?=\s|$)/;

/**
 * Turns one bullet's Markdown into a card. The label is the leading bold run up to the first
 * colon, written either `**Label:** detail` or `**Label**: detail`. A bullet that does not start
 * with a bold label becomes a card with a body only; its inline formatting is kept as spans.
 */
export function parseHighlight(bullet: string): Highlight {
  const all = spans(bullet.trim());
  const first = all[0];
  if (first?.bold) {
    const inside = first.text.search(LABEL_COLON);
    if (inside >= 0) {
      const label = first.text.slice(0, inside).trim();
      const tail = first.text.slice(inside + 1).trim();
      if (label) {
        return {
          label,
          body: trimBody([...(tail ? [{ ...first, text: tail }] : []), ...all.slice(1)]),
        };
      }
    } else if (all[1] && !all[1].bold && /^\s*:/.test(all[1].text)) {
      const label = first.text.trim();
      const body = [{ ...all[1], text: all[1].text.replace(/^\s*:/, '') }, ...all.slice(2)];
      return { label, body: trimBody(body) };
    }
  }
  return { label: null, body: trimBody(all) };
}

function trimBody(body: Span[]): Span[] {
  const out = body.map((s) => ({ ...s })).filter((s) => s.text !== '');
  if (out[0]) out[0].text = out[0].text.replace(/^\s+/, '');
  const last = out[out.length - 1];
  if (last) last.text = last.text.replace(/\s+$/, '');
  return out.filter((s) => s.text !== '');
}

/**
 * One card per top-level bullet of an experience body. Lines indented under a bullet (wrapped text
 * or nested bullets) belong to that bullet, so every bullet maps to exactly one card.
 */
export function parseHighlights(markdown: string): Highlight[] {
  const bullets: string[] = [];
  for (const line of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    const start = /^[-*+]\s+(.*)$/.exec(line);
    if (start) bullets.push(start[1]);
    else if (bullets.length && /^\s+\S/.test(line)) {
      bullets[bullets.length - 1] += ` ${line.trim().replace(/^[-*+]\s+/, '')}`;
    }
  }
  return bullets.map(parseHighlight).filter((h) => h.label || h.body.length);
}

/** `2026-08` → `2026`. */
export const startYear = (date: string) => date.slice(0, 4);

/** The earliest `start` year among the roles (spec §4.2.1); undefined with no roles. */
export function earliestYear(roles: { start: string }[]): string | undefined {
  return roles.map((r) => startYear(r.start)).sort()[0];
}

/**
 * Tech vocabulary (spec §4.2.3): the given terms plus every skill item and child name, deduped
 * case-insensitively (first casing wins) and sorted longest first so *Apache Spark* beats *Spark*.
 */
export function buildTechVocab(
  roleTech: string[],
  skillItems: { name: string; children?: string[] }[] = [],
): string[] {
  const seen = new Map<string, string>();
  for (const term of [...roleTech, ...skillItems.flatMap((i) => [i.name, ...(i.children ?? [])])]) {
    const k = term.trim().toLowerCase();
    if (k && !seen.has(k)) seen.set(k, term.trim());
  }
  return [...seen.values()].sort((a, b) => b.length - a.length || a.localeCompare(b));
}

const WORD = /[\p{L}\p{N}+#]/u;
const ALNUM = /[\p{L}\p{N}]/u;
/** A word character at `i`; a `.` counts only inside a word (`a.b`), so a sentence period does not. */
const wordAt = (s: string, i: number, dir: 1 | -1) => {
  const c = s[i];
  if (c === undefined) return false;
  if (WORD.test(c)) return true;
  return c === '.' && ALNUM.test(s[i + dir] ?? '');
};

/**
 * Splits plain and bold text spans so each whole-word, case-insensitive vocabulary match becomes its
 * own `tech: true` span (original casing kept, bold dropped, the rest of a bold run stays bold).
 * Longest term first (`vocab` must come from `buildTechVocab`). Code and link spans are untouched.
 */
export function markTech(input: Span[], vocab: string[]): Span[] {
  const terms = vocab.map((v) => v.toLowerCase());
  const out: Span[] = [];
  // Matching runs over each stretch of consecutive plain/bold/italic spans, so a term split by
  // formatting (`**GitLab** CI/CD`) still matches; a match is then cut back along span edges.
  let group: Span[] = [];
  const flush = () => {
    if (group.length) out.push(...markGroup(group, terms));
    group = [];
  };
  for (const span of input) {
    if (span.code || span.href) {
      flush();
      out.push(span);
    } else group.push(span);
  }
  flush();
  return out;
}

function markGroup(spans: Span[], terms: string[]): Span[] {
  const text = spans.map((s) => s.text).join('');
  const lower = text.toLowerCase();
  if (!terms.length || lower.length !== text.length) return spans;
  // Matched [start, end) ranges, left to right, never overlapping.
  const hits: [number, number][] = [];
  for (let i = 0; i < text.length;) {
    let len = 0;
    // A term cannot start in the middle of a word (the character before is a word character).
    if (!wordAt(text, i - 1, -1)) {
      for (const term of terms) {
        if (!lower.startsWith(term, i)) continue;
        if (i + term.length < text.length && wordAt(text, i + term.length, 1)) continue;
        len = term.length;
        break;
      }
    }
    if (len) {
      hits.push([i, i + len]);
      i += len;
    } else i++;
  }
  if (!hits.length) return spans;
  const out: Span[] = [];
  let offset = 0;
  for (const span of spans) {
    const end = offset + span.text.length;
    let at = offset;
    const emit = (to: number, tech: boolean) => {
      if (to <= at) return;
      const piece = span.text.slice(at - offset, to - offset);
      out.push(tech ? { ...span, bold: false, text: piece, tech: true } : { ...span, text: piece });
      at = to;
    };
    for (const [from, to] of hits) {
      if (to <= at || from >= end) continue;
      emit(Math.max(from, at), false);
      emit(Math.min(to, end), true);
    }
    emit(end, false);
    offset = end;
  }
  return out;
}

/** Cuts spans to at most `max` characters at a word boundary, adding an ellipsis (spec §4.2.0). */
export function truncateSpans(input: Span[], max = 140): Span[] {
  const total = input.reduce((n, s) => n + s.text.length, 0);
  if (total <= max) return input;
  const out: Span[] = [];
  let used = 0;
  for (const span of input) {
    const room = max - 1 - used;
    if (room <= 0) break;
    if (span.text.length <= room) {
      out.push({ ...span });
      used += span.text.length;
      continue;
    }
    // A `mark.tech` is never split: it is dropped whole.
    if (span.tech) break;
    const cut = span.text.slice(0, room);
    // The cut is already on a word boundary when the next character is a space.
    const at = span.text[room] === ' ' ? cut.length : cut.lastIndexOf(' ');
    const text = at >= 0 ? cut.slice(0, at) : out.length ? '' : cut;
    if (text.trim()) out.push({ ...span, text });
    break;
  }
  const last = out[out.length - 1];
  if (last) {
    last.text = last.text.replace(/[\s,;:.\-–—]+$/, '');
    // The ellipsis never sits inside a highlight.
    if (last.tech) out.push({ text: '…', bold: false });
    else last.text += '…';
  }
  return out;
}

/** The bullet that feeds a role's gallery card: `highlight` (1-based), default the first. */
export function pickHighlight(cards: Highlight[], index?: number): Highlight | undefined {
  return cards[Math.min(Math.max((index ?? 1) - 1, 0), cards.length - 1)];
}

/**
 * Tech chips at S show at most two rows (spec §4.2.1); the rest collapse into a "+N" chip. Widths
 * are estimated at build time (12px type, 12px padding, 8px gaps) for a 328px row.
 */
export function foldChips(
  tech: string[],
  rowWidth = 328,
  rows = 2,
): { shown: number; more: number } {
  let row = 1;
  let used = 0;
  let shown = 0;
  for (const t of tech) {
    const w = Math.ceil([...t].length * 6.6) + 24;
    const next = used === 0 ? w : used + 8 + w;
    if (next > rowWidth) {
      row++;
      used = w;
    } else used = next;
    if (row > rows) break;
    shown++;
  }
  // Leave room for the "+N" chip on the last row.
  if (shown < tech.length && shown > 0) shown--;
  return { shown, more: tech.length - shown };
}

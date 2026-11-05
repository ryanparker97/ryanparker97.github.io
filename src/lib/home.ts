/** Pure helpers for the Home tiles (spec §4.1). */

export type GridTileId = 'work' | 'stories' | 'writing' | 'certifications';

export interface GridTile {
  id: GridTileId;
  /** The last tile of an odd-count grid spans both columns. */
  span: boolean;
}

/**
 * Which grid tiles render, in order (spec §4.1.5). A kind with no content is left out and the grid
 * closes up. The Writing tile always renders (it has its own empty state). With an odd number of
 * tiles the last one spans both columns.
 */
export function gridPlan(has: { project: boolean; story: boolean; certs: boolean }): GridTile[] {
  const ids: GridTileId[] = [
    ...(has.project ? (['work'] as const) : []),
    ...(has.story ? (['stories'] as const) : []),
    'writing',
    ...(has.certs ? (['certifications'] as const) : []),
  ];
  return ids.map((id, i) => ({ id, span: ids.length % 2 === 1 && i === ids.length - 1 }));
}

/** "Ownership, technical depth, customer focus." (spec §4.1.5): first label as is, the rest lower-cased. */
export function sentenceList(labels: string[], lang: 'en' | 'vi'): string {
  if (!labels.length) return '';
  return labels.map((l, i) => (i === 0 ? l : l.toLocaleLowerCase(lang))).join(', ') + '.';
}

/** Soft guard for the 120-character subline rule: cut at a word boundary and add an ellipsis. */
export function clampSubline(s: string, max = 120): string {
  const text = s.trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const at = cut.lastIndexOf(' ');
  return `${(at > 0 ? cut.slice(0, at) : cut).replace(/[\s,;:.\-–—]+$/, '')}…`;
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);

/**
 * A tile headline is at most 8 words (spec §4.1.0). A longer title is cut at its first colon when
 * that leaves a short headline ("Neovim setup guide, Part 1: from zero to ..."), else truncated.
 */
export function tileHeadline(title: string, max = 8): string {
  if (words(title).length <= max) return title;
  const head = title.split(':')[0].trim();
  if (head !== title && words(head).length >= 2 && words(head).length <= max) return head;
  return `${words(title).slice(0, max).join(' ')}…`;
}

/** Every company once, in the given (newest first) order. `client` values are not shown. */
export const uniqueCompanies = (roles: { company: string }[]): string[] => [
  ...new Set(roles.map((r) => r.company)),
];

/** At most `max` top-level item names (children are not shown on Home) and how many were cut. */
export function skillNames(items: { name: string }[], max = 5): { names: string[]; more: number } {
  return { names: items.slice(0, max).map((i) => i.name), more: Math.max(items.length - max, 0) };
}

export interface Stat {
  /** Short caption above the value ("Led", "Cut"); optional. */
  above?: string;
  value: string;
  /** Caption below the value. */
  below: string;
}

export const hasDigit = (s: string) => /\d/.test(s);

/**
 * The hero stat strip (spec §4.1.2): numbers only, up to three lockups. A source that is empty or
 * has no digit is left out.
 */
export function highlightStats(input: {
  years: string;
  yearsLabel: string;
  metric?: { value: string; label: string };
  metricPrefix?: string;
  story?: { prefix?: string; value: string; label: string };
}): Stat[] {
  const stats: Stat[] = [];
  if (hasDigit(input.years)) stats.push({ value: input.years, below: input.yearsLabel });
  if (input.metric && hasDigit(input.metric.value))
    stats.push({ above: input.metricPrefix, value: input.metric.value, below: input.metric.label });
  if (input.story && hasDigit(input.story.value))
    stats.push({ above: input.story.prefix, value: input.story.value, below: input.story.label });
  return stats;
}

/** Copy longer than 120 characters switches a lockup to start-aligned at S (spec §5.10.4). */
export const isLongCopy = (...parts: (string | undefined)[]): boolean =>
  parts.filter(Boolean).join(' ').length > 120;

/** The first featured story (newest first), falling back to the newest story. */
export function pickStory<T extends { data: { featured: boolean; date: Date } }>(
  stories: T[],
): T | undefined {
  const newest = [...stories].sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  return newest.find((s) => s.data.featured) ?? newest[0];
}

/** Escapes text and turns `**bold**` phrases into `<strong>` (lockup copy, spec §5.4). */
export function boldHtml(s: string): string {
  const esc = s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  return esc.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

export interface RailStint {
  /** First and last year of the stint; `to` is null while it is ongoing. */
  from: string;
  to: string | null;
  /** Start offset and width as fractions of the whole career span. */
  s: number;
  w: number;
  current: boolean;
}

export interface RailRow {
  company: string;
  current: boolean;
  stints: RailStint[];
}

export interface Rail {
  rows: RailRow[];
  firstYear: string;
  lastYear: string;
}

const monthKey = (value: string | null | undefined, now: number) => {
  if (!value) return now;
  const [year, month] = value.split('-');
  return Number(year) * 12 + (month ? Number(month) - 1 : 0);
};

/**
 * The career rail (spec §4.1.3): one row per company, newest first. Stints that run back to back
 * at one company are merged into one bar. Offsets and widths are fractions of the whole career
 * span, from the earliest start to `now` (months since year 0; a year-only date counts as January).
 */
export function careerRail(
  roles: { company: string; start: string; end?: string | null }[],
  now: Date = new Date(),
): Rail {
  const nowKey = now.getFullYear() * 12 + now.getMonth();
  const spans = roles.map((r) => ({
    company: r.company,
    from: monthKey(r.start, nowKey),
    to: monthKey(r.end, nowKey),
    ongoing: !r.end,
  }));
  if (!spans.length) return { rows: [], firstYear: '', lastYear: '' };
  const min = Math.min(...spans.map((s) => s.from));
  const max = Math.max(nowKey, ...spans.map((s) => s.to));
  const total = Math.max(max - min, 1);
  const year = (key: number) => String(Math.floor(key / 12));
  const rows: RailRow[] = [];
  const order = [...new Set(roles.map((r) => r.company))];
  for (const company of order) {
    const mine = spans.filter((s) => s.company === company).sort((a, b) => a.from - b.from);
    const merged: typeof mine = [];
    for (const s of mine) {
      const last = merged[merged.length - 1];
      if (last && s.from <= last.to) {
        last.to = Math.max(last.to, s.to);
        last.ongoing = last.ongoing || s.ongoing;
      } else merged.push({ ...s });
    }
    const stints = merged.map((s) => ({
      from: year(s.from),
      to: s.ongoing ? null : year(s.to),
      s: Number(((s.from - min) / total).toFixed(4)),
      w: Number((Math.max(s.to - s.from, 1) / total).toFixed(4)),
      current: s.ongoing,
    }));
    rows.push({ company, current: stints.some((s) => s.current), stints });
  }
  return { rows, firstYear: year(min), lastYear: year(max) };
}

/** Pure helpers for the Home tiles (spec §4.1). */

/** Soft guard for the 120-character subline rule: cut at a word boundary and add an ellipsis. */
export function clampSubline(s: string, max = 120): string {
  const text = s.trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const at = cut.lastIndexOf(' ');
  return `${(at > 0 ? cut.slice(0, at) : cut).replace(/[\s,;:.\-–—]+$/, '')}…`;
}

/** Every company once, in the given (newest first) order. `client` values are not shown. */
export const uniqueCompanies = (roles: { company: string }[]): string[] => [
  ...new Set(roles.map((r) => r.company)),
];

export interface Stat {
  /** Short caption above the value ("Led", "Cut"); optional. */
  above?: string;
  value: string;
  /** Caption below the value. */
  below: string;
  /** Optional footnote text (spec §5.10.12). */
  note?: string;
}

export const hasDigit = (s: string) => /\d/.test(s);

/**
 * The hero stat strip (spec §4.1.2): numbers only, up to three lockups. A source that is empty or
 * has no digit is left out.
 */
export function highlightStats(input: {
  years: string;
  yearsLabel: string;
  yearsNote?: string;
  metric?: { value: string; label: string; note?: string };
  metricPrefix?: string;
  story?: { prefix?: string; value: string; label: string; note?: string };
}): Stat[] {
  const stats: Stat[] = [];
  if (hasDigit(input.years))
    stats.push({ value: input.years, below: input.yearsLabel, note: input.yearsNote });
  if (input.metric && hasDigit(input.metric.value))
    stats.push({
      above: input.metricPrefix,
      value: input.metric.value,
      below: input.metric.label,
      note: input.metric.note,
    });
  if (input.story && hasDigit(input.story.value))
    stats.push({
      above: input.story.prefix,
      value: input.story.value,
      below: input.story.label,
      note: input.story.note,
    });
  return stats;
}

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

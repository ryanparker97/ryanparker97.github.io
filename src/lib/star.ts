export interface StoryLike {
  slug: string;
  data: { role?: string; date: Date; metrics: { label: string; value: string }[] };
}

export interface StarGroup<S, R> {
  /** Role slug (the Experiences timeline links to `/star/#<id>`), or `other`. */
  id: string;
  role?: R;
  stories: S[];
}

/**
 * Groups stories by role, in the order of `roles` (pass them newest first, like Experiences).
 * Roles without stories are left out; stories without a role go into a final "other" group.
 * Within a group, newest stories come first.
 */
export function groupStories<S extends StoryLike, R extends { slug: string }>(
  stories: S[],
  roles: R[],
): StarGroup<S, R>[] {
  const known = new Set(roles.map((r) => r.slug));
  for (const s of stories) {
    if (s.data.role && !known.has(s.data.role))
      throw new Error(`STAR story "${s.slug}" references unknown role "${s.data.role}".`);
  }
  const newestFirst = (a: S, b: S) => b.data.date.getTime() - a.data.date.getTime();
  const groups: StarGroup<S, R>[] = roles
    .map((role) => ({
      id: role.slug,
      role,
      stories: stories.filter((s) => s.data.role === role.slug).sort(newestFirst),
    }))
    .filter((g) => g.stories.length > 0);
  const other = stories.filter((s) => !s.data.role).sort(newestFirst);
  if (other.length) groups.push({ id: 'other', stories: other });
  return groups;
}

/**
 * Splits a rendered story into the lead (anything before the first H2, such as a note) and the
 * HTML of its four sections (everything after each H2).
 */
export function splitStarHtml(html: string): {
  lead: string;
  sections: [string, string, string, string];
} {
  const [lead, ...parts] = html.split(/<h2\b[^>]*>[\s\S]*?<\/h2>/i);
  if (parts.length !== 4) throw new Error(`Expected four STAR sections, found ${parts.length}.`);
  return {
    lead: lead.trim(),
    sections: parts.map((p) => p.trim()) as [string, string, string, string],
  };
}

/** The chip shown on a collapsed card: the first metric, e.g. "+40% conversion". */
export function headlineMetric(metrics: { label: string; value: string }[]): string | undefined {
  const m = metrics[0];
  return m ? `${m.value} ${m.label}` : undefined;
}

export interface Metric {
  prefix?: string;
  label: string;
  value: string;
  compare?: { label: string; value: number }[];
}

/** The story's headline stat (spec §4.1.2): the first metric, when its value has a digit. */
export function headlineStat(metrics: Metric[]): Metric | undefined {
  const m = metrics[0];
  return m && /\d/.test(m.value) ? m : undefined;
}

/** Graph bars (spec §5.10.9): widths are proportional to the largest value, in 0-1. */
export function graphBars(compare: { label: string; value: number }[]) {
  const max = Math.max(...compare.map((c) => c.value));
  return compare.map((c, i) => ({
    label: c.label,
    value: c.value,
    w: Number((c.value / max).toFixed(3)),
    after: i === compare.length - 1,
  }));
}

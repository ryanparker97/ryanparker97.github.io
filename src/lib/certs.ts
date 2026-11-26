import { formatCvDate } from './cv';
import { t, type Lang } from '../i18n';

/** Target month of a planned certification: `YYYY-MM`. */
export const PLANNED_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export interface CertData {
  name: string;
  issuer: string;
  year?: string;
  planned?: string;
  credentialUrl?: string;
  badge?: unknown;
  logo?: string;
}

/** A planned certification is not yet earned: it has a target month and no `year`. */
export const isPlanned = (d: CertData): boolean => d.planned !== undefined;

/** One message per broken rule; empty when the entry is valid. Enforced at build by the schema. */
export function certProblems(d: CertData): string[] {
  const problems: string[] = [];
  if ((d.year !== undefined) === (d.planned !== undefined))
    problems.push('Set exactly one of `year` (earned) and `planned` (YYYY-MM)');
  if (d.planned !== undefined && d.credentialUrl !== undefined)
    problems.push('A planned certification cannot have a `credentialUrl`');
  if (d.planned !== undefined && d.badge !== undefined)
    problems.push('A planned certification cannot have a `badge`');
  return problems;
}

/** Earned: `{ date: year }`. Planned: `{ status: "Planned", date: "Apr 2027" }` (VI "Dự kiến", "04/2027"). */
export function certWhenParts(d: CertData, lang: Lang): { status?: string; date: string } {
  if (d.planned !== undefined)
    return { status: t(lang, 'home.certs.planned'), date: formatCvDate(d.planned, lang) };
  return { date: d.year ?? '' };
}

/** "2022", "Planned · Apr 2027" or "Dự kiến · 04/2027". */
export function certWhen(d: CertData, lang: Lang): string {
  const parts = certWhenParts(d, lang);
  return [parts.status, parts.date].filter(Boolean).join(' · ');
}

/** Earned by `year` descending, then planned by `planned` ascending. Stable. */
export function sortCerts<T extends { data: CertData }>(items: readonly T[]): T[] {
  const earned = items.filter((c) => !isPlanned(c.data));
  const planned = items.filter((c) => isPlanned(c.data));
  return [
    ...earned.sort((a, b) => (b.data.year ?? '').localeCompare(a.data.year ?? '')),
    ...planned.sort((a, b) => (a.data.planned ?? '').localeCompare(b.data.planned ?? '')),
  ];
}

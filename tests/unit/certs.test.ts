import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  PLANNED_RE,
  certProblems,
  certWhen,
  isPlanned,
  sortCerts,
  type CertData,
} from '../../src/lib/certs';
import { frontmatter } from '../../scripts/lib/frontmatter';

const base = { name: 'N', issuer: 'I' };
const aws: CertData = { ...base, year: '2022' };
const dd: CertData = { ...base, year: '2023' };
const cca: CertData = { ...base, planned: '2027-04' };

describe('certProblems', () => {
  it('accepts year only and planned only', () => {
    expect(certProblems(aws)).toEqual([]);
    expect(certProblems(cca)).toEqual([]);
  });
  it('rejects both, neither, planned + credentialUrl and planned + badge', () => {
    expect(certProblems({ ...cca, year: '2027' })).toHaveLength(1);
    expect(certProblems(base)).toHaveLength(1);
    expect(certProblems({ ...cca, credentialUrl: 'https://example.com' })).toHaveLength(1);
    expect(certProblems({ ...cca, badge: {} })).toHaveLength(1);
  });
});

describe('PLANNED_RE', () => {
  it('needs YYYY-MM with a real month', () => {
    expect(PLANNED_RE.test('2027-04')).toBe(true);
    for (const bad of ['2027', '2027-4', '2027-13', '2027-00'])
      expect(PLANNED_RE.test(bad)).toBe(false);
  });
});

describe('certWhen', () => {
  it('renders earned as the year and planned with a status and month', () => {
    expect(certWhen(aws, 'en')).toBe('2022');
    expect(certWhen(cca, 'en')).toBe('Planned · Apr 2027');
    expect(certWhen(cca, 'vi')).toBe('Dự kiến · 04/2027');
    expect(isPlanned(cca)).toBe(true);
    expect(isPlanned(aws)).toBe(false);
  });
});

describe('sortCerts', () => {
  it('puts earned newest first, then planned by month', () => {
    const items = [{ data: cca }, { data: aws }, { data: dd }];
    expect(sortCerts(items).map((i) => i.data)).toEqual([dd, aws, cca]);
    const later = { ...base, planned: '2027-09' };
    const sorted = sortCerts([{ data: later }, { data: cca }]).map((i) => i.data.planned);
    expect(sorted).toEqual(['2027-04', '2027-09']);
  });
});

describe('certifications content', () => {
  const read = (lang: string) =>
    readdirSync(`src/content/certifications/${lang}`)
      .filter((f) => f.endsWith('.md'))
      .map((f) => ({
        file: f,
        fm: frontmatter(readFileSync(`src/content/certifications/${lang}/${f}`, 'utf8')),
      }));

  for (const lang of ['en', 'vi']) {
    it(`${lang}: every entry is valid and exactly one is the planned Claude Certified Architect`, () => {
      const entries = read(lang);
      for (const { fm } of entries) expect(certProblems(fm as unknown as CertData)).toEqual([]);
      const planned = entries.filter((e) => e.fm.planned !== undefined);
      expect(planned).toHaveLength(1);
      expect(planned[0].file).toBe('claude-certified-architect.md');
      const fm = planned[0].fm;
      expect(fm.name).toBe('Claude Certified Architect');
      expect(fm.issuer).toBe('Anthropic');
      expect(fm.planned).toBe('2027-04');
      for (const k of ['year', 'credentialUrl', 'badge']) expect(fm[k]).toBeUndefined();
      // owner, photo-logos: the planned cert shows the Claude mark (reverses the earlier no-logo rule)
      expect(fm.logo).toBe('logos:claude-icon');
      expect(certProblems({ ...cca, logo: fm.logo as string })).toEqual([]);
    });
  }

  it('EN and VI agree', () => {
    const pick = (lang: string) =>
      read(lang).find((e) => e.file === 'claude-certified-architect.md')?.fm;
    expect(pick('vi')).toEqual(pick('en'));
  });
});

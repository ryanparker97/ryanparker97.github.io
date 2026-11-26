import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import en from '../../src/i18n/en.json';
import vi from '../../src/i18n/vi.json';
import { NEXT_MILESTONE, NEXT_STEPS, nextHref } from '../../src/lib/career-next';
import { certWhen, type CertData } from '../../src/lib/certs';
import { frontmatter } from '../../scripts/lib/frontmatter';
import {
  NEXT_ALLOWED,
  NEXT_FORBIDDEN,
  NEXT_STEP_ALLOWED,
  norm,
  withoutAllowed,
  withoutStepAllowed,
} from '../e2e/next-words';

const dict = { en, vi } as Record<'en' | 'vi', Record<string, string>>;
const keys = (s: (typeof NEXT_STEPS)[number]) => [s.eyebrow, s.title, s.text, s.link] as string[];
const SAME_IN_VI = new Set(['exp.next.architecture.title', 'exp.next.deployed.title']);

describe('career-next', () => {
  it('lists the two steps in display order', () => {
    expect(NEXT_STEPS.map((s) => s.id)).toEqual(['architecture', 'deployed']);
  });

  it('has a non-empty string for every key in both languages', () => {
    for (const lang of ['en', 'vi'] as const)
      for (const s of NEXT_STEPS)
        for (const k of keys(s)) {
          expect(typeof dict[lang][k], `${lang} ${k}`).toBe('string');
          expect(dict[lang][k].trim().length, `${lang} ${k}`).toBeGreaterThan(0);
        }
    expect(typeof en['exp.next.title']).toBe('string');
    expect(typeof vi['exp.next.title']).toBe('string');
  });

  it('translates every string except the kept English term', () => {
    const all = [...NEXT_STEPS.flatMap(keys), 'exp.next.title'];
    for (const k of all) {
      if (SAME_IN_VI.has(k)) expect(vi[k as keyof typeof vi]).toBe(en[k as keyof typeof en]);
      else expect(vi[k as keyof typeof vi], k).not.toBe(en[k as keyof typeof en]);
    }
  });

  it('points at evidence that exists in both languages', () => {
    for (const s of NEXT_STEPS)
      for (const lang of ['en', 'vi'])
        expect(
          existsSync(`src/content/${s.collection}/${lang}/${s.slug}.md`),
          `${lang} ${s.slug}`,
        ).toBe(true);
  });

  it('builds localised hrefs', () => {
    expect(nextHref(NEXT_STEPS[0], 'en')).toBe('/experiences/fpt-software-senior-data-engineer/');
    expect(nextHref(NEXT_STEPS[1], 'vi')).toBe('/vi/projects/agentic-coding-workflow/');
  });

  it('keeps titles, years, employers and job-hunt phrases out of every string', () => {
    // The allow-list applies to the eyebrow and title only; goal text and link text are checked raw.
    for (const lang of ['en', 'vi'] as const)
      for (const s of NEXT_STEPS) {
        const checked: [string, string][] = [
          [s.eyebrow, withoutAllowed(dict[lang][s.eyebrow])],
          [s.title, withoutAllowed(dict[lang][s.title])],
          [s.text, dict[lang][s.text]],
          [s.link, dict[lang][s.link]],
        ];
        for (const [k, v] of [...checked, ['exp.next.title', dict[lang]['exp.next.title']]])
          for (const re of NEXT_FORBIDDEN)
            expect(re.test(v), `${lang} ${k} matches ${re}`).toBe(false);
      }
  });

  it('shows the owner-chosen titles and target years, exactly', () => {
    expect([en['exp.next.architecture.title'], en['exp.next.architecture.eyebrow']]).toEqual([
      'Enterprise Data Architect',
      'Goal · by 2029',
    ]);
    expect([en['exp.next.deployed.title'], en['exp.next.deployed.eyebrow']]).toEqual([
      'Forward Deployed Engineer (FDE)',
      'Goal · by 2031',
    ]);
    expect([vi['exp.next.architecture.title'], vi['exp.next.architecture.eyebrow']]).toEqual([
      'Enterprise Data Architect',
      'Mục tiêu · đến năm 2029',
    ]);
    expect([vi['exp.next.deployed.title'], vi['exp.next.deployed.eyebrow']]).toEqual([
      'Forward Deployed Engineer (FDE)',
      'Mục tiêu · đến năm 2031',
    ]);
  });

  it('still forbids other titles, years, job-hunt phrases and employers', () => {
    // Goal and link text are checked raw; only a title or eyebrow goes through the allow-list.
    const hit = (s: string) => NEXT_FORBIDDEN.some((re) => re.test(norm(s)));
    const hitTitle = (s: string) => hit(withoutAllowed(s));
    for (const bad of [
      'Seeking a role',
      'Open to work',
      'by 2030',
      'Senior Data Architect',
      'Chief Engineer',
      'In 3 years',
      'Joining Databricks',
      'Goal · by 2029 at FPT',
      'Senior Enterprise Data Architect',
      'Lead Forward Deployed Engineer (FDE)',
      'Looking for my next role',
      'Available for hire',
      'Hiring? Let us talk',
      'Goal · within three years',
      'Mục tiêu · trong ba năm',
      'Trong 3 năm tới',
      'Sẵn sàng cho vị trí mới',
      'Đang tìm việc',
      'Looking\u00a0for my next role',
      'Looking\u202ffor my next role',
      'Sẵn sàng'.normalize('NFD'),
      'tìm việc'.normalize('NFD'),
      '5+ years of Spark',
      'A 10-year plan',
      'Kinh nghiệm 5+ năm',
      'fifteen years on',
      'hai mươi năm',
      'mười lăm năm kinh nghiệm',
      'ứng tuyển vị trí dữ liệu',
    ])
      expect(hit(bad), bad).toBe(true);
    // A rank-prefixed title is not an allowed title: the title field must equal an allowed string.
    for (const bad of ['Senior Enterprise Data Architect', 'Lead Forward Deployed Engineer (FDE)'])
      expect(NEXT_ALLOWED.includes(bad), bad).toBe(false);
    for (const s of NEXT_STEPS)
      for (const lang of ['en', 'vi'] as const) {
        expect(hit(dict[lang][s.text]), `${lang} ${s.text}`).toBe(false);
        expect(hit(dict[lang][s.link]), `${lang} ${s.link}`).toBe(false);
        expect(hitTitle(dict[lang][s.title]), `${lang} ${s.title}`).toBe(false);
        expect(hitTitle(dict[lang][s.eyebrow]), `${lang} ${s.eyebrow}`).toBe(false);
      }
    for (const ok of NEXT_ALLOWED) expect(hitTitle(ok), ok).toBe(false);
  });
});

describe('NEXT_MILESTONE', () => {
  const fm = (lang: 'en' | 'vi') =>
    frontmatter(
      readFileSync(`src/content/certifications/${lang}/${NEXT_MILESTONE.cert}.md`, 'utf8'),
    ) as unknown as CertData;

  it('has non-empty copy in both languages and the same title', () => {
    for (const lang of ['en', 'vi'] as const)
      for (const k of [NEXT_MILESTONE.eyebrow, NEXT_MILESTONE.title])
        expect(dict[lang][k]?.trim().length, `${lang} ${k}`).toBeGreaterThan(0);
    expect(vi[NEXT_MILESTONE.title]).toBe(en[NEXT_MILESTONE.title]);
  });

  it('is pinned to the planned certification entry', () => {
    for (const lang of ['en', 'vi'] as const) {
      const entry = fm(lang);
      expect(entry.planned, lang).toBeDefined();
      expect(dict[lang][NEXT_MILESTONE.eyebrow], lang).toBe(certWhen(entry, lang));
      expect(dict[lang][NEXT_MILESTONE.title], lang).toBe(entry.name);
      // owner, photo-logos: the dated step carries the same Claude mark as the planned entry
      expect(NEXT_MILESTONE.logo, lang).toBe('logos:claude-icon');
      expect(entry.logo, lang).toBe(NEXT_MILESTONE.logo);
    }
  });

  it('passes the forbidden list after its own allow-list, and names no issuer', () => {
    for (const lang of ['en', 'vi'] as const)
      for (const k of [NEXT_MILESTONE.eyebrow, NEXT_MILESTONE.title]) {
        const rest = withoutStepAllowed(dict[lang][k]);
        for (const re of NEXT_FORBIDDEN) expect(re.test(rest), `${lang} ${k} ${re}`).toBe(false);
        expect(dict[lang][k]).not.toMatch(/Anthropic/i);
      }
  });

  it('shares no allowed string with the goal allow-list', () => {
    for (const a of NEXT_STEP_ALLOWED) expect(NEXT_ALLOWED).not.toContain(a);
  });

  it('still rejects other years, issuers and titles', () => {
    // "Senior …" matches no forbidden word, so leftover text after the allow-list also counts as a hit.
    const hit = (s: string) =>
      NEXT_FORBIDDEN.some((re) => re.test(withoutStepAllowed(s))) ||
      withoutStepAllowed(s).replace(/[\s·]/g, '') !== '';
    for (const bad of [
      'Planned · Apr 2028',
      'Claude Certified Architect at Anthropic',
      'Senior Claude Certified Architect',
      'Planned · by 2027',
      'Certified Architect',
    ])
      expect(hit(bad), bad).toBe(true);
  });
});

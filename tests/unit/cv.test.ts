import { describe, expect, it } from 'vitest';
import {
  CV_DATE_RE,
  companyLabel,
  earliestYear,
  startYear,
  formatCvDate,
  formatDateRange,
  buildTechVocab,
  markTech,
  parseHighlight,
  parseHighlights,
  roleNavLabels,
  skillItemText,
  sortProjects,
  sortRoles,
} from '../../src/lib/cv';

describe('formatCvDate', () => {
  it('renders month precision per language', () => {
    expect(formatCvDate('2026-08', 'en')).toBe('Aug 2026');
    expect(formatCvDate('2026-03', 'vi')).toBe('03/2026');
  });
  it('renders year-only dates without a month', () => {
    expect(formatCvDate('2024', 'en')).toBe('2024');
    expect(formatCvDate('2024', 'vi')).toBe('2024');
  });
  it('renders an empty end as Present', () => {
    expect(formatCvDate(undefined, 'en')).toBe('Present');
    expect(formatCvDate('', 'vi')).toBe('Nay');
    expect(formatDateRange('2024', '2026-03', 'en')).toBe('2024 – Mar 2026');
    expect(formatDateRange('2026-08', undefined, 'en')).toBe('Aug 2026 – Present');
  });
  it('validates YYYY and YYYY-MM only', () => {
    for (const ok of ['2024', '2024-01', '2024-12']) expect(CV_DATE_RE.test(ok)).toBe(true);
    for (const bad of ['24', '2024-13', '2024-1', '2024-00', 'Aug 2026', '']) {
      expect(CV_DATE_RE.test(bad)).toBe(false);
    }
  });
});

describe('sortRoles', () => {
  const role = (id: string, start: string, end?: string) => ({ id, start, end });
  it('puts the current role first and sorts by start descending', () => {
    const sorted = sortRoles([
      role('old', '2019', '2020'),
      role('mid', '2024', '2026-03'),
      role('now', '2026-08'),
      role('tymex', '2021', '2024'),
    ]);
    expect(sorted.map((r) => r.id)).toEqual(['now', 'mid', 'tymex', 'old']);
  });
  it('keeps an ongoing role first even if it started earlier', () => {
    expect(sortRoles([role('done', '2025', '2026'), role('open', '2020')])[0].id).toBe('open');
  });
  it('treats a year-only start as January', () => {
    const sorted = sortRoles([role('a', '2024', '2025'), role('b', '2024-02', '2025')]);
    expect(sorted.map((r) => r.id)).toEqual(['b', 'a']);
  });
  it('keeps the same company twice as separate entries', () => {
    const sorted = sortRoles([role('fpt-2020', '2020', '2021'), role('fpt-2026', '2026-08')]);
    expect(sorted).toHaveLength(2);
    expect(sorted[0].id).toBe('fpt-2026');
  });
});

describe('sortProjects', () => {
  it('sorts featured first, then newest, then ongoing before finished', () => {
    const p = (id: string, start: string, end?: string, featured = false) => ({
      id,
      start,
      end,
      featured,
    });
    const sorted = sortProjects([
      p('old', '2020', '2021'),
      p('done', '2025', '2025'),
      p('open', '2025'),
      p('feat', '2019', '2020', true),
    ]);
    expect(sorted.map((x) => x.id)).toEqual(['feat', 'open', 'done', 'old']);
  });
});

describe('labels', () => {
  it('joins company and client', () => {
    expect(companyLabel('Datum', 'Security Bank')).toBe('Datum / Security Bank');
    expect(companyLabel('FPT Software')).toBe('FPT Software');
    expect(companyLabel('FPT Software', '')).toBe('FPT Software');
  });
  it('formats skill items with children', () => {
    expect(skillItemText({ name: 'AWS', children: ['EMR', 'S3'] })).toBe('AWS (EMR, S3)');
    expect(skillItemText({ name: 'Git' })).toBe('Git');
  });
});

describe('parseHighlight', () => {
  const b = (text: string) => ({ text, bold: true });
  const p = (text: string) => ({ text, bold: false });

  it('parses links, dropping unsafe schemes', () => {
    expect(parseHighlight('See [the docs](https://x.dev/a) now')).toEqual({
      label: null,
      body: [p('See '), { text: 'the docs', bold: false, href: 'https://x.dev/a' }, p(' now')],
    });
    for (const url of [
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      ' javascript:alert(1)',
      '&#106;avascript:alert(1)',
      'data:text/html,x',
      'vbscript:x',
      '//evil.com',
      '/\\evil.com',
    ]) {
      expect(
        parseHighlight(`[bad](${url})`).body.some((x) => x.href),
        url,
      ).toBe(false);
    }
    expect(parseHighlight('[ok](/projects/)').body.some((x) => x.href === '/projects/')).toBe(true);
  });
  it('decodes NUL and surrogate entities to U+FFFD', () => {
    expect(parseHighlight('a&#0;b&#xD800;c').body).toEqual([p('a\uFFFDb\uFFFDc')]);
  });
  it('parses *italic*, _italic_ and keeps snake_case literal', () => {
    expect(parseHighlight('a *b* and _c_ d')).toEqual({
      label: null,
      body: [
        p('a '),
        { text: 'b', bold: false, italic: true },
        p(' and '),
        { text: 'c', bold: false, italic: true },
        p(' d'),
      ],
    });
    expect(parseHighlight('use my_var_name here').body).toEqual([p('use my_var_name here')]);
  });
  it('parses inline code without interpreting its content', () => {
    expect(parseHighlight('run `a **b** *c*` now').body).toEqual([
      p('run '),
      { text: 'a **b** *c*', bold: false, code: true },
      p(' now'),
    ]);
  });
  it('handles backslash escapes and HTML entities', () => {
    expect(parseHighlight('2 \\* 3 \\*not italic\\*').body).toEqual([p('2 * 3 *not italic*')]);
    expect(parseHighlight('R&amp;D &lt;3 &#169; &copyx;').body).toEqual([
      p('R&D <3 \u00a9 &copyx;'),
    ]);
  });
  it('nests bold, italic and links', () => {
    expect(parseHighlight('**[a](/x)** and ***b***').body).toEqual([
      { text: 'a', bold: true, href: '/x' },
      p(' and '),
      { text: 'b', bold: true, italic: true },
    ]);
  });

  it('takes `**Label:** detail` as label + body, keeping bold terms in the body', () => {
    expect(parseHighlight('**Team Leadership:** Lead **7 engineers** across **Azure**.')).toEqual({
      label: 'Team Leadership',
      body: [p('Lead '), b('7 engineers'), p(' across '), b('Azure'), p('.')],
    });
  });
  it('takes `**Label**: detail` the same way', () => {
    expect(parseHighlight('**CI/CD**: Built **GitLab** pipelines')).toEqual({
      label: 'CI/CD',
      body: [p('Built '), b('GitLab'), p(' pipelines')],
    });
  });
  it('keeps "&" and "/" in labels and a colon later in the detail', () => {
    const h = parseHighlight('**Data Quality & Reliability:** Rules: schema, null checks');
    expect(h.label).toBe('Data Quality & Reliability');
    expect(h.body).toEqual([p('Rules: schema, null checks')]);
  });
  it('splits at the first colon inside a bold run', () => {
    expect(parseHighlight('**Infra: AWS** with **Terraform**')).toEqual({
      label: 'Infra',
      body: [b('AWS'), p(' with '), b('Terraform')],
    });
  });
  it('does not treat a time or ratio in bold as a label', () => {
    expect(parseHighlight('**10:30** standup')).toEqual({
      label: null,
      body: [b('10:30'), p(' standup')],
    });
  });
  it('gives a bullet without a bold label a body-only card', () => {
    expect(parseHighlight('Plain text: with a colon')).toEqual({
      label: null,
      body: [p('Plain text: with a colon')],
    });
    expect(parseHighlight('**Docker** images shipped')).toEqual({
      label: null,
      body: [b('Docker'), p(' images shipped')],
    });
  });
  it('leaves an unmatched ** literal and handles a label-only bullet', () => {
    expect(parseHighlight('Cost **savings')).toEqual({ label: null, body: [p('Cost **savings')] });
    expect(parseHighlight('**Label:**')).toEqual({ label: 'Label', body: [] });
  });
  it('ignores an empty label', () => {
    expect(parseHighlight('**:** text').label).toBeNull();
  });
});

describe('parseHighlights', () => {
  it('maps every bullet to exactly one card, in order', () => {
    const md = '- **A:** one\n- **B:** two **x**\n- no label\n';
    const cards = parseHighlights(md);
    expect(cards.map((c) => c.label)).toEqual(['A', 'B', null]);
  });
  it('joins wrapped and nested lines into the parent bullet', () => {
    const cards = parseHighlights('- **A:** first\n  continued\n  - nested\n- **B:** second');
    expect(cards).toHaveLength(2);
    expect(cards[0].body.map((s) => s.text).join('')).toBe('first continued nested');
  });
  it('ignores non-bullet lines and supports * and + markers and CRLF', () => {
    expect(parseHighlights('Intro\r\n\r\n* **A:** x\r\n+ **B:** y')).toHaveLength(2);
    expect(parseHighlights('')).toEqual([]);
  });
});

describe('earliestYear / startYear', () => {
  it('uses the earliest start year, whatever the precision', () => {
    expect(earliestYear([{ start: '2026-08' }, { start: '2019' }, { start: '2021-03' }])).toBe(
      '2019',
    );
    expect(earliestYear([])).toBeUndefined();
    expect(startYear('2026-08')).toBe('2026');
    expect(startYear('2024')).toBe('2024');
  });
});

describe('markTech', () => {
  const vocab = buildTechVocab(
    ['Spark', 'AWS', 'Glue', 'Azure', 'PySpark', 'CI/CD', 'ETL/ELT', 'C++', '.NET'],
    [
      { name: 'Apache Spark' },
      { name: 'AWS', children: ['AWS EMR', 'Lake Formation'] },
      { name: 'azure' },
    ],
  );
  const run = (src: string) => markTech(parseHighlight(src).body, vocab);
  const techs = (src: string) =>
    run(src)
      .filter((s) => s.tech)
      .map((s) => s.text);

  it('dedupes case-insensitively and sorts longest first', () => {
    expect(vocab.filter((v) => v.toLowerCase() === 'azure')).toEqual(['Azure']);
    expect(vocab.indexOf('Apache Spark')).toBeLessThan(vocab.indexOf('Spark'));
    expect(vocab.indexOf('AWS EMR')).toBeLessThan(vocab.indexOf('AWS'));
  });

  it('prefers the longest match and keeps the original casing', () => {
    expect(techs('Ran apache spark and AWS EMR, then aws s3')).toEqual([
      'apache spark',
      'AWS EMR',
      'aws',
    ]);
  });

  it('matches across hyphens and slashes, and before a sentence period', () => {
    expect(techs('An Azure-based PySpark/Spark job for CI/CD and ETL/ELT on **AWS**.')).toEqual([
      'Azure',
      'PySpark',
      'Spark',
      'CI/CD',
      'ETL/ELT',
      'AWS',
    ]);
    expect(techs('Built in C++ and .NET.')).toEqual(['C++', '.NET']);
  });

  it('does not match inside words', () => {
    expect(techs('A Sparkling Gluey xAWS result, Spark2 and C+++')).toEqual([]);
  });

  it('matches a term split across formatting runs', () => {
    const v = buildTechVocab(['GitLab CI/CD']);
    const out = markTech(parseHighlight('Ran **GitLab** CI/CD pipelines').body, v);
    expect(out.filter((s) => s.tech).map((s) => s.text)).toEqual(['GitLab', ' CI/CD']);
    expect(out.map((s) => s.text).join('')).toBe('Ran GitLab CI/CD pipelines');
  });

  it('skips links and code', () => {
    const out = markTech(
      parseHighlight('See [Spark docs](https://x.dev) and `Spark` then Spark').body,
      vocab,
    );
    expect(out.filter((s) => s.tech).map((s) => s.text)).toEqual(['Spark']);
    expect(out.find((s) => s.href)?.tech).toBeUndefined();
    expect(out.find((s) => s.code)?.tech).toBeUndefined();
  });

  it('keeps non-tech bold and turns a bold tech term into a tech-only span', () => {
    const out = run('Led **7 engineers** on **Spark** and **AWS Lake Formation** work');
    expect(out.find((s) => s.text === '7 engineers')).toMatchObject({ bold: true });
    expect(out.find((s) => s.text === 'Spark')).toMatchObject({ tech: true, bold: false });
    expect(out.find((s) => s.text === 'AWS')).toMatchObject({ tech: true, bold: false });
    expect(out.find((s) => s.text === 'Lake Formation')).toMatchObject({ tech: true, bold: false });
  });
});

describe('roleNavLabels (spec §4.2.0)', () => {
  const role = (company: string, start: string, extra: Record<string, string> = {}) => ({
    company,
    start,
    ...extra,
  });
  it('uses shortName, then client, then company; years only for repeated names', () => {
    expect(
      roleNavLabels([
        role('FPT Software', '2026-08'),
        role('Datum', '2024', { client: 'Security Bank' }),
        role('Datum', '2021', { client: 'TymeX' }),
        role('FPT Software', '2020'),
        role('Hitachi Vantara Vietnam', '2019', { shortName: 'Hitachi Vantara' }),
      ]),
    ).toEqual([
      'FPT Software 2026',
      'Security Bank',
      'TymeX',
      'FPT Software 2020',
      'Hitachi Vantara',
    ]);
  });
});

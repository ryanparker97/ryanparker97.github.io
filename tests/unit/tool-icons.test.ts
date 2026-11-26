import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { frontmatter } from '../../scripts/lib/frontmatter';
import { contrastRatio } from '../../src/lib/contrast';
import { CHILD_ICONS, TOOL_ICONS, toolChildIcon, toolIcon } from '../../src/lib/tool-icons';
import { brandTools, iconPlate } from '../../src/lib/tool-icons';

const css = readFileSync('src/styles/tokens.css', 'utf8');

/** A `--name: light-dark(#light, #dark)` token from tokens.css, 6-digit hex, lower-cased. */
function lightDark(name: string): { light: string; dark: string } {
  const m = css.match(
    new RegExp(
      `--${name}:\\s*light-dark\\(\\s*(#[0-9a-f]{6})\\s*,\\s*(#[0-9a-f]{6})\\s*\\)\\s*;`,
      'i',
    ),
  );
  if (!m) throw new Error(`--${name} not found or not a light-dark() pair of 6-digit hex`);
  return { light: m[1].toLowerCase(), dark: m[2].toLowerCase() };
}
const SURFACE = lightDark('surface-2');
const BG = lightDark('bg');

type Group = {
  group: string;
  order: number;
  icon: string;
  items: { name: string; children?: string[] }[];
};

function groups(lang: 'en' | 'vi'): Group[] {
  const dir = `src/content/skills/${lang}`;
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const m = readFileSync(`${dir}/${f}`, 'utf8').match(/^---\n([\s\S]*?)\n---/);
      if (!m) throw new Error(`no frontmatter in ${dir}/${f}`);
      return parse(m[1]) as Group;
    })
    .sort((a, b) => a.order - b.order);
}

/** Rows as /skills/ renders them: group order, then item order. */
function rows(lang: 'en' | 'vi') {
  return groups(lang).flatMap((g) =>
    g.items.map((i) => {
      const t = toolIcon(i.name);
      return [i.name, t?.icon ?? null, t?.plate ?? false] as [string, string | null, boolean];
    }),
  );
}

const EXPECTED: [string, string | null, boolean][] = [
  ['Python', 'logos:python', true],
  ['SQL', null, false],
  ['PySpark', 'apache-spark', false],
  ['Apache Spark', 'apache-spark', false],
  ['Apache Airflow', 'logos:airflow-icon', true],
  ['DBT', 'logos:dbt-icon', false],
  ['Databricks', 'logos:databricks-icon', false],
  ['Talend', 'talend', false],
  ['ETL/ELT', null, false],
  ['Data Lake & Warehouse', null, false],
  ['Data Migration', null, false],
  ['Data Quality', null, false],
  ['Data Modeling', null, false],
  ['Data Governance', null, false],
  ['AWS', 'logos:aws', true],
  ['Azure', 'logos:microsoft-azure', true],
  ['Git', 'logos:git-icon', false],
  ['GitLab CI/CD', 'logos:gitlab-icon', false],
  ['Infrastructure as Code', null, false],
  ['Docker', 'logos:docker-icon', false],
  ['Kubernetes', 'logos:kubernetes', false],
  ['Datadog', 'logos:datadog-icon', true],
  ['Monitoring', null, false],
  ['Incident Response', null, false],
  ['SLO/SLI', null, false],
  ['Java', 'logos:java', false],
  ['REST APIs', null, false],
  ['Microservices', null, false],
  ['PostgreSQL', 'logos:postgresql', true],
  ['API Integration', null, false],
  ['AI-DLC (AI-Driven Development Life Cycle)', null, false],
  ['Prompt Engineering', null, false],
  ['Agentic Coding', null, false],
  ['Multi-Agent Orchestration', null, false],
  ['AI Code Review', null, false],
  ['Documentation Automation', null, false],
  ['Agile/Scrum', null, false],
  ['SDLC', null, false],
  ['Cross-Functional Collaboration', null, false],
];

/** Sub-items as /skills/ renders them: group order, item order, child order. */
function childRows(lang: 'en' | 'vi') {
  return groups(lang).flatMap((g) =>
    g.items.flatMap((i) =>
      (i.children ?? []).map((c) => {
        const t = toolChildIcon(c);
        return [c, t?.icon ?? null, t?.plate ?? false] as [string, string | null, boolean];
      }),
    ),
  );
}

const EXPECTED_CHILDREN: [string, string | null, boolean][] = [
  ['EMR', null, false],
  ['S3', 'logos:aws-s3', true],
  ['Athena', 'logos:aws-athena', true],
  ['Redshift', 'logos:aws-redshift', true],
  ['Lake Formation', 'logos:aws-lake-formation', true],
  ['Databricks', 'logos:databricks-icon', false],
  ['CloudFormation', 'logos:aws-cloudformation', true],
  ['CDK', null, false],
  ['Terraform', 'logos:terraform-icon', true],
  ['Spring Boot', 'logos:spring-icon', false],
];

const logos = JSON.parse(readFileSync('node_modules/@iconify-json/logos/icons.json', 'utf8'));

describe('tool icon map', () => {
  it('resolves the 39 rows to the locked table, identically in EN and VI', () => {
    expect(EXPECTED).toHaveLength(39);
    expect(rows('en')).toEqual(EXPECTED);
    expect(rows('vi')).toEqual(EXPECTED);
    const brand = EXPECTED.filter(([, id]) => id !== null);
    expect(brand).toHaveLength(16);
    expect(EXPECTED.length - brand.length).toBe(23); // no real brand mark: no icon
  });

  it('maps every sub-item to the locked table, identically in EN and VI', () => {
    expect(EXPECTED_CHILDREN).toHaveLength(10);
    expect(childRows('en')).toEqual(EXPECTED_CHILDREN);
    expect(childRows('vi')).toEqual(EXPECTED_CHILDREN);
    // EMR and CDK have no brand icon installed, so they are the only sub-items with no icon
    const none = EXPECTED_CHILDREN.filter(([, id]) => id === null).map(([n]) => n);
    expect(none).toEqual(['EMR', 'CDK']);
  });

  it('has no child key that matches no sub-item name (catches renames)', () => {
    const names = new Set(groups('en').flatMap((g) => g.items.flatMap((i) => i.children ?? [])));
    for (const k of Object.keys(CHILD_ICONS)) expect(names, k).toContain(k);
    // every sub-item except the two with no real brand mark (EMR, CDK) has an entry
    expect(Object.keys(CHILD_ICONS)).toHaveLength(names.size - 2);
  });

  it('has no key that matches no content name (catches renames)', () => {
    const names = new Set(groups('en').flatMap((g) => g.items.map((i) => i.name)));
    for (const k of Object.keys(TOOL_ICONS)) expect(names, k).toContain(k);
    for (const n of new Set(groups('vi').flatMap((g) => g.items.map((i) => i.name)))) {
      expect(names).toContain(n);
    }
  });

  it('only uses real brand ids that exist in the installed set or src/icons, never a glyph', () => {
    for (const { icon } of [...Object.values(TOOL_ICONS), ...Object.values(CHILD_ICONS)]) {
      expect(icon, icon).not.toMatch(/^lucide:/);
      if (icon.startsWith('logos:')) expect(logos.icons[icon.slice(6)], icon).toBeTruthy();
      else expect(existsSync(`src/icons/${icon}.svg`), icon).toBe(true);
    }
  });

  it('has no lucide id anywhere in tool-icons.ts source code', () => {
    const code = readFileSync('src/lib/tool-icons.ts', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(code).not.toMatch(/lucide/i);
  });

  it('gives an unknown tool or sub-item no icon (no group glyph, no other brand)', () => {
    expect(toolIcon('Unknown')).toBeNull();
    expect(toolIcon('toString')).toBeNull();
    expect(toolChildIcon('Unknown')).toBeNull();
    expect(toolChildIcon('toString')).toBeNull();
  });
});

const SHAPE = /<(?:path|circle|rect|polygon|polyline|ellipse|line)\b[^>]*>/g;

function norm(h: string): string {
  const x = h.toLowerCase();
  return x.length === 4 ? '#' + [...x.slice(1)].map((c) => c + c).join('') : x;
}

/** Non-white colours a mark paints: fill / stop-color hex; a shape with no fill is black. */
function colours(svg: string): string[] {
  const out = new Set<string>();
  for (const m of svg.matchAll(/(?:fill|stop-color)="(#[0-9a-fA-F]{3,6})"/g)) out.add(norm(m[1]));
  if (!/<g\b[^>]*\bfill=/.test(svg)) {
    for (const s of svg.match(SHAPE) ?? []) if (!/\bfill=/.test(s)) out.add('#000000');
  }
  out.delete('#ffffff');
  return [...out];
}

function markSvg(icon: string): string {
  if (icon.startsWith('logos:')) return logos.icons[icon.slice(6)].body as string;
  return readFileSync(`src/icons/${icon}.svg`, 'utf8');
}

const brandMarks = [
  ...new Map(
    [...Object.values(TOOL_ICONS), ...Object.values(CHILD_ICONS)].map((e) => [e.icon, e] as const),
  ).values(),
];

describe('dark-mode plate rule and light-mode contrast', () => {
  const table = brandMarks.map((e) => {
    const cols = colours(markSvg(e.icon));
    const onDark = cols.map((c) => contrastRatio(c, SURFACE.dark));
    const onLight = cols.map((c) => contrastRatio(c, SURFACE.light));
    return {
      icon: e.icon,
      cols,
      darkMin: Math.min(...onDark),
      lightMax: Math.max(...onLight),
      plated: e.plate === true,
      // the darkest colour is the one with the least contrast on the dark surface
      onPlate: contrastRatio(cols[onDark.indexOf(Math.min(...onDark))], '#ffffff'),
    };
  });

  it('finds colours for every brand mark', () => {
    expect(brandMarks).toHaveLength(22); // 15 row marks + 7 sub-item marks
    for (const r of table) expect(r.cols.length, r.icon).toBeGreaterThan(0);
  });

  it('plates exactly the marks whose darkest colour is under 3:1 on the dark surface', () => {
    console.table(
      table.map((r) => ({
        icon: r.icon,
        'darkest on dark': +r.darkMin.toFixed(2),
        'best on light': +r.lightMax.toFixed(2),
        plate: r.plated,
        'darkest on plate': +r.onPlate.toFixed(2),
      })),
    );
    for (const r of table) expect(r.plated, r.icon).toBe(r.darkMin < 3);
    expect(
      table
        .filter((r) => r.plated)
        .map((r) => r.icon)
        .sort(),
    ).toEqual(
      [
        'logos:airflow-icon',
        'logos:aws',
        'logos:aws-athena',
        'logos:aws-cloudformation',
        'logos:aws-lake-formation',
        'logos:aws-redshift',
        'logos:aws-s3',
        'logos:datadog-icon',
        'logos:microsoft-azure',
        'logos:postgresql',
        'logos:python',
        'logos:terraform-icon',
      ].sort(),
    ); // 6 row marks + 6 sub-item marks
  });

  it('plates the certification logos by the same computed rule (AWS, Datadog)', () => {
    for (const id of ['logos:aws', 'logos:datadog-icon']) {
      const row = table.find((r) => r.icon === id)!;
      expect(row.darkMin, id).toBeLessThan(3);
      expect(iconPlate(id), id).toBe(true);
    }
    for (const r of table) expect(iconPlate(r.icon), r.icon).toBe(r.darkMin < 3);
    expect(iconPlate('logos:unknown')).toBe(false);
  });

  it('keeps the darkest colour of every plated mark at 3:1 or better on its white plate', () => {
    for (const r of table.filter((x) => x.plated)) {
      expect(r.onPlate, r.icon).toBeGreaterThanOrEqual(3);
    }
  });

  it('pins the marks with no colour at 3:1 on the light surface', () => {
    const lows = table
      .filter((r) => r.lightMax < 3)
      .map((r) => r.icon)
      .sort();
    expect(lows).toEqual(['logos:dbt-icon', 'logos:docker-icon', 'logos:spring-icon', 'talend']);
  });
});

describe.each([
  ['talend', '#ff6d70'],
  ['apache-spark', '#e25a1c'],
])('vendored %s.svg', (id, fill) => {
  const svg = readFileSync(`src/icons/${id}.svg`, 'utf8');
  it('keeps its own colour and a 24px viewBox, with source and licence recorded', () => {
    expect(svg).toMatch(new RegExp(`fill="${fill}"`, 'i'));
    expect(svg.replace(/<!--[\s\S]*?-->/g, '')).not.toMatch(/currentColor/i);
    expect(svg).toMatch(/viewBox="0 0 24 24"/);
    expect(svg).toMatch(/simple-icons 16\.37\.0/);
    expect(svg).toMatch(/CC0-1\.0/);
  });
});

describe('brandTools', () => {
  const BRAND_ROWS = [
    'Python',
    'PySpark',
    'Apache Airflow',
    'DBT',
    'Databricks',
    'Talend',
    'AWS',
    'Azure',
    'Git',
    'GitLab CI/CD',
    'Docker',
    'Kubernetes',
    'Datadog',
    'Java',
    'PostgreSQL',
  ];
  const PLATED = ['Python', 'Apache Airflow', 'AWS', 'Azure', 'Datadog', 'PostgreSQL'];

  /** Row names in /skills/ render order (group order, then item order), without sub-items. */
  const skillNames = (lang: 'en' | 'vi') => groups(lang).flatMap((g) => g.items.map((i) => i.name));
  const ALL = skillNames('en');

  it('returns the 15 brand-marked rows in render order, identically in EN and VI', () => {
    expect(brandTools(ALL).map((t) => t.name)).toEqual(BRAND_ROWS);
    expect(brandTools(skillNames('vi')).map((t) => t.name)).toEqual(BRAND_ROWS);
  });

  it('keeps the first name per mark and drops a later name with the same mark', () => {
    // PySpark has the Spark mark, so "Apache Spark" (same mark, later row) is dropped
    expect(brandTools(['PySpark', 'Apache Spark'])).toEqual([
      { name: 'PySpark', icon: 'apache-spark', plate: false },
    ]);
    expect(brandTools(['Apache Spark', 'PySpark'])).toEqual([
      { name: 'Apache Spark', icon: 'apache-spark', plate: false },
    ]);
    expect(brandTools(['Python', 'Python'])).toEqual([
      { name: 'Python', icon: 'logos:python', plate: true },
    ]);
  });

  it('returns one icon per mark, and the same icon and plate flag as toolIcon', () => {
    const tools = brandTools(ALL);
    expect(new Set(tools.map((t) => t.icon)).size).toBe(tools.length);
    for (const t of tools) {
      expect(t).toEqual({
        name: t.name,
        icon: toolIcon(t.name)?.icon,
        plate: toolIcon(t.name)?.plate,
      });
    }
  });

  it('plates exactly Python, Apache Airflow, AWS, Azure, Datadog and PostgreSQL', () => {
    expect(
      brandTools(ALL)
        .filter((t) => t.plate)
        .map((t) => t.name),
    ).toEqual(PLATED);
  });

  it('drops unknown names and sub-items', () => {
    expect(brandTools([])).toEqual([]);
    expect(brandTools(['Unknown', 'toString', 'SQL', 'ETL/ELT'])).toEqual([]);
    // sub-items are never returned, even when their name has a brand mark (Databricks is a row)
    expect(brandTools(['S3', 'Athena', 'Spring Boot', 'CDK', 'EMR'])).toEqual([]);
  });

  it('never returns a Lucide id', () => {
    for (const t of brandTools([...ALL, ...skillNames('vi')])) {
      expect(t.icon, t.name).not.toMatch(/lucide/i);
    }
  });
});

/** The `logo` of every certification entry in one language (entries without one are skipped). */
function certLogos(lang: 'en' | 'vi'): string[] {
  const dir = `src/content/certifications/${lang}`;
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => frontmatter(readFileSync(`${dir}/${f}`, 'utf8')).logo)
    .filter((logo): logo is string => typeof logo === 'string');
}

describe('certification logos', () => {
  it('finds every cert logo in the logos set and plates it by the computed rule', () => {
    // owner, photo-logos: the planned cert's Claude mark is the one added to the content
    const ids = [...new Set([...certLogos('en'), ...certLogos('vi')])];
    expect(ids).toContain('logos:claude-icon');
    for (const id of ids) {
      expect(id.startsWith('logos:') && logos.icons[id.slice(6)] !== undefined, id).toBe(true);
      const darkMin = Math.min(
        ...colours(markSvg(id)).flatMap((c) => [
          contrastRatio(c, SURFACE.dark),
          contrastRatio(c, BG.dark),
        ]),
      );
      expect(iconPlate(id), id).toBe(darkMin < 3);
    }
  });

  it('gives the Claude mark one colour, #d97757, at 3:1 or better on dark --surface-2 and --bg, with no plate', () => {
    expect(colours(markSvg('logos:claude-icon'))).toEqual(['#d97757']);
    expect(contrastRatio('#d97757', SURFACE.dark)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio('#d97757', BG.dark)).toBeGreaterThanOrEqual(3);
    expect(iconPlate('logos:claude-icon')).toBe(false);
  });
});

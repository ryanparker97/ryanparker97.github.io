import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { CHILD_ICONS, TOOL_ICONS, toolChildIcon, toolIcon } from '../../src/lib/tool-icons';
import { t } from '../../src/i18n';
import {
  STACK_ALIAS,
  STACK_EXCLUDE,
  STACK_ROLES,
  stackTools,
  techStack,
} from '../../src/lib/tech-stack';

type Group = {
  id: string;
  group: string;
  order: number;
  items: { name: string; children?: string[] }[];
};

function groups(lang: 'en' | 'vi'): Group[] {
  const dir = `src/content/skills/${lang}`;
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const m = readFileSync(`${dir}/${f}`, 'utf8').match(/^---\n([\s\S]*?)\n---/);
      if (!m) throw new Error(`no frontmatter in ${dir}/${f}`);
      return { id: f.replace(/\.md$/, ''), ...(parse(m[1]) as Omit<Group, 'id'>) };
    })
    .sort((a, b) => a.order - b.order);
}

// owner, techstack-trim: old 4 /skills/ areas (6/6/7/3 = 22 tools) -> 6 skill roles, 16 tools
const EXPECTED: [string, string[]][] = [
  ['languages', ['Python', 'Java', 'Spring Boot']],
  ['processing', ['Apache Spark', 'Databricks', 'DBT']],
  ['orchestration', ['Apache Airflow']],
  ['cloud', ['AWS', 'Azure', 'PostgreSQL']],
  ['cicd', ['Git', 'GitLab CI/CD']],
  ['infra', ['Terraform', 'Docker', 'Kubernetes', 'Datadog']],
];
const LABELS = {
  en: [
    'Languages & libs',
    'Data processing',
    'Orchestration',
    'Cloud & storage',
    'Code & CI/CD',
    'Infra & monitoring',
  ],
  vi: [
    'Ngôn ngữ & framework',
    'Xử lý dữ liệu',
    'Điều phối',
    'Đám mây & lưu trữ',
    'Mã nguồn & CI/CD',
    'Hạ tầng & giám sát',
  ],
};
// owner, techstack-trim: old 12 plated -> 7 (the five AWS service marks and CloudFormation go)
const PLATED = ['Python', 'Apache Airflow', 'AWS', 'Azure', 'Datadog', 'PostgreSQL', 'Terraform'];
const EXCLUDED = ['Athena', 'CloudFormation', 'Lake Formation', 'Redshift', 'S3', 'Talend'];

describe('techStack: the /skills/ marked tools, grouped by skill role', () => {
  for (const lang of ['en', 'vi'] as const) {
    it(`${lang}: six roles, 16 tools, role headings`, () => {
      const s = techStack(groups(lang));
      expect(s.map((g) => [g.id, g.tools.map((x) => x.name)])).toEqual(EXPECTED);
      expect(s.flatMap((g) => g.tools)).toHaveLength(16);
      expect(s.map((g) => t(lang, g.label))).toEqual(LABELS[lang]);
    });
  }

  for (const lang of ['en', 'vi'] as const) {
    describe(`drift against /skills/ (${lang})`, () => {
      const g = groups(lang);
      // What /skills/ marks, computed independently: rows with toolIcon, children with toolChildIcon.
      const marked = new Set<string>();
      for (const grp of g)
        for (const it of grp.items) {
          if (toolIcon(it.name)) marked.add(it.name);
          for (const c of it.children ?? []) if (toolChildIcon(c)) marked.add(c);
        }

      it('the shown names equal the /skills/ marked names, less the merge and the six exclusions', () => {
        const expected = new Set([...marked].map((n) => STACK_ALIAS[n] ?? n));
        for (const n of STACK_EXCLUDE)
          expect(expected.delete(n), `${n} still on /skills/`).toBe(true);
        expect(new Set(stackTools(g).map((x) => x.name))).toEqual(expected);
        const flat = techStack(g).flatMap((x) => x.tools.map((y) => y.name));
        expect([...flat].sort()).toEqual([...expected].sort());
        expect([...STACK_EXCLUDE].sort()).toEqual(EXCLUDED);
        expect(Object.keys(STACK_ALIAS)).toEqual(['PySpark']);
        expect(marked.has('PySpark') && marked.has('Apache Spark')).toBe(true);
      });

      it('every icon-map key is a name in the content', () => {
        const all = new Set(
          g.flatMap((x) => x.items.flatMap((i) => [i.name, ...(i.children ?? [])])),
        );
        for (const k of Object.keys(TOOL_ICONS)) expect(all.has(k), k).toBe(true);
        for (const k of Object.keys(CHILD_ICONS)) expect(all.has(k), k).toBe(true);
      });

      it('each tool carries the icon and plate of its /skills/ lookup', () => {
        for (const x of techStack(g).flatMap((r) => r.tools)) {
          const src = x.name === 'Apache Spark' ? 'PySpark' : x.name;
          const ref = toolIcon(src) ?? toolChildIcon(src);
          expect(x.icon, x.name).toBe(ref?.icon);
          expect(x.plate, x.name).toBe(ref?.plate);
        }
      });

      it('exactly the 7 plated names', () => {
        expect(
          techStack(g)
            .flatMap((r) => r.tools)
            .filter((x) => x.plate)
            .map((x) => x.name)
            .sort(),
        ).toEqual([...PLATED].sort());
      });
    });
  }

  it('the role table is the pinned one', () => {
    expect(STACK_ROLES.map((r) => [r.id, [...r.tools]])).toEqual(EXPECTED);
  });

  it('edge cases', () => {
    expect(techStack([], [])).toEqual([]);
    const sk = (id: string, order: number, ...names: string[]) => ({
      id,
      group: id,
      order,
      items: names.map((name) => ({ name })),
    });
    const role = (id: string, ...tools: string[]) => ({
      id,
      label: 'exp.stack.title' as const,
      tools,
    });
    // no mark: nothing shown
    expect(techStack([sk('x', 1, 'SQL', 'ETL/ELT')], [])).toEqual([]);
    // a role naming an excluded tool throws
    expect(() => techStack([sk('x', 1, 'Python')], [role('r', 'Talend')])).toThrow(/Talend/);
    // a tool in two roles throws
    expect(() =>
      techStack([sk('x', 1, 'Python')], [role('a', 'Python'), role('b', 'Python')]),
    ).toThrow(/two roles/);
    // a shown tool with no role throws
    expect(() => techStack([sk('x', 1, 'Python', 'Java')], [role('a', 'Python')])).toThrow(
      /"Java" has no role/,
    );
    // an empty role is omitted
    expect(
      techStack([sk('x', 1, 'Python')], [role('a'), role('b', 'Python')]).map((g) => g.id),
    ).toEqual(['b']);
    // unsorted input is not mutated
    const input = [sk('b', 2, 'Java'), sk('a', 1, 'Python')];
    const copy = structuredClone(input);
    expect(stackTools(input).map((x) => x.name)).toEqual(['Python', 'Java']);
    expect(input).toEqual(copy);
    for (const name of ['toString', 'constructor', '__proto__', 'hasOwnProperty'])
      expect(stackTools([sk('x', 1, name)])).toEqual([]);
  });
});

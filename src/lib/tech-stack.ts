/**
 * The Tech stack group on /experiences/ (spec §4.2.0). The tool set comes from /skills/ (one source,
 * nothing listed by hand): every row or child with a brand mark (`toolIcon`, `toolChildIcon`, the
 * lookups the /skills/ page makes), less the no-logo rule, the PySpark merge and `STACK_EXCLUDE`.
 * The grouping is `STACK_ROLES`: section-only data, by the job each tool does. A new marked /skills/
 * tool fails the build until it gets a role (tests/unit/tech-stack.test.ts and
 * tests/e2e/experiences.spec.ts fail on any other drift).
 *
 * Order within the tool set is the /skills/ order: group `order`, then each row followed by its
 * marked children. A name is kept once ("Databricks" under Azure repeats the Data row).
 * Owner, techstack: PySpark and Apache Spark are one entry, "Apache Spark" (they share one mark).
 */
import type { TKey } from '../i18n';
import { toolChildIcon, toolIcon } from './tool-icons';

export type StackTool = { name: string; icon: string; plate: boolean };
export type StackGroup = { id: string; label: TKey; tools: StackTool[] };

type SkillGroup = {
  id: string;
  group: string;
  order: number;
  items: readonly { name: string; children?: readonly string[] | null }[];
};

/** Names shown as another name (the one merge the owner asked for). */
export const STACK_ALIAS: Readonly<Record<string, string>> = { PySpark: 'Apache Spark' };

/** Owner, techstack-trim: still on /skills/ and in the experience text, not in this section. */
export const STACK_EXCLUDE: readonly string[] = [
  'Talend',
  'S3',
  'Athena',
  'Redshift',
  'Lake Formation',
  'CloudFormation',
];

/** Owner, techstack-trim: the skill roles (what each tool does), replacing the /skills/ areas. */
export const STACK_ROLES: readonly { id: string; label: TKey; tools: readonly string[] }[] = [
  {
    id: 'languages',
    label: 'exp.stack.role.languages',
    tools: ['Python', 'Java', 'Spring Boot'],
  },
  {
    id: 'processing',
    label: 'exp.stack.role.processing',
    tools: ['Apache Spark', 'Databricks', 'DBT'],
  },
  { id: 'orchestration', label: 'exp.stack.role.orchestration', tools: ['Apache Airflow'] },
  { id: 'cloud', label: 'exp.stack.role.cloud', tools: ['AWS', 'Azure', 'PostgreSQL'] },
  { id: 'cicd', label: 'exp.stack.role.cicd', tools: ['Git', 'GitLab CI/CD'] },
  {
    id: 'infra',
    label: 'exp.stack.role.infra',
    tools: ['Terraform', 'Docker', 'Kubernetes', 'Datadog'],
  },
];

/** The shown tools in /skills/ order, before grouping. */
export function stackTools(
  groups: readonly SkillGroup[],
  exclude: readonly string[] = STACK_EXCLUDE,
): StackTool[] {
  const skip = new Set(exclude);
  const seen = new Set<string>();
  const out: StackTool[] = [];
  const add = (raw: string, mark: { icon: string; plate: boolean } | null) => {
    const name = Object.hasOwn(STACK_ALIAS, raw) ? STACK_ALIAS[raw] : raw;
    if (!mark || seen.has(name) || skip.has(name)) return;
    seen.add(name);
    out.push({ name, icon: mark.icon, plate: mark.plate });
  };
  for (const g of [...groups].sort((a, b) => a.order - b.order))
    for (const item of g.items) {
      add(item.name, toolIcon(item.name));
      for (const child of item.children ?? []) add(child, toolChildIcon(child));
    }
  return out;
}

export function techStack(
  groups: readonly SkillGroup[],
  roles: typeof STACK_ROLES = STACK_ROLES,
  exclude: readonly string[] = STACK_EXCLUDE,
): StackGroup[] {
  const byName = new Map(stackTools(groups, exclude).map((t) => [t.name, t]));
  const used = new Set<string>();
  const out: StackGroup[] = [];
  for (const role of roles) {
    const tools: StackTool[] = [];
    for (const name of role.tools) {
      const tool = byName.get(name);
      if (!tool)
        throw new Error(`techStack: "${name}" (role ${role.id}) is not a shown /skills/ tool`);
      if (used.has(name)) throw new Error(`techStack: "${name}" is in two roles`);
      used.add(name);
      tools.push(tool);
    }
    if (tools.length > 0) out.push({ id: role.id, label: role.label, tools });
  }
  for (const name of byName.keys())
    if (!used.has(name)) throw new Error(`techStack: "${name}" has no role`);
  return out;
}

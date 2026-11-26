/**
 * Name → icon map for the tool rows on /skills/ (EN and VI share it: tool names are English in
 * every language).
 *
 * Sources and licences (nothing is loaded from a URL; astro-icon inlines the SVG at build):
 * - `logos:*`   @iconify-json/logos 1.2.18, CC0-1.0, Gil Barbara, github.com/gilbarbara/logos.
 * - `talend`, `apache-spark`  src/icons/*.svg, from simple-icons 16.37.0 (CC0-1.0), github.com/simple-icons/simple-icons.
 *   (The `logos` Spark mark is a wide wordmark that is unreadable at 20px, so the square mark is used.)
 * The files are CC0; the brand marks are trademarks of their owners and are shown unaltered
 * only to identify the tool, next to a visible "no endorsement implied" line.
 *
 * Only real brand logos are shown. A row or sub-item with no entry (concepts, methods, and brands with
 * no installed mark such as Amazon EMR and the AWS CDK) has no icon; the page keeps an empty slot so
 * names stay aligned. A different brand's mark is never substituted.
 * Sub-items (CHILD_ICONS) follow the same sources, at 16px.
 *
 * `plate` marks the brand marks whose darkest colour is under 3:1 on the dark `--surface-2`; they
 * sit on a white plate in dark theme (never recoloured). tests/unit/tool-icons.test.ts recomputes
 * the flag from the icon colours.
 */

export type ToolIconEntry = { icon: string; plate?: true };
export type ToolIcon = { icon: string; plate: boolean };

export const TOOL_ICONS: Record<string, ToolIconEntry> = {
  // Data Engineering
  Python: { icon: 'logos:python', plate: true },
  // PySpark has no mark of its own; it uses the Apache Spark mark (the same brand family).
  PySpark: { icon: 'apache-spark' },
  'Apache Spark': { icon: 'apache-spark' },
  'Apache Airflow': { icon: 'logos:airflow-icon', plate: true },
  DBT: { icon: 'logos:dbt-icon' },
  Databricks: { icon: 'logos:databricks-icon' },
  Talend: { icon: 'talend' },
  // Cloud Platform (children such as EMR, S3 are in CHILD_ICONS)
  AWS: { icon: 'logos:aws', plate: true },
  Azure: { icon: 'logos:microsoft-azure', plate: true },
  // DevOps & IaC
  Git: { icon: 'logos:git-icon' },
  'GitLab CI/CD': { icon: 'logos:gitlab-icon' },
  Docker: { icon: 'logos:docker-icon' },
  Kubernetes: { icon: 'logos:kubernetes' },
  Datadog: { icon: 'logos:datadog-icon', plate: true },
  // Backend Engineering
  Java: { icon: 'logos:java' },
  PostgreSQL: { icon: 'logos:postgresql', plate: true },
};

/**
 * Sub-items listed under a row (`children` in the skills content, same names in EN and VI), keyed
 * by their own name: "Databricks" under Azure is a child, not the top-level row. Same sources and
 * plate rule as TOOL_ICONS. Amazon EMR and the AWS CDK have no installed
 * icon, so they are absent (no icon).
 */
export const CHILD_ICONS: Record<string, ToolIconEntry> = {
  'Spring Boot': { icon: 'logos:spring-icon' },
  S3: { icon: 'logos:aws-s3', plate: true },
  Athena: { icon: 'logos:aws-athena', plate: true },
  Redshift: { icon: 'logos:aws-redshift', plate: true },
  'Lake Formation': { icon: 'logos:aws-lake-formation', plate: true },
  Databricks: { icon: 'logos:databricks-icon' },
  CloudFormation: { icon: 'logos:aws-cloudformation', plate: true },
  Terraform: { icon: 'logos:terraform-icon', plate: true },
};

/** The brand icon for a sub-item, or null (no icon). */
export function toolChildIcon(name: string): ToolIcon | null {
  return resolve(Object.hasOwn(CHILD_ICONS, name) ? CHILD_ICONS[name] : undefined);
}

function resolve(entry: ToolIconEntry | undefined): ToolIcon | null {
  return entry ? { icon: entry.icon, plate: entry.plate === true } : null;
}

/** The brand icon for a row, or null (no icon; the empty slot stays). */
export function toolIcon(name: string): ToolIcon | null {
  return resolve(Object.hasOwn(TOOL_ICONS, name) ? TOOL_ICONS[name] : undefined);
}

/**
 * The brand-marked rows among `names`, in input order, one per mark: a name whose mark an earlier
 * name already used is dropped, so "PySpark" keeps the Spark mark and "Apache Spark" after it is
 * not repeated. Rows only (TOOL_ICONS, never CHILD_ICONS); unknown names are dropped.
 */
export function brandTools(
  names: readonly string[],
): { name: string; icon: string; plate: boolean }[] {
  const marks = new Set<string>();
  const out: { name: string; icon: string; plate: boolean }[] = [];
  for (const name of names) {
    const tool = toolIcon(name);
    if (!tool || marks.has(tool.icon)) continue;
    marks.add(tool.icon);
    out.push({ name, icon: tool.icon, plate: tool.plate });
  }
  return out;
}

/**
 * Whether a brand mark (by icon id, e.g. a certification logo) needs the dark-mode white plate:
 * true when TOOL_ICONS or CHILD_ICONS lists that icon with `plate`. The flag is the one the
 * contrast test recomputes, so certification logos follow the same rule and are never hand-listed.
 */
export function iconPlate(icon: string): boolean {
  return [...Object.values(TOOL_ICONS), ...Object.values(CHILD_ICONS)].some(
    (e) => e.icon === icon && e.plate === true,
  );
}

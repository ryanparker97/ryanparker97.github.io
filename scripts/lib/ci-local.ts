// Pure logic for `pnpm ci:local` (scripts/ci-local.ts): arguments, step plan, file list, image tag, summary.
// No I/O here, so tests/unit/ci-local.test.ts can run it anywhere.
import { createHash } from 'node:crypto';

export type StepId =
  | 'install'
  | 'lint'
  | 'format'
  | 'check'
  | 'test'
  | 'actionlint'
  | 'build'
  | 'pdf'
  | 'budget'
  | 'e2e-chromium'
  | 'e2e-webkit';
export type Status = 'pass' | 'FAIL' | 'skipped';
export interface Step {
  id: StepId;
  label: string;
  /** Run in the container from /work. Empty for `actionlint`, which the CLI runs from CI's pinned image. */
  cmd: string[];
  /** The step that must pass first. Every step needs `install`; pdf, budget and e2e also need `build`. */
  needs?: StepId;
}
export interface Row {
  id: StepId;
  status: Status;
  seconds: number;
}
export interface Args {
  webkit: boolean;
  /** false: tracked files only; true: every untracked file; string[]: the untracked files matching these pathspecs. */
  untracked: false | true | string[];
  only: StepId[] | null;
  help: boolean;
}

const pw = (browser: string) => ['pnpm', 'exec', 'playwright', 'test', `--project=${browser}`];

// Same gates and order as .github/workflows/ci.yml: static, then build, then e2e.
export const STEPS: Step[] = [
  {
    id: 'install',
    label: 'pnpm install --frozen-lockfile',
    cmd: ['pnpm', 'install', '--frozen-lockfile'],
  },
  { id: 'lint', label: 'pnpm lint', cmd: ['pnpm', 'lint'], needs: 'install' },
  { id: 'format', label: 'pnpm format:check', cmd: ['pnpm', 'format:check'], needs: 'install' },
  { id: 'check', label: 'pnpm check', cmd: ['pnpm', 'check'], needs: 'install' },
  { id: 'test', label: 'pnpm test', cmd: ['pnpm', 'test'], needs: 'install' },
  { id: 'actionlint', label: 'actionlint', cmd: [], needs: 'install' },
  { id: 'build', label: 'pnpm build', cmd: ['pnpm', 'build'], needs: 'install' },
  { id: 'pdf', label: 'pnpm test:pdf', cmd: ['pnpm', 'test:pdf'], needs: 'build' },
  { id: 'budget', label: 'pnpm test:budget', cmd: ['pnpm', 'test:budget'], needs: 'build' },
  { id: 'e2e-chromium', label: 'playwright chromium', cmd: pw('chromium'), needs: 'build' },
  { id: 'e2e-webkit', label: 'playwright webkit', cmd: pw('webkit'), needs: 'build' },
];

export const USAGE = `Usage: pnpm ci:local [--webkit] [--untracked[=<pathspec,...>]] [--only <step,...>]

Runs CI's gates in a Linux container on a clean copy of what git would commit
(tracked files with their working-tree edits, plus staged new files), and prints one row per step.

  --webkit            also run the WebKit e2e job (about 4 minutes more)
  --untracked         also copy every untracked, non-ignored file (pulls in stray local files)
  --untracked=a,b     also copy the untracked files matching these paths (use this for new files)
  --only a,b          run only these steps (install and what they need still run)
  --help              this text

Steps: ${STEPS.map((s) => s.id).join(', ')}`;

const stepIds = (list: string): StepId[] =>
  list.split(',').map((id) => {
    const step = STEPS.find((s) => s.id === id);
    if (!step)
      throw new Error(`unknown step "${id}" (steps: ${STEPS.map((s) => s.id).join(', ')})`);
    return step.id;
  });

export function parseArgs(argv: string[]): Args {
  const args: Args = { webkit: false, untracked: false, only: null, help: false };
  const list = argv[0] === '--' ? argv.slice(1) : argv;
  for (let i = 0; i < list.length; i++) {
    const arg = list[i];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--webkit') args.webkit = true;
    else if (arg === '--untracked') args.untracked = true;
    else if (arg.startsWith('--untracked=')) {
      const paths = arg.slice('--untracked='.length).split(',').filter(Boolean);
      if (paths.length === 0) throw new Error('--untracked= needs at least one path');
      args.untracked = paths;
    } else if (arg === '--only' || arg.startsWith('--only=')) {
      const value = arg === '--only' ? list[++i] : arg.slice('--only='.length);
      if (!value) throw new Error('--only needs a comma-separated list of steps');
      args.only = stepIds(value);
    } else throw new Error(`unknown argument "${arg}"`);
  }
  return args;
}

/** The steps this run covers: e2e-webkit only with --webkit (or when --only names it). */
export function plannedSteps(args: Args): Step[] {
  const webkit = args.webkit || (args.only?.includes('e2e-webkit') ?? false);
  return STEPS.filter((s) => s.id !== 'e2e-webkit' || webkit);
}

const needsClosure = (id: StepId, into = new Set<StepId>()): Set<StepId> => {
  into.add(id);
  const needs = STEPS.find((s) => s.id === id)?.needs;
  if (needs) needsClosure(needs, into);
  return into;
};

/** `skipped` when --only leaves the step out, or the step it needs did not pass. `--only` cannot hide a failing install or build. */
export function nextStatus(
  step: Step,
  results: Partial<Record<StepId, Status>>,
  only: StepId[] | null = null,
): 'run' | 'skipped' {
  if (only && ![...only, 'install' as const].some((id) => needsClosure(id).has(step.id)))
    return 'skipped';
  if (step.needs && results[step.needs] !== 'pass') return 'skipped';
  return 'run';
}

/** What a commit would hold: tracked files that still exist, plus the untracked ones the run asked for. */
export function selectFiles(tracked: string[], deleted: string[], untracked: string[]): string[] {
  const gone = new Set(deleted);
  return [...new Set([...tracked.filter((f) => !gone.has(f)), ...untracked])].sort();
}

/** The workflow files to lint. The clean copy has no .git, so actionlint cannot find the project itself and is given them. */
export const workflowFiles = (files: string[]): string[] =>
  files.filter((f) => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(f));

const CODE_DIRS = /^(src|public|scripts|tests)\//;
export const TEXT_FILE = /\.(ts|mts|js|mjs|astro|json|ya?ml|css|mdx?)$/;
// Root docs describe files rather than load them, so naming a file there is no sign the build needs it.
const DESCRIBES_ONLY = new Set(['spec.md', 'README.md']);

/**
 * Untracked files (src, public, scripts, tests or the root) whose basename a tracked text file mentions:
 * the avatar-cutout case, where a file exists only on this disk and the clean run will not have it.
 * A mention can be a comment, so the CLI only warns.
 */
export function referencedUntracked(
  untracked: string[],
  texts: { path: string; text: string }[],
): { file: string; by: string[] }[] {
  const readers = texts.filter((t) => TEXT_FILE.test(t.path) && !DESCRIBES_ONLY.has(t.path));
  return untracked
    .filter((f) => !f.includes('/') || CODE_DIRS.test(f))
    .map((file) => {
      const name = file.slice(file.lastIndexOf('/') + 1);
      return {
        file,
        by: readers
          .filter((t) => t.text.includes(name))
          .map((t) => t.path)
          .sort(),
      };
    })
    .filter((hit) => hit.by.length > 0)
    .sort((a, b) => a.file.localeCompare(b.file));
}

export interface Versions {
  playwright: string;
  node: string;
  pnpm: string;
}

/** Playwright from pnpm-lock.yaml (so the image matches the browsers the tests run), Node major from .nvmrc, pnpm from packageManager. */
export function readVersions(lock: string, nvmrc: string, pkg: string): Versions {
  const playwright = /^ {2}playwright@(\d+\.\d+\.\d+):/m.exec(lock)?.[1];
  const node = /^v?(\d+)/.exec(nvmrc.trim())?.[1];
  const pnpm = /"packageManager":\s*"pnpm@([^"+]+)/.exec(pkg)?.[1];
  if (!playwright) throw new Error('no playwright@x.y.z entry in pnpm-lock.yaml');
  if (!node) throw new Error('.nvmrc does not start with a Node version');
  if (!pnpm) throw new Error('package.json has no "packageManager": "pnpm@x.y.z"');
  return { playwright, node, pnpm };
}

export function imageTag(v: Versions & { dockerfile: string }): string {
  const hash = createHash('sha256').update(v.dockerfile).digest('hex').slice(0, 8);
  return `ci-local:pw${v.playwright}-node${v.node}-pnpm${v.pnpm}-${hash}`;
}

/** CI's actionlint image reference, digest included, so the local run lints with the same build. */
export function actionlintImage(ciYml: string): string {
  const ref = /rhysd\/actionlint:[\w.-]+@sha256:[0-9a-f]{64}/.exec(ciYml)?.[0];
  if (!ref) throw new Error('no pinned rhysd/actionlint image in .github/workflows/ci.yml');
  return ref;
}

/** Whole seconds first, so 59.6 s carries to 1m00s instead of printing 1m60s. */
const duration = (seconds: number) => {
  const s = Math.round(seconds);
  return s >= 60 ? `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s` : `${s}s`;
};

/** One aligned row per step, then the total. */
export function formatSummary(rows: Row[]): string {
  const width = Math.max(4, ...rows.map((r) => r.id.length));
  const line = (id: string, status: string, time: string) =>
    `${id.padEnd(width)}  ${status.padEnd(7)}  ${time}`;
  return [
    line('step', 'result', 'time'),
    ...rows.map((r) => line(r.id, r.status, r.status === 'skipped' ? '-' : duration(r.seconds))),
    line(
      'total',
      rows.some((r) => r.status === 'FAIL') ? 'FAIL' : 'pass',
      duration(rows.reduce((t, r) => t + r.seconds, 0)),
    ),
  ].join('\n');
}

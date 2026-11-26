// Runs CI's gates in a Linux container on a clean copy of what git would commit: `pnpm ci:local --help`.
// Pure parts (arguments, steps, summary) are in scripts/lib/ci-local.ts; this file only does the I/O.
import { spawn, spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  TEXT_FILE,
  USAGE,
  actionlintImage,
  formatSummary,
  imageTag,
  nextStatus,
  parseArgs,
  plannedSteps,
  readVersions,
  referencedUntracked,
  selectFiles,
  workflowFiles,
  type Args,
  type Row,
  type Status,
  type StepId,
} from './lib/ci-local';

const out = (text = '') => process.stdout.write(`${text}\n`);

/** Runs a command and returns its output; a failure to start or a non-zero exit is the caller's to handle via `ok`. */
const capture = (cmd: string, args: string[], cwd?: string) => {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 1 << 28 });
  return { ok: r.status === 0, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
};
const gitList = (root: string, ...args: string[]): string[] => {
  const r = capture('git', ['ls-files', '-z', ...args], root);
  if (!r.ok) throw new Error(`git ls-files ${args.join(' ')} failed: ${r.stderr.trim()}`);
  return r.stdout.split('\0').filter(Boolean);
};

/** Child processes run async so Ctrl-C reaches our handler (cleanup) while a long step is going. */
const run = (cmd: string, args: string[]) =>
  new Promise<number>((resolve) => {
    const child = spawn(cmd, args, { stdio: 'inherit' });
    child.on('error', (e) => {
      out(`could not start ${cmd}: ${e.message}`);
      resolve(127);
    });
    child.on('close', (code) => resolve(code ?? 1));
  });

let work: string | undefined;
let container: string | undefined;
function cleanup() {
  if (container) capture('docker', ['rm', '-f', container]);
  if (work) rmSync(work, { recursive: true, force: true });
  container = work = undefined;
}
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    out(`\n${signal}: cleaning up`);
    cleanup();
    process.exit(130);
  });

/** Copies each file from the working tree (not the index), keeping the mode bit. */
function copyTree(root: string, files: string[], to: string) {
  for (const file of files) {
    const from = join(root, file);
    if (!existsSync(from)) throw new Error(`${file} is listed by git but missing on disk`);
    mkdirSync(dirname(join(to, file)), { recursive: true });
    copyFileSync(from, join(to, file));
    chmodSync(join(to, file), statSync(from).mode);
  }
}

/** Builds the image on first use (about 1-2 minutes with the base image present) and returns its tag. */
async function ensureImage(root: string, ctx: string): Promise<string> {
  const v = readVersions(
    readFileSync(join(root, 'pnpm-lock.yaml'), 'utf8'),
    readFileSync(join(root, '.nvmrc'), 'utf8'),
    readFileSync(join(root, 'package.json'), 'utf8'),
  );
  const dockerfile = join(import.meta.dirname, 'ci-local.Dockerfile'); // next to this script, wherever the repo copy is
  const tag = imageTag({ ...v, dockerfile: readFileSync(dockerfile, 'utf8') });
  if (capture('docker', ['image', 'inspect', tag]).ok) return tag;
  out(
    `building ${tag} (first run only, about 1-2 minutes; longer if the 1 GB base image must be pulled first)`,
  );
  const build = [
    'build',
    '-t',
    tag,
    '-f',
    dockerfile,
    '--build-arg',
    `PW_VERSION=${v.playwright}`,
    '--build-arg',
    `NODE_MAJOR=${v.node}`,
    '--build-arg',
    `PNPM_VERSION=${v.pnpm}`,
    ctx,
  ];
  if ((await run('docker', build)) !== 0) throw new Error('docker build failed');
  return tag;
}

/** Keeps the Playwright report and traces of the run under test-results/ci-local/<browser>/ (gitignored). */
function saveReports(root: string, name: string, browser: string) {
  const dest = join(root, 'test-results/ci-local', browser);
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  for (const dir of ['playwright-report', 'test-results'])
    capture('docker', ['cp', `${name}:/work/${dir}`, join(dest, dir)]);
  out(
    `reports: test-results/ci-local/${browser}/  (pnpm exec playwright show-report test-results/ci-local/${browser}/playwright-report)`,
  );
}

/** CI's actionlint (same pinned image) on the clean copy, which has no .git, so the workflow files are named. */
function actionlintArgs(tree: string, files: string[]): string[] {
  const image = actionlintImage(readFileSync(join(tree, '.github/workflows/ci.yml'), 'utf8'));
  return [
    'run',
    '--rm',
    '-v',
    `${tree}:/repo:ro`,
    '-w',
    '/repo',
    image,
    '-color',
    ...workflowFiles(files),
  ];
}

/** Warnings only: a file git does not know yet can make the clean run fail (or hide a typo in --untracked). */
function warnAboutUntracked(
  repo: string,
  args: Args,
  tracked: string[],
  deleted: string[],
  untrackedAll: string[],
  included: string[],
) {
  const left = untrackedAll.filter((f) => !included.includes(f));
  const gone = new Set(deleted);
  const texts = tracked
    .filter((path) => !gone.has(path))
    .map((path) => ({
      path,
      text: TEXT_FILE.test(path) ? readFileSync(join(repo, path), 'utf8') : '',
    }));
  for (const { file, by } of referencedUntracked(left, texts))
    out(
      `warning: ${file} is untracked but named in ${by.join(', ')}; git add it or the clean run will miss it`,
    );
  if (Array.isArray(args.untracked))
    for (const path of args.untracked)
      if (
        gitList(repo, '--others', '--exclude-standard', '--', path).length === 0 &&
        gitList(repo, '--cached', '--', path).length === 0
      )
        out(
          `warning: --untracked=${path} matches no untracked file (typo, already tracked, or gitignored)`,
        );
}

async function main(args: Args): Promise<number> {
  const root = capture('git', ['rev-parse', '--show-toplevel']);
  if (!root.ok) throw new Error('run this inside the repository');
  const repo = root.stdout.trim();
  if (!capture('docker', ['info']).ok) {
    out(
      'Docker is not running. Start Docker (Docker Desktop, OrbStack or another engine) and run again.',
    );
    return 2;
  }

  // Which files a commit would hold: tracked (minus deleted) + the untracked ones asked for with --untracked.
  const tracked = gitList(repo, '--cached');
  const deleted = gitList(repo, '--deleted');
  const untrackedAll = gitList(repo, '--others', '--exclude-standard');
  const included =
    args.untracked === true
      ? untrackedAll
      : args.untracked === false
        ? []
        : gitList(repo, '--others', '--exclude-standard', '--', ...args.untracked);
  const files = selectFiles(tracked, deleted, included);
  out(
    `${files.length} files in the clean copy (${tracked.length - deleted.length} tracked); ${untrackedAll.length - included.length} untracked left out${args.untracked === false ? ' (use --untracked=<path> for new files)' : ''}`,
  );
  warnAboutUntracked(repo, args, tracked, deleted, untrackedAll, included);

  work = mkdtempSync(join(tmpdir(), 'ci-local-'));
  const tree = join(work, 'tree');
  const ctx = join(work, 'ctx');
  mkdirSync(ctx);
  copyTree(repo, files, tree);
  const tag = await ensureImage(repo, ctx);

  container = `ci-local-${process.pid}`;
  const started = capture('docker', [
    'run',
    '-d',
    '--rm',
    '--init',
    '--ipc=host',
    '--name',
    container,
    '-e',
    'CI=true',
    '-v',
    `${tree}:/src:ro`,
    '-v',
    'ci-local-pnpm-store:/root/.local/share/pnpm/store',
    tag,
    'sleep',
    'infinity',
  ]);
  if (!started.ok) throw new Error(`docker run failed: ${started.stderr.trim()}`);
  if (!capture('docker', ['exec', container, 'sh', '-c', 'mkdir /work && cp -r /src/. /work/']).ok)
    throw new Error('copy into the container failed');

  const results: Partial<Record<StepId, Status>> = {};
  const rows: Row[] = [];
  for (const step of plannedSteps(args)) {
    let status: Status = 'skipped';
    const t0 = Date.now();
    if (nextStatus(step, results, args.only) === 'run') {
      out(`\n== ${step.id}: ${step.label}`);
      const code =
        step.id === 'actionlint'
          ? await run('docker', actionlintArgs(tree, files))
          : await run('docker', ['exec', '-w', '/work', container, ...step.cmd]);
      status = code === 0 ? 'pass' : 'FAIL';
      if (step.id.startsWith('e2e-')) saveReports(repo, container, step.id.slice('e2e-'.length));
    }
    results[step.id] = status;
    rows.push({ id: step.id, status, seconds: (Date.now() - t0) / 1000 });
  }

  out(`\n${formatSummary(rows)}`);
  out('not run locally: zizmor, Lighthouse, links, deploy, smoke, CodeQL (CI only)');
  return rows.some((r) => r.status === 'FAIL') ? 1 : 0;
}

let args: Args;
try {
  args = parseArgs(process.argv.slice(2));
} catch (e) {
  out(`${(e as Error).message}\n\n${USAGE}`);
  process.exit(2);
}
if (args.help) {
  out(USAGE);
  process.exit(0);
}
let code = 1;
try {
  code = await main(args);
} catch (e) {
  out(`ci:local: ${(e as Error).message}`);
  code = 2;
} finally {
  cleanup();
}
process.exit(code);

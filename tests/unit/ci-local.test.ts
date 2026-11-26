// ci-local U1: the pure logic behind `pnpm ci:local` (scripts/lib/ci-local.ts). The Docker run itself is the Check.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  STEPS,
  actionlintImage,
  formatSummary,
  imageTag,
  nextStatus,
  parseArgs,
  plannedSteps,
  readVersions,
  referencedUntracked,
  selectFiles,
  type Status,
  type StepId,
  workflowFiles,
} from '../../scripts/lib/ci-local';

const step = (id: StepId) => STEPS.find((s) => s.id === id)!;
const run = (id: StepId, results: Partial<Record<StepId, Status>>, only: StepId[] | null = null) =>
  nextStatus(step(id), results, only);

describe('parseArgs', () => {
  it('defaults to tracked files, chromium only', () => {
    expect(parseArgs([])).toEqual({ webkit: false, untracked: false, only: null, help: false });
  });
  it('reads the flags', () => {
    expect(parseArgs(['--webkit', '--untracked', '--only', 'lint,test']).untracked).toBe(true);
    expect(parseArgs(['--webkit']).webkit).toBe(true);
    expect(parseArgs(['--only=lint,test']).only).toEqual(['lint', 'test']);
    expect(parseArgs(['--help']).help).toBe(true);
  });
  it('reads --untracked=a,b as paths', () => {
    expect(parseArgs(['--untracked=src/a.png,tests/b.ts']).untracked).toEqual([
      'src/a.png',
      'tests/b.ts',
    ]);
  });
  it('ignores a leading -- from `pnpm ci:local -- --webkit`', () => {
    expect(parseArgs(['--', '--webkit']).webkit).toBe(true);
  });
  it('rejects an unknown step or flag by name', () => {
    expect(() => parseArgs(['--only', 'lint,nope'])).toThrow('nope');
    expect(() => parseArgs(['--bogus'])).toThrow('--bogus');
    expect(() => parseArgs(['--only'])).toThrow('--only');
    expect(() => parseArgs(['--untracked='])).toThrow('--untracked');
  });
});

describe('plannedSteps', () => {
  it('adds the webkit job only with --webkit or --only naming it', () => {
    const ids = (a: string[]) => plannedSteps(parseArgs(a)).map((s) => s.id);
    expect(ids([])).not.toContain('e2e-webkit');
    expect(ids(['--webkit'])).toContain('e2e-webkit');
    expect(ids(['--only', 'e2e-webkit'])).toContain('e2e-webkit');
    expect(ids([])).toEqual([
      'install',
      'lint',
      'format',
      'check',
      'test',
      'actionlint',
      'build',
      'pdf',
      'budget',
      'e2e-chromium',
    ]);
  });
});

describe('selectFiles', () => {
  it('drops tracked files that are deleted and adds the untracked ones asked for', () => {
    expect(selectFiles(['b.ts', 'a.ts', 'gone.ts'], ['gone.ts'], ['new.ts'])).toEqual([
      'a.ts',
      'b.ts',
      'new.ts',
    ]);
  });
  it('keeps names with spaces and lists a file once', () => {
    expect(selectFiles(['tests/e2e/a b.ts', 'x.ts'], [], ['x.ts'])).toEqual([
      'tests/e2e/a b.ts',
      'x.ts',
    ]);
  });
});

describe('nextStatus', () => {
  it('runs everything when install passes', () => {
    expect(run('lint', { install: 'pass' })).toBe('run');
    expect(run('actionlint', { install: 'pass' })).toBe('run');
  });
  it('skips everything when install fails', () => {
    for (const s of STEPS.filter((x) => x.id !== 'install'))
      expect(run(s.id, { install: 'FAIL' })).toBe('skipped');
  });
  it('skips pdf, budget and e2e when build fails, but not other static steps', () => {
    const results: Partial<Record<StepId, Status>> = {
      install: 'pass',
      lint: 'pass',
      build: 'FAIL',
    };
    for (const id of ['pdf', 'budget', 'e2e-chromium', 'e2e-webkit'] as const)
      expect(run(id, results)).toBe('skipped');
    expect(run('test', results)).toBe('run');
  });
  it('does not skip build when lint fails', () => {
    expect(run('build', { install: 'pass', lint: 'FAIL' })).toBe('run');
  });
  it('--only e2e-chromium runs install, build and e2e-chromium only', () => {
    const only: StepId[] = ['e2e-chromium'];
    const ran = STEPS.filter(
      (s) => run(s.id, { install: 'pass', build: 'pass' }, only) === 'run',
    ).map((s) => s.id);
    expect(ran).toEqual(['install', 'build', 'e2e-chromium']);
  });
  it('--only cannot hide a failing build', () => {
    expect(run('e2e-chromium', { install: 'pass', build: 'FAIL' }, ['e2e-chromium'])).toBe(
      'skipped',
    );
  });
});

describe('workflowFiles', () => {
  it('picks the workflow files, not the actions or other yaml', () => {
    const files = [
      '.github/workflows/ci.yml',
      '.github/workflows/x.yaml',
      '.github/actions/setup/action.yml',
      'a.yml',
    ];
    expect(workflowFiles(files)).toEqual(['.github/workflows/ci.yml', '.github/workflows/x.yaml']);
  });
});

describe('referencedUntracked', () => {
  const texts = [
    { path: 'src/pages/a.astro', text: "import x from '../assets/x.png';" },
    { path: 'tests/unit/b.test.ts', text: "readFileSync('src/assets/x.png'); 'public/y.svg'" },
    { path: 'spec.md', text: 'the file src/assets/only-in-spec.png is described here' },
    { path: 'README.md', text: 'see root-note.txt' },
    { path: 'src/data/c.json', text: '"cover": "unrelated.png"' },
  ];
  it('names the tracked files that mention an untracked file by its basename', () => {
    expect(referencedUntracked(['src/assets/x.png', 'public/y.svg'], texts)).toEqual([
      { file: 'public/y.svg', by: ['tests/unit/b.test.ts'] },
      { file: 'src/assets/x.png', by: ['src/pages/a.astro', 'tests/unit/b.test.ts'] },
    ]);
  });
  it('skips files outside src, public, scripts, tests and the root', () => {
    expect(referencedUntracked(['.archify/x.png', '.crew/x.png'], texts)).toEqual([]);
    expect(referencedUntracked(['x.png'], texts)).toHaveLength(1);
  });
  it('does not read root spec.md and README.md, which describe files rather than load them', () => {
    expect(referencedUntracked(['src/assets/only-in-spec.png', 'root-note.txt'], texts)).toEqual(
      [],
    );
  });
  it('ignores a file nothing names, and non-text files', () => {
    expect(referencedUntracked(['src/assets/lonely.png'], texts)).toEqual([]);
    expect(
      referencedUntracked(['src/assets/z.png'], [{ path: 'public/z.png', text: 'z.png' }]),
    ).toEqual([]);
  });
});

describe('imageTag', () => {
  const base = { playwright: '1.64.1', node: '24', pnpm: '12.16.1', dockerfile: 'FROM a' };
  it('names the versions and changes with the Dockerfile text', () => {
    expect(imageTag(base)).toMatch(/^ci-local:pw1\.64\.1-node24-pnpm12\.16\.1-[0-9a-f]{8}$/);
    expect(imageTag({ ...base, dockerfile: 'FROM b' })).not.toBe(imageTag(base));
    expect(imageTag({ ...base })).toBe(imageTag(base));
  });
});

describe('the repo files the command reads', () => {
  it('readVersions finds Playwright, Node and pnpm', () => {
    const v = readVersions(
      readFileSync('pnpm-lock.yaml', 'utf8'),
      readFileSync('.nvmrc', 'utf8'),
      readFileSync('package.json', 'utf8'),
    );
    expect(v.playwright).toBe(
      JSON.parse(readFileSync('package.json', 'utf8')).devDependencies.playwright.replace('^', ''),
    );
    expect(v.node).toBe('24');
    expect(v.pnpm).toBe('12.16.1');
  });
  it('readVersions names what is missing', () => {
    expect(() => readVersions('', '24', '{"packageManager":"pnpm@1.0.0"}')).toThrow('playwright');
    expect(() =>
      readVersions('  playwright@1.2.3:', 'lts', '{"packageManager":"pnpm@1.0.0"}'),
    ).toThrow('.nvmrc');
    expect(() => readVersions('  playwright@1.2.3:', '24', '{}')).toThrow('packageManager');
  });
  it('actionlintImage returns the digest-pinned image from ci.yml', () => {
    expect(actionlintImage(readFileSync('.github/workflows/ci.yml', 'utf8'))).toMatch(
      /^rhysd\/actionlint:1\.7\.7@sha256:[0-9a-f]{64}$/,
    );
    expect(() => actionlintImage('name: x')).toThrow('actionlint');
  });
  it('the Dockerfile takes the three build args the command passes', () => {
    const text = readFileSync('scripts/ci-local.Dockerfile', 'utf8');
    for (const arg of ['PW_VERSION', 'NODE_MAJOR', 'PNPM_VERSION'])
      expect(text).toContain(`ARG ${arg}`);
  });
});

describe('formatSummary', () => {
  it('prints one row per step with FAIL and skipped visible, then the total', () => {
    const out = formatSummary([
      { id: 'install', status: 'pass', seconds: 13 },
      { id: 'build', status: 'FAIL', seconds: 5 },
      { id: 'e2e-chromium', status: 'skipped', seconds: 0 },
    ]);
    const lines = out.split('\n');
    expect(lines).toHaveLength(5);
    expect(lines[2]).toMatch(/^build\s+FAIL\s+5s$/);
    expect(lines[3]).toMatch(/^e2e-chromium\s+skipped\s+-$/);
    expect(lines[4]).toMatch(/^total\s+FAIL\s+18s$/);
  });
  it('carries rounded seconds into the minute (59.6 s is 1m00s, never 1m60s)', () => {
    const out = formatSummary([{ id: 'build', status: 'pass', seconds: 119.6 }]);
    expect(out).toContain('2m00s');
    expect(out).not.toContain('60s');
    expect(formatSummary([{ id: 'build', status: 'pass', seconds: 59.6 }])).toContain('1m00s');
  });
  it('formats minutes', () => {
    expect(formatSummary([{ id: 'e2e-chromium', status: 'pass', seconds: 148 }])).toContain(
      '2m28s',
    );
  });
});

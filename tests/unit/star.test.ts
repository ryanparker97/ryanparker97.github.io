import { describe, expect, it } from 'vitest';
import { remark } from 'remark';
import { checkStarHeadings, remarkStarSections } from '../../src/lib/remark-star-sections';
import { readFileSync } from 'node:fs';
import {
  actionSteps,
  groupStories,
  headlineMetric,
  splitStarHtml,
  stripFirstList,
} from '../../src/lib/star';

describe('checkStarHeadings', () => {
  it('accepts the four sections in order', () => {
    expect(checkStarHeadings(['Situation', 'Task', 'Action', 'Result'], 'en')).toBeNull();
    expect(checkStarHeadings(['Bối cảnh', 'Nhiệm vụ', 'Hành động', 'Kết quả'], 'vi')).toBeNull();
  });
  it('rejects missing, extra, out-of-order and wrong-language headings', () => {
    expect(checkStarHeadings(['Situation', 'Task', 'Action'], 'en')).toMatch(/exactly four/);
    expect(
      checkStarHeadings(['Situation', 'Task', 'Action', 'Result', 'Notes'], 'en'),
    ).not.toBeNull();
    expect(checkStarHeadings(['Task', 'Situation', 'Action', 'Result'], 'en')).not.toBeNull();
    expect(checkStarHeadings(['Situation', 'Task', 'Action', 'Result'], 'vi')).not.toBeNull();
  });
});

describe('remarkStarSections', () => {
  const run = (md: string, path: string) =>
    remark()
      .use(remarkStarSections)
      .runSync(remark().parse(md), { path } as never);

  it('fails naming the file when a story is invalid', () => {
    expect(() => run('## Situation\n\ntext', '/x/src/content/star/en/bad.md')).toThrow(
      /star\/en\/bad\.md/,
    );
  });
  it('passes a valid story and ignores other collections', () => {
    const ok = '## Situation\n\na\n\n## Task\n\nb\n\n## Action\n\nc\n\n## Result\n\nd';
    expect(() => run(ok, '/x/src/content/star/en/ok.md')).not.toThrow();
    expect(() => run('# nothing', '/x/src/content/blog/en/post.md')).not.toThrow();
  });
});

describe('groupStories', () => {
  const story = (slug: string, role: string | undefined, date: string) => ({
    slug,
    data: { role, date: new Date(date), metrics: [] },
  });
  const roles = [{ slug: 'now' }, { slug: 'before' }, { slug: 'unused' }];

  it('groups by role in role order, newest story first, and ends with Other / Personal', () => {
    const groups = groupStories(
      [
        story('a-old', 'before', '2020-01-01'),
        story('personal', undefined, '2025-01-01'),
        story('b-old', 'now', '2024-01-01'),
        story('b-new', 'now', '2026-01-01'),
      ],
      roles,
    );
    expect(groups.map((g) => g.id)).toEqual(['now', 'before', 'other']);
    expect(groups[0].stories.map((s) => s.slug)).toEqual(['b-new', 'b-old']);
    expect(groups[2].role).toBeUndefined();
  });
  it('omits roles without stories and the Other group when empty', () => {
    expect(groupStories([story('x', 'now', '2024-01-01')], roles).map((g) => g.id)).toEqual([
      'now',
    ]);
  });
  it('rejects a story that references an unknown role', () => {
    expect(() => groupStories([story('x', 'nope', '2024-01-01')], roles)).toThrow(
      /unknown role "nope"/,
    );
  });
});

describe('splitStarHtml', () => {
  it('returns the content of the four sections', () => {
    const html =
      '<h2 id="s">Situation</h2><p>a</p><h2 id="t">Task</h2><p>b</p><h2>Action</h2><p>c</p><p>c2</p><h2>Result</h2><ul><li>d</li></ul>';
    expect(splitStarHtml(html).sections).toEqual([
      '<p>a</p>',
      '<p>b</p>',
      '<p>c</p><p>c2</p>',
      '<ul><li>d</li></ul>',
    ]);
  });
  it('throws when a section is missing', () => {
    expect(() => splitStarHtml('<h2>Situation</h2><p>a</p>')).toThrow(/four STAR sections/);
  });
});

describe('headlineMetric', () => {
  it('uses the first metric', () => {
    expect(headlineMetric([{ label: 'conversion', value: '+40%' }])).toBe('+40% conversion');
    expect(headlineMetric([])).toBeUndefined();
  });
});

describe('splitStarHtml lead', () => {
  it('keeps the paragraph before the first H2', () => {
    const html =
      '<p>Note</p><h2>S</h2><p>a</p><h2>T</h2><p>b</p><h2>A</h2><p>c</p><h2>R</h2><p>d</p>';
    expect(splitStarHtml(html).lead).toBe('<p>Note</p>');
    expect(splitStarHtml('<h2>S</h2><h2>T</h2><h2>A</h2><h2>R</h2>').lead).toBe('');
  });
});

describe('actionSteps', () => {
  const body = (lang: string) =>
    readFileSync(`src/content/star/${lang}/emr-cost-optimization.md`, 'utf8');
  it('returns the labelled Action bullets of the EMR story', () => {
    expect(actionSteps(body('en')).map((h) => h.label)).toEqual([
      'Reuse before create',
      'Idle shutdown',
      'Configurable sizing',
    ]);
  });
  it('returns three steps for the VI twin', () => {
    const steps = actionSteps(body('vi'));
    expect(steps).toHaveLength(3);
    expect(steps[0].label).toMatch(/^Tái sử dụng trước khi tạo mới/);
  });
  it('is empty when the Action is prose only or has one labelled bullet', () => {
    const md = (a: string) =>
      `## Situation\n\ns\n\n## Task\n\nt\n\n## Action\n\n${a}\n\n## Result\n\nr`;
    expect(actionSteps(md('Just prose.'))).toEqual([]);
    expect(actionSteps(md('- **One:** only'))).toEqual([]);
  });
});

describe('stripFirstList', () => {
  it('removes the first list and trims', () => {
    expect(stripFirstList('<p>a</p><ul><li>x</li></ul><p>b</p>')).toBe('<p>a</p><p>b</p>');
  });
});

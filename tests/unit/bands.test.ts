import { describe, expect, it } from 'vitest';
import { bandTones } from '../../src/lib/bands';

const HOME = ['practice', 'project', 'team', 'also', 'next', 'more'];
const PROJECT = ['visual', 'stats', 'problem', 'approach', 'result', 'more'];

describe('bandTones', () => {
  it('alternates the full Home list from the white hero', () => {
    expect(bandTones(HOME)).toEqual({
      practice: 'surface',
      project: 'bg',
      team: 'surface',
      also: 'bg',
      next: 'surface',
      more: 'bg',
    });
  });

  it('shifts when practice is missing', () => {
    expect(bandTones(HOME.slice(1)).project).toBe('surface');
  });

  it('handles the full project list', () => {
    const t = bandTones(PROJECT);
    expect(t.approach).toBe('bg');
    expect(t.result).toBe('surface');
    expect(t.more).toBe('bg');
  });

  it('returns {} for no bands', () => {
    expect(bandTones([])).toEqual({});
  });

  it.each([
    ...HOME.map((m) => [`Home without ${m}`, HOME.filter((x) => x !== m)] as const),
    ...PROJECT.slice(0, 4).map(
      (m) => [`project without ${m}`, PROJECT.filter((x) => x !== m)] as const,
    ),
  ])('never repeats a tone between neighbours: %s', (_name, ids) => {
    const t = bandTones(ids);
    expect(t[ids[0]]).toBe('surface');
    for (let i = 1; i < ids.length; i++) expect(t[ids[i]]).not.toBe(t[ids[i - 1]]);
  });
});

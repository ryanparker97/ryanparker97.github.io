import { describe, expect, it } from 'vitest';
import { viPageHasContent } from '../../src/lib/vi-coverage';

describe('viPageHasContent', () => {
  it.each([
    '/vi/',
    '/vi/blog/',
    '/vi/blog/neovim-setup-1-zero-to-editor/',
    '/vi/blog/series/neovim-setup-guide/',
    '/vi/blog/topics/developer-tools/',
    '/vi/star/emr-cost-optimization/',
    '/vi/star/talend-databricks-migration/',
    '/vi/experiences/',
    '/vi/experiences/datum-security-bank-data-engineer/',
    '/vi/projects/',
    '/vi/skills/',
  ])('has Vietnamese content: %s', (path) => {
    expect(viPageHasContent(path)).toBe(true);
  });

  it.each([
    '/vi/blog/no-such-post/',
    '/vi/star/no-such-story/',
    '/vi/blog/series/no-such-series/',
    '/vi/blog/topics/no-such-topic/',
    '/vi/experiences/no-such-role/',
  ])('falls back to English: %s', (path) => {
    expect(viPageHasContent(path)).toBe(false);
  });
});

import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const SLUG = 'git-config-multiple-identities.mdx';
const FILES = ['en', 'vi'].map((l) => `src/content/blog/${l}/${SLUG}`);

const ALLOWED_EMAIL = /@(work\.)?example\.com$/;
// Documentation hosts only: exactly what the posts legitimately contain.
const ALLOWED_HOST = /^(([a-z0-9-]+\.)*example\.com|git-scm\.com)$/i;
// Generic folder names allowed under ~/code/ in examples.
const ALLOWED_FOLDER = /^(personal|work|team)$/i;
// Obviously generic hex placeholders that may appear.
const ALLOWED_HEX = /^(0+|f+|deadbeef)$/i;

const emailsOf = (t: string) => t.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) ?? [];
const urlsOf = (t: string) => t.match(/\bhttps?:\/\/[^\s"'<>)\]]+/g) ?? [];
const bareHostsOf = (t: string) =>
  t.match(/\b[a-z0-9-]+(\.[a-z0-9-]+)*\.(com|net|org|io|dev|vn|co|bank|app)\b/gi) ?? [];
const scpHostsOf = (t: string) => [...t.matchAll(/\b[\w.-]+@([a-z0-9.-]+):/gi)].map((m) => m[1]);
// Eight or more hex characters that include a letter (decimal numbers are not key ids).
const hexIdsOf = (t: string) =>
  (t.match(/\b[0-9a-f]{8,}\b/gi) ?? []).filter((h) => /[a-f]/i.test(h) && !ALLOWED_HEX.test(h));
const codeFoldersOf = (t: string) => [...t.matchAll(/~\/code\/([^\s/`"'\\]+)/gi)].map((m) => m[1]);

const badEmails = (t: string) => emailsOf(t).filter((e) => !ALLOWED_EMAIL.test(e));
const badUrls = (t: string) => urlsOf(t).filter((u) => !ALLOWED_HOST.test(new URL(u).hostname));
const badBare = (t: string) => bareHostsOf(t).filter((h) => !ALLOWED_HOST.test(h));
const badScp = (t: string) => scpHostsOf(t).filter((h) => !ALLOWED_HOST.test(h));
const badFolders = (t: string) => codeFoldersOf(t).filter((f) => !ALLOWED_FOLDER.test(f));

describe('guard rules bite on bad input', () => {
  it('flags an 8-character hex key id', () => {
    expect(hexIdsOf('signingkey = 3AA5C34F')).toEqual(['3AA5C34F']);
    expect(hexIdsOf('key 0123abcd and a 16-char 0123456789ABCDEF')).toHaveLength(2);
  });
  it('allows decimal numbers and generic hex placeholders', () => {
    expect(hexIdsOf('1760000000 and 00000000 and DEADBEEF')).toEqual([]);
  });
  it('flags an employer or client name as a ~/code parent folder', () => {
    expect(badFolders('gitdir:~/code/acmecorp/')).toEqual(['acmecorp']);
    expect(badFolders('mkdir ~/code/personal ~/code/team')).toEqual([]);
  });
  it('flags a github.com or other http(s) link', () => {
    expect(badUrls('see https://github.com/someone/repo')).toHaveLength(1);
    expect(badUrls('see https://git.acme.test/x')).toHaveLength(1);
    expect(badUrls('see https://git-scm.com/docs and https://www.example.com/a')).toEqual([]);
  });
  it('flags a bare non-allowlisted domain', () => {
    expect(badBare('visit github.com/someone')).toEqual(['github.com']);
  });
  it('flags an scp-style remote on a real host', () => {
    expect(badScp('url = git@github.com:someone/repo.git')).toEqual(['github.com']);
    expect(badScp('git@work.example.com:*/**')).toEqual([]);
  });
  it('flags a non-example email', () => {
    expect(badEmails('me@mail.invalid')).toEqual(['me@mail.invalid']);
  });
});

describe('git config post uses placeholders only', () => {
  it('has an English and a Vietnamese file with the same name', () => {
    for (const f of FILES) expect(existsSync(f), f).toBe(true);
  });

  for (const f of FILES) {
    describe(f, () => {
      const text = existsSync(f) ? readFileSync(f, 'utf8') : '';

      it('has only example.com email addresses', () => {
        expect(badEmails(text)).toEqual([]);
      });

      it('links only to example.com and git-scm.com', () => {
        expect(badUrls(text)).toEqual([]);
        expect(badBare(text)).toEqual([]);
      });

      it('uses only example.com hosts in scp-style git remotes', () => {
        expect(badScp(text)).toEqual([]);
      });

      it('has no absolute home paths', () => {
        expect(text).not.toMatch(/(?<![\w.-])\/(Users|home)\/[\w.-]/);
      });

      it('does not put ${HOME} in a gitdir pattern', () => {
        expect(text).not.toMatch(/gitdir\/?i?:[^"\s`]*\$\{?HOME/);
      });

      it('has no hex runs of 8 or more characters such as key ids or fingerprints', () => {
        expect(hexIdsOf(text)).toEqual([]);
      });

      it('uses only generic folder names under ~/code/', () => {
        expect(badFolders(text)).toEqual([]);
      });

      it('names only the work and personal folders in gitdir examples', () => {
        const dirs = text.match(/includeIf "gitdir\/?i?:[^"]*"/g) ?? [];
        for (const d of dirs) expect(d, d).toMatch(/\/(work|personal)\/"$/);
      });
    });
  }
});

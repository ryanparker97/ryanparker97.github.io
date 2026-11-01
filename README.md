# ryanparker97.github.io

[![CI](https://github.com/ryanparker97/ryanparker97.github.io/actions/workflows/ci.yml/badge.svg)](https://github.com/ryanparker97/ryanparker97.github.io/actions/workflows/ci.yml)

Personal portfolio of Ryan Parker, live at <https://ryanparker97.github.io>: Experiences (with a CV PDF built in CI), projects, STAR interview stories and a blog, in English and Vietnamese. Built with Astro and Tailwind CSS; every entry is a Markdown/MDX file. The full specification is in [`spec.md`](./spec.md).

## Develop

Requires Node 24 (22.23.4 at minimum) and pnpm.

```sh
pnpm install
pnpm dev          # http://localhost:4321 (search needs a build: pnpm build)
pnpm verify       # lint, format, types, unit tests, build, PDF checks, JS budget, e2e (the CI gates)
pnpm lhci autorun # Lighthouse budgets (set CHROME_PATH to a Chromium, e.g. Playwright's)
```

## Add content

Add one file per entry under `src/content/<collection>/{en,vi}/`. Files with the same name in `en/` and `vi/` are translations of each other; a missing `vi/` file falls back to English with a banner.

| Collection                 | Where it shows                                              |
| -------------------------- | ----------------------------------------------------------- |
| `profile`                  | Experiences header and summary, Home hero and highlights, footer     |
| `experience`               | Experiences timeline and PDF                                      |
| `projects`                 | `/projects/` and PDF (`inPdf`)                              |
| `skills`, `certifications` | Home and PDF                                                |
| `star`                     | `/star/` (exactly four H2: Situation, Task, Action, Result) |
| `blog`, `series`           | `/blog/`                                                    |

## Owner checklist

### One-time repo setup (spec section 11.9)

Run `scripts/setup-repo.sh` (needs `gh` signed in as the repo admin) or do these by hand:

- [ ] Pages: source = **GitHub Actions**
- [ ] Environment `github-pages`: deployment branches `main` only
- [ ] Actions, General: workflow permissions **read**, allowed actions policy, SHA pinning required
- [ ] Repository variable `PUBLIC_CF_BEACON_TOKEN` (Cloudflare Web Analytics token; leave unset for no analytics)
- [ ] Secret scanning, push protection, Dependabot alerts and security updates on; CodeQL default setup **off**
- [ ] Ruleset on `main` (required checks: `ci-ok`, `Analyze (javascript-typescript)`, `Analyze (actions)`)
- [ ] Merge settings: squash only, auto-delete branches, allow auto-merge
- [ ] README: CI badge (done) and link to the site (done)

### Before publishing the first post

- [ ] Commit and push the dotfiles changes the post describes (`nvim/lua/ryanparker/plugins/dev.lua`, `extras.lua`, the `pumborder` option, the undotree keymap, `debugpy`), then update the "Tested with" commit hash in both `neovim-setup-1-zero-to-editor.mdx` files.
- [ ] Fix the dotfiles `nvim/README.md` (spec appendix B.4): `pyright` should be `basedpyright`, add the missing `dev.lua` and `extras.lua` rows, mention a Nerd Font and the Xcode Command Line Tools.
- [ ] Run the post's commands on a fresh setup (`NVIM_APPNAME=nvim-ryan`) and fix anything that differs.

### Placeholders to fill (spec section 15)

- [ ] More STAR stories in `src/content/star/{en,vi}/`. The sample stories are gone and one real story exists (`emr-cost-optimization`); add others as needed (`sample: true` still marks an illustrative one).
- [ ] Optional X and Bluesky URLs in `profile/*/index.md`.
- [ ] Certification badge images (`badge:`) and credential URLs (`credentialUrl:`).
- [ ] Review the Vietnamese translations, and the skill descriptions (written from the CV; spec section 14, item 18).
- [ ] Final titles for Parts 2 to 5 of the Neovim series.
- [ ] Confirm "5+ years of experience" (the roles start in 2019).

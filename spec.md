# Personal Portfolio — Specification

| | |
|---|---|
| **Status** | Draft v6.0 (one consolidated Apple design system, §5; page specs §4; history in Appendix C) |
| **Last updated** | 2026-11-12 |
| **Hosting** | GitHub Pages — `https://ryanparker97.github.io` |
| **Stack** | Astro + Tailwind CSS, all content in Markdown/MDX |

---

## 1. Overview

A personal portfolio site with three main parts:

1. **Experiences**: work experience (the web page of the CV), with a CV PDF version built automatically. The PDF also includes the summary, selected projects, technical skills, spoken languages and certifications. On the website, projects have their own **Projects** page in the main navigation, while skills and languages are on the **Skills** page (§4.8) and certifications are cards on the Experiences page (§4.2). The content is migrated from the existing LaTeX CV (see Appendix A).
2. **In practice**: real-work stories told in the behavioural interview format (Situation → Task → Action → Result), each tied to the role/company where it happened, shown newest first on a Newsroom-style desk.
3. **Blog**: long-form posts with tags, RSS, a table of contents and code highlighting.

The look follows **apple.com** closely (§5): white pages with Apple's light grey bands, the SF system font, big 600-weight headlines, Apple blue pills and links, the frosted global nav and product-page local nav, the Apple global footer, and calm scroll motion. A soft mint is kept only as a tiny accent for tech highlights. The site is light by default, with an optional dark theme.

### 1.1 Goals

- Recruiters and hiring managers can skim the CV and key results in under 30 seconds, and download a PDF CV.
- The owner can use the In practice section as a personal interview prep bank, newest first.
- Adding a role, project, story or post means adding one Markdown file. No code changes needed.
- Fast, accessible and readable in English and Vietnamese.

### 1.2 Non-goals (v1)

- Blog comments.
- A contact form or any backend. GitHub Pages is static only.
- A CMS UI.
- Auto-generated Open Graph images (v1 uses one static default image).
- Hidden or private stories. **Every In practice story is public**, and the author anonymises names and confidential details before committing.

### 1.3 Audience

| Audience | Needs |
|---|---|
| Recruiters / hiring managers | Fast scan of experience, measurable results, PDF download, contact links |
| The owner (interview prep) | In practice stories, newest first, search by keyword |
| Peers / readers | Blog posts, RSS, good reading experience |

---

## 2. Decisions summary

| Area | Decision |
|---|---|
| Framework | Astro (latest stable), static output |
| Styling | Tailwind CSS with CSS custom-property design tokens |
| Site structure | Multi-page: Home, Experiences, Projects, In practice, Blog (+ tag and series pages, search, 404) |
| Theme | **Light (white) by default** whatever the OS setting; dark only when picked in the toggle (Light → Dark → System) (§5.12) |
| Palette | Apple's: white `#FFFFFF`, grey `#F5F5F7` bands, text `#1D1D1F` / `#6E6E73`, blue `#0053A6` pills / `#00509F` links (Apple's #0071E3 / #0066CC darkened to reach 7:1); mint only for tech highlights, tech chips and the "Current" chip (§5.3); four highlight colours `--hl-1…4` (green, orange, purple, pink) for the In practice desk cards' stats only (§5.3) |
| Apple-style elements | Apple's breakpoints (734 / 1068, chrome at 833) and type scale; 44px global nav with a search flyout and full-screen mobile menu; 52px product-style local nav on every inner page (chevron dropdown on phones); a Home wall of twelve real page screenshots tilted in 3D, over the identity row with the owner's cut-out photo (§4.1); 28px-radius cards; Apple global footer with breadcrumbs and directory; four scroll effects (§5) |
| Fonts | System SF stack everywhere (incl. blog bodies), self-hosted Inter as an un-preloaded fallback, no Newsreader (§5.4) |
| Home layout | **The Wall** (§4.1): one nav row (the global nav; Home has no local nav), then a full-width wall of twelve real screenshots of the site's own pages (12 pages × EN/VI × light/dark, committed PNGs made by `scripts/capture-wall.ts`, served as WebP), tilted in 3D with one static CSS transform and faded into the page; under it the identity row: the owner cut out of the grey studio backdrop (`photo-cutout.png`) directly on the page (no fill, owner, avatar-title), in a frame 288 / 216 / 160px wide that is as tall as the intro beside it from M (160 × 238.4px at S), the name as the H1 in ink (no gradient, no greeting), the role line directly under it, the first-person sentence, four "›" links (See every role, See the project, All stories, All posts), Download CV and Email me; then "Next." (both goals) and "Let's talk." as the page's one grey closing band. The wall is decorative for screen readers (`aria-hidden`, empty alts) and clickable by mouse (tiles are `tabindex="-1"` links). Captures may show story titles and the location; Home's own text names no story, location, language or years figure. The tilt is static and kept under reduced motion. No client script |
| Experiences page sections | A Layout B **hero** ("Built for banking data."), local nav of roles (each links to its role page, §4.2.3) with a Download CV pill, a grey band of Leadership-style **cards** ("Experience." one per role, "Certifications." one per certification, "Education." one per school: name and school logo only, no degree, dates or major; then the fixed web-only "Next." group of two goal cards), and a grey **contact box**. **No summary on the web page** (it stays in the PDF). Home has no career row (its identity row links to the roles, §4.1.1); the role chapters live on the role pages |
| Projects page | `/projects/` in the main nav (after Experiences). an Apple lineup of **all** projects (personal, work, open source), one feature tile each, with a kind filter in the local nav; each tile links to its product page (§4.6.1) |
| Experiences route | The web CV page is named **Experiences** and lives at `/experiences/` (VI: *Kinh nghiệm*, `/vi/experiences/`). The old `/cv/` and `/vi/cv/` stay as redirects (Astro `redirects`, meta refresh on static hosting), out of the sitemap, search index and Lighthouse URLs. The PDF stays a CV: `/cv.pdf`, `/vi/cv.pdf`, `Ryan-Parker-CV.pdf` |
| CV PDF | Built automatically in CI with Playwright, **US Letter**. Contains the Experiences page content **plus** the summary, selected projects, the technical skills table (with spoken languages), certifications and education, as in `cv.tex`. The Markdown content replaces `cv.tex` as the single source of truth |
| CV contact details | Email, phone, LinkedIn and GitHub: in the PDF and the footer's Connect column |
| In practice order | Newest first by `date`: the newest story is the lead card, the next two are tiles, the rest a "More from" list (§4.4); a role's link (`/star/#<role-slug>`) lands on that role's newest story, also from the Experiences chapters |
| In practice display | Index: a Newsroom desk (lead card, tiles, "More from" list), no filter. Story page: an article (header, diagram, Situation · Task · Action · Result as prose, metrics) with numbered footnotes for metrics that carry a note |
| Blog | Tags + tag pages, RSS, reading time, sticky TOC, Shiki syntax highlighting, **series** (series box, prev/next part, series index page), callouts, code block titles, inline SVG diagrams |
| First post | **Neovim setup guide, Part 1: from zero to a working editor**, EN + VI at launch (Appendix B) |
| Comments | None |
| Contact | Social links + `mailto:` + `tel:` |
| Search | Pagefind (static full-text search) |
| Analytics | Cloudflare Web Analytics (cookie-free) |
| i18n | English (default, `/`) + Vietnamese (`/vi/`) |
| Authoring | Every entry is a Markdown/MDX file with typed frontmatter (Astro content collections) |
| Story privacy | All stories public |
| URL | User site at `ryanparker97.github.io` (repo `ryanparker97/ryanparker97.github.io`) |
| CI/CD | GitHub Actions: PR-only protected `main`, all test layers required, CodeQL, Dependabot, SHA-pinned actions, deploy on every merge (§11) |

---

## 3. Information architecture

### 3.1 Sitemap

```
/                         Home (the Wall: tilted page screenshots, identity row, Next., Let's talk., §4.1)
/experiences/             Experiences (Leadership-style role and certification cards, contact box; /cv/ redirects here)
/projects/                Projects (all kinds, filter chips, cards expand in place)
/skills/                  Skills (Tech Specs rows: skill groups, certifications, languages)
/experiences/<slug>/     One role (hero + highlight cards, Layout D)
/experiences/print/       Print-only CV layout used to make the PDF (noindex)
/cv.pdf                   Generated PDF (English)
/star/                    In practice: the desk (lead, tiles, "More from"), newest first
/projects/<slug>/         One project as a product page (Layout B)
/star/<slug>/             Single story (an article; deep-linkable, shareable)
/blog/                    Blog index (newest first)
/blog/<slug>/             Blog post
/blog/tags/               All tags with post counts
/blog/tags/<tag>/         Posts for one tag
/blog/series/             All series
/blog/series/<slug>/      One series: every part, published or coming soon
/rss.xml                  RSS feed (English)
/404.html                 Not found

/vi/...                   Vietnamese mirror of every route above
/vi/cv.pdf                Generated PDF (Vietnamese)
/vi/rss.xml               RSS feed (Vietnamese)
```

### 3.2 Global navigation

- **Global nav** (§5.7): round photo (links home) · Experiences · Projects · In practice · Blog · Search (⌘K) · theme · language (EN / VI). At compact chrome (≤ 833px) the links move into a full-screen menu; search stays in the bar.
- **Local nav** (§5.8): every inner page has one, with its own section links (§4.0); Home and 404 do not.
- **Footer** (§5.9): breadcrumbs, a four-column directory (Explore · Writing · Connect · Resources, including RSS and optional X/Bluesky) and the legal row.

---

## 4. Page specifications

Every page is built from the shared design system in §5: the global nav (§5.7), an optional local nav (§5.8), a hero (§5.10.1), full-width sections and tile grids (§5.10), and the footer (§5.9). This section only says **what goes on each page**. Sizes, colours, spacing and motion come from §5 and are not repeated here. Breakpoint names **S / M / L** are defined in §5.2.

### 4.0 Page overview

| Page | Local nav (§5.8) | Hero (§5.10.1) | Content | Closing |
|---|---|---|---|---|
| Home `/` | none (one nav row: the global nav) | `#top` wall (§4.1.2): twelve tilted page captures fading into the page, then the identity row: the photo cut out on the page (no fill), the name as the ink H1 (no eyebrow), the two-line role line directly under it, the first-person sentence, four "›" links, Download CV · Email me | `#next` (white): both career goals (§4.1.4) | "Let's talk." (`#more`, the one grey closing band) |
| Experiences `/experiences/` | "Experiences" + one link per role (to its page) · **Download CV** pill | Role eyebrow · "Built for banking data." · positioning · Email me · Download CV | "Experience.", "Certifications.", "Education." and the fixed two-card "Next." group (§4.2; web only) | Contact box |
| Role `/experiences/<slug>/` | "Experiences" + one link per role (the open one current) · **Download CV** pill | Company logo, company eyebrow, role H1, dates · location | The §4.2.1 chapter with H2 "Highlights." (§4.2.3) | — |
| Projects `/projects/` | All · Personal · Work · Open source · **Download CV** pill | "Things I've built." | Lineup of feature tiles (§4.6) | — |
| Skills `/skills/` | Certifications · Languages · **Download CV** pill | "The tools I build with." | Tech Specs rows (§4.8) | — |
| Project `/projects/<slug>/` | Project title · "All projects ›" | Eyebrow "Project", title, subtitle | Laptop frame, big stats, problem → approach → design → workflow → result (§4.6.1) | "More from the work." |
| In practice `/star/` | One link per role (to its newest story) | "Real work. Real results." | The Newsroom desk: lead, tiles, "More from" (§4.4) | — |
| Story `/star/<slug>/` | Role name · "All stories ›" | Story title + question (article header) | Diagram, S · T · A · R sections, metrics | "More from In practice" · "All stories ›" · "Read the role ›" · footnotes |
| Blog index `/blog/` | All posts · Topics · Series · **RSS** pill | "Notes on data and tools." | One grey band of white post cards: "Latest." and "More posts." (§4.5) | — |
| Blog topic, tag, series pages | All posts · Topics · Series · **RSS** pill | "Notes on data and tools." | Topic-grouped hairline list (§4.5) | — |
| Blog post `/blog/<slug>/` | Series name (or "Blog") · "All posts ›" | Newsroom-style header | Reading column (§4.5) | Grey band: "More in this series." / "More to read." (§4.5) |
| 404 | — | "Page not found." + Go home · Search | — | — |

Every page except Home and 404 has a local nav; it sits **directly under the global nav, above the hero**, as on Apple product pages, and stays stuck while the page scrolls. Home has one nav row only: the global nav, which sticks by itself. Every page has exactly **one H1**. Each section or tile has an H2, and items inside a section use H3. No heading levels are skipped.

### 4.1 Home (`/`)

Home is **the Wall**. Under the one global nav row sits a full-width wall of **twelve real screenshots of this site's own pages**, tilted in 3D with one static CSS transform and faded into the page. Below the wall is the identity row: the owner cut out of the grey studio backdrop, directly on the page (no fill, owner, avatar-title), in a frame 288 / 216 / 160px wide (as tall as the intro beside it from M; 160 × 238.4px at S), the name as the H1 in ink, the role line directly under it (title 32 / 28 / 24px in the name's text colour, owner, title-black, was the accent; size owner, title-below-name), the first-person sentence, four "›" links (**See every role**, **See the project**, **All stories**, **All posts**), and **Download CV** and **Email me** (at L the pills sit under the text; the frame's top is the name's top and its bottom the pills' bottom, and at M its top and bottom are the text block's). Then **Next.** (the two career goals) and **Let's talk.** as the page's one grey closing band. A hiring manager reads the name, the role and the way to reach me first, with proof of real work behind it; an engineer sees the real pages (diagrams, code, a story, the skills) before reading a word. The page adds no script.

`main` holds exactly three children, in this order, at every width: `section#top.wall`, `section#next` and `section#more` (`src/pages/[...lang]/index.astro:39-49`; `HomeWall.astro:64`, `HomeNext.astro:22`, `LetsTalk.astro:19`). Reveal is the shared one, off under `prefers-reduced-motion: reduce` (§5.11).

#### 4.1.0 Principles

- **One nav row.** `index.astro:38` passes no `localNav`, `src/lib/localnav.ts` defines no Home nav (its header covers the inner pages, `localnav.ts:1`; `localnav.test.ts` asserts `homeNav` stays gone), and `BaseLayout` renders a local nav only when one is passed (`BaseLayout.astro:31,53,136`). The global nav therefore sticks by itself (`src/components/nav/GlassNav.astro:78`; it scrolls away only under `html:has([data-local-nav])`, `GlassNav.astro:86-87`), and `--sticky-h` is `--nav-h`: 44px, 48px at compact chrome (`src/styles/tokens.css:76,79,108`; the local-nav override is `tokens.css:88-90`). The wall starts directly under it (`home.spec.ts:546-627`).
- **The name is the H1, in ink.** `h1#top-title.w-name` holds the profile `name` (`HomeWall.astro:109-111`), in `--text` at weight 600 (`:259-266`). There is no gradient, no greeting and no eyebrow in `#top`; the role line `p.w-role` sits directly below the H1, with nothing between them (`:112-115`; owner, title-below-name). No page uses `.text-gradient` now (§5.10.8).
- **The photo is in the page.** The owner, cut out of the grey studio backdrop (`photo-cutout.png`), sits in the identity row directly on the page with no fill behind it (owner, avatar-title: "remove the background"), in a frame as tall as the intro beside it from M (§4.1.3). It reverses the older "photo in the nav only" rule; the nav photo stays (§5.7).
- **Captured pages may name stories.** A story title or a location that is legible *inside* a capture is allowed: it is a picture of the site, not Home's own text (owner decision; the location case is the lead's ruling, covered by the owner's approval of the mock). The no-location, no-story and no-years rules below apply to Home's own text (`home.spec.ts:1580-1627,2220-2241`).
- **Not a CV.** `main`'s text holds no location, no spoken language, no "5+ years" figure and no story title; it has no stat strip, number tile, footnote, role row or logo wall. The spoken languages stay on `/skills/`, the location on the role pages and the years figure only in the CV PDF summary (owner decision). `main [data-facts]` exists only in `#more`, with one `li[data-real-name]` (`home.spec.ts:2220-2241`).
- **Links render only with their content.** See the links table in §4.1.1: the project, stories and posts links are left out when there is no featured project, no story or no post (`HomeWall.astro:54-61`, `index.astro:28-32,45-46`). `#next` and `#more` always render.
- **Strings.** Every string is an existing i18n key or a content field, the same blocks and links in EN and VI, with no fallback banner unless a shown piece is untranslated (`index.astro:33-34`). No key was added. Nine keys were removed from `en.json` and `vi.json` because only the home-alt-5 layout read them: `home.experience.eyebrow`, `home.certs.cta`, `common.learnAbout`, `common.learnMore`, `exp.hl.team`, `exp.hl.teamCap`, `exp.hl.agents`, `exp.hl.teamAlt` and `exp.hl.skillsAlt` (none is left in `src/i18n`; `exp.hl.agentsAlt` stays). `stripBold` is deleted from `src/lib/home.ts` (`boldHtml` stays; `HomeWall.astro:20,116`).
- **Anchors.** `#next-title` and `#more-title` each set `scroll-margin-top: var(--eyebrow-room)` (56px, `tokens.css:69`; `HomeNext.astro:66-68`, `LetsTalk.astro:52-54`), on top of the one rule `html { scroll-padding-top: calc(var(--sticky-h) + 16px) }` (`src/styles/global.css:39`; §5.10.6). `/#next` lands with the bar at 44px, the global nav only (`tests/e2e/anchor-offset.spec.ts:10`).
- **Scripts: none.** No Home file has a `<script>` (`HomeWall`, `HomeNext`, `LetsTalk`, `index.astro`); the page loads only the shared scripts. The wall is pure markup, CSS and images.
- **Tokens only.** No hex colour, no shadow, rem font sizes, no `font-family`; Home uses no `--warm` (the photo frame has no fill, §4.1.3), and `--mark-plate` is the one plate colour shared with every mark (§5.3). The one `transform` in Home is the static tilt (§4.1.2).
- **Type and colour are scoped.** Each component carries its own scoped copy of the rows it uses (§4.1.5); no global class is added.

#### 4.1.1 Page structure

| # | `id` | Element | Renders | H1 / H2 / H3 | Content |
|---|---|---|---|---|---|
| 1 | `top` | `section#top.wall`, `aria-labelledby="top-title"` (`HomeWall.astro:64`) | always | **H1** `top-title` = the profile `name` | `div.w-clip[aria-hidden="true"]` (the wall, §4.1.2), then `div.w-id.container-wide` (the identity row, §4.1.3) |
| 2 | `next` | `section#next.container-wide.next` (`HomeNext.astro:22`) | always | H2 `exp.next.title` (*Next.* / *Tiếp theo.*); H3 per goal | both goals from `NEXT_STEPS` (§4.1.4) |
| 3 | `more` | `section#more.section.section--surface.home-talk` (`LetsTalk.astro:19`), the last child of `main` | always | H2 `home.contact.title` (*Let's talk.* / *Cùng trò chuyện nhé.*) | `home.contact.text`, **Email me** · **LinkedIn**, the legal-name line (§4.1.4) |

Inside `#top.w-id`, in DOM order: the photo `span.pop`, then `div.w-text` (`h1.w-name`, `p.w-role.intro` directly under it, `p.w-say.intro`, `p.w-links.intro`), then `div.actions.home-acts.intro` (`HomeWall.astro:96-131`). Only the H1, then one H2 per later block and H3 only on the two goals: nothing deeper (`home.spec.ts:1521-1549`).

**The four "›" links** (`HomeWall.astro:54-61`; each is a `ChevronLink`, whose visible text is its accessible name, with no `aria-label`):

| # | Visible text (EN / VI) | Key | Href (VI under `/vi`) | Renders |
|---|---|---|---|---|
| 1 | See every role / Xem mọi vai trò | `home.experience.cta` | `/experiences/` | always |
| 2 | See the project / Xem dự án | `projects.view` | `/projects/<slug>/` of the first featured project (`index.astro:28-32`) | with a featured project |
| 3 | All stories / Tất cả câu chuyện | `star.all` | `/star/` | with at least one story (`index.astro:25`) |
| 4 | All posts / Tất cả bài viết | `home.posts.all` | `/blog/` | with at least one post (`index.astro:26`) |

**The pills** (`HomeWall.astro:123-130`): **Download CV** (`common.download`, `/cv.pdf`, `download="Ryan-Parker-CV.pdf"`, `btn-primary`) then **Email me** (`home.contact.email`, `mailto:` the profile email, `btn-secondary`).

**Every destination** outside the wall: `/cv.pdf`, `mailto:` the profile email, `/experiences/`, `/projects/<slug>/` (the row's link and goal 2's evidence link), `/star/`, `/blog/`, goal 1's href, the LinkedIn URL; `/vi/` on the internal ones in VI. The wall's tiles add exactly the twelve captured pages (`home.spec.ts:1629-1669`). `/experiences/#next` is not linked from Home. Skills is not linked in Home's `main` (owner decision, Q4: links as mocked): it is reached from the footer's directory and from one wall tile, a pointer link (`tests/e2e/skills.spec.ts:393-410`).

#### 4.1.2 The wall (`.w-clip`)

**What it shows.** Twelve captures, in this order, in a grid of 4 columns × 3 rows at 735px and up and 3 × 4 below (`src/lib/wall.ts:21-47`). Every capture is a 1280 × 800 window (`WALL_SIZE`, `wall.ts:49`) of the built page; "anchor" means the window is scrolled so the top of the `nth` match of `selector` sits `offset` px below the window top, and "top" means no scroll.

| # | `id` | Path (VI under `/vi`) | Anchor | Shows |
|---|---|---|---|---|
| 1 | `nvim-diagram` | `/blog/neovim-setup-1-zero-to-editor/` | `figure.diagram`, −190 | the Neovim startup diagram |
| 2 | `role-top` | `/experiences/fpt-software-senior-data-engineer/` | top | the current role page header |
| 3 | `story` | `/star/talend-databricks-migration/` | top | a story page |
| 4 | `blog` | `/blog/` | `main .section--tight`, −96 | the blog index |
| 5 | `project-workflow` | `/projects/agentic-coding-workflow/` | `section:has(figure.diagram) + * h2`, −150 | the workflow section |
| 6 | `project-diagram` | `/projects/agentic-coding-workflow/` | `figure.diagram`, −84 | the lifecycle diagram |
| 7 | `star-desk` | `/star/` | `#stories`, −76 | In practice, both story cards |
| 8 | `post-code` | `/blog/git-config-multiple-identities/` | `.code-block` nth 1, −300 | a post with a Git config file |
| 9 | `skills` | `/skills/` | `#data-engineering`, −150 | Skills |
| 10 | `role` | `/experiences/fpt-software-senior-data-engineer/` | `section.chapter`, −96 | the role's Highlights |
| 11 | `project-top` | `/projects/agentic-coding-workflow/` | top | the project page top |
| 12 | `story-emr` | `/star/emr-cost-optimization/` | top | the second story page |

Home is never captured, so the captures never depend on the page that shows them. Each path must exist in both languages (`tests/unit/wall.test.ts:84`).

**Capture flow.** The pictures are **committed PNGs**: 12 pages × EN/VI × light/dark = 48 files named `src/assets/wall/<id>-<lang>-<theme>.png` (`wall.ts:51`, `scripts/capture-wall.ts:37`). `pnpm build` never runs the capture script. To make or refresh them, run by hand:

```sh
pnpm build && pnpm exec tsx scripts/capture-wall.ts [id …] && pnpm build
```

`capture-wall.ts` (usage in its header, `:3`) fails if `dist/index.html` is missing (`:128-129`), serves `dist/` on a random port with `serve('dist', 0)` and closes the server and the browser in `finally` (`:135-158`), and writes only `src/assets/wall/`. With ids, it rewrites only those shots' four files (`:125-130`); an unknown id fails (`:126-127`). For each language × theme × shot it opens a fresh 1280 × 800 context at device scale factor 2 with reduced motion (`:80-85`), sets the theme through the `theme` key in `localStorage` (`:96`), loads the page, fails unless the response is OK and `<html lang>` and `data-theme` are the wanted ones (`:98-105`), waits for fonts, the anchor scroll, `networkidle` and the decoded images in the window (`:106-108`, `:55-75`), aborts every request outside the local server and fails that file if any was made (`:86-94,109`), screenshots, downsizes to 1280 × 800 with `sharp`, flattens onto white and keeps only the image chunks (`imageChunksOnly`, `scripts/lib/png.ts:1-11`; `:110-116`). It prints `ok` or `FAIL` per file and exits 1 on any failure (`:143-153,159`). Rerun it when a pictured page changes; staleness is not detected automatically. The second build picks the new files up.

**Guards.** `tests/unit/wall.test.ts` fails when a capture is missing, extra, the wrong size or format, or carries metadata: exactly the 48 names (`:101`); each file is a 1280 × 800 RGB PNG with image chunks only, at most 250 KB, and at most 7 MB in all (`:106-117`; the 48 files measure about 6.2 MB); no two files are the same picture (`:119`); each `-dark` file's top-left pixel is darker than its `-light` twin's (`:128`). `HomeWall` throws at build time on a missing capture (`HomeWall.astro:46`). `brand-images.test.ts` allows the `src/assets/wall/` folder as the one exception to its 600px image limit, pinned to 1280 × 800 by `wall.test.ts` (`brand-images.test.ts:20-21,300-301,321`), and bans metadata calls in both scripts (`:328-339`).

**Served images.** Every capture is two `<Image>` elements in its tile, one light and one dark, both `format="webp"`, `quality={75}`, `widths={[320, 480, 512, 640, 960]}` and `sizes="(max-width: 734px) 292px, (max-width: 1068px) 363px, 474px"`, with `decoding="async"`, an empty `alt` and Astro's `width` and `height` (`HomeWall.astro:50-52,69-91`). The sizes are the tile widths: (1960 − 3 × 22) / 4 at L, (1500 − 3 × 16) / 4 at M and (900 − 2 × 12) / 3 at S. 512w is the step a 292px slot at 1.75× (Lighthouse's mobile run) picks. The build writes six WebP files per capture (five widths plus the 1280 `src` fallback): 48 × 6 = **288 files** in `dist/_astro`.

| Variant | `loading` | `fetchpriority` | Why |
|---|---|---|---|
| light, tiles 1–6 | `eager` (`HomeWall.astro:76`) | `high` on tiles 2 and 5 only (`:77`) | tiles 1–6 are the two rows inside the 300px clip at S, and 2 and 5 are the likely LCP candidates (`HomeWall.astro:13`) |
| light, tiles 7–12 | `lazy` | none | outside the clip at S |
| every dark | `lazy` (`:88`) | none | a `display: none` lazy image is never fetched, so a light visit loads no dark file |

**Theme swap.** One variant is displayed: `.w-shot--dark { display: none }` by default, and under `@media screen` the dark rule shows the dark picture and hides the light one for `:root[data-theme='dark']`, and for `:root[data-pref='system']` inside `@media (prefers-color-scheme: dark)` (`HomeWall.astro:170-187`; the pattern of `CompanyLogo.astro:18-75`). `data-theme` is set before first paint from the stored preference, with light the default (`BaseLayout.astro:111-123`; §5.12). With the system preference, the OS scheme decides (`home.spec.ts:1859-1881`). Known cost: a dark visit also fetches the six eager light tiles it never shows (measured at 1440: 20 image requests in dark against 14 in light).

**Alt-text rule (owner decision: a decorative wall, clickable by mouse).** `div.w-clip` is `aria-hidden="true"` and every wall `<img>` has `alt=""` (`HomeWall.astro:65,71,83`). Each tile is `<a class="w-tile" href tabindex="-1">` (`:68`): a click target for pointer users, out of the Tab order and the accessibility tree. The wall pictures the site's index; its destinations are named and keyboard-reachable through the row's links, the nav and the footer. The H1 is the first thing a screen reader meets in `#top`, and Tab goes from the nav straight to **See every role** (`home.spec.ts:1699-1751`). Its links are `tabindex="-1"`, so `aria-hidden` hides no focusable content, and axe finds no violation in `#top` (`home.spec.ts:2326-2339`). No string is added for it.

**Tilt and fade.** `.w-clip` is full-bleed, `position: relative` (the containing block of the absolute wall), `overflow: clip`, with no background and a mask `linear-gradient(180deg, black 48%, transparent 90%)` plus its `-webkit-` form (`HomeWall.astro:135-141`). `.w-wall` is absolute at `left: 50%` with one static transform, `perspective(2400px) rotateX(28deg) rotateZ(-8deg)`, `transform-origin: 50% 40%` (`:143-154`): the only `transform` in the file. The wall never moves: no transition, no animation, with or without `prefers-reduced-motion` (`home.spec.ts:1323-1356`).

| | S ≤ 734 | M 735–1068 | L ≥ 1069 | Source |
|---|---|---|---|---|
| `.w-clip` height | 300px | 400px | 560px | `HomeWall.astro:138,315,366` |
| `.w-wall` columns | 3 | 4 | 4 | `:149,319` |
| width · `margin-left` | 900 · −450px | 1500 · −750px | 1960 · −980px | `:151-152,321-322,371-372` |
| `top` | −70px | −120px | −150px | `:147,318,369` |
| gap | 12px | 16px | 22px | `:150,320,370` |
| `.w-tile` radius | 9px | 14px | 14px | `:159,325` |

`.w-tile` is `display: block`, `overflow: hidden`, `background: var(--surface-2)`, with `outline: 1px solid var(--keyline)` and `outline-offset: -1px` (`:156-163`); `.w-shot` is `display: block`, 100% wide. The wall is clipped decoration that extends past `#top` on purpose: geometry checks skip `.w-clip` descendants and assert the clip instead (`home.spec.ts:2528-2545`; the clip itself at `:1204-1220`). `@media print { .w-clip { display: none } }` (`:411-415`).

**Byte caps.** "Wall bytes" is the summed body length of the `/_astro/*.webp` responses after every displayed wall image has loaded and the network is idle. The e2e caps were set as the measured values, taken as the larger of EN and VI, times 1.25, rounded up to 10 KB (`home.spec.ts:57-60`; the cap test is `home.spec.ts:1889-1924`; Chromium only; 1 KB = 1024 bytes). The table's measured column is the v6.22 reading with the cut-out photo in every load: the photo's 320w WebP is 13.8 KB, and each row is about 6 KB above the previous reading, which had the whole-photo JPEG. It was taken on the built `dist/` with the cap test's own method (the awaited `/_astro/*.webp` bodies after load and network idle; a one-off script, not committed). The caps are unchanged: the 1.25 rule on these values would give 160 KB for 1440 light (120.2 × 1.25) and 230 KB for 1440 dark (177.3 × 1.25), so the 150 and 220 KB caps are now tighter than the rule. Both still hold, with 29.8 and 42.7 KB to spare.

| Load | Measured EN / VI | Cap |
|---|---|---|
| 1440 × 900, DPR 1, light | 115.1 / 120.2 KB | **150 KB** |
| 390 × 844, DPR 2, light (the six eager tiles) | 120.3 / 126.0 KB | **170 KB** (never above 300 KB) |
| 1440 × 900, DPR 1, dark | 169.3 / 177.3 KB | **220 KB** |
| 390 × 844, DPR 2, dark | 202.4 / 212.8 KB | none (reported only) |

Lighthouse (mobile) on `/` and `/vi/`: performance 1.0 and LCP at most 1.81 s in all six runs (`lighthouserc.json`, 3 runs per URL). The quality knob (75 → 60) was not needed.

**Location in a capture.** The `role-top` capture shows the role page header, which includes the location. That is covered by the owner's approval of the mock and is not Home's text (§4.1.0).

#### 4.1.3 The identity row and the photo

`div.w-id.container-wide` is `position: relative` so it paints over the wall's fade. `.container-wide` keeps the 1260 box but pads its inside by `--wide-inset` (`global.css:366-372`; `tokens.css:55-56`), so the row's content box is the 980px column the nav and the footer sit on (x 230 to 1210 at 1440, 166 to 858 at 1024, §5.2); owner: keep both columns, align edges. The row is a grid at every width (`HomeWall.astro:191-199,327-332,379-382`):

| | S ≤ 734 | M 735–1068 | L ≥ 1069 |
|---|---|---|---|
| Layout | grid, one column, gap 16px | grid `auto minmax(0, 1fr)`, gap 28px; the photo is `align-self: stretch` in row 1 beside `.w-text`, so its top is the text's top and its bottom the links' bottom (owner, photo-align-cutout; was centred); the pills span the row under both | the M grid with gap 16px 36px and rows `auto` (was `1fr auto`): the photo is column 1, spans rows 1–2 and is `align-self: stretch`, so its top is the name's top and its bottom the pills' bottom; `.w-text` is row 1 of column 2 with `align-self: start`; the pills are row 2 of column 2 (`grid-area: 2 / 2`), so `.w-text` ends on the column's right edge (owner, photo-tall; owner, photo-align-cutout: "align my photo equal with intro") |
| `margin-top` · `padding-bottom` (`HomeWall.astro:197,330,381`; owner, title-below-name: was −153 / −102 / −155px. The block grows by 10 / 11 / 15px (the title's larger line box; the name's 6px top margin moves to the role line and nets out), and the margin grows by the same amount) | −163px · 48px | −113px · 80px | −170px · 80px |
| Pills | under the text | span the row (`grid-column: 1 / -1`), a row | a row under the text, starting on the text's left edge (the base flex row, gap 12px 14px; it wraps only when the two pills do not fit the 656px track) |
| Photo frame (`--pop` wide; the intro's height from M, the photo's 600:894 ratio at S) | 160 × 238.4px, radius 12px | 216 × 436.9px (the text block at 1024; owner, title-below-name: was 425.9; owner, avatar-title: was 404.9, the role line has a second line), radius 18px | 288 × 456.5px (the name's top to the pills' bottom at 1440; owner, title-below-name: was 441.5; owner, avatar-title: was 420.5), radius 18px, `grid-row: 1 / 3` |
| Four links `.w-links` | 2 × 2 grid | 2 × 2 grid | 2 × 2 grid |

Items are centred vertically (`align-items: center`, `HomeWall.astro:196`) except that from M the photo stretches to the row's height (`align-self: stretch`, `:335` at M and `:392` at L), so its frame has no height of its own and takes the top and bottom of the intro beside it, whatever its length (owner, photo-align-cutout: "align my photo equal with intro"). At L `.w-text` is `align-self: start` (`:384`), so the text stays at the top of row 1 while the frame runs to the pills' bottom. The text column's right edge is the column's right edge at every width: `.w-text` and `.next-path` both end on it (owner, request 2; the A6 rule, pinned in `alignment.spec.ts:479-599`, and for Home `:657-757`). Sources: `HomeWall.astro:191-199,327-337,379-393`.

**The photo** (`span.pop > img`, `HomeWall.astro:97-107,213-231`) is the owner cut out of the grey studio backdrop: `src/assets/profile/photo-cutout.png` (600 × 894 RGBA, alpha 0 on the backdrop and 255 on the person, served as WebP with its alpha; see *How the photo is made* below). Nothing is drawn: the colour is the photo's own and only the alpha is new (owner, photo-align-cutout: "remove the background"). The frame has no fill (owner, avatar-title; was the warm panel): `.pop` is `--pop` wide (`--pop: var(--home-photo)`, `:214`), `aspect-ratio: 600 / 894` at S, and no `background` (it was `var(--warm)`; `background-color` computes transparent in light and dark). Its img is `position: absolute; inset: 0`, `width` and `height` 100%, `object-fit: contain` and `object-position: 50% 100%` (`:223-231`), so the picture is drawn at its natural ratio, sits on the frame's bottom edge and is never cropped. From M the frame has no height of its own (`aspect-ratio: auto` at `:334`, `align-self: stretch` at `:335` and `:392`), so its top and bottom are the intro's whatever its length; the absolute img never sizes the row and nothing shifts on load. The drawn picture is 288 × 429.1px at 1440 (width-limited; the frame is 456.5px tall, so 27.4px of empty frame sits above the picture; owner, title-below-name: was 441.5px tall; owner, avatar-title, was 282.2 × 420.5 drawn), 216 × 321.8px at 1024 (the frame is 436.9px tall, so about 115px of empty frame sits above the picture, and the head starts about level with the areas line, not at the frame's top; owner, title-below-name: was 425.9px tall) and 160 × 238.4px at S. There is no `height`, no `--pop-h`, no `--pop-img`, no `object-fit: cover` and no crop at any width. `.pop` keeps `overflow: hidden` and `border-radius: var(--radius-sm)` (12px) at S and `var(--radius-md)` (18px) from 735px (`:220-221,336`). The identity row's `margin-top` is −163px at S, −113px from M and −170px at L (`:197,330,381`; owner, title-below-name: was −153 / −102 / −155px; avatar-title: was −135 / −81 / −134px), which lets the row grow up into the wall's fade without moving the text (§4.1.3 table). The largest slot is 288px, so 2x needs 576 device pixels: the 600w file covers it and the 600px source is never upscaled. The photo is decorative: `alt=""` (the H1 beside it names the person, as `NavAvatar` does), `loading="eager"`, `format="webp"`, `widths={[320, 400, 480, 600]}`, `sizes="(max-width: 734px) 160px, (max-width: 1068px) 216px, 288px"` (`HomeWall.astro:98-106`; `sizes` at `:103`). It is not a link (`home.spec.ts:2026-2043`).

**How the photo is made.** Two steps, both from the owner's original, which stays outside the repo and is never committed. (1) `scripts/brand-images.ts --photo <photo.jpg>` (run `pnpm exec tsx scripts/brand-images.ts --photo <original>`; `importWhole` at `scripts/brand-images.ts:83-107`, the `--photo` dispatch at `:141-144`) reads the original read-only into memory, checks it is 848 × 1264, applies `.rotate()` and `.resize(600)`, and writes `src/assets/profile/photo.jpg` as JPEG at quality 85 with mozjpeg: 600 × 894, with no EXIF, XMP, IPTC, GPS or ICC (36,516 bytes). (2) `pnpm exec tsx scripts/portrait-cutout.ts` (owner, photo-align-cutout) reads only that committed `photo.jpg`, never the original, and writes `src/assets/profile/photo-cutout.png` (`scripts/portrait-cutout.ts:32-33`). The keying runs in Chromium's canvas and is only an alpha mask: the backdrop colour is the median of samples along the top edge and the upper 45% of the sides; a flood fill from the edges takes every pixel grey like it (distance under 26), and so does any enclosed grey region of 20 or more pixels (the gap between sleeve and arm); the edge is pulled in three pixels and softened by two box blurs; alpha is scaled by 1.15 so the person stays opaque. Nothing is drawn or generated. Gates, and nothing is written when one fails: the kept person is 35–75% of the frame; 10 backdrop probes are fully transparent and 3 person probes fully opaque; the person touches neither the left, right nor top edge; the halo (grey left in the partly transparent edge band) is at most 3%. The committed file is 600 × 894 RGBA, 286,115 bytes, with IHDR, IDAT and IEND chunks only (sharp re-encodes it with no metadata, and `imageChunksOnly` drops libvips' pHYs chunk). `tests/unit/brand-images.test.ts:187-194` (photo.jpg: image data only, 600 × 894, ≤ 80 KB), `:205-211` (photo-cutout.png: image chunks only, 600 × 894 RGBA, ≤ 320 KB) and `:214-273` (the backdrop, person, frame and halo gates, decoded in pure Node) enforce it. `avatar-cutout.png` (the v6.11–v6.19 cut-out of `avatar.jpg`) is no longer used by any page; it and the new `photo-cutout.png` are untracked until the owner commits them, and deleting `avatar-cutout.png` is permanent.

**Text** (`HomeWall.astro:108-122`): the name H1 comes first (`:109-111`), then the role line directly under it (owner, title-below-name), two lines in one `p.w-role` (`:112-115`; owner, avatar-title: "change title to Data Engineer / Data Engineering | Backend | DevOps"): `span.w-title` = `home.role` "Data Engineer" and `span.w-areas` = `home.roleAreas` "Data Engineering | Backend | DevOps" (`HomeWall.astro:113-114`, `en.json`/`vi.json`, same text in both languages; the profile `headline` "Senior Data Engineer" stays the data field for meta, JSON-LD and the CV and is no longer drawn on Home), each `display: block` (`:234-237`); the title is the larger line, 32 / 28 / 24px at L / M / S, in the name's `--text` (owner, title-black, was the accent; `.w-title` `:241-246,346-350,394-398`; owner, title-below-name: was 17 / 17 / 14px, the areas' size; the title line boxes are 36 / 32 / 28px, which the identity-row margins in the table above compensate); the sentence is `home.intro` through `boldHtml` (two `<strong>` phrases; about three times the old one-line `exp.hero.copy`, which stays the Experiences hero line: 249 characters in EN and 251 in VI, built only from the site's own facts: the Philippines and South Africa banking markets with the stack in one sentence, and the team of 7 at FPT Software, dated Aug 2026, in its own sentence, no new number or claim; owner, hero-intro-longer); then the four links, a **2 × 2 grid** at every width (`repeat(2, auto)` columns sized to their labels below 1069px, `repeat(2, minmax(0, 1fr))` from 1069px, `justify-items: start`, `align-items: start` (a wrapped label keeps its own height), a 22px row gap and 28px column gap, `HomeWall.astro:285-295,360-362,399-401`) whose first column starts on the text track's left edge, so no link is left alone on a line (lead, photo-logos: a layout fix inside the owner's "everything aligned" goal; `home.spec.ts:1118-1166`). `.w-say` is 1.3125rem at S and 1.5rem from 735px, at most 720px wide (`:267-275,356-359`). The name's size is `min(2.75rem, 19vw)` at S, `min(3.5rem, 19vw)` from 735px and `min(4.5rem, 19vw)` from 1069px (`:261,352,406`), so it is 44 / 56 / 72px at 100% text. The owner asked for a bigger photo and accepted a slightly smaller name, so the L step went from 80 to 72px; the name stays on one line in EN and VI, and with Inter blocked in WebKit (the widest stand-in face, 6.09em) the VI name measures 438.3px in the 656px text track at L (980 − 288 − 36), 217.7px to spare. The `19vw` cap exists for 200% text: the step would otherwise be 88px at S, and in the wide face (Verdana Bold, "Parker" about 3.46em, measured for the home-alt-5 name) it would run past the 280px column at 320; 19vw caps it at 60.8px at 320 and 74.1px at 390, and never binds at 100% text (44px < 60.8px). At 200% text at 1440 the name keeps its 144px size (2 × 72) and wraps only between words, in at most two lines, inside its column (`.w-text`); the pills are a row under the text at every size, on the text's left edge, so the text track is never narrowed by them (`home.spec.ts:747-832`).

#### 4.1.4 "Next." and "Let's talk."

**`#next`** (`HomeNext.astro:22-49`): a full-width section in `.container-wide` (its content on the 980px column through `--wide-inset`, §4.1.3) that owns its block padding: 48 / 72 / 96px at S / M / L (`:54,134,156`). The inner `div[data-reveal-group]` is a grid at every width: one column with a 28px gap below 735px, and from 735px `calc(var(--home-photo) + var(--home-photo-gap)) minmax(0, 1fr)` (216 + 28 = 244px at M, 288 + 36 = 324px from 1069px; row gap 28px, `align-items: start`), so the H2 sits over the identity row's photo column and the path beside it starts on the identity text's left edge, tops aligned (`HomeNext.astro:148-152`); at S both start on the column's left edge. The goals are one column below 1069px and two from there (`:124-131,158-161`; two at M would be about 200px each and break words at 200% text). `--home-photo` (288 / 216 / 160px) and `--home-photo-gap` (36 / 28 / 16px) live in `tokens.css` and drive both `.pop` and this grid (owner, "straight left") (`HomeNext.astro:57-61,148-152`; `tokens.css:67-68,103-104,125-126`). The H2 is `exp.next.title`. The right column is `.next-path` (`HomeNext.astro:27-47`): first the dated step, a plain-text `NextStep` (`data-next-step`, `src/components/ui/NextStep.astro:20-33`) over `NEXT_MILESTONE` (`src/lib/career-next.ts:43-60`). Its eyebrow is *Planned · Apr 2027* (`/vi/`: *Dự kiến · 04/2027*) and its name is *Claude Certified Architect*; both are i18n `exp.next.cert.*`, and a unit test pins them to the planned certification entry (`tests/unit/career-next.test.ts:157`). The step has no link, heading or list item. Its name starts with the Claude mark, by the owner's request (it reverses the earlier "no logo on the planned certification" rule): `NEXT_MILESTONE.logo` is `logos:claude-icon` (`career-next.ts:47,57`), the same `logo` as the planned certification entry, which `career-next.test.ts:157-165` pins. The mark is an `aria-hidden` svg with no `title`, `role` or label, in the §4.8 mark box (20px glyph, 2px padding, a 24px box, 8px gap, its centre on the name's first line, its left edge on the date line's), with no plate because it is 5.4:1 on the dark surface (`NextStep.astro:57-68`; `logo-box.spec.ts:487-521`). So `main` holds exactly one `svg`, in `#next`. The step sits in a `data-reveal` wrapper at `--i:2` (`HomeNext.astro:28-34`), so the goals stay the only `li`, H3 and links. Then `ul.goals` runs over `NEXT_STEPS` (`src/lib/career-next.ts:18-39`) with `margin: 0`, one column with a 28px gap below 1069px (S and M) and two columns with a 40px gap from 1069px (L) (`HomeNext.astro:124-131,158-161`). Each goal is an `li` holding the kicker (*Goal · by 2028* / *by 2030*), an **H3** `.goal-title`, the goal text, and one chevron link to the goal's evidence (`nextHref`: the role page for goal 1, the project page for goal 2) whose visible text, `t(s.link)`, is *So far: …* and is its accessible name. The wording is shared with `/experiences/` and keeps its rules (§4.2.0: goals, not achievements; no job-hunt phrase, no employer name). The two goals equal the `/experiences/` Next cards in EN and VI (`home.spec.ts:2250-2299`), and the step is the same date and name as the `/experiences/` Claude card, which adds the issuer in front (§4.2.0; `tests/e2e/next.spec.ts:263`). The last child of `.next-in` is the owners note (owner, photo-logos: the note shows where marks show): `p.logos-note` with `skills.logosNote` (*Names and logos belong to their owners; no endorsement implied.*, VI *Tên và logo thuộc về chủ sở hữu tương ứng; không hàm ý sự bảo trợ hay xác nhận.*, `src/i18n/en.json:157`, `vi.json:157`), 12px / 1.3333 in `--text-2` (`global.css:128-136`), which spans both columns (`grid-column: 1 / -1`) on the column's start edge with `margin-top: 0`, because the grid gap above it already separates it (`HomeNext.astro:48,63-66`). It shows once in `main`, never in `#top` (`home.spec.ts:2341-2358`, `next.spec.ts:227-244`).

**`#more`** (`LetsTalk.astro:19-41`): `section.section.section--surface.home-talk`, the page's **one grey band** and the last child of `main` (`conformance.spec.ts:40-44`). The inner `div.talk-in[data-reveal-group]` is `var(--content)` wide and centred, and the section is `text-align: center` with padding-block 56px at S and 88px from 735px (`:44-51,88-90`). It holds the H2 `home.contact.title`, `p.t-intro` (`home.contact.text`) in `color: var(--text-2)`, **Email me** (primary, `mailto:`) · **LinkedIn** (secondary) as `.actions.home-acts` (centred, gap 12px 14px, margin-top 28px), then the legal-name line `ul[data-facts] > li[data-real-name]` (`home.contact.realName`, 0.75rem, margin-top 20px) when the profile has a `realName`. No location, no spoken language and no art. The three items reveal in order (`--i` 1 to 3). Contact links are also in the footer's Connect column.

**Footer.** Because the last block is `.section--surface`, the footer draws its 1px `--border` top rule, the house rule as on `/star/` (`src/components/Footer.astro:203-225`; `conformance.spec.ts:40-44`). Home has no footer breadcrumbs, so from 834px the footer gets 24px of its own top padding (`index.astro:52-59`; at compact chrome the footer is an accordion and needs none); the e2e test checks that the footer's first row sits at least 20px below its top edge at 1440 (`home.spec.ts:2490-2514`).

#### 4.1.5 Type rows

Each component carries a **scoped** copy of the rows it uses; the values are the same everywhere. Sizes are S / M (from 735px) / L (from 1069px) where they differ.

| Role | Class | Size / line | Weight, tracking, colour | Source |
|---|---|---|---|---|
| Name (H1, first; margin 0, was 6px top) | `.w-name` | `min(2.75rem, 19vw)` / 1.08; `min(3.5rem, 19vw)` / 1.0715; `min(4.5rem, 19vw)` / 1.05 | 600, −0.02em / −0.005em / −0.015em, `--text` | `HomeWall.astro:258-266,351-355,405-409` |
| Role line, directly under the name (two lines: `.w-title`, `.w-areas`, each a block; owner, title-below-name: the title is the larger line, owner, title-black: `--text` like the name (was `--accent`), plain text; the areas stay `--text-2` at weight 500) | `.w-role` (margin-top 6px); `.w-title` 1.5rem / 1.1667 at S, 1.75rem / 1.1429 from M, 2rem / 1.125 from L (was 0.875rem / 1.2858 and 1.0625rem / 1.2353 for both lines); `.w-areas` 0.875rem / 1.2858; 1.0625rem / 1.2353 from M | title 600, 0.009em / 0.007em / −0.01em (was −0.016em / −0.022em); areas 500 at the `.w-role` tracking, −0.016em (−0.022em from M); `--text-2` (title `--text`, owner, title-black) | `HomeWall.astro:241-257` (title and role), `:341-350` (M role and title), `:394-398` (L title) |
| Sentence | `.w-say` | 1.3125rem / 1.24; 1.5rem / 1.25 from M; at most 720px, margin-top 12px | 600, 0.007em, `--text-2`; `strong` in `--text` at 600 | `:267-279,356-359` |
| Row links | `.w-links` | 1.0625rem; 1.1875rem from M; a 2 × 2 grid at every width, gap 22px 28px, margin-top 18px: `repeat(2, auto)` columns sized to their labels and `justify-content: start` below L (equal 1fr columns would wrap the VI "Tất cả câu chuyện ›" at 375 and push the pills off the first screen), equal `repeat(2, minmax(0, 1fr))` columns from L | the `ChevronLink` flows as text (`inline-block`, 11px block padding for a 44px target, `margin-block: -11px` to keep the rhythm), so a wrapped label keeps its › | `:280-303,360-362,399-401` |
| Pills | `.actions.home-acts` | flex, wrap, start-aligned, gap 12px 14px | primary and secondary pills (§5.6) | `:305-311,338-340,402-404` |
| Block H2 | `.home-big` | 2rem / 1.125; 2.5rem / 1.1; 3rem / 1.0834 | 600, −0.01em (−0.003em at L) | `HomeNext.astro:70-76,135-138,158-162`, `LetsTalk.astro:56-62,91-94,97-101` |
| Goal kicker | `.home-kicker` | 0.875rem / 1.2858; 1.0625rem / 1.2353 from M | 600, −0.016em (−0.022em from M), `--text-2` | `HomeNext.astro:77-84,139-143` |
| Goal H3 | `.goal-title` | 1.5rem / 1.1667, margin-top 8px | 600, 0.009em, `--text` | `HomeNext.astro:85-93` |
| Goal text | `.home-text` | 1.0625rem / 1.4706, margin-top 8px | −0.022em, `--text-2` | `HomeNext.astro:94-100` |
| Goal link row | `.home-links` | 1.0625rem; flex, wrap, gap 22px, margin-top 10px; the 44px trick as `.w-links` | `ChevronLink` | `HomeNext.astro:102-116` |
| Lead line | `.t-intro` | the shared lead size, margin-top 14px | `--text-2` | `LetsTalk.astro:63-66` |
| Legal-name line | `.facts` | 0.75rem / 1.3334, margin-top 20px | −0.01em, `--text-2` | `LetsTalk.astro:76-86` |

#### 4.1.6 Motion

- The name H1 is never animated and never revealed; the wall and the photo never animate either (`home.spec.ts:629-648`). The page's load intro (`.intro`, §5.11) runs on `.w-role` (`--i:1`), `.w-say` (`--i:2`), `.w-links` (`--i:3`) and the pills (`--i:4`) (`HomeWall.astro:112-123`).
- `#next` and `#more` reveal as groups (`data-reveal-group`, items `data-reveal` stepped by `--i`: H2 1, the dated step 2, goals 3 and 4 in `#next` (`HomeNext.astro:27,36`); H2, lead, pills 1 to 3 in `#more`), as §5.11. No block uses a hover lift.
- **The tilt is static and is kept under `prefers-reduced-motion: reduce`.** It is not motion: it never moves. §5.11's rule that nothing carries a `transform` under reduced motion has one pinned exception, `#top .w-wall` (`tests/e2e/m12.spec.ts:128-129`), and a test asserts that `div.w-wall` is the only element of `main` with a `transform` on `/` and `/vi/` (`m12.spec.ts:137-150`). Every `main [data-reveal]` is at opacity 1 with no transform and no translate (`home.spec.ts:1671-1697`).
- With JavaScript off every block is visible and the first wall picture loads (`home.spec.ts:665-680`).

Skills, certifications and languages in full are on `/skills/` (§4.8); the featured project's detail is on its page (§4.6.1); the In practice stories are on `/star/` (§4.4); every role is on `/experiences/` (§4.2).

**Acceptance criteria (Home).** `tests/e2e/home.spec.ts` holds 168 tests per engine (Chromium and WebKit; `playwright test tests/e2e/home.spec.ts --list`, counted for the title-below-name round); the unit tests are `home-wall.test.ts` (35), `home-sections.test.ts` (28), `wall.test.ts` (9), `home.test.ts` (9) and `brand-images.test.ts` (14).
- **Structure:** `main > *` are `SECTION#top`, `SECTION#next`, `SECTION#more`, with `#more` last; exactly one H1 (in `#top`, `#top h1#top-title`), whose text is the profile name (VI too), with no `.text-gradient` and no `.t-eyebrow` or `.home-kicker` in `#top`; one H2 in `#next` and `#more`, H3 only on the two `#next .goal-title`; no `.home-split`, `#board`, `.footnotes`, `.stat-strip`, `.stat-value`, `.bento-tile`, `.band-body`, `.section--dark` and no `[class*="fp-"]` in `main` (`home.spec.ts:294-365,1551-1560`).
- **Identity row:** `#top` is labelled by `top-title`; `.w-say` equals `home.intro` without its markers with exactly two `<strong>`; `.w-links a` are four, with the hrefs and visible names of §4.1.1 in order; the pills are Download CV (`/cv.pdf`, `download`, `btn-primary`) then Email me (`btn-secondary`); the order in `#top` is H1, `.w-role`, `.w-say`, `.w-links`, `.actions`, in EN and VI (`home.spec.ts:2172-2243`; owner, title-below-name: was `.w-role` first). The title is 32 / 28 / 24px at 1440 / 1024 / 390 and 320, its line box 6px under the H1 and above the areas line (`home.spec.ts:2123-2170`), and the order test (`:318-347`) checks that the role line directly follows the H1. `main .link-chevron` count 6, each with its decorative `.chev` hidden and kept out of the name (`home.spec.ts:1927-1973`). No block has more than two actions; every non-pill link outside the wall is a `.link-chevron` (`:367-396`).
- **One nav row:** `[data-local-nav]` count 0 on `/` and `/vi/` at 1440 and 900; after scrolling 800px the global nav's top is 0; `main a[download]` is exactly 1 (`home.spec.ts:483-506`).
- **One grey band:** `main`, `#top` and `#next` are white (or transparent), `#more` is `--surface-2` (`rgb(245, 245, 247)` light, `rgb(29, 29, 31)` dark), the tiles are `--surface-2` in light and differ from the page in dark, the clip has no background image, and the photo's frame has no fill: it computes to a transparent background with no image in light and dark, not `--warm` (`home.spec.ts:991-997`; owner, avatar-title) (`home.spec.ts:398-437`).
- **First screen (peek exception):** at 1440 × 900 the H1, the links row and the pills end at or above 900px, and the wall's top is within 1px of the nav's bottom; at 375 × 812 the photo, the H1, the role line and the whole `.w-say` intro end at or above 812px, EN and VI, with Inter loaded and blocked (the widest stand-in face); the links and pills fall below that fold (owner, hero-intro-longer: the intro is about three times longer and the owner accepted it). Measured in Chromium with reduced motion, EN, with the 288 × 456.5 frame, the 72px name, the title at 32px, the 2 × 2 links and the pills under the text (owner, title-below-name; was the 288 × 441.5 frame with the name at 497 to 572.6px and the role line above it): the frame spans 434.0 to 890.5px (its top on the name's top and its bottom on the pills' bottom, so the whole frame is above the fold), the H1 434 to 509.6px, the title 515.6 to 551.6px, the areas line 551.6 to 572.6px, the intro 584.6 to 734.6px, the links 752.6 to 830.5px and the pills 846.5 to 890.5px (9.5px to spare). At 1024 × 768 the frame is 331.0 to 767.9px (the text block's top and bottom), the H1 331 to 391px, the title 397 to 429px, the areas line 429 to 450px, the intro 462 to 672px and the pills 795.9 to 839.9px, below the 768px fold (accepted with the 375 trade-off, not asserted). At 375 × 812 the photo is 185 to 423.4px (stacked above the text), the H1 439.4 to 486.9px, the title 492.9 to 520.9px and the areas line ends at 538.9px; in EN the intro is 550.9 to 785.2px and the pills 891.2 to 935.2px (123.2px below the fold), and in VI the intro ends at 759.2px and the pills are 865.2 to 909.2px (97.2px below the fold); Inter loaded. The intro's top did not move, so the intro and pill figures carry over from v6.22. In WebKit with Inter blocked, VI, the intro ends at 811.2px (0.8px inside the fold; planner's WebKit measurement), which is why the S margin is kept at exactly −163px. The e2e tests for both Inter states pass (`home.spec.ts:546-627`).
- **Name:** one line at 100% text at 1440, 1069, 768, 390 and 320, EN and VI, Chromium and WebKit, at 72 / 56 / 44px (±0.5), inside its column, with no sideways scroll; the same with the stack forced to Inter and with Inter blocked (the widest real face, WebKit's Inter Fallback at 6.09em, measured: 438.3px at 72px, §4.1.3). At 200% text at 390 and 320, under the default stack, the wide face (Verdana) and Inter, the size is 19vw (±0.5), at most 2 lines, every line inside the column. At 1440 and 200% the size doubles (144px), at most 2 lines, wrapped only between words, the pills under the text, inside the column (230 to 1210) (`home.spec.ts:706-834`).
- **Photo frame:** `.pop` is 288 × 456.5px at 1440 and 216 × 436.9px at 1024, both measured in v6.26 (owner, title-below-name: were 441.5 and 425.9; owner, avatar-title: were 420.5 and 404.9; at 1069 and 900 it is the text block's height, ±0.5, not re-measured), 160 × 238.4px at 390 and 320, radius 18 / 18 / 18 / 18 / 12 / 12px. From M its top is the text's top and its bottom the links' bottom (the pills' bottom at L), so it is as tall as the intro whatever its length (±1). At S the image box equals the frame on all four edges (±0.5). At every width the picture is drawn `object-fit: contain`, never `cover`, at its natural ratio (the drawn box's ratio equals it ±0.005; the natural ratio is 1264:848 ±0.01), sits on the frame's bottom edge, and lies inside every clipping ancestor up to `#top` (±0.5). The frame's left edge is on the column (±1), `transform` is `none`, and the frame has no fill: `background-color` is transparent and `background-image` none in light and dark (owner, avatar-title; was `--warm`, `home.spec.ts:991-997`). The frame test runs at 1440, 1069, 1024, 900, 390 and 320 in the default theme (`home.spec.ts:836-988`); the light and dark loop is `alignment.spec.ts:657-757`. Cut-out (`home.spec.ts:1000-1116`): the served file's backdrop is nearly transparent (alpha ≤ 8) and the person opaque, and the frame is transparent, so the person stands on the page, and hiding the picture changes the pixels at the bottom centre (owner, avatar-title; was the page's warm tint behind the person) in light and dark. Sharp: the chosen `srcset` candidate is at least the rendered pixels × DPR − 1 at 1440 (DPR 1 and 2) and 390 (DPR 2 and 3), and the rendered pixels never exceed the 600px source (sharpness at `home.spec.ts:951-988`). **Four links:** at every width they are two rows of two, rows' tops equal, each column's left edges equal (±1), the first column on `.w-text`'s left edge, each at least 44px tall, EN and VI, light and dark (`home.spec.ts:1118-1166`).
- **Wall geometry:** at 1440, 1069, 900, 390 and 320 the clip is full width at its band height (560 / 400 / 300px ±1), `overflow: clip`, with a linear-gradient mask to transparent, a 4-column (3 below 735px) grid and a `matrix3d` transform; at 1440 and 1069 the frame's bottom is on the pills' bottom and its top on the text's top (±1), the frame sits left of the text (`home.spec.ts:1225-1249`), the pills sit under the text on its left edge, and the text ends on the column's right edge (±1); at 900 the pills sit under the frame and the text (`home.spec.ts:1251-1257`; the 1024 and 900 frame is the text block's height, `alignment.spec.ts:657-757`); at 390 and 320 the photo, the text and the pills stack in DOM order inside the column; the bottom strip of the clip is white (light) or black (dark) at 1440 and 390, while a strip at 30% of the clip still shows the wall (`home.spec.ts:1168-1321`).
- **Edge rule (A6, owner, request 2; left edge added by "straight left"):** `.w-text`'s left edge equals `.next-path`'s left edge (±1), and `.w-text`'s right edge, `.next-path`'s right edge and the column's right edge agree (±1) at 1440, 1069, 1024, 390 and 320, EN and VI, light and dark, and at 1069 and up the pills' left edge is the text's left edge (`alignment.spec.ts:657-757`, the Home edge test; the column edges of every page, `alignment.spec.ts:479-599`; the Home case of `checkPage`, `alignment.spec.ts:164-190`).
- **Static:** the tilt matrix is identical with and without a motion preference; nothing in the clip animates or transitions (`home.spec.ts:1323-1356`); the one `transform` in `main` is `div.w-wall` (`m12.spec.ts:137-150`).
- **Pictures:** `main` holds 25 images (24 wall variants and the photo) and one `svg`, the decorative Claude mark on the dated step in `#next` (no `svg[role=img]`), every `img` `alt` is empty and the only images inside a link are the wall's, inside `a.w-tile` (`home.spec.ts:1927-1973`); 12 tiles, each with one light and one dark `<img>` with `alt=""`, `width` and `height`, the tile's `tabindex="-1"` and `href`, light shown and dark `display: none` by default (`:1755-1796`); six eager light tiles load at 390 (`:1798-1806`); for each of EN and VI in light and dark, every wall response is a 200 `image/webp` in that language only, a light visit fetches no dark file, and all twelve captures of the theme load (`:1812-1836`); switching `data-theme` swaps 12 light for 12 dark and the frame stays transparent (owner, avatar-title; was: the warm frame follows; `:1838-1856`); with the system preference and the OS in dark or light only that scheme's captures show (`:1859-1881`); the byte caps of §4.1.2 (`:1889-1924`); no layout shift (CLS < 0.05, Chromium; `:1975-2023`).
- **Not a CV:** `main`'s text holds no location, no spoken language, no years figure (`\d+ years`, `\d+ năm`) and no story title (EN on `/`, VI on `/vi/`); outside the wall the only story link is `/star/`; `main [data-facts]` exists only in `#more`; no `.tool-icon`; the logos note appears exactly once in `main`, in `#next` under the Claude mark, never in `#top` (`home.spec.ts:1580-1627,2220-2241,2341-2358`).
- **`#next`:** the H2, the two eyebrows (2028 and 2030) and the two H3 titles equal those of the `/experiences/` Next cards, in EN and VI; the goal text equals the card text; two links with the cards' hrefs and the visible `exp.next.*.link` text as names; each href returns 200; the two goals share a row at 1440 and stack at 390; the dated step shows one `aria-hidden` Claude mark and no link, heading or list item (`next.spec.ts:204-228`); axe finds no violation in `#next` in light and dark (`home.spec.ts:2245-2324`).
- **Axe, keyboard and focus:** axe finds no violation in `#top`, light and dark, EN and VI (`home.spec.ts:2326-2339`); Tab from the top reaches **See every role** first in `main`, never a wall tile, then the pills (`:1699-1751`); the CV pill and the "›" links show a focus ring (`:509-544,2456-2487`); wrapped "›" links keep their chevron on the last line, 44px targets and their gap (`:2362-2446`).
- **Reflow:** no horizontal scroll at 320, 390, 768, 1069 and 1440, and with text at 200%; at 390 and 320 every item of `main` outside the clip is inside its block (±1) at 100% and 200% text, EN and VI (`home.spec.ts:2520-2576`).
- **Destinations and anchors:** the exact link set of §4.1.1, each internal href 200 in EN and VI (`home.spec.ts:1629-1669`); heading ids land below the nav with the eyebrow visible (`home.spec.ts:1434-1452`); `/#next` lands with the bar at 44px (`anchor-offset.spec.ts:10`); no element of `main` is sticky after a scroll (`home.spec.ts:682-703`).
- **EN and VI:** the same blocks, order and links on `/vi/` with the VI strings and the `/vi/` prefix, no fallback banner (`home.spec.ts:1483-1495,1562-1578`); `i18n.test.ts` parity passes.
- **Unit tests:** `home-wall.test.ts` renders `HomeWall` in EN and VI and pins the markup (12 tiles and 24 images with empty alts, the loading and `fetchpriority` table of §4.1.2, the photo's markup and `srcset`: one eager decorative photo whose `src` is `photo-cutout.png` (the cut-out, not `photo.jpg`), no inner span, `widths` 320 / 400 / 480 / 600 and the exact `sizes`), the eight combinations of missing project, stories and posts (the link count is 1 plus the present items, **See every role** always first), and the source guards (no `<script>`, `box-shadow`, hex, px font size, `font-family`, `transition`, `animation` or `nowrap`; the single `transform` in `.w-wall`, with `margin-left` −450 / −750 / −980px; the identity row's `margin-top` (−153px at S, −102px from M, −155px at L; owner, avatar-title); `position: relative` and `overflow: clip` on `.w-clip`; the `data-pref='system'` swap rules; the mask and its `-webkit-` twin; the three `19vw` caps over the steps 2.75 / 3.5 / 4.5rem; the cut-out frame: `--pop: var(--home-photo)`, `width: var(--pop)`, `display: block`, `overflow: hidden`, no `background` (owner, avatar-title; was `background: var(--warm)`), `aspect-ratio: 600 / 894` at S and `auto` from M, no `--pop-h`, `--pop-img` or fixed `height`; `.pop img` is absolute with `inset: 0`, `object-fit: contain` and `object-position: 50% 100%`, with no `transform`, `margin` or `object-fit: cover`, no `.pop::before`, the largest rendered image is 288px at 2x within the 600px source, and the tokens are 288 / 216 / 160px; at L the photo is `align-self: stretch` and `.w-text` `align-self: start` in rows `auto` (no `1fr`), the pills sit in `grid-area: 2 / 2`, and `min-width: min-content` is absent; the L links grid; `var(--keyline)`, and no `var(--warm)` in HomeWall, owner, avatar-title); `home-sections.test.ts` pins `#next` and `#more` (§4.1.4). Each changed assertion carries an `owner, profile-image-full` or `owner, photo-align-cutout` comment.
- Lighthouse on `/` and `/vi/` ≥ 0.95 in every category, CLS < 0.05; axe has no serious or critical violation in light and dark, EN and VI; `test:budget` passes (the page adds no script).

### 4.2 Experiences (`/experiences/`)

The old `/cv/` and `/vi/cv/` URLs redirect to `/experiences/` and `/vi/experiences/` (static meta-refresh pages generated by Astro `redirects`; excluded from the sitemap and the search index).

The page is a **Leadership-style index**: a hero, one grey band of white, type-only cards (no image, icon or avatar; role cards carry the company logo, certification cards may carry one optional issuer logo, the Education card the school logo) in five groups (the last, "Next.", is two goal cards, web only), and a closing contact box. The one exception to "no icon" is the **Tech stack** group, whose cards hold brand marks beside tool names (owner, techstack, below). The summary, projects and skill rows are **not** on this page: projects live on `/projects/` (§4.6), skills on `/skills/` (§4.8), each role's highlights on its own page (§4.2.3); all of them, plus the summary, are in the PDF (§4.3). The tools that carry a brand mark on `/skills/` are shown here (Tech stack), less six (§4.2.0).

#### 4.2.0 Page structure

| # | Block | Kind | `id` |
|---|---|---|---|
| 1 | Local nav | §5.8 | — |
| 2 | Hero | §5.10.1, `--bg` | `hero` |
| 3 | Role, certification, education and next cards | One `--surface-2` section holding five card groups separated by a 1px `--border` rule | `roles` (groups `experience`, `stack`, `certifications`, `education`, `next`) |
| 4 | Contact box | `--bg` section holding a `--surface-2` box | `contact` |

- **Hero** (Layout B): eyebrow = the profile headline, **H1** *"Built for banking data."* (i18n), the positioning line as Lockup copy (`exp.hero.copy`), **Email me** (primary, `mailto:`) · **Download CV**.
- **Card groups** (`CardGroup`): a start-aligned H2 (*"Experience."*, *"Tech stack."*, *"Certifications."*, *"Education."*, *"Next."*) over a list of cards on `--bg` (white; the band is grey), radius 28, padding 28 / 28 / 24, minimum height 180px at M and L (`CardGroup.astro:170-176,330-332`), 20px gap, equal heights per row (the grid stretches its items and no group sets `align-items`; §5.10.4 defines what "equal padding" means then); **4 up at L, 2 at M, 1 at S**, inside the 980px `--content` grid (as apple.com/leadership), not the wide width. The count of the collection-backed groups is never fixed: their lists come from the `experience`, `certifications` and `education` collections. The `next` group is fixed at two cards (below). The `posts` variant (§4.5, blog only) is three up at L, two at M and one at S (`CardGroup.astro:166-169`); its cards carry the cover in the logo slot, a meta line under the text, a three-line text clamp and a 44px title link (`CardGroup.astro:294-310`).
  - **Role card** (`id` = the role slug): an optional company logo above the eyebrow (`logo`; the client's when `client` is set), 32px tall, `alt=""`; in dark theme the `logoDark` file when set, else a white plate; eyebrow = year range (*2021–2024*, *2026–now*), **H3** = company label (a link to `/experiences/<slug>/` stretched over the whole card), role title below in `--text-2`. Newest first (§4.2.1 sort).
  - **Certification card:** an optional issuer logo (Iconify svg, a 32px square with 4px radius, 12px above the eyebrow, its left edge on the eyebrow's: `CardGroup.astro:177-187`) above the eyebrow = *issuer · year*, **H3** = name, and a **Verify ›** chevron link when the certification has a `credentialUrl`. Earned entries only, newest year first (`sortCerts` then `!isPlanned`, `experiences/index.astro:29`): the group is exactly the two earned cards. The `planned` entry is not a Certifications card (owner, next-card; it was the third card, owner claude-card); it is the first card under *Next.* (see *Planned certification card* below). A mark that fails 3:1 on the dark card (AWS and Datadog: `iconPlate`, `src/lib/tool-icons.ts:104-108`) sits on `--mark-plate` with a 4px ring drawn outside its 32px box, in dark only (`CardGroup.astro:238-251`), so its ink stays on the eyebrow edge and nothing shifts between themes. The ring is a `box-shadow: 0 0 0 4px var(--mark-plate)`: the named exception to "no shadows" (§5.5), the same ring `CompanyLogo` draws behind a role-card logo without a dark file (`CompanyLogo.astro:57-72`); the logo's own plate, never a card shadow. Pinned by `logo-box.spec.ts:392-485` and `experiences.spec.ts:178-230`.
  - **Education card:** an optional school logo (a local image via `image()`, 32px, `alt=""`, above the eyebrow, no disc or dark-mode treatment), eyebrow = `shortName`, **H3** = `name` (the English name on `/experiences/`, the Vietnamese name on `/vi/experiences/`); no link or year.
  - **Next card** (group H2 *"Next."*, i18n `exp.next.*`; `/vi/` *"Tiếp theo."*): the planned certification card (*Planned certification card*, next bullet) first, then exactly two goal cards in fixed order. Eyebrow = *Goal · by 2028* (first) / *Goal · by 2030* (second) (`/vi/`: *Mục tiêu · đến năm 2028* / *đến năm 2030*), **H3** = the target role, *Data Architect* then *Forward Deployed Engineer (FDE)* (English in both languages), one line of goal text, one **chevron link** (`So far: …`) to existing evidence (the current role page for the first, the multi-agent project for the second), and no logo. Each goal card has one link only, so no link is stretched over the card. **Wording rules:** the cards state goals, not achievements. The two role titles and the two target years are shown by owner choice (they supersede the earlier no-titles, no-years rule for these strings only); no other title, year or year count, no job-hunt phrase (*Seeking*, *Open to*) and no employer or target-company name appears; the link label names the evidence, not a vendor. The group is always rendered, from i18n strings and `src/lib/career-next.ts`, not from a collection. It is web only: on Home only as the `#next` section (titles, years, text and its "So far" links, §4.1.4), not on the print route or in the PDF, and not in the local nav.
  - **Planned certification card** (owner, next-card: it replaces the one-line dated step on this page; Home `#next` keeps its step line, below): the first card of the *Next.* group, `li#next-cert`, built from the `certifications` entry and the same `CardGroup` markup as an earned Certifications card (§4.2.0, *Certification card*): the unplated Claude mark (32px, `logos:claude-icon`), eyebrow *Anthropic · Planned · Apr 2027* (`/vi/`: *Anthropic · Dự kiến · 04/2027*, `certWhen`), **H3** *Claude Certified Architect*. No year as earned, no link, no credential ID, no text and no stretched anchor (`experiences/index.astro`, the `next` items; `tests/e2e/experiences.spec.ts` *next: the planned Claude cert is a card*). It carries the issuer name (the one place the *Next.* wording rules allow it, because it is the Certifications card's wording); the goal cards keep every wording rule above. It sits on the same row and the same 180px minimum height as the goal cards (`alignment.spec.ts`, `logo-box.spec.ts` card marks, now three marks). The group has no `.group-lead` step line on `/experiences/`.
  - **Dated step** (Home `#next` only; `NextStep.astro`, `data-next-step`): one plain-text line above the two goals on Home, not a card. Its eyebrow is *Planned · Apr 2027* (`/vi/`: *Dự kiến · 04/2027*) over *Claude Certified Architect*, i18n `exp.next.cert.*`, pinned to `claude-certified-architect.md` by `tests/unit/career-next.test.ts:157`; the Claude mark in the §4.8 mark box (`logo-box.spec.ts`), no link, heading or list item (`next.spec.ts:188-245`). It names no issuer. **Logo note** (owner, photo-logos): `p.logos-note` with `skills.logosNote`, once on `/experiences/` after the *Next.* group and once in Home `#next` (`experiences/index.astro`; `global.css:128-136`; `next.spec.ts:246-261`).
  - **Tech stack** (group H2 *"Tech stack."*, `exp.stack.title`; `/vi/` *"Công nghệ sử dụng."*; `id="stack"`, owner, techstack: "add the tech stack section and its icons"; owner, techstack-trim: grouped by skill role): the second group, after *Experience.* and before *Certifications.* (`experiences/index.astro:85-93`). It shows the tools that carry a brand mark on `/skills/`, less six (below), as the §4.8 mark box plus the name, in **six skill-role cards** (by the job each tool does, not by the `/skills/` area), in this order: *Languages & libs* (Python, Java, Spring Boot), *Data processing* (Apache Spark, Databricks, DBT), *Orchestration* (Apache Airflow), *Cloud & storage* (AWS, Azure, PostgreSQL), *Code & CI/CD* (Git, GitLab CI/CD) and *Infra & monitoring* (Terraform, Docker, Kubernetes, Datadog); `/vi/` *Ngôn ngữ & framework*, *Xử lý dữ liệu*, *Điều phối*, *Đám mây & lưu trữ*, *Mã nguồn & CI/CD*, *Hạ tầng & giám sát* (`exp.stack.role.*`, `src/i18n/en.json:238-243`, `src/i18n/vi.json:238-243`) = **16 tools**, 7 of them plated in dark (Python, Apache Airflow, AWS, Azure, PostgreSQL, Terraform, Datadog; `tests/unit/tech-stack.test.ts:61`). The list is never written by hand: `stackTools()` (`src/lib/tech-stack.ts:62-81`) reads the same `skills` entries and the same `toolIcon` / `toolChildIcon` lookups as `/skills/` (§4.8), row first and then its marked children, a name kept once at its first occurrence (Databricks under Azure repeats the Data row). **Excluded** (owner, techstack-trim): `STACK_EXCLUDE` (`tech-stack.ts:30-37`) removes **Talend, S3, Athena, Redshift, Lake Formation and CloudFormation**, which stay on `/skills/` and in the experience text. **PySpark and Apache Spark are one entry**, *Apache Spark* (owner, techstack: they share one Spark mark; `STACK_ALIAS`, `tech-stack.ts:27`), so 16 and not 17. `STACK_ROLES` (`tech-stack.ts:40-59`) is the section-only grouping, the role of each tool; `techStack()` (`tech-stack.ts:83-106`) throws at build on a role naming a tool that is not shown, a tool in two roles, or a shown tool in no role (`:96,97,104`), so a new marked /skills/ tool fails the build until it has a role. Tools with no installed brand mark (SQL, Amazon EMR, the AWS CDK, concepts) are left out (owner, techstack). `tests/unit/tech-stack.test.ts` fails on any drift from `/skills/` (`:85-95`), and `tests/e2e/experiences.spec.ts:566-628` compares the rendered names, icons, the six role headings (EN and VI) and the group order of the two pages; the drift rule allows exactly the no-logo rule, the PySpark merge and the six exclusions, each still on `/skills/`. Layout: `CardGroup` `variant="tools"` (`CardGroup.astro:43,114-129`), **2 cards up at L and M and 1 at S** (the 4 / 2 / 1 rule above does not apply), each card an H3 (the role name; no eyebrow) over a `ul` of tools in **CSS columns filled down** (`columns: 2 176px`, 24px column gap, `break-inside: avoid`, 10px between rows; `CardGroup.astro:189-203`; lead, techstack, ui review), so two columns fit in the 424px content at L and one at M and S. The cards hold 3, 3, 1, 3, 2 and 4 tools: 4 as 2 + 2, 3 as 2 + 1 and 2 as 1 + 1, so an odd count ends as a shorter second column, never a lone tile in it; the one-tool *Orchestration* card is a single tile in its first column. Every role H3 is one line at every width, 320 and 390 included (owner, techstack-trim ui review: EN *Languages & libs*, since *Languages & frameworks* wrapped at 320; `alignment.spec.ts:295-308`). The `ul` has `role="list"` (`:114`; Safari drops the semantics of an unstyled list). Each tool is the §4.8 tool box, 24 = 20 + 2 × 2 with an 8px gap and its centre on the name's first line (`CardGroup.astro:204-220`; Java and Terraform shifted as in §4.8), an `aria-hidden` svg with no `title` or `role`; the name is the text. The plate is `--mark-plate` in dark on the 7 plated marks, with no ring (`:228-237`). The group carries `data-pagefind-ignore` (`CardGroup.astro:51`), so the 16 names add no search hits; it adds no script. It is web only: the print route and the PDF are unchanged (§4.3). The owners note at the end of the band, after *Next.* (`skills.logosNote`), covers these marks. Tests: `logo-box.spec.ts:86-89,265,528` (box geometry at 1440 / 1024 / 390 / 320 EN and 1440 / 390 VI, light and dark, ink centred in all 16), `logo-box.spec.ts:273-279` (exactly the 7 plates), `alignment.spec.ts:196-314` (5 grids on the column, six role cards, 2 per row from 735, tools inside each card and the column flow: DOM order down the first column, a constant row pitch and column pitch, columns starting level, the first column holding the larger half, five cards with more than one tool, one-line H3s), `experiences.spec.ts:97-100` (exactly 16 svgs in `#stack`, all tool marks), `tests/unit/tech-stack.test.ts:66,114-122` (six roles, 16 tools, the 7 plates). **Exemptions it needed:** `m12.spec.ts` exempts `svg.group-card__tool-mark > use` from "no transform under reduced motion" (lead, techstack: the §4.8 Java and Terraform optical shifts are static, never motion; `m12.spec.ts:128-133`), and `anchor-offset.spec.ts` gains `#stack` in EN and VI (`:9-11`).
  - **Card H3 (all kinds):** 21px at every width with `overflow-wrap: break-word`; the "· year" in the eyebrow keeps a no-break space so it never wraps alone.
  - A collection-backed group (`experience`, `certifications`, `education`) renders only when its collection has entries.
- **Contact box** (`ContactBox`, H2 *"Get in touch."*): `--surface-2`, radius 28, padding 40 / 32 / 24, `--content` wide and centred (the box sets no `max-width`; its section's inner box is the column, so it is exactly the column at every width, `ContactBox.astro:39-45`), start-aligned text; the last link's 12px of block padding, which is the 44px touch target and not space, is pulled into the box's own padding (`margin-block-end: -12px`, `:73-77`) so the text sits 40 / 32 / 24 above the bottom edge as the heading sits below the top; the subhead is `home.contact.text`; lines **Email** (`mailto:`), **Mobile** (`tel:`, shown as `phoneDisplay`) and **LinkedIn** (new tab). Every link is at least 44px tall.
- **Footer:** there are no stats, so no footnotes; the last band is white and the footer has no top rule.
- **Headings:** H1 (hero) → H2 (*Experience.*, *Tech stack.*, *Certifications.*, *Education.*, *Next.*, *Get in touch.*) → H3 (one per card), no skipped levels.
- **Anchors:** each role card's `id` is the role slug, so the old `/experiences/#<role-slug>` links (In practice, search) land on the card below both bars (§5.10.6).
- **Local nav:** title "Experiences" (a link to `/experiences/`); one link per role, newest first, labelled with the company's **short name** (`shortName`, §6.2; default the `client` if set, else `company`), adding the start year only when the same short name appears twice, linking to `/experiences/<role-slug>/`; then a last **Tech stack** link to `/experiences/#stack` (`/vi/`: *Công nghệ sử dụng*, `exp.techStack`; owner, techstack: shared with the role pages, `src/lib/localnav.ts:108`); all links, Tech stack included, fit at L (1069px and up: measured scrollWidth = clientWidth, 715px EN and 753px VI); on the 692px column at 834–1068px the role links, Tech stack and the pill do not all fit (554px needed in 427px, so 127px of overflow, EN; 603 in 465, 138px, VI; it was 485 in 427 before the link) and the bar scrolls behind its trailing fade, by the owner's choice (scrolled to its end, the last link, now Tech stack, is clear of the fade and the overflow is at most **128px** at 900 in EN and **140px** in VI, lead, techstack: the cap was 64px and EN only; `frame.spec.ts:613-675`; the bar scrolls the current role's link into view on load, §5.8); the small pill **Download CV**.
- **Scripts:** only the shared local-nav helper (§5.8).

#### 4.2.1 Role chapter (used on role pages, §4.2.3)

One full section per role, sorted with the current role first, then `start` descending (year-only dates sort as January). Two roles at the same company stay two chapters.

- **Header** (Section header, §5.10.4):
  - Eyebrow: the date range only, kept to one line, e.g. *Aug 2026 – Present* (`formatDateRange`; "Present" when `end` is empty). The current role adds a **"Current"** chip (`--mint-tint`) before the date.
  - **H2** in Section headline size: the role title, e.g. *Senior Data Engineer (Team Lead).*
  - Subhead: the company label and the location, e.g. *Datum / Security Bank · Ho Chi Minh City* (the company label is *Datum / Security Bank* when `client` is set).
- **Highlight cards** (§5.10.4 Card): each Markdown bullet becomes one card. The bold label (the text before the first `:`) is the card's **H3**; the rest is the body in `--text-2`, keeping inline **bold** terms in `--text`. Bodies support the inline subset `**bold**`, `*italic*`/`_italic_`, `` `code` ``, `[text](url)` (http(s), mailto, site-relative and `#` only; other schemes render as plain text), `\` escapes and HTML entities; anything else stays literal. A bullet with no bold label becomes a body-only card.
  - Grid: in the wide content width, whose content box is the column (`.chapter-grid { width: var(--content-wide); padding-inline: var(--wide-inset) }`, `blocks.css:1178-1185`), so the cards' outer edges are the column's (x 230 to 1210 at 1440, 166 to 858 at 1024), 2 columns at M and L, 1 at S, 16px gap. With an odd count, the last card spans both columns, and a spanning card's body is capped at 68ch.
  - Card text is **left-aligned** (the header stays centred). Cards in a row have equal heights. Owner's definition of **equal padding** (photo-logos): the top, left and right padding are equal (28px, 24px at S, from the card's border edge, which sits on the column) and the content is top-aligned; when a neighbour is taller, the extra height is free space at the bottom. Cards do not hug their content and no grid takes `align-items: start`; `alignment.spec.ts` pins equal heights and equal top, left and right insets with the bottom free (`expectFourSides` with `bottom: 'free'`, `expectEqualHeights`, `geometry.ts:346-478`).
  - The bullets are parsed at build time by `lib/cv.ts`; no client JS.
- **Tech highlights:** every tech term in card text is highlighted, whether or not the Markdown bolds it.
  - **Vocabulary** (build time): the role's `tech` list plus every `skills` item and child name (EN entries; tech names are not translated, so the same vocabulary serves VI).
  - **Matching:** case-insensitive and whole-word (word boundaries are anything other than letters, digits, and `+`, `#`, `.` inside a word, so *Azure-based* matches *Azure* and *PySpark/Spark* matches both), **longest term first** (*Apache Spark* before *Spark*). The original casing is kept. Matches inside links and inline code are not highlighted. A bold run that is a tech term becomes a highlight (not bold + highlight); other bold runs stay plain bold.
  - **Style:** `<mark class="tech">`: `--mint-tint` background, `--text`, weight 600, 6px radius, `0 4px` padding, `box-decoration-break: clone`.
- **Tech stack:** under the cards, centred, the role's `tech` list as mint chips (§5.6) in a list labelled "Tech stack". At S, at most 2 rows show and the rest collapse into a "+N" chip.
- **Story link:** if the role has In practice stories, a secondary pill under the chips: **"Read the story"** (one story → `/star/<slug>/`) or **"N stories"** (→ `/star/#<role-slug>`).
- **Motion:** the header and each card use effect 1 (staggered fade-up); cards are never scaled.
- **Sticky storytelling (L only):** for every chapter with 1 or more cards, scroll effect 4 (§5.11) puts the header in a sticky left column and the cards in one right column. At M and S, and with no cards, the chapter keeps the centred, stacked layout above.

#### 4.2.3 Role page (`/experiences/<slug>/`)

Every `experience` file is also a page at `/experiences/<slug>/` (and `/vi/experiences/<slug>/`); `print` is reserved. Local nav: title "Experiences" (→ `/experiences/`), one link per role (newest first, labelled as in §4.2.0) to its page with `aria-current` on the open one, then the **Tech stack** link (§4.2.0), and the **Download CV** pill. A tight, compact hero (§5.10.1, 64px H1 at L): the company logo (as on the role card), eyebrow = company label, **H1** = role, subhead = date range · location. Then one `--surface-2` chapter (§4.2.1) with the H2 *"Highlights."* in place of the role header (no dates, no Current chip), cards, tech chips and the story pill in the sticky left column at L. No closing section; the chapter is the last band, so the footer has a top rule. Description: `exp.role.description`. Indexed by search as Experiences (`searchType="cv"`). Acceptance: on every role page the peek rule (App. D.0) holds at 1440×900 and 375×812.

**Acceptance criteria (Experiences)**
- There is exactly one role card per `experience` file, in sort order (current first, then `start` descending), each linking to `/experiences/<slug>/`; the local-nav links have the same targets in the same order. Adding a file to `src/content/experience/` adds a card, a local-nav link and a role page with no code changes.
- Certification cards are the `certifications` collection: the earned entries newest year first (*Amazon Web Services · 2022* after *Datadog · 2023*) and nothing else; the planned *Claude Certified Architect* is not a Certifications card (owner, next-card; owner claude-card had made it the third, last card) but the first *Next.* card, labelled *Planned · Apr 2027* (*Dự kiến · 04/2027*) and never as earned. It is also a card on *Next.* (§4.2.0, owner, next-card) and its line in the PDF (§4.3). `experiences/index.astro:29` filters it out of the Certifications group again; `tests/e2e/certs.spec.ts` and `experiences.spec.ts` check it.
- The Education card follows the `education` collection: the school logo above the eyebrow, eyebrow `shortName`, H3 `name` (per language), and no link or year.
- Group cards keep equal heights per row at 735px and up with at least 180px each, equal top, left and right insets of 28px (24px at S) and a free bottom, and the five groups sit on the column, light and dark, EN and VI (`alignment.spec.ts`, Experiences at 1440, 1024, 390 and 320; mutation: `align-items: start` on `.group-cards` fails the equal-height check).
- Cards are 4 up at 1440, 2 up at 900 and 1 up at 375 (the Tech stack cards 2 up at 1440 and 900, 1 up at 375); role cards hold only the company logo `img` (one visible per theme) and no `svg` or `picture`; certification cards hold only the issuer logo `svg`, the Education card only the school logo `img`; the Tech stack cards hold only their `aria-hidden` tool marks beside the names (16 per page, `/skills/` less the six exclusions; `experiences.spec.ts:97-100`).
- Headings go H1 → H2 (*Experience.*, *Tech stack.*, *Certifications.*, *Education.*, *Next.*, *Get in touch.*) → H3 (one per card) with no skipped levels.
- No summary, skills, highlights gallery, career row, chapters, featured band, "Let's talk." section, stat strip or footnotes.
- The old `/experiences/#<role-slug>` URLs land on the role's card below both bars, at 375 and 1440.
- The contact box has a `mailto:` link, a `tel:+84963378831` link shown as *(+84) 963 378 831* and a LinkedIn link that opens a new tab; every contact link is at least 44px tall.
- The last band (`#contact`) is white, so the footer has no top rule.
- The peek rule holds at 1440 × 900 and 375 × 812: `#roles` starts at least 64px above the viewport bottom.
- The local nav never causes horizontal page scroll from 320px up; with JavaScript off every card is visible and the Download CV pill points to a file that exists in the build.
- Lighthouse on `/experiences/` and `/vi/experiences/` ≥ 0.95, CLS < 0.05; axe has zero serious or critical violations in light and dark, EN and VI.
- Every experience bullet in `cv.tex` appears on a role page, every project bullet on `/projects/`, and every skill and certification on `/skills/`; all of them, plus the summary, appear in the PDF (Appendix A checklist, ticked in M2).

### 4.3 CV PDF (built automatically)

- The web content (§4.2) is the **single source of truth**. `cv.tex` is used once to migrate the content and is not kept in sync afterwards.
- `/experiences/print/` is a print version of the Experiences content **plus** the summary and the projects, skills, certifications and education collections, laid out like `cv.tex`:
  - **Header:** name and headline on the left; email, phone, LinkedIn and GitHub on the right.
  - **Sections:** Summary (with a Core Stack line) → Experience → AI Engineering & Agentic Coding (personal projects, titled "… (Personal Project)") → Technical Skills → Certifications | Education (one row, two columns). Headings are small caps with a thin rule under each.
  - **Experience entries:** company and location on one line, role and dates on the next, then the labelled bullets.
  - **Selected projects:** projects with `inPdf: true` (default: those marked `featured`), each laid out like an experience entry (title | dates, subtitle), followed by all its bullets.
  - **Technical skills:** a two-column table (group | items) with no descriptions or icons. The last row is **Languages**, from `profile.spokenLanguages`.
  - **Certifications:** one line each, *Name (when)*. For an earned entry *when* is the year (*Name (2022)*); the planned entry reads *Claude Certified Architect (Planned · Apr 2027)*, or *(Dự kiến · 04/2027)* in `/vi/` (`certWhen`, `src/lib/certs.ts:40-43`, printed at `print.astro:143`). The planned line has no link and no logo.
  - **Education:** one line each, *Name (Short name)* (no logo; the print page has no logos).
  - **Styling:** one column (except the last row, Certifications beside Education), Inter, light theme forced. The only accent is a mint rule under section headings. No nav, footer, animations or chips. Links are shown as readable text. **The print layout is not affected by the §5 web design system.**
- In CI, after `astro build`, `scripts/build-cv-pdf.ts`:
  1. Serves `dist/` locally.
  2. Opens `/experiences/print/` and `/vi/experiences/print/` in Playwright (Chromium).
  3. Waits for fonts (`document.fonts.ready`).
  4. Saves `page.pdf({ format: 'Letter', printBackground: true, margin: { top: '0.5in', bottom: '0.5in', left: '0.6in', right: '0.6in' } })` to `dist/cv.pdf` and `dist/vi/cv.pdf`.
- PDF metadata: title "Ryan Parker — Senior Data Engineer CV", author "Ryan Parker", subject the headline.
- `/experiences/print/` has `<meta name="robots" content="noindex">` and is left out of the sitemap and the search index.

**Acceptance criteria (PDF)**
- The PDF has selectable text and working `mailto:`, `tel:`, LinkedIn and GitHub links.
- The build fails if PDF generation fails.
- The PDF is US Letter and at most 2 pages with the real content.

### 4.4 In practice (`/star/`)

The section is named **In practice** (VI *Thực chiến*) in the nav, breadcrumb, `<title>`, site index and search label (i18n `nav.star`, `star.title`, `search.type.star`); the page headline is **"Real work. Real results."** (VI *"Việc thật. Kết quả thật."*, `star.hero`). The URLs stay `/star/` and `/star/<slug>/`. The stories keep the STAR format (Situation, Task, Action, Result).

- **Hero** (`src/pages/[...lang]/star/index.astro:59`): no eyebrow, **H1** *"Real work. Real results."*, subhead *"<n> stories across <m> roles."* (`star.subline`, counts at build time). No art and no filter.
- **Local nav:** title "In practice"; one link per role, labelled with the company, to that role's newest story on the desk (`index.astro:51-57`).
- **Newsroom desk** (`section.news-band#stories`, `--surface-2`, `aria-label` "In practice", `index.astro:60-76`), stories ordered **newest first by `date`** (`byNewest`, `src/lib/star.ts:43-47`; equal dates by slug), not by role and not by `featured`. Slots by count (`deskSlots`, `star.ts:54-56`): the **1st = the lead card**; the **2nd and 3rd = tiles** in a `.news-grid` (`<ul>`, two columns from 735px, one at S; a lone tile spans the row and splits its diagram and text 1.1fr / 1fr with a 40px gap, the lead's own split, so its text and media start at the same x as the lead's: `star/index.astro:100-109`, `StoryTeaser.astro:131-136`; `alignment.spec.ts`); the **4th onwards = a "More from In practice" list** (`MoreFrom`, §4.5: H2 `star.moreFrom`, hairline rows of title links). One story gives a lead only, two a lead and one tile, three a lead and two tiles, and the list appears only above three stories. A story without a `role` is labelled "Other / Personal".
- **Story card** (`StoryTeaser`, `src/components/star/StoryTeaser.astro`; one `<article>` named by its H2): the story diagram when the story has `image` and `imageAlt` (`role="img"`, 2:1, above the text, or beside it on the lead from 735px and on a lone tile), the category (`t-news-cat`: company, "· Sample" for a sample story), the **H2** title as the card's only link (stretched over the whole card), the interview question in `--text-2`, the headline stat (first metric whose value has a digit, `Stat card`, coloured `--hl-1…4` by desk position; no footnote ref here) and the month and year (`<time datetime="YYYY-MM">`; story dates are first-of-month placeholders). Surface `--bg`, radius 24 / 32 and padding 24 / 32 (below / from 1069px), no shadow. No chips, no second link, no disclosure.
- **Role anchors:** the first story of each role (newest first) has `id` = the role slug (`deskAnchors`, `star.ts:63-75`), as a lead or tile `<article>` or a list `<li>`, so Experiences links to `/star/#<role-slug>` and the local nav land there below both bars.
- **No filter:** the competency chips, the "No stories match." state and `scripts/star.ts` are gone. The competencies show as a meta line on each story page. The `/star/` page ships no client script of its own.
- **Story page `/star/<slug>/`** (an article, `src/pages/[...lang]/star/[slug].astro:74-135`): local nav = the role name as the title and **All stories ›**. One start-aligned column on `--article` (653px at L). **Header:** category (role · company, plus a "Sample" chip) and month and year, the story title as **H1**, an "Interview question" label (`star.question`) with the question as the standfirst, the competencies as a dot list, a keyline. Then the story **diagram** (when set; 2:1, `role="img"`, `aria-label` = `imageAlt`), the optional lead note, and four sections with an **H2** each (`section#situation`, `#task`, `#action`, `#result`) holding the story's prose; the Action keeps its list. The Result section ends with every `metrics` entry as a stat lockup (`Stat card`, plus **graph bars**, §5.10.9, for a metric with `compare` values). A closing block holds "More from In practice" (the two newest other stories) and **All stories ›** and **Read the role ›** (`/experiences/<role-slug>/`). Last, the **footnotes band** (§5.10.12; `Footnotes`, `fn-title`): `numberNotes()` numbers only the metrics that have a `note`, from 1, in metric order; a metric without a note shows no ref. The note text is the story file's, shown verbatim. No hero, no quote, no super stat, no pinned stage, no JS.

**Acceptance criteria (In practice)**
- Every story file has exactly four H2 headings, `Situation`, `Task`, `Action`, `Result`, in that order (VI: `Bối cảnh`, `Nhiệm vụ`, `Hành động`, `Kết quả`); otherwise the build fails with an error naming the file.
- `/star/` has no filter and ships no client script of its own (`star.spec.ts`); an old `/star/?c=…` link loads the full desk, the query is ignored.
- The lead is the newest story by `date` (equal dates by slug), not the `featured` one: `deskSlots` (`src/lib/star.ts:54-56`) gives lead = 1st, tiles = 2nd and 3rd, list = 4th onwards, for any number of stories.
- On a story page every metric that has a `note` gets one numbered footnote (§5.10.12) and no other metric does; every ref links to its note and every note links back.
- Every local-nav link lands the role's newest story (lead, tile or list item; `deskAnchors`, `src/lib/star.ts:63-75`) below both bars and in view, and so does `/star/#<role-slug>`.

### 4.5 Blog

**Index (`/blog/`), topics (`/blog/topics/…`), tag pages (`/blog/tags/<tag>/`) and series pages (`/blog/series/…`)**
- **Blog style rule** (owner, `blog-like-experiences`): the blog index and every post page use the Experiences style of §4.2.0 and §5.10.4: the Experiences hero on the index (posts keep the Newsroom header below), one grey band of white cards on the 980px column, start-aligned "X." group headings with full stops, a 1px `--border` rule between groups, and the card shell (radius 28 from `--radius-lg`, padding 28 / 24). Cites: `src/pages/[...lang]/blog/index.astro:28-40` (hero, band, groups), `src/components/blog/PostCards.astro:21-43` (post to card mapping), `src/components/experiences/CardGroup.astro:166-169` (the `posts` variant), `src/layouts/PostLayout.astro:144-155` (closing band). Box shells and radius tokens: `SeriesBox.astro:31-34`, `Toc.astro:33-36`, `Callout.astro:30` (`--radius-md`), `PostCover.astro:29` (`--radius-sm`), `PostLayout.astro:195` (`--radius-md`). Unchanged: topic, series and tag pages, the post header and article, `MoreFrom` (used by `/star/` only), Experiences.
- **Hero:** the Experiences hero, not tight (`blog/index.astro:28`): eyebrow "Blog", **H1** *"Notes on data and tools."*, the subhead as Lockup copy (i18n). Tag page: H1 "#<tag>", subhead "<n> posts". Series page: H1 the series title, subhead "<x> of <y> published", then the series description. Topic page: eyebrow "Topics", H1 the topic title, then the topic intro (plain text, from the `topics` body, §6.9).
- **Local nav:** title "Blog"; links All posts · Topics · Series; small pill **RSS**. Tags are not in the local nav; the footer "Writing" column links to `/blog/tags/`.
- **Index:** one grey band (`Section#posts`, `--surface-2`, `blog/index.astro:30`) with an H2 "Latest." (`blog.latest`) over the newest post's card; then, when there are more posts, a 1px `--border` rule (`CardGroup` `rule`) and an H2 "More posts." (`blog.more`) over the rest, newest first, three up at L, two at M, one at S (`PostCards.astro:21-43`, `blog/index.astro:31-34`). It is not grouped by topic and has no jump links. Each series part is its own card; a standalone post is one card. The cover-credit line, when any cover has a `heroImageCredit`, closes the band (`blog/index.astro:35-39`). Tag, topic and series pages are unchanged.
- **Post card** (`CardGroup` `variant="posts"`, `CardGroup.astro:166-169`): the card shell of §5.10.4, white, radius 28, padding 28 (24 at S), minimum 180px at M and L, equal heights per row (`CardGroup.astro:170-176,330-332`). The cover sits above the eyebrow in the logo slot (`CardGroup.astro:98-108`): `heroImage` (decorative, `alt=""`) or a generated token cover (`PostCover.astro`: series name or "Article" label, large part number or the title's first letter, `aria-hidden`), 112px square at M and L and 72px at S (`PostCover.astro:27,75-77`). Then the eyebrow ("Part N · Series" for series posts, else "Article"), the H3 link (the short part title for a series part), the description (three lines, `CardGroup.astro:294-300`) and the meta line "date · reading time" (`CardGroup.astro:132`, `PostCards.astro:34`). The title link is at least 44px tall and stretches over the card (`CardGroup.astro:306-310`). At 200% text a long word wraps inside the card (`CardGroup.astro:301-305`, a posts-only `overflow-wrap: anywhere`, for reflow at 320px and 200% text). The whole card is one link.
- **Series page hero:** the first published part's `heroImage`, centred under the lockup (280 / 240 / 200px, radius 18, keyline outline, alt from `blog.coverAlt` with the series title).
- **Topics index** (`/blog/topics/`): one hairline row per topic (title, description, post count), ordered by `order`. **Topic page** (`/blog/topics/<slug>/`): the hero above, then a hairline list without group headings in which a series is one row with its parts nested beneath it (short part titles, each a link with date · minutes; unpublished parts show a "Coming soon" chip and are not links). Empty topics get no page.
- **Series index** (`/blog/series/`): one Newsroom tile per series with "<x> of <y> published". **Series page:** the same hairline list for one series, every part in reading order, with part number, title, description, reading time and status; unpublished parts show a "Coming soon" chip and are not links.
- **Tags** (`/blog/tags/`): all tags as chips with counts. Tag slugs are lowercase kebab-case.
- `draft: true` posts are hidden in production builds and shown in `astro dev`.

**Post (`/blog/<slug>/`), Apple Newsroom style**
- **Local nav:** title = the series name (or "Blog"); link **All posts ›**.
- **Header** (on `--bg`, left-aligned in the article column, like Newsroom†; category → headline 20px†, date 4px† below the category, and a 1px `--border` keyline 653px wide 44px† below the meta line, 36† at M, 32† at S):
  - eyebrow in Newsroom style (12px, 600, uppercase, `--text-2`): *"DEVELOPER TOOLS · PART 1 · NEOVIM SETUP GUIDE"* (topic, then series), or just the topic, or *"ARTICLE"*;
  - the date (and "Updated <date>" if set) in Body-reduced 600;
  - **H1** in Article headline size (§5.4, 700 as Newsroom†);
  - the description as the Article subhead (24px / 500 / 28px line-height / 0.009em†, `--text`†, 20px† below the H1);
  - a meta line: reading time · tag links.
- **Hero:** when `heroImage` is set, a square image with alt text "Cover art: <post title>" (`blog.coverAlt`), loaded eagerly with `fetchpriority="high"` (it is the LCP element), centred, 480px wide at L, 400px at M and the full column width at S (radius 18, 1px keyline outline) sits below the header keyline and above the series box, at 44 / 36 / 32px spacing, with the `heroImageCredit` as a Caption-size `--text-2` caption ("Cover art: …"). It is excluded from search (`data-pagefind-ignore`). The OG image stays `og-default.png`.
- **Series box** under the header: *"Part 1 of 5 · Neovim setup guide"*, then the ordered list of all parts. The current part is bold, published parts are links, and unpublished parts are `--text-2` with a "Coming soon" chip and are not links. At S it collapses to a single "Part 1 of 5 ⌄" `<details>` line. Its shell is the card shell: radius 28 (`--radius-lg`), padding 28, and `0 24px` at S (`SeriesBox.astro:31-34,79-82`).
- **Body:** the article column (§5.2), Article body size, `--text`. Paragraphs are 1.4211em† apart. H2s in Article section size (700†) with 52 / 48 / 44px† above and 16px† below. Images and diagrams may break out to the content width.
- **Quote:** an MDX `<Quote by="…" role="…">` renders as a Newsroom pull quote (§5.10.8). **Drop cap:** with `dropcap: true` in frontmatter (§6.7), the first paragraph opens with a drop cap (§5.10.8).
- **TOC:** sticky on the right at ≥ 1280px, **on the column** (owner, photo-logos: its right edge is the nav and footer edge, 1210px at 1440, and on wide screens the article starts at the column's left edge, 230px at 1440; pinned in `tests/e2e/alignment.spec.ts:558-601`; the 980px column is the article track, the leftover gap and a 248px rail: `PostLayout.astro:165-180`, `Toc.astro:84-92`), and the post hero image stays centred in the article track (lead, photo-logos: an image, not text) (top offset `var(--sticky-h) + 24px`; at scroll 0 its top lines up with the category eyebrow), Caption-size links at a 26px pitch for single-line items, the current item `--text` and the rest `--text-2`, built from H2/H3, with the current section highlighted while scrolling. Below 1280px it is a collapsed `<details>` "On this page" above the body, with the same card shell: radius 28 (`--radius-lg`), padding `0 28px`, `0 24px` at S (`Toc.astro:33-36,75-78`).
- **Code blocks:** Shiki with light/dark themes matching the site theme, on `--surface-2` with an 18px radius; a language label and a **Copy** button. They support a **filename title** (` ```lua title="lua/config/lazy.lua" `) as a header bar, **line highlights** (` {3-5} `) on `--fill`, and `shell`/`sh` blocks whose `$` prompt is **not copied**. At S they run to the screen edges with no radius and scroll inside.
- **Callouts:** `<Callout type="note | tip | warning">` renders as a `--surface-2` panel with an 18px radius, a 4px left accent in `--link`, an icon and a bold label ("Note", "Tip", "Warning"), with `role="note"`. The text sits 20px from the border's outer edge on every side (`padding: 20px`, 16px after the 4px start border), and the 22px icon is centred on the label's first line (`margin-top: calc((1lh - 22px) / 2)`; `Callout.astro:23-48`; `alignment.spec.ts` pins four equal sides and the icon centre within 0.5px). Types differ by icon and label, not by colour.
- **Keys:** `<kbd>` is a small rounded keycap on `--fill`, e.g. <kbd>Space</kbd> <kbd>f</kbd> <kbd>f</kbd>.
- **Diagrams:** inline SVG components (§4.5.1).
- **Closing band** (Experiences style, `blog-like-experiences`): after the article, one grey band (`Section#read-more`, `--surface-2`, `PostLayout.astro:144-155`) with an H2 *"More in this series."* (`blog.moreSeries`) for a series part, else *"More to read."* (`blog.moreFrom`), over up to two cards in the post-card shell above (`PostCards`, `id="more-reading"`, `PostLayout.astro:147-152`). For a series part the cards are the previous and next **published** parts (`seriesNeighbors`; unpublished parts are skipped); otherwise the older and newer posts by date (`adjacentPosts`, `src/lib/blog.ts:90-93`). The band sits in `data-pagefind-ignore` (`PostLayout.astro:146`), so other posts' text stays out of this post's search entry. Cards fill the three-column grid from the left, so one or two cards leave the right columns empty. Then the footer.
- **RSS:** published parts appear like normal posts, with the title prefixed "Part N:" only when it doesn't already include it.

**Series (content)**
- A post joins a series through `series` + `seriesPart` frontmatter (§6.7). The series itself is defined in the `series` collection (§6.8), which lists **every planned part**, including unwritten ones.
- On the blog index each part is its own card; the topic and series pages nest the parts under the series row, linking to the series page.
- A series or a standalone post can belong to a topic (`topic`, §6.7, §6.8); posts in a series inherit the series topic.

#### 4.5.1 Inline SVG diagrams

- Each diagram is an Astro component in `src/components/blog/diagrams/` that renders inline `<svg>` and inherits the theme. Colours use the CSS tokens (`--surface-2`, `--fill`, `--border`, `--text`, `--text-2`, `--link`), never hard-coded hex values.
- **Accessibility:** `role="img"`, `<title>` and `<desc>`, plus a visually hidden ordered list describing the same flow.
- **Responsive:** a horizontal layout at M and L and a vertical layout at S, chosen with CSS (twin SVGs, only one shown). Text stays at least 14px, with no horizontal scroll.
- **i18n:** file and plugin names stay as they are; captions come from a `lang` prop.
- **Where used:** blog posts, and project pages through `design.diagram` (`AidlcKitDiagram`, the AI-DLC kit).
- **`AidlcKitDiagram`:** a lifecycle flow in three lanes (Human, Lifecycle, Agents; lane labels from `lang`). Human lane: an **intent** chip, a **sign-off** chip between Inception and Construction, and a final **sign-off** chip with **lead merges**. Lifecycle lane: three phase cards (Inception · research, requirements · units, architecture; Construction · unit by unit, skeleton first, test-first · debug; Review · fresh context, rerun the tests) with the four gate bars inside them (`spec_ready` closes Inception, `unit_done` and `review_now` close Construction, `review_risk` closes Review). Agents lane: Antigravity (research · architecture), Codex (build · debug) and Claude (fresh reviewer) chips under their phases, a **Lead · Claude** bar (plans · routes · runs gates · merges) and a dashed **Jev (optional)** chip (advises). The story (phases, gates, sign-offs) is drawn stronger than the agents lane. A hidden ordered list of six steps repeats the flow; the caption is "Three phases, four gates, two human sign-offs. Agents do the work inside each phase." Wide `viewBox` `-10 0 700 534` (shown from 768px); vertical `0 0 300 957` (max-width 420px), a single stack with the agents as an inset strip inside each phase card. Title, `<desc>`, lane labels, captions and steps come from the `lang` prop (EN/VI); tool, gate, phase and track names stay as they are.
- **RSS:** the feed gets the ordered list as a text fallback.

**RSS:** `@astrojs/rss` at `/rss.xml` (EN) and `/vi/rss.xml` (VI), published posts only, with title, description, date and link.

**Acceptance criteria (Blog)**
- The series box lists every part; unpublished ones are not links. Previous/next parts skip unpublished parts. `/blog/series/neovim-setup-guide/` shows "5 of 5 published".
- The TOC highlights the active section at ≥ 1280px and is a collapsed `<details>` below.
- The Copy button copies the code without `$` prompts.
- Diagrams have `role="img"` and a title, and switch layout between S and M.
- RSS is valid XML.

### 4.6 Projects (`/projects/`)

A main-nav page with **all** projects (personal, work and open source). Every project also has a product page (§4.6.1).

- **Hero:** no eyebrow, **H1** *"Things I've built."*, subhead *"Personal, work and open-source projects."* (i18n). No actions.
- **Local nav:** title "Projects"; **All · Personal · Work · Open source** (with counts) setting `?kind=` when two or more kinds exist; the small pill **Download CV**. The current kind has `aria-current="true"`. Without JavaScript, every project shows and the kind links are hidden.
- **Lineup** (Layout A, apple.com "explore all" tiles): the feature grid (`.tiles-2up--feature`, §5.10.3), one tile per project, featured first then `start` descending; an odd last tile spans both columns. Tile: no eyebrow, H2 title (Promo), subhead = subtitle, **See the project** (primary, accessible name "See the project: <title>", → `/projects/<slug>/`) and at most one secondary (**Repo ↗**, else **Live ↗**, else **At <company> ›** (→ `/experiences/<role-slug>/`) when `role` is set); visual = `image` in a CSS laptop frame (§5.10.13), centred under the lockup. No dates, summary, chips or expanders: the product page carries them.
  - Filtering hides non-matching tiles and the grid closes up (odd-count rule).
- **Empty state:** if a filter matches nothing (e.g. a hand-edited URL), the grid shows *"No projects here yet."* and a **Show all** button.

**Acceptance criteria (Projects)**
- **Projects** appears in the global nav after **Experiences**, on desktop and in the mobile menu, with `aria-current="page"` on `/projects/` and `/vi/projects/`.
- Adding a file to `src/content/projects/` adds a tile with no code changes. An unknown `kind` fails the schema.
- Adding a project file adds a tile and a product page with no code changes. Filtering updates the grid and the URL; Back/Forward works; `/projects/#<slug>` scrolls to that tile (resetting a hiding filter). Every project bullet from `cv.tex` appears on its product page.

#### 4.6.1 Project page (`/projects/<slug>/`)

Layout B: local nav (title · **All projects ›**); tight hero (no eyebrow, H1 title, subhead subtitle); a band with `image` in a CSS laptop frame (§5.10.13), eager, `fetchpriority="high"`; **Get the highlights.**: the big stat strip of `stats` (≤ 3; 72 / 48 / 28px), each with its footnote; **The problem.** / **The approach.** (with the terminal loop when `loop` is set) / **The design.** (`design.intro`, the diagram named by `design.diagram` (§4.5.1, `AidlcKitDiagram`: a lifecycle flow of three phases, four gates and two human sign-offs, with a six-step text alternative), then up to 4 `design.decisions` as highlight cards) / **The workflow.** (`workflow.intro`, then `workflow.steps` as numbered highlight cards; every decision and step reads **Label:** problem, choice, benefit) / **The result.** (then the bold-labelled bullets as the closer look (§5.10.14, no image: the laptop frame above shows the cover; with fewer than 2 labelled bullets, highlight cards instead)); closing **More from the work.** (All projects · Download CV, **At <company> ›** (→ the role page `/experiences/<role-slug>/`) when `role` is set); footnotes. Band tones come from the rendered sequence, alternating from the white hero (all present: image band grey, stats white, problem grey, approach white, design grey, workflow white, result grey, more white); a missing section shifts the rest (`bandTones`, `src/lib/bands.ts`).

All copy comes from the project file. Indexed for search as Projects.

### 4.7 404

- **Hero:** **H1** *"Page not found."*, subhead (i18n), **Go home** (primary) · **Search** (secondary, opens search). Below the actions, an illustration of a magnifying glass over an empty page (§5.10.11; 288 / 280 / 240px wide, 4:3, `notFound.art`).
- **Site index** (§5.10.10) on a `--surface-2` section: **Explore** (elevated links: Experiences · Projects · Skills · In practice · Blog), **Latest writing** (the 3 newest posts), **Connect** (Email · LinkedIn · GitHub · Download CV). Then the footer.
- Acceptance: every index link resolves to a 200 page; the first group's links are 28px at 1440 and 21px at 375.

### 4.8 Skills (`/skills/`)

- Apple Tech Specs (Layout B). A tight hero (no eyebrow, H1 *"The tools I build with."*, subhead *"From ingestion to data quality, on AWS and Azure."*), then one `--surface-2` band holding the rows in `--content`: one per `skills` entry in `order`, then **Certifications** (name; issuer · year; **Verify ›** when `credentialUrl` is set; a planned entry reads *Anthropic · Planned · Apr 2027* (`/vi/`: *Anthropic · Dự kiến · 04/2027*), with *Planned* in `.cert-status` and no link or credential ID, `skills/index.astro:134-142,185-188`; its `li` carries `data-planned`, `:121`) and **Languages** (`profile.spokenLanguages`). Every certification row starts with a mark in the **Mark box** below (`skills/index.astro:119-133`): the earned rows show the issuer's mark (AWS and Datadog, plated on dark by the same `iconPlate()` rule as the tool marks, `src/lib/tool-icons.ts:104-108`) and the planned row shows the **Claude mark**, `logos:claude-icon` from the entry's own `logo` (`src/content/certifications/en/claude-certified-architect.md:5`). The owner asked for it: it reverses the earlier "no logo on the planned certification" rule, and it is the Claude product mark, not Anthropic's logo. The Claude mark takes no plate: it has one colour, `#d97757`, at 3:1 or better on dark `--surface-2` (5.4:1; `tests/unit/tool-icons.test.ts:403-407`, `tests/e2e/skills.spec.ts:293-302,331`). A certification entry with no `logo` would keep an empty B × B slot (`skills/index.astro:123`) so the names stay aligned; the separate 20px certification slot is gone and `.tool-slot` serves both. The print page and the PDF show no logos (`tests/e2e/cv-projects.spec.ts:40-41`), and the print page's planned line has text and no link (`tests/e2e/certs.spec.ts:122-131`).
- Each row: the name (H2, Card headline size) in a `flex: 1 1 220px` label column, then the description (Body-reduced 14px, `--text-2`) and the items in an `auto-fill, minmax(200px, 1fr)` grid (17/600; children as a 14px `--text-2` line below). 1px `--border` hairlines above every row and below the last; rows are padded 32px; the columns stack when they no longer fit.
- Only real brand logos are shown, never a neutral glyph and never a different brand's mark. A tool row that has a brand mark starts with one decorative 20px icon (`aria-hidden`; the name stays the only accessible text) in a 24px mark box (**Mark box** below): 16 of the 39 rows, in the brand's original colours (`@iconify-json/logos`, plus Talend and Apache Spark from `src/icons/*.svg`). The other 23 rows (concepts, methods and practices such as SQL, ETL/ELT, Monitoring and Agile/Scrum) have no icon. In a band that has some logos (Data Engineering, DevOps & IaC, Backend Engineering; Cloud Platform has all) they keep the same empty 24px slot (`aria-hidden`, `skills/index.astro:288-292`), so every name in the band starts at the same x; in a band where no item has a logo (AI Engineering, Methodologies) there is no slot and the names sit flush with the band's left edge. `src/lib/tool-icons.ts` maps each name to its icon; a tool with no entry has no icon. In dark theme, the 6 marks whose darkest colour is under 3:1 on `--surface-2` (Python, Apache Airflow, AWS, Azure, Datadog, PostgreSQL) sit on the white `--mark-plate`, which is the mark's own box (no shift between themes); marks are never recoloured. Children (the sub-items under a row, such as EMR, S3 and CDK under AWS) are a wrapping line of names. Each brand sub-item has one decorative 16px icon (`aria-hidden`) in a 20px mark box: Spring Boot, S3, Athena, Redshift, Lake Formation, Databricks, CloudFormation and Terraform. Amazon EMR and the AWS CDK have no installed brand mark, so they have no icon and keep the empty 20px slot. They are mapped in `CHILD_ICONS` in `src/lib/tool-icons.ts`, and the same dark-theme plate rule applies (S3, Athena, Redshift, Lake Formation, CloudFormation and Terraform are plated; 12 plated marks in all). Below the band, one `--text-2` line: *"Names and logos belong to their owners; no endorsement implied."* (`skills.logosNote`, en and vi). No chips or cards. Not in the search index. Every skill, certification and language from `cv.tex` appears here.
- **Mark box** (owner, photo-logos: "icons must be properly aligned on all sides"; wide marks keep the same square box). One rule, written once, for every mark that sits beside a label. The mark is an `svg` whose border box is the square B = M + 2p (`box-sizing: content-box`, equal padding p on all four sides, no negative margin), so the dark plate (`--mark-plate`, `tokens.css:33-35`) is the box itself and shifts nothing between themes. The glyph is contained and centred in its M × M content box: a wide wordmark keeps the same square box with the glyph centred, never a wider box. The box starts on the row's start edge, the label starts B + g later, and the box's centre is the centre of the label's first line (`margin-block-start: calc((1lh - B) / 2)`; `1lh` resolves against the svg's inherited line-height); the lines under a label (description, *issuer · year*, **Verify ›**) indent by B + g (`:297-299,277-283`). An empty slot is B × B. A long label may break anywhere (`overflow-wrap: anywhere`) rather than push the page sideways. `1lh` needs Chromium 109, Safari 16.4 or Firefox 120; without it the box is top-aligned, at most 0.5px off.

| Context | Box B | Glyph M | Padding p | Gap g | Source |
|---|---|---|---|---|---|
| Tool row name | 24 | 20 | 2 | 8 | `skills/index.astro:246-262,288-292` |
| Sub-item | 20 | 16 | 2 | 6 | `:263-266,293-296,308-314` |
| Certification row name | 24 | 20 | 2 | 8 | `:246-262` |
| Tech stack tool (`/experiences/`, §4.2.0; owner, techstack) | 24 | 20 | 2 | 8 | `CardGroup.astro:204-220` |
| *Next.* step name (Home `#next` only; on `/experiences/` the planned cert is a 32px card mark, owner, next-card) | 24 | 20 | 2 | 8 | `NextStep.astro:57-68` |

  The certification cards on `/experiences/` are the one other context: a 32px box with no padding, 12px above the eyebrow (§4.2.0). The Tech stack tool mark repeats the tool-row rule (and the two shifts below) in `CardGroup.astro` (`:204-220`), the plate without a ring. Two marks are shifted inside their box for optical centring (lead, photo-logos: accepted as shifts instead of a per-mark tolerance), because their artwork sits off-centre in its own viewBox (Java 0.8px right and Terraform 0.7px low of the box centre, read from rendered pixels): `logos:java` `translateX(-14px)` and `logos:terraform-icon` `translateY(-12px)` in viewBox units (`:267-276`); the marks themselves are untouched and never recoloured. `tests/e2e/logo-box.spec.ts` pins the geometry (box, centre, gap and slot) at 1440, 1024, 390 and 320 in light and dark, EN and VI, and reads the ink at 3x to check each glyph is centred in its box.

## 5. Design system

The site follows **apple.com** as closely as a text-only portfolio can. Values marked † were measured from apple.com's live CSS (October 2026: the global nav, local nav, footer, homepage, iPhone, MacBook Pro and Newsroom stylesheets). Unmarked values are this site's own choices in the same spirit. Everything here applies to every web page; the print/PDF layout (§4.3) keeps its own styles.

### 5.1 Principles

- **White first.** White pages, Apple's light grey `#F5F5F7` for alternate bands, near-black text, blue only for things you can act on; and four position colours for the highlight-card numbers (§5.3). No band or card is black in the light theme. No gradient backgrounds, glows or pastel surfaces; the one exception is a single gradient-text phrase per page, as Apple does† (§5.10.8).
- **One idea per section.** A short headline, one subhead, at most two actions. Detail lives one click deeper.
- **Big type, few weights.** Headlines are 600 (700 only in the Newsroom-style blog post and tiles†); body is 400. Hierarchy comes from size and space, not colour or decoration.
- **Space from padding.** Sections touch (inner pages); no cards with shadows, no borders around sections. Home draws no hairlines either: its wall tiles carry a 1px `--keyline` outline (§5.3).
- **Calm, purposeful motion** that never blocks reading and turns off completely under reduced motion.
- **Same parts everywhere:** every page uses the same nav, local nav, hero, section, tile, card, button and footer components.

### 5.2 Breakpoints and layout

| Name | Width | Used for |
|---|---|---|
| **S** | ≤ 734px† | Phones: one column, phone type sizes |
| **M** | 735–1068px† | Tablets and small laptops |
| **L** | ≥ 1069px† | Desktop (also covers Apple's 1441px+ "xlarge"; nothing changes above 1440px) |
| **Compact chrome** | ≤ 833px† | Global nav, local nav and footer switch to their phone versions |

- CSS uses `max-width` queries at these exact values (`(max-width: 734px)`, `(max-width: 1068px)`, `(max-width: 833px)`) so they match Apple's. The old 640 / 768 / 1024 / 1280 Tailwind breakpoints are not used for layout. One exception: the blog TOC needs room and appears at ≥ 1280px.
- **Content widths:**

| Token | L | M | S | Use |
|---|---|---|---|---|
| `--content` | 980px† | 692px† | 87.5%† | Text columns: headers, subheads, most sections |
| `--content-wide` | `max(--content, min(87.5%, 1260px))`† | `max(--content, 87.5%)` | 87.5% | Card grids, skill grid, sticky storytelling, the Home identity row and `#next` (`tokens.css:55,97`); never narrower than `--content` |
| `--wide-inset` | 140px at 1440 | (`--content-wide` − `--content`) / 2 | 0 | The padding inside every wide box (`.container-wide`, `.section-inner--wide`, `.chapter-grid`), so its **content** is the `--content` column: text starts and ends where the nav and footer do (`tokens.css:56`; `global.css:365-372`; `blocks.css:24-26,1178-1185`) |
| `--article` | 653px† | 576px† | 87.5%† | Blog post body |
| `.chrome-row` | `--content` (980px) | `--content` (692px) | `--content` (87.5%) | Nav, local-nav, footer and search-panel rows: `width: min(var(--content), 100% - 2 × max(var(--gutter), env(safe-area-inset-left), env(safe-area-inset-right)))`, no padding of its own (`global.css:374-384`), so their first glyphs line up with the content at x = 230 at 1440 and 104 at 900. There is no `--chrome` or `--chrome-nav` token |

- **Both columns, edges aligned** (owner, photo-logos: "keep both columns, align edges"): wide blocks keep their `--content-wide` box, but their content starts and ends on the `--content` column, the same edges as the nav and the footer (x 230 to 1210 at 1440, 166 to 858 at 1024, 87.5% at 390 and 320). A card's border box is on the column and its text is inset by the card's padding. Only full-bleed art (the Home wall, the Projects tile band) runs edge to edge; at S a full-bleed grid tile pads its content to the column (`blocks.css:340-350`). `tests/e2e/alignment.spec.ts` pins this on every page type (§12).
- **Gutters:** the chrome rows have no padding of their own; the gutter (22px†, 16px† at compact chrome) is only the floor kept between a row and the screen edge where the column would come closer. Content columns are centred by width, so the 87.5% at S leaves about 23px on each side of a 375px screen.
- **Safe areas:** with `viewport-fit=cover`, the chrome row's width subtracts `2 × max(<gutter>, env(safe-area-inset-left), env(safe-area-inset-right))` and the footer adds `env(safe-area-inset-bottom)`.
- **No horizontal page scroll** at any width from 320px. Wide content (code, tables) scrolls inside its own box.

### 5.3 Colour

The default theme is **light (white)**, whatever the system setting (§5.12).

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#FFFFFF`† | `#000000`† | Page and white bands; cards on grey bands |
| `--surface-2` | `#F5F5F7`† | `#1D1D1F`† | Grey bands, grid tiles, cards on white bands, footer, code blocks |
| `--surface` | = `--bg` | = `--bg` | Kept as an alias for "cards on grey bands" |
| `--fill` | `#E8E8ED`† | `#333336`† | Neutral chips, keycaps, code line highlights |
| `--text` | `#1D1D1F`† | `#F5F5F7`† | Primary text |
| `--text-2` | `#515154` | `#AEAEB2` | Secondary text, eyebrows, captions (7:1 on `--bg` and `--surface-2`; darker than Apple's #6E6E73/#86868B for contrast) |
| `--border` | `#D2D2D7`† | `#424245`† | Hairlines, separators |
| `--keyline` | `rgba(0,0,0,.16)`† | `rgba(255,255,255,.24)`† | Bottom line of the nav bars; the 1px outline of the Home wall tiles (§4.1.2) |
| `--accent` | `#0053A6` | `#5CB0FF` | Primary pill fill (text `--on-accent`), focus ring, current career-rail bar, highlighted graph bar |
| `--accent-hover` / `--accent-active` | `#0056AD` / `#004C98` | `#6DB8FF` / `#4BA8FF` | Primary pill states (each ≥ 7:1 with `--on-accent`) |
| `--link` | `#00509F` | `#5CB0FF` | Text links, chevron links, secondary pill |
| `--on-link` | `#FFFFFF` | `#000000` | Text on a `--link` fill (secondary pill hover); 7.93:1 light, 9.11:1 dark |
| `--on-accent` | `#FFFFFF` | `#000000` | Text on an `--accent` fill (primary pill); white 7.53:1, black 9.11:1 |
| `--nav-glass` | `rgba(250,250,252,.8)`† | `rgba(22,22,23,.8)`† | Global and local nav, with blur |
| `--nav-solid` | `#FAFAFC`† | `#161617`† | Mobile menu and search panel; `.92` opacity fallback when blur is not supported† |
| `--curtain` | `rgba(232,232,237,.4)`† | `rgba(0,0,0,.4)` | Blurred page curtain behind the search panel |
| `--mint-tint` | `#A8E6CF` @ 35% | `#A8E6CF` @ 12% | **Only** tech highlights, tech chips and the "Current" chip |
| `--hl-1` … `--hl-4` | `#0B5D52` / `#8C3800` / `#6136AD` / `#A01549` | `#64D2B4` / `#FFA24D` / `#C9A7FF` / `#FF8FB3` | **Only** the In practice desk cards' stats, by desk position, cycling every four; never a surface |
| `--mark-plate` | `#FFFFFF` | `#FFFFFF` | **Only** the plate behind a mark that fails 3:1 on the dark surface (`iconPlate`, `tool-icons.ts:104-108`): the mark's own box on `/skills/` and the *Next.* step, the 4px ring on the `/experiences/` certification cards; never themed, never recoloured, painted in dark only (`tokens.css:33-35`) |
| `--warm` | `#F1E7E0` | `#413226` | **Not used by Home any more** (owner, avatar-title: the cut-out frame `.pop` has no `background`, transparent in light and dark, `HomeWall.astro:213-222`); the token stays defined (it was only ever the frame behind the Home cut-out;  `--hl-2` at 12% into `--bg` in light, at 16% into `--surface-2` in dark, written out as hex like every token, `tokens.css:30-32`); no text sits on it |

- **Bands and cards:** sections alternate `--bg` and `--surface-2`. Cards and tiles take the **opposite** colour of the band they sit on. No shadows and no borders on cards, tiles or sections. **Exception (owner, home-alt-6):** Home's wall tiles carry a 1px `--keyline` outline, like the nav photo (`outline: 1px solid var(--keyline)`, `HomeWall.astro:161-162`); Home draws no warm surface any more: `--warm` (`light-dark(#f1e7e0, #413226)`) is unused by Home, and the photo frame has no fill (owner, avatar-title). **Exception (lead, photo-logos: the existing `CompanyLogo` exception, extended to the certification card marks by the plan):** a mark on a plate carries the plate's 4px ring as `box-shadow: 0 0 0 4px var(--mark-plate)`, the same ring `CompanyLogo` has long drawn behind a role-card logo without a dark file (`CompanyLogo.astro:57-72`) and now `CardGroup` draws behind the AWS and Datadog certification marks (`CardGroup.astro:238-251`); it belongs to the logo, not to the card. Nothing else on Home has a border, a shadow or a tone change except the closing band (`--surface-2`). No band or card sets `color-scheme: dark`; the featured-story stat card sets `color-scheme: light` and stays white in both themes (its diagram keeps the light tokens too).
- The old `--sky-*`, `--butter-*` and `--mint-ink` tokens and the hero glow are removed. Mint survives only in the three uses above, never on anything larger than a chip.
- Every text token reaches **7:1** (WCAG AAA) on the backgrounds it is used on, in both themes. The blues reach 7:1 too: `--link` and `--hl-*` on `--bg`/`--surface-2`, `--on-accent` on every `--accent` state and `--on-link` on `--link`. Two exceptions stay at least **4.5:1**: `--ft-pipe` (separator glyphs) and `--text-2` on `--fill`. Large text and UI keep at least 3:1. Checked by `tests/unit/contrast.test.ts` (rgba tokens composited over their band) and by axe in CI.

### 5.4 Typography

- **Font stack** everywhere, including blog bodies: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", "Inter Variable", "Inter Fallback", Helvetica, Arial, sans-serif`. "Inter Fallback" is Arial scaled to Inter's metrics, so the swap does not shift the layout. Apple devices render SF Pro (Text below 20px, Display at 20px and up†) with no download. Self-hosted Inter (Latin + Vietnamese subsets, `font-display: swap`) is the fallback elsewhere and is **not preloaded**, so Apple devices never fetch it. Newsreader is removed. No third-party font requests.
- `-webkit-font-smoothing: antialiased; font-synthesis: none`†. The root font size stays 100% (Apple's 106.25% root is not copied, so Tailwind spacing stays predictable); sizes below are in px for clarity and written in rem in CSS.
- **Apple sizes (v5.0):** every size is apple.com's, so the v4.x +2px and the larger M/L headlines are reverted. The one exception is the page hero, which is **96px at L** as in Layout A (64 / 40 at M / S). Role-page titles (§4.2.3) use the M hero size at L too (64 / 64 / 40, `Hero compact`), so long role titles keep the peek rule. At S the headlines stay 40 / 32 / 32 / 32, so 320px with 200% text reflows. Display headlines track slightly tighter at M and L (Hero -0.022em, Unit -0.012em, Section -0.009em, Promo -0.005em); S keeps Apple's tracking. In practice story titles use the article title size (`.t-article-title`, §4.4). Local-nav links between 834px and 1068px keep a 10px gap (24px elsewhere). Compact-chrome sizes are unchanged (local-nav title 19px, small pill 12px, solo link 17px).
- **Code:** `ui-monospace, "SF Mono", Menlo, monospace`, 0.9em.

| Role | L | M | S | Line-height | Tracking | Weight |
|---|---|---|---|---|---|---|
| **Hero** (page H1) | 96 (Layout A) | 64† | 40† | 1.05† | -0.022em (M, L) / -0.015em† (S) | 600 |
| **Unit headline** (full-unit H2) | 56† | 48† | 32† | 1.0714† | -0.012em (M, L) / -0.005em† (S) | 600 |
| **Section headline** (inner-page H2) | 48† | 40† | 32† | 1.0835† | -0.009em (M, L) / -0.003em† (S) | 600 |
| **Promo headline** (grid tile H2) | 40† | 32† | 32 | 1.1† | -0.005em (M, L) / 0† (S) | 600 |
| **Subhead** | 28† | 24† | 19† | 1.1429† | 0.007em† | 400 |
| **Card headline** (H3) | 28† | 24† | 21† | 1.1429 | 0.007em | 600 |
| **Eyebrow** | 21† | 19† | 17† | 1† | 0.011em† | 600, `--text-2` |
| **Intro** | 21† | 21 | 19† | 1.381† | 0.011em | 400 |
| **Lockup copy** (`--text-2`, `<strong>` in `--text`†) | 21† | 21† | 19† | 1.381† (1.421† at S) | 0.011em† (0.012em† at S) | 600† |
| **Stat value** (strip) | 48† | 32† | 28† | 1† | -0.003em | 600, `white-space: nowrap`† |
| **Stat value** (card) | 28† | 24† | 21† | 1.1429 | 0.007em | 600 |
| **Body** | 17† | 17 | 17 | 1.4706† | -0.022em† | 400 |
| **Body-reduced** (card bodies at S, meta) | 14† | 14 | 14 | 1.4286† | -0.016em† | 400 |
| **Caption** (nav links, footer, chips) | 12† | 12 | 12 | 1.3334† | -0.01em† | 400 |
| **Article headline** (post H1) | 48† | 40† | 32† | 1.0835 | -0.003em | 700† |
| **Article subhead** | 24† | 21† | 21 | 1.25 | 0.009em | 400 |
| **Article body** | 19† | 17† | 17 | 1.42† | 0.012em† | 400 |
| **Article section** (post H2) | 24† | 21† | 21 | 1.1667 | 0.009em | 700† |
| **Newsroom tile title** | 24† | 21† | 21† | 1.1667 | 0.009em | 700† (clamped to 5 lines†) |
| **Newsroom category** | 14† | 12† | 12† | 1.2858 | 0 | 700†, uppercase, `--text-2` |
| **Quote** | 40† | 32† | 28† | 1.2† / 1.25† / 1.286† | 0 | 400† |

- Card bodies use Body at M and L and Body-reduced at S†.
- Headlines use `text-wrap: balance`. In **centred** lockups the subhead, lockup copy and eyebrow also use `balance` (no one- or two-word last lines); start-aligned copy and card bodies use `text-wrap: pretty`. Items in `·`-separated lists (skills, tags, meta lines) are `white-space: nowrap` spans with the `·` as the next item's `::before`, so a line never starts with a separator. Truncated text (gallery bodies, clamps) is cut at a word boundary, never mid-word. Cards and articles use `overflow-wrap: anywhere` for long URLs.

### 5.5 Spacing, shape and depth

- **Spacing scale:** multiples of 4px.
- **Section padding** (`--section-pad`, top and bottom): **120px / 80px / 56px** at L / M / S† (Apple's "reduced" section padding). Inner-page heroes (Projects, In practice, Blog) use **80 / 64 / 48px** below them (Appendix D), so the first section is in the first viewport. The page hero uses **144px / 120px / 112px**† on top and `--section-pad` below.
- **Section header → content:** 48px / 40px / 32px†.
- **Inside a header:** eyebrow → headline 8px; headline → subhead 6px†; subhead → actions 17px†; gap between actions 17px†.
- **Radius:** Grid tiles **0** (square, as on the Apple homepage†); cards **28px**†; the Home wall tiles 9px at S and 14px from 735px, the Home photo frame 12px at S and 18px from 735px (`--radius-sm`, `--radius-md`; §4.1.2, §4.1.3); images, code blocks and callouts **18px**†; chips and pills **980px**†; inputs 12px. Tokens: `--radius-sm` 12, `--radius-md` 18, `--radius-lg` 28, `--radius-pill` 980.
- **Depth:** none. No shadows anywhere, including the search panel and mobile menu; the curtain and solid panels separate them†. The named exceptions are two: the 4px white ring behind a plated logo (`CompanyLogo`, the certification card marks; §5.3), and the older 1px inset `--keyline` on a blog post cover (`box-shadow: inset 0 0 0 1px var(--keyline)`, `PostCover.astro:43`), a hairline that keeps a light cover visible on the white page, not a depth cue.

### 5.6 Buttons, links and chips

| Element | Spec |
|---|---|
| **Primary pill** | `--accent` fill, `--on-accent` text (white; black in dark), 17px, padding 11px 22px including the 1px border, radius 980px† (44px tall). Hover `--accent-hover`, active `--accent-active`†. |
| **Secondary pill** | Transparent, 1px `--link` border, `--link` text, same size. Hover: `--link` fill with `--on-link` text (white; black in dark). |
| **Small pill** (local nav) | Primary style at 12px†, padding 3px 10px† (24px† tall, transparent 1px border). A transparent `::before` extends the tap area to 44 × 44px; tap areas of neighbouring links and the pill must not overlap (keep at least 8px between them). |
| **Chevron link** | `--link` text with a trailing `›` (`aria-hidden`, 0.24em† before it), no underline; underline on hover. Used for "Learn more ›", "Read ›", "All stories ›". The accessible name has no chevron and adds context where the text is generic ("Learn more about my experience"). |
| **Text link** (in prose) | `--link`, underlined in article bodies and cards, no underline elsewhere; underline on hover. |
| **Chip** | 28px tall, padding 6px 12px with a 16px line, radius 980px, Caption size (12px) at 500 weight. **Neutral** chips (kind, competency, tag, series, "Coming soon") use `--fill` + `--text`. **Mint** chips (tech stack, "Current") use `--mint-tint` + `--text`. Interactive chips (filters, tags) have a 44px tap area and show their selected state with `--text` fill and `--bg` text. |
| **Icon button** | 16px icon in a 44 × 44px target, `--text` at 80% opacity, 100% on hover. |
| **Plus disc** (expanders) | A **36px**† circle in a 44 × 44px† target, 16px† from the bottom-right corner of its tile or card (13px† at M and S; a Projects tile's disc is in flow as its last row instead, §4.6), fill `--fill`†, a 2px "+" glyph in `--text` at 56%† (≥ 3:1 on `--fill`). Open: the "+" rotates 45° into "×" over 320ms `--ease`; background transition 100ms linear†. |
| **Paddle** (gallery) | A **36px**† circle in a 44 × 44px target; fill `rgba(210,210,215,.64)`† (hover `.70`†, active `rgba(193,193,198,.65)`†), arrow `rgba(0,0,0,.72)`; dark: fill `rgba(66,66,69,.72)`†, arrow `rgba(255,255,255,.8)`†. Disabled: opacity .42† and `disabled`. |
| **Focus ring** | 2px solid `--accent`, offset 1px† (3px on cards and tiles), on every interactive element. |
| **Hover lift** | Rounded whole-card links (gallery cards, Newsroom tiles) scale to **1.0161**† on hover with `transform .3s var(--ease-card)`† and `background-color .344s ease`†, only under `(hover: hover) and (pointer: fine)`†. Square full-bleed tiles never scale. |
| **Pressed state** | Round buttons (plus discs, paddles, icon buttons) press to `scale(.95)`†. On touch devices other controls set `opacity: 0.7` on `:active` for 100ms; `-webkit-tap-highlight-color: transparent`. Hover styles live only under `@media (hover: hover)`. |

- Actions always appear as **primary, then secondary**. Side by side when they fit; at S they wrap onto two centred lines rather than stretching full width.

### 5.7 Global nav

- **Bar:** **44px**† tall (**48px**† at compact chrome). On pages **without** a local nav (Home and 404) it is sticky at the top. On pages **with** a local nav it scrolls away with the page and the local nav sticks at `top: 0` instead, as on Apple product pages† (`#globalnav { position: absolute }`†), so only 48–52px of chrome stays on screen.
- **Background:** at scroll 0 the bar matches the page (`transparent`, no blur†); once content scrolls under it, it becomes `--nav-glass` with `backdrop-filter: saturate(180%) blur(20px)`†, transitioning `background .24s var(--ease)`†. Implemented with a CSS scroll timeline (`animation-timeline: scroll(root); animation-range: 0 1px`) under `@supports`; without support it is always glass. `--nav-solid` at .92 opacity when blur is not supported†. While the search panel or the mobile menu is open the bar is solid `--nav-solid`.
- `--nav-h` holds the bar height. `--sticky-h` is the height of whatever is stuck at the top: `--nav-h` on pages without a local nav (Home, 404), `--local-h` on pages with one. Every sticky offset and scroll margin uses `--sticky-h`; none hard-code a number.
- **Row (above compact chrome):** the `.chrome-row` (the column, §5.2), items spread with `justify-content: space-between`†: **brand** (a 28px round photo, the profile `avatar` via `NavAvatar.astro`, 1x/2x WebP, `alt=""`, 1px `--keyline` outline; the link is at least 44 × 44px with the photo flush left and is named by `aria-label` `nav.home`, "Ryan Parker, home" / "Ryan Parker, trang chủ"; without `avatar` it shows the name at 14px/600) · Experiences · Projects · In practice · Blog · **search** · **theme** · **language**. Links are Caption size, `0 8px`† padding, full bar height, coloured `--nav-ink` (`rgba(0,0,0,.8)`† / dark `rgba(255,255,255,.8)`†) and `--nav-ink-hover` (`#000` / `#fff`†) on hover and for `aria-current="page"`, with `color .32s var(--ease-nav)`†. Dim with colour, never `opacity`, so focus rings stay full strength. Focus rings inside both bars use `outline-offset: -7px`† so they are never clipped; the brand's ring is a 2px `--accent` circle 2px outside the photo, inside the bar.
- **Search panel** (Apple's search flyout): the search icon, ⌘K / Ctrl+K or `/` opens a panel that drops down from under the bar, full width, `--nav-solid`, no shadow, with the page behind it covered by `--curtain` and `blur(20px)`†.
  - Inside, in the `.chrome-row`: a 20px search glyph in `--text-2` (`--text` while focused) and, 8px after it, the input at 24px/600† (28px† at compact chrome; never below 16px, so iOS does not zoom). **No ring or box around the field**†: the caret and the darkened glyph mark focus. 32px† top and 80px† bottom padding.
  - Before you type, **Quick links** (12px/600†, 17px/600† at compact chrome, `#333336`† / dark `#E8E8ED`, each with a → arrow 11px† before the text, 14px† at compact; padding 4px 8px†, radius 5px†, 4px† apart; hover/focus background `--surface-2`†): Experiences, Projects, Download CV, the newest post. At compact chrome each quick link is at least 44px tall.
  - Results (Pagefind) start 32px† (49px† at compact) below the field: type (Blog / In practice / Experiences / Projects), title and highlighted excerpt. Result counts use correct plurals ("1 result", "2 results").
  - **Motion**†: the panel reveals over 240ms `--ease-nav` (`clip-path: inset(0 0 100% 0) → inset(0)`), the field fades in from `translateY(-4px)` (−8px at compact) over 240ms, 200ms delayed, quick links follow 20ms apart, and the curtain fades `opacity .32s var(--ease-nav) 80ms`. None under reduced motion.
  - It is a modal dialog: focus moves to the input on open and **stays inside the panel** (Tab and Shift+Tab cycle through the field, quick links, results and close button). Esc, the curtain or the trigger closes it and returns focus to the trigger. The ✕ button shows only at compact chrome or with a coarse pointer. The browser's own clear button on `type="search"` is hidden (`::-webkit-search-cancel-button { appearance: none }`). The Pagefind script loads on first open.
- **Mobile menu (compact chrome):**
  - The bar shows the brand on the left, then **search** and the **menu button** on the right. Theme and language move into the menu. The menu button is 48 × 48px†. Its two 1px lines are inset 17px inside the box and **end on the column's right edge**, so the box overhangs the column by 17px into its margin (`margin-inline-end: -17px`, `GlassNav.astro:206-210`; lines `left` and `right: 17px`, `:218-221`; the box right edge is 375 × 0.9375 + 17 at 375px; at 320 the column margin is 20px, so after the 17px overhang the box stays 3px clear of the screen edge, `frame.spec.ts:813-816`). **Open item (plan.md Risk 8):** the safe areas are not respected by the box itself, only by the row's width; on a notched phone in landscape at ≤ 833px (812 wide, 44px safe area, 60px column margin) the box reaches 1px into the safe area, while the lines stay 16px clear.
  - **Menu button:** two 1px lines that morph into an **✕** (each rotates ±45°, 240ms†, `--ease-nav`). It has `aria-expanded`, `aria-controls="mobile-menu"` and a label that switches between "Menu" and "Close" (i18n).
  - **Panel:** fixed below the bar, `height: calc(100dvh - var(--nav-h))` (100vh fallback), `--nav-solid`, scrolling on its own, 4px top padding so the first link starts right under the bar†. Links are stacked and left-aligned at **28px/600**† with 48px† side padding and a 46px† pitch: Experiences · Projects · In practice · Blog, in `#333336`† (dark `#E8E8ED`†), `--text` on hover. **No current-page colour** (Apple shows none†); `aria-current="page"` still marks it. Then a group label in 17px† `--text-2` ("More") and three 17px/600† rows in the same ink, each at least 44px tall, sharing one style: **Theme: Light** (the three-state toggle, §5.12), **Language: Tiếng Việt / English** (keeps the current page), **Download CV**.
  - **Motion:** the panel fades in over 240ms†; links fade in from `translateY(-4px)`† over 320ms†, staggered 20ms†. Closing: items go `translateY(-8px)` and fade over 200ms†, no stagger. No animation under reduced motion.
  - **While open:** page scroll is locked (keeping the position), `main` and the footer are `inert`, focus moves to the first link and stays inside the bar and the panel, and the bar turns solid `--nav-solid`.
  - **Closing:** the ✕, Esc, tapping any link (including a same-page anchor) or resizing past compact chrome. Focus returns to the menu button. Changing theme or language does not close it.
  - **Without JavaScript:** the menu button is hidden and the four links show as a horizontally scrolling row in the bar (`html:not(.js)`).

### 5.8 Local nav

Every inner page has one; Home and 404 do not (§4.0).

- **Bar:** directly under the global nav at the top of the page, above the hero, as on Apple product pages; it becomes **sticky at `top: 0`** once the global nav has scrolled away (§5.7). **52px**† tall (**48px**† at compact chrome); `--local-h` holds its height.
- **Background:** transparent at rest†, glass (`--nav-glass` + blur) once stuck†, with the same scroll-timeline technique and fallback as §5.7. The 1px `--keyline` bottom line is **`--content` wide and centred at rest** (the column: 980px at L, 692px at M; `LocalNav.astro:160`)† and **full width once stuck**† (always full width at compact chrome†).
- **Row:** the `.chrome-row`, on the column like the global nav (§5.2).
  - **Left:** the page title at 21px/600/0.011em† (19px† at compact chrome).
  - **Right:** the section links in Caption size, coloured `--nav-ink` / `--nav-ink-hover` as §5.7, 24px† apart, and then the optional **small pill** (§5.6). The links are right-aligned with `margin-inline-start: auto` on the first item (a one-link bar, Projects, has no links list, so `.title + .pill { margin-inline-start: auto }` ends the pill on the column, `LocalNav.astro:341-344`) and **must fit at L**†; on the 692px column at 834–1068px the Experiences bar may scroll (§4.2.0, owner decision); labels are kept short (Experiences uses the company's `shortName`, §4.2.0). If they still don't fit, they scroll horizontally inside the bar with a trailing fade (removed while a link has focus, `LocalNav.astro:229-230,253-256`). Once the strip is scrolled (`scrollLeft > 0`) a leading fade mirrors it: the same 32px mask with a transparent first stop (`LocalNav.astro:234-249`), switched on by the `data-start` attribute that `src/scripts/local-nav.ts` sets on load, on scroll and on resize (`local-nav.ts:10-14,36,40`). At rest the strip has no leading fade and looks as before. On load, and again when fonts are ready (unless focus is already inside the strip, `local-nav.ts:38-41`), the bar scrolls the link with `aria-current` into view, ending at least 32px inside the strip, the width of the fade mask (`reveal(current, 32)`, `local-nav.ts:33-42`; a focused link uses 24px, `:26-29`; accessibility review), so on a role page at 834–1068px the current role is not left half under the fade (pinned on the Hitachi role page, EN and VI, at 900px: `tests/e2e/frame.spec.ts:652-700`; the leading fade is on there, and off on a strip that fits at 1440: `frame.spec.ts:702-723`).
  - **Current marker**: where a link has `aria-current` (the Projects kind filter, Blog All posts / Series / Tags on their own pages), it is full-strength ink with a 1px `currentColor` rule at 80% opacity on the bar's bottom edge†. Anchor links on Experiences and In practice never show one (no scroll-spy).
  - The title and links **shrink and truncate** (`min-width: 0`, `text-overflow: ellipsis` on the title) rather than overflow, so the bar never causes horizontal page scroll (checked on every inner route in EN and VI at 320px).
- **Compact chrome: title + chevron dropdown** (as on Apple product pages on iPhone†):
  - The bar shows the title on the left, then the **chevron on the right next to the small pill**† (16 × 9px, stroke 1.2px†, 80% opacity†). The links row is hidden.
  - The dropdown is a native **`<details>`**: the `<summary>` spans the title and chevron (`flex: 1; justify-content: space-between`), so the whole area is the tap target; accessible name e.g. "Experiences, sections". The chevron rotates 180° when open.
  - **One surface:** when open, the bar and the tray share one solid `--nav-solid` background (no glass, so page text never shows through), with one `--keyline` under the tray. The tray is at most `60dvh` tall and scrolls inside, padding 16px on the column's side margin (`max((100% - var(--content)) / 2, env(safe-area-inset-left))`, `LocalNav.astro:392`) and 20px below. Links are **14px/-0.02em**†, `--nav-ink`, in **44px** rows (Apple uses 34px†; 44px keeps the tap-target rule), indented 16px; the current item is full ink with a **1.2 × 12px vertical bar 16px before it**† (no ✓).
  - **Motion**†: the tray reveals over 320ms `--ease-nav` (clip-path), its links fade from `translateY(-4px)` over 320ms with delays of 260ms + 20ms per link; the bar background returns 240ms after closing. None under reduced motion.
  - It closes on a link tap (then jumps to the anchor), the summary, Esc, a tap outside, or 40px of page scroll. Without JavaScript the `<details>` still opens and its links work.
  - Pages with a single link (blog post, In practice story) show no chevron; the link sits on the right as a chevron text link ("All posts ›"), and the title truncates to make room.
- **Script:** one shared helper of at most 1 KB gzipped: scroll a keyboard-focused link fully into view, and the dropdown's close rules. No scroll-spy.
- Hidden in print.

### 5.9 Footer

The same footer on every page, modelled on Apple's global footer†. It sits flush under the last section. On a page shorter than the viewport it sits at the bottom of the viewport instead, with `--bg` filling the space above it: on screen only, the body is a `min-height: 100dvh` flex column and the footer takes `margin-top: auto` (no fixed positioning, no JS). The band (background and any top line) spans the full viewport width; the content keeps the 980px column.

- `--surface-2` background, Caption size (12px/1.3334†). Colours: text `--ft-text` (`rgba(0,0,0,.68)` / dark `rgba(255,255,255,.66)`), links `--ft-link` (`rgba(0,0,0,.8)` / dark `.8`) with no underline (underline on hover), column titles `--ft-title` (`rgba(0,0,0,.88)`† / dark `.92`†), pipes and separators `--ft-pipe` (`rgba(0,0,0,.56)` / dark `rgba(255,255,255,.48)`). Content row `.chrome-row` (§5.2: the column, while the band itself is full-bleed; the four directory columns are 245px at 1440 and 173px on the 692px column at 1024, their left edges at an equal pitch and their titles on one line, EN and VI: `alignment.spec.ts`), plus the bottom safe area. When the last page band is also `--surface-2`, a 1px `--border` line sits above the footer.
- **Density:** at compact chrome every footer link is at least 44px tall. Above compact chrome (pointer layouts) the footer uses Apple's density†: a 25.6px link pitch (16px line + 0.8em†), which meets WCAG 2.2 SC 2.5.8 target spacing (§9).
- **1. Breadcrumbs** (every page except Home): a home link (the brand initials "RP"), then 6 × 11px chevron separators in `--ft-pipe` with 11px† after them and items 7px† apart, the current section and the current page, e.g. *RP › Blog › Neovim setup guide, Part 1*; 17px† vertical padding (about 56px† tall). **No hairline under it** above compact chrome†; one hairline at compact chrome†.
- **2. Directory:** four columns (25% each†), each with a 600-weight `--ft-title` title and 0.8em† below it:
  - **Explore:** Experiences · Projects · Skills · In practice · Blog
  - **Writing:** All posts · Topics · Series · Tags · RSS
  - **Connect:** Email · LinkedIn · GitHub · Phone
  - **Resources:** Download CV · Search
  
  At compact chrome each column becomes an accordion (native `<details>`): the title at **400**†, a chevron on the right (about 11px, rotating `.3s ease`†), **one hairline under the whole section**† (never between the title and its links, and never doubled against the legal row), and links indented 14px† (`padding: 6px 14px`†) with 5px / 16px† list padding.
- **3. Legal row** (37px† below the directory, a 1px `--border` line on top, then 17px†/11px† padding, about 26px† tall above compact chrome; no line and no gap at compact chrome): *"Copyright © <year> Ryan Parker. All rights reserved."*, then, 30px† later, only when analytics is on, *Privacy-friendly analytics, no cookies* (no pipe, since it is the only item). The language link (*Tiếng Việt* / *English*) sits at the far end†. At compact chrome the row stacks, left-aligned. There is no separate reach line; the Connect column carries email and LinkedIn.
- Links to other sites open in a new tab (`target="_blank" rel="noopener noreferrer"`). mailto/tel and same-site links do not. Markdown links get this from `src/lib/rehype-external-links.ts`.
- No social **icons** in the footer; the Connect column lists the links as text. The Phone link reads "Phone" (not "Mobile").

### 5.10 Page building blocks

#### 5.10.1 Page template and hero

Every page uses the same skeleton:

1. **Global nav** (§5.7).
2. **Local nav** (§5.8), on inner pages.
3. **Hero** (all pages except Experiences): a `--bg` section with centred content in `--content`: eyebrow (the page name), **H1** in Hero size, one subhead (at most 120 characters), and at most two actions. Hero padding as §5.5. The blog post uses its Newsroom header instead (§4.5). Role pages (§4.2.3) add an optional `logo` slot: a 32px `CompanyLogo` centred above the lockup (`.hero-logo`). Hero takes an optional `compact` flag (`hero--compact`) that steps the H1 down from 96px to the M size (64px) at L, for long titles; role pages set it, so the first viewport still shows 64px of the chapter when a title wraps to four lines.
4. **Content:** full sections (inner pages) or tile grids (the grids on Projects and Blog); Home composes its own wall (§4.1).
5. Optional **closing section**: H2 in Section headline size, subhead, at most two actions.
6. **Footer** (§5.9), flush.

#### 5.10.2 Full sections

- **Full section** (inner pages): a `<section>` whose background spans the viewport width, `--section-pad` top and bottom, content in `--content` (or `--content-wide` for grids). Sections **touch**; their backgrounds alternate `--surface-2` / `--bg`.
- **Peek rule:** at 1440 × 900 and 375 × 812, the first viewport shows at least 64px of the next band on every page, including the In practice story page (reduce its header padding rather than relax the rule), so every page invites scrolling (Appendix D, whose wireframes are illustrative; this rule and §4 win). **Home exception (lead, home-alt-6):** the first screen holds the wall, the name, the four links and the pills, and the wall fades into the page, so there is no band to peek. Instead, at 1440 × 900 the H1, the links row and the pills end at or above 900px, and at 375 × 812 the photo, H1 and whole intro end at or above 812px, the pills below the fold by the owner's acceptance (hero-intro-longer; `tests/e2e/home.spec.ts:546-627`; pills measured 890.5px at 1440, and at 375 935.2px in EN and 909.2px in VI).
- **Tiles in a row** align their headlines to the same top (±2px), and the hero stat values sit on one baseline.

#### 5.10.3 Tile grid

Used on Projects and the Blog pages.

- A CSS grid of `--surface-2` tiles on a `--bg` band: 2 columns (`1fr 1fr`†) with a **12px**† gap and 12px† side padding at M and L, spanning the **full viewport width**; at S, 1 column, **no side padding**†, still with 12px gaps.
- Tiles are **square** (no radius†) and centre their content both ways. The **feature grid** (`.tiles-2up--feature`, Layout A, used by the Projects lineup, §4.6) has min-heights **600 / 560 / 500px** at L / M / S and padding 52/40 · 44/32 · 40/24, and each tile carries a large code-built visual: `grid-tile--bleed` puts it flush on the bottom edge, `grid-tile--fill` centres it under the lockup; on the Blog grids, the min-height is 300px at L and auto below, because those tiles hold more text.
- Tiles in a row have equal heights. With an odd number of tiles, the last one spans both columns. A full-width tile (Blog feature, expanded project) spans both columns.
- **Hover** (pointer devices only): the tile background darkens by 2% over 344ms†. No scale, so the grid never jitters.
- **Newsroom variant** (Blog "Other posts", series and tag grids†): rounded `--bg` tiles on a `--surface-2` band in `--content` (980px†), radius **32px**† (24px† at M and S), padding 32 / 24 / 24px†, gaps **36px**† (L) / 24px† (M), 1 column at S. Content: Newsroom category (§5.4), 12px† below it the Newsroom tile title, then the description and the timestamp (date · reading time, 14/600 `--text-2`, 16px† above). The whole tile is one link (a stretched `::after` on the title link), with the hover lift (§5.6) and a 3px-offset focus ring.

#### 5.10.4 Section header and card

- **Section header**, two variants:
  - **Start-aligned** (inner-page sections: the Experiences highlights header and chapter headers below L, the blog's card-group H2s "Latest." and "More posts." and the post closing band, `CardGroup.astro:53`; series and tag pages)†: `display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 20px 120px`†, the lockup (eyebrow, H2, subhead) at most 75% / at least 50% wide† on the left and the chevron CTA on the right on the baseline (`padding-bottom: 4px`†), within `--content-wide`; at S it stacks (`flex-direction: column; gap: 16px`†). DOM order is lockup then CTA.
  - **Centred** (heroes, closing sections): centred in `--content`: eyebrow, H2 (Section headline, or Unit headline), subhead in `--text-2` (or Lockup copy), then actions. 48 / 40 / 32px† to the content below. At S, a header whose copy is longer than 120 characters gets `.lockup--long` at build time and is start-aligned as a whole (eyebrow, heading, copy, actions), as Apple's `small-uncentered`†; shorter ones stay centred.
- **Card:** **28px**† radius, padding 28px† (24px at S), the opposite colour of its band, no shadow or border. Content is left-aligned: H3 in Card headline size, then the body (Body at M and L, Body-reduced at S†). Cards in a grid have a 16px gap and equal heights per row. **Equal padding** (owner, photo-logos) means equal top, left and right padding with the content top-aligned; the extra height of a taller neighbour is free space at the bottom (§4.2.1).

#### 5.10.5 Stat lockup and stat strip

- A **stat lockup** is Apple's `figure.stat`†: an optional short caption above (≤ 2 words: "Up to", "Led", "Cut"), the value, and a caption below, in reading order: `<li class="stat"><span class="stat-cap">Cut</span><span class="stat-value">&gt;50%</span><span class="stat-cap">EMR costs</span></li>`. Values use the Stat value sizes (§5.4), captions Body-reduced (14px / 1.2858 / -0.016em†); value and captions are both `--text`† (size does the work). No `aria-label` on the value.
- A **stat strip** is a `<ul aria-label="At a glance">` of 1–3 lockups, separated by 1px `--border` hairlines. At S, when every value is at most 5 characters, the strip stays **3 across** (`.stat-strip--compact`, set at build time; captions wrap to at most 2 lines, `text-wrap: balance`); otherwise the lockups stack with hairlines between them.
- Only the hero strip is numbers-only; other strips may show word values like "unchanged". Home has no stat strip and no number tiles (§4.1.0).
- A **big** strip (`.stat-strip--big`, no longer used on Home) drops the hairlines and uses values 72 / 48px at L / M (28px at S).
- A **super stat** (`.stat--super`) is not used on the In practice story page since v6.8 (the metrics are `Stat card`s in the Result section); kept for other pages: value **80px**† / 64 / 48 at L / M / S, line-height 1, -0.015em, captions **17px**†. At most one per page. Stats never count up† (Apple reveals them with the normal fade).

#### 5.10.6 Anchors

- Every anchor target clears the stuck bar. The offset comes from one rule, `html { scroll-padding-top: calc(var(--sticky-h) + 16px) }`, which also keeps keyboard focus (Shift+Tab) from landing under the sticky bar; elements add no sticky offset of their own. Heading ids set only `scroll-margin-top: var(--eyebrow-room)` so the eyebrow above the heading lands visible.

#### 5.10.7 Scroll gallery ("Get the highlights.")

- No page uses the gallery now: the In practice desk (§4.4, `src/pages/[...lang]/star/index.astro:60-76`) replaced it in v6.8, and Home is the Wall (§4.1). `Gallery.astro` and `gallery.ts` stay for the unused `HighlightsGallery` and `WritingShelf`.
- A horizontally scrolling row of cards†: `<section role="region" aria-labelledby>` → `<ul role="list">`, `overflow-x: auto; scroll-snap-type: x mandatory`†, cards `scroll-snap-align: start`† (the last `start end`†), `scrollbar-width: none`†, `scroll-padding-inline` = the side gutter†.
- Inline padding `calc((100% - var(--content-wide)) / 2)`, so the first card lines up with the header and the next one **peeks** past the viewport edge†; 10px† top and 30px† bottom padding so focus rings and reveal offsets are not clipped.
- Cards: `--surface-2` on a `--bg` band, radius 28px†, width **372 / 344 / 260px**†, padding 32 / 28 / 24px†, **20px**† gap, equal heights, hover lift (§5.6).
- Stat cards (`StatCard`; an optional eyebrow and body line; an optional diagram via the `image` + `imageAlt` props) colour only their big value, by `:nth-child(4n+k)` → `--hl-k`, so any number of cards cycles. Surfaces stay `--bg`.
- With **3 cards or fewer** at L, the cards share the row width and do not scroll†, and the paddles are hidden. The `few` state is set at build time.
- **Paddles** (§5.6): two buttons below the gallery, end-aligned in `--content-wide`, 18px† apart, `aria-label` "Previous highlights" / "Next highlights" by default (the `prevLabel` / `nextLabel` props name them per gallery, per-gallery labels), `aria-controls` the list. A click scrolls by the visible cards' width (`behavior: smooth`, `auto` under reduced motion); an IntersectionObserver (threshold .95) on the first and last **visible** (not `hidden`) cards toggles `disabled`, re-read on resize and when a card's `hidden` changes. Script `gallery.ts` ≤ 0.8 KB gzipped, loaded only on pages with a gallery; paddles start `hidden` and the script reveals them.
- **JS off:** no paddles; native swipe, scroll and snap work and every link is in the tab order. Tabbing into a card scrolls it fully into view.

#### 5.10.8 Gradient text, quote and drop cap

- **Gradient text** (Apple's swipe†): at most **one** `.text-gradient` per page; **no page uses it now** (the Home name has been ink since home-alt-6, §4.1.0; the `gradient` prop of `Hero` and `Lockup` and the `.text-gradient` rule in `src/styles/blocks.css:775` stay). Colours: light `#00509F → #0B5D52`, dark `#5CB0FF → #64D2B4` (every stop ≥ 7:1 on `--bg` and `--surface-2`). `background-clip: text`, `background-size: 300% 100%`†; under `prefers-reduced-motion: no-preference` it starts as solid `--text` and the gradient sweeps in once, **3.5s linear**† after a 300ms delay, `fill-mode: both`. The static end state (the gradient) is what reduced motion and JS-off see. Forced colours and print fall back to solid text; browsers without `background-clip: text` show `--text`.
- **Quote** (Newsroom†): `<figure class="quote"><blockquote>…</blockquote><figcaption>Name <span>Role</span></figcaption></figure>`, Quote size (§5.4); the opening mark hangs outside the text (`::before { display: inline-block; width: 2em; margin-inline-start: -2em; text-align: end; content: open-quote }`†), and the closing mark appears only after the last paragraph†. Credit 17/600 at 1.6em above†, role 17/400. A **reduced** variant (32 / 28 / 24px†) was used for the former STAR story question and is unused since v6.8.
- **Drop cap** (Newsroom `.dropcaps`†, opt-in per post): the first paragraph's `::first-letter` is **84px/600**† (48px† at S), `float: inline-start`, line-height 1, 8px† (5px† at S) space after it.

#### 5.10.9 Graph bars

- For a story metric with `compare` values (§6.6): one bar per entry next to the stat lockup, in a `1fr auto` grid with a 90px† column gap (72px† stat column and 20px† gap at S) and 48 / 32 / 20px† row gaps.
- Bars are `<hr aria-hidden="true">`†, **10px**† tall (7px† at S), radius half the height†, width proportional to the value (`style="--w:.48"`, set at build time), `transform-origin: left`†. The "after" bar is `--accent`; others `#86868B`. Labels 12px `--text-2`, 5px† above.
- A visually hidden sentence ("Before: 100, after: 48") carries the meaning†.
- Motion: `scaleX(0 → 1)`, 1000ms `--ease`, 150ms stagger, when 50% visible (via `reveal.ts`). Static under reduced motion and JS off.

#### 5.10.10 Site index

- Apple's end-of-page Index†, inside `<nav aria-label="Site index">` with one H2 per group. Group titles 17 / 14px, **400**†, `--text-2`, 15 / 12px† below.
- The first group uses **elevated links** at 28 / 24 / 21px†, 600, `--text`, no chevron, 11 / 9 / 8px† apart, the group 50% wide† (75% at M†, 100% at S†). Other groups: links 17 / 14px†, 600, 14 / 11px† apart, 25% wide†. At S the groups stack, 26px† apart (42px† at M). Every link is at least 44px tall.
- Links fade in with the list link-in motion (§5.11) when the index top crosses 70% of the viewport†.

#### 5.10.11 Page art

- Original, hand-written SVG illustrations in `src/assets/art/` (simple geometric shapes, no text, no logos or trademarks, each under 4 KB, checked by `tests/unit/art.test.ts`).
- Page art is imported as an inline SVG component and coloured only with tokens through `style` attributes (`--link`, `--accent`, `--text-2`, `--fill`, `--border`, `--bg`, `--surface-2`; never mint, never hex), so it follows the theme toggle.
- Each has `role="img"` and an i18n `aria-label` starting "Illustration:" / "Hình minh họa:". It is centred with `max-width: 100%` and an `aspect-ratio` matching its viewBox (CLS 0).
- Meaningful shapes (steps, baselines, ticks, page outline) use `--text-2` or `--link` so they reach 3:1 against the page (WCAG 1.4.11); `--fill` and `--border` are for decoration only, never for a shape needed to read the image. Widths: closing 480 / 400 / 280, former STAR steps 360 / 360 / 280 (unused since v6.8), 404 256 / 256 / 240 (kept small, with a tight hero, so the 404 fits 1440×1600 with Inter too).
- Content images (project covers) are `<img>` files with their own dark panel, and their alt comes from content (§6.4 `imageAlt`).

- **Story diagrams** live in `src/assets/star/` (2:1, viewBox 640×320, under 6 KB, no text, tokens as page art, strokes ≥ 4 units, checked by `tests/unit/diagram-art.test.ts`). They are referenced from content `image()` and inlined (Astro returns content SVGs as components), so they follow the theme toggle. Alt "Diagram:" / "Sơ đồ:" comes from `imageAlt`. Both stories have one.
- **Highlight diagrams** live in `src/assets/highlights/` (`stories`, `team`, `skills`, `agents`, `years`, `career`; same rules, same test). No page or component imports them now: the two labelled Home diagrams (`team`, `skills`) and the decorative `src/assets/art/star-steps.svg` left Home in home-alt-6. Story diagrams (`src/assets/star/`) show on the In practice desk cards and story pages.

#### 5.10.12 Footnotes

- Apple-style qualifiers: a superscript link after the claim's caption (`<sup class="fn-ref"><a id="fnref-N" href="#fn-N" aria-label="Footnote N">N</a></sup>`, never inside the value) to an ordered list in a `--surface-2` small-print band at the end of `main` (`section.footnotes`, sr-only H2 "Footnotes", Caption 12px `--text-2`), each item with a ↩ back link.
- Ref and back links have 44px tap areas. Notes come only from content fields (`yearsOfExperienceNote`, `note`) and restate context already in the content; a claim without such context has no footnote.

#### 5.10.13 Device frame, terminal panes and terminal loop

- CSS frames (`DeviceFrame.astro`): a `#1D1D1F` bezel made of padding and a token fill (no border, no shadow), 16:9 screen, filling its container, the column (no `max-width`; it was 880px, `DeviceFrame.astro:17-21`), with the laptop base overhanging the frame by 1/9 of the screen on each side (`margin-inline: calc(-50% / 9)`, the 5% side padding over the 90% content box, `:44-51`) so the base spans the frame; the big stat strip is uncapped too (`blocks.css:620-622`); `laptop` adds a `--border` base and radius 28 (18 under 480px); `screen` is the bare 18px bezel. No device art is copied.
- Terminal loop (`TerminalLoop.astro`): a dark `--surface-2` window (title 12/600, lines 15px mono) whose lines are revealed by a stepped `translate` mask over 12s; the window is `aria-hidden` and a visually hidden figcaption carries the transcript; a native **Pause animation** button (`aria-pressed`) appears only once `terminal.ts` runs; with reduced motion or no JS the final frame is static and the button hidden (WCAG 2.2.2). Lines come from the project's `loop` field only.

#### 5.10.14 Closer look

- `CloserLook.astro`: `div.closer[data-closer]` with an optional `.closer-media` (the project `image`, 1280 × 720, lazy, `imageAlt`) and an `ol.closer-list` whose `li.closer-item` holds `h3.closer-label` and `.closer-cap#<id>-c<i>`. Items come from the labelled bold bullets of the project body (`parseHighlights`); unlabelled bullets are skipped, and the section shows with ≥ 2 items.
- **No JavaScript:** no buttons in the HTML; every caption shows.
- **With JavaScript** (`closer-look.ts`, ≤ 1 KB gzip): each label becomes a `button.closer-btn` (`aria-controls` = caption id, `aria-expanded`); the first item opens and the others get `hidden`. A click opens that item and closes the rest; clicking the open one keeps it open. No transitions.
- Sizes: items separated by a 1px `--border` hairline; label 21/600 `--text`; caption 17px `--text-2` (`strong` in `--text`), 0 0 20px padding; button min-height 44px, `:focus-visible` 2px `--link` outline, 3px offset. At ≥ 1069px with an image: grid `2fr / 3fr`, 64px gap, list left, media right; below, the media sits above the list with a 40px gap; image radius 18.
- The closer look uses the band's own tokens, so text keeps 7:1.

### 5.11 Motion

- **Easing tokens:** `--ease: cubic-bezier(0.28, 0.11, 0.32, 1)`† (reveals, local nav, expand/collapse); `--ease-nav: cubic-bezier(0.4, 0, 0.6, 1)`† (global nav, search, mobile menu); `--ease-card: cubic-bezier(0, 0, 0.5, 1)`† (tile and card hover).
- **Durations:** content stagger **150ms**†; nav and index link stagger 20ms† per link and 80ms† per group; nav panels 240ms†; expand/collapse and menu items 320ms†; hover 200ms (tile background 344ms†, card lift 300ms†).
- **Scroll and reveal effects animate only `opacity` and `transform`** (CLS stays 0). Hover and press may also transition `background-color` (344ms ease†), and the one gradient-text swipe animates `background-position` (§5.10.8). Content is visible with JavaScript off. **No measured Apple page uses scroll-linked scaling of text cards or count-up numbers†**, so this site uses neither.

| # | Effect | Where | How |
|---|---|---|---|
| 1 | **Staggered fade-up** (Apple `StaggeredFadeIn`†) | Section headers, lockups, cards, stats, list items, grid tile content | `opacity 0 → 1` over **900ms**†, `translateY(30px) → 0` over **700ms**†, `--ease-card`†, once. Items in a `[data-reveal-group]` stagger **150ms**† (at most 4 steps; 3 at S), via `--i` set at build time. A group starts when its top crosses 85% of the viewport (`rootMargin: 0px 0px -15% 0px`). `reveal.ts` (≤ 2 KB) only adds `.is-in`; elements start hidden only under `html.reveal`, a class that `reveal.ts` itself adds once it has loaded and run (never the inline `html.js` flag), so a script that fails to load or throws leaves every element visible; any group whose top is above the bottom of the viewport on load (or on `pageshow` after a back/forward restore) is shown at once without animation, and focusing an unrevealed item reveals its group. **Failsafe:** if `reveal.ts` throws, it removes `html.reveal`; with `/_astro/*.js` blocked, every page shows all content; the site index's `--g` / `--k` delays are written into the HTML at build time. The **hero intro** uses the same keyframes on load in pure CSS (`animation-fill-mode: both`), never on the H1. |
| 2 | **Hero intro** | Page heroes (on Home `.w-role`, `.w-say`, `.w-links` and the pills of `#top`; the name H1, the wall and the photo are never animated) | See effect 1: eyebrow → subhead → copy → actions → stats, 150ms† apart, CSS only. |
| 3 | **Hero fades on scroll** | The hero content on every page (M and L only) | Scroll-linked: as the hero leaves the viewport, its content goes `opacity 1 → 0`, `scale(1) → 0.94` and `translateY(0) → -40px` (`animation-range: exit 0% exit 80%`). The background stays. No JS. |
| 4 | **Sticky storytelling** | Role pages (§4.2.3), **L only** (the former STAR story stage is gone, v6.8) | Two columns in `--content-wide`: the chapter header (left 40%, left-aligned, `position: sticky; top: calc(var(--sticky-h) + 32px)`) and the cards (right 60%, one column, 16px gap, each with effect 1). The header un-sticks when the chapter ends. Pure CSS, applied only with `prefers-reduced-motion: no-preference` and JavaScript on (`html.js`); otherwise the chapter is stacked and fully visible. |

The terminal loop (§5.10.13) is the one looping animation; it animates `translate` only and has a pause control.

- **List link-in**† (mobile menu, local-nav dropdown, site index): `opacity 0 → 1`, `translateY(-4px) → 0`, 320ms ease†, delay 200ms + 80ms per group + 20ms per link†.
- **At S**, effects 1 and 2 run with the same values (Apple has no small-screen override†) but at most 3 stagger steps; effect 3 lives inside `@media (min-width: 735px)` and effect 4 inside `(min-width: 1069px)`.
- **Reduced motion:** `prefers-reduced-motion: reduce` turns every effect, transition and menu animation off†; everything shows immediately and static. **One static transform is allowed everywhere it is not motion:** the Home wall's 3D tilt (`perspective(2400px) rotateX(28deg) rotateZ(-8deg)` on `.w-wall`) never moves, so it stays under reduced motion; it is the only `transform` in Home's `main` and has one pinned exemption in `m12.spec.ts` (§4.1.6).
- No animation libraries.
- **Page transitions:** every page opts into cross-document view transitions (root cross-fade, browser default timing) inside `@media (prefers-reduced-motion: no-preference)`; browsers without support (Firefox) navigate normally; Astro's `ClientRouter` is not used.

### 5.12 Theme and dark mode

- **Light is the default**, whatever the OS setting. The toggle cycles **Light → Dark → System** and stores `theme = light | dark | system` in `localStorage` (try/catch); `prefers-color-scheme` is used only for System.
- A small inline script in `<head>` sets `data-theme` before first paint, so the page never flashes.
- Shiki uses a dual theme (e.g. `github-light` / `github-dark`) switched with CSS variables.
- Dark mode uses the dark column in §5.3; nothing else changes, except company logos (§4.2: `logoDark` file, else a white plate).
- Print and the PDF always use the light theme.

### 5.13 Small screens (S and compact chrome)

The per-component rules above already cover phones. These apply everywhere at S:

- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`; pinch zoom is never disabled.
- Every tap target is at least **44 × 44px** with at least 8px between neighbours, including in-page text links such as "View in experiences ›" (pad them to 44px tall). Long tokens (chips, URLs) never break mid-word: `overflow-wrap: anywhere` applies only to card bodies, article prose, and headings, subheads, intro, lockup and eyebrow text outside cards (it breaks only a word wider than the line, WCAG 1.4.10), never to `body`, and chips use `white-space: nowrap`.
- Grids and card lists are one column; grid tiles run edge to edge; Home's identity row is one column in the 87.5% gutter and its wall is full-bleed (§4.1.2, §4.1.3).
- Motion as §5.11 (no scroll-linked effects). Only one bar is stuck at a time: the global nav (48px) on Home and 404, the local nav (48px) elsewhere.
- Code blocks run to the screen edges and scroll inside; the copy button stays visible.
- Images keep their aspect ratio with `width`/`height` set (CLS 0) and fill the content width.
- No image or font is loaded only for phones. The mobile menu and local-nav scripts together add at most 1.5 KB gzipped, inside the §9 JS budget.

### 5.14 Copy style (Apple voice)

- **Headlines:** short, declarative, sentence case, ending with a period, at most 6 words: *"Real work. Real results."*, *"Let's talk."* Names and titles used as headlines (the name, a role title, a post title) keep their own form.
- **Eyebrows** name the topic or page ("Experiences", "In practice"), never a sentence.
- **Subheads:** one line, at most 120 characters, no marketing superlatives.
- **Actions:** short verbs: **Learn more**, **Download CV**, **Read the story**, **Email me**, **All posts**. Generic labels get context in the accessible name ("Learn more about my experience").
- Numbers are written as digits ("7 engineers", ">50%"); dates use the formats in §7.
- VI strings follow the same rules in `vi.json`.

### 5.15 Acceptance criteria (design system, every route in EN and VI, light and dark)

- With no saved preference, the page background is `#FFFFFF`, even when the OS is in dark mode. Choosing Dark switches to the dark tokens and survives reload with no flash.
- Every page has the global nav, the identical footer flush under the last section, and exactly one H1. Every inner page has the local nav directly under the global nav. Every page except Experiences and the blog post has a §5.10.1 hero.
- Computed `font-family` starts with `-apple-system`. No Newsreader file is requested. On WebKit/macOS no Inter file is requested.
- Type sizes match §5.4 at 1440, 900 and 375px widths (checked for the Hero H1, a Section H2, a Subhead and Body).
- Nav bar heights: 44px at 1440 and 900, 48px at 375; local nav 52px / 48px. On pages with a local nav, after scrolling 800px the global nav is off screen and the local nav's top is 0; every sticky offset uses `--sticky-h`. The first glyphs of the global nav, local nav, footer and search panel share one left edge (±1px) at 1440 and 900. At scroll 0 both bars are transparent; after scrolling 200px they are glass (Chromium). Every inner route in EN and VI has no horizontal overflow at 320px. In the open search panel, 20 Tab presses never move focus outside it.
- Primary pills are `--accent` (`#0053A6` light, `#5CB0FF` dark) with `--on-accent` text; text and chevron links are `--link`; chevron links have no `›` in their accessible name.
- No element larger than 64 × 64px has a pastel or gradient background (`background-clip: text` elements excluded); at most one `.text-gradient` per page. No card, tile or section has a `box-shadow` or border.
- **Mobile menu** at 375px: the bar shows brand, search and menu only. Tapping Menu morphs the icon to ✕, sets `aria-expanded="true"`, shows the four links at 28px, locks page scroll and traps focus. Esc, ✕, a link tap and resizing to 1024px each close it and return focus. Theme and language work inside it. With JS off, the four links are reachable.
- **Local nav dropdown** at 375px, on every inner page: title, chevron (except single-link pages) and the small pill where §4.0 lists one. Opening it lists every link; a link tap closes it and lands the target below both bars. Esc and an outside tap close it. With JS off, the `<details>` opens and its links work.
- **Search:** ⌘K and `/` open the panel with focus in the input; Quick links show before typing; results appear; Esc closes it and restores focus.
- **Footer:** breadcrumbs on every page except Home; four directory columns at 1440; accordions at 375.
- At 320, 375 and 430px, no page scrolls horizontally, and every interactive element is at least 44 × 44px.
- **Motion:** with reduced motion, no element has a non-identity transform or opacity < 1 after load, except Home's static wall tilt (`#top .w-wall`, §4.1.6). At 375px, no element in `main` has a scroll-driven animation (the nav bars' 1px scroll-timeline background switch, §5.7–§5.8, is a state change, not motion, and runs at every width). No `.card` or story card has an `animation-timeline` other than `auto`. A revealed 3-item group is fully visible 1.6s after entering view, with item 2's delay 150ms. No hero H1 has a running animation at `domcontentloaded`. Effect 3 applies only where `animation-timeline` is supported and falls back cleanly (Chromium and WebKit). The built CSS holds `@view-transition { navigation: auto }` only inside a `prefers-reduced-motion: no-preference` media rule. Effect 4: at 1440px the role chapter header and the story stage header keep the same `top` while their cards scroll and un-stick at the section end; at 900px, under reduced motion and with JS off they are stacked.
- Every anchor (local-nav links, `#<slug>`, `#<slug>-title`, search sub-results) lands below both bars with its eyebrow visible.
- Lighthouse (mobile preset) ≥ 0.95 in every category and CLS < 0.05 on every Lighthouse URL; axe has zero serious or critical violations, including at 375px with the menu, the local-nav dropdown and the search panel open; the JS budget (§9) holds.

---

---

## 6. Content model

All content lives in `src/content/` as Markdown/MDX, validated by **Astro content collections** with Zod schemas. The build fails on invalid frontmatter.

Translations sit side by side in per-language folders: `en/` and `vi/`. Two files with the **same filename** are translations of each other.

**Date fields in CV collections** (`start`, `end`, `year`) accept `YYYY` or `YYYY-MM` as strings, validated with a regex. A shared `formatCvDate()` helper renders them (§4.2).

### 6.1 `profile` (single entry per language)

`src/content/profile/en/index.md`

```yaml
name: "Ryan Parker"
headline: "Senior Data Engineer"
tagline: "dbt, Airflow, PySpark, AWS & GitLab CI/CD"
location: "Ho Chi Minh City, Vietnam"
email: "ryanparker.p.97@gmail.com"
phone: "+84963378831"           # E.164 format, used for tel: links
phoneDisplay: "(+84) 963 378 831"
avatar: "../../../assets/profile/avatar.jpg"   # optional; the round photo in the nav brand link (§5.7)
yearsOfExperience: "5+"
yearsOfExperienceNote: "…"      # optional footnote (§5.10.12)
headlineMetric: "7 engineers led"  # optional; no longer shown on Home (the `#team` brief left Home in v6.11, §4.1)
  note: "…"                     # optional footnote
headlineMetricPrefix: "Led"     # optional caption above the number (§5.10.5)
socials:
  linkedin: "https://www.linkedin.com/in/jomatran"
  github: "https://github.com/ryanparker97"
  x: ""                         # optional
  bluesky: ""                   # optional
spokenLanguages:
  - language: "English"
    proficiency: "Professional working proficiency"
```
Body: the CV **Summary** paragraph (Markdown, bold allowed). It is used in the PDF only (not on the Experiences web page since v2.0, §4.2).

### 6.2 `experience`

`src/content/experience/en/fpt-software-senior-data-engineer.md`

Each file is also a page at `/experiences/<slug>/` (§4.2.3); `print` is reserved and may not be used as a slug.

```yaml
company: "FPT Software"
client: ""                      # optional, e.g. "Security Bank" → shown as "Datum / Security Bank"
role: "Senior Data Engineer (Team Lead)"
location: "Ho Chi Minh City, Vietnam"
start: "2026-08"                # "YYYY" or "YYYY-MM"
end:                            # empty = Present
logo: "../../../assets/logos/fpt-software.png"   # optional company logo (image()); the client's when client is set
logoDark: ""                    # optional logo for dark backgrounds (e.g. a white wordmark); else a white plate in dark
shortName: ""                   # optional local-nav label (§4.2.0); default: client if set, else company
tech: ["Python", "PySpark", "Databricks", "Azure", "Talend", "Salesforce", "AWS", "AI agents"]
highlight: 1                    # optional; which bullet (1-based) feeds the "Get the highlights." card (§4.2.0)
```
Body: labelled achievement bullets.

```md
- **Team Leadership & Code Review:** Lead and mentor a team of **7 engineers**, owning delivery planning, …
- **ETL/ELT Migration Strategy:** Own the technical approach for migrating legacy **Talend** ETL jobs to **Databricks** on **Azure** …
```

Company logos (`src/assets/logos/`) are their owners' marks, used only to identify the employer or client, and never appear in the print page or PDF. Files by role: **FPT Software** `fpt-software.png` (WebP data) for both FPT roles; **Hitachi Vantara** `hitachi-vantara.svg`; **TymeX** (the client logo on the Datum role) `tymex.png` and `tymex-white.png` (dark theme), the "GoTymeX" wordmark from `https://vietnam.tyme.com/wp-content/uploads/2026/04/cropped-GoTyme-X_Dark@4x.png` and `..._Light@4x.png`, fetched 2026-11-13, no usage terms found, © Tyme Limited; **Security Bank** (the client logo on the other Datum role) `security-bank.png`, a horizontal logo the owner found through a Google Images share link (`https://share.google/yWymcOfSfmGuu3SiT`, a "SECURITY BANK MASTERCARD | ECPay" result), image `https://ecpay.com.ph/sites/default/files/2024-01/SECURITYBANK_MASTERCARD.png`, hosted by a third party (ECPay), not the bank; raster, no usage terms found. Datum itself has no logo. TymeX and Security Bank are client marks on roles held through Datum; the owner is responsible for confirming that naming these clients is allowed. The FPT and Hitachi sources were not recorded when they were added (#11).

Tool logos on `/skills/` (§4.8), the certification marks on `/skills/` and `/experiences/`, and the Claude mark on `/experiences/` and Home `#next` (§4.1.4, §4.2.0) are inlined as SVG at build by astro-icon; nothing is hot-linked or loaded at runtime. Sources: `@iconify-json/logos` 1.2.18 (CC0-1.0, Gil Barbara, github.com/gilbarbara/logos), a devDependency; the Talend and Apache Spark marks from simple-icons 16.37.0 (CC0-1.0, github.com/simple-icons/simple-icons), vendored as `src/icons/talend.svg` and `src/icons/apache-spark.svg`; no other glyph or icon set is used for these marks. The marks are their owners' trademarks, used only to identify the tool, unaltered, with the visible line "Names and logos belong to their owners; no endorsement implied." The same sources are in the header of `src/lib/tool-icons.ts`.

### 6.3 `skills`

`src/content/skills/en/cloud-platform.md`

```yaml
group: "Cloud Platform"
order: 2
description: "Build AWS data lakes and warehouses on S3, Athena, Redshift and EMR, and deliver data from Databricks on Azure."   # 1–2 sentences, max 200 chars
icon: "cloud"                   # Lucide icon name
size: "1x1"                     # 1x1 | 2x1 | 2x2 — kept for compatibility; not used
tint: "sky"                     # mint | sky | butter — kept for compatibility; not used
items:
  - name: "AWS"
    children: ["EMR", "S3", "Athena", "Redshift", "Lake Formation"]   # optional
  - name: "Azure"
    children: ["Databricks"]
```
`description` is shown on `/skills/` (Home has no skills strip, §4.1); `icon` is not used on `/skills/` (`size` and `tint` are unused since Home v2). The PDF uses only `group` and `items`.

### 6.4 `projects`

`src/content/projects/en/agentic-coding-workflow.md`

```yaml
title: "Multi-Agent Coding System"
subtitle: "AI agents that plan, build and review code, with a human in charge"
kind: "personal"                # personal | work | open-source
summary: "A Claude lead runs a team of AI coding agents through three phases and four quality gates, and a human signs off before building starts and again at review."
start: "2025"
end:                            # empty = Present
tech: ["Claude", "Antigravity", "Codex", "tmux", "hcom", "AI-DLC"]
repo: ""                        # optional
demo: ""                        # optional
image: ""                       # optional cover (16:9)
imageAlt: ""                    # required when image is set; localised per language file (the sample cover: "Illustration: three stages on a path, with gates between them, two sign-off checkmarks and a lane of agent nodes below.")
stats: []                       # optional, up to 3 of { value, label, note? }: the big numbers on the project page (sample: 2 human sign-offs per run · 0 auto-merges · 286 automated tests)
problem: ""                     # optional, the pain in plain words (the sample is three sentences)
approach: ""                    # optional, the choice and who does what
result: ""                      # optional, the proof the visitor gets
loop: {}                        # optional { title, lines }, 2–8 lines: the terminal loop on the project page
design: {}                      # optional { intro, diagram?, decisions? (≤ 4 "**Label:** problem, choice, benefit") }: "The design." band
workflow: {}                    # optional { intro?, steps (2–8 "**Label:** problem, choice, benefit") }: "The workflow." band
featured: true                  # sorted first on /projects/; the first featured project is the Home identity row's **See the project** link (§4.1.1)
inPdf: true                     # optional; defaults to the value of `featured`
role: ""                        # optional reference to experience → "At <company>" link
```
Body: labelled bullets (`- **Orchestrated Specialist Flows:** …`), shown inside the card's **Details** on `/projects/` and in full in the PDF.

### 6.5 `certifications`

`src/content/certifications/en/aws-solutions-architect-associate.md`

```yaml
name: "AWS Certified Solutions Architect – Associate"
issuer: "Amazon Web Services"
year: "2022"
credentialUrl: ""               # optional, renders a Verify link
badge: ""                       # optional image; schema-only, not rendered on the web (item 20)
logo: "logos:aws"               # optional Iconify mark (@iconify-json/logos): the issuer's, or a product mark where the owner chose one; a 32px box above the eyebrow on /experiences/ (§4.2), a 24px mark box on /skills/ (§4.8)
monogram: "AWS"                 # 2–3 letters; schema-only, not rendered on the web
```
No body. Exactly one of `year` (earned, `YYYY`) and `planned` (`YYYY-MM`, a certification not yet earned, e.g. `planned: "2027-04"`). `planned` forbids `credentialUrl` and `badge`, and the schema rejects an entry with both or neither of `year` and `planned` at build (`src/content.config.ts:134-141,150-152`; `certProblems`, `src/lib/certs.ts:21-30`). There is no credential-ID field. A planned entry has no `year`, `credentialUrl` or `badge`; it may set `logo` and does: `logo: 'logos:claude-icon'`, the Claude product mark and not the issuer's logo (owner, photo-logos; it reverses v6.12's "no logo"; `src/content.config.ts:143-147`). The planned entry is `src/content/certifications/{en,vi}/claude-certified-architect.md` (name, issuer, `planned: '2027-04'`, `logo`, monogram; EN and VI identical); its `logo` equals `NEXT_MILESTONE.logo` (`tests/unit/career-next.test.ts:157-165`, `certs.test.ts:69-85`). Earned entries are type-only cards on `/experiences/` (§4.2, `CardGroup.astro`), with the optional `logo` above the eyebrow. The planned entry is shown as *Planned · Apr 2027* / *Dự kiến · 04/2027* on `/skills/` (§4.8), as *Name (Planned · Apr 2027)* in the PDF (§4.3), as a card under *Next.* on `/experiences/` and the dated step in Home `#next` (§4.2.0), never as an earned card. Home has no certifications tile.

### 6.5.1 `education`

`src/content/education/en/nlu.md` (and `vi/`):

```yaml
name: "Nong Lam University"      # vi/: "Trường Đại học Nông Lâm TP. Hồ Chí Minh"
shortName: "NLU"
logo: "../../../assets/logos/nong-lam-university.png"   # optional school logo (image()), 32px above the eyebrow, web only
```
No body; name and logo only by design. Shown as a card on `/experiences/` (§4.2, school logo, eyebrow `shortName`, H3 `name`, no link or year) and in the PDF (name only).

The seal is the university's mark (owned by Trường Đại học Nông Lâm TP. HCM), taken from the 1200px PNG inside vi.wikipedia's `Logo_HCMUAF.svg` (tagged non-free / fair use, sourced to hcmuaf.edu.vn) and downscaled to 256px. It is used only to identify the school and shows no visible credit (owner's decision).

### 6.6 `star`

`src/content/star/en/talend-to-databricks-migration.md`

```yaml
title: "Planning the Talend → Databricks migration"
question: "Tell me about a time you set the technical direction for a team."
role: "fpt-software-senior-data-engineer"   # reference to experience; omit for "Other / Personal"
competencies: ["leadership", "ownership", "technical-depth"]
date: 2026-09-01
metrics:                        # illustrative values; replace with real ones
  - prefix: "Migrated"          # optional caption above the value (§5.10.5)
    label: "jobs"
    value: "<n>"
    note: "…"                   # optional footnote; only context already in the story
  - label: "delivery speed"
    value: "<+x%>"
    compare:                    # optional, 2–3 entries → graph bars (§5.10.9)
      - { label: "Before", value: 100 }
      - { label: "After", value: 140 }
image: "../../../assets/star/<slug>.svg"   # optional SVG diagram (§4.4)
imageAlt: ""                    # required when image is set; per language, starts "Diagram:" / "Sơ đồ:"
featured: true
```

Body (required structure, enforced by a remark plugin at build time):

```md
## Situation
...

## Task
...

## Action
...

## Result
...
```

**Competency vocabulary** (a controlled list in `src/content/competencies.ts`, so labels stay consistent; shown as the meta line on each story page): `leadership`, `ownership`, `conflict`, `failure`, `collaboration`, `influence`, `delivery`, `ambiguity`, `customer-focus`, `technical-depth`, `mentoring`, `prioritisation`. Each has EN and VI labels.

### 6.7 `blog`

`src/content/blog/en/hello-world.mdx`

```yaml
title: "Hello, world"
description: "Why I built this site and what I'll write about."
pubDate: 2026-11-01
updatedDate:                    # optional
tags: ["meta", "astro"]
heroImage: "./hero.jpg"         # optional; blog index card cover and the post-page hero image
heroImageCredit: ""           # optional; attribution for heroImage, [text](url) links allowed; shown under the blog list and as the post hero caption
dropcap: false                  # optional; Newsroom drop cap on the first paragraph (§5.10.8)
draft: false
series: ""                      # optional, id of an entry in the `series` collection
seriesPart:                     # required when `series` is set; integer ≥ 1, unique within the series
topic: ""                       # optional, id of an entry in the `topics` collection (§6.9)
```

The schema checks that `series` exists, that `seriesPart` is unique within the series and language, and that `seriesPart` matches a part listed in the series entry. A post in a series takes the series' topic, and a `topic` that conflicts with it fails the build; an unknown topic fails the build. A post with no topic falls under the "Notes" group.

The Neovim setup guide covers (`src/assets/blog/neovim-setup/part-N.svg`) reuse the Neovim logo mark by Jason Long, licensed CC BY 3.0, modified (dark tile with the part number). The posts show no visible credit (owner's decision); `heroImageCredit` stays available for covers that need one.

### 6.8 `series`

`src/content/series/en/neovim-setup-guide.md`

```yaml
title: "Neovim setup guide"
description: "Build a fast, minimal Neovim 0.12 setup for web, data engineering and SRE work, one step at a time."
tagline: "Five parts, from zero to a working editor."  # optional; not used on Home
snippet: ['vim.g.mapleader = " "']  # optional, ≤ 6 lines copied verbatim from a part
topic: developer-tools          # optional, id of an entry in the `topics` collection (§6.9)
parts:
  - part: 1
    title: "From zero to a working editor"
    description: "Install the tools, get the config, first launch and checks."
  - part: 2
    title: "Languages: LSP, completion, formatting and linting"
  - part: 3
    title: "Data engineering: dbt, SQL, databases and CloudFormation"
  - part: 4
    title: "Java with nvim-jdtls"
  - part: 5
    title: "Debugging, testing and the daily workflow"
```
Body: optional series intro, shown on the series index page. A part counts as **published** when a non-draft blog post has a matching `series` + `seriesPart`. Otherwise it shows as "Coming soon".

### 6.9 `topics`

`src/content/topics/en/developer-tools.md` (one file per language, same slug)

```yaml
title: "Developer tools"
description: "Editors, terminals and the setup behind day-to-day work."   # one line
order: 1                        # number; breaks ties between topic groups dated the same
```
Body: the topic intro, 2 to 4 sentences of plain text, shown on the topic page. Seeded topics: `developer-tools`, `data-engineering`, `platforms-sre`, `java`. The slug `other` is reserved for the fallback group ("Notes") and fails the build if used. The index lists only topics that have at least one published post.

---

## 7. Internationalisation

- Astro i18n routing: `defaultLocale: 'en'`, `locales: ['en', 'vi']`, `prefixDefaultLocale: false`. English lives at `/`, Vietnamese at `/vi/`.
- **UI strings** (nav, buttons, labels, dates) live in `src/i18n/en.json` and `src/i18n/vi.json`, read through a typed `t(key)` helper. A missing key fails `astro check`. The key `blog.read` is kept because the untracked duplicate `FeatureTile 2.astro` still uses it, and `blog.more` is kept alongside it; drop both once the duplicate is gone.
- **Dates** use `Intl.DateTimeFormat` with `en-GB` / `vi-VN`.
- **Language switch** in the nav goes to the same page in the other language when a translation exists, otherwise to that language's section index.
- **Missing translations:** when a `vi/` content file does not exist, the `/vi/` page shows the English content with a small banner: *"Nội dung này hiện chỉ có bằng tiếng Anh."* (`<html lang>` and `hreflang` reflect the real content language.)
- SEO: `<link rel="alternate" hreflang="en|vi|x-default">` on every page, and per-language sitemaps via `@astrojs/sitemap` i18n config.

---

## 8. Platform features

### 8.1 Search (Pagefind)

- Runs after `astro build`: `pagefind --site dist`.
- Indexes: blog posts, In practice stories (`/star/<slug>/`), the Experiences page, the Projects page (each tile is a sub-result through `data-pagefind-meta` and its `#<slug>` anchor). Excludes: `/experiences/print/`, tag index pages, 404.
- Separate indexes per language (Pagefind detects `<html lang>`).
- Results appear in the search panel (§5.7) with the page type (Blog / In practice / Experiences / Projects), title and a highlighted excerpt.
- The Pagefind script loads only when the search panel is first opened.

### 8.2 Analytics (Cloudflare Web Analytics)

- JS beacon with the site token from the env var `PUBLIC_CF_BEACON_TOKEN` (a GitHub Actions repository variable; see §11.3).
- Injected **only in production builds** and only when the token is set.
- Cookie-free, so no consent banner is required. The footer's legal row says "Privacy-friendly analytics, no cookies." (§5.9).

### 8.3 Contact

- `mailto:`, `tel:`, LinkedIn and GitHub as links in the footer's Connect column (§5.9); on Home they are also the Email me pill in `#top` and the "Let's talk." band (§4.1), plus the PDF.
- No form and no third-party scripts.

### 8.4 SEO and metadata

- Per-page `<title>`, meta description, canonical URL, Open Graph + Twitter card tags using one static default image (`public/og-default.png`, 1200×630: a white card with the round portrait and the name and headline in Inter, 600 weight, generated by `scripts/og-image.ts`; re-run `pnpm exec tsx scripts/og-image.ts` after the photo or the profile name or headline changes).
- Icons: `public/favicon-48.png` (48×48, round, transparent corners; `<link rel="icon" sizes="48x48" type="image/png">`) and `public/apple-touch-icon.png` (180×180, opaque; `<link rel="apple-touch-icon" sizes="180x180">`), both linked in `BaseLayout.astro`. `scripts/brand-images.ts` generates them from the stripped 600×600 head-and-shoulders crop `src/assets/profile/avatar.jpg` (`pnpm exec tsx scripts/brand-images.ts`; to re-crop from a new photo, `pnpm exec tsx scripts/brand-images.ts --import <photo>`). The original photo is never committed. The committed copies are `avatar.jpg` (the 600 × 600 crop), `photo.jpg` (the whole photo, 600 × 894, the cut-out's source; `pnpm exec tsx scripts/brand-images.ts --photo <photo>`, owner, profile-image-full) and `photo-cutout.png` (the Home cut-out, 600 × 894 RGBA, §4.1.3; `pnpm exec tsx scripts/portrait-cutout.ts`, owner, photo-align-cutout), and every derivative (avatar, photo, cut-out, icons, share card) carries no metadata (EXIF, XMP, IPTC, GPS, ICC; a PNG carries image chunks only); the scripts and `tests/unit/brand-images.test.ts` enforce it.
- `@astrojs/sitemap`, `robots.txt`, JSON-LD `Person` on home/Experiences and `BlogPosting` on posts.
- `public/.nojekyll` so GitHub Pages serves `_astro/` assets.

---

## 9. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | Lighthouse (mobile) ≥ 95 for Performance, Accessibility, Best Practices, SEO on Home, Experiences, In practice, a blog post. LCP < 2.0s, CLS < 0.05, INP < 200ms. |
| JS budget | ≤ 30 KB (gzip) JS on any page before search is opened (the mobile menu and local-nav helpers count towards it). No client framework runtime (Astro islands only if truly needed). |
| Images | `astro:assets` `<Image>` with AVIF/WebP, explicit width/height, lazy-loaded below the fold. Inline token-themed SVG art, story diagrams and highlight diagrams are the exception (§5.10.11). |
| Accessibility | WCAG 2.2 AA. Skip link, visible focus rings, landmarks, one H1 per page, `aria-current` in nav, 44×44px touch targets at compact chrome and on touch devices (dense pointer-layout lists such as the footer directory meet SC 2.5.8, ≥ 24px targets or spacing), works at 200% zoom and with keyboard only. |
| Browser support | Last 2 versions of Safari (macOS/iOS), Chrome, Edge, Firefox. Graceful fallback when `backdrop-filter` or `animation-timeline` is missing. |
| Responsiveness | No horizontal scroll from 320px wide upward. |
| Resilience | All content readable and every page reachable with JS disabled (search, the theme toggle and the Projects filter are the only JS-only features). |
| Privacy | No cookies, no third-party fonts, analytics beacon is the only third-party request. |

---

## 10. Project structure

```
.
├── .github/                  # workflows, composite setup action, Dependabot, PR template (§11.2)
├── public/
│   ├── .nojekyll
│   ├── favicon-48.png
│   ├── apple-touch-icon.png
│   ├── og-default.png
│   └── robots.txt
├── scripts/
│   ├── build-cv-pdf.ts
│   ├── capture-wall.ts       # the Home wall's captures, from a built dist/, by hand (§4.1.2)
│   ├── portrait-cutout.ts    # keys photo.jpg into photo-cutout.png, the Home cut-out (§4.1.3)
│   ├── lib/png.ts            # imageChunksOnly, shared by the image scripts
│   └── setup-repo.sh         # one-time GitHub settings via gh api (§11.9)
├── src/
│   ├── assets/
│   │   ├── wall/             # the 48 committed captures <id>-<lang>-<theme>.png, 1280 × 800 (§4.1.2)
│   │   └── profile/          # avatar.jpg (the nav photo, icons, share card), photo.jpg (the cut-out's source, §4.1.3), photo-cutout.png (the Home photo, §4.1.3), avatar-cutout.png (unused)
│   ├── components/
│   │   ├── nav/              # GlobalNav, MobileMenu, ThemeToggle, LangSwitch
│   │   ├── ui/               # PillButton, Chip, ChevronLink, Card
│   │   ├── tile/             # Section, Hero, TileGrid, Tile, SectionHeader, StatStrip, CloserLook, Gallery, StatCard (§5.10)
│   │   ├── localnav/         # LocalNav (bar + <details> dropdown, §5.8)
│   │   ├── footer/           # Footer, Breadcrumbs, Directory (§5.9)
│   │   ├── home/             # HomeWall (the `#top` wall and identity row), HomeNext, LetsTalk; StoryChapter, WritingShelf are not imported by any page now
│   │   ├── experiences/      # Chapter, CardGroup, ContactBox, CareerRow, HighlightsGallery (not imported by any page now)
│   │   ├── cv/               # PrintSkillsTable and the print layout's own markup
│   │   ├── projects/         # ProjectGridTile
│   │   ├── star/             # StoryTeaser (the /star/ desk card)
│   │   ├── blog/             # PostCards, PostCard, Toc, CopyCodeButton, ReadingTime, Callout, SeriesBox, SeriesNav, SeriesCard
│   │   │   └── diagrams/     # NeovimStartupDiagram.astro, …
│   │   └── search/           # SearchPanel (§5.7)
│   ├── content/
│   │   ├── profile/{en,vi}/
│   │   ├── experience/{en,vi}/
│   │   ├── skills/{en,vi}/
│   │   ├── projects/{en,vi}/
│   │   ├── certifications/{en,vi}/
│   │   ├── education/{en,vi}/
│   │   ├── star/{en,vi}/
│   │   ├── blog/{en,vi}/
│   │   ├── series/{en,vi}/
│   │   └── competencies.ts
│   ├── content.config.ts     # collection schemas
│   ├── i18n/                 # en.json, vi.json, t() helper, route helpers
│   ├── layouts/              # BaseLayout, PostLayout, PrintLayout
│   ├── lib/                  # reading-time, remark-star-sections, sort/group utils
│   ├── pages/                # routes (EN at root, VI under [lang] or /vi)
│   ├── scripts/              # reveal.ts, theme.ts, toc.ts, search.ts, gallery.ts, closer-look.ts
│   └── styles/               # tokens.css, global.css, prose.css, print.css
├── tests/
│   ├── unit/                 # Vitest
│   └── e2e/                  # Playwright + axe
├── astro.config.mjs
├── lighthouserc.json
├── lychee.toml
├── playwright.config.ts
├── .nvmrc
├── tailwind / postcss config (as needed for Tailwind version)
├── tsconfig.json             # strict
├── package.json
└── spec.md
```

### 10.1 npm scripts

| Script | Does |
|---|---|
| `dev` | `astro dev` |
| `build` | `astro build && pagefind --site dist && tsx scripts/build-cv-pdf.ts` |
| `preview` | `astro preview` |
| `check` | `astro check` (types + content schemas) |
| `lint` / `format` / `format:check` | ESLint + Prettier (with `prettier-plugin-astro`, `prettier-plugin-tailwindcss`) |
| `test` | Vitest unit tests |
| `test:pdf` | Checks `dist/cv.pdf` and `dist/vi/cv.pdf` (§12) |
| `test:e2e` | Playwright e2e + accessibility against the built site |
| `lhci` | Lighthouse CI with budgets |
| `verify` | Runs the CI gates locally: `lint && format:check && check && test && build && test:pdf && test:e2e` |

Tooling: Node 24 LTS (Astro needs ≥ 22.23.4), pnpm, TypeScript strict.

---

## 11. CI/CD (GitHub Actions)

### 11.1 Summary

| Area | Decision |
|---|---|
| Repo | `ryanparker97/ryanparker97.github.io` (public), default branch `main` |
| Site | `https://ryanparker97.github.io`. `astro.config.mjs`: `site: 'https://ryanparker97.github.io'`, no `base` |
| Change flow | **PRs only.** `main` is protected by a ruleset. No direct pushes, no force pushes, nobody can bypass (admins included) |
| Approvals | **None required.** You can merge your own PR once every required check passes |
| Required gates | Lint + types + unit · E2E + accessibility · Lighthouse budgets · Link check · CodeQL |
| PR preview | Build artifact (site, CV PDFs) + Playwright, Lighthouse and link reports, plus a job summary on the run page. No live preview URL |
| Deploy trigger | **Every merge to `main`**, plus manual `workflow_dispatch` |
| Deploy method | Pages source = **GitHub Actions**. The deploy job publishes the **same artifact that passed the gates**; the site is not rebuilt for deploy |
| Dependencies | **Dependabot**: weekly grouped PRs for npm minor/patch and for GitHub Actions; major npm updates as separate PRs |
| Security | Actions pinned to full commit SHAs · least-privilege `GITHUB_TOKEN` · CodeQL (JS/TS + Actions) · secret scanning + push protection |

### 11.2 Files

```
.github/
├── actions/setup/action.yml    # composite: pnpm, node, install (run after actions/checkout)
├── workflows/
│   ├── ci.yml                  # gates on PRs; gates + deploy on main
│   └── codeql.yml              # CodeQL on PRs, main and weekly
├── dependabot.yml
└── pull_request_template.md
lighthouserc.json               # Lighthouse CI URLs + assertions
lychee.toml                     # link checker config
playwright.config.ts            # e2e projects + webServer serving dist/
.nvmrc                          # 24
package.json                    # "packageManager": "pnpm@<exact>", "engines": { "node": ">=22" }
```

### 11.3 `ci.yml` pipeline

**Triggers:** `pull_request` (to `main`), `push` (to `main`), `workflow_dispatch`.

```
              ┌──────────┐
              │  static  │  lint · format check · astro check · vitest · actionlint · zizmor
              └────┬─────┘
              ┌────▼─────┐
              │  build   │  astro build → pagefind → CV PDFs → PDF checks → upload "site" artifact
              └────┬─────┘
      ┌────────────┼──────────────┬───────────────┐
┌─────▼─────┐ ┌────▼───────┐ ┌────▼─────┐         │
│ e2e       │ │ lighthouse │ │  links   │         │
│ chromium  │ │            │ │          │         │
│ webkit    │ │            │ │          │         │
└─────┬─────┘ └────┬───────┘ └────┬─────┘         │
      └────────────┴──────┬───────┘               │
                    ┌─────▼─────┐                 │
                    │  ci-ok    │  single required check (aggregates all of the above)
                    └─────┬─────┘
                          │  only on push to main / workflow_dispatch on main
                    ┌─────▼─────┐
                    │  deploy   │  upload-pages-artifact → deploy-pages (env: github-pages)
                    └─────┬─────┘
                    ┌─────▼─────┐
                    │  smoke    │  HTTP checks against https://ryanparker97.github.io
                    └───────────┘
```

| Job | Needs | Does | Timeout |
|---|---|---|---|
| `static` | — | `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm format:check` → `pnpm check` (types + content schemas) → `pnpm test` (Vitest) → `actionlint` → `zizmor` (Actions security lint) | 10 min |
| `build` | `static` | Restore the Playwright Chromium cache → `pnpm build` (Astro → Pagefind → CV PDFs) → `pnpm test:pdf` (§12 CV PDF checks) → upload `dist/` as artifact **`site`** (retention 7 days on PRs, 30 on `main`). On `main` only: also `actions/upload-pages-artifact` with `dist/` | 15 min |
| `e2e` | `build` | Matrix `browser: [chromium, webkit]`. Downloads `site`, serves it with Playwright's `webServer` (static server on `dist/`), runs e2e + axe (light/dark × EN/VI). Uploads `playwright-report-<browser>` (HTML report + traces on failure) | 20 min |
| `lighthouse` | `build` | `pnpm lhci autorun` with `staticDistDir: ./dist`, mobile preset, 3 runs (median), URLs `/`, `/experiences/`, `/projects/`, `/star/`, one blog post, `/vi/`. Assert every category ≥ 0.95. Uploads `lighthouse-report` (filesystem target; reports are **not** sent to public temporary storage) | 15 min |
| `links` | `build` | `lycheeverse/lychee-action` on `dist/**/*.html` with `--root-dir dist`. **Internal links fail the job**. External links run in a second, non-failing pass and are listed as warnings in the summary. Uploads `link-report` | 10 min |
| `ci-ok` | all above | `if: always()`. Fails unless every needed job's result is `success`. **This is the one required status check**, so matrix or job renames never break the ruleset | 2 min |
| `deploy` | `ci-ok` | `if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'`. Environment `github-pages` (URL output = page URL). `actions/deploy-pages` | 10 min |
| `smoke` | `deploy` | Retries for up to 2 min until the new build is live, then checks: `/`, `/experiences/`, `/projects/`, `/vi/`, `/star/`, `/blog/`, `/rss.xml`, `/sitemap-index.xml` → 200; `/cv/` and `/vi/cv/` (redirect pages, 200 with meta refresh) and `/vi/experiences/` → 200; `/cv.pdf` and `/vi/cv.pdf` → 200 + `application/pdf`; `/pagefind/pagefind.js` → 200; `/does-not-exist` → 404 | 5 min |

**Shared setup:** every job that needs the repo starts with `actions/checkout` (`persist-credentials: false`), because a local action can only be resolved after checkout. It then calls the composite action `.github/actions/setup/action.yml`: `pnpm/action-setup` (version from `packageManager`) → `actions/setup-node` (`node-version-file: .nvmrc`, `cache: pnpm`) → `pnpm install --frozen-lockfile`.

**Caching**
- pnpm store: through `setup-node`'s `cache: pnpm`, keyed on `pnpm-lock.yaml`.
- Playwright browsers: `actions/cache` on `~/.cache/ms-playwright`, keyed on the installed `@playwright/test` version. On a cache hit, only `playwright install-deps` runs.
- Astro image cache: `actions/cache` on `node_modules/.astro`, keyed on `hashFiles('src/**/*.{png,jpg,jpeg,webp,avif,svg}')`.

**Job summary** (`$GITHUB_STEP_SUMMARY`), written by each job so the run page works as the PR preview:
- `build`: page count, `dist/` size, both PDFs' page counts and sizes.
- `e2e`: pass/fail counts per browser and any axe violations (rule, page, theme, locale).
- `lighthouse`: a score table per URL and category.
- `links`: broken internal links (failures) and broken external links (warnings).
- A footer listing the downloadable artifacts.

**Concurrency**
- Workflow level: `group: ci-${{ github.event.pull_request.number || github.ref }}`, `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`. A new push to a PR cancels the old run, and `main` runs are never cancelled.
- `deploy` job: `group: pages`, `cancel-in-progress: false` (GitHub's recommendation, so a deploy never stops halfway).

**Environment variables**
- `PUBLIC_CF_BEACON_TOKEN` is a **repository variable** (`vars.`), not a secret, because it ends up in the public HTML anyway. The `build` job sets it **only for `main`** (`${{ github.ref == 'refs/heads/main' && vars.PUBLIC_CF_BEACON_TOKEN || '' }}`), so PR builds and test runs never send analytics.
- No secrets are needed in v1.

**Performance target:** a PR run finishes in **≤ 10 min** with a warm cache.

### 11.4 `codeql.yml`

- **Triggers:** `pull_request` to `main`, `push` to `main`, and a weekly schedule (Monday 05:00 UTC).
- **Languages (matrix):** `javascript-typescript` (`build-mode: none`) and `actions` (checks workflows for injection and unsafe patterns).
- **Queries:** `security-extended`.
- **Permissions:** `contents: read`, `security-events: write`, `actions: read`.
- Uses **advanced setup** (this file), so CodeQL "default setup" must stay **off** in repo settings.
- The `Analyze (javascript-typescript)` and `Analyze (actions)` checks are required in the ruleset (§11.6).

### 11.5 Security hardening

| Control | Spec |
|---|---|
| **Pin actions to SHA** | Every `uses:` points to a full 40-character commit SHA followed by a version comment, e.g. `actions/checkout@<sha> # v4.2.2`. Dependabot (`github-actions` ecosystem) updates both. Repo setting: allow only GitHub-owned actions, verified-creator actions, and an explicit allow-list (`pnpm/action-setup`, `lycheeverse/lychee-action`). Turn on **"Require actions to be pinned to a full-length commit SHA"** in that same policy. |
| **Least-privilege tokens** | Repo setting *Workflow permissions* = **read repository contents**. Each workflow starts with `permissions: { contents: read }`. Only `deploy` adds `pages: write` and `id-token: write`, and only the CodeQL job adds `security-events: write`. No job needs `pull-requests: write`, because summaries replace PR comments. |
| **No unsafe triggers** | No `pull_request_target` and no `workflow_run`. Untrusted values (`github.event.pull_request.title`, branch names, …) are never put directly into `run:`. They are passed through `env:` instead, and `zizmor` + CodeQL `actions` enforce this. |
| **Checkout** | `persist-credentials: false` everywhere, so the token isn't left in `.git/config` for later steps. |
| **CodeQL** | §11.4. Alerts are reviewed in *Security → Code scanning*. A new **high or critical** alert on a PR fails the check. |
| **Secret scanning + push protection** | On (free for public repos). Pushes containing detected tokens are blocked. Also turn on **Dependabot alerts** and **Dependabot security updates**. |
| **Environment** | `github-pages` environment with deployment branch rule **`main` only**, so no other branch can deploy, even through `workflow_dispatch`. |
| **Fork PRs** | Use the default setting *"Require approval for first-time contributors"*. Fork runs get a read-only token and no variables are needed. |

### 11.6 Branch protection (ruleset on `main`)

Set up with **Settings → Rules → Rulesets** (not legacy branch protection):

| Rule | Setting |
|---|---|
| Target | Default branch (`main`) |
| Bypass list | **Empty** (admins can't bypass) |
| Restrict deletions | On |
| Block force pushes | On |
| Require a pull request before merging | On · required approvals **0** · dismiss stale approvals off · require conversation resolution **on** |
| Require status checks to pass | On · **require branches to be up to date before merging** · required checks: `ci-ok`, `Analyze (javascript-typescript)`, `Analyze (actions)` |
| Require linear history | On |

**Merge settings:** allow **squash merge only**, using the PR title as the commit message. Turn on *Automatically delete head branches*. Turn on *Allow auto-merge*, so you can queue a PR to merge once checks pass.

Because branches must be up to date, the squash commit on `main` is exactly the tested tree. The `main` run still repeats all gates before deploying, as a final safety net.

### 11.7 Dependabot (`.github/dependabot.yml`)

| Ecosystem | Schedule | Grouping | Notes |
|---|---|---|---|
| `npm` (pnpm lockfile) | Weekly, Monday 06:00 `Asia/Ho_Chi_Minh` | Group **`npm-minor-patch`** (`update-types: [minor, patch]`). **Majors open one PR each** | `open-pull-requests-limit: 5`, labels `dependencies`, `npm`, commit prefix `chore(deps)` |
| `github-actions` | Weekly, Monday 06:00 `Asia/Ho_Chi_Minh` | Group **`actions`** (all update types) | Updates the SHA and the version comment together; labels `dependencies`, `ci`, prefix `chore(ci)` |

- Dependabot PRs go through the same gates. They are **not auto-merged** in v1; you merge them by hand once green.
- Security updates (from Dependabot alerts) open right away, outside the weekly schedule.

### 11.8 Deploy, verify, roll back

- **Deploy:** merging a PR → `ci.yml` on `main` → gates → `deploy` → `smoke`. The *Deployments* panel shows the `github-pages` environment with the live URL.
- **Manual deploy:** *Actions → CI → Run workflow* on `main`. It runs all the gates first.
- **Failure alerts:** a failed `main` run (gates, deploy or smoke) emails you through GitHub's default Actions notifications. A failed gate means **nothing is deployed** and the previous version stays live.
- **Roll back:**
  1. **Fast:** open the last good `main` run and **re-run its `deploy` job**. This republishes that run's Pages artifact (kept for 30 days).
  2. **Permanent:** open a PR that reverts the bad commit (`git revert`), then merge it.

### 11.9 One-time repo setup checklist

Done once by hand, or with `scripts/setup-repo.sh` (a `gh api` script added in M1):

- [ ] Pages → Source: **GitHub Actions**
- [ ] Environment `github-pages` → deployment branches: `main` only
- [ ] Actions → General → Workflow permissions: **read** · allowed actions policy + SHA pinning required (§11.5)
- [ ] Variable `PUBLIC_CF_BEACON_TOKEN`
- [ ] Code security: secret scanning, push protection, Dependabot alerts + security updates on. CodeQL default setup **off**
- [ ] Ruleset on `main` (§11.6)
- [ ] Merge settings: squash only, auto-delete branches, allow auto-merge
- [ ] README: CI status badge + link to the site

### 11.10 Acceptance criteria

- A PR that breaks lint, types, a content schema, a unit test, an e2e or axe test, a Lighthouse budget, an internal link, or CodeQL **cannot be merged**.
- A direct `git push origin main` is rejected, including for the repo admin.
- Merging a green PR makes the change live at `https://ryanparker97.github.io` without manual steps, and `smoke` passes.
- The PR run page has downloadable `site` (with `cv.pdf` and `vi/cv.pdf`), Playwright, Lighthouse and link reports, plus a readable summary.
- Every third-party `uses:` is pinned to a 40-character SHA; `actionlint` and `zizmor` pass.
- PR builds contain no Cloudflare beacon.
- Re-running an old `deploy` job restores that version of the site.

---

## 12. Testing strategy

| Layer | Tool | Covers |
|---|---|---|
| Content validation | Astro content collections (Zod) | Required fields, dates, enums, references (`role` must match an experience slug; `series` must exist and `seriesPart` must be unique and listed), competency vocabulary |
| Unit | Vitest | STAR section parser (valid / missing / out-of-order headings, VI headings), `formatCvDate()` (`YYYY` vs `YYYY-MM`, EN vs VI, empty `end` → Present), role sorting (current first, year-only dates, same company twice), company/client display, reading time, "Other / Personal" grouping, i18n `t()` and route helpers, VI→EN content fallback (`localize()`: VI used with no fallback; missing VI → EN with fallback true), tile subline clamp, tag slugging, the Tech stack list (`tech-stack.test.ts`: the six skill-role groups, 16 tools, the drift check against the `/skills/` data with the PySpark merge and the six exclusions, 7 plated, the role throws, edge cases) |
| CV PDF | Playwright + `pdf-lib` | `dist/cv.pdf` and `dist/vi/cv.pdf` exist, are US Letter, ≤ 2 pages, contain the name, headline, every role title, every `inPdf` project title, every skill group name, "Languages" and every certification as *name (when)* (`scripts/test-pdf.ts:36`: the year, or *Planned · Apr 2027* / *Dự kiến · 04/2027*), and contain `mailto:` / `tel:` link annotations |
| E2E | Playwright | **Site frame (§5):** light default with no saved preference, theme cycles Light → Dark → System and survives reload with no flash; language switch keeps the page; global nav heights, `space-between` row and `aria-current`; brand photo in the nav on every page (28px, round, alt empty, link named en + vi, 1x/2x, no CLS, keyline light and dark, round focus ring, flush with the column's left edge, 44px target); search panel (⌘K, `/`, Quick links, results, Esc restores focus); mobile menu (open/close/focus trap/scroll lock/JS-off row); local nav on every inner page (links, small pill, dropdown at 375px with its close rules and JS-off `<details>`); footer breadcrumbs, directory and accordions; anchors land below both bars with eyebrows visible; type sizes at 1440 / 900 / 375; no horizontal scroll and 44px targets at 320 / 375 / 430; motion rules (§5.11) with and without reduced motion. **Alignment (§5.2):** `geometry.ts` is the shared helper (`expectFourSides` with an equal or free bottom, `expectEqualHeights` with an optional minimum, `expectOnColumn`, `centreLines`, `inkBox` at DPR 3); every assertion throws on its failing fixture and an empty selector list throws, proven by `geometry.spec.ts` (55 tests per engine). `alignment.spec.ts` (124 tests per engine, `--list`) measures Home, Experiences, a role page, Projects, a project page, In practice, a story, Blog, a post, Skills and 404 at 1440 / 1024 / 390 / 320 (VI at 1440, 1024 and 390), light and dark, within 0.5px: the nav, local nav, footer and open search panel on the column; wide sections, role and project cards, the closer, the device frame, the big strip and the Home row on the column; the menu lines ending on the column; the footer columns at 1024; equal insets for group and highlight cards (bottom free), the contact box, story teasers and callouts; equal heights; the callout and nav icons centred. **Mark boxes:** `logo-box.spec.ts` (40 tests per engine) pins the §4.8 rule on `/skills/`, the 32px card marks, the *Next.* step mark and the DPR-3 ink of each. **Home (§4.1, the Wall):** `main > *` are `section#top`, `section#next` and `section#more` (`#more` last, the one grey band, with the footer's 1px rule; no split wrapper, board, footnotes, `.bento-tile`, `.band-body` or `[class*="fp-"]`); one H1 that is the profile name in ink (no `.text-gradient`, eyebrow or kicker), the role line directly below it, the sentence, the four "›" links (hrefs and names, EN and VI), the Download CV and Email me pills; no local nav (`[data-local-nav]` 0, one global nav row that is sticky by itself, `main a[download]` 1); the first screen (H1, links row and pills end at or above 900px at 1440 × 900; at 375 × 812 the photo, H1 and whole intro end at or above 812px and the pills are below, owner-accepted; the wall starts under the nav); the wall: a full-width `aria-hidden` clip at 560 / 400 / 300px with `overflow: clip` and a mask to transparent, a 4-column (3 below 735px) `matrix3d`-tilted grid, 12 `tabindex="-1"` tiles with the wall's hrefs in order, 24 pictures with empty alts and sizes, the frame spans the text at 1440 and 1069 (top on the text's top, bottom on the pills' bottom) and the three stack at 390 and 320, the fade to white / black at the clip's bottom; the name (72 / 56 / 44px) on one line at 100% text at 1440 / 1069 / 768 / 390 / 320 in Chromium and WebKit (also with Inter forced and blocked) and capped at 19vw, at most two lines and inside its column at 200% text; the tilt identical with and without a motion preference and the only `transform` in `main`; the pictures are real WebP captures in the page's language only (a light visit fetches no dark file; the theme and the system preference swap all twelve and the frame stays transparent), the six eager tiles at 390, the byte caps (150 KB at 1440 light, 170 KB at 390 DPR 2 light, 220 KB at 1440 dark; Chromium) and no layout shift; the cut-out in its 288 × 456.5 / 216 × 436.9 / 160 × 238.4px frame (v6.26) (img = frame box, drawn `object-fit: contain` at its natural ratio, never cover) (empty alt, not a link, loaded, sharp at 2x and 3x, the frame transparent in light and dark, the served alpha and no halo) and the 2 × 2 links grid at every width; `#next` (H2, both goals equal to the `/experiences/` Next cards in en and vi, links with the cards' hrefs, wording rules, axe clean in light and dark) and `#more` (text only, legal-name line); nothing CV-like and no story title in `main`'s text; the exact set of `main` links in en and vi; axe clean in `#top`; Tab reaches See every role first and never a wall tile; no horizontal scroll at 320 / 390 / 768 / 1069 / 1440 and with text at 200%; no sticky element in `main`; reduced motion (no reveal offset); JS off (`home.spec.ts`, 168 tests per engine). **Experiences (§4.2):** the Layout B hero, no summary/skills/chapters, one role card per role in sort order linking to its page (local-nav links match), certification cards newest first, 4 / 2 / 1-up columns with the 12px card gap, role cards carrying only the company logo `img` (exactly one visible per theme; certification cards carry only the issuer logo svg and the Education card the school logo img), role-card and role-page-header logos in both themes (en + vi), every role has a logo, the print page has no images, education card per locale (name, NLU, logo, no year or link), the contact box (mailto, tel, LinkedIn, 44px links), white last band with no footer rule, `#<role-slug>` anchors landing on the card, peek rule, search sub-result into a role page, 320px, JS off. **Role pages (§4.2.3):** one page per role, local nav (title links to `/experiences/`), cards, tech marks and chips, no Current chip, story pill, sticky storytelling at 1440 and stacked at 900. **Skills (§4.8):** one row per group, certifications and languages, two columns at L; on `/skills/` and `/vi/skills/` the 39 tool rows (16 brand rows each with exactly one 20px `aria-hidden` logo in its 24px mark box, no `title`, ids matching the `tool-icons.ts` map; 23 rows with no icon, an empty slot in mixed bands and none in the all-blank AI Engineering and Methodologies bands, names aligned per band), the 10 sub-items (8 with one 16px logo, EMR and CDK none), no Lucide icon in the band, no other svg, `img` or chip in the band; the logos note once per page (en and vi); dark theme plates only the low-contrast marks, light theme none and Talend keeps its `#FF6D70`; no horizontal scroll at 390 and 320. **Projects (§4.6):** nav order, `?kind=` filter + Back/Forward, empty state, lineup tile (one primary, laptop-framed cover), `/projects/#<slug>` deep link, product page link. **Project page (§4.6.1):** bands, frame ratio and cover alt, stats (2 / 0 / 286, en and vi labels) and footnotes, design diagram (role=img, title, six-item text alternative, unique ids, text at least 14px from 320 to 1440, en and vi labels fit their boxes and lanes on both axes at 320 / 375 / 768 / 1024 / 1440), highlight cards and the approach band, workflow steps, terminal motion / reduced / no-JS. **In practice (§4.4):** the desk (lead = newest, tiles, "More from" rule at 2 and 7 stories, `deskSlots`), story cards, no filter and an old `?c=` link still showing every story, no client script, `/star/#<role-slug>` landing in view, story article (four sections, interview-question standfirst, metrics), footnotes only for metrics with a note, story diagrams (desk and page, en + vi, theme). **Blog (§4.5):** TOC, copy button skips `$`, series box and prev/next skip unpublished parts, "1 of 5 published", diagrams switch layout between S and M, RSS valid XML. **Other:** `brand.spec` (icon links and files, share card size and pixels); CV PDF link returns 200 + `application/pdf`; 404 page with its site index. Mobile runs use the `iPhone 13` (WebKit) and `Pixel 7` (Chromium) device profiles plus a 320px viewport |
| Accessibility | `@axe-core/playwright` | Every route type in light **and** dark, EN **and** VI. Zero serious/critical violations |
| Visual (optional) | Playwright screenshots | Home, Experiences, Projects, In practice, post at 375 / 900 / 1440 widths (S / M / L) in both themes |
| Performance | Lighthouse CI | Budgets from §9; fails the PR if a score drops below 95 |
| Links | lychee | No broken internal links. External links are reported as warnings |
| Reduced motion | Playwright with `reducedMotion: 'reduce'` | Content visible immediately, no transforms applied |
| CI config | `actionlint`, `zizmor` | Workflow syntax, SHA pinning, token permissions, injection-prone expressions |
| Post-deploy | `smoke` job (§11.3) | Live site routes, PDFs and search assets respond correctly |

All layers except "Visual (optional)" are **required gates** in CI (§11). E2E runs on **Chromium and WebKit**, because Safari is a primary target.

---

## 13. Milestones

M1–M10 are done. Their section references point to the spec as it was when they shipped (see Appendix C); §4 and §5 now describe the v4.0 target, built in M11 and M12.

| # | Milestone | Deliverables |
|---|---|---|
| M1 | Foundation | Astro + Tailwind + TS strict, design tokens, fonts, BaseLayout, glass nav, footer, theme toggle (no flash), i18n scaffolding. **CI/CD from day one:** `ci.yml`, `codeql.yml`, Dependabot, ruleset and repo settings (§11.9), first deploy to `ryanparker97.github.io`. Gates that have no tests yet (e2e, Lighthouse URLs) start with a placeholder home-page test and grow with each milestone |
| M2 | Experiences and CV PDF | Content schemas, migrate `cv.tex` content (Appendix A checklist), header + summary, timeline, **Projects page** (nav item, kind filter, in-place Details), print layout (with selected projects, skills table, languages and certifications), US Letter PDF generation in CI |
| M3 | STAR | Schema + remark section validator, grouped page, stepper, filters, permalinks, Experiences ↔ STAR links |
| M4 | Blog | Index, post layout (Newsreader, TOC, Shiki, copy, code titles, line highlights), callouts, `<kbd>`, inline SVG diagram support, **series** (collection, box, prev/next part, index pages), tags, RSS, reading time. **First post** (Appendix B) in EN + VI, with its startup diagram |
| M5 | Home + polish | Hero, highlights bento, **technical skills bento** (descriptions, icons, languages card), **certifications badge cards**, featured stories/posts, scroll reveal, reduced motion, SEO/JSON-LD, OG default image |
| M6 | Search, analytics, VI | Pagefind modal, Cloudflare beacon, Vietnamese UI strings + sample translations, hreflang |
| M7 | Quality gate | Full e2e, axe, Lighthouse budgets, link check green; sample content replaced with real content (STAR: the sample stories are replaced by the real `emr-cost-optimization` story) |
| M8 | Home v1.1 layout (superseded by M9) | Profile rail / header (§4.1.1) with section index scroll-spy, build-time balanced skills columns (§4.1.3), Work & writing row (§4.1.4), count-adaptive STAR row (§4.1.5), compact contact band (§4.1.6), wide Home container + full-bleed bands (§5.4), `profile.headlineMetric` in the schema (§6.1). Remove `HighlightsBento`, `LanguagesCard`, `SkillsBento` and the v1 certification cards. Update e2e/axe/Lighthouse per §12; all gates stay green |
| M9 | Home v2.0 (Apple-style tiles) | Rebuild Home per §4.1: `Tile` / `TileGrid` primitives (§5.5), Hero + highlights strip, Experiences, Skills grid, two-up tile grid (project · story · writing · certifications) with empty states and odd-count rule, Contact with spoken languages, new type sizes (§5.3) and i18n strings in EN + VI. **Remove** `ProfileRail`, `SectionIndex`, `SkillsColumns`, `SkillCard`, `WorkWriting`, `CertificationRow`, `FeaturedStories`, `ContactBand`, `home.css` rail rules, `rail-fit.ts`, `section-index.ts`, `lib/balance.ts` (and its tests) and the nav/footer `wide` prop. Replace `home-rail.spec.ts` and the v1.1 parts of `home.spec.ts` with §12 Home checks; all gates stay green |
| M10 | Experiences v2.0 (Apple-style chapters) | Rebuild `/experiences/` per §4.2: hero with stat strip (reuse the Home `Highlights`/`Tile` primitives), sticky local nav, one chapter tile per role with highlight cards parsed from the bullets (helper in `lib/cv.ts` + unit tests), tech line, STAR pill, closing tile, flush footer, i18n strings in EN + VI. **Remove** the summary section and the `cv.summary`, `cv.projectsLink`, `cv.skillsLink` keys if unused, plus `CvHeader`, `Timeline`, `TimelineItem` if nothing else uses them. The print layout and PDFs are unchanged. Update e2e/axe/Lighthouse per §12; all gates stay green |
| M11 | v4.0 site frame | Implement the shared design system (§5.1–§5.10, §5.12–§5.14): Apple breakpoints and content widths, colour tokens with the Light-default toggle, SF stack and Newsreader removal, the type scale, buttons/chevron links/chips, the global nav with the search panel and the full-screen mobile menu (replaces `MobileSheet` and `SearchModal`), the shared `LocalNav` (bar + `<details>` dropdown) wired to every inner page, the Apple footer (breadcrumbs, directory, legal row), and the section / hero / unit / tile-grid / card / stat-strip building blocks. Add the `iPhone 13` / `Pixel 7` / 320px Playwright projects and the §5.15 frame checks; all gates stay green |
| M12 | v4.0 pages and motion | Move every page onto the M11 blocks per §4: Home units with 12px gaps and square tiles, Experiences chapters (sticky storytelling at L), Projects tile grid with the local-nav filter, STAR chapters and stepper without pastels, Blog index/tag/series grids, the Newsroom-style post, 404; then the four scroll effects (§5.11). Remove unused tokens (`--sky-*`, `--butter-*`, `--mint-ink`) and components. Print/PDF unchanged. Update unit/e2e/axe/Lighthouse for §4 and §5.15; all gates stay green |

---

## 14. Defaults to confirm

These smaller choices have a default in this spec. Change any you disagree with:

1. **Untranslated Vietnamese pages:** show the English content with a banner (alternative: hide untranslated items from `/vi/` lists). This includes `/vi/experiences/` and `/vi/cv.pdf` until the CV content is translated.
2. **Stories with no role:** labelled "Other / Personal"; they take their place by date on the desk (§4.4).
3. **Competency list:** the 12 values in §6.6.
4. **Social links:** Email, phone, LinkedIn and GitHub required; X and Bluesky optional.
5. **Blog drafts:** a `draft: true` flag hides posts in production.
6. **Package manager:** pnpm.
7. **Datum roles:** stored as `company: "Datum"` + `client: "Security Bank"` / `"TymeX"`, displayed as "Datum / Security Bank", the same as in `cv.tex`.
8. **Years of experience:** shown as "5+" as written in `cv.tex`. The roles start in 2019, which would support a higher number. Confirm which to show.
9. **PDF length:** at most 2 Letter pages. The current `cv.tex` is tuned for 1 page; the web layout with Inter will likely run longer.
10. **PDF download filename:** `Ryan-Parker-CV.pdf`.
11. **E2E browsers:** Chromium + WebKit (Firefox left out to keep PR runs under 10 min).
12. **Merge style:** squash only, linear history, conversation resolution required.
13. **Dependabot PRs:** merged by hand, no auto-merge.
14. **Dependabot schedule:** Monday 06:00 Ho Chi Minh time. CodeQL weekly scan: Monday 05:00 UTC.
15. **Cloudflare beacon token:** stored as a repository *variable*, not a secret, because it is public in the HTML.
16. **Artifact retention:** 7 days for PR runs, 30 days for `main` runs (sets the rollback window).
17. **Home unit order:** Hero (+ pipeline) → Experiences (black, + stat strip) → feature grid (project · In practice · writing · certifications). (Superseded: Home is the Wall, §4.1, v6.11.)
18. **Skill descriptions:** first drafts written from `cv.tex` (Appendix A.4). Review and rewrite them in your own voice.
19. **Skill icons:** Lucide (open-source, outline style, close to SF Symbols). SF Symbols can't be used on the web under Apple's licence; brand logos only for tools, sub-items and certifications on /skills/ (§4.8, one mark box per context), no glyphs there.
20. **Certification badges:** not shown as badge images on the web; certification cards are type-only except an optional issuer logo (Iconify svg).
21. **Experiences page:** a Layout B hero; role and certification cards and a contact box (see §4.2).
22. **Projects in the PDF:** only projects marked `featured` (override per project with `inPdf`), so the PDF stays within 2 pages.
23. **Chip colours:** kind, competency, tag and series chips are neutral grey (`--fill`); only tech chips and the "Current" chip are mint.
24. **Neovim series plan:** 5 parts. 1 Zero to a working editor · 2 Languages (LSP, completion, format, lint) · 3 Data engineering (DBT, SQL, DB UI, CloudFormation) · 4 Java with nvim-jdtls · 5 Debugging, testing and daily workflow.
25. **First post slug and tags:** `neovim-setup-1-zero-to-editor`; tags `neovim`, `dotfiles`, `macos`, `developer-tools`.
26. **"Tested with" note:** although snippets aren't linked, the post states once, at the top, the Neovim version and macOS the steps were tested against.
27. **First post date:** publish when M4 ships; `pubDate` is set on merge.
28. **Home layout:** Apple homepage units: square corners, 12px gaps, min-heights 580 / 570 / 500px; the tile grid runs edge to edge with 12px gutters (no side padding at S). (Superseded: Home is the Wall, §4.1, v6.11.)
29. **Spoken languages:** the Languages row on `/skills/`, and the PDF.
30. **Skill display:** brand marks on `/skills/` only (the Home `tools` tile was removed in v6.9); Tech Specs rows on `/skills/` (v5.0).
31. **Certifications on Home:** a grid tile with up to 3 text cards and "+N more"; all of them on `/skills/`. (Superseded: no certifications on Home, §4.1, v6.9.)
32. **Copy (EN; rewrite in your own voice, VI in `vi.json`):** Skills *"The tools I build with."* / *"From ingestion to data quality, on AWS and Azure."*; Certifications *"Certified on the platforms I use."*; Contact *"Let's talk."* / *"Happy to talk data platforms, migrations and AI in data."*; Experiences closing *"Want the full picture?"* / *"Projects, skills and certifications are all in the PDF."*; Projects *"Things I've built."* / *"Personal, work and open-source projects."*; In practice *"Real work. Real results."* / *"<n> stories across <m> roles."* (v6.8); Blog *"Notes on data and tools."*; 404 *"Page not found."*
33. **Featured story on Home:** one story (the newest `featured` by `date`, else the newest). (Superseded: Home names no story, §4.1, v6.9.)
34. **Primary action label:** Home's project cell uses Apple's **Learn more** with context in the accessible name, instead of "View experiences" / "All projects" as the primary label. (Superseded: Home has no project cell; its row link is **See the project**, §4.1.1, v6.11.)
35. **Experiences highlight cards:** text left-aligned inside cards (the chapter header stays centred), because the bullets are multi-line paragraphs.
36. **Breakpoints:** Apple's S ≤ 734 / M 735–1068 / L ≥ 1069, with nav, local nav and footer switching at 833px; 320px is the smallest supported width.
37. **Motion:** Apple's staggered fade (900ms / 30px / 150ms) everywhere, a CSS hero intro, and the hero exit fade (CSS `animation-timeline`, M and L, static elsewhere). No scroll-linked card scaling and no count-up numbers (Apple uses neither). No animation library.
38. **Sticky storytelling** on every Experiences chapter with ≥ 1 card, at L, so all chapters share one layout.
39. **Theme toggle order:** Light (default) → Dark → System.
40. **Local nav position:** directly under the global nav, above the hero, as on Apple product pages.
41. **Theme and language on phones:** inside the full-screen menu, not in the bar (the bar keeps brand, Search, Menu).
42. **Local-nav dropdown closes on scroll** after 40px, like apple.com. Its rows are 44px (Apple uses 34px) to keep the tap-target rule.
43. **Tech chips on phones:** at most 2 rows, then "+N".
44. **Competency filter:** dropped from `/star/` (v6.8); competencies show as a meta line on each story page. (Was: chips as one horizontally scrolling row on phones.)
45. **Code blocks on phones:** full screen width (edge to edge), scrolling inside.
46. **Search:** Apple's nav search flyout with Quick links, instead of a centred Spotlight-style modal.
47. **Footer:** Apple's global footer (breadcrumbs, four-column directory, legal row) with text links only; no social icons anywhere.
48. **Eyebrows:** `--text-2`, 600 weight (Apple), not mint.
49. **Gradient text:** one phrase per page, only the Home name H1 for now (blue → deep mint, contrast-safe). (Superseded: no page uses it since v6.11; the Home name is ink, §5.10.8.)
50. **Experiences opening:** a "Get the highlights." gallery of tall stat cards (years, team, the featured story, the featured project).
51. **Home stats:** numbers only (years, engineers led, the featured story metric); "current company" is dropped. (Superseded: Home shows no stats, §4.1, v6.9.)
52. **Dark tiles:** Home's Experiences tile is black (Apple's light / dark rhythm), using the dark tokens, so contrast is unchanged. (superseded: no black in the light theme, Appendix C v6.0)
53. **Newsroom weights:** the blog post H1/H2 and Newsroom tiles use 700, as Apple Newsroom does; everything else stays 600.
54. **Global nav on inner pages:** scrolls away and the local nav sticks at the top, as on Apple product pages (only one 48–52px bar stays on screen). Say if you'd rather keep both bars stuck.
55. **Footer density:** Apple's compact desktop footer (25.6px link pitch, WCAG 2.5.8) with 44px rows only at phone/tablet widths.
56. **Local-nav labels:** short company names (`shortName`), so the links always fit at desktop widths.
57. **Tech highlights:** kept as they are (every tech term marked, as you asked). The round-3 research suggested quieter highlights (only the first occurrence per card); not applied.
58. **Gradient colours:** kept (`#0066CC → #0F7B6C`). The research suggested ending the sweep on a non-link colour; not applied. Round 2: darkened to `#00509F → #0B5D52` for 7:1.

## 15. Placeholders to fill

- Optional X / Bluesky profile URLs.
- Vietnamese translations of the CV content, skill descriptions and certification names.
- Certification badge images and credential (Verify) URLs.
- More real In practice stories (one exists: `emr-cost-optimization`; the §6.6 example is illustrative) and blog content after the first post.
- Final titles for Parts 2–5 of the Neovim series (§6.8 lists working titles).

---

## Appendix A. CV migration from `cv.tex`

Source: `/Users/ryanparker/Documents/personal/experiences/cv.tex`. Each bullet moves over **word for word** as `- **<label>:** <detail>`, keeping the `\textbf{}` terms as `**bold**`. Tick each row in M2.

### A.1 Profile → `profile/en/index.md`

| Field | Value |
|---|---|
| name | Ryan Parker (replaces "Hai Tran" from `cv.tex`) |
| headline / tagline | Senior Data Engineer / DBT, Airflow, PySpark, AWS & GitLab CI/CD |
| location | Ho Chi Minh City, Vietnam |
| email | ryanparker.p.97@gmail.com |
| phone | (+84) 963 378 831 → `+84963378831` |
| LinkedIn | https://www.linkedin.com/in/jomatran |
| GitHub | https://github.com/ryanparker97 (new, not in `cv.tex`) |
| spoken languages | English — Professional working proficiency |
| body | The Summary paragraph |

### A.2 Experience → `experience/en/*.md`

| File slug | Company / client | Role | Start → End | Bullets | Tech chips |
|---|---|---|---|---|---|
| `fpt-software-senior-data-engineer` | FPT Software | Senior Data Engineer (Team Lead) | `2026-08` → Present | 5: Team Leadership & Code Review · ETL/ELT Migration Strategy · Cross-Cloud Data Delivery · Solution Design & Documentation · Delivery Automation | Python, PySpark, Databricks, Azure, Talend, Salesforce, AWS, AI agents |
| `datum-security-bank-data-engineer` | Datum / Security Bank | Data Engineer (Data & Platform) | `2024` → `2026-03` | 5: Data Pipeline Delivery · Data Quality & Reliability · Ingestion, Processing & Production Support · CI/CD & Infrastructure as Code · Data Governance | DBT, Airflow, Athena, Redshift, S3, Python, AWS EMR, PySpark, GitLab CI/CD, IaC, Lake Formation |
| `datum-tymex-platform-engineer` | Datum / TymeX | Platform Engineer (Datadog Observability Platform) | `2021` → `2024` | 4: Datadog Platform Ownership · CI/CD for Serverless Deployment · Platform Automation · Infrastructure as Code | Datadog, SLO/SLI, AWS CodePipeline, Serverless, CloudFormation, Python |
| `fpt-software-software-engineer` | FPT Software | Software Engineer (Data & Backend Focused) | `2020` → `2021` | 1: Data Validation | SQL, KNIME |
| `hitachi-vantara-backend-engineer` | Hitachi Vantara Vietnam | Backend Software Engineer | `2019` → `2020` | 2: Backend Engineering · Containerization | Java, Spring Boot, REST APIs, Microservices, Docker |

All roles: location "Ho Chi Minh City, Vietnam".

### A.3 Projects → `projects/en/*.md`

Shown on `/projects/` and in the PDF, not on `/experiences/`.

| File slug | Title | Subtitle | Kind | Start → End | Bullets |
|---|---|---|---|---|---|
| `agentic-coding-workflow` | Multi-Agent Coding System | AI agents that plan, build and review code, with a human in charge | personal | `2025` → Present | 4: Orchestrated Specialist Flows · Autonomous Delivery Controls · Routing, Memory & Recovery · Safety & Verification |

### A.4 Skills → `skills/en/*.md`

| Order | File slug | Group | Items |
|---|---|---|---|
| 1 | `data-engineering` | Data Engineering | Python, SQL, PySpark, Apache Spark, Apache Airflow, DBT, Databricks, Talend, ETL/ELT, Data Lake & Warehouse, Data Migration, Data Quality, Data Modeling, Data Governance |
| 2 | `cloud-platform` | Cloud Platform | AWS (EMR, S3, Athena, Redshift, Lake Formation), Azure (Databricks) |
| 3 | `devops-iac` | DevOps & IaC | Git, GitLab CI/CD, Infrastructure as Code (CloudFormation, CDK, Terraform), Docker, Kubernetes, Datadog, Monitoring, Incident Response, SLO/SLI |
| 4 | `backend-engineering` | Backend Engineering | Java (Spring Boot), REST APIs, Microservices, PostgreSQL, API Integration |
| 5 | `ai-engineering` | AI Engineering | AI-DLC (AI-Driven Development Life Cycle), Prompt Engineering, Agentic Coding, Multi-Agent Orchestration, AI Code Review, Documentation Automation |
| 6 | `methodologies` | Methodologies | Agile/Scrum, SDLC, Cross-Functional Collaboration |

Items written with parentheses become `name` + `children`. The `Languages` row moves to `profile.spokenLanguages`, which feeds the Languages line and the PDF's last skills row.

**Draft descriptions** (new, not in `cv.tex`; written from your experience bullets for you to review):

| Group | Icon | Size / tint | Draft description |
|---|---|---|---|
| Data Engineering | `database` | 2x2 / mint | Design, build and operate ETL/ELT pipelines and data models for banking markets in the Philippines and South Africa, from ingestion to data quality. |
| Cloud Platform | `cloud` | 1x1 / sky | Build AWS data lakes and warehouses on S3, Athena, Redshift and EMR, and deliver data from Databricks on Azure. |
| DevOps & IaC | `git-branch` | 2x1 / butter | Automate testing, deployment and environments with GitLab CI/CD and IaC, and keep services observable with Datadog SLOs and alerts. |
| Backend Engineering | `server` | 1x1 / sky | Build RESTful APIs and Spring Boot microservices, with database design and Docker containers. |
| AI Engineering | `sparkles` | 2x1 / mint | Bring AI agents and reusable skills into delivery for code conversion, testing and documentation, and orchestrate multi-agent coding workflows. |
| Methodologies | `users` | 1x1 / butter | Lead and work in Agile teams with engineers, analysts and business stakeholders across the full SDLC. |

### A.5 Certifications → `certifications/en/*.md`

| File slug | Name | Issuer | Year | Monogram |
|---|---|---|---|---|
| `aws-solutions-architect-associate` | AWS Certified Solutions Architect – Associate | Amazon Web Services | 2022 | AWS |
| `datadog-fundamentals` | Datadog Certified: Datadog Fundamentals | Datadog | 2023 | DD |

Shown as cards on `/experiences/` (§4.2) and in the PDF; Home has no certifications tile.

### A.6 Not migrated

- **Education** (commented out in `cv.tex`): only the school name is migrated (English name *Nong Lam University*, Vietnamese name in `vi/`); the `cv.tex` degree and dates are not carried over. The school logo was added on the web.

---

## Appendix B. First blog post: Neovim setup guide, Part 1

### B.1 Summary

| Field | Value |
|---|---|
| Series | `neovim-setup-guide`, Part **1** of 5 (§6.8) |
| Title (EN) | Neovim setup guide, Part 1: from zero to a working editor |
| Title (VI) | Hướng dẫn thiết lập Neovim, Phần 1: từ con số 0 đến trình soạn thảo chạy được |
| Description (EN) | Install the tools, write a small Neovim 0.12 config file by file on macOS, and check that it starts and works. |
| Files | `src/content/blog/en/neovim-setup-1-zero-to-editor.mdx` and `src/content/blog/vi/neovim-setup-1-zero-to-editor.mdx` (same slug) |
| Tags | `neovim`, `dotfiles`, `macos`, `developer-tools` |
| Type | Step-by-step **setup guide**. The reader creates each file and ends with a working editor |
| Audience | Developers on macOS who are new to Neovim or coming from a big distro (LazyVim, NvChad) and want a small config they understand |
| Target | **Neovim 0.12+ only**. Stated in the first paragraph and checked in step 1 |
| Length | ~5,000 words including the full files, 26 min read (the reading time counts code) |
| Source | None linked. Every file the reader needs is shown in full in the posts |
| Media | **Code snippets** (Shiki, with filename titles) + **one architecture diagram** (inline SVG, §4.5.1). No screenshots or recordings |
| Languages | **EN + VI at launch.** VI translates the prose, headings, captions, callouts and diagram captions. Code, commands, file names and keymaps stay the same. Code comments stay in English |

### B.2 Outline (13 H2 and 5 H3 = 18 TOC entries; no heading is longer than 38 characters)

1. **Intro** (no heading)
   - Why a small config: one Lua file per topic, lazy-loaded, built for a mix of web, data engineering and SRE work (Java, Python, DBT/SQL, Terraform, Bash, CloudFormation/YAML, JSON, Docker, frontend). The reader builds it one file at a time.
   - What this series builds, with a link to the series index.
   - `<Callout type="note">` **Tested with:** Neovim 0.12, macOS. No source link and no commit.
2. **What you'll have at the end**
   - A bullet list of what Part 1's files give: lazy.nvim with lazy-loading by default, oil, telescope, smart-splits and flash, autopairs and surround, gitsigns and diffview, Treesitter highlighting, lualine, which-key, catppuccin mocha, sessions.
   - States that language servers, completion, formatting and linting arrive in Part 2.
3. **Before you start**
   - macOS + Homebrew (link to brew.sh). One sentence for Linux readers: install Neovim 0.12+ with the package manager (link to the official install page).
   - **Neovim 0.12+**: `nvim --version`, with `brew install neovim` (or `brew upgrade neovim`) if needed. `<Callout type="warning">` explains that 0.11 and older fail on the 0.12-only `pumborder` option and the built-in undotree (`packadd nvim.undotree`).
   - A **Nerd Font** set in your terminal, Xcode Command Line Tools, and Python **3.10+** (Part 2 installs `sqlfluff` only on 3.10+).
4. **Step 1: install the host tools**: the `brew install …` and `pipx install dbt-core sqlfluff` commands with one line per tool (ripgrep/fd → telescope, `tree-sitter-cli` → parser builds, node → JS-based language servers and prettier, openjdk → Part 4, …). Optional `brew install lazygit`, mapped in Part 5.
5. **Step 2: create the config folder**
   - Option 1, a fresh setup in `~/.config/nvim` (back up the old folders, then `mkdir -p … lua/config/core … lua/config/plugins`).
   - Option 2, next to an existing config in `~/.config/nvim-guide`, started with `NVIM_APPNAME=nvim-guide nvim`; a tip callout suggests an alias.
   - Every path in the guide is relative to this folder; `:echo stdpath("config")` shows which folder Neovim reads.
6. **How the config fits together**
   - **The architecture diagram** (B.3), a short startup walkthrough, and a table `File | What it holds | Part` for every file the series creates.
7. **Step 3: init.lua and core settings**: create `init.lua`, `lua/config/core/init.lua` (leader key, netrw off, provider loop), `options.lua`, `keymaps.lua` and `autocmds.lua`, each in full, with an explanation after each block.
8. **Step 4: add lazy.nvim**: create `lua/config/lazy.lua` in full, fenced with the title `lua/config/lazy.lua` and highlights `{3-10,23,25}` (the clone call, the `import` line and `defaults = { lazy = true }`).
9. **Step 5: add the first plugins** with one H3 per file: `ui.lua`, `navigation.lua`, `editing.lua`, `git.lua`, `treesitter.lua`. Each is a full file with a note on the keys it adds.
10. **Step 6: first launch**: lazy.nvim installs plugins; Treesitter installs parsers (the `tree-sitter` CLI warning is quoted exactly from the file, naming `tree-sitter-cli`); quit and reopen; `--startuptime`.
11. **Step 7: check that everything works**: `:checkhealth lazy` and `:checkhealth nvim-treesitter`, then Treesitter colours on `init.lua`, which-key on <kbd>Space</kbd>, telescope on `<leader>ff`, oil on `-`, a git sign in the gutter, and the undo tree on `<leader>uu`.
12. **The first keymaps to learn**: a table of the keys that exist after Part 1 (`<leader>ff`, `<leader>fg`, `<leader>fb`, `<leader>e`, `-`, `<leader>w`, `<leader>j`, `]d`/`[d`, `]h`/`[h`, `<M-h/j/k/l>` between splits, `<leader>uu`).
13. **Troubleshooting**
    - Icons show as boxes → Nerd Font not set in the terminal.
    - The `tree-sitter` CLI warning → `brew install tree-sitter-cli`, then `:TSUpdate`.
    - telescope is slow or the fzf extension is missing → install Xcode CLT, then `:Lazy build telescope-fzf-native.nvim`.
    - Start over → remove `~/.local/share/nvim` (or `~/.local/share/nvim-guide`) and launch again.
14. **What's next**
    - A teaser for Part 2 (languages), followed by the series box and the prev/next part links.

### B.3 Architecture diagram: `NeovimStartupDiagram.astro`

```
init.lua ──▶ vim.loader.enable()
   │
   ├─▶ core/            options · keymaps · autocmds        (surface-2)
   │
   └─▶ lazy.lua ──▶ lazy.nvim (bootstrap, lazy = true)      (surface-2)
                      │  import "config.plugins"
                      ▼
        plugins/*.lua (12 topic files)                      (fill)
        ui · navigation · editing · git · lsp · completion
        formatting · linting · treesitter · data · dev · extras
                      │
        ┌─────────────┼──────────────┬──────────────┐
        ▼             ▼              ▼              ▼
   Mason → LSP    blink.cmp     conform (save)  nvim-lint      (bg + border)
   vim.lsp.enable  completion   formatting      linting
   (jdtls via ftplugin/java.lua → Part 4)
```

- Horizontal layout at M and L, vertical stack at S (§4.5.1). Boxes use the neutral tokens in brackets; arrows and labels use `--text` / `--text-2`.
- `<title>`: "How the Neovim config starts". `<desc>` and the hidden list repeat the flow above in words.
- Caption (EN): *"Startup flow: core settings load first, then lazy.nvim loads plugins only when they're needed."* VI caption to be translated.

### B.4 Accuracy rules (replay)

- Every file is shown in full, or as an exact addition that says where it goes (after which line, inside which table, or at the end of the file). A block may elide with `-- …` only when it reminds the reader of code they already typed, and it is introduced as such.
- Each part is replayed on a clean `NVIM_APPNAME=nvim-guide` setup, built from Parts 1..N only and from the posts' code blocks, before publishing: a Lua parse check of every file, `Lazy! sync`, and opening a sample file with no errors. Every command is run; any output quoted in the post is real.
- A reader finishing Part N needs only Parts 1..N. The posts never point to the author's own repository.
- When the config changes later, the post gets an `updatedDate` and a refreshed "Tested with" note. It doesn't change silently.

### B.5 Acceptance criteria

- The EN and VI posts build and share the slug. The language switch moves between them, and neither shows the "English only" banner.
- The series box reads "Part 1 of 5" with parts 2–5 marked "Coming soon". `/blog/series/neovim-setup-guide/` shows "5 of 5 published".
- The TOC lists the H2 sections from B.2 in both languages.
- Every code block has a language and a filename title (where it comes from a file). Copying a shell block leaves out the `$` prompt.
- The diagram passes axe, is readable in light and dark mode, and switches layout between S and M (734 / 735px).
- Reading time shows 26 min in both languages.

---

## Appendix C. Revision history

| Version | Milestone | Change |
|---|---|---|
| v1.0 | M1–M7 | First build: pastel mint/sky palette, bento grids, Newsreader blog body, timeline CV page, Spotlight search modal. |
| v1.1 | M8 | Home profile rail, section index and balanced skill columns (replaced by v2.0). |
| v2.0 | M9 | Home rebuilt as Apple-style tiles: hero + highlights, Experiences, Skills, two-up grid, Contact. |
| v2.0 | M10 | Experiences rebuilt as chapters with highlight cards and a sticky local nav; summary removed from the web page; `/cv/` renamed `/experiences/`. |
| v2.1 | — | Tech highlights in Experiences cards; Experiences hero removed. |
| v3.0 / v3.1 | (not built) | White site-wide Apple refresh and mobile rules, written as override sections (§5.0, §5.0.10). |
| v4.0 | M11–M12 | §4 and §5 consolidated into one design system aligned with apple.com's measured values (breakpoints, type scale, nav, local nav, footer, units, cards, motion, copy); the v3.0/v3.1 overrides and the old §5.1–§5.7 were folded in and removed. |
| v4.1 | M11–M12 | Round-1 research merged: Apple stat lockups, staggered-fade motion grammar (no card scale-in), one gradient-text phrase, the Experiences highlights gallery, lockup copy, plus discs, Newsroom tiles/quote/drop cap, graph bars, 404 site index, and 14 consistency fixes. |
| v4.2 | M11 fixes, M12 | Round-2 research merged: frame alignment to Apple's 980px content edge, transparent-at-rest bars, global nav scrolling away under a sticky local nav, Apple search panel / dropdown / menu / footer details, start-aligned inner section headers, split Home units with tall-viewport heights and the peek rule, super and compact stats, Newsroom article rhythm, footer reach line, local-nav current marker; Appendix D page composition guide.
| v4.3 | M12 fixes | Round-3 research merged: reveal shows in-view content on load with a failsafe, the visual mass rule (`.unit--stack` / `.unit--flow`), larger type visuals in Home tiles, the career rail, balanced centred copy and nowrap list items, a centred STAR story quote, one sticky chapter layout at L for every chapter, Newsroom post subhead and TOC values, singleton control alignment.
| v4.4 | Final polish | Reveal hides content only after its own script runs (`html.reveal`), career-rail tracks and minimum bar width, tile headline alignment, peek rule without exceptions, Apple tile type sizes, tech marks keep punctuation attached.
| v5.0 | apple-layout A | Apple type sizes restored site-wide (hero 96 at L); Home rebuilt as apple.com Layout A (gradient role eyebrow + pipeline hero, black Experiences tile with big stats, feature grid with code-built visuals); /skills/ Tech Specs page; Skills and Contact leave Home; tighter display tracking; radius tokens. |
| v5.0 | apple-layout B | Layout B product pages: Experiences (hero, stat-card highlights, career row, chapters, black featured-project band, Let's talk), project page (laptop frame, big stats, problem → approach → result, terminal loop with pause), Projects lineup; footnotes. |
| v6.0 | apple-display D | Role pages: `/experiences/<slug>/` (hero + Highlights. chapter, local nav of roles); role links from STAR and project pages go there. |
| v6.0 | apple-display D/E | Experiences becomes a Leadership-style index: role and certification cards (4 / 2 / 1 up) and a contact box; chapters move to role pages, the gallery and career row to Home. |
| v6.0 | apple-display A/D | Home becomes a product-launch page (local nav, gradient headline hero with stats, Let's talk.); later rows add its sections. |
| v6.0 | apple-display (STAR stage) | STAR story page: Situation + Task, a pinned "Step by step." stage for the Action's labelled bullets (≥ 2), then the Result panel; sticky storytelling (role chapters and the stage) only with motion allowed and JS on. |
| v6.0 | Page transitions | Cross-document view transitions switched on (root cross-fade, reduced-motion guarded, no `ClientRouter`); §5.11 and §5.15 updated. |
| v6.0 | — | Download label renamed to Download CV / Tải CV. |
| v6.0 | no black | Light theme has no black: Home closer-look band and stat cards go white; band tones derived by `bandTones`; project approach band; `section--dark` / `unit--dark` removed. |
| v6.0 | — | Highlight-card values take position colours (`--hl-1…4`); card 3 drops the `--link` value. |
| v6.0 | — | Neovim series rewritten as a self-contained step-by-step guide (files shown in full, `lua/config/` namespace, no link to a config repo). |
| v6.0 | — | Education card group (NLU, name only) on Experiences and in the PDF. |
| v6.0 | — | Education card carries the NLU seal (web only); English name "Nong Lam University". |
| v6.0 | star-display | STAR index becomes a Layout A lineup: one feature-tile row per role (company eyebrow, title, question, Read the story / At <company>, two-stat strip); the index disclosure, four-panel grid and Expand all are removed (story pages unchanged). |
| v6.1 | star-display-v2 | STAR index becomes one story gallery (§5.10.7): a stat card per story (company, title, question, headline result, Read the story); role rows removed; a role link lands on its first card; gallery.ts skips hidden cards. |
| v6.2 | star-images | STAR stories take an optional SVG diagram (image + imageAlt): on the story card and above the story panels; both stories get one. |
| v6.3 | highlights-images | Every Home highlight card shows a diagram: three new token SVGs (years, team, agents) and the featured story's own; alt from i18n / the story. |
| v6.4 | role-hero-compact | Role pages use a compact hero (64px H1 at L, `Hero compact`; §4.2.3, §5.4, §5.10.1) so the longest role title keeps the 64px peek rule. |
| v6.5 | bento-images | Home is the Bento board (§4.1); the `team`, `skills`, `career` and STAR tiles carry token SVG diagrams, the STAR tile is image only (no story or number), two number tiles and two footnotes. Supersedes v6.3's highlight-card diagrams on Home. |
| v6.6 | career-next | Experiences gains the "Next." card group (§4.2.0): two goal cards, each with one evidence link; web only. |
| v6.7 | home-alt-2 | Home becomes the buy-page split: an identity column (portrait, gradient headline, Download CV and Email me, location, languages) beside a two-column board, pinned at L only with JS on, no reduced motion and the measured gate height; ten tiles with new `tools` (brand marks, "My stack.") and `goals` ("Next.", links `/experiences/#next`) and `project` before `result`; "Learn more" removed. Supersedes the v6.5 board layout and the Next "not on Home" rule. |
| v6.8 | star-redesign | The STAR section becomes **In practice** (VI *Thực chiến*) under the headline "Real work. Real results." (§4.4): `/star/` is a Newsroom desk (lead card = the newest story, two tiles, a "More from" list from the fourth story), the competency filter and its script are dropped, story pages are articles (header, diagram, Situation · Task · Action · Result as prose, metrics, numbered footnotes for metrics that carry a note), and the Home `result` tile shows the name and headline over desk art. The old story card, panel grid, step stage, filter component and its script are removed; `StoryTeaser` replaces them. URLs unchanged. |
| v6.9 | home-alt-3 | Home becomes the Hero stack (§4.1): seven full-width bands, a white `#top` Hero (the role as the H1, Download CV, Email me) then `#practice`, `#project`, `#team`, `#also` (Writing and Skills tiles), `#next` and `#more`, alternating grey and white through `bandTones`, each with an eyebrow, a Unit headline, a tagline, one or two "›" links and its diagram or cover as the hero. The In practice band names no story. Removed from Home: the buy-page split, the identity column (portrait, location, languages) with its pin and 47em gate, the Bento board (years, team, project, result, skills, tools, career, goals, writing and more tiles), the number tiles with their footnotes, the tools logo wall and the role rows; the spoken languages stay on `/skills/` and the location on the role pages, and the "5+ years" figure is on no web page and remains only in the CV PDF summary (owner decision). The local nav is Overview · Experiences · Projects · In practice with the CV pill (Skills leaves it). New: `HomeBand`, `HomeAlso`, `HomeNext`, `homeBandIds`; `LetsTalk` is text only at the Unit size; nine i18n keys are removed; no client script is added. Appendix D.1 is redrawn at 1440 and 390, and the §2, §4, §5, §6, §12 and §14 references are updated. |
| v6.10 | home-alt-5 | Home becomes the **Front page** (§4.1), replacing the v6.9 Hero stack: one nav row (Home drops its local nav, reversing §4.0 and §5.8), `main` = `section#top` (the name as the gradient H1 in the system face at `max(2.25rem, 17.2cqi)`, sized for the widest face so it never overflows: about 82% of the column on a Mac, 99% for WebKit's Inter Fallback, wrapping between the words in a wider face; then one line with the role and `exp.hero.copy`, Download CV and Email me), `div.fp-cols` (three columns 6fr / 3fr / 3fr: `#project` with its cover; `.briefs` with `#team` and `#practice`; `#writing` with the six newest posts, a 44px cover each and the cover-credit line; and `#skills` under the left two) and `div.fp-tail` (`#next` with both goals and their "So far" links beside `#more`). **Owner exception to §5.3:** 1px `--border` hairlines between the columns, cells, post rows and last-row cells; nothing else has a border (D.0 rules 1, 3 and 5 get a Home exception). New: `HomePlate`, `HomeColumns`, `stripBold`; `HomeNext` and `LetsTalk` become cells; the practice art is the decorative `star-steps.svg` (no label). Removed: `HomeBand`, `HomeAlso`, `BentoTile`, `homeBandIds`/`HomeBandId`, `homeNav` and the Home local nav, the band tones and the 640 / 840px band art on Home (`bandTones` stays for Projects), and the i18n keys `home.hero.subline`, `home.nav.overview`, `home.next.link` and `exp.hl.agentsCap`; no key is added and no client script. Home still names no story and shows no portrait, location, languages or years. Appendix D.1 is redrawn at 1440 and 390, and the §2, §4.0, §4.1, §5.1, §5.4 (Unit headline no longer a Home role), §5.10.4 (no Home lockups), D.0 rule 2 (Home exception), §5.3, §5.7, §5.8, §5.10, §6, §12 and §14 references are updated. |
| v6.11 | home-alt-6 | Home becomes **the Wall** (§4.1), replacing the v6.10 Front page: one nav row (unchanged), `main` = `section#top.wall` (`HomeWall`: a full-width `aria-hidden` wall of twelve real screenshots of the site's own pages, tilted with one static `perspective(2400px) rotateX(28deg) rotateZ(-8deg)` transform and faded with a mask, over an identity row with the cut-out photo in a `--warm` circle, the role line, the name as the ink H1 at `min(2.75rem, 19vw)` / `min(3.5rem, 19vw)` / `min(5rem, 19vw)`, the sentence, four "›" links and Download CV / Email me), `section#next` (full width, H2 left and goals right from 1069px) and `section#more` (the one grey closing band). The 48 captures (12 pages × EN/VI × light/dark, 1280 × 800 PNG, at most 250 KB each) are committed in `src/assets/wall/` and made by hand by `scripts/capture-wall.ts` from a built `dist/` (`pnpm build && pnpm exec tsx scripts/capture-wall.ts [id …] && pnpm build`); the cut-out is made by `scripts/portrait-cutout.ts` from `avatar.jpg`. They are served as WebP through `astro:assets` (widths 320 / 480 / 512 / 640 / 960; 288 files), one language and theme shown, light tiles 1–6 eager with `fetchpriority="high"` on 2 and 5, every dark variant lazy; e2e byte caps 150 / 170 / 220 KB. **Owner rules:** the wall is decorative for screen readers (`aria-hidden`, empty alts, `tabindex="-1"` tiles that a mouse can click); links as mocked (no Skills link in Home's `main`; Skills is in the footer and on one tile); story titles may appear inside captures (reverses "no story named" for the pictures only); the photo is in the page (reverses "photo in the nav only"); the name is the H1, no greeting. **Lead rulings:** a location visible inside a capture is covered by the owner's approval of the mock; the static tilt stays under reduced motion (one pinned `m12.spec.ts` exemption); the peek rule gets a Home exception (§5.10.2). **Exceptions to §5.3:** the wall tiles' 1px `--keyline` outline and the new token `--warm` (`light-dark(#f1e7e0, #413226)`, behind the photo only); the v6.10 hairline exception is dropped. New: `HomeWall`, `src/lib/wall.ts`, `scripts/capture-wall.ts`, `scripts/portrait-cutout.ts`, `scripts/lib/png.ts`, `src/assets/wall/`, `avatar-cutout.png`. Removed: `HomePlate`, `HomeColumns` and their tests, `stripBold`, the nine i18n keys `home.experience.eyebrow`, `home.certs.cta`, `common.learnAbout`, `common.learnMore`, `exp.hl.team`, `exp.hl.teamCap`, `exp.hl.agents`, `exp.hl.teamAlt`, `exp.hl.skillsAlt`; no key is added and no client script. `.text-gradient` is used by no page. §2, §3.1, §4.0, §4.1, §5.1, §5.3, §5.5, §5.10, §5.11, §5.13, §5.15, §6, §10, §12, §14 and Appendix D (D.0 rules 1, 2, 3 and 5, D.1) are updated. |
| v6.12 | claude-cert | A planned certification, *Claude Certified Architect* (Anthropic), is shown as planned and never as earned. `certifications` gains `planned: YYYY-MM`, exactly one of `year` and `planned`, enforced at build by `certProblems` (`src/lib/certs.ts:21-30`); one helper, `certWhen`, writes *Planned · Apr 2027* / *Dự kiến · 04/2027* in every renderer. `/skills/`: a row with no logo, link or credential ID (`data-planned`). CV PDF: *Name (Planned · Apr 2027)*. `/experiences/` and Home `#next`: one dated step (`NextStep.astro`, `data-next-step`, `NEXT_MILESTONE`) above the two "Next." goal cards, not a card, `li`, heading or link. No Anthropic logo. The Certifications cards on `/experiences/` stay earned-only; the goal copy and links are unchanged. §4.1.4, §4.1.6, §4.2, §4.3, §4.8, §6.5, §12 and this row are updated. |
| v6.13 | photo-logos | Home's photo becomes a **landscape frame**: the cut-out headshot in a 4:3 warm frame (`--pop` 192 / 216 / 288px, radius 12 / 18) beside a **72px name at L** (was 80), the four links a 2 × 2 grid at every width (lead, photo-logos), and the L row a wrapping flex row whose pills drop under the name only at 200% text in a wide face (§4.1.3, §4.1.5). The planned *Claude Certified Architect* now shows the **Claude mark** (`logos:claude-icon`, the product mark, not Anthropic's logo) on `/skills/` and on the *Next.* step on `/experiences/` and Home `#next` (`NEXT_MILESTONE.logo`), with the "Names and logos belong to their owners; no endorsement implied." note on `/experiences/` and Home (§4.1.4, §4.2.0, §4.8, §6.5). **Reversals:** (1) v6.12's "no logo on the planned certification" becomes the Claude mark; (2) v6.11's round pop-out photo in a warm circle becomes the landscape frame, and the L name goes from 80 to 72px; (3) the nav, local nav, footer and search rows no longer sit on `--chrome` (the 980px column plus 22px gutters, 1024px outer) but on the `--content` column, and wide boxes keep their `--content-wide` box with their content on the column (`--wide-inset`), so `--chrome` and `--chrome-nav` are removed and the old 1260 content edges are gone (§5.2, §5.7, §5.8, §5.9); (4) the compact menu's lines end on the column (the box overhangs it by 17px). **Mark box** (§4.8): one square box per context, centred and aligned with its label (tool and certification 24 = 20 + 2 × 2, sub-item 20 = 16 + 2 × 2, the shared `--mark-plate`, `.cert-slot` removed; Java and Terraform shifted for optical centring, a lead decision instead of a per-mark tolerance); the card marks on `/experiences/` are 32px, with the plated marks (AWS, Datadog) on a 4px ring, the `CompanyLogo` `box-shadow` that is a named exception to "no shadows", set by the plan (§4.2.0, §5.5); the "Names and logos belong to their owners" note on `/experiences/` and Home is an owner decision. **Kept by owner decision:** cards in a row keep **equal heights** and the 180px group-card minimum, and "equal padding" means equal top, left and right with the content top-aligned and the extra height at the bottom; card borders sit on the column with the text 28px inside (§4.2.1, §5.10.4); the Experiences local nav may scroll behind its fade at 834–1068px (§4.2.0, §5.8); the blog post's TOC sits on the column at 1280px and up, owner decision (§4.5). The local nav also scrolls its current link into view on load, clear of the 32px fade (accessibility review, §5.8). A leading fade shows only while the strip is scrolled, and the fonts-ready reveal is skipped while focus is in the strip (§5.8: `LocalNav.astro:234`, `local-nav.ts:10-14,38-41`). Also: the contact box and the device frame take the column (the 880px cap is gone), the big stat strip's 860px cap is gone, the lone In practice tile splits 1.1fr / 1fr like the lead (§4.4), callouts sit 20px from the border edge with the icon on the label's first line (§4.5), the Home wall is recaptured, and §12 gains `geometry.ts`, `alignment.spec.ts` and `logo-box.spec.ts`. **Audit causes left, with reasons:** the `.term` 640px measure (a fixed monospace measure, centred on the column); the Projects tile band (full-bleed Apple tile band, its content capped to the column); dark footprints on `/skills/` (the boxes are identical; a plate appears only under the 3:1 rule); cards stretching (RC6, the owner's equal-height decision); wordmark widths on cards (each image keeps its aspect at the shared 32px height, left edges and eyebrow gap equal); the local-nav last link's fade room and the nav tools' ink inside 44px targets (their boxes end on the column); the 404 groups' 50 / 25 / 25 split (§5.10.10, on the footer's columns); the post row 1.5px, series box and TOC rows, code blocks in lists, `.btn-sm` padding and story stat widths; and the mobile menu panel's 48px side padding (an Apple menu inset, not a content column). |
| v6.14 | claude-card | /experiences/ Certifications shows a third card for the planned *Claude Certified Architect*, last after Datadog and AWS, labelled *Planned · Apr 2027* (VI *Dự kiến · 04/2027*), with the unplated Claude mark and no year, link or ID (owner). The *Next.* step line stays. `experiences/index.astro` stops filtering planned entries (`sortCerts` already puts it last); the card count is 3 in `certs`, `experiences` and `logo-box` specs, each old -> new marked "owner, claude-card". Print, PDF, /skills/ and Home unchanged. |
| v6.15 | photo-tall | Home's photo is **taller at the same width** (owner: "make the photo longer"). From M the frame is **square** (`--pop-h: var(--pop)`, the image as tall as the frame, so the head starts 13.3% down with no band): **288 × 288 at L** and **216 × 216 at M** (lead's plan sizes, which the owner saw). **S is 192 × 160**, not 192 × 144 (owner, Q1 option a): the identity row sits 16px higher (`.w-id` margin-top −56px, was −40px), so the photo grows upward into the faded wall and the text and pills do not move. **At L the pills move** out of the right column into **a row under the text**, on its left edge (owner, Q2), so `.w-text` ends on the column's right edge where `.next-path` ends (owner, request 2; the A6 edge rule, pinned in `alignment.spec.ts:515-569`). The name stays 72px and the links stay 2 × 2. Measured then: at 1440 × 900 the pills end at 890.5px (9.5px to spare, both engines, EN and VI); at 375 × 812 at 779.6px (805.6px with Inter blocked); superseded at 375 by v6.21 (pills at 909.3px, below the fold). Tests: `home.spec.ts` (FRAMES with 1024 added and VI at every width, sharpness, wall geometry, 200%), `home-wall.test.ts` (sizes, the L rule, the S `margin-top`), `alignment.spec.ts` (the Home case, the A6 describe); each changed assertion is old → new with an "owner, photo-tall" comment. §2, §4.1, §4.1.3, §4.1.5, §5.3, §5.10.2 and Appendix D.1 are updated. |
| v6.16 | next-left | Home's Next. path starts on the identity text's **left edge** (owner: "align right ... update it to straight left"). `#next .next-in` from 735px is `calc(var(--home-photo) + var(--home-photo-gap)) minmax(0, 1fr)` (was one column below 1069px, then `1fr 1.4fr`, gap 64px); the goals are one column until 1069px (round 2: two at M broke title words at 200% text); S is unchanged. `--home-photo` / `--home-photo-gap` are new tokens in `tokens.css` that also size `.pop` and the `.w-id` gap, so a photo size change moves both. The right edges still agree. §4.1.4, §4.1 edge rule (`alignment.spec.ts` Home A6 case, `home-wall.test.ts`, `home-sections.test.ts`). |
| v6.17 | next-card | On `/experiences/` the planned *Claude Certified Architect* is a **card** in the *Next.* group (first, `li#next-cert`, the Certifications card's markup and wording: Claude mark, *Anthropic · Planned · Apr 2027* / *Dự kiến · 04/2027*, name; no link, no year as earned), replacing the one-line dated step there (owner, next-card). The Certifications group goes back to the two earned cards (owner, next-card: Request 2; this supersedes v6.14's claim that the planned card is Certifications' third card), so the cert shows once on `/experiences/`, in *Next.*; `/skills/`, the PDF and the print page are unchanged. Home `#next` keeps the step line unchanged. *Next.* is now one Claude card plus the two goal cards; the card marks are three, two in Certifications and the Claude card (`logo-box.spec.ts`). §4.1.4 corrected: Home `ul.goals` is one column below 1069px and two from there (it said two from 735px), with the `HomeNext.astro` cites updated. §4.2.0, §4.8, §6.5 updated. |
| v6.18 | techstack | `/experiences/` gains a **Tech stack** group (owner, techstack), second after *Experience.*: the tools with a brand mark on `/skills/`, as the §4.8 mark box plus the name, in four cards (Data Engineering, Cloud Platform, DevOps & IaC, Backend Engineering; 6 / 6 / 7 / 3) in `CardGroup` `variant="tools"`, two up at L and M (§4.2.0). The list is derived by `techStack()` from the `skills` content and `tool-icons.ts`, never typed; **PySpark and Apache Spark are one entry** (owner; 22 tools, not 23); SQL, Amazon EMR and the AWS CDK, with no installed mark, are left out (owner). The tools fill **down CSS columns** (7 is 4 + 3, never a lone tile; ui review). The group is `data-pagefind-ignore`, web only, no new script; `m12.spec.ts` exempts the static Java and Terraform shifts on the marks' `<use>` (lead). **Local nav (owner):** a **Tech stack** link (`/experiences/#stack`, also on the role pages) is added last; the 834–1068px strip now overflows **127px EN / 138px VI** (was 485 in 427px), so lead raised `frame.spec`'s cap from 64 to **128px** (EN; **140px** in a new VI case), and the links still fit at 1069px and up. **Reversal:** §4.2's "skills are not on this page" becomes "skill rows are not; the marked tools are", and the group count goes from four to five. §4.2.0, §4.8 (mark-box row), §12 updated; tests: `tech-stack.test.ts`, `experiences.spec.ts`, `logo-box.spec.ts`, `alignment.spec.ts`, `frame.spec.ts`, `role-page.spec.ts`, `localnav.test.ts`. |
| v6.19 | techstack-trim | Owner requests: remove **Talend, S3, Athena, Redshift, Lake Formation and CloudFormation** from the `/experiences/` Tech stack, and group the rest by **skill role** instead of the `/skills/` area. The group is now **six role cards** (*Languages & libs*, *Data processing*, *Orchestration*, *Cloud & storage*, *Code & CI/CD*, *Infra & monitoring*; `/vi/` labels in `exp.stack.role.*`), **16 tools** (was four area cards and 22), **7 plated** in dark (was 12). The tool list is still `stackTools()` from the `/skills/` content, less `STACK_EXCLUDE` (`src/lib/tech-stack.ts:30-37`, the six names), grouped by `STACK_ROLES` (`:40-59`); `techStack()` throws on a tool with no role, in two roles, or a role naming a tool not shown (`:83-106`). The drift rule allows exactly the no-logo rule, the PySpark merge and the six exclusions, each still on `/skills/` (`tests/unit/tech-stack.test.ts:62,85-95`; `tests/e2e/experiences.spec.ts:566-628`). Tests changed, each edit commented "owner, techstack-trim": `tests/unit/tech-stack.test.ts`, `tests/e2e/experiences.spec.ts`, `tests/e2e/logo-box.spec.ts`, `tests/e2e/alignment.spec.ts`. Unchanged: the Tech stack nav link and placement, the card shell and mark boxes, `/skills/`, the experience text, Home, and the print route and PDF. The v6.18 row is not edited. |
| v6.20 | profile-image-full | Owner request, "show complete my profile image": the Home portrait shows the **whole photo** on its grey studio backdrop, uncropped, instead of the 600 × 600 head crop. Nothing is keyed out; the grey backdrop stays. The frame is the image box at the photo's own ratio, 600:894 = 848:1264: **288 × 429.1 at L, 216 × 321.8 at M, 160 × 238.4 at S** (were 288 × 288, 216 × 216 and 192 × 160). L and M keep their widths, so `sizes`, the Next. path and the 656px name track do not move; `--home-photo` at S is 160px (was 192). The row grows up into the wall's fade: `.w-id` `margin-top` −135px at S (was −56), −81px from M (was −44) and −143px at L (new); at L `grid-template-rows: 1fr auto` with the photo and the text `align-self: end`, so the photo's bottom is on the pills' bottom and the text stays 16px above them. At 1440 × 900 in Chromium the photo's top moves from 581 to 461px, while the H1 (662.4px), the links (830.3px) and the pills (890.3px) stay where they were. **Policy change (owner, profile-image-full):** one stripped web master of the whole photo is committed, `src/assets/profile/photo.jpg`, 600 × 894, JPEG quality 85 with mozjpeg, no EXIF, XMP, IPTC, GPS or ICC, 36,516 bytes (test cap 80 KB), made by `scripts/brand-images.ts --photo`; the 848 × 1264 original is never committed (§8.4). `avatar.jpg`, the icons, the nav photo and the share card are byte-unchanged. `scripts/portrait-cutout.ts` and `avatar-cutout.png` are no longer used by any page and stay unchanged pending the owner's decision. Tests changed, each edit commented "owner, profile-image-full": `brand-images.test.ts`, `home-wall.test.ts`, `home.spec.ts`, `alignment.spec.ts`. Unchanged: the copy, the four links, the wall and its captures, `#next`, `#more`, EN and VI. The v6.19 row is not edited. |
| v6.21 | hero-intro-longer | Owner request, "make description more longer": the Home hero sentence (`.w-say`) gets its own key `home.intro` (EN 249, VI 251 characters, about 3 and 2.6 times the 84 / 97 of `exp.hero.copy`, which still feeds the Experiences hero). Wording rule: only facts already on the site (`skills/*/data-engineering.md`: banking markets in the Philippines and South Africa; the FPT Software entry: team of 7 since Aug 2026; the profile and the Datum / Security Bank entry: AWS, DBT, Airflow, PySpark, GitLab CI/CD), the stack kept in the markets sentence and the FPT sentence standing alone and dated, so the stack is not read as the FPT team's; no new number, employer, title or certification; EN and VI of equal meaning; still two `<strong>` phrases. No CSS change, but positions moved: at 1440 the H1 now ends at 572.4px (was 662.4); at 1024 × 768 the pills end at 839.9px, below the fold; at 375 × 812 the links and pills are below the fold (EN pills 935.2px, VI pills 909.2px), **owner-accepted**, the photo, H1 and intro stay above 812px (EN intro ends 785.2px, VI 759.2px; figures corrected in v6.22, where the 375 values first given were VI values labelled EN). Tests changed, each edit commented "owner, hero-intro-longer": `home-wall.test.ts` and `home.spec.ts` read `home.intro`; `home.spec.ts` asserts the H1 and the intro, not the pills, at 375 × 812. |
| v6.22 | photo-align-cutout | Owner requests, "align my photo equal with intro and remove the background" and "photo not match with current theme": the Home portrait is the owner **cut out of the grey studio backdrop** (`src/assets/profile/photo-cutout.png`, 600 × 894 RGBA, 286,115 bytes, IHDR/IDAT/IEND only; keyed by `scripts/portrait-cutout.ts` from the committed `photo.jpg`, never the original; gates and method in §4.1.3) and sits on the page's warm tint `--warm` (light and dark), so no grey block shows. **The rule per breakpoint:** from L the frame's top is the role line's top and its bottom the pills' bottom (rows `auto` instead of `1fr auto`, `.w-text` `align-self: start`, the photo `align-self: stretch`, `margin-top` −134px); at M (735–1068) it is beside the text and its top and bottom are the text block's (was centred); at S it stays stacked above the intro at 160 × 238.4px. **Sizes:** at 1440 the frame is 288 × 420.5px and the person is drawn 282.2 × 420.5px (was 288 × 429.1); at 1024 the frame is 216 × 404.9px and the person 216 × 321.8px on its bottom edge, with 83.1px of warm above the picture (was 216 × 321.8, centred); at 390 it is 160 × 238.4px, unchanged. Face widths were not measured in this round. **What moved:** at 1440 × 900 the frame goes from 461.0–890.3 to 470.0–890.5px (its top on the role line; the text does not move); at 1024 × 768 it goes from 404.5–726.4 to 363.0–767.9px (the text does not move); at 390, 375 and 320 nothing moves, and the grey backdrop becomes the cut-out on warm. **Byte caps:** the table's measured column was re-taken with the cut-out (each row about 6 KB higher); the caps are unchanged (150 / 170 / 220 KB), and the 1.25 rule would now give 160 and 230 KB for 1440 light and dark. **Tests**, each changed assertion commented "owner, photo-align-cutout": `home-wall.test.ts`, `home.spec.ts` ("Home photo frame", "Home photo cut-out", the wall geometry, the photo's markup), `alignment.spec.ts` (the Home loop) and `brand-images.test.ts` (the cut-out's chunks, size and edge gates). This supersedes v6.20's "whole photo on its grey backdrop, growing into the fade" for the Home portrait; the v6.20 row stays as history. Asset policy: `photo.jpg` stays the metadata-free master and the cut-out's source; `photo-cutout.png` is the served cut-out; `avatar-cutout.png` stays on disk, unused and untracked. |
| v6.23 | blog-like-experiences | Owner request, "update blog style like other page": the blog index and every post page (EN and VI) take the **Experiences style** (§4.5 Blog style rule). The index is the Experiences hero and one grey band of white post cards (H2 "Latest." and "More posts.", `CardGroup` `variant="posts"` via `PostCards.astro`, 3 / 2 / 1 up), replacing the lead card and the hairline list (`LeadCard.astro` and `PostRows.astro` are deleted). Each post ends with a grey closing band (`#read-more`, H2 "More in this series." or "More to read.", up to two cards, in `data-pagefind-ignore`), replacing the hairline "More from" list in the footer; `MoreFrom` stays for `/star/`. The series box and the narrow TOC `<details>` take the card shell (radius 28, padding 28, `0 24px` at S); the post hero, callout and cover radius literals become `--radius-md` / `--radius-sm` at the same values. One posts-only `overflow-wrap: anywhere` rule (`CardGroup.astro:301-305`) keeps 200% text inside 320px cards. Added i18n: `blog.latest`, `blog.moreSeries`, `blog.moreFrom`; changed: `blog.more` → "More posts."; removed: `series.prev`, `series.next`. Tests changed, each edit commented "owner, blog-like-experiences": `tests/unit/blog-render.test.ts`, `tests/e2e/blog.spec.ts`, `tests/e2e/m13.spec.ts`, `tests/e2e/alignment.spec.ts`. Unchanged: topic, series and tag pages, the post header and article (Newsroom), `MoreFrom` on `/star/`, Experiences, Home, Skills, the CV page and PDF, blog content and frontmatter, RSS. The v6.22 row is not edited. |
| v6.24 | avatar-title | Owner request, "update the avatar to remove the background and change title to Data Engineer / Data Engineering \| Backend \| DevOps": the Home role line is now two lines, **Data Engineer** over **Data Engineering \| Backend \| DevOps** (`home.role`, `home.roleAreas`, EN and VI; the profile `headline` is no longer drawn on Home); the portrait frame `.pop` loses `background: var(--warm)`, so the cut-out stands directly on the page, transparent in light and dark (`--warm` is unused by Home); the identity row's `margin-top` becomes −153 / −102 / −155px (was −135 / −81 / −134) so the extra line grows upward and the name, intro, links and pills stay where they were (the 1440 × 900 first screen still holds); tests: `home.spec.ts` (role line, transparent frame, person-pixel check), `home-wall.test.ts`. |
| v6.25 | title-accent | Owner request, "highlight title" (with the avatar-title review: the two role lines had no hierarchy): on Home the role title **Data Engineer** (`.w-title`, `HomeWall.astro:241-243`) is drawn in the theme accent `--accent` (`#0053a6` light, `#5cb0ff` dark: 7.5:1 on white and 9.1:1 on black on the plain page; measured over the faded tiles (r2 probe, title glyphs hidden, the text range's lowest pixel): 4.98:1 light and 5.97:1 dark at 1440, 4.93:1 light and 5.97:1 dark (VI 5.81:1) at 1024, 7.53:1 and 9.11:1 on the plain page at 390 to 320; the full-width role-line box, which is not under the glyphs, reaches 3.68:1 light and 4.04:1 dark at 1440, so the claim holds for the glyphs and not for that box), plain text with no underline and no hover so it does not read as a link; the areas line `.w-areas` (`:244-246`) is `--text-2` at weight 500 and the name stays `--text`; size, weight of the title and line heights are unchanged, so the −153 / −102 / −155px margins and the 1440 × 900 first screen do not move. Spec text corrected: the frame is 288 × 441.5 (1440) and 216 × 425.9 (1024), no warm panel anywhere. Tests: `home.spec.ts` "Home role line hierarchy" (computed colours, EN and VI, light and dark), `home-wall.test.ts`. |
| v6.26 | title-below-name | Owner request, "make title more bigger and bellow my name" (read as: below the name, directly under the H1). On Home (EN and VI) the hero order is now **name (H1), title, second line, intro, links, pills**. The role line `p.w-role` moves from above the H1 to directly under it, with nothing between `</h1>` and `<p class="w-role` (`HomeWall.astro:109-115`). The title **Data Engineer** (`.w-title`, still `--accent`, still a span, not a heading) is **32 / 28 / 24px at L / M / S** (was 17 / 17 / 14px; `:241-246,346-350,394-398`), with line boxes of 36 / 32 / 28px. The second line `.w-areas` stays 17 / 17 / 14px, weight 500, `--text-2`. The name stays 72 / 56 / 44px (`:259-266,351-355,405-409`) with its top margin now 0 (was 6px), and the role line takes `margin-top: 6px`, so the title sits 6px under the H1. **Margins:** the identity row's `margin-top` is −163 / −113 / −170px (was −153 / −102 / −155; `:197,330,381`). The block grows by 10 / 11 / 15px (the title's larger line box; the name's 6px top margin moves to the role line and nets out), and the margin grows by the same amount, so the intro, links and pills stay where they were. Without that margin change the 1440 pills would end at 905.5px, off the 900px first screen. At S the margin is exactly −163px because the VI intro ends at 811.2px in WebKit with Inter blocked (0.8px inside the 812px fold). **Anchors:** at L the frame's top is the name's top and its bottom the pills' bottom (`.pop` 288 × 456.5px at 1440; was 441.5px). At M the frame is the text block, H1 top to links bottom (216 × 436.9px at 1024; was 425.9px). At S the photo stacks above the name (160 × 238.4px, unchanged). **What moved (Chromium, measured):** at 1440 × 900 the H1 is 434 to 509.6px (was 497 to 572.6px), the title 515.6 to 551.6px and the frame 434 to 890.5px; at 1024 × 768 the H1 is 331 to 391px and the title 397 to 429px; at 375 × 812 the photo is 185 to 423.4px, the H1 439.4 to 486.9px and the title 492.9 to 520.9px. The intro, links and pills did not move. **Contrast (r2 probe method, the title's text range with the glyphs hidden, lowest pixel behind the glyphs; AA is 4.5:1):** the title is 6.44:1 light and 8.24:1 dark at 1440 (VI title 6.43:1 light), 7.41:1 light and 8.95:1 dark at 1024, and 7.53:1 and 9.11:1 at 375; the name is at least 7.34:1 light and 7.70:1 dark at 1024 and 1440. Against v6.25 the name moves up into the denser part of the fade (63px at 1440, 59px at 1024) and the title moves down onto fainter wall (66px at 1440, 55px at 1024); the range covers the whole 32px title, so the wider title is included. **Tests changed**, each commented "owner, title-below-name": `tests/unit/home-wall.test.ts` (order, the three margins, the title sizes, the name and role margins, areas without a font size) and `tests/e2e/home.spec.ts` (the order test `:318-347`, the role line hierarchy test `:2070` (title 32px, areas 17px), the new describe "Home title below the name" `:2123-2170`, and the identity-row order list `:2172-2243`). Unchanged: the first-screen checks (`:547-623`), the frame and alignment specs, the byte caps, CLS, the photo and the cut-out. This row adds the order, sizes and numbers; the §4.1 text follows it. The v6.25 row gets its measured contrast figures; no other history row is edited. |
| v6.27 | title-black | Owner request, "remove highlight for title just keep it in black". On Home (EN and VI) the role title **Data Engineer** (`.w-title`, `HomeWall.astro:241-243`) is drawn in `--text`, the colour of the name, instead of `--accent` (v6.25): near-black in light and white in dark (the theme text token, not literal #000, no new token). Nothing else moves: sizes 32 / 28 / 24px, weight 600, order (name, title, second line), margins and the first screen are unchanged; the second line stays `--text-2` at weight 500, so the hierarchy is size and weight. Tests changed, each commented "owner, title-black": `home.spec.ts` "Home role line hierarchy" (title = `--text` = the name, not the accent; weights 600 > 500; title size > areas size) and `home-wall.test.ts`. The v6.25 and v6.26 rows are history and are not edited. |

---

## Appendix D. Page composition guide

Normative for M12: how each page is composed (order, type roles, spacing, first-viewport wireframes at 1440 and 375). Where it conflicts with §4/§5, §4/§5 win. `†` = measured from apple.com. Wireframe y-coordinates were measured at Apple's headline sizes; the larger M/L headlines (§5.4) add about 17px per hero line at L, and the peek rule is enforced by the e2e suite.

### D.0 House rules (apply to every page)

1. **Two alignments, never mixed in one band.** Heroes are **centred lockups** (Home, D.1, is the exception: its identity row and `#next` are start-aligned and the `#more` closing band is centred). Inner-page sections use Apple's **start-aligned section header** (§5.10.4): headline on the left at most 75% wide, a chevron CTA on the right at the baseline, `column-gap:120px`†. Card text is always start-aligned.
2. **One spacing ladder, and nothing else:** eyebrow → headline 8; headline → subhead 6† (3† in promo tiles); subhead → actions 17† (12† in promo tiles, 11† at S); copy → callout 8–9†; header → content 48/40/32†; section padding 120/80/56; card gaps 16 (cards) / 20 (gallery)† / 12 (tiles)†. A value not on this list is a bug. **Home exception:** the Wall's spacing is its own, set per §4.1.2 to §4.1.5 (the row's gaps and paddings, the `#next` and `#more` paddings, the link and text margins of the type table), not this ladder.
3. **The peek rule.** At 1440×900 and at 375×812, the first viewport must show **at least 64px of the next band** (a different background), so the page invites scrolling the way Apple's homepage does (692px hero + 12px gap at 900 tall → 152px of the next unit visible). Each wireframe below states its peek. **Home exception:** the first screen is the wall, the name, the links and the pills, and the wall fades into the page, so there is no band to peek; the rule becomes "the H1, the links and the pills end at or above 900px at 1440 × 900, the photo, H1 and whole intro at or above 812px at 375 × 812, the pills below it by the owner's acceptance in v6.21" (§5.10.2).
4. **Whitespace goes above headlines and around the hero, never inside cards.** Cards use the padding in §5.10.4 and grow with their content. Bands grow only through their padding.
5. **Band transitions are colour only:** white ↔ #F5F5F7, touching, with no hairlines, shadows or dividers. Home follows it with no exception: its band order is white (`#top`, `#next`) → one grey band (`#more`), the wall fades into the white page by a mask, and the wall tiles' 1px `--keyline` outline (§5.3) is not a band divider. A band's first element is always an eyebrow or a headline, never a chip row or a body paragraph.
6. **Singletons are compositions, not orphans.** With 1 project, 1 story and 1 post today, every "list" must have a designed n=1 state (noted per page).
7. **Measure:** headlines `text-wrap: balance`, hero H1 at most 2 lines at L, subhead at most 1 line at L (about 60 characters at 28px in 980px), body at most 68ch.

### D.1 Home (`/`)

The Wall of §4.1: a full-width wall of twelve tilted page captures under the one nav row, fading into a white identity row (photo, name, role, sentence, links, pills), then a white "Next." section and one grey "Let's talk." closing band. There is no hairline, no card and no shadow; the only filled surfaces are the wall tiles (`--surface-2`, 1px `--keyline` outline), the closing band (`--surface-2`). The wireframes below are **illustrative**: they show order, alignment and what sits above the fold. Heights are not measured; §4.1 and the e2e tests win. Wireframe copy is the EN copy (§4.1.1). The identity row and `#next` are start-aligned and `#more` is centred (the exception to D.0 rule 1).

**Order** (§4.1.1): `#top` (`.w-clip` then `.w-id`) · `#next` · `#more`.

| Block | Content | Art |
|---|---|---|
| `#top` · `.w-clip` | nothing readable: twelve captures of the site's own pages, 4 × 3 at M and L, 3 × 4 at S, tilted, `aria-hidden`; the tiles are mouse links | the captures (§4.1.2), 560 / 400 / 300px tall at L / M / S |
| `#top` · `.w-id` | the photo cut out on the page (no fill), as tall as the intro from M · the name as the ink H1 · the two-line role line directly under it (title in the name's text colour at 32 / 28 / 24px, areas lighter) · the first-person sentence · **See every role ›** · **See the project ›** · **All stories ›** · **All posts ›** · **Download CV** · **Email me** | the owner's cut-out photo (§4.1.3) |
| `#next` (H2 left, goals right at L) | H2 "Next." · the dated step (*Planned · Apr 2027*, *Claude Certified Architect*) · two goals: *Goal · by 2028* / *by 2030*, title, text, a "So far" link · the owners note | the Claude mark beside the step's name (decorative) |
| `#more` (grey, centred) | H2 "Let's talk." · line · **Email me** · **LinkedIn** · legal-name line | none |

**Motion:** the load intro on the role line, the sentence, the links and the pills (the name H1, the wall and the photo are never animated); `#next` and `#more` reveal as groups (§5.11). Under reduced motion everything shows at once and the tilt stays.

**Wireframe 1440×900** (illustrative; one nav row, the 44px global nav, §5.7):
```
y=0    ┌──────────────────────────────────────────────────────────────────────────────┐
       │ (photo)         Experiences  Projects  In practice  Blog   ⌕  ◐  EN          │ global nav, 44px
44     ├─ #top · .w-clip, 560px · aria-hidden ────────────────────────────────────────┤
       │   ╱▔▔▔▔╲  ╱▔▔▔▔╲  ╱▔▔▔▔╲  ╱▔▔▔▔╲     twelve captures, 4 × 3, tilted           │
       │  ╱ page ╲╱ page ╲╱ page ╲╱ page ╲    rotateX 28° rotateZ −8°                 │
       │ ╱  ···  ╱  ···  ╱  ···  ╱  ···  ╱    fades to white from 48% to 90%         │
       ├─ .w-id · white, over the fade by 170px ───────────────────────────────────────┤
       │  ┌──────────┐  Ryan Parker                  (H1, 72px, ink)                  │
       │  │          │  Data Engineer                (title, 32px, text colour)            │
       │  │          │  Data Engineering | Backend | DevOps  (areas, 17px)            │
       │  │ cut-out  │  I design, build and run data platforms…                       │
       │  │ no fill, │  See every role ›     See the project ›   (2 × 2 links grid)   │
       │  │ 288×456  │  All stories ›        All posts ›                              │
       │  └──────────┘  ( Download CV )  ( Email me )   pills end at 890px            │
900    ┴ (fold)
       ├─ #next · white, 96px above and below ────────────────────────────────────────┤
       │ Next.            │ Goal · by 2028            Goal · by 2030                    │
       │                  │ Data Architect            Forward Deployed Engineer (FDE)   │
       │                  │ text · So far: …          text · So far: …                  │
       ├─ #more · grey band, centred ─────────────────────────────────────────────────┤
       │                              Let's talk.                                      │
       │               Happy to talk data platforms, migrations and AI in data.        │
       │                         ( Email me )  ( LinkedIn )                            │
       │                              legal-name line                                  │
       └──────────────────────────────────────────────────────────────────────────────┘ footer
```
**Wireframe 390×844** (illustrative; everything in one column in DOM order, nothing scrolls sideways; the name is `min(2.75rem, 19vw)` and wraps only between words at 200% text, §4.1.3):
```
y=0   ┌─────────────────────────────────────┐
      │ (photo)                    ☰  ⌕    │ global nav, 48px
48    ├─ #top · .w-clip, 300px ─────────────┤
      │  ╱▔▔▔╲ ╱▔▔▔╲ ╱▔▔▔╲  3 columns,      │
      │ ╱ pg  ╱ pg  ╱ pg  ╱  tilted, faded  │
      ├─ .w-id · over the fade by 163px ────┤
      │ ┌────────┐                          │
      │ │ cut-out│  cut-out, 160 × 238px      │
      │ └────────┘                          │
      │ Ryan Parker  (H1, 44px, ink)        │
      │ Data Engineer  (title, 24px, text colour)│
      │ Data Engineering | Backend | DevOps │
      │ I design, build and run …           │
      │ See every role ›   See the project ›│
      │ All stories ›      All posts ›      │
      │ ( Download CV ) ( Email me )        │
844   ┴ (fold)  (the pills fall below the fold at 375 × 812; owner-accepted, v6.21)
      ├─ #next · white ─────────────────────┤
      │ Next. · goal 1 · goal 2             │
      ├─ #more · grey ──────────────────────┤
      │ Let's talk.  ( Email me ) ( LinkedIn )
      └─────────────────────────────────────┘
```
**n=1 / empty:** the project, stories and posts links render only with their content (§4.1.0): with no featured project **See the project** is left out, with no story **All stories**, with no post **All posts**, and **See every role** is always first, so the row is never empty. `#top`, `#next` and `#more` always render, so the page is never emptier than the wall, the identity row and the closing band.

### D.2 Experiences (`/experiences/`)

Superseded by §4.2 (v6.0).

**Order:** local nav → hero (white) → **Get the highlights.** (grey, stat cards) → **Experience.** career row (white) → 5 chapters → featured project (black) → **Let's talk.** (grey) → footnotes (grey). The peek note measures `#highlights`.

- **Highlights band (superseded in Phase B by the stat-card gallery of §4.2.0; the card text below is historical):** padding-top **80 / 64 / 48** (it sits under 96px of bars with no hero; 120 would leave a 216px empty field), padding-bottom 80 / 64 / 48. The header is **start-aligned** at the `--content-wide` edge (§5.10.4): H2 "Get the highlights." (Section headline 48/40/32), no CTA. 48 / 40 / 32† to the gallery. Cards 372 / 344 / 260† wide, `--surface-2`, radius 28†, padding 32 / 28 / 24†: label 17/600 grey → 8† → H3 28 → 12† → body 17 grey (≤140 characters) → `margin-top:auto` → "Read the role ›" 17 link. Paddles below, end-aligned.
- **Chapter at L (sticky storytelling):** left column 40%, **start-aligned**: Current chip + date · location (Eyebrow) → H2 Section headline 48 → company (Subhead 28 grey) → 24px → **tech chips (wrapping, start-aligned) and the story pill**, moved here from under the cards so the sticky column stays informative while the reader scrolls the cards. Right column 60%: cards, one column, 16px gap. 80px gutter between columns.
- **Chapter at M/S:** centred header, 2-up / 1-up cards, then the chips centred (spec).
- **Rhythm:** chapters touch; the colour flip is the only divider. The current role's chapter uses the `--surface-2` band first (spec), so after the white highlights band the page reads white → grey → white …
- **Closing:** centred lockup, Section headline 48, 2 pills.

**1440×900:**
```
y=0    Ryan Parker     Experiences     Projects     In practice  Blog     ⌕   ☀   VI      44
 44    Experiences   FPT Software 2026 Security Bank TymeX FPT Software 2020 Hitachi Vantara (Download CV)  52
 96   ┌─ HIGHLIGHTS · #FFF · pad-top 80 ─────────────────────────────────────────────────┐
176   │ Get the highlights.                                                             │ 48/600, x=90
228   │                                                                                 │ 48† gap
276   │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────── (peek 174px)       │ 372†, gap 20†
      │ │FPT Software ·│ │Security Bank │ │TymeX · 2021  │ │Hitachi
      │ │2026          │ │· 2024        │ │              │ │
      │ │Team Leader-  │ │Data quality  │ │Platform …    │ │
      │ │ship & Code   │ │at scale      │ │              │ │
      │ │Review        │ │              │ │              │ │
      │ │body 17 grey  │ │…             │ │…             │ │
      │ │Read the role›│ │Read the role›│ │Read the role›│ │
636   │ └──────────────┘ └──────────────┘ └──────────────┘ └────────                    │
666   │                                                                    (‹)  (›)    │ 36†, gap 18†
782   └─────────────────────────────────────────────────────────────────────────────────┘ pad-bottom 80
782   ┌─ CHAPTER 1 · #F5F5F7 ─────────────────── peek 118px ─────────────────────────────┐
900   ┴  (tile continues; the laptop frame sits on the bottom edge)  peek: n/a (the tile is the band)
        pad-bottom 64 at L if the measured card height exceeds 360, so the chapter eyebrow shows
```
**375×812:**
```
y=0    Ryan Parker                      ⌕   ≡     48
 48    Experiences ⌄            (Download CV)    48
 96   ┌─ HIGHLIGHTS · pad-top 48 ───────────────┐
144   │ Get the highlights.                     │ 32/600, x=23
212   │ ┌───────────────────────┐ ┌──── (72px  │ 260†, pad 24†
      │ │FPT Software · 2026    │ │      peek) │ label 14/600†
      │ │Team Leadership &      │ │            │ H3 21
      │ │Code Review            │ │            │
      │ │body 14 grey, 6 lines  │ │            │
      │ │Read the role ›        │ │            │
592   │ └───────────────────────┘ └────        │
622   │                           (‹) (›)      │
706   └─────────────────────────────────────────┘ pad-bottom 48
706   ┌─ CHAPTER 1 · #F5F5F7 ── peek 106px ─────┐
754   │ Current  Aug 2026 – Present · HCMC     │ (eyebrow visible above the fold)
812   ┴
```

### D.3 Projects (`/projects/`)

**Order:** local nav → hero (white) → tile grid (white band, `--surface-2` tiles) → footer.
- **Hero:** centred; eyebrow "Projects" → H1 96 "Things I've built." → subhead 28 grey. Padding top 144 / 120 / 112, **bottom 80 / 64 / 48** (a grid follows; tiles are their own space).
- **Tiles:** lineup tile. Top: H2 Promo (no eyebrow) → one-line summary → one blue pill to `/projects/<slug>/`. Bottom: the laptop-framed visual. No date range, chips, plus disc or details.
- **n=1 (today):** the single tile spans both columns (odd-count rule). Cap the lockup at `--content` (980) inside the 1416px tile and use the feature-grid min-heights (**600 / 560 / 500**, §5.10.3) so it reads as a feature unit, not a stretched card. Hide the local-nav kind links (one kind) → the local nav shows "Projects" + the PDF pill.
- **Details:** there is no expanded state; the detail lives on the project page (§4.6.1).

**1440×900:**
```
y=0    nav 44
 44    Projects                                                          Download CV   52
 96   ┌─ HERO · #FFF ─────────────────────────────────────────────────────────────────┐
240   │                                   Projects                                    │ 21/600 grey
269   │                              Things I've built.                               │ 96/600
359   │                    Personal, work and open-source projects.                   │ 28 grey
471   └─ pad-bottom 80 ───────────────────────────────────────────────────────────────┘
471   ┌12┬─ TILE · #F5F5F7 · spans 2 cols · min-h 600 · pad 52/40 ──────────────────┬12┐
      │  │                                                                        │  │
      │  │                       Multi-Agent Coding System                        │  │ ← H2 Promo
      │  │   A Claude lead runs a team of AI coding agents through three phases   │  │ ← summary
      │  │  and four quality gates, and a human signs off before building starts  │  │
      │  │                          and again at review.                          │  │
      │  │                          [ See the project ]                           │  │ ← blue pill
      │  │                       laptop frame (DeviceFrame)                       │  │ ← flush at the tile bottom
      (y values below the tile top are illustrative)
900   ┴  (tile continues; the laptop frame sits on the bottom edge)  peek: n/a (the tile is the band)
```
**375×812:** bars 96 → hero eyebrow at 208 → H1 40 "Things I've built." (1 line, 248–290) → subhead 19 (2 lines, 296–340) → pad 48 → tile from 388, **full bleed** (no side padding†), padding 39/43†, start-aligned if >120 characters of copy; first viewport shows the eyebrow, H2, summary and pill (424px of tile visible).

### D.4 In practice (`/star/` and `/star/<slug>/`)

**Index order:** local nav (one link per role) → hero (white) → `#stories` (grey `.news-band`: lead card, tiles, then a "More from In practice" list when there are more than three stories) → footer (1px rule, the band is grey).
- **Hero:** centred; H1 96 / 64 / 40 "Real work. Real results." → subhead "2 stories across 2 roles." No eyebrow, no art, no chips. Bottom padding 80 / 64 / 48.
- **Desk** (§4.4): band padding 80 / 64 / 48 (`--section-pad-tight`). **Lead card** = the newest story: white (`--bg`), radius 32 and padding 32 at L (24 / 24 below 1069px), `--content` wide, diagram left (1.1fr) and text right (1fr) from 735px, stacked below it. **Tiles**: the 2nd and 3rd newest, the same card in a `.news-grid` (24px gap, 36px at L; two columns from 735px, one at S); a lone tile spans the full row and sets its diagram beside its text from 735px, in the lead's 1.1fr / 1fr split. **"More from In practice"**: from the 4th story on, a hairline list 48px below the tiles, 32px row padding, title links only. Card text: category (company, "· Sample" for a sample story) → H2 title link → question (`--text-2`) → headline stat (first metric with a digit; 2.5rem, lead 3.5rem at L; `--hl-1…4` by desk position) → month and year.
- **Footer:** the band is grey, so the footer has a 1px top rule.

**1440×900 (index):**
```
y=0    nav 44
 44    In practice                               FPT Software   Datum / Security Bank   52
 96   ┌─ HERO · #FFF ─────────────────────────────────────────────────────────────────┐
240   │                            Real work. Real results.                           │ 96
359   │                           2 stories across 2 roles.                           │ 28 grey
      └─ pad-bottom 80 ───────────────────────────────────────────────────────────────┘
      ┌─ #stories · #F5F5F7 · pad 80 ─────────────────────────────────────────────────┐
      │  ┌─ lead card · white · 980 ────────────────────────────────────────────────┐ │
      │  │ [ diagram 2:1 ]        FPT Software                                      │ │ ← newest story
      │  │                        Migrating 500 Talend pipelines…  (H2 link)        │ │
      │  │                        Tell me about a time you led …                    │ │
      │  │                        500  Migrated Talend pipelines · Oct 2026         │ │
      │  └──────────────────────────────────────────────────────────────────────────┘ │
      │  ┌─ tile · white (lone tile: full row, diagram beside text) ────────────────┐ │
      │  │ [ diagram ]            Datum / Security Bank · Cutting EMR costs…        │ │
      │  └──────────────────────────────────────────────────────────────────────────┘ │
900   ┴  (the lead card starts above the fold; the peek rule holds)
```
**375×812 (index):** local nav → H1 40 → subhead → `#stories` band; every card is one column with the diagram above its text; the first card is in the first viewport.

**Story page** (an article, §4.4): local nav "Data Engineer" + "All stories ›" → one column on `--article` (653 / 576 / 87.5%), start-aligned, on white: category "Data Engineer · Datum / Security Bank" and month → H1 (story title; article-title size) → "Interview question" label → the question as standfirst → competencies as a dot list → keyline → diagram (2:1) → H2 Situation, Task, Action, Result as prose, the Result section ending with the metric stats (`Stat card`, graph bars for `compare`) → "More from In practice" (the two newest other stories) and the two chevron links → footnotes band (`--surface-2`, last child of `main`). No hero, no quote, no super stat, no pinned stage, no JS.

```
1440×900:  bars 96 │ category 140 │ H1 (≤ 653px column, start-aligned) │ label │ question │ dots │ keyline
           → diagram → Situation → Task → Action → Result + stats → More from → footnotes band
375×812:   the same order in one column; no horizontal scroll at 375 or 320, also at 200% text
```
```

### D.5 Blog index (`/blog/`) and post (`/blog/<slug>/`)

**Index order:** local nav (All posts · Topics · Series · RSS pill) → hero (white) → one grey band (`--surface-2`): H2 "Latest." and the newest post's card → 1px rule → H2 "More posts." and the rest, 3 / 2 / 1 up → cover-credit line → footer.
- **Hero:** the Experiences hero, not tight: eyebrow "Blog" → H1 96 (2 lines at L and M) "Notes on data and tools." → Lockup copy → pad-bottom 80.
- **Cards:** the `CardGroup` `posts` variant (§4.2.0, §4.5 Blog style rule): white, radius 28, padding 28 (24 at S), minimum 180px, equal heights per row. Each card: the cover above the eyebrow (112px square at M and L, 72px at S; `heroImage` or the generated token cover, decorative), the eyebrow "Part N · Series" or "Article", the H3 link, the description (three lines), and "date · reading time". The whole card is one link. At 375 the cards stack in one column and the description shows.

```
1440×900 (index):
y=0    nav 44
 44    Blog                                  All posts  Topics  Series  (RSS)    52
 96    HERO · white: eyebrow "Blog" → H1 "Notes on data and tools." → Lockup copy → pad 80
       BAND · grey (--surface-2), 980 column, top pad 48
       Latest.
       ┌ card · white, radius 28, pad 28 ──────────────────────────────┐
       │ [cover 112px]                                                  │
       │ Part 5 · Neovim setup guide                                    │
       │ Debugging, testing and the daily workflow                      │
       │ <description, 3 lines>                                         │
       │ 2 Nov 2026 · 12 min read                                       │
       └────────────────────────────────────────────────────────────────┘
       ────────────────────────────────────────────────────────────────── (1px rule)
       More posts.
       [card] [card] [card]      row 1: three cards
       [card] [card]             row 2: two cards, third column empty
```

**375×812 (index):** hero eyebrow 208 → H1 40 (2 lines) → subhead 19 (2 lines) → pad 48 → band: H2 "Latest." → one card (72px cover above the eyebrow, title, description, meta) → rule → H2 "More posts." → the same cards in one column.

**Post:** local nav (series title + "All posts ›") → **header** (white, start-aligned in the 653†/576†/87.5% column, padding-top 80 / 64 / 48): Newsroom eyebrow 12/700 uppercase grey → date 14/600, 4px† below → **20px†** → H1 48/40/32 at 700† → 16 → subhead 24/21/21 → 16 → meta line (reading time · tags) → **keyline 653px†, 1px `--border`, 44/36/32† below** (§4.5) → hero image when `heroImage` is set (480px at L, 400px at M, full column at S, radius 18, credit caption, 44/36/32 above) → series box (`--surface-2`, radius 28, padding 28; `0 24px` at S) → body 19 (17 at M and S)/1.4211† with paragraph spacing 1.4211em† → H2 24 / 21 / 21, 700, with 52/48/44† above → TOC fixed right at ≥1280: `left: calc(50% + 653px/2 + 56px)`, width 248 (56px from the article), Caption 14 links at a 26px pitch for single-line items, current item `--text`, the rest `--text-2`. Closing band after the article: the grey band of §4.5 (`#read-more`), H2 "More in this series." or "More to read.", up to two cards (the previous and next published part, or the older and newer posts).

```
1440×900 (post):
y=0    nav 44
 44    Neovim setup guide                                                 All posts ›   52
 96    pad 80
176                    PART 1 · NEOVIM SETUP GUIDE                    (12/700 grey)
192                    October 28, 2026                               (14/600 grey)        ┌ On this page ┐
216                    Neovim setup guide, Part 1:                    (48/700, 2 lines)     │ Why Neovim   │
                       from zero to a working editor                                         │ Install      │
328                    Build a fast, minimal Neovim config from        (24 grey, 2 lines)    │ …            │
                       scratch, one decision at a time.                                      └──────────────┘
400                    12 min read · #neovim · #tooling               (14 grey)
460                    ───────────────────────────────────────────    (653†, 44† below the meta)
492                    ┌ Part 1 of 5 · Neovim setup guide ────────┐
                       │ 1 Zero to editor · 2 … (Coming soon)     │
                       └──────────────────────────────────────────┘
690                    First paragraph (drop cap if set) 19/1.4211 …
900  ┴
375×812 (post): bars 96 → eyebrow 144 → date 164 → H1 32 (3 lines, 188–296) → subhead 21 (3 lines) →
                meta → keyline at ≈452 (32†) → series box collapsed to "Part 1 of 5 ⌄" (44px) at 484 →
                "On this page ⌄" (44px) at 544 → body from 604 (≈5 lines visible)
```

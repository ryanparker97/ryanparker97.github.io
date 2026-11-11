# Personal Portfolio — Specification

| | |
|---|---|
| **Status** | Draft v6.0 (one consolidated Apple design system, §5; page specs §4; history in Appendix C) |
| **Last updated** | 2026-11-07 |
| **Hosting** | GitHub Pages — `https://ryanparker97.github.io` |
| **Stack** | Astro + Tailwind CSS, all content in Markdown/MDX |

---

## 1. Overview

A personal portfolio site with three main parts:

1. **Experiences**: work experience (the web page of the CV), with a CV PDF version built automatically. The PDF also includes the summary, selected projects, technical skills, spoken languages and certifications. On the website, projects have their own **Projects** page in the main navigation, while skills, languages and certifications appear on the **Home** page, with technical skills shown as described cards by category and certifications as badge cards. The content is migrated from the existing LaTeX CV (see Appendix A).
2. **STAR stories**: behavioural interview answers in the Situation → Task → Action → Result format, grouped by the role/company where each one happened.
3. **Blog**: long-form posts with tags, RSS, a table of contents and code highlighting.

The look follows **apple.com** closely (§5): white pages with Apple's light grey bands, the SF system font, big 600-weight headlines, Apple blue pills and links, the frosted global nav and product-page local nav, the Apple global footer, and calm scroll motion. A soft mint is kept only as a tiny accent for tech highlights. The site is light by default, with an optional dark theme.

### 1.1 Goals

- Recruiters and hiring managers can skim the CV and key results in under 30 seconds, and download a PDF CV.
- The owner can use the STAR section as a personal interview prep bank, browsed by role.
- Adding a role, project, story or post means adding one Markdown file. No code changes needed.
- Fast, accessible and readable in English and Vietnamese.

### 1.2 Non-goals (v1)

- Blog comments.
- A contact form or any backend. GitHub Pages is static only.
- A CMS UI.
- Auto-generated Open Graph images (v1 uses one static default image).
- Hidden or private STAR stories. **Every STAR story is public**, and the author anonymises names and confidential details before committing.

### 1.3 Audience

| Audience | Needs |
|---|---|
| Recruiters / hiring managers | Fast scan of experience, measurable results, PDF download, contact links |
| The owner (interview prep) | STAR stories by role, quick expand/collapse, search by keyword |
| Peers / readers | Blog posts, RSS, good reading experience |

---

## 2. Decisions summary

| Area | Decision |
|---|---|
| Framework | Astro (latest stable), static output |
| Styling | Tailwind CSS with CSS custom-property design tokens |
| Site structure | Multi-page: Home, Experiences, Projects, STAR, Blog (+ tag and series pages, search, 404) |
| Theme | **Light (white) by default** whatever the OS setting; dark only when picked in the toggle (Light → Dark → System) (§5.12) |
| Palette | Apple's: white `#FFFFFF`, grey `#F5F5F7` bands, text `#1D1D1F` / `#6E6E73`, blue `#0053A6` pills / `#00509F` links (Apple's #0071E3 / #0066CC darkened to reach 7:1); mint only for tech highlights, tech chips and the "Current" chip (§5.3); four highlight colours `--hl-1…4` (green, orange, purple, pink) for the Home stat-card values only (§5.3) |
| Apple-style elements | Apple's breakpoints (734 / 1068, chrome at 833) and type scale; 44px global nav with a search flyout and full-screen mobile menu; 52px product-style local nav on every inner page (chevron dropdown on phones); square homepage units with 12px gaps; 28px-radius cards; Apple global footer with breadcrumbs and directory; four scroll effects (§5) |
| Fonts | System SF stack everywhere (incl. blog bodies), self-hosted Inter as an un-preloaded fallback, no Newsreader (§5.4) |
| Home layout | **Product page** (§4.1): a local nav, then touching full-bleed bands: **Hero** (gradient headline, two pills, stat strip) → **highlights** gallery → **Take a closer look.** → **STAR story** → **career** row → **writing** shelf → **Let's talk.** |
| Experiences page sections | A Layout B **hero** ("Built for banking data."), local nav of roles (each links to its role page, §4.2.3) with a Download CV pill, a grey band of Leadership-style **cards** ("Experience." one per role, "Certifications." one per certification, "Education." one per school: name and school logo only, no degree, dates or major), and a grey **contact box**. **No summary on the web page** (it stays in the PDF). The highlights gallery and career row live on Home (§4.1); the role chapters live on the role pages |
| Projects page | `/projects/` in the main nav (after Experiences). an Apple lineup of **all** projects (personal, work, open source), one feature tile each, with a kind filter in the local nav; each tile links to its product page (§4.6.1) |
| Experiences route | The web CV page is named **Experiences** and lives at `/experiences/` (VI: *Kinh nghiệm*, `/vi/experiences/`). The old `/cv/` and `/vi/cv/` stay as redirects (Astro `redirects`, meta refresh on static hosting), out of the sitemap, search index and Lighthouse URLs. The PDF stays a CV: `/cv.pdf`, `/vi/cv.pdf`, `Ryan-Parker-CV.pdf` |
| CV PDF | Built automatically in CI with Playwright, **US Letter**. Contains the Experiences page content **plus** the summary, selected projects, the technical skills table (with spoken languages), certifications and education, as in `cv.tex`. The Markdown content replaces `cv.tex` as the single source of truth |
| CV contact details | Email, phone, LinkedIn and GitHub: in the PDF and the footer's Connect column |
| STAR organisation | Grouped by role/company, linked from the Experiences chapters |
| STAR display | Four-panel grid: Situation · Task side by side, Action and Result full width, all visible at once |
| Blog | Tags + tag pages, RSS, reading time, sticky TOC, Shiki syntax highlighting, **series** (series box, prev/next part, series index page), callouts, code block titles, inline SVG diagrams |
| First post | **Neovim setup guide, Part 1: from zero to a working editor**, EN + VI at launch (Appendix B) |
| Comments | None |
| Contact | Social links + `mailto:` + `tel:` |
| Search | Pagefind (static full-text search) |
| Analytics | Cloudflare Web Analytics (cookie-free) |
| i18n | English (default, `/`) + Vietnamese (`/vi/`) |
| Authoring | Every entry is a Markdown/MDX file with typed frontmatter (Astro content collections) |
| STAR privacy | All stories public |
| URL | User site at `ryanparker97.github.io` (repo `ryanparker97/ryanparker97.github.io`) |
| CI/CD | GitHub Actions: PR-only protected `main`, all test layers required, CodeQL, Dependabot, SHA-pinned actions, deploy on every merge (§11) |

---

## 3. Information architecture

### 3.1 Sitemap

```
/                         Home (product page: hero, highlights, closer look, story, career, writing, Let's talk.)
/experiences/             Experiences (Leadership-style role and certification cards, contact box; /cv/ redirects here)
/projects/                Projects (all kinds, filter chips, cards expand in place)
/skills/                  Skills (Tech Specs rows: skill groups, certifications, languages)
/experiences/<slug>/     One role (hero + highlight cards, Layout D)
/experiences/print/       Print-only CV layout used to make the PDF (noindex)
/cv.pdf                   Generated PDF (English)
/star/                    STAR stories grouped by role/company
/projects/<slug>/         One project as a product page (Layout B)
/star/<slug>/             Single STAR story (deep-linkable, shareable)
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

- **Global nav** (§5.7): name (links home) · Experiences · Projects · STAR · Blog · Search (⌘K) · theme · language (EN / VI). At compact chrome (≤ 833px) the links move into a full-screen menu; search stays in the bar.
- **Local nav** (§5.8): every inner page has one, with its own section links (§4.0).
- **Footer** (§5.9): breadcrumbs, a four-column directory (Explore · Writing · Connect · Resources, including RSS and optional X/Bluesky) and the legal row.

---

## 4. Page specifications

Every page is built from the shared design system in §5: the global nav (§5.7), an optional local nav (§5.8), a hero (§5.10.1), full-width sections and tile grids (§5.10), and the footer (§5.9). This section only says **what goes on each page**. Sizes, colours, spacing and motion come from §5 and are not repeated here. Breakpoint names **S / M / L** are defined in §5.2.

### 4.0 Page overview

| Page | Local nav (§5.8) | Hero (§5.10.1) | Content | Closing |
|---|---|---|---|---|
| Home `/` | Overview · Experiences · Skills · **Download CV** pill | Gradient headline H1 (no eyebrow), one line, two pills, stat strip | Full sections (§4.1) | "Let's talk." |
| Experiences `/experiences/` | "Experiences" + one link per role (to its page) · **Download CV** pill | Role eyebrow · "Built for banking data." · positioning · Email me · Download CV | "Experience.", "Certifications." and "Education." card groups (§4.2) | Contact box |
| Role `/experiences/<slug>/` | "Experiences" + one link per role (the open one current) · **Download CV** pill | Company eyebrow, role H1, dates · location | The §4.2.1 chapter with H2 "Highlights." (§4.2.3) | — |
| Projects `/projects/` | All · Personal · Work · Open source · **Download CV** pill | "Things I've built." | Lineup of feature tiles (§4.6) | — |
| Skills `/skills/` | Certifications · Languages · **Download CV** pill | "The tools I build with." | Tech Specs rows (§4.8) | — |
| Project `/projects/<slug>/` | Project title · "All projects ›" | Eyebrow "Project", title, subtitle | Laptop frame, big stats, problem → approach → design → workflow → result (§4.6.1) | "More from the work." |
| STAR `/star/` | One link per role group | "Stories from the work." + competency chips | One chapter per role group (§4.4) | — |
| STAR story `/star/<slug>/` | Role name · "All stories ›" | Story title + question | S + T, Step by step. stage, Result | "All stories ›" · "Read the role ›" |
| Blog index, topic, tag, series pages | All posts · Topics · Series · **RSS** pill | "Notes on data and tools." | Topic-grouped hairline list (§4.5) | — |
| Blog post `/blog/<slug>/` | Series name (or "Blog") · "All posts ›" | Newsroom-style header | Reading column (§4.5) | More in this series / More posts |
| 404 | — | "Page not found." + Go home · Search | — | — |

The local nav sits **directly under the global nav, above the hero**, as on Apple product pages, and stays stuck while the page scrolls. Every page has exactly **one H1**. Each section or tile has an H2, and items inside a section use H3. No heading levels are skipped.

### 4.1 Home (`/`)

Home follows an **apple.com product page** (like /airpods-pro/): the owner is the one "product". Full-width sections **touch and alternate** between `--bg` and `--surface-2` (inner-page style, §5.10.2); there are no 12px-gap units and no tile grid. A local nav (§5.8) sits above the hero.

#### 4.1.0 Principles

- **One idea per section** with a short headline that ends with a period and at most one subhead of 120 characters (§5.14). Detail lives on the linked page.
- **At most two actions per section**: primary pill first, then a secondary pill.
- **Result first:** the stat strip with the >50% result is on screen one (peek rule: at least 64px of the next band shows at 1440 × 900 and 375 × 812).
- **Local nav** (§5.8): title "Ryan Parker", links **Overview** (current, `/`) · **Experiences** (`/experiences/`) · **Skills** (`/skills/`) and the **Download CV** pill (`/cv.pdf`, `download="Ryan-Parker-CV.pdf"`). These are page links, not in-page anchors.
- The final order is `top, highlights, closer-look, story, career, writing, more`, then the footnotes. Each section is left out when its content is missing, and the alternation still holds for the sections shown: tones are derived from the sections actually rendered (`bandTones`, `src/lib/bands.ts`) and alternate from the white hero, so no two neighbours share a tone and no band is black. Footnotes and footer stay `--surface-2`. `highlights` needs at least one card, `closer-look` a featured project with ≥ 2 labelled bullets, `story` a story, `career` a role, `writing` a post.
- **Scripts:** Home loads only `gallery.ts`, `closer-look.ts` and the shared scripts.

#### 4.1.1 Page structure

| # | Section | Background | `id` |
|---|---|---|---|
| 1 | Hero | `--bg` | `top` |
| 2 | **Get the highlights.** | `--surface-2` | `highlights` |
| 3 | **Take a closer look.** (featured project, shown with ≥ 2 labelled body bullets) | `--bg` | `closer-look` |
| 4 | **STAR story** (the featured story from `pickStory`) | `--surface-2` | `story` |
| 5 | Career | `--bg` | `career` |
| 6 | **Writing** (every published post) | `--surface-2` | `writing` |
| 7 | "Let's talk." | `--bg` | `more` |
| 8 | Footnotes (§5.10.12) | `--surface-2` | none |

Tones shown are for the all-present page; they shift when a section is missing (§4.1.0).

- **Get the highlights.** (`id="highlights"`, `--surface-2`, after the hero): start-aligned header with **Read the STAR stories ›** (→ `/star/`), then a scroll gallery (§5.10.7) of up to four **tall stat cards** (`StatCard`, `--bg`: white on the grey band, black in the dark theme; card 3 stays white in both; min-height 640 / 560 / 520, padding 36/32 · 36/28 · 32/24): an H3 (Card headline), a 104 / 96 / 72px 700 value at the bottom, coloured by position (`--hl-1…4`: green, orange, purple, pink, repeating every four), a 17px `--text-2` caption, an optional chevron link. Cards, each from content and left out when its source is missing: (1) `yearsOfExperience` with the companies oldest first, no footnote ref; (2) `headlineMetric` with "As <role> at <company>, since <date>."; (3) the featured story's title and first metric, **white** (`color-scheme: light`, value in its position colour, purple), **Read the story ›**, no footnote ref; (4) the featured project's first three `tech` names (56 / 48 / 40px), "A human signs off before building starts and at review." (`exp.hl.agentsCap`, under the headline "Agents do the work. Four gates check it."), **See the project ›**.
  
  The hero carries the page's footnotes; gallery cards carry none.
- **STAR story** (`id="story"`, tone from the rendered sequence (`--surface-2` after `#closer-look`), between `#closer-look` and `#career`): centred header with eyebrow "STAR story" (`home.stories.eyebrow`), H2 = the story title, subhead = its question, actions **Read the story** (primary, → `/star/<slug>/`, accessible name "Read the story: <title>") · **All stories** (secondary, → `/star/`), then a default-size stat strip with the story's first two metrics as a number pair (values may be words: >50% and unchanged today), without footnote refs (the hero strip carries the note). The strip is left out when the story has no metrics. There is no super stat on Home.
- **Career row** (`id="career"`, tone from the rendered sequence, `--bg` on the all-present page): a start-aligned header (H2 *"Experience."*, subhead "<role> at <company>, since <Mon YYYY>."), then one entry per role, newest first: at L five columns (`auto-fit, minmax(176px, 1fr)`); at M (735–1068px) **Tech Specs rows** (§4.8, with the L label geometry), one full-width row per role with the years in a 220px label column and the company and role stacked on the right (24px row padding, nothing scrolls); at S the columns stack. Each entry has a 2px top rule (`--accent` for the current role, `--border` otherwise), the years (*2026–now*, 14/600, `--link` when current), the company label as an H3 link to its role page (`/experiences/<role-slug>/`, §4.2.3) (24/600 `--text`), the role (17px `--text-2`). The company link is at least 44px tall (8px block padding).
- **Writing** (`id="writing"`, tone from the rendered sequence, after `#career`): start-aligned header (eyebrow "Writing", H2 "Notes on data and tools."/`blog.hero`, **All posts ›** → `/blog/`), then a scroll gallery (§5.10.7) with one card per published post, newest first (it grows with posts). Each card: the post cover (square, shown whole on `--fill` with `object-fit: contain`, radius 18px) when it has one, a 14/600 `--text-2` kicker ("Part N · <Series>", as on the Blog rows, or "Article"), the title as an H3 link (the whole card is the target), and "<date> · N min read". No chips. Three posts or fewer share the row. Paddles are named "Previous posts" / "Next posts". Cover credits sit under the gallery.
- **Headings:** the H1 is the gradient headline; each later section has an H2; gallery cards have H3s, and so do career entries.
- **Anchors:** every section heading id lands below both bars with its eyebrow visible.
- Skills, certifications and languages in full are on `/skills/` (§4.8). Contact links are also in the footer's Connect column.

#### 4.1.2 Hero (`id="top"`)

- `Hero tight` (§5.10.1). **No eyebrow** (the title is the headline). **H1:** the profile headline (*Senior Data Engineer & Team Lead*) inside the page's one **gradient-text phrase** (§5.10.8). No icon, no location.
- Subhead: one line, *"Data pipelines and cloud platforms for banking markets."* (i18n `home.hero.subline`).
- Actions: **Learn more** (primary → `/experiences/`, accessible name "Learn more about my experience") · **Download CV** (secondary, `download="Ryan-Parker-CV.pdf"`).
- **Stat strip** (`.stat-strip--big`, the hero's extra slot): numbers only, up to three: years of experience, the headline metric (caption above, e.g. "Led") and the featured STAR story's first metric with a digit (the >50% result). A stat with no digit is left out; with none, the strip is not rendered. Each stat with a content note gets a footnote ref (§5.10.12). Footnote numbers run once for the page, from the hero strip only. If the peek rule fails with the big strip, the default strip variant is used; no stat is dropped.
- **Hero intro:** subhead → pills → stats fade up (§5.11 effect 1). **The H1 is never animated.** The pipeline visual no longer appears on Home.

#### 4.1.3 "Let's talk." (`id="more"`)

The `#more` section (the shared `LetsTalk` component): `--surface-2`, H2 *"Let's talk."*, subhead, **Email me** · **LinkedIn**, the location, legal name and spoken languages, and the milestones art.

#### 4.1.4 Footnotes

The hero strip's notes, numbered once for the page.

**Acceptance criteria (Home)**
- Exactly one H1; headings go H1 → H2 with no skipped levels. The H1 is the profile headline.
- Sections appear in the §4.1.1 order. Neighbouring sections touch (within 1px) at every width from 320px up.
- Exactly one `.text-gradient` on `/` and `/vi/`, inside the H1; every hero `.stat-value` contains a digit; no `.lockup--long` at 375px. No section has more than two actions.
- The gallery has up to four stat cards. At 1440 with more than 3 cards it scrolls and its paddles enable/disable at the ends; with JS off it still scrolls by swipe/keyboard and the paddles are hidden; at 375 its cards are 260px wide with no page overflow.
- The career row has one entry per role, newest first, each company linking to `/experiences/<role-slug>/`; five columns at L, Tech Specs rows at M, stacked at S, links ≥ 44px. Footnote ids on `/` are unique.
- The local nav lists Overview · Experiences · Skills with Overview current, and the PDF pill; on `/vi/` the links keep the `/vi/` prefix.
- Peek rule: the second section starts at least 64px above the bottom of the viewport at 1440 × 900 and 375 × 812.
- With JavaScript off, every section is visible.
- Lighthouse on `/` and `/vi/` ≥ 0.95 in every category, CLS < 0.05; axe has zero serious or critical violations in light and dark, EN and VI.

### 4.2 Experiences (`/experiences/`)

The old `/cv/` and `/vi/cv/` URLs redirect to `/experiences/` and `/vi/experiences/` (static meta-refresh pages generated by Astro `redirects`; excluded from the sitemap and the search index).

The page is a **Leadership-style index**: a hero, one grey band of white, type-only cards (no image, icon or avatar; certification cards may carry one optional issuer logo, the Education card the school logo) in two groups, and a closing contact box. The summary, projects and skills are **not** on this page: projects live on `/projects/` (§4.6), skills on `/skills/` (§4.8), the highlights gallery and career row on Home (§4.1), each role's highlights on its own page (§4.2.3); all of them, plus the summary, are in the PDF (§4.3).

#### 4.2.0 Page structure

| # | Block | Kind | `id` |
|---|---|---|---|
| 1 | Local nav | §5.8 | — |
| 2 | Hero | §5.10.1, `--bg` | `hero` |
| 3 | Role, certification and education cards | One `--surface-2` section holding three card groups separated by a 1px `--border` rule | `roles` (groups `experience`, `certifications`, `education`) |
| 4 | Contact box | `--bg` section holding a `--surface-2` box | `contact` |

- **Hero** (Layout B): eyebrow = the profile headline, **H1** *"Built for banking data."* (i18n), the positioning line as Lockup copy (`exp.hero.copy`), **Email me** (primary, `mailto:`) · **Download CV**.
- **Card groups** (`CardGroup`): a start-aligned H2 (*"Experience."*, *"Certifications."*, *"Education."*) over a list of cards on `--bg` (white; the band is grey), radius 28, padding 28 / 28 / 24, minimum height 180px at M and L, 20px gap; **4 up at L, 2 at M, 1 at S**, inside the 980px `--content` grid (as apple.com/leadership), not the wide width. The count is never fixed: the lists come from the `experience`, `certifications` and `education` collections.
  - **Role card** (`id` = the role slug): eyebrow = year range (*2021–2024*, *2026–now*), **H3** = company label (a link to `/experiences/<slug>/` stretched over the whole card), role title below in `--text-2`. Newest first (§4.2.1 sort).
  - **Certification card:** an optional issuer logo (Iconify svg) above the eyebrow = *issuer · year*, **H3** = name, and a **Verify ›** chevron link when the certification has a `credentialUrl`. Newest year first.
  - **Education card:** an optional school logo (a local image via `image()`, 32px, `alt=""`, above the eyebrow, no disc or dark-mode treatment), eyebrow = `shortName`, **H3** = `name` (the English name on `/experiences/`, the Vietnamese name on `/vi/experiences/`); no link or year.
  - **Card H3 (all kinds):** 21px at every width with `overflow-wrap: break-word`; the "· year" in the eyebrow keeps a no-break space so it never wraps alone.
  - A group renders only when its collection has entries.
- **Contact box** (`ContactBox`, H2 *"Get in touch."*): `--surface-2`, radius 28, padding 40 / 32 / 24, `--content` wide and centred, start-aligned text; the subhead is `home.contact.text`; lines **Email** (`mailto:`), **Mobile** (`tel:`, shown as `phoneDisplay`) and **LinkedIn** (new tab). Every link is at least 44px tall.
- **Footer:** there are no stats, so no footnotes; the last band is white and the footer has no top rule.
- **Headings:** H1 (hero) → H2 (*Experience.*, *Certifications.*, *Education.*, *Get in touch.*) → H3 (one per card), no skipped levels.
- **Anchors:** each role card's `id` is the role slug, so the old `/experiences/#<role-slug>` links (STAR, search) land on the card below both bars (§5.10.6).
- **Local nav:** title "Experiences" (a link to `/experiences/`); one link per role, newest first, labelled with the company's **short name** (`shortName`, §6.2; default the `client` if set, else `company`), adding the start year only when the same short name appears twice, linking to `/experiences/<role-slug>/`; all links fit at L and M; the small pill **Download CV**.
- **Scripts:** only the shared local-nav helper (§5.8).

#### 4.2.1 Role chapter (used on role pages, §4.2.3)

One full section per role, sorted with the current role first, then `start` descending (year-only dates sort as January). Two roles at the same company stay two chapters.

- **Header** (Section header, §5.10.4):
  - Eyebrow: the date range only, kept to one line, e.g. *Aug 2026 – Present* (`formatDateRange`; "Present" when `end` is empty). The current role adds a **"Current"** chip (`--mint-tint`) before the date.
  - **H2** in Section headline size: the role title, e.g. *Senior Data Engineer (Team Lead).*
  - Subhead: the company label and the location, e.g. *Datum / Security Bank · Ho Chi Minh City* (the company label is *Datum / Security Bank* when `client` is set).
- **Highlight cards** (§5.10.4 Card): each Markdown bullet becomes one card. The bold label (the text before the first `:`) is the card's **H3**; the rest is the body in `--text-2`, keeping inline **bold** terms in `--text`. Bodies support the inline subset `**bold**`, `*italic*`/`_italic_`, `` `code` ``, `[text](url)` (http(s), mailto, site-relative and `#` only; other schemes render as plain text), `\` escapes and HTML entities; anything else stays literal. A bullet with no bold label becomes a body-only card.
  - Grid: in the wide content width, 2 columns at M and L, 1 at S, 16px gap. With an odd count, the last card spans both columns, and a spanning card's body is capped at 68ch.
  - Card text is **left-aligned** (the header stays centred). Cards in a row have equal heights.
  - The bullets are parsed at build time by `lib/cv.ts`; no client JS.
- **Tech highlights:** every tech term in card text is highlighted, whether or not the Markdown bolds it.
  - **Vocabulary** (build time): the role's `tech` list plus every `skills` item and child name (EN entries; tech names are not translated, so the same vocabulary serves VI).
  - **Matching:** case-insensitive and whole-word (word boundaries are anything other than letters, digits, and `+`, `#`, `.` inside a word, so *Azure-based* matches *Azure* and *PySpark/Spark* matches both), **longest term first** (*Apache Spark* before *Spark*). The original casing is kept. Matches inside links and inline code are not highlighted. A bold run that is a tech term becomes a highlight (not bold + highlight); other bold runs stay plain bold.
  - **Style:** `<mark class="tech">`: `--mint-tint` background, `--text`, weight 600, 6px radius, `0 4px` padding, `box-decoration-break: clone`.
- **Tech stack:** under the cards, centred, the role's `tech` list as mint chips (§5.6) in a list labelled "Tech stack". At S, at most 2 rows show and the rest collapse into a "+N" chip.
- **STAR link:** if the role has STAR stories, a secondary pill under the chips: **"Read the STAR story"** (one story → `/star/<slug>/`) or **"N STAR stories"** (→ `/star/#<role-slug>`).
- **Motion:** the header and each card use effect 1 (staggered fade-up); cards are never scaled.
- **Sticky storytelling (L only):** for every chapter with 1 or more cards, scroll effect 4 (§5.11) puts the header in a sticky left column and the cards in one right column. At M and S, and with no cards, the chapter keeps the centred, stacked layout above.

#### 4.2.3 Role page (`/experiences/<slug>/`)

Every `experience` file is also a page at `/experiences/<slug>/` (and `/vi/experiences/<slug>/`); `print` is reserved. Local nav: title "Experiences" (→ `/experiences/`), one link per role (newest first, labelled as in §4.2.0) to its page with `aria-current` on the open one, and the **Download CV** pill. A tight hero (§5.10.1): eyebrow = company label, **H1** = role, subhead = date range · location. Then one `--surface-2` chapter (§4.2.1) with the H2 *"Highlights."* in place of the role header (no dates, no Current chip), cards, tech chips and the STAR pill in the sticky left column at L. No closing section; the chapter is the last band, so the footer has a top rule. Description: `exp.role.description`. Indexed by search as Experiences (`searchType="cv"`).

**Acceptance criteria (Experiences)**
- There is exactly one role card per `experience` file, in sort order (current first, then `start` descending), each linking to `/experiences/<slug>/`; the local-nav links have the same targets in the same order. Adding a file to `src/content/experience/` adds a card, a local-nav link and a role page with no code changes.
- Certification cards follow the `certifications` collection, newest year first (*Amazon Web Services · 2022* after *Datadog · 2023*).
- The Education card follows the `education` collection: the school logo above the eyebrow, eyebrow `shortName`, H3 `name` (per language), and no link or year.
- Cards are 4 up at 1440, 2 up at 900 and 1 up at 375; role cards hold no `img`, `svg` or `picture`; certification cards hold only the issuer logo `svg`, the Education card only the school logo `img`.
- Headings go H1 → H2 (*Experience.*, *Certifications.*, *Education.*, *Get in touch.*) → H3 (one per card) with no skipped levels.
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
  - **Certifications:** one line each, *Name (Year)*.
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

### 4.4 STAR stories (`/star/`)

- **Hero:** no eyebrow, **H1** *"Stories from the work."*, subhead *"<n> stories across <m> roles."* (counts at build time). Under the subhead, an illustration of four rising steps with a spark (§5.10.11; 360 / 360 / 280px wide, 12:5, 32 / 28 / 24px above the filter, `star.art`), then the **competency filter**: centred chips that wrap at M and L and form one horizontally scrolling row at S. Choosing chips hides non-matching stories and updates the URL (`?c=leadership`). A group with no matching story is hidden together with its local-nav link; if nothing matches, the page shows *"No stories match."* and a **Show all** button (as §4.6).
- **Local nav:** title "STAR stories"; one link per role group.
- **Groups:** one chapter per role, ordered like Experiences (newest first), backgrounds alternating `--surface-2` / `--bg`, starting with `--surface-2`. Each chapter's `id` is the role slug, so Experiences can link to it. Stories without a `role` go in a final **"Other / Personal"** chapter.
  - Header (Section header): eyebrow = dates, **H2** = role, subhead = company label, then **View in experiences ›** (→ `/experiences/<role-slug>/`).
  - **Expand all / Collapse all** is a chevron-style text control 12px above the first chapter's cards, end-aligned to the **card column it controls** (with one centred 760px card, to that card's right edge).
- **Story cards** (§5.10.4 Card) in a 2-up grid at M and L (one card: centred, at most 760px wide), 1 column at S, in the opposite colour of their band:
  - competency chips (neutral, §5.6);
  - the interview question as the **H3**, e.g. *"Tell me about a time you disagreed with a stakeholder."*;
  - the headline result metric as a **stat lockup** (§5.10.5, card size), e.g. *Cut / >50% / EMR costs*;
  - the **four-panel grid**, opened by a **plus disc** (§5.6) labelled "Learn more about <title>";
  - a **permalink ›** to `/star/<slug>/`.
- **Four-panel grid** (`StarPanels`): all four parts visible at once, no nested toggles. **Situation** and **Task** sit side by side; **Action** and **Result** span the full width below (Action carries the most detail). One column when the grid is narrower than 520px (container query). Each panel has a small uppercase label (`--text-2`, 12/600, H4 in a card, H3 on the story page), its body in `--text-2` with bold terms in `--text`, 18px radius, a 4% `--text` tint so it reads on either band, and 12px gaps. The Result panel shows every `metrics` entry as a stat lockup, plus **graph bars** (§5.10.9) for a metric that has `compare` values. No pastel colours.
- **Story page `/star/<slug>/`:** local nav = the role name as the title and **All stories ›**; hero with the role · company as the eyebrow, the story title as **H1**, and 32px below it the interview question as a **centred quote** (§5.10.8, reduced size, `width: fit-content; max-inline-size: 760px; margin-inline: auto; text-align: center` with inline, not hanging, quote marks; figcaption "Interview question", centred) in place of the subhead, then 48px below it the result metric as a **super stat** (§5.10.5); one alignment (centred) throughout the hero; the **Situation** and **Task** panels side by side in a 760px column on a `--surface-2` section; then the **"Step by step." stage** (`#steps`, white, `StepStage`): at L with motion allowed and JS on, the left column is pinned (eyebrow "Action", H2 "Step by step.", the question as the subline, then the Action's intro prose) while the right column scrolls one numbered card per labelled Action bullet (`ol`, the step number shown above the label); stacked (M/S, reduced motion, no JS) the stage sits in the 760px column with its header and intro centred (intro ≤ 68ch, 32px above the first card); then a `--surface-2` section with the **Result** panel (full width of its 760px column). The stage appears only when the Action has at least two bold-labelled bullets; otherwise the page keeps the four-panel grid in one 760px column. The Action text appears once. The `/star/` index cards keep the four-panel grid. Closing section with **All stories ›** and **Read the role ›** (`/experiences/<role-slug>/`).

**Acceptance criteria (STAR)**
- Every story file has exactly four H2 headings, `Situation`, `Task`, `Action`, `Result`, in that order (VI: `Bối cảnh`, `Nhiệm vụ`, `Hành động`, `Kết quả`); otherwise the build fails with an error naming the file.
- Expand/collapse works with Enter/Space and announces the expanded state.
- A filter that matches no story in a group hides that group and its local-nav link; a filter that matches nothing shows the empty state.
- Filtering updates the URL (`?c=…`), and loading a `?c=` URL opens with that filter.
- Every local-nav link lands its chapter below both bars.

### 4.5 Blog

**Index (`/blog/`), topics (`/blog/topics/…`), tag pages (`/blog/tags/<tag>/`) and series pages (`/blog/series/…`)**
- **Hero:** eyebrow "Blog", **H1** *"Notes on data and tools."*, subhead (i18n). Tag page: H1 "#<tag>", subhead "<n> posts". Series page: H1 the series title, subhead "<x> of <y> published", then the series description. Topic page: eyebrow "Topics", H1 the topic title, then the topic intro (plain text, from the `topics` body, §6.9).
- **Local nav:** title "Blog"; links All posts · Topics · Series; small pill **RSS**. Tags are not in the local nav; the footer "Writing" column links to `/blog/tags/`.
- **Index:** a lead card (`.lead-card`, `--surface-2`, radius 32 at L, 24 below; cover square (shown whole on `--fill`; the first image is eager with `fetchpriority="high"`) radius 18 left, stacked on top at ≤ 734px; Newsroom category kicker, H2 stretched link, description, "date · reading time") for the newest post, then an H2 "More posts" (`blog.more`) and the rest as the hairline list (`.hl-list.post-rows`) in two columns at ≥ 735px (one column at S), newest first. It is not grouped by topic and has no jump links. Each series part is its own row; a standalone post is one row. Tag, topic and series pages are unchanged.
- **Row:** a square thumbnail (112px, 72px at S) and the text side by side at every width. The text is the "Part N · Series" kicker for series posts, the title (the short part title for a series part), a description (clamped to two lines, hidden below 735px) and "date · reading time". The whole row is one link, at least 44px tall. The thumbnail is `heroImage` (decorative, `alt=""`) or a generated token cover (`.post-cover`: series name or "Article" label, large part number or the title's first letter, `aria-hidden`). When any row has a `heroImageCredit`, one deduplicated "Cover art: …" line (Caption size, `--text-2`, underlined new-tab links) appears under the list.
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
- **Series box** under the header: *"Part 1 of 5 · Neovim setup guide"*, then the ordered list of all parts. The current part is bold, published parts are links, and unpublished parts are `--text-2` with a "Coming soon" chip and are not links. At S it collapses to a single "Part 1 of 5 ⌄" `<details>` line.
- **Body:** the article column (§5.2), Article body size, `--text`. Paragraphs are 1.4211em† apart. H2s in Article section size (700†) with 52 / 48 / 44px† above and 16px† below. Images and diagrams may break out to the content width.
- **Quote:** an MDX `<Quote by="…" role="…">` renders as a Newsroom pull quote (§5.10.8). **Drop cap:** with `dropcap: true` in frontmatter (§6.7), the first paragraph opens with a drop cap (§5.10.8).
- **TOC:** sticky on the right at ≥ 1280px (top offset `var(--sticky-h) + 24px`; at scroll 0 its top lines up with the category eyebrow), Caption-size links at a 26px pitch for single-line items, the current item `--text` and the rest `--text-2`, built from H2/H3, with the current section highlighted while scrolling. Below 1280px it is a collapsed `<details>` "On this page" above the body.
- **Code blocks:** Shiki with light/dark themes matching the site theme, on `--surface-2` with an 18px radius; a language label and a **Copy** button. They support a **filename title** (` ```lua title="lua/config/lazy.lua" `) as a header bar, **line highlights** (` {3-5} `) on `--fill`, and `shell`/`sh` blocks whose `$` prompt is **not copied**. At S they run to the screen edges with no radius and scroll inside.
- **Callouts:** `<Callout type="note | tip | warning">` renders as a `--surface-2` panel with an 18px radius, a 4px left accent in `--link`, an icon and a bold label ("Note", "Tip", "Warning"), with `role="note"`. Types differ by icon and label, not by colour.
- **Keys:** `<kbd>` is a small rounded keycap on `--fill`, e.g. <kbd>Space</kbd> <kbd>f</kbd> <kbd>f</kbd>.
- **Diagrams:** inline SVG components (§4.5.1).
- **End of article (Newsroom "More from"):** for a post in a series, a hairline list with the previous and next **published** parts (*"Part 0: …"* / *"Part 2: …"*, 19px/600 titles, 32px row padding); otherwise the two newest other posts. Then the footer.
- **RSS:** published parts appear like normal posts, with the title prefixed "Part N:" only when it doesn't already include it.

**Series (content)**
- A post joins a series through `series` + `seriesPart` frontmatter (§6.7). The series itself is defined in the `series` collection (§6.8), which lists **every planned part**, including unwritten ones.
- On the blog index each part is its own row; the topic and series pages nest the parts under the series row, linking to the series page.
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
- **Lineup** (Layout A, apple.com "explore all" tiles): the Home feature grid (`.tiles-2up--feature`, §5.10.3), one tile per project, featured first then `start` descending; an odd last tile spans both columns. Tile: no eyebrow, H2 title (Promo), subhead = subtitle, **See the project** (primary, accessible name "See the project: <title>", → `/projects/<slug>/`) and at most one secondary (**Repo ↗**, else **Live ↗**, else **At <company> ›** (→ `/experiences/<role-slug>/`) when `role` is set); visual = `image` in a CSS laptop frame (§5.10.13), centred under the lockup. No dates, summary, chips or expanders: the product page carries them.
  - Filtering hides non-matching tiles and the grid closes up (odd-count rule).
- **Empty state:** if a filter matches nothing (e.g. a hand-edited URL), the grid shows *"No projects here yet."* and a **Show all** button.

**Acceptance criteria (Projects)**
- **Projects** appears in the global nav after **Experiences**, on desktop and in the mobile menu, with `aria-current="page"` on `/projects/` and `/vi/projects/`.
- Adding a file to `src/content/projects/` adds a tile with no code changes. An unknown `kind` fails the schema.
- Adding a project file adds a tile and a product page with no code changes. Filtering updates the grid and the URL; Back/Forward works; `/projects/#<slug>` scrolls to that tile (resetting a hiding filter). Every project bullet from `cv.tex` appears on its product page.

#### 4.6.1 Project page (`/projects/<slug>/`)

Layout B: local nav (title · **All projects ›**); tight hero (no eyebrow, H1 title, subhead subtitle); a band with `image` in a CSS laptop frame (§5.10.13), eager, `fetchpriority="high"`; **Get the highlights.**: the big stat strip of `stats` (≤ 3; 72 / 48 / 28px), each with its footnote; **The problem.** / **The approach.** (with the terminal loop when `loop` is set) / **The design.** (`design.intro`, the diagram named by `design.diagram` (§4.5.1, `AidlcKitDiagram`: a lifecycle flow of three phases, four gates and two human sign-offs, with a six-step text alternative), then up to 4 `design.decisions` as highlight cards) / **The workflow.** (`workflow.intro`, then `workflow.steps` as numbered highlight cards; every decision and step reads **Label:** problem, choice, benefit) / **The result.** (then the bold-labelled bullets as the closer look (§5.10.14, no image: the laptop frame above shows the cover; with fewer than 2 labelled bullets, highlight cards instead)); closing **More from the work.** (All projects · Download CV, **At <company> ›** (→ the role page `/experiences/<role-slug>/`) when `role` is set); footnotes. Band tones come from the rendered sequence, alternating from the white hero (all present: image band grey, stats white, problem grey, approach white, design grey, workflow white, result grey, more white); a missing section shifts the rest (`bandTones`, §4.1.0).

All copy comes from the project file. Indexed for search as Projects.

### 4.7 404

- **Hero:** **H1** *"Page not found."*, subhead (i18n), **Go home** (primary) · **Search** (secondary, opens search). Below the actions, an illustration of a magnifying glass over an empty page (§5.10.11; 288 / 280 / 240px wide, 4:3, `notFound.art`).
- **Site index** (§5.10.10) on a `--surface-2` section: **Explore** (elevated links: Experiences · Projects · Skills · STAR stories · Blog), **Latest writing** (the 3 newest posts), **Connect** (Email · LinkedIn · GitHub · Download CV). Then the footer.
- Acceptance: every index link resolves to a 200 page; the first group's links are 28px at 1440 and 21px at 375.

### 4.8 Skills (`/skills/`)

- Apple Tech Specs (Layout B). A tight hero (no eyebrow, H1 *"The tools I build with."*, subhead *"From ingestion to data quality, on AWS and Azure."*), then one `--surface-2` band holding the rows in `--content`: one per `skills` entry in `order`, then **Certifications** (name; issuer · year; **Verify ›** when `credentialUrl` is set) and **Languages** (`profile.spokenLanguages`).
- Each row: the name (H2, Card headline size) in a `flex: 1 1 220px` label column, then the description (Body-reduced 14px, `--text-2`) and the items in an `auto-fill, minmax(200px, 1fr)` grid (17/600; children as a 14px `--text-2` line below). 1px `--border` hairlines above every row and below the last; rows are padded 32px; the columns stack when they no longer fit.
- No icons, chips or cards. Not in the search index. Every skill, certification and language from `cv.tex` appears here.

## 5. Design system

The site follows **apple.com** as closely as a text-only portfolio can. Values marked † were measured from apple.com's live CSS (October 2026: the global nav, local nav, footer, homepage, iPhone, MacBook Pro and Newsroom stylesheets). Unmarked values are this site's own choices in the same spirit. Everything here applies to every web page; the print/PDF layout (§4.3) keeps its own styles.

### 5.1 Principles

- **White first.** White pages, Apple's light grey `#F5F5F7` for alternate bands, near-black text, blue only for things you can act on; and four position colours for the highlight-card numbers (§5.3). No band or card is black in the light theme. No gradient backgrounds, glows or pastel surfaces; the one exception is a single gradient-text phrase per page, as Apple does† (§5.10.8).
- **One idea per section.** A short headline, one subhead, at most two actions. Detail lives one click deeper.
- **Big type, few weights.** Headlines are 600 (700 only in the Newsroom-style blog post and tiles†); body is 400. Hierarchy comes from size and space, not colour or decoration.
- **Space from padding.** Sections touch (inner pages) or sit 12px apart (Home units); no cards with shadows, no borders around sections.
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
| `--content-wide` | min(87.5%, 1260px)† | 87.5% | 87.5% | Card grids, skill grid, sticky storytelling |
| `--article` | 653px† | 576px† | 87.5%† | Blog post body |
| `--chrome` | 980px† **content** width with 22px† padding outside it (1024px outer, the same as the global nav row) | same | 100% | Nav, local-nav, footer and search-panel rows; their first glyphs line up at x = 230 at 1440 and 22 at 900 |

- **Gutters:** nav and footer rows use 22px† side padding (16px† at compact chrome). Content columns are centred by width, so the 87.5% at S leaves about 23px on each side of a 375px screen.
- **Safe areas:** with `viewport-fit=cover`, side padding is `max(<gutter>, env(safe-area-inset-left/right))` and the footer adds `env(safe-area-inset-bottom)`.
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
| `--keyline` | `rgba(0,0,0,.16)`† | `rgba(255,255,255,.24)`† | Bottom line of the nav bars |
| `--accent` | `#0053A6` | `#5CB0FF` | Primary pill fill (text `--on-accent`), focus ring, current career-rail bar, highlighted graph bar |
| `--accent-hover` / `--accent-active` | `#0056AD` / `#004C98` | `#6DB8FF` / `#4BA8FF` | Primary pill states (each ≥ 7:1 with `--on-accent`) |
| `--link` | `#00509F` | `#5CB0FF` | Text links, chevron links, secondary pill |
| `--on-link` | `#FFFFFF` | `#000000` | Text on a `--link` fill (secondary pill hover); 7.93:1 light, 9.11:1 dark |
| `--on-accent` | `#FFFFFF` | `#000000` | Text on an `--accent` fill (primary pill); white 7.53:1, black 9.11:1 |
| `--nav-glass` | `rgba(250,250,252,.8)`† | `rgba(22,22,23,.8)`† | Global and local nav, with blur |
| `--nav-solid` | `#FAFAFC`† | `#161617`† | Mobile menu and search panel; `.92` opacity fallback when blur is not supported† |
| `--curtain` | `rgba(232,232,237,.4)`† | `rgba(0,0,0,.4)` | Blurred page curtain behind the search panel |
| `--mint-tint` | `#A8E6CF` @ 35% | `#A8E6CF` @ 12% | **Only** tech highlights, tech chips and the "Current" chip |
| `--hl-1` … `--hl-4` | `#0B5D52` / `#8C3800` / `#6136AD` / `#A01549` | `#64D2B4` / `#FFA24D` / `#C9A7FF` / `#FF8FB3` | **Only** the big value on the Home highlight stat cards, by position, cycling every four; never a surface |

- **Bands and cards:** sections alternate `--bg` and `--surface-2`. Cards and tiles take the **opposite** colour of the band they sit on. No shadows and no borders on cards, tiles or sections. No band or card sets `color-scheme: dark`; the featured-story stat card sets `color-scheme: light` and stays white in both themes.
- The old `--sky-*`, `--butter-*` and `--mint-ink` tokens and the hero glow are removed. Mint survives only in the three uses above, never on anything larger than a chip.
- Every text token reaches **7:1** (WCAG AAA) on the backgrounds it is used on, in both themes. The blues reach 7:1 too: `--link` and `--hl-*` on `--bg`/`--surface-2`, `--on-accent` on every `--accent` state and `--on-link` on `--link`. Two exceptions stay at least **4.5:1**: `--ft-pipe` (separator glyphs) and `--text-2` on `--fill`. Large text and UI keep at least 3:1. Checked by `tests/unit/contrast.test.ts` (rgba tokens composited over their band) and by axe in CI.

### 5.4 Typography

- **Font stack** everywhere, including blog bodies: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", "Inter Variable", "Inter Fallback", Helvetica, Arial, sans-serif`. "Inter Fallback" is Arial scaled to Inter's metrics, so the swap does not shift the layout. Apple devices render SF Pro (Text below 20px, Display at 20px and up†) with no download. Self-hosted Inter (Latin + Vietnamese subsets, `font-display: swap`) is the fallback elsewhere and is **not preloaded**, so Apple devices never fetch it. Newsreader is removed. No third-party font requests.
- `-webkit-font-smoothing: antialiased; font-synthesis: none`†. The root font size stays 100% (Apple's 106.25% root is not copied, so Tailwind spacing stays predictable); sizes below are in px for clarity and written in rem in CSS.
- **Apple sizes (v5.0):** every size is apple.com's, so the v4.x +2px and the larger M/L headlines are reverted. The one exception is the page hero, which is **96px at L** as in Layout A (64 / 40 at M / S). At S the headlines stay 40 / 32 / 32 / 32, so 320px with 200% text reflows. Display headlines track slightly tighter at M and L (Hero -0.022em, Unit -0.012em, Section -0.009em, Promo -0.005em); S keeps Apple's tracking. STAR story titles stay 80 / 64 (§D.4). Local-nav links between 834px and 1068px keep a 10px gap (24px elsewhere). Compact-chrome sizes are unchanged (local-nav title 19px, small pill 12px, solo link 17px).
- **Code:** `ui-monospace, "SF Mono", Menlo, monospace`, 0.9em.

| Role | L | M | S | Line-height | Tracking | Weight |
|---|---|---|---|---|---|---|
| **Hero** (page H1) | 96 (Layout A) | 64† | 40† | 1.05† | -0.022em (M, L) / -0.015em† (S) | 600 |
| **Unit headline** (Home full-unit H2) | 56† | 48† | 32† | 1.0714† | -0.012em (M, L) / -0.005em† (S) | 600 |
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
- **Section padding** (`--section-pad`, top and bottom): **120px / 80px / 56px** at L / M / S† (Apple's "reduced" section padding). Inner-page heroes (Projects, STAR, Blog) use **80 / 64 / 48px** below them (Appendix D), so the first section is in the first viewport. The page hero uses **144px / 120px / 112px**† on top and `--section-pad` below.
- **Section header → content:** 48px / 40px / 32px†.
- **Inside a header:** eyebrow → headline 8px; headline → subhead 6px†; subhead → actions 17px†; gap between actions 17px†.
- **Radius:** Home units and grid tiles **0** (square, as on the Apple homepage†); cards **28px**†; images, code blocks and callouts **18px**†; chips and pills **980px**†; inputs 12px. Tokens: `--radius-sm` 12, `--radius-md` 18, `--radius-lg` 28, `--radius-pill` 980.
- **Depth:** none. No shadows anywhere, including the search panel and mobile menu; the curtain and solid panels separate them†.

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

- **Bar:** **44px**† tall (**48px**† at compact chrome). On pages **without** a local nav (Home, 404) it is sticky at the top. On pages **with** a local nav it scrolls away with the page and the local nav sticks at `top: 0` instead, as on Apple product pages† (`#globalnav { position: absolute }`†), so only 48–52px of chrome stays on screen.
- **Background:** at scroll 0 the bar matches the page (`transparent`, no blur†); once content scrolls under it, it becomes `--nav-glass` with `backdrop-filter: saturate(180%) blur(20px)`†, transitioning `background .24s var(--ease)`†. Implemented with a CSS scroll timeline (`animation-timeline: scroll(root); animation-range: 0 1px`) under `@supports`; without support it is always glass. `--nav-solid` at .92 opacity when blur is not supported†. While the search panel or the mobile menu is open the bar is solid `--nav-solid`.
- `--nav-h` holds the bar height. `--sticky-h` is the height of whatever is stuck at the top: `--nav-h` on pages without a local nav, `--local-h` on pages with one. Every sticky offset and scroll margin uses `--sticky-h`; none hard-code a number.
- **Row (above compact chrome):** the `--chrome` row (1024px† outer), items spread with `justify-content: space-between`†: **brand** (the name, 14px/600) · Experiences · Projects · STAR · Blog · **search** · **theme** · **language**. Links are Caption size, `0 8px`† padding, full bar height, coloured `--nav-ink` (`rgba(0,0,0,.8)`† / dark `rgba(255,255,255,.8)`†) and `--nav-ink-hover` (`#000` / `#fff`†) on hover and for `aria-current="page"`, with `color .32s var(--ease-nav)`†. Dim with colour, never `opacity`, so focus rings stay full strength. Focus rings inside both bars use `outline-offset: -7px`† so they are never clipped.
- **Search panel** (Apple's search flyout): the search icon, ⌘K / Ctrl+K or `/` opens a panel that drops down from under the bar, full width, `--nav-solid`, no shadow, with the page behind it covered by `--curtain` and `blur(20px)`†.
  - Inside, in the `--chrome` row: a 20px search glyph in `--text-2` (`--text` while focused) and, 8px after it, the input at 24px/600† (28px† at compact chrome; never below 16px, so iOS does not zoom). **No ring or box around the field**†: the caret and the darkened glyph mark focus. 32px† top and 80px† bottom padding.
  - Before you type, **Quick links** (12px/600†, 17px/600† at compact chrome, `#333336`† / dark `#E8E8ED`, each with a → arrow 11px† before the text, 14px† at compact; padding 4px 8px†, radius 5px†, 4px† apart; hover/focus background `--surface-2`†): Experiences, Projects, Download CV, the newest post. At compact chrome each quick link is at least 44px tall.
  - Results (Pagefind) start 32px† (49px† at compact) below the field: type (Blog / STAR / Experiences / Projects), title and highlighted excerpt. Result counts use correct plurals ("1 result", "2 results").
  - **Motion**†: the panel reveals over 240ms `--ease-nav` (`clip-path: inset(0 0 100% 0) → inset(0)`), the field fades in from `translateY(-4px)` (−8px at compact) over 240ms, 200ms delayed, quick links follow 20ms apart, and the curtain fades `opacity .32s var(--ease-nav) 80ms`. None under reduced motion.
  - It is a modal dialog: focus moves to the input on open and **stays inside the panel** (Tab and Shift+Tab cycle through the field, quick links, results and close button). Esc, the curtain or the trigger closes it and returns focus to the trigger. The ✕ button shows only at compact chrome or with a coarse pointer. The browser's own clear button on `type="search"` is hidden (`::-webkit-search-cancel-button { appearance: none }`). The Pagefind script loads on first open.
- **Mobile menu (compact chrome):**
  - The bar shows the brand on the left, then **search** and the **menu button** on the right. Theme and language move into the menu. The menu button is 48 × 48px†, flush with the right edge (`margin-inline-end: calc(-1 * var(--gutter))`, safe area respected).
  - **Menu button:** two 1px lines that morph into an **✕** (each rotates ±45°, 240ms†, `--ease-nav`). It has `aria-expanded`, `aria-controls="mobile-menu"` and a label that switches between "Menu" and "Close" (i18n).
  - **Panel:** fixed below the bar, `height: calc(100dvh - var(--nav-h))` (100vh fallback), `--nav-solid`, scrolling on its own, 4px top padding so the first link starts right under the bar†. Links are stacked and left-aligned at **28px/600**† with 48px† side padding and a 46px† pitch: Experiences · Projects · STAR · Blog, in `#333336`† (dark `#E8E8ED`†), `--text` on hover. **No current-page colour** (Apple shows none†); `aria-current="page"` still marks it. Then a group label in 17px† `--text-2` ("More") and three 17px/600† rows in the same ink, each at least 44px tall, sharing one style: **Theme: Light** (the three-state toggle, §5.12), **Language: Tiếng Việt / English** (keeps the current page), **Download CV**.
  - **Motion:** the panel fades in over 240ms†; links fade in from `translateY(-4px)`† over 320ms†, staggered 20ms†. Closing: items go `translateY(-8px)` and fade over 200ms†, no stagger. No animation under reduced motion.
  - **While open:** page scroll is locked (keeping the position), `main` and the footer are `inert`, focus moves to the first link and stays inside the bar and the panel, and the bar turns solid `--nav-solid`.
  - **Closing:** the ✕, Esc, tapping any link (including a same-page anchor) or resizing past compact chrome. Focus returns to the menu button. Changing theme or language does not close it.
  - **Without JavaScript:** the menu button is hidden and the four links show as a horizontally scrolling row in the bar (`html:not(.js)`).

### 5.8 Local nav

Every inner page and Home have one (§4.0); 404 does not.

- **Bar:** directly under the global nav at the top of the page, above the hero, as on Apple product pages; it becomes **sticky at `top: 0`** once the global nav has scrolled away (§5.7). **52px**† tall (**48px**† at compact chrome); `--local-h` holds its height.
- **Background:** transparent at rest†, glass (`--nav-glass` + blur) once stuck†, with the same scroll-timeline technique and fallback as §5.7. The 1px `--keyline` bottom line is **980px wide and centred at rest**† and **full width once stuck**† (always full width at compact chrome†).
- **Row:** the `--chrome` row, aligned with the global nav (§5.2), 16px side padding at compact chrome.
  - **Left:** the page title at 21px/600/0.011em† (19px† at compact chrome).
  - **Right:** the section links in Caption size, coloured `--nav-ink` / `--nav-ink-hover` as §5.7, 24px† apart, and then the optional **small pill** (§5.6). The links are right-aligned with `margin-inline-start: auto` on the first item and **must fit at L and M**†; labels are kept short (Experiences uses the company's `shortName`, §4.2.0). If they still don't fit, they scroll horizontally inside the bar with a trailing fade (removed while a link has focus).
  - **Current marker**: where a link has `aria-current` (the Projects kind filter, Blog All posts / Series / Tags on their own pages), it is full-strength ink with a 1px `currentColor` rule at 80% opacity on the bar's bottom edge†. Anchor links on Experiences and STAR never show one (no scroll-spy).
  - The title and links **shrink and truncate** (`min-width: 0`, `text-overflow: ellipsis` on the title) rather than overflow, so the bar never causes horizontal page scroll (checked on every inner route in EN and VI at 320px).
- **Compact chrome: title + chevron dropdown** (as on Apple product pages on iPhone†):
  - The bar shows the title on the left, then the **chevron on the right next to the small pill**† (16 × 9px, stroke 1.2px†, 80% opacity†). The links row is hidden.
  - The dropdown is a native **`<details>`**: the `<summary>` spans the title and chevron (`flex: 1; justify-content: space-between`), so the whole area is the tap target; accessible name e.g. "Experiences, sections". The chevron rotates 180° when open.
  - **One surface:** when open, the bar and the tray share one solid `--nav-solid` background (no glass, so page text never shows through), with one `--keyline` under the tray. The tray is at most `60dvh` tall and scrolls inside, padding 16px 16px 20px. Links are **14px/-0.02em**†, `--nav-ink`, in **44px** rows (Apple uses 34px†; 44px keeps the tap-target rule), indented 16px; the current item is full ink with a **1.2 × 12px vertical bar 16px before it**† (no ✓).
  - **Motion**†: the tray reveals over 320ms `--ease-nav` (clip-path), its links fade from `translateY(-4px)` over 320ms with delays of 260ms + 20ms per link; the bar background returns 240ms after closing. None under reduced motion.
  - It closes on a link tap (then jumps to the anchor), the summary, Esc, a tap outside, or 40px of page scroll. Without JavaScript the `<details>` still opens and its links work.
  - Pages with a single link (blog post, STAR story) show no chevron; the link sits on the right as a chevron text link ("All posts ›"), and the title truncates to make room.
- **Script:** one shared helper of at most 1 KB gzipped: scroll a keyboard-focused link fully into view, and the dropdown's close rules. No scroll-spy.
- Hidden in print.

### 5.9 Footer

The same footer on every page, modelled on Apple's global footer†. It sits flush under the last section. On a page shorter than the viewport it sits at the bottom of the viewport instead, with `--bg` filling the space above it: on screen only, the body is a `min-height: 100dvh` flex column and the footer takes `margin-top: auto` (no fixed positioning, no JS). The band (background and any top line) spans the full viewport width; the content keeps the 980px column.

- `--surface-2` background, Caption size (12px/1.3334†). Colours: text `--ft-text` (`rgba(0,0,0,.68)` / dark `rgba(255,255,255,.66)`), links `--ft-link` (`rgba(0,0,0,.8)` / dark `.8`) with no underline (underline on hover), column titles `--ft-title` (`rgba(0,0,0,.88)`† / dark `.92`†), pipes and separators `--ft-pipe` (`rgba(0,0,0,.56)` / dark `rgba(255,255,255,.48)`). Content row `--chrome` (§5.2; the 980px content edge, while the band itself is full-bleed), plus the bottom safe area. When the last page band is also `--surface-2`, a 1px `--border` line sits above the footer.
- **Density:** at compact chrome every footer link is at least 44px tall. Above compact chrome (pointer layouts) the footer uses Apple's density†: a 25.6px link pitch (16px line + 0.8em†), which meets WCAG 2.2 SC 2.5.8 target spacing (§9).
- **1. Breadcrumbs** (every page except Home): a home link (the brand initials "RP"), then 6 × 11px chevron separators in `--ft-pipe` with 11px† after them and items 7px† apart, the current section and the current page, e.g. *RP › Blog › Neovim setup guide, Part 1*; 17px† vertical padding (about 56px† tall). **No hairline under it** above compact chrome†; one hairline at compact chrome†.
- **2. Directory:** four columns (25% each†), each with a 600-weight `--ft-title` title and 0.8em† below it:
  - **Explore:** Experiences · Projects · Skills · STAR stories · Blog
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
3. **Hero** (all pages except Experiences): a `--bg` section with centred content in `--content`: eyebrow (the page name), **H1** in Hero size, one subhead (at most 120 characters), and at most two actions. Hero padding as §5.5. The blog post uses its Newsroom header instead (§4.5).
4. **Content:** full sections (inner pages) or units and tile grids (Home, and the grids on Projects and Blog).
5. Optional **closing section**: H2 in Section headline size, subhead, at most two actions.
6. **Footer** (§5.9), flush.

#### 5.10.2 Full sections and Home units

- **Full section** (inner pages): a `<section>` whose background spans the viewport width, `--section-pad` top and bottom, content in `--content` (or `--content-wide` for grids). Sections **touch**; their backgrounds alternate `--surface-2` / `--bg`.
- **Peek rule:** at 1440 × 900 and 375 × 812, the first viewport shows at least 64px of the next band on every page, including the STAR story page (reduce its hero padding rather than relax the rule), so every page invites scrolling (Appendix D, whose wireframes are illustrative; this rule and §4 win).
- **Tiles in a row** align their headlines to the same top (±2px), and the hero stat values sit on one baseline.

#### 5.10.3 Tile grid

Used on Projects and the Blog pages.

- A CSS grid of `--surface-2` tiles on a `--bg` band: 2 columns (`1fr 1fr`†) with a **12px**† gap and 12px† side padding at M and L, spanning the **full viewport width**; at S, 1 column, **no side padding**†, still with 12px gaps.
- Tiles are **square** (no radius†) and centre their content both ways. On Home, the **feature grid** (`.tiles-2up--feature`, Layout A) has min-heights **600 / 560 / 500px** at L / M / S and padding 52/40 · 44/32 · 40/24, and each tile carries a large code-built visual: `grid-tile--bleed` puts it flush on the bottom edge, `grid-tile--fill` centres it under the lockup; on Projects and Blog, the min-height is 300px at L and auto below, because those tiles hold more text.
- Tiles in a row have equal heights. With an odd number of tiles, the last one spans both columns. A full-width tile (Blog feature, expanded project) spans both columns.
- **Hover** (pointer devices only): the tile background darkens by 2% over 344ms†. No scale, so the grid never jitters.
- **Newsroom variant** (Blog "Other posts", series and tag grids†): rounded `--bg` tiles on a `--surface-2` band in `--content` (980px†), radius **32px**† (24px† at M and S), padding 32 / 24 / 24px†, gaps **36px**† (L) / 24px† (M), 1 column at S. Content: Newsroom category (§5.4), 12px† below it the Newsroom tile title, then the description and the timestamp (date · reading time, 14/600 `--text-2`, 16px† above). The whole tile is one link (a stretched `::after` on the title link), with the hover lift (§5.6) and a 3px-offset focus ring.

#### 5.10.4 Section header and card

- **Section header**, two variants:
  - **Start-aligned** (inner-page sections: the Experiences highlights header and chapter headers below L, STAR chapter headers, Blog "More posts", series and tag pages)†: `display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 20px 120px`†, the lockup (eyebrow, H2, subhead) at most 75% / at least 50% wide† on the left and the chevron CTA on the right on the baseline (`padding-bottom: 4px`†), within `--content-wide`; at S it stacks (`flex-direction: column; gap: 16px`†). DOM order is lockup then CTA.
  - **Centred** (heroes, Home units, closing sections): centred in `--content`: eyebrow, H2 (Section headline, or Unit headline on Home), subhead in `--text-2` (or Lockup copy), then actions. 48 / 40 / 32px† to the content below. At S, a header (or Home unit lockup) whose copy is longer than 120 characters gets `.lockup--long` at build time and is start-aligned as a whole (eyebrow, heading, copy, actions), as Apple's `small-uncentered`†; shorter ones stay centred.
- **Card:** **28px**† radius, padding 28px† (24px at S), the opposite colour of its band, no shadow or border. Content is left-aligned: H3 in Card headline size, then the body (Body at M and L, Body-reduced at S†). Cards in a grid have a 16px gap and equal heights per row.

#### 5.10.5 Stat lockup and stat strip

- A **stat lockup** is Apple's `figure.stat`†: an optional short caption above (≤ 2 words: "Up to", "Led", "Cut"), the value, and a caption below, in reading order: `<li class="stat"><span class="stat-cap">Cut</span><span class="stat-value">&gt;50%</span><span class="stat-cap">EMR costs</span></li>`. Values use the Stat value sizes (§5.4), captions Body-reduced (14px / 1.2858 / -0.016em†); value and captions are both `--text`† (size does the work). No `aria-label` on the value.
- A **stat strip** is a `<ul aria-label="At a glance">` of 1–3 lockups, separated by 1px `--border` hairlines. At S, when every value is at most 5 characters, the strip stays **3 across** (`.stat-strip--compact`, set at build time; captions wrap to at most 2 lines, `text-wrap: balance`); otherwise the lockups stack with hairlines between them.
- Only the hero strip is numbers-only (§4.1); other strips, such as Home `#story`, may show word values like "unchanged".
- A **big** strip (`.stat-strip--big`, the Home Experiences tile) drops the hairlines and uses values 72 / 48px at L / M (28px at S).
- A **super stat** (`.stat--super`) is the visual of the Home STAR tile and the STAR story page: value **80px**† / 64 / 48 at L / M / S, line-height 1, -0.015em, captions **17px**†. At most one per page. Stats never count up† (Apple reveals them with the normal fade).

#### 5.10.6 Anchors

- Every anchor target sets `scroll-margin-top: calc(var(--sticky-h) + 16px)`. Heading ids get an extra `--eyebrow-room` so the eyebrow above the heading lands visible.

#### 5.10.7 Scroll gallery ("Get the highlights.")

- A horizontally scrolling row of cards†: `<section role="region" aria-labelledby>` → `<ul role="list">`, `overflow-x: auto; scroll-snap-type: x mandatory`†, cards `scroll-snap-align: start`† (the last `start end`†), `scrollbar-width: none`†, `scroll-padding-inline` = the side gutter†.
- Inline padding `calc((100% - var(--content-wide)) / 2)`, so the first card lines up with the header and the next one **peeks** past the viewport edge†; 10px† top and 30px† bottom padding so focus rings and reveal offsets are not clipped.
- Cards: `--surface-2` on a `--bg` band, radius 28px†, width **372 / 344 / 260px**†, padding 32 / 28 / 24px†, **20px**† gap, equal heights, hover lift (§5.6).
- Stat cards (`StatCard`) colour only their big value, by `:nth-child(4n+k)` → `--hl-k`, so any number of cards cycles. Surfaces stay `--bg`.
- With **3 cards or fewer** at L, the cards share the row width and do not scroll†, and the paddles are hidden.
- **Paddles** (§5.6): two buttons below the gallery, end-aligned in `--content-wide`, 18px† apart, `aria-label` "Previous highlights" / "Next highlights" by default (the `prevLabel` / `nextLabel` props name them per gallery, e.g. "Previous posts" / "Next posts" on Home `#writing`), `aria-controls` the list. A click scrolls by the visible cards' width (`behavior: smooth`, `auto` under reduced motion); an IntersectionObserver (threshold .95) on the first and last cards toggles `disabled`. Script `gallery.ts` ≤ 0.8 KB gzipped, loaded only on pages with a gallery; paddles start `hidden` and the script reveals them.
- **JS off:** no paddles; native swipe, scroll and snap work and every link is in the tab order. Tabbing into a card scrolls it fully into view.

#### 5.10.8 Gradient text, quote and drop cap

- **Gradient text** (Apple's swipe†): at most **one** `.text-gradient` per page, currently only the Home hero H1. Colours: light `#00509F → #0B5D52`, dark `#5CB0FF → #64D2B4` (every stop ≥ 7:1 on `--bg` and `--surface-2`). `background-clip: text`, `background-size: 300% 100%`†; under `prefers-reduced-motion: no-preference` it starts as solid `--text` and the gradient sweeps in once, **3.5s linear**† after a 300ms delay, `fill-mode: both`. The static end state (the gradient) is what reduced motion and JS-off see. Forced colours and print fall back to solid text; browsers without `background-clip: text` show `--text`.
- **Quote** (Newsroom†): `<figure class="quote"><blockquote>…</blockquote><figcaption>Name <span>Role</span></figcaption></figure>`, Quote size (§5.4); the opening mark hangs outside the text (`::before { display: inline-block; width: 2em; margin-inline-start: -2em; text-align: end; content: open-quote }`†), and the closing mark appears only after the last paragraph†. Credit 17/600 at 1.6em above†, role 17/400. A **reduced** variant (32 / 28 / 24px†) is used for the STAR story question.
- **Drop cap** (Newsroom `.dropcaps`†, opt-in per post): the first paragraph's `::first-letter` is **84px/600**† (48px† at S), `float: inline-start`, line-height 1, 8px† (5px† at S) space after it.

#### 5.10.9 Graph bars

- For a STAR metric with `compare` values (§6.6): one bar per entry next to the stat lockup, in a `1fr auto` grid with a 90px† column gap (72px† stat column and 20px† gap at S) and 48 / 32 / 20px† row gaps.
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
- Meaningful shapes (steps, baselines, ticks, page outline) use `--text-2` or `--link` so they reach 3:1 against the page (WCAG 1.4.11); `--fill` and `--border` are for decoration only, never for a shape needed to read the image. Widths: closing 480 / 400 / 280, STAR steps 360 / 360 / 280, 404 256 / 256 / 240 (kept small, with a tight hero, so the 404 fits 1440×1600 with Inter too).
- Content images (project covers) are `<img>` files with their own dark panel, and their alt comes from content (§6.4 `imageAlt`).

#### 5.10.12 Footnotes

- Apple-style qualifiers: a superscript link after the claim's caption (`<sup class="fn-ref"><a id="fnref-N" href="#fn-N" aria-label="Footnote N">N</a></sup>`, never inside the value) to an ordered list in a `--surface-2` small-print band at the end of `main` (`section.footnotes`, sr-only H2 "Footnotes", Caption 12px `--text-2`), each item with a ↩ back link.
- Ref and back links have 44px tap areas. Notes come only from content fields (`yearsOfExperienceNote`, `note`) and restate context already in the content; a claim without such context has no footnote.

#### 5.10.13 Device frame, terminal panes and terminal loop

- CSS frames (`DeviceFrame.astro`): a `#1D1D1F` bezel made of padding and a token fill (no border, no shadow), 16:9 screen; `laptop` adds a `--border` base and radius 28 (18 under 480px); `screen` is the bare 18px bezel. No device art is copied.
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
| 2 | **Hero intro** | Page heroes and the Home hero | See effect 1: eyebrow → subhead → copy → actions → stats, 150ms† apart, CSS only. |
| 3 | **Hero fades on scroll** | The hero content on every page (M and L only) | Scroll-linked: as the hero leaves the viewport, its content goes `opacity 1 → 0`, `scale(1) → 0.94` and `translateY(0) → -40px` (`animation-range: exit 0% exit 80%`). The background stays. No JS. |
| 4 | **Sticky storytelling** | Role pages (§4.2.3) and the STAR story stage (§4.4), **L only** | Two columns in `--content-wide`: the chapter header (left 40%, left-aligned, `position: sticky; top: calc(var(--sticky-h) + 32px)`) and the cards (right 60%, one column, 16px gap, each with effect 1). The header un-sticks when the chapter ends. Pure CSS, applied only with `prefers-reduced-motion: no-preference` and JavaScript on (`html.js`); otherwise the chapter is stacked and fully visible. |

The terminal loop (§5.10.13) is the one looping animation; it animates `translate` only and has a pause control.

- **List link-in**† (mobile menu, local-nav dropdown, site index): `opacity 0 → 1`, `translateY(-4px) → 0`, 320ms ease†, delay 200ms + 80ms per group + 20ms per link†.
- **At S**, effects 1 and 2 run with the same values (Apple has no small-screen override†) but at most 3 stagger steps; effect 3 lives inside `@media (min-width: 735px)` and effect 4 inside `(min-width: 1069px)`.
- **Reduced motion:** `prefers-reduced-motion: reduce` turns every effect, transition and menu animation off†; everything shows immediately and static.
- No animation libraries.
- **Page transitions:** every page opts into cross-document view transitions (root cross-fade, browser default timing) inside `@media (prefers-reduced-motion: no-preference)`; browsers without support (Firefox) navigate normally; Astro's `ClientRouter` is not used.

### 5.12 Theme and dark mode

- **Light is the default**, whatever the OS setting. The toggle cycles **Light → Dark → System** and stores `theme = light | dark | system` in `localStorage` (try/catch); `prefers-color-scheme` is used only for System.
- A small inline script in `<head>` sets `data-theme` before first paint, so the page never flashes.
- Shiki uses a dual theme (e.g. `github-light` / `github-dark`) switched with CSS variables.
- Dark mode uses the dark column in §5.3; nothing else changes.
- Print and the PDF always use the light theme.

### 5.13 Small screens (S and compact chrome)

The per-component rules above already cover phones. These apply everywhere at S:

- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`; pinch zoom is never disabled.
- Every tap target is at least **44 × 44px** with at least 8px between neighbours, including in-page text links such as "View in experiences ›" (pad them to 44px tall). Long tokens (chips, URLs) never break mid-word: `overflow-wrap: anywhere` applies only to card bodies, article prose, and headings, subheads, intro, lockup and eyebrow text outside cards (it breaks only a word wider than the line, WCAG 1.4.10), never to `body`, and chips use `white-space: nowrap`.
- Grids and card lists are one column; Home units and grid tiles run edge to edge.
- Motion as §5.11 (no scroll-linked effects). Only one bar is stuck at a time: the global nav (48px) on 404, the local nav (48px) elsewhere.
- Code blocks run to the screen edges and scroll inside; the copy button stays visible.
- Images keep their aspect ratio with `width`/`height` set (CLS 0) and fill the content width.
- No image or font is loaded only for phones. The mobile menu and local-nav scripts together add at most 1.5 KB gzipped, inside the §9 JS budget.

### 5.14 Copy style (Apple voice)

- **Headlines:** short, declarative, sentence case, ending with a period, at most 6 words: *"Stories from the work."*, *"Let's talk."* Names and titles used as headlines (the name, a role title, a post title) keep their own form.
- **Eyebrows** name the topic or page ("Experiences", "STAR story"), never a sentence.
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
- **Motion:** with reduced motion, no element has a non-identity transform or opacity < 1 after load. At 375px, no element in `main` has a scroll-driven animation (the nav bars' 1px scroll-timeline background switch, §5.7–§5.8, is a state change, not motion, and runs at every width). No `.card` or story card has an `animation-timeline` other than `auto`. A revealed 3-item group is fully visible 1.6s after entering view, with item 2's delay 150ms. No hero H1 has a running animation at `domcontentloaded`. Effect 3 applies only where `animation-timeline` is supported and falls back cleanly (Chromium and WebKit). The built CSS holds `@view-transition { navigation: auto }` only inside a `prefers-reduced-motion: no-preference` media rule. Effect 4: at 1440px the role chapter header and the story stage header keep the same `top` while their cards scroll and un-stick at the section end; at 900px, under reduced motion and with JS off they are stacked.
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
headline: "Senior Data Engineer & Team Lead"
tagline: "dbt, Airflow, PySpark, AWS & GitLab CI/CD"
location: "Ho Chi Minh City, Vietnam"
email: "ryanparker.p.97@gmail.com"
phone: "+84963378831"           # E.164 format, used for tel: links
phoneDisplay: "(+84) 963 378 831"
avatar: "./avatar.jpg"          # optional
yearsOfExperience: "5+"
yearsOfExperienceNote: "…"      # optional footnote (§5.10.12)
headlineMetric: "7 engineers led"  # optional; shown in the Home stat strip (§4.1.3)
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
logo: "./logos/fpt.svg"         # optional
shortName: ""                   # optional local-nav label (§4.2.0); default: client if set, else company
tech: ["Python", "PySpark", "Databricks", "Azure", "Talend", "Salesforce", "AWS", "AI agents"]
highlight: 1                    # optional; which bullet (1-based) feeds the "Get the highlights." card (§4.2.0)
```
Body: labelled achievement bullets.

```md
- **Team Leadership & Code Review:** Lead and mentor a team of **7 engineers**, owning delivery planning, …
- **ETL/ELT Migration Strategy:** Own the technical approach for migrating legacy **Talend** ETL jobs to **Databricks** on **Azure** …
```

### 6.3 `skills`

`src/content/skills/en/cloud-platform.md`

```yaml
group: "Cloud Platform"
order: 2
description: "Build AWS data lakes and warehouses on S3, Athena, Redshift and EMR, and deliver data from Databricks on Azure."   # 1–2 sentences, max 200 chars
icon: "cloud"                   # Lucide icon name
size: "1x1"                     # 1x1 | 2x1 | 2x2 — kept for compatibility; not used (§4.1.4)
tint: "sky"                     # mint | sky | butter — kept for compatibility; not used
items:
  - name: "AWS"
    children: ["EMR", "S3", "Athena", "Redshift", "Lake Formation"]   # optional
  - name: "Azure"
    children: ["Databricks"]
```
`description` and `icon` are used on Home only (`size` and `tint` are unused since Home v2). The PDF uses only `group` and `items`.

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
featured: true                  # sorted first on /projects/; the first featured project is the Home Project tile
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
logo: "logos:aws"               # optional Iconify issuer logo (@iconify-json/logos), 32px, above the eyebrow, no disc
monogram: "AWS"                 # 2–3 letters; schema-only, not rendered on the web
```
No body. Shown as type-only cards on `/experiences/` (§4.2, `CardGroup.astro`), with the optional `logo` above the eyebrow, and in the PDF. Home has no certifications tile.

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

**Competency vocabulary** (a controlled list in `src/content/competencies.ts`, so filters stay consistent): `leadership`, `ownership`, `conflict`, `failure`, `collaboration`, `influence`, `delivery`, `ambiguity`, `customer-focus`, `technical-depth`, `mentoring`, `prioritisation`. Each has EN and VI labels.

### 6.7 `blog`

`src/content/blog/en/hello-world.mdx`

```yaml
title: "Hello, world"
description: "Why I built this site and what I'll write about."
pubDate: 2026-11-01
updatedDate:                    # optional
tags: ["meta", "astro"]
heroImage: "./hero.jpg"         # optional; blog index thumbnail and the post-page hero image
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
tagline: "Five parts, from zero to a working editor."  # optional, Home Writing tile
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
- Indexes: blog posts, STAR stories (`/star/<slug>/`), the Experiences page, the Projects page (each tile is a sub-result through `data-pagefind-meta` and its `#<slug>` anchor). Excludes: `/experiences/print/`, tag index pages, 404.
- Separate indexes per language (Pagefind detects `<html lang>`).
- Results appear in the search panel (§5.7) with the page type (Blog / STAR / Experiences / Projects), title and a highlighted excerpt.
- The Pagefind script loads only when the search panel is first opened.

### 8.2 Analytics (Cloudflare Web Analytics)

- JS beacon with the site token from the env var `PUBLIC_CF_BEACON_TOKEN` (a GitHub Actions repository variable; see §11.3).
- Injected **only in production builds** and only when the token is set.
- Cookie-free, so no consent banner is required. The footer's legal row says "Privacy-friendly analytics, no cookies." (§5.9).

### 8.3 Contact

- `mailto:`, `tel:`, LinkedIn and GitHub as links in the footer's Connect column (§5.9; Contact is not on Home), plus the PDF.
- No form and no third-party scripts.

### 8.4 SEO and metadata

- Per-page `<title>`, meta description, canonical URL, Open Graph + Twitter card tags using one static default image (`public/og-default.png`, 1200×630: a white card with the name and headline in the SF/Inter stack, 600 weight).
- `@astrojs/sitemap`, `robots.txt`, JSON-LD `Person` on home/Experiences and `BlogPosting` on posts.
- `public/.nojekyll` so GitHub Pages serves `_astro/` assets.

---

## 9. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | Lighthouse (mobile) ≥ 95 for Performance, Accessibility, Best Practices, SEO on Home, Experiences, STAR, a blog post. LCP < 2.0s, CLS < 0.05, INP < 200ms. |
| JS budget | ≤ 30 KB (gzip) JS on any page before search is opened (the mobile menu and local-nav helpers count towards it). No client framework runtime (Astro islands only if truly needed). |
| Images | `astro:assets` `<Image>` with AVIF/WebP, explicit width/height, lazy-loaded below the fold. |
| Accessibility | WCAG 2.2 AA. Skip link, visible focus rings, landmarks, one H1 per page, `aria-current` in nav, 44×44px touch targets at compact chrome and on touch devices (dense pointer-layout lists such as the footer directory meet SC 2.5.8, ≥ 24px targets or spacing), works at 200% zoom and with keyboard only. |
| Browser support | Last 2 versions of Safari (macOS/iOS), Chrome, Edge, Firefox. Graceful fallback when `backdrop-filter` or `animation-timeline` is missing. |
| Responsiveness | No horizontal scroll from 320px wide upward. |
| Resilience | All content readable and every page reachable with JS disabled (search, the theme toggle and the Projects/STAR filters are the only JS-only features). |
| Privacy | No cookies, no third-party fonts, analytics beacon is the only third-party request. |

---

## 10. Project structure

```
.
├── .github/                  # workflows, composite setup action, Dependabot, PR template (§11.2)
├── public/
│   ├── .nojekyll
│   ├── favicon.svg
│   ├── og-default.png
│   └── robots.txt
├── scripts/
│   ├── build-cv-pdf.ts
│   └── setup-repo.sh         # one-time GitHub settings via gh api (§11.9)
├── src/
│   ├── components/
│   │   ├── nav/              # GlobalNav, MobileMenu, ThemeToggle, LangSwitch
│   │   ├── ui/               # PillButton, Chip, ChevronLink, Card
│   │   ├── tile/             # Section, Hero, TileGrid, Tile, SectionHeader, StatStrip, CloserLook (§5.10)
│   │   ├── localnav/         # LocalNav (bar + <details> dropdown, §5.8)
│   │   ├── footer/           # Footer, Breadcrumbs, Directory (§5.9)
│   │   ├── home/             # StoryChapter, WritingShelf, LetsTalk
│   │   ├── experiences/      # Chapter, CardGroup, ContactBox, CareerRow, HighlightsGallery
│   │   ├── cv/               # PrintSkillsTable and the print layout's own markup
│   │   ├── projects/         # ProjectGridTile
│   │   ├── star/             # StarGroup, StarCard, StarPanels, StepStage, CompetencyFilter
│   │   ├── blog/             # LeadCard, PostCard, Toc, CopyCodeButton, ReadingTime, Callout, SeriesBox, SeriesNav, SeriesCard
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
| Unit | Vitest | STAR section parser (valid / missing / out-of-order headings, VI headings), `formatCvDate()` (`YYYY` vs `YYYY-MM`, EN vs VI, empty `end` → Present), role sorting (current first, year-only dates, same company twice), company/client display, reading time, "Other / Personal" grouping, i18n `t()` and route helpers, VI→EN content fallback (`localize()`: VI used with no fallback; missing VI → EN with fallback true), tile subline clamp, tag slugging |
| CV PDF | Playwright + `pdf-lib` | `dist/cv.pdf` and `dist/vi/cv.pdf` exist, are US Letter, ≤ 2 pages, contain the name, headline, every role title, every `inPdf` project title, every skill group name, "Languages" and every certification name as text, and contain `mailto:` / `tel:` link annotations |
| E2E | Playwright | **Site frame (§5):** light default with no saved preference, theme cycles Light → Dark → System and survives reload with no flash; language switch keeps the page; global nav heights, `space-between` row and `aria-current`; search panel (⌘K, `/`, Quick links, results, Esc restores focus); mobile menu (open/close/focus trap/scroll lock/JS-off row); local nav on every inner page (links, small pill, dropdown at 375px with its close rules and JS-off `<details>`); footer breadcrumbs, directory and accordions; anchors land below both bars with eyebrows visible; type sizes at 1440 / 900 / 375; no horizontal scroll and 44px targets at 320 / 375 / 430; motion rules (§5.11) with and without reduced motion. **Home (§4.1):** section order, touching bands, one H1 that is the gradient headline (one `.text-gradient`, inside it), no hero eyebrow, hero stat strip (3 stats, numeric, footnote refs resolve), local nav (Overview · Experiences · Skills, PDF pill, `/vi/` prefix), peek rule at 1440 × 900 and 375 × 812, hero H1 not animated, no horizontal scroll at 320px, JS off, heading ids land below the nav. **Experiences (§4.2):** the Layout B hero, no summary/skills/chapters, one role card per role in sort order linking to its page (local-nav links match), certification cards newest first, 4 / 2 / 1-up columns with no image (only certification cards carry an issuer logo svg and the Education card the school logo img), education card per locale (name, NLU, logo, no year or link), the contact box (mailto, tel, LinkedIn, 44px links), white last band with no footer rule, `#<role-slug>` anchors landing on the card, peek rule, search sub-result into a role page, 320px, JS off. **Role pages (§4.2.3):** one page per role, local nav (title links to `/experiences/`), cards, tech marks and chips, no Current chip, STAR pill, sticky storytelling at 1440 and stacked at 900. **Skills (§4.8):** one row per group, certifications and languages, two columns at L, no icons or chips. **Projects (§4.6):** nav order, `?kind=` filter + Back/Forward, empty state, lineup tile (one primary, laptop-framed cover), `/projects/#<slug>` deep link, product page link. **Project page (§4.6.1):** bands, frame ratio and cover alt, stats (2 / 0 / 286, en and vi labels) and footnotes, design diagram (role=img, title, six-item text alternative, unique ids, text at least 14px from 320 to 1440, en and vi labels fit their boxes and lanes on both axes at 320 / 375 / 768 / 1024 / 1440), highlight cards and the approach band, workflow steps, terminal motion / reduced / no-JS. **STAR (§4.4):** groups, filter + `?c=` (empty groups hidden, empty state), card expand/collapse, four-panel grid layout, Expand all, story page. **Blog (§4.5):** TOC, copy button skips `$`, series box and prev/next skip unpublished parts, "1 of 5 published", diagrams switch layout between S and M, RSS valid XML. **Other:** CV PDF link returns 200 + `application/pdf`; 404 page with its site index. Mobile runs use the `iPhone 13` (WebKit) and `Pixel 7` (Chromium) device profiles plus a 320px viewport |
| Accessibility | `@axe-core/playwright` | Every route type in light **and** dark, EN **and** VI. Zero serious/critical violations |
| Visual (optional) | Playwright screenshots | Home, Experiences, Projects, STAR, post at 375 / 900 / 1440 widths (S / M / L) in both themes |
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
2. **Stories with no role:** shown in an "Other / Personal" group at the end.
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
17. **Home unit order:** Hero (+ pipeline) → Experiences (black, + stat strip) → feature grid (project · STAR story · writing · certifications).
18. **Skill descriptions:** first drafts written from `cv.tex` (Appendix A.4). Review and rewrite them in your own voice.
19. **Skill icons:** Lucide (open-source, outline style, close to SF Symbols). SF Symbols can't be used on the web under Apple's licence.
20. **Certification badges:** not shown as badge images on the web; certification cards are type-only except an optional issuer logo (Iconify svg).
21. **Experiences page:** a Layout B hero; role and certification cards and a contact box (see §4.2).
22. **Projects in the PDF:** only projects marked `featured` (override per project with `inPdf`), so the PDF stays within 2 pages.
23. **Chip colours:** kind, competency, tag and series chips are neutral grey (`--fill`); only tech chips and the "Current" chip are mint.
24. **Neovim series plan:** 5 parts. 1 Zero to a working editor · 2 Languages (LSP, completion, format, lint) · 3 Data engineering (DBT, SQL, DB UI, CloudFormation) · 4 Java with nvim-jdtls · 5 Debugging, testing and daily workflow.
25. **First post slug and tags:** `neovim-setup-1-zero-to-editor`; tags `neovim`, `dotfiles`, `macos`, `developer-tools`.
26. **"Tested with" note:** although snippets aren't linked, the post states once, at the top, the Neovim version and macOS the steps were tested against.
27. **First post date:** publish when M4 ships; `pubDate` is set on merge.
28. **Home layout:** Apple homepage units: square corners, 12px gaps, min-heights 580 / 570 / 500px; the tile grid runs edge to edge with 12px gutters (no side padding at S).
29. **Spoken languages:** the Languages row on `/skills/`, and the PDF.
30. **Skill display:** not on Home; Tech Specs rows on `/skills/` (v5.0).
31. **Certifications on Home:** a grid tile with up to 3 text cards and "+N more"; all of them on `/skills/`.
32. **Copy (EN; rewrite in your own voice, VI in `vi.json`):** Skills *"The tools I build with."* / *"From ingestion to data quality, on AWS and Azure."*; Certifications *"Certified on the platforms I use."*; Contact *"Let's talk."* / *"Open to data engineering roles and interesting data problems."*; Experiences closing *"Want the full picture?"* / *"Projects, skills and certifications are all in the PDF."*; Projects *"Things I've built."* / *"Personal, work and open-source projects."*; STAR *"Stories from the work."* / *"<n> stories across <m> roles."*; Blog *"Notes on data and tools."*; 404 *"Page not found."*
33. **Featured STAR story on Home:** one story (the newest `featured` by `date`, else the newest).
34. **Primary action label:** Home units use Apple's **Learn more** with context in the accessible name, instead of "View experiences" / "All projects" as the primary label.
35. **Experiences highlight cards:** text left-aligned inside cards (the chapter header stays centred), because the bullets are multi-line paragraphs.
36. **Breakpoints:** Apple's S ≤ 734 / M 735–1068 / L ≥ 1069, with nav, local nav and footer switching at 833px; 320px is the smallest supported width.
37. **Motion:** Apple's staggered fade (900ms / 30px / 150ms) everywhere, a CSS hero intro, and the hero exit fade (CSS `animation-timeline`, M and L, static elsewhere). No scroll-linked card scaling and no count-up numbers (Apple uses neither). No animation library.
38. **Sticky storytelling** on every Experiences chapter with ≥ 1 card, at L, so all chapters share one layout.
39. **Theme toggle order:** Light (default) → Dark → System.
40. **Local nav position:** directly under the global nav, above the hero, as on Apple product pages.
41. **Theme and language on phones:** inside the full-screen menu, not in the bar (the bar keeps brand, Search, Menu).
42. **Local-nav dropdown closes on scroll** after 40px, like apple.com. Its rows are 44px (Apple uses 34px) to keep the tap-target rule.
43. **Tech chips on phones:** at most 2 rows, then "+N".
44. **STAR filter chips on phones:** one horizontally scrolling row instead of wrapping.
45. **Code blocks on phones:** full screen width (edge to edge), scrolling inside.
46. **Search:** Apple's nav search flyout with Quick links, instead of a centred Spotlight-style modal.
47. **Footer:** Apple's global footer (breadcrumbs, four-column directory, legal row) with text links only; no social icons anywhere.
48. **Eyebrows:** `--text-2`, 600 weight (Apple), not mint.
49. **Gradient text:** one phrase per page, only the Home hero role for now (blue → deep mint, contrast-safe).
50. **Experiences opening:** a "Get the highlights." gallery of tall stat cards (years, team, the featured story, the featured project).
51. **Home stats:** numbers only (years, engineers led, the featured STAR metric); "current company" is dropped.
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
- More real STAR stories (one exists: `emr-cost-optimization`; the §6.6 example is illustrative) and blog content after the first post.
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

Shown on Home and in the PDF, not on `/experiences/`.

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

---

## Appendix D. Page composition guide

Normative for M12: how each page is composed (order, type roles, spacing, first-viewport wireframes at 1440 and 375). Where it conflicts with §4/§5, §4/§5 win. `†` = measured from apple.com. Wireframe y-coordinates were measured at Apple's headline sizes; the larger M/L headlines (§5.4) add about 17px per hero line at L, and the peek rule is enforced by the e2e suite.

### D.0 House rules (apply to every page)

1. **Two alignments, never mixed in one band.** Heroes and Home units are **centred lockups**. Inner-page sections use Apple's **start-aligned section header** (§5.10.4): headline on the left at most 75% wide, a chevron CTA on the right at the baseline, `column-gap:120px`†. Card text is always start-aligned.
2. **One spacing ladder, and nothing else:** eyebrow → headline 8; headline → subhead 6† (3† in promo tiles); subhead → actions 17† (12† in promo tiles, 11† at S); copy → callout 8–9†; header → content 48/40/32†; section padding 120/80/56; Home gaps 12†; card gaps 16 (cards) / 20 (gallery)† / 12 (tiles)†. A value not on this list is a bug.
3. **The peek rule.** At 1440×900 and at 375×812, the first viewport must show **at least 64px of the next band** (a different background), so the page invites scrolling the way Apple's homepage does (692px hero + 12px gap at 900 tall → 152px of the next unit visible). Each wireframe below states its peek.
4. **Whitespace goes above headlines and around the hero, never inside cards.** Cards use the padding in §5.10.4 and grow with their content. Bands grow only through their padding.
5. **Band transitions are colour only:** white ↔ #F5F5F7, touching, with no hairlines, shadows or dividers. A band's first element is always an eyebrow or a headline, never a chip row or a body paragraph.
6. **Singletons are compositions, not orphans.** With 1 project, 1 story and 1 post today, every "list" must have a designed n=1 state (noted per page).
7. **Measure:** headlines `text-wrap: balance`, hero H1 at most 2 lines at L, subhead at most 1 line at L (about 60 characters at 28px in 980px), body at most 68ch.

### D.1 Home (`/`)

Superseded by §4.1 (v6.0).

**Order** (spec §4.1.1): Hero (white) · Experiences (black) · 2×2 feature tiles (grey: Project, STAR, Writing, Certifications). All separated by 12px of white.

**Composition: Apple's split tile (§5.10.2).** Every unit and tile is a column with `justify-content: space-between`†: a **lockup at the top** (eyebrow, headline, subhead, pills) and a **typographic visual at the bottom**, which stands in for Apple's product image. Padding 56/63† on tall L viewports, 48/56† on L, 61/69† (tall) or 54/61† on M, 39/43† on S. Min-heights: hero 692† (L, ≥776px tall) / 650† (M, ≥734px tall) / 580 / 570 / 500†; tiles 600 / 560 / 500.

| Unit | Top lockup (roles) | Bottom visual |
|---|---|---|
| Hero (white) | eyebrow = role in gradient (21) · H1 Hero 96 · Subhead 28 · 2 pills | the four-card pipeline, 4 × 220 at L, 2 × 2 below |
| Experiences (black) | eyebrow · H2 "Five years. One focus." · subhead "<role> at <company>." · 2 pills | career rail, then the big stat strip (72px values) |
| Project tile | eyebrow "Project" · H2 Promo 40 · subhead 21† · 2 pills (See the project, All projects) | dark terminal window, 3 mono panes, 520 × 250, flush on the bottom edge |
| STAR tile | eyebrow "STAR story" · H2 Promo 40 · competencies as one sentence · 2 pills | huge `--link` figure ">50%" (`clamp(96px, 14vw, 200px)`, 700), visually hidden "Cut >50% EMR costs" |
| Writing tile | eyebrow "Writing" · H2 series title · its tagline · 2 pills (Read part N, All posts) | code-built editor window, 520 × 250, flush on the bottom edge |
| Certifications tile | eyebrow · H2 "Certified on the platforms I use." · issuers subhead | up to 3 white text cards, no logos |

**Motion:** the hero intro on load; each unit's lockup reveals as a group, and its visual as a second group 150ms after the last lockup item.

**Wireframe 1440×900** (nav transparent at rest, §5.7–§5.9):
```
y=0    ┌──────────────────────────────────────────────────────────────────────────────┐
       │ Ryan Parker     Experiences     Projects     STAR     Blog     ⌕     ☀     VI │ 44
 44    ├─ HERO unit · #FFF · min-h 692† · pad 56†/63† ─────────────────────────────────┤
100    │                          ⌖  Ho Chi Minh City, Vietnam                        │ 21/600 grey
129    │                                Ryan Parker                                   │ 96/600
221    │   Senior Data Engineer — dbt, Airflow, PySpark, AWS & GitLab CI/CD      │ 28 (gradient role)
265    │         Five years shipping data platforms for banks in two markets,         │ 21/600 grey,
       │                     now **leading a team of 7 engineers**.                   │ strong in --text
345    │                     ( Learn more )     ( Download CV )                      │ 44, gap 17†
       │                                                                              │ ← flexible space
536    │            5+          │           Led            │          Cut            │ 14
       │          years         │            7             │         >50%            │ 48/600
       │       of experience    │        engineers         │       EMR costs         │ 14
673    │                                                                              │ 63† pad
736    └──────────────────────────────────────────────────────────────────────────────┘
748    ┌─ EXPERIENCES unit · #F5F5F7 ─────────────────────────────────────────────────┐ 12† gap
804    │                                 Experiences                                  │ ← peek 152px:
833    │                    Senior Data Engineer (Team Lead).                         │   eyebrow + H2
900    ┴ (fold)
```
**Wireframe 375×812:**
```
y=0   ┌─────────────────────────────────────┐
      │ Ryan Parker                ⌕     ≡  │ 48
 48   ├─ HERO · #FFF · min-h 500† · 39†/43† ┤
 87   │ ⌖ Ho Chi Minh City, Vietnam         │ 17/600   ← start-aligned (.lockup--long:
112   │ Ryan Parker                         │ 40/600      the copy is >120 chars)
160   │ Senior Data Engineer — Data         │ 19, 3 lines
      │ Pipelines, ETL/ELT & Cloud Data     │
      │ Platforms                           │
236   │ Five years shipping data platforms  │ 19/600 grey, 3–4 lines
      │ for banks in two markets, now       │
      │ **leading a team of 7 engineers**.  │
330   │ (Learn more)  (Download CV)        │ 44, gap 14†
      │                                     │
420   │  5+     │   Led    │   Cut          │ 3-up row (§5.10.5), 28† values
      │ years   │    7     │  >50%          │ captions 14, wrap ≤2 lines
      │ of exp. │ engineers│ EMR costs      │
548   └─────────────────────────────────────┘
560   ┌─ EXPERIENCES · #F5F5F7 ─────────────┐ 12† gap  ← peek 252px:
599   │ Experiences                         │   eyebrow, H2 and subhead visible
624   │ Senior Data Engineer (Team Lead).   │ 32/600
812   ┴
```
v5.0: the wireframes above predate Layout A and Apple's v5.0 sizes; §4.1 and the e2e peek rule win.

(Without §5.10.5 the stats stack about 240px tall and the peek shrinks to about 60px, which fails the peek rule.)

**n=1 / empty:** with no STAR metric containing a digit, the STAR tile has no visual; with no post, the Writing tile shows "First post coming soon." as the H2 and the progress segments are hidden.

### D.2 Experiences (`/experiences/`)

Superseded by §4.2 (v6.0).

**Order:** local nav → hero (white) → **Get the highlights.** (grey, stat cards) → **Experience.** career row (white) → 5 chapters → featured project (black) → **Let's talk.** (grey) → footnotes (grey). The peek note measures `#highlights`.

- **Highlights band (superseded in Phase B by the stat-card gallery of §4.2.0; the card text below is historical):** padding-top **80 / 64 / 48** (it sits under 96px of bars with no hero; 120 would leave a 216px empty field), padding-bottom 80 / 64 / 48. The header is **start-aligned** at the `--content-wide` edge (§5.10.4): H2 "Get the highlights." (Section headline 48/40/32), no CTA. 48 / 40 / 32† to the gallery. Cards 372 / 344 / 260† wide, `--surface-2`, radius 28†, padding 32 / 28 / 24†: label 17/600 grey → 8† → H3 28 → 12† → body 17 grey (≤140 characters) → `margin-top:auto` → "Read the role ›" 17 link. Paddles below, end-aligned.
- **Chapter at L (sticky storytelling):** left column 40%, **start-aligned**: Current chip + date · location (Eyebrow) → H2 Section headline 48 → company (Subhead 28 grey) → 24px → **tech chips (wrapping, start-aligned) and the STAR pill**, moved here from under the cards so the sticky column stays informative while the reader scrolls the cards. Right column 60%: cards, one column, 16px gap. 80px gutter between columns.
- **Chapter at M/S:** centred header, 2-up / 1-up cards, then the chips centred (spec).
- **Rhythm:** chapters touch; the colour flip is the only divider. The current role's chapter uses the `--surface-2` band first (spec), so after the white highlights band the page reads white → grey → white …
- **Closing:** centred lockup, Section headline 48, 2 pills.

**1440×900:**
```
y=0    Ryan Parker     Experiences     Projects     STAR     Blog     ⌕   ☀   VI      44
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

### D.4 STAR (`/star/` and `/star/<slug>/`)

**Index order:** local nav (one link per role group) → hero (white) with the competency chips → role chapters (grey/white) → footer.
- **Hero:** centred; eyebrow → H1 96 "Stories from the work." → subhead "1 story across 1 role." → 24px → steps art (360 / 360 / 280) → 32 → chips (36px tall interactive chips with 44px targets, 8px gap). Bottom padding 80.
- **Chapter:** **start-aligned section header** (§5.10.4): left = eyebrow dates · H2 role (Section headline) · subhead company; right (baseline) = "View in experiences ›". 48px to the cards; "Expand all ›" above the cards, right-aligned, 12px above them.
- **Story card (n=1 today):** centred, 760px max, white on grey, radius 28†, padding 40 / 32 / 24: chips → 16 → H3 question 28 → 24 → stat lockup (card size) → 24 → plus disc bottom-right† + "Permalink ›" bottom-left on the same baseline.

**1440×900 (index):**
```
y=0    nav 44
 44    STAR stories                                                Security Bank · 2024   52
 96   ┌─ HERO · #FFF ─────────────────────────────────────────────────────────────────┐
240   │                                 STAR stories                                  │
269   │                            Stories from the work.                             │ 96
359   │                           1 story across 1 role.                              │ 28 grey
415   │                [Ownership]  [Technical depth]  [Customer focus]               │ chips
531   └─ pad-bottom 80 ───────────────────────────────────────────────────────────────┘
531   ┌─ CHAPTER · #F5F5F7 · pad-top 120 ─────────────────────────────────────────────┐
651   │ Jan 2023 – Jul 2026                                                           │ start-aligned
680   │ Data Engineer.                                          View in experiences › │ 48 + CTA at baseline
740   │ Datum / Security Bank                                                         │ 28 grey
900   ┴  (peek 369px; the card starts at ≈836)
```
**375×812 (index):** hero eyebrow 208 → H1 40 (2 lines, "Stories from the / work.") 232–316 → subhead 19 → chips as one horizontally scrolling row at 378 → pad 48 → chapter grey from 470: eyebrow 526, H2 32, company 19, "View in experiences ›" **below** the subhead (the S stack†, 16px gap†) → peek 342px.

**Story page:** local nav "Data Engineer" + "All stories ›" → hero (white, centred): eyebrow "Data Engineer · Datum / Security Bank" → H1 80 / 64 / 40 (story title, ≤2 lines; story titles keep Apple's sizes so the stepper band peeks) → 32 → reduced quote 32/28/24† with hanging marks†, figcaption "Interview question" 17/600† → pad 80. **Super stat band** (§5.10.5, white continues): one centred stat "Cut / >50% / EMR costs" at 80/64/48†, 64px below the quote. Stepper section `--surface-2`, 760px column, pad 120/80/56. Closing white: two chevron links, 24px apart.

```
1440×900:  bars 96 │ eyebrow 240 │ H1 269–437 (2 lines × 84) │ quote 469–549 (2 lines × 40) │ caption 565 │
           super stat 645–797 (caption 17 · value 80 · caption 17) │ pad 80 → grey stepper band at 877 (peek 23px:
           tighten the quote → stat gap to 48 to reach a 39px peek, or accept, because the stat is the payoff)
375×812:   bars 96 │ eyebrow 208 │ H1 232–352 (3 lines × 40) │ quote 384–456 (3 lines × 24) │ stat 500–600 │ grey at 648 (peek 164)
```

### D.5 Blog index (`/blog/`) and post (`/blog/<slug>/`)

**Index order:** local nav (All posts · Topics · Series · RSS pill) → hero (white) → lead card (newest post) → "More posts" H2 → two-column dated list → footer.
- **Hero:** centred; eyebrow "Blog" → H1 96 (2 lines at L and M) "Notes on data and tools." → subhead → pad-bottom 80.
- **Lead card:** the newest post, one wide `--surface-2` card (radius 32 at L), cover left (square, whole art, radius 18; stacked on top at ≤ 734px), right: kicker, H2 link, description, "date · min read". **More posts:** the remaining posts as a hairline list (`--border`), newest first, two columns at ≥ 735px, one at S. Each row is a 112px square thumbnail (generated token cover or `heroImage`) with the text beside it: "Part N · Series" kicker, title, description, "date · min read". At 375 the thumbnail is 72px and the description is hidden (below 735px; otherwise clamped to two lines). When any row has a `heroImageCredit`, one deduplicated "Cover art: …" line (Caption size, `--text-2`, underlined new-tab links) appears under the list.

**1440×900 (index):**
```
y=0    nav 44
 44    Blog                                  All posts  Topics  Series  (RSS)    52
 96   ┌─ HERO · #FFF ─────────────────────────────────────────────────────────────┐
240   │                                   Blog                                    │
269   │                         Notes on data and tools.                          │ 96
359   │          Field notes on pipelines, platforms and the tools I use.         │ 28 grey
      └───────────────────────────────────────────────────────────────────────────┘
      ┌─────┐  Part 5 · Neovim setup guide
      │  5  │  Debugging, testing and the daily workflow
      └─────┘  <description, max 2 lines>
               2 Nov 2026 · 12 min read
      ───────────────────────────────────────────────────────────────────────────
      ┌─────┐  Part 4 · Neovim setup guide
      │  4  │  …
      └─────┘
      … parts 3, 2, 1 (5 rows)
```

**375×812 (index):** hero eyebrow 208 → H1 40 (2 lines) → subhead 19 (2 lines) → pad 48 → rows with a 72px thumbnail beside the kicker, title and meta (no description).

**Post:** local nav (series title + "All posts ›") → **header** (white, start-aligned in the 653†/576†/87.5% column, padding-top 80 / 64 / 48): Newsroom eyebrow 12/700 uppercase grey → date 14/600, 4px† below → **20px†** → H1 48/40/32 at 700† → 16 → subhead 24/21/21 → 16 → meta line (reading time · tags) → **keyline 653px†, 1px `--border`, 44/36/32† below** (§4.5) → hero image when `heroImage` is set (480px at L, 400px at M, full column at S, radius 18, credit caption, 44/36/32 above) → series box (`--surface-2`, radius 18, padding 24) → body 19 (17 at M and S)/1.4211† with paragraph spacing 1.4211em† → H2 24 / 21 / 21, 700, with 52/48/44† above → TOC fixed right at ≥1280: `left: calc(50% + 653px/2 + 56px)`, width 248 (56px from the article), Caption 14 links at a 26px pitch for single-line items, current item `--text`, the rest `--text-2`.

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

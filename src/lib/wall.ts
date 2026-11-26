// The Home wall: twelve real screenshots of the site's own pages (home-alt-6, the Wall).
// One list feeds the capture script (scripts/capture-wall.ts), the component and the tests, so it
// has no imports and no side effects (no `~/` alias: the tsx script and Playwright read it too).
//
// Each capture is a 1280 x 800 window of the built page. With an `anchor`, the window is scrolled so
// the top of the `nth` (0-based) match of `selector` sits `offset` px below the window top; without
// one it is the top of the page. Files: src/assets/wall/<id>-<lang>-<theme>.png.

export const WALL_LANGS = ['en', 'vi'] as const;
export const WALL_THEMES = ['light', 'dark'] as const;

export interface WallShot {
  id: string;
  path: string;
  anchor?: { selector: string; nth?: number; offset: number };
}

const PROJECT = '/projects/agentic-coding-workflow/';
const ROLE = '/experiences/fpt-software-senior-data-engineer/';

/** In wall order: 4 columns x 3 rows at >= 735px, 3 x 4 below. */
export const WALL_SHOTS: readonly WallShot[] = [
  {
    id: 'nvim-diagram',
    path: '/blog/neovim-setup-1-zero-to-editor/',
    anchor: { selector: 'figure.diagram', offset: -190 },
  },
  { id: 'role-top', path: ROLE },
  { id: 'story', path: '/star/talend-databricks-migration/' },
  { id: 'blog', path: '/blog/', anchor: { selector: 'main .section--tight', offset: -96 } },
  {
    id: 'project-workflow',
    path: PROJECT,
    anchor: { selector: 'section:has(figure.diagram) + * h2', offset: -150 },
  },
  { id: 'project-diagram', path: PROJECT, anchor: { selector: 'figure.diagram', offset: -84 } },
  { id: 'star-desk', path: '/star/', anchor: { selector: '#stories', offset: -76 } },
  {
    id: 'post-code',
    path: '/blog/git-config-multiple-identities/',
    anchor: { selector: '.code-block', nth: 1, offset: -300 },
  },
  { id: 'skills', path: '/skills/', anchor: { selector: '#data-engineering', offset: -150 } },
  { id: 'role', path: ROLE, anchor: { selector: 'section.chapter', offset: -96 } },
  { id: 'project-top', path: PROJECT },
  { id: 'story-emr', path: '/star/emr-cost-optimization/' },
];

export const WALL_SIZE = { width: 1280, height: 800 } as const;

export const wallFile = (id: string, lang: string, theme: string) => `${id}-${lang}-${theme}.png`;

/** The same rule as `localePath` for these paths: English has no prefix, Vietnamese has `/vi`. */
export const wallHref = (path: string, lang: string) => (lang === 'vi' ? `/vi${path}` : path);

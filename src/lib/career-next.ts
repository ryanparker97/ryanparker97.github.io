import { localePath } from '../i18n/routes';
import type { Lang, TKey } from '../i18n';

export interface NextStep {
  id: 'architecture' | 'deployed';
  /** Content collection that holds the evidence page. */
  collection: 'star' | 'projects' | 'experience';
  /** Public route segment of that page (the experience collection lives under /experiences/). */
  route: 'star' | 'projects' | 'experiences';
  slug: string;
  eyebrow: TKey;
  title: TKey;
  text: TKey;
  link: TKey;
}

/** The "Next." cards on /experiences/, in display order. Copy lives in i18n; evidence is an existing page. */
export const NEXT_STEPS: readonly NextStep[] = [
  {
    id: 'architecture',
    collection: 'experience',
    route: 'experiences',
    slug: 'fpt-software-senior-data-engineer',
    eyebrow: 'exp.next.architecture.eyebrow',
    title: 'exp.next.architecture.title',
    text: 'exp.next.architecture.text',
    link: 'exp.next.architecture.link',
  },
  {
    id: 'deployed',
    collection: 'projects',
    route: 'projects',
    slug: 'agentic-coding-workflow',
    eyebrow: 'exp.next.deployed.eyebrow',
    title: 'exp.next.deployed.title',
    text: 'exp.next.deployed.text',
    link: 'exp.next.deployed.link',
  },
];

export const nextHref = (s: NextStep, lang: Lang) => localePath(`/${s.route}/${s.slug}/`, lang);

export interface NextMilestone {
  id: 'cert';
  /** certifications slug that holds the planned date */
  cert: string;
  /** Iconify id of the Claude product mark (not the issuer's logo); the same as the planned entry's `logo`, pinned by a test. */
  logo: string;
  eyebrow: TKey;
  title: TKey;
}

/** The dated step shown above the "Next." goal cards: a certification still to be earned. Copy lives in i18n and is pinned to the certification entry by a test. */
export const NEXT_MILESTONE: NextMilestone = {
  id: 'cert',
  cert: 'claude-certified-architect',
  logo: 'logos:claude-icon',
  eyebrow: 'exp.next.cert.eyebrow',
  title: 'exp.next.cert.title',
};

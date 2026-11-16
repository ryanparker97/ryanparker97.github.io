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

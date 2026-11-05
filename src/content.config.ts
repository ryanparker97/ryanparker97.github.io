import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { competencyKeys } from './content/competencies';
import { CV_DATE_RE } from './lib/cv';
import { skillSchema } from './lib/schemas';

const loader = (base: string, pattern = '**/*.md') =>
  glob({ pattern, base: `./src/content/${base}` });

const cvDate = z.string().regex(CV_DATE_RE, 'Use YYYY or YYYY-MM');
// Empty YAML values (`end:`) become `undefined`, meaning "Present".
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const emptyToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);
const optionalDate = z.preprocess(emptyToUndefined, cvDate.optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.url().optional());
const optionalText = z.preprocess(emptyToUndefined, z.string().optional());
const topicRef = z.preprocess(emptyToUndefined, z.string().regex(KEBAB, 'kebab-case').optional());

const profile = defineCollection({
  loader: loader('profile'),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      /** Legal name shown alongside the display name, e.g. "Tran Thanh Hai". */
      realName: optionalText,
      headline: z.string(),
      tagline: z.string(),
      location: z.string(),
      email: z.email(),
      phone: z.string().regex(/^\+\d{8,15}$/, 'E.164 format, e.g. +84963378831'),
      phoneDisplay: z.string(),
      avatar: image().optional(),
      yearsOfExperience: z.string(),
      headlineMetric: z.object({ value: z.string(), label: z.string() }).optional(),
      /** Short caption above the headline metric number, e.g. "Led" (spec §5.10.5). */
      headlineMetricPrefix: optionalText,
      socials: z.object({
        linkedin: z.url(),
        github: z.url(),
        x: optionalUrl,
        bluesky: optionalUrl,
      }),
      spokenLanguages: z.array(z.object({ language: z.string(), proficiency: z.string() })),
    }),
});

const experience = defineCollection({
  loader: loader('experience'),
  schema: ({ image }) =>
    z.object({
      company: z.string(),
      client: optionalText,
      shortName: optionalText,
      role: z.string(),
      location: z.string(),
      start: cvDate,
      end: optionalDate,
      logo: image().optional(),
      tech: z.array(z.string()).default([]),
      /** Which bullet (1-based) feeds the "Get the highlights." card (spec §4.2.0). */
      highlight: z.preprocess(emptyToUndefined, z.number().int().min(1).optional()),
    }),
});

const skills = defineCollection({ loader: loader('skills'), schema: skillSchema });

const projects = defineCollection({
  loader: loader('projects'),
  schema: ({ image }) =>
    z
      .object({
        title: z.string(),
        subtitle: z.string(),
        kind: z.enum(['personal', 'work', 'open-source']),
        summary: z.string(),
        start: cvDate,
        end: optionalDate,
        tech: z.array(z.string()).default([]),
        repo: optionalUrl,
        demo: optionalUrl,
        image: image().optional(),
        imageAlt: optionalText,
        featured: z.boolean().default(false),
        inPdf: z.boolean().optional(),
        role: optionalText,
      })
      .refine((d) => !d.image || !!d.imageAlt?.trim(), {
        message: 'imageAlt is required when image is set',
        path: ['imageAlt'],
      })
      .transform((d) => ({ ...d, inPdf: d.inPdf ?? d.featured })),
});

const certifications = defineCollection({
  loader: loader('certifications'),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      issuer: z.string(),
      year: z.string().regex(/^\d{4}$/),
      credentialUrl: optionalUrl,
      badge: image().optional(),
      /** Iconify name of the issuer's logo, e.g. `logos:aws`; shown when there is no badge. */
      logo: z
        .string()
        .regex(/^[a-z0-9-]+:[a-z0-9-]+$/)
        .optional(),
      monogram: z.string().min(2).max(3),
    }),
});

const metric = z.object({
  /** Short caption above the value: "Cut", "Led" (spec §5.10.5). */
  prefix: optionalText,
  label: z.string(),
  value: z.string(),
  /** 2-3 entries draw graph bars next to the stat (spec §5.10.9). */
  compare: z
    .array(z.object({ label: z.string(), value: z.number().positive() }))
    .min(2)
    .max(3)
    .optional(),
});

const star = defineCollection({
  loader: loader('star'),
  schema: z.object({
    title: z.string(),
    question: z.string(),
    role: optionalText,
    competencies: z.array(z.enum(competencyKeys)).min(1),
    date: z.coerce.date(),
    metrics: z.array(metric).default([]),
    featured: z.boolean().default(false),
    /** Placeholder content to replace before publishing; shows a "Sample" marker. */
    sample: z.boolean().default(false),
  }),
});

const blog = defineCollection({
  loader: loader('blog', '**/*.{md,mdx}'),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
      tags: z.array(z.string().regex(KEBAB, 'kebab-case')).default([]),
      heroImage: image().optional(),
      /** Attribution for heroImage; supports [text](https://…) links. */
      heroImageCredit: optionalText,
      /** Newsroom drop cap on the first paragraph (spec §5.10.8). */
      dropcap: z.boolean().default(false),
      draft: z.boolean().default(false),
      series: optionalText,
      seriesPart: z.preprocess(emptyToUndefined, z.number().int().min(1).optional()),
      topic: topicRef,
    }),
});

const series = defineCollection({
  loader: loader('series'),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    /** One short line for the Home Writing tile. */
    tagline: optionalText,
    /** Up to 6 code lines copied verbatim from a part, shown as the Home tile's editor visual. */
    snippet: z.array(z.string()).max(6).default([]),
    topic: topicRef,
    parts: z.array(
      z.object({
        part: z.number().int().min(1),
        title: z.string(),
        description: z.string().optional(),
      }),
    ),
  }),
});

const topics = defineCollection({
  loader: loader('topics'),
  schema: z.object({ title: z.string(), description: z.string(), order: z.number().int() }),
});

export const collections = {
  profile,
  experience,
  skills,
  projects,
  certifications,
  star,
  blog,
  series,
  topics,
};

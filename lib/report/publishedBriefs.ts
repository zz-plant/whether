/**
 * Frozen weekly briefs.
 *
 * `/` renders the live brief and its content changes every week under one URL, so
 * it cannot be indexed as a dated article. Each published week is frozen here
 * instead and served from `/brief/[week]` with a real `datePublished` that never
 * moves. Records are append-only: once a week is written it is not rewritten,
 * because the whole point is that a cited brief still says what it said.
 *
 * Append the current week with `bun run brief:freeze`.
 */
import { z } from "zod";
import rawPublishedBriefs from "../../data/published_briefs.json";
import { formatIsoWeekSlug } from "../isoWeek";

const PublishedBriefDecisionSchema = z.object({
  area: z.string(),
  call: z.string(),
  doNow: z.string(),
  pauseTrigger: z.string(),
  resumeTrigger: z.string(),
});

const PublishedBriefEvidenceSchema = z.object({
  title: z.string(),
  detail: z.string(),
  sourceUrl: z.string().optional(),
});

export const PublishedBriefSchema = z.object({
  slug: z.string(),
  year: z.number(),
  week: z.number(),
  /** Publication date. Frozen at freeze time and never updated. */
  publishedAt: z.string(),
  recordDate: z.string(),
  recordDateLabel: z.string(),
  headline: z.string(),
  summary: z.string(),
  postureLabel: z.string(),
  regime: z.enum(["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"]),
  confidenceLabel: z.string(),
  whatChanged: z.string(),
  actionNow: z.string(),
  guardrailThreshold: z.string(),
  flipThreshold: z.string(),
  decisions: z.array(PublishedBriefDecisionSchema),
  evidence: z.array(PublishedBriefEvidenceSchema),
  sourceLabel: z.string(),
  sourceUrl: z.string().optional(),
  freshnessLabel: z.string(),
  /** Set when a published record was later corrected, per the stated corrections policy. */
  correction: z.string().nullable().default(null),
});

export const PublishedBriefIndexSchema = z.array(PublishedBriefSchema);

export type PublishedBrief = z.infer<typeof PublishedBriefSchema>;

export const parsePublishedBriefs = (input: unknown): PublishedBrief[] => {
  const parsed = PublishedBriefIndexSchema.safeParse(input);

  if (parsed.success) {
    return parsed.data;
  }

  console.error("Published brief index failed validation.", parsed.error.format());
  return [];
};

const briefs = parsePublishedBriefs(rawPublishedBriefs).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

const briefBySlug = new Map(briefs.map((brief) => [brief.slug, brief]));

/** Newest first. */
export const getPublishedBriefs = () => briefs;

export const findPublishedBrief = (slug: string) => briefBySlug.get(slug);

export const isPublishedBriefSlug = (slug: string) => briefBySlug.has(slug);

export const publishedBriefStaticParams = briefs.map((brief) => ({ week: brief.slug }));

export const latestPublishedBrief = briefs[0];

/** Adjacent published weeks, in reading order (older -> newer). */
export const findAdjacentPublishedBriefs = (slug: string) => {
  const chronological = [...briefs].reverse();
  const index = chronological.findIndex((brief) => brief.slug === slug);

  if (index === -1) {
    return { previous: undefined, next: undefined };
  }

  return { previous: chronological[index - 1], next: chronological[index + 1] };
};

export const buildPublishedBriefPath = (slug: string) => `/brief/${slug}` as const;

export const buildPublishedBriefSlug = (year: number, week: number) => formatIsoWeekSlug({ year, week });

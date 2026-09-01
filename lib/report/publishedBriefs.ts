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
import { buildCanonicalUrl } from "../seo";
import { publicDecisionLabels } from "./reportFormatting";
import { DECISION_CONTRACT_LABELS } from "./reportCopy";

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

/**
 * How far the newest frozen week may trail the live record date before the
 * homepage stops advertising it.
 *
 * The archive is this product's proof of cadence, so a gap in it is itself a
 * claim: past roughly a week and a half, the newest frozen week has stopped
 * being evidence that the brief ships every week and started being evidence
 * that it stopped. Ten days covers a normal weekly cadence plus slack for the
 * Thursday freeze slipping a day or two.
 */
export const PUBLISHED_BRIEF_STALE_AFTER_DAYS = 10;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Days between the live record date and a frozen week. Returns null when either
 * date is unparseable, which callers treat as "cannot vouch for it".
 */
export const publishedBriefAgeInDays = (brief: PublishedBrief, currentRecordDate: string) => {
  const current = Date.parse(currentRecordDate);
  const published = Date.parse(brief.recordDate);

  if (!Number.isFinite(current) || !Number.isFinite(published)) {
    return null;
  }

  return (current - published) / MS_PER_DAY;
};

/**
 * The frozen week the live brief may point at as its citable permalink, or
 * undefined when the archive has fallen far enough behind that linking it would
 * date-stamp the homepage with a week that is no longer this one.
 *
 * A missing module is neutral. A stale date sitting under a hero whose whole
 * claim is freshness is a negative claim, so absence is the safer failure.
 */
export const selectCitablePermalinkBrief = (currentRecordDate: string): PublishedBrief | undefined => {
  if (!latestPublishedBrief) {
    return undefined;
  }

  const age = publishedBriefAgeInDays(latestPublishedBrief, currentRecordDate);

  if (age === null || age > PUBLISHED_BRIEF_STALE_AFTER_DAYS) {
    return undefined;
  }

  return latestPublishedBrief;
};

export const buildPublishedBriefPath = (slug: string) => `/brief/${slug}` as const;

export const buildPublishedBriefSlug = (year: number, week: number) => formatIsoWeekSlug({ year, week });

export const decisionAreaLabels: Record<string, string> = {
  hiring: "Hiring",
  "product-tempo": "Product tempo",
  "capital-raising": "Capital raising",
  "burn-discipline": "Burn discipline",
  "expansion-bets": "Expansion bets",
};

export const labelForArea = (area: string) => decisionAreaLabels[area] ?? area;

/**
 * Generates a date-pinned Slack update constructed strictly from PublishedBrief.
 * Never fetches live report data or external endpoints.
 */
export const buildPublishedBriefSlackUpdate = (brief: PublishedBrief): string => {
  const permalinkUrl = buildCanonicalUrl(buildPublishedBriefPath(brief.slug));
  const decisions = brief.decisions.map((decision) =>
    [
      `• ${labelForArea(decision.area)}: ${decision.call}`,
      `  ${publicDecisionLabels.action}: ${decision.doNow}`,
      `  ${publicDecisionLabels.threshold}: ${decision.pauseTrigger}`,
      `  ${publicDecisionLabels.reversal}: ${decision.resumeTrigger}`,
    ].join("\n"),
  );

  const evidenceLines = brief.evidence.map((item) => `• ${item.title} — ${item.detail}`);

  return [
    `Whether Weekly Brief — ${brief.recordDateLabel}`,
    `Posture: ${brief.postureLabel} (${brief.confidenceLabel} confidence)`,
    "",
    "Summary:",
    `• ${brief.summary}`,
    `• What changed: ${brief.whatChanged}`,
    "",
    `Bounded decision (${publicDecisionLabels.call} / ${publicDecisionLabels.action} / ${publicDecisionLabels.threshold} / ${publicDecisionLabels.reversal}):`,
    `• ${publicDecisionLabels.call}: ${brief.summary}`,
    `• ${publicDecisionLabels.action}: ${brief.actionNow}`,
    `• ${publicDecisionLabels.threshold}: ${brief.guardrailThreshold}`,
    `• ${publicDecisionLabels.reversal}: ${brief.flipThreshold}`,
    ...(decisions.length > 0 ? ["", "Operating limits by area:", ...decisions] : []),
    ...(evidenceLines.length > 0 ? ["", "Evidence:", ...evidenceLines] : []),
    ...(brief.correction ? ["", `Correction: ${brief.correction}`] : []),
    "",
    "Provenance:",
    `Record date ${brief.recordDateLabel} · ${brief.sourceLabel} · captured ${brief.freshnessLabel}`,
    ...(brief.sourceUrl ? [`Source: ${brief.sourceUrl}`] : []),
    "",
    `Permanent URL: ${permalinkUrl}`,
  ].join("\n");
};

/**
 * Generates a date-pinned Email leadership update constructed strictly from PublishedBrief.
 * Never fetches live report data or external endpoints.
 */
export const buildPublishedBriefEmailUpdate = (brief: PublishedBrief): string => {
  const permalinkUrl = buildCanonicalUrl(buildPublishedBriefPath(brief.slug));
  const decisions = brief.decisions.map((decision) =>
    [
      `• ${labelForArea(decision.area)}: ${decision.call}`,
      `  - ${DECISION_CONTRACT_LABELS.slot.action}: ${decision.doNow}`,
      `  - ${DECISION_CONTRACT_LABELS.threshold.pauseIf}: ${decision.pauseTrigger}`,
      `  - Resume when: ${decision.resumeTrigger}`,
    ].join("\n"),
  );

  const evidenceLines = brief.evidence.map((item) => `• ${item.title}: ${item.detail}`);

  return [
    `Whether Leadership Update — Week of ${brief.recordDateLabel}`,
    "",
    `Posture: ${brief.postureLabel}`,
    `Confidence: ${brief.confidenceLabel} confidence`,
    `Executive summary: ${brief.summary}`,
    "",
    "What changed this week:",
    brief.whatChanged,
    "",
    "Operating call & bounded thresholds:",
    `• ${DECISION_CONTRACT_LABELS.action.actionNow}: ${brief.actionNow}`,
    `• ${DECISION_CONTRACT_LABELS.threshold.guardrail} threshold: ${brief.guardrailThreshold}`,
    `• ${DECISION_CONTRACT_LABELS.reversal.reversal} condition: ${brief.flipThreshold}`,
    ...(decisions.length > 0 ? ["", "Area decisions:", ...decisions] : []),
    ...(evidenceLines.length > 0 ? ["", "Evidence:", ...evidenceLines] : []),
    ...(brief.correction ? ["", `Correction note: ${brief.correction}`] : []),
    "",
    "Provenance & citations:",
    `• Record date: ${brief.recordDateLabel}`,
    `• Source: ${brief.sourceLabel}${brief.sourceUrl ? ` (${brief.sourceUrl})` : ""}`,
    `• Freshness: ${brief.freshnessLabel}`,
    "",
    `Permanent URL: ${permalinkUrl}`,
  ].join("\n");
};


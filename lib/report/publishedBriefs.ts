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
import { buildCanonicalUrl, buildOgImageUrl } from "../seo";
import { formatConfidenceChipLabel, formatDecisionReversal, publicDecisionLabels } from "./reportFormatting";
import { DECISION_CONTRACT_LABELS } from "./reportCopy";
import { regimeSignalLabel } from "./signalTranslations";
import { getRegimePublicLabel } from "../regimePresentation";
import { buildBoundedConditionRails } from "./operatingCalls";
import { decisionAreaLabel, decisionAreaOrder, isDecisionArea } from "./boundedDecisionRules";
import { buildScoreReferenceLines } from "../export/scoreReference";

const PublishedRuleLineSchema = z.object({
  metric: z.enum(["tightness", "riskAppetite"]),
  operator: z.enum([">", ">=", "<", "<="]),
  value: z.number(),
  label: z.string(),
});

const PublishedBriefDecisionSchema = z.object({
  area: z.string(),
  call: z.string(),
  doNow: z.string(),
  pauseTrigger: z.string(),
  resumeTrigger: z.string(),
  /** The numeric lines behind `pauseTrigger`. Absent on records frozen before the lines were data. */
  pause: z.array(PublishedRuleLineSchema).optional(),
  /** The numeric lines behind `resumeTrigger`. */
  resume: z.array(PublishedRuleLineSchema).optional(),
  /** Non-numeric conditions the rule states beside its lines. */
  pauseQualifier: z.string().optional(),
  resumeQualifier: z.string().optional(),
});

const PublishedBriefScoresSchema = z.object({
  tightness: z.number(),
  riskAppetite: z.number(),
  tightnessDelta: z.number().nullable().optional(),
  riskAppetiteDelta: z.number().nullable().optional(),
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
  /** The two composite readings the call was scored on. Absent on records frozen before they were recorded. */
  scores: PublishedBriefScoresSchema.optional(),
  evidence: z.array(PublishedBriefEvidenceSchema),
  sourceLabel: z.string(),
  sourceUrl: z.string().optional(),
  freshnessLabel: z.string(),
  /** Set when a published record was later corrected, per the stated corrections policy. */
  correction: z.string().nullable().default(null),
});

export const PublishedBriefIndexSchema = z.array(PublishedBriefSchema);

export type PublishedBrief = z.infer<typeof PublishedBriefSchema>;
export type PublishedRuleLine = z.infer<typeof PublishedRuleLineSchema>;

/** Last week's reading from the record's real weekly move; null where the record carries none. */
const previousFromDelta = (value: number, delta: number | null | undefined) =>
  typeof delta === "number" && Number.isFinite(delta) ? Math.round((value - delta) * 10) / 10 : null;

/**
 * The readings against their lines, one line per score, in the shape every
 * export prints (`lib/export/scoreReference.ts`): value, line, distance, last
 * week. The frozen record's prose already says the rule; this says the numbers,
 * so a reader of the pasted block sees where each reading sits without parsing
 * a sentence. "Last week" comes from the deltas the freeze recorded, which are
 * the real weekly move. Empty for records that carry no scores.
 */
/**
 * The archive's stored labels, as a reader should meet them.
 *
 * `data/published_briefs.json` is append-only and citable, so a record keeps the
 * words it was frozen with — and the first weeks were frozen with the engine's:
 * a posture description with a stage suffix ("Guarded Expansion — Late"), a confidence code ("MED"), a provenance
 * status ("Canonical snapshot (high confidence)") and a signal name the site has
 * since corrected ("Fed interest rate" for what is the 1-month Treasury bill).
 * Rewriting the records would change what was published; translating at render
 * keeps the record and gives the reader today's words. The page and both copy
 * formats read this, so they cannot translate differently.
 */
const RETIRED_EVIDENCE_TITLES: Record<string, string> = {
  "Fed interest rate": regimeSignalLabel.baseRate,
  "Capital conditions": regimeSignalLabel.tightness,
};

export const publishedBriefDisplay = (brief: PublishedBrief) => ({
  /* From the engine key, not the stored label: the earliest records stored a
     third vocabulary ("Guarded Expansion — Late") that no stripping recovers. */
  conditions: getRegimePublicLabel(brief.regime),
  confidence: formatConfidenceChipLabel(brief.confidenceLabel === "MEDIUM" ? "MED" : brief.confidenceLabel),
  source: /^(Canonical|Archived) snapshot/i.test(brief.sourceLabel)
    ? "Saved copy of the published reading"
    : brief.sourceLabel.replace(/\s*\((high|medium|low)( confidence)?\)$/i, ""),
  /* The early headlines lead with the stored label ("Guarded Expansion — Late —
     week of Jul 30, 2026"), so the lead is swapped for the weather name. */
  headline: brief.headline.startsWith(brief.postureLabel)
    ? `${getRegimePublicLabel(brief.regime)}${brief.headline.slice(brief.postureLabel.length)}`
    : brief.headline,
  evidenceTitle: (title: string) => RETIRED_EVIDENCE_TITLES[title] ?? title,
});

export const buildPublishedBriefReadingLines = (brief: PublishedBrief): string[] => {
  if (!brief.scores) return [];
  const corridor = brief.decisions.find((decision) => (decision.pause?.length ?? 0) > 0);
  const rails = buildBoundedConditionRails({
    pause: corridor?.pause,
    resume: corridor?.resume,
    scores: brief.scores,
  });
  return buildScoreReferenceLines({
    scores: { tightness: brief.scores.tightness, riskAppetite: brief.scores.riskAppetite },
    rails,
    previous: {
      tightness: previousFromDelta(brief.scores.tightness, brief.scores.tightnessDelta),
      riskAppetite: previousFromDelta(brief.scores.riskAppetite, brief.scores.riskAppetiteDelta),
    },
  });
};

/** The record's area decisions in the page's row order; an area the table does not know keeps its place at the end. */
const decisionsInAreaOrder = (brief: PublishedBrief) => {
  const orderIndex = (area: string) => (isDecisionArea(area) ? decisionAreaOrder.indexOf(area) : decisionAreaOrder.length);
  return [...brief.decisions].sort((left, right) => orderIndex(left.area) - orderIndex(right.area));
};

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

/** The page's `<h1>` and `<title>`; the news sitemap must carry the same words. */
export const buildPublishedBriefTitle = (brief: PublishedBrief) =>
  `${publishedBriefDisplay(brief).conditions}: guidance for the week of ${brief.recordDateLabel}`;

/**
 * The week's card, as its page, its feed item and its news sitemap entry all
 * name it: the conditions in the weather words and the week as a date, not the
 * archive's slug. One builder, so the image a feed reader or Discover shows is
 * the one the page declares.
 */
export const buildPublishedBriefImageParams = (brief: PublishedBrief) => ({
  template: "brief-chart",
  week: brief.recordDateLabel,
  posture: publishedBriefDisplay(brief).conditions,
  regime: brief.regime,
});

export const buildPublishedBriefImageUrl = (brief: PublishedBrief) =>
  buildOgImageUrl(buildPublishedBriefImageParams(brief));

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

/* One table: this used to carry its own copy of the five area names, so /brief/<week> called an
   area "Product tempo" while the homepage called it "Roadmap". */
export const labelForArea = (area: string) => (isDecisionArea(area) ? decisionAreaLabel(area) : area);

/**
 * Generates a date-pinned Slack update constructed strictly from PublishedBrief.
 * Never fetches live report data or external endpoints.
 */
export const buildPublishedBriefSlackUpdate = (brief: PublishedBrief): string => {
  const permalinkUrl = buildCanonicalUrl(buildPublishedBriefPath(brief.slug));
  const readingLines = buildPublishedBriefReadingLines(brief);
  const decisions = decisionsInAreaOrder(brief).map((decision) =>
    [
      `• ${labelForArea(decision.area)}: ${decision.call}`,
      `  ${publicDecisionLabels.action}: ${decision.doNow}`,
      `  ${publicDecisionLabels.threshold}: ${decision.pauseTrigger}`,
      `  ${publicDecisionLabels.reversal}: ${formatDecisionReversal(decision.resumeTrigger)}`,
    ].join("\n"),
  );

  const display = publishedBriefDisplay(brief);
  const evidenceLines = brief.evidence.map((item) => `• ${display.evidenceTitle(item.title)} — ${item.detail}`);

  /* The page's order: the call, what changed, one row per area, evidence, sources. */
  return [
    `Whether Weekly Brief — ${brief.recordDateLabel}`,
    `Conditions: ${display.conditions} (${display.confidence.toLowerCase()})`,
    "",
    `This week's decision (${publicDecisionLabels.call} / ${publicDecisionLabels.action} / ${publicDecisionLabels.threshold} / ${DECISION_CONTRACT_LABELS.watch.postureFlips}):`,
    `• ${publicDecisionLabels.call}: ${brief.summary}`,
    `• ${publicDecisionLabels.action}: ${brief.actionNow}`,
    `• ${publicDecisionLabels.threshold}: ${brief.guardrailThreshold}`,
    `• ${DECISION_CONTRACT_LABELS.watch.postureFlips}: ${brief.flipThreshold}`,
    ...(readingLines.length > 0 ? ["", "Readings:", ...readingLines] : []),
    "",
    "Summary:",
    `• ${brief.summary}`,
    `• What changed: ${brief.whatChanged}`,
    ...(decisions.length > 0 ? ["", "Operating limits by area:", ...decisions] : []),
    ...(evidenceLines.length > 0 ? ["", "Evidence:", ...evidenceLines] : []),
    ...(brief.correction ? ["", `Correction: ${brief.correction}`] : []),
    "",
    "Provenance:",
    `Record date ${brief.recordDateLabel} · ${display.source} · captured ${brief.freshnessLabel}`,
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
  const readingLines = buildPublishedBriefReadingLines(brief);
  const decisions = decisionsInAreaOrder(brief).map((decision) =>
    [
      `• ${labelForArea(decision.area)}: ${decision.call}`,
      `  - ${DECISION_CONTRACT_LABELS.slot.action}: ${decision.doNow}`,
      `  - ${DECISION_CONTRACT_LABELS.threshold.pauseIf}: ${decision.pauseTrigger}`,
      `  - ${DECISION_CONTRACT_LABELS.reversal.resumeWhen}: ${formatDecisionReversal(decision.resumeTrigger)}`,
    ].join("\n"),
  );

  const display = publishedBriefDisplay(brief);
  const evidenceLines = brief.evidence.map((item) => `• ${display.evidenceTitle(item.title)}: ${item.detail}`);

  /* The page's order: the call, what changed, one row per area, evidence, sources. */
  return [
    `Whether Leadership Update — Week of ${brief.recordDateLabel}`,
    "",
    `Conditions: ${display.conditions}`,
    `Confidence: ${display.confidence}`,
    `Executive summary: ${brief.summary}`,
    "",
    "This week's guidance:",
    `• ${DECISION_CONTRACT_LABELS.action.actionNow}: ${brief.actionNow}`,
    `• ${DECISION_CONTRACT_LABELS.threshold.pauseIf}: ${brief.guardrailThreshold}`,
    `• ${DECISION_CONTRACT_LABELS.watch.postureFlips}: ${brief.flipThreshold}`,
    "",
    "What changed this week:",
    brief.whatChanged,
    ...readingLines,
    ...(decisions.length > 0 ? ["", "Area decisions:", ...decisions] : []),
    ...(evidenceLines.length > 0 ? ["", "Evidence:", ...evidenceLines] : []),
    ...(brief.correction ? ["", `Correction note: ${brief.correction}`] : []),
    "",
    "Provenance & citations:",
    `• Record date: ${brief.recordDateLabel}`,
    `• Source: ${display.source}${brief.sourceUrl ? ` (${brief.sourceUrl})` : ""}`,
    `• Freshness: ${brief.freshnessLabel}`,
    "",
    `Permanent URL: ${permalinkUrl}`,
  ].join("\n");
};


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
import { formatIsoWeekSlug, getIsoWeekInfo } from "../isoWeek";
import { buildCanonicalUrl, buildOgImageUrl } from "../seo";
import { formatSignedDeltaOrNull, formatThresholdNumber } from "../formatters";
import { formatConfidenceChipLabel, formatDecisionReversal, publicDecisionLabels } from "./reportFormatting";
import { DECISION_CONTRACT_LABELS } from "./reportCopy";
import { regimeSignalLabel } from "./signalTranslations";
import { getRegimePublicLabel } from "../regimePresentation";
import { buildBoundedConditionRails } from "./operatingCalls";
import { decisionAreaLabel, decisionAreaOrder, isDecisionArea } from "./boundedDecisionRules";
import { buildScoreReferenceLines } from "../export/scoreReference";
import { buildComparedWith, comparisonBasis } from "./comparisonBasis";
import { describeWeeklyMovement } from "./home/homeSectionModel";
import type { ComparedWith } from "./reportDataTypes";

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
  /** The move since `comparedWith`. Records frozen before that was stored carry a move against a reading they do not name. */
  tightnessDelta: z.number().nullable().optional(),
  riskAppetiteDelta: z.number().nullable().optional(),
  /** The earlier reading the deltas are measured against (`ReportDynamics.comparedWith`). */
  comparedWith: z.object({ recordDate: z.string(), label: z.string() }).optional(),
  /**
   * The short-term rate and the recession warning gauge the week published, so the next
   * week's brief can compare them with this one (`findWeeklyComparisonReading`). Absent
   * on records frozen before they were stored, and null where the reading had none.
   */
  baseRate: z.number().nullable().optional(),
  curveSlope: z.number().nullable().optional(),
  /**
   * The engine that scored them (`ENGINE_VERSION`). Next week compares with this
   * record only under the same engine; absent on records frozen before it was stored.
   */
  engineVersion: z.string().optional(),
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

/** The earlier reading from a stored move; null where the record carries none. */
const previousFromDelta = (value: number, delta: number | null | undefined) =>
  typeof delta === "number" && Number.isFinite(delta) ? Math.round((value - delta) * 10) / 10 : null;

type ScoreMetric = "tightness" | "riskAppetite";

/** The earlier reading a frozen week's moves are measured against: its scores, and which reading it was. */
type PublishedComparison = { previous: Record<ScoreMetric, number>; comparedWith: ComparedWith };

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/** The frozen record of the ISO week before this one, when the archive has it. */
const findPriorWeekBrief = (brief: PublishedBrief) => {
  const recorded = Date.parse(brief.recordDate);
  if (!Number.isFinite(recorded)) return undefined;
  return briefBySlug.get(formatIsoWeekSlug(getIsoWeekInfo(new Date(recorded - MS_PER_WEEK))));
};

/**
 * What a frozen week's moves are measured against.
 *
 * The freeze stored `tightnessDelta` and `riskAppetiteDelta` from the week's
 * dynamics, whose earlier reading is the previous month-end snapshot, and until
 * 2026-10 it did not store which reading that was. The page printed them as
 * "+27.0 vs prior week" and the pastes as "last week 63": w38, w39 and w40 all
 * said "last week 63/56", which was Aug 31, so w40's "+27" was five weeks of
 * movement — the week before it had read 85, and the real weekly move was +5.
 *
 * A record that names its reading (`scores.comparedWith`) is measured against
 * that reading. One that does not is measured against the frozen week before
 * it, from that record's own scores, when the archive has that week. Otherwise
 * there is no move to print: the stored figure is against a reading nobody can
 * now name.
 */
const resolvePublishedComparison = (brief: PublishedBrief): PublishedComparison | null => {
  const scores = brief.scores;
  if (!scores) return null;
  if (scores.comparedWith) {
    const tightness = previousFromDelta(scores.tightness, scores.tightnessDelta);
    const riskAppetite = previousFromDelta(scores.riskAppetite, scores.riskAppetiteDelta);
    return tightness === null || riskAppetite === null
      ? null
      : { previous: { tightness, riskAppetite }, comparedWith: scores.comparedWith };
  }
  const prior = findPriorWeekBrief(brief);
  const comparedWith = prior?.scores ? buildComparedWith(prior.recordDate, brief.recordDate) : undefined;
  return prior?.scores && comparedWith
    ? { previous: { tightness: prior.scores.tightness, riskAppetite: prior.scores.riskAppetite }, comparedWith }
    : null;
};

const upperFirst = (value: string) => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
const lowerFirst = (value: string) => `${value.charAt(0).toLowerCase()}${value.slice(1)}`;

const FUNDING_PRESSURE = lowerFirst(regimeSignalLabel.tightness);
const RISK_APPETITE = lowerFirst(regimeSignalLabel.riskAppetite);

/*
 * The signal names the first record was frozen with. "Cash availability" was
 * the funding-pressure score under a name that ran the wrong way: the number
 * rose as cash got harder to find, so "cash availability tightens above 76"
 * meant funding pressure rising above 76, and read as its opposite. The verbs
 * go with the name, longest phrase first.
 */
const RETIRED_SIGNAL_PHRASES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bcash availability tightens above\b/gi, `${FUNDING_PRESSURE} rises above`],
  [/\bcash availability eases below\b/gi, `${FUNDING_PRESSURE} falls below`],
  [/\bcash availability\b/gi, FUNDING_PRESSURE],
  [/\bmarket risk appetite\b/gi, RISK_APPETITE],
];

/* "70.0" was precision the scores never had (`formatThresholdNumber`). A rate keeps its decimal: "0.0%" is a curve value. */
const WHOLE_POINT_DECIMAL = /\b(\d+)\.0\b(?!%)/g;

/** A stored rule sentence in today's signal names and whole points. A sentence that needs neither passes through. */
const translateStoredSentence = (text: string) =>
  RETIRED_SIGNAL_PHRASES.reduce(
    (sentence, [pattern, replacement]) =>
      sentence.replace(pattern, (match) => (match.charAt(0) === match.charAt(0).toUpperCase() ? upperFirst(replacement) : replacement)),
    text,
  ).replace(WHOLE_POINT_DECIMAL, "$1");

/*
 * The change line as the first record froze it: a status, then one sentence
 * per score that each said "flips this call" — "No flip condition is tripped
 * yet. Cash availability flips this call if it climbs above 70.0, from 52.0
 * today. Market risk appetite flips this call if it falls to or below 50.0, from
 * 58.0 today." The builder has written one condition per score since 2026-09-02,
 * and the next record (w38) carries that form ("Funding pressure at or below 70
 * (77 today) or …"), so the old one is restated in it: same lines, same
 * readings, a crossed one first.
 */
const RETIRED_FLIP_STATUS = /^(?:No flip condition is tripped yet|One flip condition is already tripped)\.\s*/;
const RETIRED_FLIP_CONDITION =
  /([A-Z][A-Za-z ]*?) (?:flips this call if it (climbs above|falls to or below) (\d+(?:\.\d+)?)(?:, from (\d+(?:\.\d+)?) today)?|is already in the flip zone at (\d+(?:\.\d+)?) and only has to stay (above|at or below) (\d+(?:\.\d+)?))\.(?:\s+|$)/y;

const points = (value: string) => formatThresholdNumber(Number(value));

const translateRetiredFlipLine = (text: string): string | null => {
  const status = RETIRED_FLIP_STATUS.exec(text);
  if (!status) return null;
  const rest = text.slice(status[0].length);
  const conditions: Array<{ text: string; tripped: boolean }> = [];
  RETIRED_FLIP_CONDITION.lastIndex = 0;
  while (RETIRED_FLIP_CONDITION.lastIndex < rest.length) {
    const match = RETIRED_FLIP_CONDITION.exec(rest);
    if (!match) return null;
    const [, label, verb, line, now, trippedAt, boundary, trippedLine] = match;
    const name = translateStoredSentence(label);
    conditions.push(
      trippedAt !== undefined
        ? { text: `${name} ${boundary} ${points(trippedLine)} (already true at ${points(trippedAt)})`, tripped: true }
        : {
            text: `${name} ${verb === "climbs above" ? "above" : "at or below"} ${points(line)}${now === undefined ? "" : ` (${points(now)} today)`}`,
            tripped: false,
          },
    );
  }
  if (conditions.length === 0) return null;
  const ordered = [...conditions].sort((left, right) => Number(right.tripped) - Number(left.tripped));
  return `${ordered.map((condition, index) => (index === 0 ? upperFirst(condition.text) : lowerFirst(condition.text))).join(" or ")}.`;
};

/*
 * "Pressure increased by +3.0 this week. Slow new commitments until conditions
 * stabilize." — the sentence w31, w38 and w39 were frozen with. The figure was a
 * clamped composite in a unit nothing else prints, "this week" was the month-end
 * comparison, and the instruction disagreed with the guidance above it
 * (lib/report/decisionMovement.ts has the history). None of it can be restated,
 * so it is replaced: by the scores' move against the reading the record can
 * name, or, where it can name none, by the one fact the sentence carried — which
 * way conditions went.
 */
const RETIRED_MOVEMENT_SENTENCE = /^Pressure (increased|eased) by [+-]?\d+(?:\.\d+)? (?:this week|since [^.]+)\./;

const UNDATED_MOVEMENT = {
  increased: "Conditions tightened. This record does not name the earlier reading it compared with.",
  eased: "Conditions eased. This record does not name the earlier reading it compared with.",
} as const;

const displayWhatChanged = (brief: PublishedBrief, comparison: PublishedComparison | null) => {
  const retired = RETIRED_MOVEMENT_SENTENCE.exec(brief.whatChanged);
  if (!retired) return translateStoredSentence(brief.whatChanged);
  if (comparison && brief.scores) {
    return describeWeeklyMovement({
      tightnessDelta: brief.scores.tightness - comparison.previous.tightness,
      riskAppetiteDelta: brief.scores.riskAppetite - comparison.previous.riskAppetite,
      comparisonUnavailable: false,
      basis: comparisonBasis(comparison.comparedWith),
    });
  }
  return retired[1] === "eased" ? UNDATED_MOVEMENT.eased : UNDATED_MOVEMENT.increased;
};

/**
 * The archive's stored labels, as a reader should meet them.
 *
 * `data/published_briefs.json` is append-only and citable, so a record keeps the
 * words it was frozen with — and the first weeks were frozen with the engine's:
 * a posture description with a stage suffix ("Guarded Expansion — Late"), a confidence code ("MED"), a provenance
 * status ("Canonical snapshot (high confidence)") and a signal name the site has
 * since corrected ("Fed interest rate" for what is the 1-month Treasury bill).
 * Rewriting the records would change what was published; translating at render
 * keeps the record and gives the reader today's words. The page, the feed and
 * both copy formats read this, so they cannot translate differently.
 */
const RETIRED_EVIDENCE_TITLES: Record<string, string> = {
  "Fed interest rate": regimeSignalLabel.baseRate,
  "Capital conditions": regimeSignalLabel.tightness,
  "Market risk appetite": regimeSignalLabel.riskAppetite,
};

export const publishedBriefDisplay = (brief: PublishedBrief) => {
  const comparison = resolvePublishedComparison(brief);
  return {
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
    /** A stored rule or action sentence, in today's signal names and whole points. */
    sentence: translateStoredSentence,
    /* w31 stored an item from the avoid list, "Over-engineering before demand
       proves out", where the pause line goes, and the card printed it in the
       pause slot as though it were a trigger. A pause line is a score against a
       number; with no number in it there is no line, and the slot is left out. */
    pauseIf: /\d/.test(brief.guardrailThreshold) ? translateStoredSentence(brief.guardrailThreshold) : null,
    conditionsChangeIf: translateRetiredFlipLine(brief.flipThreshold) ?? translateStoredSentence(brief.flipThreshold),
    whatChanged: displayWhatChanged(brief, comparison),
    /** The earlier reading, as `buildScoreReferenceLines` takes it; null where the record can name none. */
    previous: comparison ? { ...comparison.previous, comparedWith: comparison.comparedWith } : null,
    /** "+5 vs Sep 22": a score's move in whole points, named by the reading it is against. Null with no reading to name, or no move. */
    scoreChange: (metric: ScoreMetric) => {
      if (!comparison || !brief.scores) return null;
      const delta = formatSignedDeltaOrNull(Math.round(brief.scores[metric] - comparison.previous[metric]), 0);
      return delta ? `${delta} ${comparisonBasis(comparison.comparedWith).versus}` : null;
    },
  };
};

/**
 * The readings against their lines, one line per score, in the shape every
 * export prints (`lib/export/scoreReference.ts`): value, line, distance, the
 * earlier reading. The frozen record's prose already says the rule; this says
 * the numbers, so a reader of the pasted block sees where each reading sits
 * without parsing a sentence. The earlier reading is dated by the reading it
 * is ("was 85 on Sep 22"), never "last week" by default. Empty for records that
 * carry no scores.
 */
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
    previous: publishedBriefDisplay(brief).previous,
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
  const display = publishedBriefDisplay(brief);
  const decisions = decisionsInAreaOrder(brief).map((decision) =>
    [
      `• ${labelForArea(decision.area)}: ${display.sentence(decision.call)}`,
      `  ${publicDecisionLabels.action}: ${display.sentence(decision.doNow)}`,
      `  ${publicDecisionLabels.threshold}: ${display.sentence(decision.pauseTrigger)}`,
      `  ${publicDecisionLabels.reversal}: ${formatDecisionReversal(display.sentence(decision.resumeTrigger))}`,
    ].join("\n"),
  );

  const evidenceLines = brief.evidence.map((item) => `• ${display.evidenceTitle(item.title)} — ${item.detail}`);
  /* The slots the record can fill: w31 names no pause line (`publishedBriefDisplay`). */
  const slots = [
    { label: publicDecisionLabels.call, value: brief.summary },
    { label: publicDecisionLabels.action, value: brief.actionNow },
    ...(display.pauseIf ? [{ label: publicDecisionLabels.threshold, value: display.pauseIf }] : []),
    { label: DECISION_CONTRACT_LABELS.watch.postureFlips, value: display.conditionsChangeIf },
  ];

  /* The page's order: the call, what changed, one row per area, evidence, sources. */
  return [
    `Whether Weekly Brief — ${brief.recordDateLabel}`,
    `Conditions: ${display.conditions} (${display.confidence.toLowerCase()})`,
    "",
    `This week's decision (${slots.map((slot) => slot.label).join(" / ")}):`,
    ...slots.map((slot) => `• ${slot.label}: ${slot.value}`),
    ...(readingLines.length > 0 ? ["", "Readings:", ...readingLines] : []),
    "",
    "Summary:",
    `• ${brief.summary}`,
    `• What changed: ${display.whatChanged}`,
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
  const display = publishedBriefDisplay(brief);
  const decisions = decisionsInAreaOrder(brief).map((decision) =>
    [
      `• ${labelForArea(decision.area)}: ${display.sentence(decision.call)}`,
      `  - ${DECISION_CONTRACT_LABELS.slot.action}: ${display.sentence(decision.doNow)}`,
      `  - ${DECISION_CONTRACT_LABELS.threshold.pauseIf}: ${display.sentence(decision.pauseTrigger)}`,
      `  - ${DECISION_CONTRACT_LABELS.reversal.resumeWhen}: ${formatDecisionReversal(display.sentence(decision.resumeTrigger))}`,
    ].join("\n"),
  );

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
    ...(display.pauseIf ? [`• ${DECISION_CONTRACT_LABELS.threshold.pauseIf}: ${display.pauseIf}`] : []),
    `• ${DECISION_CONTRACT_LABELS.watch.postureFlips}: ${display.conditionsChangeIf}`,
    "",
    "What changed this week:",
    display.whatChanged,
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


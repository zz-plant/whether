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
import { formatWeekMondayUTC } from "../formatters";
import { weeklyHeadline } from "./reportEvidence";
import { z } from "zod";
import rawPublishedBriefs from "../../data/published_briefs.json";
import { formatIsoWeekSlug, getIsoWeekInfo } from "../isoWeek";
import { buildCanonicalUrl, buildOgImageUrl } from "../seo";
import { formatSignedDeltaOrNull, formatThresholdNumber } from "../formatters";
import { MARGIN_LABEL, formatMarginBand, formatDecisionReversal, formatDecisionThreshold, formatReadingsNow, publicDecisionLabels } from "./reportFormatting";
import { DECISION_CONTRACT_LABELS, POLICY_OVERRIDE_CALL, POLICY_OVERRIDE_CALL_UNNAMED } from "./reportCopy";
import { regimeSignalLabel } from "./signalTranslations";
import { getRegimePublicLabel } from "../regimePresentation";
import { buildBoundedConditionRails } from "./operatingCalls";
import { decisionAreaLabel, decisionAreaOrder, isDecisionArea } from "./boundedDecisionRules";
import { buildScoreReferenceLines } from "../export/scoreReference";
import { buildComparedWith, comparisonBasis } from "./comparisonBasis";
import { describeWeeklyMovement } from "./home/homeSectionModel";
import type { ComparedWith } from "./reportDataTypes";
import { evaluateRegime, type RegimeAssessment, type RegimeThresholds } from "../regimeEngine";
import { scoreStoredInputs } from "./comparisonReading";
import { basisClause, describePublishedWeekBasis, describeScoringBasis } from "./scoringBasis";

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
   * The engine that scored them (`ENGINE_VERSION`). Next week compares with these
   * scores as stored only under the same engine; under another it scores the record's
   * `inputs` again, and passes over a record that has none. Absent on records frozen
   * before it was stored.
   */
  engineVersion: z.string().optional(),
});

/**
 * What the engine scored the week's scores and conditions from, so that under a later
 * engine the next week can score them again and still compare with this record
 * (`buildStoredInputs` and `rescoreStoredInputs`, lib/report/comparisonReading.ts).
 * Only what the scorer reads for those: the yields the short-term rate and the curve
 * come from, the two short-term-rate prints the tightening-speed term measures
 * between, the corroborating market reads that adjust the scores (where the reading
 * had a value), and the VIX closes the market-stress veto means (where it had ten).
 * Absent on records frozen before 2026-10-07, and on one whose inputs did not
 * reproduce its scores when it was frozen.
 */
const PublishedBriefInputsSchema = z.object({
  yields: z.object({
    fedFunds: z.number().nullable().optional(),
    oneMonth: z.number().nullable(),
    threeMonth: z.number().nullable().optional(),
    twoYear: z.number().nullable(),
    tenYear: z.number().nullable(),
  }),
  baseRateWindow: z
    .object({
      compareDate: z.string(),
      compareValue: z.number(),
      latestDate: z.string(),
      latestValue: z.number(),
    })
    .optional(),
  macro: z.object({
    HY_CREDIT_SPREAD: z.number().optional(),
    CHICAGO_FCI: z.number().optional(),
    VIX_INDEX: z.number().optional(),
    VC_FUNDING_VELOCITY: z.number().optional(),
    TECH_LAYOFF_TREND: z.number().optional(),
  }),
  vixCloses: z.array(z.number()).optional(),
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
  /** The inputs `scores` and `regime` were scored from. Absent on records frozen before they were stored. */
  inputs: PublishedBriefInputsSchema.optional(),
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

/*
 * The readings the records w38 to w41 were frozen with, restated the way the
 * builders print them since 2026-10-09: same lines, same readings, no
 * parentheses. A change line's reading moves into its clause ("Funding pressure
 * falls 20 pts to 70 or below (90 today)" reads "Funding pressure falls 20 pts
 * from 90 to 70 or below"), and a line the reading already met states where the
 * score was, with the reading after the sentence ("Funding pressure is above 76
 * (already true at 90) or …" reads "Funding pressure is above 76 or …. Funding
 * pressure is 90 now.").
 */
const STORED_SCORE = "(funding pressure|risk appetite)";
const STORED_CHANGE_WITH_DISTANCE = new RegExp(`\\b${STORED_SCORE} (falls|rises) (\\d+) (pts?) (to \\d+ or below|to clear \\d+) \\((\\d+) today\\)`, "gi");
const STORED_CHANGE_BOUNDARY = new RegExp(`\\b${STORED_SCORE} (above|at or below) (\\d+) \\((\\d+) today\\)`, "gi");
const STORED_CHANGE_JOIN = new RegExp(` (or below|to clear \\d+) or ${STORED_SCORE}\\b`, "gi");
const STORED_MET_LINE = new RegExp(`\\b${STORED_SCORE} (is (?:at or )?(?:above|below)|above|at or below) (\\d+) \\(already true at (\\d+)\\)`, "gi");

const restateStoredReadings = (text: string): string => {
  const readings: Array<{ label: string; value: string }> = [];
  const restated = text
    .replace(STORED_CHANGE_WITH_DISTANCE, (_match, score: string, verb: string, distance: string, unit: string, target: string, now: string) =>
      `${score} ${verb} ${distance} ${unit} from ${now} ${target}`)
    .replace(STORED_CHANGE_BOUNDARY, (_match, score: string, side: string, line: string, now: string) =>
      side.toLowerCase() === "above" ? `${score} rises from ${now} to clear ${line}` : `${score} falls from ${now} to ${line} or below`)
    .replace(STORED_CHANGE_JOIN, (_match, end: string, score: string) => ` ${end}, or ${score}`)
    .replace(STORED_MET_LINE, (_match, score: string, state: string, line: string, now: string) => {
      readings.push({ label: score, value: now });
      return `${score} ${state.startsWith("is ") ? state : `is ${state}`} ${line}`;
    });
  if (readings.length === 0) return restated;
  const sentence = formatReadingsNow(readings);
  return restated.endsWith(".") ? `${restated} ${sentence}` : `${restated}. ${sentence}`;
};

/** A stored rule sentence in today's signal names, whole points and reading form. A sentence that needs none of them passes through. */
const translateStoredSentence = (text: string) =>
  restateStoredReadings(
    RETIRED_SIGNAL_PHRASES.reduce(
      (sentence, [pattern, replacement]) =>
        sentence.replace(pattern, (match) => (match.charAt(0) === match.charAt(0).toUpperCase() ? upperFirst(replacement) : replacement)),
      text,
    ).replace(WHOLE_POINT_DECIMAL, "$1"),
  );

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

/** The first record's change line, in the w38 form and then in today's reading form. */
const restateRetiredFlipLine = (text: string): string | null => {
  const restated = translateRetiredFlipLine(text);
  return restated === null ? null : restateStoredReadings(restated);
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
    confidence: formatMarginBand(brief.confidenceLabel === "MEDIUM" ? "MED" : brief.confidenceLabel),
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
    conditionsChangeIf: restateRetiredFlipLine(brief.flipThreshold) ?? translateStoredSentence(brief.flipThreshold),
    whatChanged: displayWhatChanged(brief, comparison),
    /**
     * Which inputs set the week's scores, from the engine its record names: "Scored on
     * more inputs than the record." for every week frozen before 2026-10-09, whose
     * scores counted the startup-market inputs and the credit reads. Said at render,
     * from the record, so no frozen field is edited.
     */
    basis: describeScoringBasis(brief.scores?.engineVersion),
    /** The earlier reading, as `buildScoreReferenceLines` takes it; null where the record can name none. */
    previous: comparison ? { ...comparison.previous, comparedWith: comparison.comparedWith } : null,
    /** A score's move in whole points, as the number and the rendered form ("+5 vs Sep 22") — the sign lives in `delta`, not in something a renderer parses out of the string. Null with no reading to name, or no move. */
    scoreChange: (metric: ScoreMetric) => {
      if (!comparison || !brief.scores) return null;
      const delta = Math.round(brief.scores[metric] - comparison.previous[metric]);
      const formatted = formatSignedDeltaOrNull(delta, 0);
      return formatted ? { delta, label: `${formatted} ${comparisonBasis(comparison.comparedWith).versus}` } : null;
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

/**
 * Consecutive weeks that published the same guidance, one entry each (2026-10-27).
 * /history listed a card per week, so four Freezing weeks read as four announcements
 * of two sentences. Same conditions and same summary make a run; newest first, as
 * `getPublishedBriefs`. Every week keeps its own page.
 */
export const groupPublishedBriefRuns = (list: readonly PublishedBrief[]): PublishedBrief[][] => {
  const runs: PublishedBrief[][] = [];
  for (const brief of list) {
    const run = runs.at(-1);
    const head = run?.at(0);
    if (run && head && head.regime === brief.regime && head.summary === brief.summary) run.push(brief);
    else runs.push([brief]);
  }
  return runs;
};

/** "Week of Oct 6, 2026", or "Weeks of Sep 15 – Oct 6, 2026" for a run. */
export const publishedBriefRunLabel = (run: readonly PublishedBrief[]): string => {
  const newest = run.at(0);
  const oldest = run.at(-1);
  if (!newest || !oldest) return "";
  const last = publishedBriefWeekLabel(newest);
  if (run.length === 1) return `Week of ${last}`;
  const first = publishedBriefWeekLabel(oldest);
  const year = last.slice(-6);
  return `Weeks of ${first.endsWith(year) ? first.slice(0, -6) : first} – ${last}`;
};

const HELD_CALLS = new Set(
  [...Object.values(POLICY_OVERRIDE_CALL), POLICY_OVERRIDE_CALL_UNNAMED].map((hold) => hold.currentCall.trim()),
);

/**
 * A frozen week's headline action, through the same source as the live brief
 * (`weeklyHeadline`): the stored call, with the stored action's direction.
 */
export const publishedBriefHeadline = (brief: Pick<PublishedBrief, "actionNow" | "summary">) =>
  weeklyHeadline({
    actionNow: brief.actionNow,
    currentCall: brief.summary,
    /* A record stores no hold flag; a held week stored the hold's own call. */
    policyOverrideActive: HELD_CALLS.has(brief.summary.trim()),
  });

/** The week's name: its Monday (`formatWeekMondayUTC`), never the record's own weekday. */
/**
 * A stored correction opens with its own verb ("Corrected Sep 30, 2026. …"), and every
 * surface prints it after a "Correction" label, so until 2026-10-21 the page and both
 * paste formats read "Correction: Corrected Sep 30, 2026." The record stays as stored;
 * only the doubled verb is dropped when it is printed.
 */
export const correctionBody = (correction: string) => correction.replace(/^Corrected\s+/i, "");

export const publishedBriefWeekLabel = (brief: Pick<PublishedBrief, "recordDate">) => formatWeekMondayUTC(brief.recordDate);

/** The page's `<h1>` and `<title>`; the news sitemap must carry the same words. */
export const buildPublishedBriefTitle = (brief: PublishedBrief) =>
  `${publishedBriefDisplay(brief).conditions}: guidance for the week of ${publishedBriefWeekLabel(brief)}`;

/* About what a search result shows of a description. */
const BRIEF_DESCRIPTION_LIMIT = 160;

const firstSentence = (text: string) => /^.*?[.!?](?=\s|$)/.exec(text)?.[0] ?? text;

/* The guidance, then what moved: in full if it fits a snippet, else its first sentence. */
const preferredBriefDescription = (brief: PublishedBrief): string | undefined => {
  const { whatChanged } = publishedBriefDisplay(brief);
  return [`${brief.summary} What changed: ${whatChanged}`, `${brief.summary} ${firstSentence(whatChanged)}`].find(
    (candidate) => candidate.length <= BRIEF_DESCRIPTION_LIMIT,
  );
};

/**
 * A published week's meta description, different from every other week's.
 *
 * The summary is the conditions' own sentence, so every week under the same
 * conditions shares it. w40 and w41 shipped the identical description ("Approve
 * only renewals, work already promised to customers, and hires that bring in
 * revenue."), because each one's "what changed" ran past the snippet and the
 * page fell back to the summary alone. Where the preferred wording is too long
 * or another week would carry the same words, the week's date leads, and no two
 * weeks share a date.
 */
export const buildPublishedBriefDescription = (brief: PublishedBrief, siblings: readonly PublishedBrief[] = briefs) => {
  const preferred = preferredBriefDescription(brief);
  const shared = siblings.some((other) => other.slug !== brief.slug && preferredBriefDescription(other) === preferred);
  return preferred !== undefined && !shared ? preferred : `Week of ${publishedBriefWeekLabel(brief)}: ${brief.summary}`;
};

/**
 * The week's card, as its page, its feed item and its news sitemap entry all
 * name it: the conditions in the weather words and the week as a date, not the
 * archive's slug. One builder, so the image a feed reader or Discover shows is
 * the one the page declares.
 */
export const buildPublishedBriefImageParams = (brief: PublishedBrief) => ({
  template: "brief-chart",
  week: publishedBriefWeekLabel(brief),
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
  /* The newest frozen week at or before the reading. It was the newest frozen week
     whatever the reading's date: a negative age passed the staleness gate, so a
     replayed or saved reading (Aug 28) cited a later week (w40, frozen Sep 29) as
     its "Permanent record", and every freeze moved the pinned brief formats, which
     fails the freeze routine's own push at the pre-push gate. */
  const brief = briefs.find((candidate) => {
    const age = publishedBriefAgeInDays(candidate, currentRecordDate);
    return age !== null && age >= 0;
  });
  if (!brief) {
    return undefined;
  }

  const age = publishedBriefAgeInDays(brief, currentRecordDate);

  if (age === null || age > PUBLISHED_BRIEF_STALE_AFTER_DAYS) {
    return undefined;
  }

  return brief;
};

/**
 * Why the live reading's conditions differ from the citable published week's,
 * where the record basis is the reason (`describePublishedWeekBasis`): the
 * week's stored inputs scored by today's engine show its conditions came from
 * inputs the record cannot test. Null for a week that stored no inputs, and
 * wherever the basis does not explain the difference. The homepage says it,
 * once, in its status strip.
 */
export const describeCitableBriefBasis = ({
  currentRecordDate,
  live,
  thresholds,
}: {
  currentRecordDate: string;
  live: Pick<RegimeAssessment, "regime">;
  thresholds: RegimeThresholds;
}): string | null => {
  const brief = selectCitablePermalinkBrief(currentRecordDate);
  if (!brief?.inputs) return null;
  return describePublishedWeekBasis({
    live,
    published: { regime: brief.regime, weekLabel: publishedBriefWeekLabel(brief), engineVersion: brief.scores?.engineVersion },
    rescored: scoreStoredInputs(evaluateRegime, thresholds, brief.inputs, brief.recordDate),
  });
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
      `  ${publicDecisionLabels.threshold}: ${formatDecisionThreshold(display.sentence(decision.pauseTrigger))}`,
      `  ${publicDecisionLabels.reversal}: ${formatDecisionReversal(display.sentence(decision.resumeTrigger))}`,
    ].join("\n"),
  );

  const evidenceLines = brief.evidence.map((item) => `• ${display.evidenceTitle(item.title)} — ${item.detail}`);
  /* The slots the record can fill: w31 names no pause line (`publishedBriefDisplay`). */
  /* One headline (`publishedBriefHeadline`). The stored action printed under
     the do-now slot beside it, and the call again under "Summary", so the paste said
     the week's instruction three times in two versions. */
  const slots = [
    { label: publicDecisionLabels.call, value: publishedBriefHeadline(brief).composed },
    ...(display.pauseIf ? [{ label: publicDecisionLabels.threshold, value: display.pauseIf }] : []),
    { label: DECISION_CONTRACT_LABELS.watch.postureFlips, value: display.conditionsChangeIf },
  ];

  /* The page's order: the call, what changed, one row per area, evidence, sources. */
  return [
    `Whether Weekly Brief — ${brief.recordDateLabel}`,
    `Conditions: ${display.conditions} (margin: ${display.confidence.toLowerCase()})`,
    "",
    `This week's decision (${slots.map((slot) => slot.label).join(" / ")}):`,
    ...slots.map((slot) => `• ${slot.label}: ${slot.value}`),
    ...(readingLines.length > 0 ? ["", "Readings:", ...readingLines] : []),
    "",
    `What changed: ${display.whatChanged}`,
    ...(decisions.length > 0 ? ["", "Operating limits by area:", ...decisions] : []),
    ...(evidenceLines.length > 0 ? ["", "Evidence:", ...evidenceLines] : []),
    ...(brief.correction ? ["", `Correction: ${correctionBody(brief.correction)}`] : []),
    "",
    "Provenance:",
    `Record date ${brief.recordDateLabel} · ${display.source} · captured ${brief.freshnessLabel} · ${basisClause(display.basis.sentence)}`,
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
      `  - ${DECISION_CONTRACT_LABELS.threshold.pauseIf}: ${formatDecisionThreshold(display.sentence(decision.pauseTrigger))}`,
      `  - ${DECISION_CONTRACT_LABELS.reversal.resumeWhen}: ${formatDecisionReversal(display.sentence(decision.resumeTrigger))}`,
    ].join("\n"),
  );

  const evidenceLines = brief.evidence.map((item) => `• ${display.evidenceTitle(item.title)}: ${item.detail}`);

  /* The page's order: the call, what changed, one row per area, evidence, sources. */
  return [
    `Whether Leadership Update — Week of ${publishedBriefWeekLabel(brief)}`,
    "",
    `Conditions: ${display.conditions}`,
    `${MARGIN_LABEL}: ${display.confidence.toLowerCase()}`,
    "",
    "This week's guidance:",
    `• ${publicDecisionLabels.call}: ${publishedBriefHeadline(brief).composed}`,
    ...(display.pauseIf ? [`• ${DECISION_CONTRACT_LABELS.threshold.pauseIf}: ${display.pauseIf}`] : []),
    `• ${DECISION_CONTRACT_LABELS.watch.postureFlips}: ${display.conditionsChangeIf}`,
    "",
    "What changed this week:",
    display.whatChanged,
    ...readingLines,
    ...(decisions.length > 0 ? ["", "Area decisions:", ...decisions] : []),
    ...(evidenceLines.length > 0 ? ["", "Evidence:", ...evidenceLines] : []),
    ...(brief.correction ? ["", `Correction note: ${correctionBody(brief.correction)}`] : []),
    "",
    "Provenance & citations:",
    `• Record date: ${brief.recordDateLabel}`,
    `• Source: ${display.source}${brief.sourceUrl ? ` (${brief.sourceUrl})` : ""}`,
    `• Freshness: ${brief.freshnessLabel}`,
    `• ${display.basis.sentence}`,
    "",
    `Permanent URL: ${permalinkUrl}`,
  ].join("\n");
};

/**
 * Generates a date-pinned executive board / investor update constructed strictly from PublishedBrief.
 * Never fetches live report data or external endpoints.
 */
export const buildPublishedBriefBoardUpdate = (brief: PublishedBrief): string => {
  const permalinkUrl = buildCanonicalUrl(buildPublishedBriefPath(brief.slug));
  const readingLines = buildPublishedBriefReadingLines(brief);
  const display = publishedBriefDisplay(brief);
  const decisions = decisionsInAreaOrder(brief).map((decision) =>
    `• ${labelForArea(decision.area)}: ${display.sentence(decision.call)} (${DECISION_CONTRACT_LABELS.slot.action}: ${display.sentence(decision.doNow)})`,
  );

  return [
    `Whether Board Memo — Week of ${publishedBriefWeekLabel(brief)}`,
    `Macro Posture: ${display.conditions} (${MARGIN_LABEL}: ${display.confidence.toLowerCase()})`,
    "",
    `Executive Guidance: ${publishedBriefHeadline(brief).composed}`,
    ...(display.pauseIf ? [`Operating Threshold: ${display.pauseIf}`] : []),
    `Posture Flips If: ${display.conditionsChangeIf}`,
    ...(readingLines.length > 0 ? ["", "Macro Readings:", ...readingLines] : []),
    ...(decisions.length > 0 ? ["", "Operating Limits by Area:", ...decisions] : []),
    "",
    `Permanent Record: ${permalinkUrl} · Captured ${brief.freshnessLabel}`,
  ].join("\n");
};



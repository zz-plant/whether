import { DEFAULT_THRESHOLDS, evaluateRegime } from "../regimeEngine";
import { buildSignalInfluence } from "./regimeDescription";
import { getPlaybookGuidance } from "../playbook";
import { buildCanonicalBoundedDecisionRules, SPENDING_PAYBACK_BAR_MONTHS } from "./boundedDecisionRules";
import { signalOrder } from "./briefFormatting";
import { resolveLineDistanceLabel } from "./confidence";
import { formatBoundaryDistance, formatConfidencePlainLabel } from "./reportFormatting";
import { formatScoreValue } from "../formatters";
import { regimeSignalLabel } from "./signalTranslations";
import { normalizeSignalContributions } from "./signalFormatting";
import { buildActionStripItems } from "./operatingCalls";
import type {
  ComparedWith,
  ReportDynamics,
  ReportEvidenceItem,
} from "./reportDataTypes";
import type { RegimeKey } from "../regimeEngine";

type WeeklyTone = "tightening" | "easing" | "holding";

// The headline is the week's direction applied to the regime's posture. It used
// to ignore the regime, so a Sunny week that softened a little read "freeze new
// commitments" above a card that said scale proven bets — the two surfaces
// disagreed about the same call. Direction picks the row; regime picks the verb.
//
// Two sentences, not a fragment and a dash. "Conditions tightening — freeze…"
// is the page's h1 and the first line of every Slack post, and a noun phrase
// hinged on an em dash is the shape a reader has learned to recognise as
// machine copy. The first sentence says what happened, the second what to do.
const ACTION_NOW_BY_REGIME: Record<RegimeKey, Record<WeeklyTone, string>> = {
  EXPANSION: {
    tightening: "Conditions are tightening. Keep what is working, and don't start anything new this week.",
    easing: "Conditions are easing. Grow what is working, one milestone at a time.",
    holding: "Conditions are holding. Keep growing what is working at the current pace.",
  },
  VOLATILE: {
    tightening: "Conditions are tightening. Keep only the bets you can stop, and run fewer experiments at once.",
    easing: "Conditions are easing. Restart paused work one item at a time.",
    holding: "Conditions are holding. Only start things one person can stop.",
  },
  DEFENSIVE: {
    tightening: "Conditions are tightening. Freeze new commitments and keep spend flexible.",
    easing: "Conditions are easing. Resume paused work with clear milestones.",
    holding: "Conditions are holding. Continue at the current pace, with a number on each outcome.",
  },
  SCARCITY: {
    tightening: "Conditions are tightening. Freeze new commitments and protect runway.",
    easing: "Conditions are easing. Resume paused work with clear milestones.",
    holding: `Conditions are holding. Keep spend flat and require paybacks inside ${SPENDING_PAYBACK_BAR_MONTHS} months.`,
  },
};

/* What the week's direction reads as beside the regime word on the brief's card,
   where the call itself prints the action alone. */
const WEEKLY_DIRECTION_LABEL: Record<WeeklyTone, string> = {
  tightening: "Tightening this week",
  easing: "Easing this week",
  holding: "Holding this week",
};

const DIRECTION_SENTENCE = /^Conditions are (tightening|easing|holding)\.\s+/;
const isWeeklyTone = (value: string): value is WeeklyTone =>
  value === "tightening" || value === "easing" || value === "holding";

/**
 * The call as the card prints it: the action, with the week's direction as a
 * label for the stamp line. The composed call opens "Conditions are
 * tightening." under a stamp that already says Freezing and a line that says
 * money is expensive, so on the card the conditions were stated three times
 * before the action. Pastes and the sticky strip keep the composed call: they
 * carry no stamp. A call this table did not compose comes back whole.
 */
export const splitWeeklyCall = (call: string): { action: string; directionLabel?: string } => {
  const match = DIRECTION_SENTENCE.exec(call);
  const tone = match?.[1];
  if (!match || !tone || !isWeeklyTone(tone)) return { action: call };
  return { action: call.slice(match[0].length), directionLabel: WEEKLY_DIRECTION_LABEL[tone] };
};

export const buildActionNowShort = ({
  directionLabel,
  regimeChanged,
  regime = "DEFENSIVE",
}: Pick<ReportDynamics, "directionLabel" | "regimeChanged"> & { regime?: RegimeKey }): string => {
  const tone: WeeklyTone =
    directionLabel === "improving"
      ? "easing"
      : regimeChanged || directionLabel === "deteriorating"
        ? "tightening"
        : "holding";
  return ACTION_NOW_BY_REGIME[regime][tone];
};

export const buildGuidanceBundleFromAssessment = (assessment: ReturnType<typeof evaluateRegime>) => {
  const { playbook, startItems, stopItems } = getPlaybookGuidance(assessment.regime, {
    thresholds: assessment.thresholds,
    scores: assessment.scores,
  });
  const actionStripItems = buildActionStripItems(
    buildCanonicalBoundedDecisionRules({
      regime: assessment.regime,
      thresholds: assessment.thresholds,
      scores: assessment.scores,
    }),
  );

  return {
    playbook,
    startItems,
    stopItems,
    actionStripItems,
  };
};

/**
 * The conditions that would flip the current call, as one bounded condition.
 *
 * This used to return three sentences: a status ("No flip condition is tripped
 * yet.") followed by two that each repeated "flips this call". Every slot that
 * renders it already carries that verb in its label — "Reversal:", "This
 * recommendation breaks if:" — so the sentence spent its first clause saying
 * what the label said and its next two repeating each other. Worse, the
 * compaction helpers cut a phrase at its first period, so the Slack export of a
 * frozen brief read "Re-open when: No flip condition is tripped yet." and
 * carried no threshold at all.
 *
 * One sentence now, both boundaries, each with its live reading in parentheses.
 * A boundary already crossed says so in place of the status preamble, and sorts
 * first, because that is the half an operator has to act on.
 *
 * The distance leads. "Funding pressure at or below 70 (83 today)" handed the
 * reader a subtraction; the number that changes a plan is how far away the
 * line is, in the units the rail beside it draws, so the sentence opens with
 * it — "Funding pressure falls 13 pts to 70 or below (83 today)" — the way a rain alert
 * opens with the minutes, not the radar. The boundary and the live reading
 * stay, because the archive and the embed cite them.
 */
export const buildFlipThreshold = (
  assessment: {
    regime: RegimeKey;
    thresholds: Pick<ReturnType<typeof evaluateRegime>["thresholds"], "tightnessRegime" | "riskAppetiteRegime">;
    scores: { tightness: number; riskAppetite: number };
  },
  /** One score's half alone, for a page about the decisions that score rules. */
  only?: "tightness" | "riskAppetite",
): string => {
  const tightnessThreshold = assessment.thresholds.tightnessRegime;
  const riskThreshold = assessment.thresholds.riskAppetiteRegime;
  const tightnessNow = assessment.scores?.tightness;
  const riskNow = assessment.scores?.riskAppetite;

  const conditionText = ({
    label,
    now,
    threshold,
    direction,
  }: {
    label: string;
    now: number;
    threshold: number;
    direction: "riseAbove" | "fallToOrBelow";
  }) => {
    const boundary = direction === "riseAbove"
      ? `above ${formatScoreValue(threshold)}`
      : `at or below ${formatScoreValue(threshold)}`;

    if (typeof now !== "number" || !Number.isFinite(now)) {
      return { text: `${label} ${boundary}`, tripped: false };
    }

    const tripped = direction === "riseAbove" ? now > threshold : now <= threshold;
    if (tripped) {
      return { text: `${label} ${boundary} (already true at ${formatScoreValue(now)})`, tripped };
    }

    // Distance to the line, whole points: the scores are published as integers
    // and a fraction here would be precision the reader cannot act on. The two
    // directions keep their inequality — reaching 70 flips an "at or below"
    // boundary, reaching 50 does not flip an "above" one, so that side says
    // "clear".
    const distance = Math.max(1, Math.round(Math.abs(threshold - now)));
    const unit = distance === 1 ? "pt" : "pts";
    const move = direction === "riseAbove"
      ? `rises ${distance} ${unit} to clear ${formatScoreValue(threshold)}`
      : `falls ${distance} ${unit} to ${formatScoreValue(threshold)} or below`;
    return { text: `${label} ${move} (${formatScoreValue(now)} today)`, tripped };
  };

  const tightnessDirection: "riseAbove" | "fallToOrBelow" =
    assessment.regime === "SCARCITY" || assessment.regime === "DEFENSIVE" ? "fallToOrBelow" : "riseAbove";
  const riskDirection: "riseAbove" | "fallToOrBelow" =
    assessment.regime === "SCARCITY" || assessment.regime === "VOLATILE" ? "riseAbove" : "fallToOrBelow";

  const conditions = [
    ...(only === "riskAppetite"
      ? []
      : [conditionText({ label: regimeSignalLabel.tightness, now: tightnessNow, threshold: tightnessThreshold, direction: tightnessDirection })]),
    ...(only === "tightness"
      ? []
      : [conditionText({ label: regimeSignalLabel.riskAppetite, now: riskNow, threshold: riskThreshold, direction: riskDirection })]),
  ];

  // Stable sort: a crossed boundary leads, otherwise the declared order holds.
  const ordered = [...conditions].sort((a, b) => Number(b.tripped) - Number(a.tripped));

  // Signal names are capitalized as labels but sit mid-sentence after "or" here,
  // matching how the bounded rules already write them in prose.
  return `${ordered
    .map((condition, index) =>
      index === 0 ? condition.text : condition.text.charAt(0).toLowerCase() + condition.text.slice(1),
    )
    .join(" or ")}.`;
};

const signalAnomalyThresholds: Record<ReportDynamics["changedSignals"][number]["key"], number> = {
  tightness: 90,
  riskAppetite: 50,
  baseRate: 1.5,
  curveSlope: 1,
};

const signalDeltaImprovesWhen: Record<ReportDynamics["changedSignals"][number]["key"], "positive" | "negative"> = {
  tightness: "negative",
  riskAppetite: "positive",
  baseRate: "negative",
  curveSlope: "positive",
};

export const isImprovingSignalDelta = (
  key: ReportDynamics["changedSignals"][number]["key"],
  delta: number,
): boolean => (signalDeltaImprovesWhen[key] === "positive" ? delta > 0 : delta < 0);

const resolveSignalInfluence = (assessment: ReturnType<typeof evaluateRegime>) =>
  normalizeSignalContributions(
    assessment.signalInfluence ??
      buildSignalInfluence({
        tightness: assessment.scores.tightness,
        riskAppetite: assessment.scores.riskAppetite,
        baseRate: assessment.scores.baseRate,
        curveSlope: assessment.scores.curveSlope,
        thresholds: (assessment as { thresholds?: typeof DEFAULT_THRESHOLDS }).thresholds ?? DEFAULT_THRESHOLDS,
      }),
  );

/* Evidence items are titled with the canonical signal names. Funding pressure
   used to be titled "Capital conditions", a name the site retired, on
   /api/cli/diagnostics and the capital-tightness watch pages; frozen briefs that
   stored it are translated at render (`publishedBriefs.ts`). */
const signalLabels: Record<ReportDynamics["changedSignals"][number]["key"], string> = regimeSignalLabel;

/* The line each signal's distance is read against. Base rate and the recession
   warning gauge have no line of their own (their bullet says so); they feed the
   guidance, so they read its nearest line. */
const evidenceLineBySignal: Record<ReportDynamics["changedSignals"][number]["key"], "tightness" | "riskAppetite" | "nearest"> = {
  tightness: "tightness",
  riskAppetite: "riskAppetite",
  baseRate: "nearest",
  curveSlope: "nearest",
};

/* The recession warning gauge's line, stated in the Spending rule's bar. It
   used to set a cap of its own — 12 months with the curve above zero, 9 below —
   beside a Spending rule that says 6 in every condition, and to attach
   conditions that could not hold: the 12-month branch said "reopen
   longer-payback work after the curve returns above 0.0%" when it was only
   chosen with the curve already above zero, and "funding pressure stays below
   70" printed in a week at 90. No rule lengthens the bar, so the line promises
   no reopening and states no condition; it says what the gauge's move does to
   the bar, which is nothing. */
const curveSlopeImplication = (delta: number): string =>
  delta > 0
    ? `Keep the ${SPENDING_PAYBACK_BAR_MONTHS}-month payback bar on new spend; a rising gauge does not lengthen it.`
    : `Keep the ${SPENDING_PAYBACK_BAR_MONTHS}-month payback bar on new spend; a falling gauge is a reason to hold it, not stretch it.`;

const signalImmediateImplication = (
  key: ReportDynamics["changedSignals"][number]["key"],
  delta: number,
) => {
  if (delta === 0) {
    return "No material operating change this week.";
  }

  if (key === "tightness") {
    return delta > 0
      ? "Tighten approvals and protect runway for fixed-cost commitments."
      : "Release selective approvals while keeping commitments reversible.";
  }

  if (key === "riskAppetite") {
    return delta > 0
      ? "Increase reversible experiments where payback stays visible."
      : "Bias toward proof-first launches and smaller bet sizes.";
  }

  if (key === "baseRate") {
    return delta > 0
      ? "Shorten payback windows before approving net-new spend."
      : "Maintain discipline while testing selective long-payback upside.";
  }

  return curveSlopeImplication(delta);
};

export const buildReportEvidenceItems = ({
  reportDynamics,
  assessment,
  lastUpdated,
}: {
  reportDynamics: ReportDynamics;
  assessment: ReturnType<typeof evaluateRegime>;
  lastUpdated: string | null;
}): ReportEvidenceItem[] =>
  signalOrder.map((key) => {
    const movedSignal = reportDynamics.changedSignals.find((item) => item.key === key);
    const delta = movedSignal?.delta ?? 0;
    /* Which way is worse depends on the signal. This read the delta's sign
       alone, so risk appetite falling 56 to 48 printed "Easing" and the
       recession warning gauge rising printed "Tightening" — the opposite of
       every other surface that judges the same move (`isImprovingSignalDelta`,
       the weekly direction, /api/cli/changes). */
    const directionLabel: ReportEvidenceItem["directionLabel"] =
      delta === 0 ? "Unchanged" : isImprovingSignalDelta(key, delta) ? "Easing" : "Tightening";

    const thresholdDistance =
      key === "tightness"
        ? Math.abs(assessment.scores.tightness - assessment.thresholds.tightnessRegime)
        : key === "riskAppetite"
          ? Math.abs(assessment.scores.riskAppetite - assessment.thresholds.riskAppetiteRegime)
          : null;

    const supportingBullets = [
      delta === 0
        ? "No measurable move against the prior snapshot."
        : `Moved ${delta > 0 ? "+" : ""}${delta.toFixed(1)} against the prior snapshot, ${directionLabel.toLowerCase()} the read.`,
      thresholdDistance === null
        ? `${signalLabels[key]} feeds this week's guidance but has no line of its own that changes it.`
        : formatBoundaryDistance({
            label: signalLabels[key],
            points: thresholdDistance,
            threshold: key === "tightness" ? assessment.thresholds.tightnessRegime : assessment.thresholds.riskAppetiteRegime,
          }),
    ];

    return {
      key,
      title: signalLabels[key],
      lastUpdated,
      supportingBullets,
      /* The label's words are about distance from the line ("High (well clear
         of the line where conditions change)"), and it used to be chosen by
         the size of the week's move instead: risk appetite falling 8 points
         printed "well clear" on a page that said it sat 2 points from its
         line. It reads the distance now, in the published confidence's bands. */
      confidenceLabel: formatConfidencePlainLabel(resolveLineDistanceLabel(assessment, evidenceLineBySignal[key])),
      directionLabel,
      immediateImplication: signalImmediateImplication(key, delta),
    };
  });

export const buildReportDynamics = ({
  current,
  previous,
  comparedWith,
  movement,
}: {
  current: ReturnType<typeof evaluateRegime>;
  previous: ReturnType<typeof evaluateRegime> | null;
  /** Which reading `previous` is, so the moves can be named against it. */
  comparedWith?: ComparedWith;
  /** What each score's move is made of, from `buildScoreMovement`. */
  movement?: ReportDynamics["movement"];
}): ReportDynamics => {
  if (!previous) {
    /* No previous reading is not a quiet week. Reporting "stable" here made the
       absence of a comparison indistinguishable from a comparison that found
       nothing, and every renderer downstream reads the second meaning. */
    return {
      changedSignals: [],
      anomalySignals: [],
      totalSignalChanges: 0,
      regimeChanged: false,
      directionLabel: "unavailable",
      signalContributions: resolveSignalInfluence(current),
    };
  }

  const comparisons = [
    {
      key: "tightness" as const,
      label: signalLabels.tightness,
      delta: current.scores.tightness - previous.scores.tightness,
    },
    {
      key: "riskAppetite" as const,
      label: signalLabels.riskAppetite,
      delta: current.scores.riskAppetite - previous.scores.riskAppetite,
    },
    {
      key: "baseRate" as const,
      label: signalLabels.baseRate,
      delta: current.scores.baseRate - previous.scores.baseRate,
    },
    {
      key: "curveSlope" as const,
      label: signalLabels.curveSlope,
      delta: (current.scores.curveSlope ?? 0) - (previous.scores.curveSlope ?? 0),
    },
  ].filter((item) => Math.abs(item.delta) >= 0.01);

  const { anomalies, changes } = comparisons.reduce(
    (accumulator, item) => {
      const maxExpectedDelta = signalAnomalyThresholds[item.key];
      if (Math.abs(item.delta) > maxExpectedDelta) {
        accumulator.anomalies.push({
          ...item,
          reason: `Exceeded weekly sanity threshold of ±${maxExpectedDelta}.`,
        });
        return accumulator;
      }

      accumulator.changes.push(item);
      return accumulator;
    },
    {
      anomalies: [] as Array<{
        key: "tightness" | "riskAppetite" | "baseRate" | "curveSlope";
        label: string;
        delta: number;
        reason: string;
      }>,
      changes: [] as typeof comparisons,
    },
  );

  const sortedChanges = changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const improvingMoves = sortedChanges.filter((item) => isImprovingSignalDelta(item.key, item.delta)).length;
  const deterioratingMoves = sortedChanges.filter((item) => !isImprovingSignalDelta(item.key, item.delta)).length;
  const directionLabel: ReportDynamics["directionLabel"] =
    sortedChanges.length === 0
      ? "stable"
      : improvingMoves > 0 && deterioratingMoves > 0
        ? "mixed"
        : improvingMoves > 0
          ? "improving"
          : "deteriorating";

  return {
    changedSignals: sortedChanges,
    anomalySignals: anomalies,
    totalSignalChanges: sortedChanges.length,
    regimeChanged: current.regime !== previous.regime,
    directionLabel,
    ...(comparedWith ? { comparedWith } : {}),
    ...(movement ? { movement } : {}),
    signalContributions: resolveSignalInfluence(current),
  };
};

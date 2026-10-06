import type { DecisionDepartment } from "../decisionMemory";
import { getRegimePublicLabel } from "../regimePresentation";
import { sharedDecisionLines } from "../report/boundedDecisionRules";
import { RISK_APPETITE_REGIME_THRESHOLD, TIGHTNESS_REGIME_THRESHOLD } from "../regimeEngineCore";
import type { FlashMove } from "./flashMoves";
import { regimeSignalLabel } from "../report/signalTranslations";

type RolePreset = "CFO" | "COO" | "CTO" | "CPO";

export type AlertConditions = {
  regime: string;
  tightness: number;
  riskAppetite: number;
  posture: string;
  recordDate: string;
  /** Raw-input moves since the previous read that clear a flash threshold (`flashMoves.ts`). */
  flashMoves?: FlashMove[];
  /** The change lines the reading was judged against; the published defaults when absent. */
  thresholds?: { tightnessRegime: number; riskAppetiteRegime: number };
  /** The reading before this one, for judging a subscriber's own plan lines (`planLines.ts`). */
  previousScores?: { tightness: number; riskAppetite: number } | null;
};

export type LastAlertState = {
  regime: string;
  tightness: number;
  riskAppetite: number;
  lastSentAt: string;
};

/** Which score crossed. Structural, because delivery picks the email template
 *  from it — it used to substring-match the headline for "tightness", which made
 *  a copy edit able to silently misroute every threshold alert. */
type AlertMetric = "credit" | "sentiment";

/**
 * One line a reader is told about when a score crosses it: the pause and resume
 * lines every area's rule shares, and the line where conditions change.
 * `holdsWhen` is the side on which a pause or resume holds; a change line has none.
 */
export type PublishedLine = {
  metric: "tightness" | "riskAppetite";
  value: number;
  kind: "pause" | "change" | "resume";
  holdsWhen: "above" | "below" | null;
};

export type AlertDecision = {
  type: "regime_change" | "threshold" | "flash";
  severity: "info" | "warning" | "critical";
  headline: string;
  /** Set on threshold alerts; absent on regime changes. */
  metric?: AlertMetric;
  /** Set on threshold alerts: the line that was crossed. */
  line?: PublishedLine;
  /** Set on flash alerts: the move that fired. */
  flash?: FlashMove;
  /** Department and executive role preset most impacted by this alert. */
  department?: DecisionDepartment;
  rolePreset?: RolePreset;
};

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The lines a threshold alert watches, from the same source as the rules.
 *
 * These were the fixed marks 50 and 75 on both scores, which no rule uses: the
 * pause and resume lines sit at 76 / 66 on funding pressure and 44 / 54 on risk
 * appetite, and the change lines at 70 and 50. So the alert the homepage offers
 * ("an email the day a score crosses its line") fired at marks the page never
 * printed, and the email called 75 "the pause line".
 */
export const publishedScoreLines = (
  thresholds: { tightnessRegime: number; riskAppetiteRegime: number } = {
    tightnessRegime: TIGHTNESS_REGIME_THRESHOLD,
    riskAppetiteRegime: RISK_APPETITE_REGIME_THRESHOLD,
  },
): PublishedLine[] => {
  const lines = sharedDecisionLines(thresholds);
  return [
    { metric: "tightness", value: lines.tightnessPause, kind: "pause", holdsWhen: "above" },
    { metric: "tightness", value: thresholds.tightnessRegime, kind: "change", holdsWhen: null },
    { metric: "tightness", value: lines.tightnessResume, kind: "resume", holdsWhen: "below" },
    { metric: "riskAppetite", value: lines.riskPause, kind: "pause", holdsWhen: "below" },
    { metric: "riskAppetite", value: thresholds.riskAppetiteRegime, kind: "change", holdsWhen: null },
    { metric: "riskAppetite", value: lines.riskResume, kind: "resume", holdsWhen: "above" },
  ];
};

const LINE_WEIGHT: Record<PublishedLine["kind"], number> = { pause: 3, change: 2, resume: 1 };

/* Internal only: the regime flip test for evaluateAlert. The cron's own regime-change
   check is lib/alert/checkRegimeChange.ts, a different function with the same name. */
const checkRegimeChange = (
  currentRegime: string,
  lastRegime: string,
): boolean => currentRegime !== lastRegime;

const checkThresholdCrossing = (
  currentScore: number,
  threshold: number,
  lastScore?: number,
): boolean => {
  if (lastScore === undefined) {
    return false;
  }
  const crossedAbove =
    lastScore <= threshold && currentScore > threshold;
  const crossedBelow =
    lastScore >= threshold && currentScore < threshold;
  return crossedAbove || crossedBelow;
};

const buildRegimeDecision = (regime: string): AlertDecision => ({
  type: "regime_change",
  severity: "critical",
  headline: `Conditions turned ${getRegimePublicLabel(regime)}`,
  department: "Executive",
  rolePreset: "CFO",
});

const buildThresholdDecision = (line: PublishedLine, score: number): AlertDecision => {
  const metric: AlertMetric = line.metric === "tightness" ? "credit" : "sentiment";
  const label = regimeSignalLabel[line.metric];
  return {
    type: "threshold",
    severity: line.kind === "resume" ? "info" : "warning",
    headline: `${label} crossed ${line.value} (now ${score.toFixed(1)})`,
    metric,
    line,
    department: metric === "credit" ? "Finance" : "Operations",
    rolePreset: metric === "credit" ? "CFO" : "COO",
  };
};

/**
 * The one line per score worth a letter. A score that jumps from 63 to 90 passes
 * 66, 70 and 76 in one move; three emails about one move would be the noise this
 * stream promises not to make, so the letter names the line that matters most,
 * pause before change before resume.
 */
const mostSignificantCrossing = (lines: PublishedLine[], current: number, last: number): PublishedLine | null =>
  lines
    .filter((line) => checkThresholdCrossing(current, line.value, last))
    .sort((a, b) => LINE_WEIGHT[b.kind] - LINE_WEIGHT[a.kind])[0] ?? null;

/*
 * A flash is an emergency-sized move in a raw input, so it goes to the CFO like
 * a regime change and, like one, is not held back by the weekly cooldown: the
 * cooldown exists so a score oscillating on a boundary does not mail every day,
 * and a quarter-point overnight move is the opposite of that.
 */
const buildFlashDecision = (move: FlashMove): AlertDecision => ({
  type: "flash",
  severity: "critical",
  headline: move.headline,
  flash: move,
  department: "Executive",
  rolePreset: "CFO",
});

/** The key a delivery is deduplicated on. Two different inputs flashing in one week are two alerts. */
export const alertDeliveryKey = (alert: AlertDecision): string => {
  if (alert.type === "flash" && alert.flash) return `flash:${alert.flash.metric}`;
  /* Per score: a funding-pressure crossing and a risk-appetite crossing in one
     week are two facts, and one key made the second a silent skip. */
  if (alert.type === "threshold" && alert.line) return `threshold:${alert.line.metric}`;
  return alert.type;
};

const bypassesCooldown = (alert: AlertDecision) => alert.type === "regime_change" || alert.type === "flash";

const isWithinCooldown = (lastSentAt: string): boolean => {
  const lastMs = Date.parse(lastSentAt);
  if (Number.isNaN(lastMs)) {
    return false;
  }
  return Date.now() - lastMs < ONE_WEEK_MS;
};

export const evaluateAlert = (
  readiness: AlertConditions,
  lastKnown: LastAlertState | null,
): AlertDecision[] => {
  const decisions: AlertDecision[] = [];

  const regimeChanged = lastKnown
    ? checkRegimeChange(readiness.regime, lastKnown.regime)
    : true;

  if (regimeChanged) {
    decisions.push(buildRegimeDecision(readiness.regime));
  }

  for (const move of readiness.flashMoves ?? []) {
    decisions.push(buildFlashDecision(move));
  }

  if (lastKnown) {
    const lines = publishedScoreLines(readiness.thresholds);
    for (const metric of ["tightness", "riskAppetite"] as const) {
      const crossed = mostSignificantCrossing(
        lines.filter((line) => line.metric === metric),
        readiness[metric],
        lastKnown[metric],
      );
      if (crossed) decisions.push(buildThresholdDecision(crossed, readiness[metric]));
    }
  }

  if (lastKnown && isWithinCooldown(lastKnown.lastSentAt)) {
    return decisions.filter(bypassesCooldown);
  }

  return decisions;
};

import type { DecisionDepartment } from "../decisionMemory";
import { getRegimePublicLabel } from "../regimePresentation";
import { sharedDecisionLines } from "../report/boundedDecisionRules";
import { RISK_APPETITE_REGIME_THRESHOLD, TIGHTNESS_REGIME_THRESHOLD } from "../regimeEngineCore";
import type { FlashMove } from "./flashMoves";
import { regimeSignalLabel } from "../report/signalTranslations";
import { formatScoreValue } from "../formatters";

type RolePreset = "CFO" | "COO" | "CTO" | "CPO";

export type AlertConditions = {
  regime: string;
  tightness: number;
  riskAppetite: number;
  /**
   * The weekly call's do-now line, as the brief prints it under "Action now".
   * This was `posture`, filled with the assessment's description ("Capital is
   * expensive…"), and the regime-change letter printed that under "Action now".
   */
  actionNow: string;
  /** The brief's "Conditions change if" sentence for this reading. */
  callChangesIf: string;
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
 * pause and restart lines sit at 76 / 66 on funding pressure and 44 / 54 on risk
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

/* Internal only: the regime flip test for evaluateAlert. The cron's own regime-change
   check is lib/alert/checkRegimeChange.ts, a different function with the same name. */
const checkRegimeChange = (
  currentRegime: string,
  lastRegime: string,
): boolean => currentRegime !== lastRegime;

/**
 * Which side of a line a score is on. A score exactly on a line is on the side where the
 * line does not hold: a pause or restart line holds strictly beyond its number, as the area
 * rules state it ("> 76", "< 66"), and the change line is crossed only above it, the way
 * `classifyRegime` reads a score equal to the threshold. Comparing `>=` on one side and
 * `<=` on the other made a score landing on a line miss the crossing, and a score leaving
 * the line for the side it was already on fire one.
 */
export const sideOfLine = (line: PublishedLine, score: number): "above" | "below" =>
  line.holdsWhen === "below"
    ? score < line.value ? "below" : "above"
    : score > line.value ? "above" : "below";

const crossedLine = (line: PublishedLine, current: number, last: number): boolean =>
  sideOfLine(line, current) !== sideOfLine(line, last);

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
    /* Whole points, as every page prints a score; "(now 90.0)" was a precision the scores never had. */
    headline: `${label} crossed ${line.value} (now ${formatScoreValue(score)})`,
    metric,
    line,
    department: metric === "credit" ? "Finance" : "Operations",
    rolePreset: metric === "credit" ? "CFO" : "COO",
  };
};

/**
 * The one line per score worth a letter. A score that jumps from 63 to 90 passes
 * 66, 70 and 76 in one move; three emails about one move would be the noise this
 * stream promises not to make, so the letter names the last line the move
 * crossed, which is the one whose state now holds: the pause line on that rise,
 * the restart line on a fall from 80 to 60. Ranking pause before change before
 * resume whatever the direction named the pause line on the fall too, so the
 * letter said held work resumes "once each area's restart line is met" with the
 * score already past it, and the resume letter never came, since delivery sends
 * one threshold alert per score.
 */
const lineReached = (lines: PublishedLine[], current: number, last: number): PublishedLine | null =>
  lines
    .filter((line) => crossedLine(line, current, last))
    .sort((a, b) => Math.abs(current - a.value) - Math.abs(current - b.value))[0] ?? null;

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
      const crossed = lineReached(
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

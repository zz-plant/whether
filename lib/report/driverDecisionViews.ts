/**
 * Per-driver decision views for the brief's key-driver rows.
 *
 * The three published drivers govern different decisions on different clocks,
 * so giving each the same "current value / weekly delta / one threshold"
 * treatment answers a question none of them asks:
 *
 * - Funding pressure is a control variable: what matters is which action line
 *   has actually been crossed, and how long the reading has sat past it. The
 *   model's lines are the regime boundary and the bounded rule's pause line —
 *   rendered as a ladder of crossed/uncrossed states, not one symmetric marker.
 * - Risk appetite is a buffer: what matters is how much room remains to the
 *   boundary and whether that room is being consumed. The honest window for
 *   its trend is months — the snapshot store is monthly — so the pace estimate
 *   says "months", never "weeks".
 * - The short rate is a trend that acts through funding pressure. The model
 *   contains one defensible rate breakpoint — the contribution anchor at
 *   `BASE_RATE_TIGHTNESS_THRESHOLD`, saturating at its ceiling — and no posture
 *   threshold of its own, so the row states contribution and horizon change,
 *   and draws no threshold bar.
 *
 * Everything is computed from data the brief already loads: the monthly regime
 * series (the snapshot store's granularity) and the canonical bounded rules'
 * numeric lines. Where the data cannot support a claim — weekly persistence, a
 * FOMC calendar, a nonlinear rate breakpoint beyond the anchor — the view
 * carries no value there rather than an invented one.
 */
import { BASE_RATE_TIGHTNESS_THRESHOLD, TIGHTNESS_BASE_RATE_POINTS, BASE_RATE_TIGHTNESS_MULTIPLIER, BASE_RATE_SOURCE_LABELS } from "../regimeEngineCore";
import type { RuleCondition } from "./boundedDecisionRules";
import { distanceToRuleCondition, isRuleConditionMet } from "./boundedDecisionRules";
import { regimeSignalLabel } from "./signalTranslations";

/** One monthly regime-series entry: the brief's macro trendline. Absent inputs
 *  carry null — a gap in the history is not a flat reading. */
export type DriverHistoryEntry = {
  record_date: string;
  tightness?: number | null;
  riskAppetite?: number | null;
};

type HistoryKey = keyof Pick<DriverHistoryEntry, "tightness" | "riskAppetite">;

const countConsecutiveMonthsBeyond = ({
  history,
  key,
  isBeyond,
}: {
  history: readonly DriverHistoryEntry[];
  key: HistoryKey;
  isBeyond: (entryValue: number) => boolean;
}): number | null => {
  let months = 0;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entryValue = history[index]?.[key];
    if (typeof entryValue !== "number") break;
    if (!isBeyond(entryValue)) break;
    months += 1;
  }
  return months;
};

// ── Funding pressure: control variable — action ladder + persistence ──

type FundingPressureLadderLine = {
  value: number;
  /** The consequence the line gates, e.g. "posture boundary" or "pause net-new hiring". */
  action: string;
  /** Whether the current reading has crossed this line. */
  crossed: boolean;
  /** Points beyond the line when crossed, else points to it. */
  points: number;
};

type FundingPressureDriverView = {
  key: "funding-pressure";
  label: typeof regimeSignalLabel.tightness;
  current: number;
  weeklyDelta: number | null;
  /** The model's action lines, ascending, with crossed state per line. */
  ladder: FundingPressureLadderLine[];
  /** Consecutive months the reading has sat above the regime boundary, from the rendered window. */
  beyondBoundaryMonths: number | null;
};

export const buildFundingPressureDriverView = ({
  tightness,
  weeklyDelta,
  tightnessRegime,
  rulePauseLine,
  rulePauseAction,
  history,
}: {
  tightness: number;
  weeklyDelta: number | null;
  tightnessRegime: number;
  /** The bounded rule's funding-pressure pause line, when one exists. */
  rulePauseLine?: RuleCondition | null;
  /** What that line gates, e.g. "pause net-new hiring" — the rule's own verb. */
  rulePauseAction?: string | null;
  history: readonly DriverHistoryEntry[];
}): FundingPressureDriverView => {
  const ladder: FundingPressureLadderLine[] = [
    {
      value: tightnessRegime,
      action: "the line that changes the call",
      crossed: tightness > tightnessRegime,
      points: Math.abs(tightness - tightnessRegime),
    },
  ];

  if (
    rulePauseLine
    && rulePauseLine.metric === "tightness"
    && Number.isFinite(rulePauseLine.value)
    // The rule's pause line is only a second rung when it differs from the
    // boundary — the derived corridor is tightnessRegime + 6, but an override
    // could collapse them, and a ladder with two identical rungs is a defect.
    && rulePauseLine.value !== tightnessRegime
  ) {
    ladder.push({
      value: rulePauseLine.value,
      action: rulePauseAction ?? "pause the governed lever",
      crossed: isRuleConditionMet(rulePauseLine, tightness),
      points: distanceToRuleCondition(rulePauseLine, tightness),
    });
  }

  ladder.sort((left, right) => left.value - right.value);

  return {
    key: "funding-pressure",
    label: regimeSignalLabel.tightness,
    current: tightness,
    weeklyDelta,
    ladder,
    beyondBoundaryMonths: countConsecutiveMonthsBeyond({
      history,
      key: "tightness",
      isBeyond: (entryValue) => entryValue > tightnessRegime,
    }),
  };
};

// ── Risk appetite: buffer — cushion + consumption pace ──

type RiskAppetiteDriverView = {
  key: "risk-appetite";
  label: typeof regimeSignalLabel.riskAppetite;
  current: number;
  /** The regime boundary value, e.g. 50. */
  boundaryValue: number;
  /** The bounded rule's pause line value, when it exists. */
  rulePauseValue: number | null;
  /** Points of cushion above the regime boundary. */
  cushionToBoundary: number;
  /** Points of cushion above the bounded rule's pause line, when it exists. */
  cushionToRulePause: number | null;
  /** Signed move over the trailing window, in points. Null without window depth. */
  trend: { points: number; windowMonths: number } | null;
  /**
   * Months to the regime boundary at the trailing pace, when the trend is
   * consuming the cushion. Null when the trend is flat, improving, or too
   * shallow to project honestly.
   */
  monthsToBoundaryAtPace: number | null;
};

const TREND_WINDOW_MONTHS = 4;
/** Below this pace the projection reads as precision the trend does not have. */
const MIN_PROJECTABLE_PACE_PER_MONTH = 0.2;

export const buildRiskAppetiteDriverView = ({
  riskAppetite,
  riskAppetiteRegime,
  rulePauseLine,
  history,
}: {
  riskAppetite: number;
  riskAppetiteRegime: number;
  /** The bounded rule's risk-appetite pause line, when one exists. */
  rulePauseLine?: RuleCondition | null;
  history: readonly DriverHistoryEntry[];
}): RiskAppetiteDriverView => {
  const cushionToBoundary = Math.max(0, riskAppetite - riskAppetiteRegime);
  const rulePauseValue =
    rulePauseLine && rulePauseLine.metric === "riskAppetite" && Number.isFinite(rulePauseLine.value)
      ? rulePauseLine.value
      : null;
  const cushionToRulePause = rulePauseValue !== null && rulePauseLine
    ? Math.max(0, distanceToRuleCondition(rulePauseLine, riskAppetite))
    : null;

  // The snapshot store is monthly, so the trend window is stated in months —
  // a "4-week" label here would claim granularity the history does not carry.
  const window = history.slice(-(TREND_WINDOW_MONTHS + 1));
  const windowStart = window[0]?.riskAppetite;
  const windowEnd = window[window.length - 1]?.riskAppetite;
  const hasWindowDepth =
    window.length >= TREND_WINDOW_MONTHS + 1
    && typeof windowStart === "number"
    && typeof windowEnd === "number";

  const trend = hasWindowDepth
    ? { points: windowEnd - windowStart, windowMonths: TREND_WINDOW_MONTHS }
    : null;

  let monthsToBoundaryAtPace: number | null = null;
  if (trend && trend.points < 0 && cushionToBoundary > 0) {
    const pacePerMonth = Math.abs(trend.points) / trend.windowMonths;
    if (pacePerMonth >= MIN_PROJECTABLE_PACE_PER_MONTH) {
      monthsToBoundaryAtPace = Math.min(12, Math.max(1, Math.round(cushionToBoundary / pacePerMonth)));
    }
  }

  return {
    key: "risk-appetite",
    label: regimeSignalLabel.riskAppetite,
    current: riskAppetite,
    boundaryValue: riskAppetiteRegime,
    rulePauseValue,
    cushionToBoundary,
    cushionToRulePause,
    trend,
    monthsToBoundaryAtPace,
  };
};

// ── Financing: trend that acts through funding pressure — no threshold bar ──

type FinancingDriverView = {
  key: "financing";
  label: typeof regimeSignalLabel.baseRate;
  /** What the engine actually read, e.g. "The 1-month Treasury bill". */
  rateSourceLabel: string;
  /** The published short-rate reading, in percent. Null when missing. */
  currentRate: number | null;
  /** Signed basis-point move over the trailing window, from snapshot history. */
  change: { bps: number; windowMonths: number } | null;
  /** The model's rate breakpoint: the funding-pressure contribution anchor, in percent. */
  anchorRate: number;
  /** Rate percent at which the funding-pressure contribution saturates. */
  saturatingRate: number;
  /** The funding-pressure component ceiling the contribution counts against. */
  contributionCeiling: number;
  /** Points above the anchor. Null at or below it. */
  pointsAboveAnchor: number | null;
  /** Points of the rate's funding-pressure contribution, of the component's ceiling. */
  contributionOfCeiling: number | null;
  /** Rates carry no posture threshold of their own — the consequence is stated. */
  actsThroughLabel: string;
};

const FINANCING_WINDOW_MONTHS = 6;

export const buildFinancingDriverView = ({
  baseRate,
  baseRateUsed,
  rateHistory,
}: {
  baseRate: number | null;
  /** The engine's rung key. `string` because display callers carry the widened
   *  type; an unknown key resolves the same label a missing rate does. */
  baseRateUsed: string | undefined;
  /** The short rate, oldest first, one entry per month of the trailing window. */
  rateHistory: readonly (number | null)[];
}): FinancingDriverView => {
  // An unknown rung key resolves the same label a missing rate does, so a
  // widened or renamed key degrades to "the short-rate anchor" rather than
  // asserting a label the map never held.
  const rateLabelByKey: Record<string, string> = BASE_RATE_SOURCE_LABELS;
  const resolvedRateLabel =
    typeof baseRateUsed === "string" && baseRateUsed in rateLabelByKey
      ? rateLabelByKey[baseRateUsed]
      : BASE_RATE_SOURCE_LABELS.MISSING;
  const rateHistoryValue = (index: number) => {
    const value = rateHistory[index];
    return typeof value === "number" ? value : null;
  };

  // The horizon change, not the weekly move: a weekly 10bp print is noise for
  // an operating team, while the 6-month move is the financing-relevant one.
  let change: FinancingDriverView["change"] = null;
  const historyDepth = rateHistory.length;
  if (baseRate !== null && historyDepth >= FINANCING_WINDOW_MONTHS + 1) {
    const start = rateHistoryValue(historyDepth - 1 - FINANCING_WINDOW_MONTHS);
    if (start !== null) {
      change = { bps: Math.round((baseRate - start) * 100), windowMonths: FINANCING_WINDOW_MONTHS };
    }
  }

  const pointsAboveAnchor =
    baseRate !== null && baseRate > BASE_RATE_TIGHTNESS_THRESHOLD
      ? Math.round((baseRate - BASE_RATE_TIGHTNESS_THRESHOLD) * 100) / 100
      : null;

  const contributionOfCeiling =
    baseRate !== null && baseRate > BASE_RATE_TIGHTNESS_THRESHOLD
      ? Math.min(
          TIGHTNESS_BASE_RATE_POINTS,
          Math.round((baseRate - BASE_RATE_TIGHTNESS_THRESHOLD) * BASE_RATE_TIGHTNESS_MULTIPLIER),
        )
      : null;

  // The saturating rate is where the contribution hits its ceiling: ceiling ÷
  // multiplier + anchor. Stated rather than imported because it is display
  // arithmetic — the score components themselves live in regimeEngineCore.
  const saturatingRate =
    Math.round((TIGHTNESS_BASE_RATE_POINTS / BASE_RATE_TIGHTNESS_MULTIPLIER + BASE_RATE_TIGHTNESS_THRESHOLD) * 100) / 100;

  return {
    key: "financing",
    /* The same name the What-changed row prints. This card said "Financing
       conditions" and that row said "Fed interest rate", ~600px apart on one
       page, for one `baseRate` reading. */
    label: regimeSignalLabel.baseRate,
    rateSourceLabel: resolvedRateLabel,
    currentRate: baseRate,
    change,
    anchorRate: BASE_RATE_TIGHTNESS_THRESHOLD,
    saturatingRate,
    contributionCeiling: TIGHTNESS_BASE_RATE_POINTS,
    pointsAboveAnchor,
    contributionOfCeiling,
    actsThroughLabel: "Rates carry no posture threshold of their own — their move feeds funding pressure.",
  };
};

// ── Shared ──

export type DriverViews = {
  fundingPressure: FundingPressureDriverView;
  riskAppetite: RiskAppetiteDriverView;
  financing: FinancingDriverView;
};

/**
 * The three views in one call. `corridorPauseLines` must be the lines of the
 * bounded rule whose guardrail the brief actually prints — the same discipline
 * the hero's bounded rails follow — so the ladder cannot state a line the rule
 * beside it does not. The rate history comes from the snapshot store's rolling
 * yield series and carries null for months with no snapshot: the horizon move
 * is computed only when the window has depth.
 */
export const buildDriverViews = ({
  tightness,
  tightnessDelta,
  riskAppetite,
  tightnessRegime,
  riskAppetiteRegime,
  corridorPauseLines,
  corridorPauseVerb,
  baseRate,
  baseRateUsed,
  history,
  rateHistory,
}: {
  tightness: number;
  tightnessDelta: number | null;
  riskAppetite: number;
  tightnessRegime: number;
  riskAppetiteRegime: number;
  corridorPauseLines?: readonly RuleCondition[];
  corridorPauseVerb?: string;
  baseRate: number | null;
  baseRateUsed: string | undefined;
  history: readonly DriverHistoryEntry[];
  rateHistory: readonly (number | null)[];
}): DriverViews => ({
  fundingPressure: buildFundingPressureDriverView({
    tightness,
    weeklyDelta: tightnessDelta,
    tightnessRegime,
    rulePauseLine: corridorPauseLines?.find((condition) => condition.metric === "tightness") ?? null,
    rulePauseAction: corridorPauseVerb?.toLowerCase() ?? null,
    history,
  }),
  riskAppetite: buildRiskAppetiteDriverView({
    riskAppetite,
    riskAppetiteRegime,
    rulePauseLine: corridorPauseLines?.find((condition) => condition.metric === "riskAppetite") ?? null,
    history,
  }),
  financing: buildFinancingDriverView({ baseRate, baseRateUsed, rateHistory }),
});

/** The rung the reader should look at first: the highest line already crossed,
 *  else the nearest line ahead. The consequence chip and the ladder read from
 *  this one rule, so they cannot disagree. */
export const resolveLadderSubject = (
  ladder: readonly FundingPressureLadderLine[],
): FundingPressureLadderLine | null => {
  const crossed = ladder.filter((line) => line.crossed);
  return crossed[crossed.length - 1]
    ?? [...ladder].filter((line) => !line.crossed).sort((left, right) => left.points - right.points)[0]
    ?? null;
};

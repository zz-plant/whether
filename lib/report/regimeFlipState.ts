/**
 * The regime flip, stated against the state machine.
 *
 * The machine commits a quadrant change only after the readings confirm it
 * (`regimeStateMachine.ts`), so a reading can sit past a boundary while the
 * committed call stays put — the state that made "rises above 70 (74 today),
 * which flips the call to Cloudy" read as already-true under a Sunny call.
 * Everything here answers the same question truthfully in both states: what
 * the readings classify as, what holds the call, and which line matters next.
 */
import type { RegimeAssessment, RegimeKey } from "../regimeEngine";
import { classifyRegimeQuadrant } from "./regimeStateMachine";
import { getRegimePublicLabel } from "../regimePresentation";
import { formatThresholdNumber } from "../formatters";
import type { BoundaryDimension, BoundaryDirection, Regime } from "./homeBriefModel";

export const boundaryDirectionForRegime = (
  regime: Regime,
  dimension: BoundaryDimension,
): BoundaryDirection => {
  if (dimension === "tightness") {
    return regime === "SCARCITY" || regime === "DEFENSIVE" ? "fallToOrBelow" : "riseAbove";
  }

  return regime === "EXPANSION" || regime === "DEFENSIVE" ? "fallToOrBelow" : "riseAbove";
};

/**
 * Which side of each regime boundary the committed call requires, per the
 * quadrant table in `regimeStateMachine.ts`.
 */
const requiresTightSide = (regime: Regime) => regime === "SCARCITY" || regime === "DEFENSIVE";
const requiresWillingRisk = (regime: Regime) => regime === "EXPANSION" || regime === "DEFENSIVE";

const TIGHTNESS_BOUNDARY_LABEL = "Funding pressure";
const RISK_BOUNDARY_LABEL = "Risk appetite";

export type RegimeFlipState = {
  /**
   * The regime the current readings classify into, when that differs from the
   * committed call — i.e. a quadrant change is pending the state machine's
   * confirmation gate. Null when readings and call agree.
   */
  pendingCandidate: Regime | null;
  /** The flip line, stated truthfully against that state. */
  text: string;
  /**
   * The boundary worth watching next: the nearest unsatisfied line when the
   * call and readings agree, and the line that would change the flip target
   * when a change is pending. This is what "points to flip" should measure.
   */
  watch: {
    dimension: BoundaryDimension;
    /** The direction that crosses the line. */
    direction: BoundaryDirection;
    threshold: number;
    current: number;
  };
};

/**
 * The future-conditional form. Phrased as a condition, not a statement, because
 * callers prefix it with "Re-open when:" / "The call flips when:" as well as
 * showing it standalone.
 */
const buildBoundaryTriggerText = ({
  targetRegimeLabel,
  dimension,
  threshold,
  current,
  direction,
}: {
  targetRegimeLabel: string;
  dimension: BoundaryDimension;
  threshold: number;
  current: number;
  direction: BoundaryDirection;
}) => {
  const dimensionLabel = dimension === "tightness" ? TIGHTNESS_BOUNDARY_LABEL : RISK_BOUNDARY_LABEL;
  const condition = direction === "riseAbove" ? "rises above" : "falls to or below";
  return `${dimensionLabel} ${condition} ${formatThresholdNumber(threshold)} (${formatThresholdNumber(current)} today), which flips the call to ${targetRegimeLabel}.`;
};

/**
 * The flip line, stated against the regime state machine rather than against
 * one boundary.
 *
 * When the machine reports a pending quadrant change (readings classify into a
 * different quadrant than the committed call), the sentence says that: what
 * has already crossed, that the change waits on confirmation, and what would
 * change the flip target. The pending claim is gated on the machine's own
 * transition data — readings alone can disagree with the committed call in
 * hand-built fixtures, where the truthful line is the future-conditional one.
 * Otherwise the future-conditional sentence stands unchanged.
 */
export const buildRegimeFlipState = ({
  regime,
  scores,
  thresholds,
  regimeTransition,
}: {
  regime: Regime;
  scores: Pick<RegimeAssessment["scores"], "tightness" | "riskAppetite">;
  thresholds: Pick<RegimeAssessment["thresholds"], "tightnessRegime" | "riskAppetiteRegime">;
  regimeTransition?: RegimeAssessment["regimeTransition"];
}): RegimeFlipState => {
  const tightness = scores.tightness;
  const riskAppetite = scores.riskAppetite;
  const tightnessBeyond = tightness > thresholds.tightnessRegime;
  const riskCollapsed = riskAppetite <= thresholds.riskAppetiteRegime;
  const candidate = classifyRegimeQuadrant({ tightness, riskAppetite, thresholds });

  // The machine holds a committed call behind a confirmation gate: readings
  // classify elsewhere while the change waits. Without transition data the
  // candidate claim is not available, whatever the quadrant arithmetic says.
  const machineReportsPending =
    candidate !== regime && regimeTransition?.pending === true;

  if (!machineReportsPending) {
    const tightnessGap = Math.abs(tightness - thresholds.tightnessRegime);
    const riskGap = Math.abs(riskAppetite - thresholds.riskAppetiteRegime);
    const dimension: BoundaryDimension = tightnessGap <= riskGap ? "tightness" : "riskAppetite";
    const direction = boundaryDirectionForRegime(regime, dimension);
    // The regime that crossing actually produces — a rising tightness line from
    // a willing-risk regime lands on the tight-willing quadrant, while a falling
    // risk line from the same call lands on the tight-unwilling one. Naming the
    // nearest boundary's own target, not the call's primary shift target, is
    // what keeps the sentence honest when the watched line is the other signal.
    const crossingTarget = classifyRegimeQuadrant({
      tightness:
        dimension === "tightness"
          ? direction === "riseAbove" ? thresholds.tightnessRegime + 1 : thresholds.tightnessRegime
          : tightness,
      riskAppetite:
        dimension === "riskAppetite"
          ? direction === "fallToOrBelow" ? thresholds.riskAppetiteRegime : thresholds.riskAppetiteRegime + 1
          : riskAppetite,
      thresholds,
    });
    const text = buildBoundaryTriggerText({
      targetRegimeLabel: getRegimePublicLabel(crossingTarget),
      dimension,
      threshold: dimension === "tightness" ? thresholds.tightnessRegime : thresholds.riskAppetiteRegime,
      current: dimension === "tightness" ? tightness : riskAppetite,
      direction,
    });
    return {
      pendingCandidate: null,
      text,
      watch: {
        dimension,
        direction,
        threshold: dimension === "tightness" ? thresholds.tightnessRegime : thresholds.riskAppetiteRegime,
        current: dimension === "tightness" ? tightness : riskAppetite,
      },
    };
  }

  const candidateLabel = getRegimePublicLabel(candidate);
  // A dimension is a cause when the reading sits on the side the committed
  // regime does not require. Tightness beyond the tight side contradicts a
  // regime that requires the loose side; risk below the willing line
  // contradicts one that requires the willing side.
  const tightnessCause = tightnessBeyond !== requiresTightSide(regime);
  const riskCause = requiresWillingRisk(regime) !== (riskAppetite > thresholds.riskAppetiteRegime);

  const beyondClause = (dimension: BoundaryDimension, lowerCase: boolean): string => {
    if (dimension === "tightness") {
      const label = lowerCase ? "funding pressure" : TIGHTNESS_BOUNDARY_LABEL;
      return tightnessBeyond
        ? `${label} (${formatThresholdNumber(tightness)}) is already above its ${formatThresholdNumber(thresholds.tightnessRegime)} boundary`
        : `${label} (${formatThresholdNumber(tightness)}) has already eased to or below its ${formatThresholdNumber(thresholds.tightnessRegime)} boundary`;
    }
    const label = lowerCase ? "risk appetite" : RISK_BOUNDARY_LABEL;
    return riskCollapsed
      ? `${label} (${formatThresholdNumber(riskAppetite)}) has already fallen to or below its ${formatThresholdNumber(thresholds.riskAppetiteRegime)} line`
      : `${label} (${formatThresholdNumber(riskAppetite)}) has already risen above its ${formatThresholdNumber(thresholds.riskAppetiteRegime)} line`;
  };

  const causes: BoundaryDimension[] = [
    ...(tightnessCause ? (["tightness"] as BoundaryDimension[]) : []),
    ...(riskCause ? (["riskAppetite"] as BoundaryDimension[]) : []),
  ];
  const causeClause = causes
    .map((dimension, index) => beyondClause(dimension, index > 0))
    .join("; ");

  let text = `${causeClause}, but the call has not flipped yet. It stays ${getRegimePublicLabel(regime)} while the change waits on confirmation and flips to ${candidateLabel} once it holds.`;

  let watch: RegimeFlipState["watch"];
  if (causes.length === 1) {
    // One boundary carries the pending change; the other boundary is the one
    // whose crossing changes the flip target. That is the line worth watching.
    const cause = causes[0];
    const other: BoundaryDimension = cause === "tightness" ? "riskAppetite" : "tightness";
    const otherDirection: BoundaryDirection =
      other === "riskAppetite"
        ? riskCollapsed ? "riseAbove" : "fallToOrBelow"
        : tightnessBeyond ? "fallToOrBelow" : "riseAbove";
    const otherThreshold = other === "riskAppetite" ? thresholds.riskAppetiteRegime : thresholds.tightnessRegime;
    const otherCurrent = other === "riskAppetite" ? riskAppetite : tightness;
    // The candidate the readings would classify into if that other boundary
    // crossed — computed on the far side of the line, matching the classifier's
    // strict comparisons.
    const probeTightness =
      other === "tightness"
        ? otherDirection === "riseAbove" ? otherThreshold + 1 : otherThreshold
        : tightness;
    const probeRisk =
      other === "riskAppetite"
        ? otherDirection === "fallToOrBelow" ? otherThreshold : otherThreshold + 1
        : riskAppetite;
    const altCandidate = classifyRegimeQuadrant({ tightness: probeTightness, riskAppetite: probeRisk, thresholds });

    const otherLabel = other === "riskAppetite" ? "risk appetite" : "funding pressure";
    const otherPhrase =
      otherDirection === "riseAbove"
        ? `${otherLabel} rises above ${formatThresholdNumber(otherThreshold)}`
        : `${otherLabel} falls to or below ${formatThresholdNumber(otherThreshold)}`;
    text +=
      altCandidate === regime
        ? ` If ${otherPhrase}, the readings return to ${getRegimePublicLabel(regime)}.`
        : ` If ${otherPhrase}, the flip target becomes ${getRegimePublicLabel(altCandidate)}.`;

    watch = { dimension: other, direction: otherDirection, threshold: otherThreshold, current: otherCurrent };
  } else {
    // Both boundaries crossed in the same week; the flip target needs no
    // alternative line. Watch the nearer recovery crossing.
    const tightnessGap = Math.abs(tightness - thresholds.tightnessRegime);
    const riskGap = Math.abs(riskAppetite - thresholds.riskAppetiteRegime);
    const dimension: BoundaryDimension = tightnessGap <= riskGap ? "tightness" : "riskAppetite";
    const direction: BoundaryDirection =
      dimension === "tightness"
        ? tightnessBeyond ? "fallToOrBelow" : "riseAbove"
        : riskCollapsed ? "riseAbove" : "fallToOrBelow";
    watch = {
      dimension,
      direction,
      threshold: dimension === "tightness" ? thresholds.tightnessRegime : thresholds.riskAppetiteRegime,
      current: dimension === "tightness" ? tightness : riskAppetite,
    };
  }

  return { pendingCandidate: candidate, text, watch };
};

export type { RegimeKey };

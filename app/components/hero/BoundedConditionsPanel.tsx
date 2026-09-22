import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { ThresholdLadder } from "../illustrations/ThresholdLadder";
import { buildBoundedConditionRails, parenthesizePointsToLine } from "../../../lib/report/operatingCalls";
import type { ThresholdBusinessConsequence } from "../../../lib/report/operatingCalls";
import type { RuleCondition } from "../../../lib/report/boundedDecisionRules";
import { BoundedValue } from "../ui/boundedValue";
import { compositeSignalScales } from "../../../lib/report/signalTranslations";

/**
 * The bounded rule's lines as data — the same clause the `guardrail` and
 * `flipConditions` sentences are derived from — so the rails draw what the
 * rows say without parsing them.
 */
export type BoundedConditions = {
  pause: readonly RuleCondition[];
  resume: readonly RuleCondition[];
  /** Non-numeric conditions the rule states beside its lines; printed under the rails so the readout is the whole rule. */
  pauseQualifier?: string;
  resumeQualifier?: string;
};

type BoundedConditionsPanelProps = {
  flipConditions?: string[];
  guardrail?: string;
  reversalTrigger?: string;
  boundedConditions?: BoundedConditions;
  thresholdBusinessConsequence?: ThresholdBusinessConsequence | null;
  tightness: number;
  riskAppetite?: number;
};

/**
 * One box owning the trip line, guardrail, reversal, and flip watch. Moved out
 * of `DecisionHero` as-is; it renders nothing when the week carries no rule.
 */
export function BoundedConditionsPanel({
  flipConditions,
  guardrail,
  reversalTrigger,
  boundedConditions,
  thresholdBusinessConsequence,
  tightness,
  riskAppetite,
}: BoundedConditionsPanelProps) {
  if (!((flipConditions && flipConditions.length > 0) || guardrail || reversalTrigger)) {
    return null;
  }

  // The bounded rule, as rail coordinates. Rails and rows come off the same
  // clause data, so the rails cannot state a threshold the rows do not.
  const boundedRails = buildBoundedConditionRails({
    pause: boundedConditions?.pause,
    resume: boundedConditions?.resume,
    scores:
      typeof riskAppetite === "number"
        ? { tightness, riskAppetite }
        : undefined,
  });

  const pointsToPause = thresholdBusinessConsequence?.pointsToThreshold;
  const counterColor = typeof pointsToPause === "number" && pointsToPause <= 10
    ? "text-rose-300"
    : typeof pointsToPause === "number" && pointsToPause <= 20
      ? "text-amber-300"
      : "text-emerald-300";

  return (
    <div className="space-y-2.5 rounded-lg border border-slate-800/60 bg-slate-950/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-fluid-nano type-eyebrow">
          {DECISION_CONTRACT_LABELS.watch.watchThisWeek}
        </p>
        {thresholdBusinessConsequence ? (
          <span className={`whitespace-nowrap text-fluid-nano font-medium tabular-nums ${counterColor}`}>
            {thresholdBusinessConsequence.status === "crossed"
              ? `${pointsToPause} points — ${thresholdBusinessConsequence.consequenceLabel} crossed`
              : `${pointsToPause} points until ${thresholdBusinessConsequence.consequenceLabel}`}
          </span>
        ) : null}
      </div>

      {/* The rule, drawn. Three prose rows used to state six numbers
          across two scales and leave the reader to subtract; a rail per
          signal puts the reading, the guardrail and the line that clears
          it on one axis, with the span where neither fires shaded, and
          the readout under each rail states the distance as a number.
          The sentences survive only as the copied share lines and as
          the fallback when a rule carries no numeric line. Both rails
          run trouble-to-the-right (`invert` flips the falling one),
          which is what lets the pair read as a small-multiple set. */}
      {boundedRails.length > 0 ? (
        <div
          className="grid gap-x-4 gap-y-2 sm:grid-cols-2"
          aria-label="Distance to this week's pause and resume lines"
        >
          {boundedRails.map((rail) => (
            <div key={rail.metric} className="min-w-0">
              <p className="flex items-baseline justify-between gap-2 text-fluid-nano text-white/45">
                <span>{rail.label}</span>
                <span className="tabular-nums text-white/70">{rail.current}<span className="text-white/35">/100</span></span>
              </p>
              <ThresholdLadder
                idPrefix={`hero-bounded-${rail.metric}`}
                min={0}
                max={100}
                current={rail.current}
                trigger={rail.guardrail}
                triggerLabel={DECISION_CONTRACT_LABELS.threshold.pauseIf}
                reversal={rail.clearsAt}
                reversalLabel={DECISION_CONTRACT_LABELS.reversal.changeCourseIf}
                hysteresisBand
                invert={rail.invert}
                signalLabel={rail.label}
                /* The pair reads as a small-multiple set, and the two
                   rails run opposite axes: `invert` flips the falling
                   signal so trouble sits right on both. That flip was
                   announced only by the numeric end-labels — 0…100 on
                   one rail, 100…0 on the other, at 8px — so a reader
                   comparing marker positions got risk appetite
                   backwards unless they read them. The scale words name
                   each end in the reader's terms and follow the flip,
                   which is what the ladder's `scaleDirection` was built
                   to do; the bounded rails were the one pair of rails
                   that never passed it. */
                scaleDirection={compositeSignalScales[rail.metric]?.directionLabel}
                viewBoxWidth={300}
              />
              <dl className="mt-1 grid grid-cols-2 gap-x-3 text-fluid-nano tabular-nums">
                <div className="flex items-baseline gap-1.5">
                  <dt className="text-semantic-caution-fg">{DECISION_CONTRACT_LABELS.threshold.pauseIf}</dt>
                  <dd className="text-slate-300">
                    {rail.guardrail}
                    <span className={`ml-1 ${rail.guardrailTripped ? "text-semantic-caution-fg" : "text-white/45"}`}>
                      {parenthesizePointsToLine(rail.pointsToGuardrail, "pause", rail.guardrailTripped)}
                    </span>
                  </dd>
                </div>
                {rail.clearsAt !== undefined ? (
                  <div className="flex items-baseline gap-1.5">
                    <dt className="text-slate-400">{DECISION_CONTRACT_LABELS.reversal.changeCourseIf}</dt>
                    <dd className="text-slate-300">
                      {rail.clearsAt}
                      <span className={`ml-1 ${rail.clearHolds ? "text-semantic-easing-fg" : "text-white/45"}`}>
                        {parenthesizePointsToLine(rail.pointsToClear, "resume", rail.clearHolds)}
                      </span>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ))}
        </div>
      ) : null}

      {boundedRails.length > 0 && (boundedConditions?.pauseQualifier || boundedConditions?.resumeQualifier) ? (
        <p className="text-fluid-nano text-white/45">
          {boundedConditions?.pauseQualifier ? `${DECISION_CONTRACT_LABELS.threshold.pauseIf} also trips if ${boundedConditions.pauseQualifier}.` : null}
          {boundedConditions?.pauseQualifier && boundedConditions?.resumeQualifier ? " " : null}
          {boundedConditions?.resumeQualifier ? `Clears only when ${boundedConditions.resumeQualifier}.` : null}
        </p>
      ) : null}

      <dl className="space-y-1.5 text-fluid-xs">
        {/* Hue tracks posture: guardrail and reversal are the tighten
            side. The guardrail and clears-when sentences print only when
            no rail could be drawn for them; otherwise the readouts above
            carry the numbers and the sentences would restate them. */}
        {guardrail && boundedRails.length === 0 ? (
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium text-semantic-caution-fg">{DECISION_CONTRACT_LABELS.threshold.pauseIf}:</dt>
            <dd className="text-slate-300"><BoundedValue>{guardrail}</BoundedValue></dd>
          </div>
        ) : null}
        {reversalTrigger ? (
          <div className="flex gap-2">
            {/* The regime line, not the rule line: this is where the
                posture itself flips, and it sits at a different number
                from the rule's guardrail. Named so the reader is not
                left with two unexplained pairs of thresholds. */}
            <dt className="shrink-0 font-medium text-semantic-reversal-fg">{DECISION_CONTRACT_LABELS.watch.postureFlips}:</dt>
            <dd className="text-slate-300"><BoundedValue>{reversalTrigger}</BoundedValue></dd>
          </div>
        ) : null}
        {flipConditions && flipConditions.length > 0 && boundedRails.length === 0 ? (
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium text-slate-400">{DECISION_CONTRACT_LABELS.reversal.changeCourseIf}:</dt>
            <dd className="text-slate-300"><BoundedValue>{flipConditions.join(" · ")}</BoundedValue></dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

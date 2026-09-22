import { HomeSection } from "./HomeSection";
import { LastTimeCallChangedCard } from "./LastTimeCallChangedCard";
import { ScoreLadder } from "../ui/scoreLadder";
import { BoundedValue } from "../ui/boundedValue";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { HOME_SECTIONS, type HomeLadderLine } from "../../../lib/report/home/homeSectionModel";
import type { ThresholdBusinessConsequence } from "../../../lib/report/operatingCalls";
import type { LastTimeCallChanged } from "../../../lib/report/lastTimeCallChanged";

type HomeScoreLadder = {
  metric: "tightness" | "riskAppetite";
  label: string;
  value: number;
  /** Last week's reading; null when there is nothing to compare against. */
  previous: number | null;
  lines: HomeLadderLine[];
};

type FlipProximityLine = { axis: "tightness" | "riskAppetite"; sentence: string };

/**
 * Confidence and distance: the two scores on their ladders with the three
 * lines and last week's dot, the market move that would cross each line under
 * the ladder it describes, and — on a week the call changed — the last time
 * it did. This was the bounded-conditions box inside the hero; the box is
 * gone and its content is a section, because "how close are we" is the
 * question a reader asks after "what does it change", not inside "what is
 * the call".
 */
export function WhatWouldChangeSection({
  ladders,
  flipProximity,
  reversalTrigger,
  resumeWhen,
  guardrail,
  flipConditions,
  thresholdBusinessConsequence,
  lastTime,
  callChangeLines,
}: {
  ladders: readonly HomeScoreLadder[];
  flipProximity: readonly FlipProximityLine[];
  reversalTrigger?: string;
  /** The selected stage's discipline for lifting its hold. Beside the call-change line, never in it. */
  resumeWhen?: string;
  guardrail?: string;
  flipConditions?: readonly string[];
  thresholdBusinessConsequence?: ThresholdBusinessConsequence | null;
  lastTime: LastTimeCallChanged | null;
  callChangeLines: { tightness: number; riskAppetite: number };
}) {
  const pointsToPause = thresholdBusinessConsequence?.pointsToThreshold;
  const counterColor = typeof pointsToPause === "number" && pointsToPause <= 10
    ? "text-rose-300"
    : typeof pointsToPause === "number" && pointsToPause <= 20
      ? "text-amber-300"
      : "text-emerald-300";
  const consequence = thresholdBusinessConsequence ? (
    <span className={`whitespace-nowrap text-fluid-xs font-medium tabular-nums ${counterColor}`}>
      {thresholdBusinessConsequence.status === "crossed"
        ? `${pointsToPause} points — ${thresholdBusinessConsequence.consequenceLabel} crossed`
        : `${pointsToPause} points until ${thresholdBusinessConsequence.consequenceLabel}`}
    </span>
  ) : undefined;

  return (
    <HomeSection
      id={HOME_SECTIONS.watch.id}
      heading={HOME_SECTIONS.watch.heading}
      action={consequence}
      className="order-4"
    >
      {ladders.length > 0 ? (
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {ladders.map((ladder) => (
            <div key={ladder.metric} className="min-w-0 space-y-1.5" data-ladder={ladder.metric}>
              <ScoreLadder label={ladder.label} value={ladder.value} previous={ladder.previous} lines={ladder.lines} />
              {/* The market move that crosses the line, in the market's units:
                  the ladder says how far the score sits; this says what has to
                  happen on the curve or the bill for that line to be crossed. */}
              {flipProximity
                .filter((line) => line.axis === ladder.metric)
                .map((line) => (
                  <p key={line.sentence} className="text-fluid-xs leading-5 text-slate-300">{line.sentence}</p>
                ))}
            </div>
          ))}
        </div>
      ) : null}

      <dl className="space-y-1.5 text-fluid-xs">
        {/* The sentences print only where no ladder could be drawn for them;
            otherwise the ladders carry the numbers and the sentences would
            restate them. The regime line is the exception: the call itself
            changes there, which is a different claim from a rule tripping. */}
        {guardrail && ladders.length === 0 ? (
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium text-semantic-caution-fg">{DECISION_CONTRACT_LABELS.threshold.pauseIf}:</dt>
            <dd className="text-slate-300"><BoundedValue>{guardrail}</BoundedValue></dd>
          </div>
        ) : null}
        {reversalTrigger ? (
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium text-semantic-reversal-fg">{DECISION_CONTRACT_LABELS.watch.postureFlips}:</dt>
            <dd className="text-slate-300"><BoundedValue>{reversalTrigger}</BoundedValue></dd>
          </div>
        ) : null}
        {resumeWhen ? (
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium text-semantic-reversal-fg">{DECISION_CONTRACT_LABELS.reversal.resumeWhen}:</dt>
            <dd className="text-slate-300"><BoundedValue>{resumeWhen}</BoundedValue></dd>
          </div>
        ) : null}
        {flipConditions && flipConditions.length > 0 && ladders.length === 0 ? (
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium text-slate-400">{DECISION_CONTRACT_LABELS.watch.watchThisWeek}:</dt>
            <dd className="text-slate-300"><BoundedValue>{flipConditions.join(" · ")}</BoundedValue></dd>
          </div>
        ) : null}
      </dl>

      {lastTime ? <LastTimeCallChangedCard record={lastTime} callChangeLines={callChangeLines} /> : null}
    </HomeSection>
  );
}

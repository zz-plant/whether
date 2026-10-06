import { HomeSection } from "./HomeSection";
import { LastTimeCallChangedCard } from "./LastTimeCallChangedCard";
import { BoundedValue } from "../ui/boundedValue";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { HOME_SECTIONS, type HomeLadderLine } from "../../../lib/report/home/homeSectionModel";
import type { ThresholdBusinessConsequence } from "../../../lib/report/operatingCalls";
import type { LastTimeCallChanged } from "../../../lib/report/lastTimeCallChanged";
import { RegimeRadar } from "./RegimeRadar";
import { regimeAtCoordinates } from "../../../lib/regimePhaseSpace";
import { DEFAULT_THRESHOLDS } from "../../../lib/regimeEngineCore";

type HomeScoreLadder = {
  metric: "tightness" | "riskAppetite";
  label: string;
  value: number;
  /** The earlier reading; null when there is nothing to compare against. */
  previous: number | null;
  lines: HomeLadderLine[];
};

type FlipProximityLine = { axis: "tightness" | "riskAppetite"; sentence: string };

/**
 * Distance to the call changing: both scores as one point among the four
 * conditions, the market move that would cross each call line in the
 * market's units, and — on a week the call changed — the last time it did.
 *
 * The two score ladders are not redrawn here. "What changed" draws each score
 * on its ladder with all three lines and the earlier reading's dot, and this
 * section used to draw the same two ladders again, so a returning reader met
 * them twice in three sections (DD-039). What this section adds is the second
 * dimension and the move in the market that would cross a line.
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
  regime,
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
  regime?: string;
}) {
  const pointsToPause = thresholdBusinessConsequence?.pointsToThreshold;
  const counterColor = typeof pointsToPause === "number" && pointsToPause <= 10
    ? "text-rose-300"
    : typeof pointsToPause === "number" && pointsToPause <= 20
      ? "text-amber-300"
      : "text-emerald-300";
  const consequence = thresholdBusinessConsequence ? (
    <span className={`min-w-0 text-fluid-xs font-medium tabular-nums ${counterColor}`}>
      {thresholdBusinessConsequence.status === "crossed"
        ? `${pointsToPause} points — ${thresholdBusinessConsequence.consequenceLabel} crossed`
        : `${pointsToPause} points until ${thresholdBusinessConsequence.consequenceLabel}`}
    </span>
  ) : undefined;

  const tightnessLadder = ladders.find((ladder) => ladder.metric === "tightness");
  const riskAppetiteLadder = ladders.find((ladder) => ladder.metric === "riskAppetite");
  const tightnessVal = tightnessLadder?.value ?? 50;
  const riskAppetiteVal = riskAppetiteLadder?.value ?? 50;
  const activeRegime =
    regime ??
    regimeAtCoordinates(tightnessVal, riskAppetiteVal, {
      ...DEFAULT_THRESHOLDS,
      tightnessRegime: callChangeLines.tightness,
      riskAppetiteRegime: callChangeLines.riskAppetite,
    });

  return (
    <HomeSection
      id={HOME_SECTIONS.watch.id}
      heading={HOME_SECTIONS.watch.heading}
      action={consequence}
      className="order-4"
    >
      {ladders.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
          <RegimeRadar
            tightness={tightnessVal}
            riskAppetite={riskAppetiteVal}
            previousTightness={tightnessLadder?.previous}
            previousRiskAppetite={riskAppetiteLadder?.previous}
            tightnessThreshold={callChangeLines.tightness}
            riskAppetiteThreshold={callChangeLines.riskAppetite}
            currentRegime={activeRegime}
            className="w-full max-w-[240px] mx-auto md:mx-0 shrink-0"
          />
          {/* The market move that crosses each call line, in the market's
              units: the ladders above say how far each score sits; this says
              what has to happen on the curve or the bill for a line to go. */}
          <dl className="grid content-start gap-x-6 gap-y-4 sm:grid-cols-2">
            {ladders.map((ladder) => {
              const moves = flipProximity.filter((line) => line.axis === ladder.metric);
              if (moves.length === 0) return null;
              return (
                <div key={ladder.metric} className="min-w-0 space-y-1" data-flip-axis={ladder.metric}>
                  <dt className="text-fluid-nano font-semibold text-slate-400">{ladder.label}</dt>
                  {moves.map((line) => (
                    <dd key={line.sentence} className="text-fluid-xs leading-5 text-slate-300">{line.sentence}</dd>
                  ))}
                </div>
              );
            })}
          </dl>
        </div>
      ) : null}

      {(guardrail && ladders.length === 0) || reversalTrigger || resumeWhen || (flipConditions && flipConditions.length > 0 && ladders.length === 0) ? (
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 weather-inset">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <p className="type-eyebrow">Operating boundary rules</p>
            <a
              href="#subscribe"
              className="weather-hit text-fluid-nano text-sky-400 hover:text-sky-300 underline decoration-sky-500/40 underline-offset-2 transition-colors"
            >
              Get notified when lines cross →
            </a>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2 text-fluid-xs">
            {/* The sentences print only where no ladder could be drawn for them;
                otherwise the ladders in "What changed" carry the numbers and the
                sentences would restate them. The regime line is the exception: the call itself
                changes there, which is a different claim from a rule tripping. */}
            {guardrail && ladders.length === 0 ? (
              <div className="flex flex-col gap-1 border-l-2 border-amber-400/80 pl-2.5">
                <dt className="font-semibold text-semantic-caution-fg">{DECISION_CONTRACT_LABELS.threshold.pauseIf}:</dt>
                <dd className="text-slate-200"><BoundedValue>{guardrail}</BoundedValue></dd>
              </div>
            ) : null}
            {reversalTrigger ? (
              <div className="flex flex-col gap-1 border-l-2 border-violet-400/80 pl-2.5">
                <dt className="font-semibold text-semantic-reversal-fg">{DECISION_CONTRACT_LABELS.watch.postureFlips}:</dt>
                <dd className="text-slate-200"><BoundedValue>{reversalTrigger}</BoundedValue></dd>
              </div>
            ) : null}
            {resumeWhen ? (
              <div className="flex flex-col gap-1 border-l-2 border-sky-400/80 pl-2.5">
                <dt className="font-semibold text-semantic-reversal-fg">{DECISION_CONTRACT_LABELS.reversal.resumeWhen}:</dt>
                <dd className="text-slate-200"><BoundedValue>{resumeWhen}</BoundedValue></dd>
              </div>
            ) : null}
            {flipConditions && flipConditions.length > 0 && ladders.length === 0 ? (
              <div className="flex flex-col gap-1 border-l-2 border-slate-700 pl-2.5 sm:col-span-2">
                <dt className="font-semibold text-slate-400">{DECISION_CONTRACT_LABELS.watch.watchThisWeek}:</dt>
                <dd className="text-slate-200"><BoundedValue>{flipConditions.join(" · ")}</BoundedValue></dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}

      {lastTime ? <LastTimeCallChangedCard record={lastTime} callChangeLines={callChangeLines} /> : null}
    </HomeSection>
  );
}

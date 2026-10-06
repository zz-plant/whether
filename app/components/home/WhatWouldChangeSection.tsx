import { HomeSection } from "./HomeSection";
import { LastTimeCallChangedCard } from "./LastTimeCallChangedCard";
import { BoundedValue } from "../ui/boundedValue";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { HOME_SECTIONS, type HomeLadderLine } from "../../../lib/report/home/homeSectionModel";
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
 * conditions, the line that changes them in the same points the ladders use,
 * and — on a week the call changed — the last time it did.
 *
 * The two score ladders are not redrawn here. "What changed" draws each score
 * on its ladder with all three lines and the earlier reading's dot, and this
 * section used to draw the same two ladders again, so a returning reader met
 * them twice in three sections (DD-039).
 *
 * The lines were still stated here three more ways: a red "0 points — the
 * hiring pause line crossed" counter beside the heading (the area table says
 * "crossed" against each rule), the market move that would cross each line in
 * Treasury-rate percentages, and a boxed "Operating boundary rules" panel with
 * the same lines in points. One sentence in points now sits beside the
 * quadrant, and the market move folds under it for the reader who wants it in
 * the market's units.
 */
export function WhatWouldChangeSection({
  ladders,
  flipProximity,
  reversalTrigger,
  resumeWhen,
  guardrail,
  flipConditions,
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
  lastTime: LastTimeCallChanged | null;
  callChangeLines: { tightness: number; riskAppetite: number };
  regime?: string;
}) {
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
  const marketMoves = ladders.flatMap((ladder) =>
    flipProximity.filter((line) => line.axis === ladder.metric).map((line) => ({ ...line, label: ladder.label })),
  );
  /* Without ladders (a read that drew none) the pause line and the watch list
     have nowhere else on the page, so they print here. */
  const statements = [
    ...(guardrail && ladders.length === 0 ? [{ label: DECISION_CONTRACT_LABELS.threshold.pauseIf, value: guardrail }] : []),
    ...(reversalTrigger ? [{ label: DECISION_CONTRACT_LABELS.watch.postureFlips, value: reversalTrigger }] : []),
    ...(resumeWhen ? [{ label: DECISION_CONTRACT_LABELS.reversal.resumeWhen, value: resumeWhen }] : []),
    ...(flipConditions && flipConditions.length > 0 && ladders.length === 0
      ? [{ label: DECISION_CONTRACT_LABELS.watch.watchThisWeek, value: flipConditions.join(" · ") }]
      : []),
  ];

  return (
    <HomeSection id={HOME_SECTIONS.watch.id} heading={HOME_SECTIONS.watch.heading} className="order-4">
      <div className={ladders.length > 0 ? "grid gap-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-start" : "space-y-4"}>
        {ladders.length > 0 ? (
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
        ) : null}
        <div className="min-w-0 space-y-4">
          {statements.length > 0 ? (
            <dl className="space-y-3 text-fluid-xs">
              {statements.map((statement) => (
                <div key={statement.label} className="space-y-0.5">
                  <dt className="font-semibold text-slate-200">{statement.label}</dt>
                  <dd className="text-slate-300"><BoundedValue>{statement.value}</BoundedValue></dd>
                </div>
              ))}
            </dl>
          ) : null}
          {marketMoves.length > 0 ? (
            <details className="weather-auto-chevron text-fluid-xs">
              <summary className="cursor-pointer select-none font-medium text-slate-300">In interest-rate terms</summary>
              <ul className="space-y-1.5 text-slate-300">
                {marketMoves.map((line) => (
                  <li key={line.sentence} data-flip-axis={line.axis}>
                    <span className="text-slate-400">{line.label}:</span> {line.sentence}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          <a
            href="#subscribe"
            className="weather-hit text-fluid-xs text-sky-300 underline decoration-sky-700 underline-offset-4 hover:text-sky-200"
          >
            Get an email the day a line is crossed
          </a>
        </div>
      </div>

      {lastTime ? <LastTimeCallChangedCard record={lastTime} callChangeLines={callChangeLines} /> : null}
    </HomeSection>
  );
}

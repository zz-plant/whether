import { HomeSection } from "./HomeSection";
import { BoundedValue } from "../ui/boundedValue";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { HOME_SECTIONS, type HomeLadderLine } from "../../../lib/report/home/homeSectionModel";
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
 * What would change this guidance, fourth on the page (2026-10-09): the pause
 * line and the resume line the guidance turns on, the line where conditions
 * themselves change, and both scores as one point among the four conditions.
 * The pause line printed here only on a read that drew no ladders, so a reader
 * met "Conditions change if" and the stage's resume line and had to find the
 * pause line in the area table; it leads now. The last time conditions changed
 * is "Has this happened before?" further down, and the email link that closed
 * this section is the alert section directly under it.
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
 *
 * The fold translates that sentence and nothing else (`buildFlipProximity`):
 * one market move per line it names, in its order, in percentage points. It
 * was its own answer until 2026-10-07, ordered by the size of the move and in
 * "%" ("If the 1-month Treasury bill rate rises 0.22%, conditions turn
 * Freezing."), and on a held week it offered a rate move under a sentence
 * whose condition is the scores agreeing; a held week now has no fold.
 *
 * From `md` up the quadrant is drawn in the card at the top of the page, with
 * its month-end path, so this section stops drawing it there: one picture of
 * where the reading sits per screen. Below `md` the card has no room for it and
 * it stays here.
 */
export function WhatWouldChangeSection({
  ladders,
  flipProximity,
  reversalTrigger,
  resumeWhen,
  guardrail,
  leadResume,
  flipConditions,
  callChangeLines,
  regime,
  conditionsTrail,
}: {
  ladders: readonly HomeScoreLadder[];
  flipProximity: readonly FlipProximityLine[];
  reversalTrigger?: string;
  /** The selected stage's discipline for lifting its hold. Beside the call-change line, never in it. */
  resumeWhen?: string;
  /** The guidance's pause line: the lead area's, as the brief and every paste print it. */
  guardrail?: string;
  /** The lead area's resume line, where no stage set one of its own. */
  leadResume?: string;
  flipConditions?: readonly string[];
  callChangeLines: { tightness: number; riskAppetite: number };
  regime?: string;
  /** The month-end path, its domain and its like-for-like note; when passed, the card above draws the quadrant from `md` up. */
  conditionsTrail?: {
    points: ReadonlyArray<{ tightness: number; riskAppetite: number }>;
    caption: string | null;
    caveat: string | null;
  };
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
  /* The pause and resume lines first, then where conditions change. The watch
     list prints only on a read that drew no ladders, which have nowhere else. */
  const resumeLine = resumeWhen ?? leadResume;
  const statements = [
    ...(guardrail ? [{ label: DECISION_CONTRACT_LABELS.threshold.pauseIf, value: guardrail }] : []),
    ...(resumeLine ? [{ label: DECISION_CONTRACT_LABELS.reversal.resumeWhen, value: resumeLine }] : []),
    ...(reversalTrigger ? [{ label: DECISION_CONTRACT_LABELS.watch.postureFlips, value: reversalTrigger }] : []),
    ...(flipConditions && flipConditions.length > 0 && ladders.length === 0
      ? [{ label: DECISION_CONTRACT_LABELS.watch.watchThisWeek, value: flipConditions.join(" · ") }]
      : []),
  ];

  return (
    <HomeSection id={HOME_SECTIONS.watch.id} heading={HOME_SECTIONS.watch.heading}>
      <div
        className={
          ladders.length === 0
            ? "space-y-4"
            : conditionsTrail
              ? "grid gap-6"
              : "grid gap-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-start"
        }
      >
        {ladders.length > 0 ? (
          <RegimeRadar
            tightness={tightnessVal}
            riskAppetite={riskAppetiteVal}
            previousTightness={tightnessLadder?.previous}
            previousRiskAppetite={riskAppetiteLadder?.previous}
            tightnessThreshold={callChangeLines.tightness}
            riskAppetiteThreshold={callChangeLines.riskAppetite}
            currentRegime={activeRegime}
            trail={conditionsTrail?.points}
            trailCaption={conditionsTrail?.caption}
            caveat={conditionsTrail?.caveat}
            className={`w-full max-w-[240px] mx-auto md:mx-0 shrink-0 ${conditionsTrail ? "md:hidden" : ""}`}
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
        </div>
      </div>
    </HomeSection>
  );
}

import Link from "next/link";
import { HomeSection } from "./HomeSection";
import { BoundedValue } from "../ui/boundedValue";
import { DECISION_CONTRACT_LABELS, BOUNDED_CALL_CONTRAST } from "../../../lib/report/reportCopy";
import { HOME_SECTIONS, type HomeLadderLine } from "../../../lib/report/home/homeSectionModel";
import { RegimeRadar, type RegimeRadarProps } from "./RegimeRadar";
import {
  RuleChartChooser,
  RuleChartFigure,
  RuleChartLines,
  RuleChartProvider,
  RuleChartReadings,
  RuleLines,
} from "./RuleRegionsChart";
import type { RegimeKey } from "../../../lib/types";
import type { DecisionArea } from "../../../lib/report/boundedDecisionRules";
import type { RuleChartModel } from "../../../lib/report/ruleRegions";
import type { RuleChartReadingKey } from "../../../lib/report/ruleChartParams";
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

type FlipProximityLine = {
  axis: "tightness" | "riskAppetite";
  /** The move in everyday terms first: a Fed step for the short rate (`buildFlipProximity`). */
  sentence: string;
  /** The instrument that everyday size stands for, on the line under it. */
  instrument?: string;
  /** How often the record's months moved that far (`describeMarketMoveScale`). */
  scale?: string | null;
};

/**
 * What would change this guidance, fourth on the page (2026-10-09): the pause
 * line and the restart line the guidance turns on, the line where conditions
 * themselves change, and both scores as one point among the four conditions.
 * The pause line printed here only on a read that drew no ladders, so a reader
 * met "Conditions change if" and the stage's restart line and had to find the
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
 *
 * Since 2026-11-18 the chart also draws the rules (`ruleChart`, `RuleRegionsChart`): an
 * area chosen over it shades that area's pause and restart regions, and the pause or
 * restart line beside it follows the choice. It opens on the guidance's lead rule, so the
 * first picture is the sentence beside it, or on the decision the reader chose. A second
 * row plots another reading, with the left-out inputs counted or after a Fed cut or hike,
 * and names the areas that would then move. Where the short rate makes the whole of
 * funding pressure, the funding-pressure lines carry the rate each comes with, and the
 * fold's "That is the 1-month Treasury bill rate falling …" line, which those labels now
 * draw, is left out.
 */
export function WhatWouldChangeSection({
  feelsLike,
  ladders,
  flipProximity,
  reversalTrigger,
  resumeWhen,
  guardrail,
  leadResume,
  leadHeld,
  flipConditions,
  callChangeLines,
  regime,
  conditionsTrail,
  ruleChart,
}: {
  feelsLike?: { regime: RegimeKey; tightness: number; riskAppetite: number } | null;
  ladders: readonly HomeScoreLadder[];
  flipProximity: readonly FlipProximityLine[];
  reversalTrigger?: string;
  /** The selected stage's discipline for lifting its hold. Beside the call-change line, never in it. */
  resumeWhen?: string;
  /** The guidance's pause line: the lead area's, as the brief and every paste print it. */
  guardrail?: string;
  /** The lead area's restart line, where no stage set one of its own. */
  leadResume?: string;
  /**
   * Whether the lead area's pause applies this week. Only one side can change its
   * state (2026-11-03): on hold, the restart condition; otherwise the pause. Unknown
   * prints both, as before.
   */
  leadHeld?: boolean;
  flipConditions?: readonly string[];
  callChangeLines: { tightness: number; riskAppetite: number };
  regime?: string;
  /** The month-end path, its domain and its like-for-like note, for the map this section draws at every width. */
  conditionsTrail?: {
    points: ReadonlyArray<{ tightness: number; riskAppetite: number; label?: string; month?: string }>;
    caption: string | null;
    caveat: string | null;
  };
  /**
   * Each area's regions and lines for the chart (`buildRuleChartModel`), with the area and
   * switch the URL names. Without it the chart draws the conditions alone, as before.
   */
  ruleChart?:
    | (RuleChartModel & {
        initialArea?: DecisionArea;
        initialReading: RuleChartReadingKey | null;
        /** The page's query, which the chart's links keep. */
        query?: Record<string, string | undefined>;
      })
    | null;
}) {
  const chart = ruleChart && ladders.length > 0 ? ruleChart : null;
  const rateTicks = Boolean(chart?.fundingPressureRates && chart.fundingPressureRates.values.length > 0);
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
  /* The pause and restart lines answer one question; the change line answers the
     other. Both are printed under their own heading (2026-10-22). */
  const resumeLine = leadHeld === false ? undefined : resumeWhen ?? leadResume;
  const pauseLine = leadHeld === true ? undefined : guardrail;
  const radar: RegimeRadarProps = {
    tightness: tightnessVal,
    riskAppetite: riskAppetiteVal,
    previousTightness: tightnessLadder?.previous,
    previousRiskAppetite: riskAppetiteLadder?.previous,
    tightnessThreshold: callChangeLines.tightness,
    riskAppetiteThreshold: callChangeLines.riskAppetite,
    currentRegime: activeRegime,
    trail: conditionsTrail?.points,
    trailCaption: conditionsTrail?.caption,
    caveat: conditionsTrail?.caveat,
    /* Not where the chart can plot the counted reading itself (2026-11-18): the glyph drew
       that point a second time, beside the choice that plots it. */
    feelsLike: chart?.readings.some((reading) => reading.key === "counted") ? null : feelsLike,
    readingsId: "conditions-chart-readings",
  };
  /* 320px on a phone (2026-10-27): at 240 in a 358px column its quadrant names
     and line numbers drew at 8–10px with empty ground either side. The rate column
     widens the drawing, so its box widens with it and the plot keeps its size. */
  const chartWidth = rateTicks
    ? "w-full max-w-[380px] mx-auto md:mx-0 md:max-w-[340px] shrink-0"
    : "w-full max-w-[320px] mx-auto md:mx-0 md:max-w-[280px] shrink-0";

  const body = (
      /* No key to the three lines (2026-11-03): the two questions below answer
         what each line does, in the reader's terms, and the key was a third
         explanation of the mechanism on one page. */
      <div
        className={
          ladders.length === 0
            ? "space-y-4"
            : "grid gap-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-start"
        }
      >
        {ladders.length > 0 ? (
          chart ? (
            <RuleChartFigure
              radar={radar}
              areas={chart.areas}
              readings={chart.readings}
              fundingPressureRates={chart.fundingPressureRates}
              className={chartWidth}
            />
          ) : (
            <RegimeRadar {...radar} className={chartWidth} />
          )
        ) : null}
        {/* Side by side wherever the column holds two at 20rem (2026-10-27, by the
            column's width since 2026-11-03): stacked in a 64rem column they left the
            right half of a laptop screen empty, and a frame held one question and the
            top of the next. Side by side, one frame holds both answers whole. */}
        <div className="weather-switch items-start gap-x-8 gap-y-4 [--col-min:20rem]">
          {/* Two different questions, each named by its own label (2026-10-22): a change in
              conditions is not permission to resume, and the old flat list read
              as one question with three answers. The conditions question comes
              first because it is the one the weather word answers. */}
          {reversalTrigger || marketMoves.length > 0 ? (
            <div className="space-y-2">
              {reversalTrigger ? (
                <dl className="text-fluid-sm">
                  <div className="space-y-0.5">
                    <dt className="font-semibold text-slate-200">{DECISION_CONTRACT_LABELS.watch.postureFlips}</dt>
                    <dd className="text-slate-300"><BoundedValue>{reversalTrigger}</BoundedValue></dd>
                  </div>
                </dl>
              ) : null}
              {marketMoves.length > 0 ? (
                <details className="weather-auto-chevron text-fluid-sm">
                  <summary className="cursor-pointer select-none font-medium text-slate-300">In interest-rate terms</summary>
                  <ul className="space-y-1.5 text-slate-300">
                    {/* The everyday size leads; the instrument and the record's count are the
                        secondary line, for the reader who wants the market's own units. */}
                    {marketMoves.map((line) => {
                      /* The rate the change line sits at is on the chart's funding-pressure
                         axis when it labels rates, so the bill's move is not said again. */
                      const instrument = rateTicks && line.axis === "tightness" ? null : line.instrument;
                      const detail = [instrument, line.scale].filter(Boolean).join(" ");
                      return (
                        <li key={line.sentence} data-flip-axis={line.axis}>
                          <span className="text-slate-400">{line.label}:</span> {line.sentence}
                          {detail ? <span className="block text-slate-400">{detail}</span> : null}
                        </li>
                      );
                    })}
                  </ul>
                </details>
              ) : null}
            </div>
          ) : null}

          {chart ? (
            <RuleChartLines areas={chart.areas} defaultArea={chart.defaultArea} pauseLine={pauseLine} resumeLine={resumeLine} />
          ) : (
            <RuleLines pauseLine={pauseLine} resumeLine={resumeLine} />
          )}

          {flipConditions && flipConditions.length > 0 && ladders.length === 0 ? (
            <div className="space-y-0.5 text-fluid-sm">
              <p className="font-semibold text-slate-200">{DECISION_CONTRACT_LABELS.watch.watchThisWeek}</p>
              {/* A list rather than one line joined by dots (2026-11-10): each is its own
                  condition, and a run-on line read as one long one. */}
              <ul className="list-disc space-y-0.5 pl-5 text-slate-300 marker:text-slate-400">
                {flipConditions.map((condition) => (
                  <li key={condition}>{condition}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
  );

  return (
    <HomeSection id={HOME_SECTIONS.watch.id} heading={HOME_SECTIONS.watch.heading} lead={BOUNDED_CALL_CONTRAST}>
      {chart ? (
        <RuleChartProvider
          defaultArea={chart.defaultArea}
          initialArea={chart.initialArea}
          initialReading={chart.initialReading}
          areas={chart.areas.map((entry) => entry.area)}
          query={chart.query}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <RuleChartChooser areas={chart.areas.map((entry) => entry.area)} />
              <RuleChartReadings readings={chart.readings} />
            </div>
            {body}
          </div>
        </RuleChartProvider>
      ) : (
        body
      )}
      {/* The claim above is only worth making beside its proof. A reader who has
          just been told these lines are unusual should be able to check how often
          they held and read every brief behind them in one click, or the sentence
          is marketing rather than a claim the product stands behind. */}
      <p className="max-w-none border-t border-[color:var(--border-subtle)] pt-3 text-fluid-sm text-slate-400">
        How often these lines held, and every brief behind them:{" "}
        <Link href="/calibration" className="weather-hit text-sky-300 underline decoration-sky-700 underline-offset-4 hover:text-sky-200">
          the calibration study
        </Link>{" "}
        ·{" "}
        <Link href="/history" className="weather-hit text-sky-300 underline decoration-sky-700 underline-offset-4 hover:text-sky-200">
          the record
        </Link>
      </p>
    </HomeSection>
  );
}

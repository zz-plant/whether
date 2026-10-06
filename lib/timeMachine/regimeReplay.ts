/**
 * The one threaded replay of the regime engine over history.
 *
 * Four walks used to carry their own copy of this loop: the runtime month walk
 * (`timeMachineCache.ts`) and the weekly, monthly and quarterly/yearly archive
 * generators. Each threaded the machine snapshot forward the same way and built
 * the same VIX reading by hand, and the copies were how the walk and the
 * archives came to score the same dates differently (050e9371). The callers
 * still decide what each step reads — the generators slice daily FRED series,
 * the runtime reads the cache entry — but evaluating and threading happens
 * here, once.
 */
import { evaluateRegime, type RegimeAssessment, type RegimeEvaluationContext, type RegimeThresholds } from "../regimeEngine";
import type { RegimeMachineSnapshot } from "../regimeStateMachine";
import type { MacroSeriesReading, SeriesHistoryPoint, TreasuryData } from "../types";

/** What one period of a replay reads. */
type RegimeReplayStep = {
  treasury: TreasuryData;
  macroSeries: MacroSeriesReading[];
  baseRateHistory: RegimeEvaluationContext["baseRateHistory"];
};

/**
 * Evaluate each step in order, handing every evaluation the machine snapshot
 * the previous one left, so flips confirm through the gate and shocks commit
 * and get marked exactly as the live read does week to week.
 */
export const replayRegimeWalk = <Step extends RegimeReplayStep>(
  steps: readonly Step[],
  overrides?: Partial<RegimeThresholds>,
): { step: Step; assessment: RegimeAssessment }[] => {
  let machineState: RegimeMachineSnapshot | null = null;
  return steps.map((step) => {
    const assessment = evaluateRegime(step.treasury, overrides, step.macroSeries, machineState, {
      baseRateHistory: step.baseRateHistory,
    });
    machineState = assessment.regimeTransition?.snapshot ?? machineState;
    return { step, assessment };
  });
};

/**
 * A period's VIX reading as the replay feeds it to the engine: the close that
 * drives the shock haircut, with the daily tail the market-stress veto means.
 */
export const buildReplayVixReading = ({
  value,
  recordDate,
  fetchedAt,
  history,
}: {
  value: number;
  recordDate: string;
  fetchedAt: string;
  history: SeriesHistoryPoint[];
}): MacroSeriesReading => ({
  id: "VIX_INDEX",
  label: "CBOE volatility index (VIX)",
  value,
  unit: "index",
  explanation: "Implied equity volatility used as a short-cycle shock and regime-boundary warning signal.",
  sourceLabel: "FRED",
  sourceUrl: "https://fred.stlouisfed.org/series/VIXCLS",
  formulaUrl: "/formulas#vix",
  record_date: recordDate,
  fetched_at: fetchedAt,
  isLive: false,
  history,
});

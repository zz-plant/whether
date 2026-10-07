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
import { policyInputsWithoutValue } from "../regimeEnginePolicy";
import type { RegimeMachineSnapshot } from "../regimeStateMachine";
import type { MacroSeriesReading, SeriesHistoryPoint, TreasuryData } from "../types";

/** What one period of a replay reads. */
type RegimeReplayStep = {
  treasury: TreasuryData;
  macroSeries: MacroSeriesReading[];
  baseRateHistory: RegimeEvaluationContext["baseRateHistory"];
};

/**
 * How a replayed date is evaluated: its base-rate window, and the policy inputs
 * its record does not carry, read from the step itself rather than listed.
 *
 * A replayed month is judged on the inputs the archive carries for it. The
 * archive holds yields and VIX, and no credit-spread, inflation or unemployment
 * history for most months, so until 2026-10-07 every replayed month was refused
 * for missing inputs and printed the held guidance, while /history's strip
 * printed the same month's conditions unheld. A hold for missing inputs is a
 * live-read failure: the live read never calls this, and a feed that fails
 * there still counts. The loader's point evaluation of a historical selection
 * outside the walk reads this too, so the two replays judge a month alike.
 */
export const buildReplayContext = ({ treasury, macroSeries, baseRateHistory }: RegimeReplayStep): RegimeEvaluationContext => ({
  baseRateHistory,
  inputsNotOnRecord: policyInputsWithoutValue(treasury, macroSeries),
});

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
    const assessment = evaluateRegime(step.treasury, overrides, step.macroSeries, machineState, buildReplayContext(step));
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

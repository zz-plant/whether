/**
 * Regime Engine entry point: the scorer and its description, composed.
 *
 * `scoreRegime` (`regimeEngineScoring.ts`) is the deterministic, copy-free
 * engine; `describeRegimeAssessment` (`report/regimeDescription.ts`) writes its
 * codes into the stored `RegimeAssessment`. The scorer takes every input as an
 * argument, the policy composites' rate history included; this layer supplies
 * the bundled one (`TREASURY_POLICY_HISTORY`, read from the Time Machine
 * cache). It is the only engine file that reaches into `lib/report/` or the
 * bundled data, and it does nothing else: every caller keeps calling
 * `evaluateRegime` with the same arguments and gets the same assessment.
 */
import type { MacroSeriesReading, TreasuryData } from "./types";
import type {
  RegimeAssessment,
  RegimeEvaluationContext,
  RegimeThresholds,
} from "./regimeEngineCore";
import { TREASURY_POLICY_HISTORY } from "./policy/history";
import { scoreRegime } from "./regimeEngineScoring";
import type { RegimeMachineSnapshot } from "./regimeStateMachine";
import { describeRegimeAssessment } from "./report/regimeDescription";

export * from "./regimeEngineCore";
export {
  MACRO_ADJUSTMENT_CONSTANTS,
  RECORD_BASIS_MARKET_INPUTS,
  deriveRegimeTrend,
} from "./regimeEngineDiagnostics";

export const evaluateRegime = (
  treasury: TreasuryData,
  overrides?: Partial<RegimeThresholds>,
  macroSeries: MacroSeriesReading[] = [],
  previousMachineState: RegimeMachineSnapshot | null = null,
  context: RegimeEvaluationContext = {},
): RegimeAssessment =>
  describeRegimeAssessment(
    treasury,
    scoreRegime(treasury, overrides, macroSeries, previousMachineState, context, TREASURY_POLICY_HISTORY),
  );

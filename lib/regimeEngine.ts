/**
 * Regime Engine entry point: the scorer and its description, composed.
 *
 * `scoreRegime` (`regimeEngineScoring.ts`) is the deterministic, copy-free
 * engine; `describeRegimeAssessment` (`report/regimeDescription.ts`) writes its
 * codes into the stored `RegimeAssessment`. This module is the only engine file
 * that reaches into `lib/report/`, and it does nothing else: every caller keeps
 * calling `evaluateRegime` with the same arguments and gets the same assessment.
 */
import type { MacroSeriesReading, TreasuryData } from "./types";
import type {
  RegimeAssessment,
  RegimeEvaluationContext,
  RegimeThresholds,
} from "./regimeEngineCore";
import { scoreRegime } from "./regimeEngineScoring";
import type { RegimeMachineSnapshot } from "./regimeStateMachine";
import { describeRegimeAssessment } from "./report/regimeDescription";

export * from "./regimeEngineCore";
export {
  MACRO_ADJUSTMENT_CONSTANTS,
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
    scoreRegime(treasury, overrides, macroSeries, previousMachineState, context),
  );

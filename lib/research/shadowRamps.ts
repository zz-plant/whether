/**
 * The registered candidate ramps, scored beside every weekly reading
 * (docs/research/premise-test-preregistration.md §10).
 *
 * The weekly pipeline (`refreshOperatingState`) stores the record on the
 * operating snapshot under `shadowRamps`. Nothing a reader sees reads it: the
 * guidance, the sends, the exports and the brief freeze read the assessment and
 * the weekly call, which are built before this runs and never from it. It is
 * the first record of candidate readings written before their outcomes exist.
 *
 * Each candidate threads its own state-machine snapshot from the previous
 * stored record, the way the live machine threads its own. With no previous
 * record it is seeded by replaying the candidate over the bundled month-ends
 * from January 2022, the first month whose ten-year percentile window the
 * bundle holds, through the last month-end before the reading.
 */
import type { RegimeMachineSnapshot } from "../regimeStateMachine";
import type { MacroSeriesReading, RegimeKey, TreasuryData } from "../types";
import { buildTimeMachineReplaySteps } from "../timeMachine/timeMachineCache";
import {
  REGISTERED_CANDIDATE_RAMPS,
  isTightReading,
  replayRamp,
  scoreWithRamp,
  trailingMonthEndWindow,
  type RampFlag,
} from "./candidateRamps";

type CandidateRamp = (typeof REGISTERED_CANDIDATE_RAMPS)[number];

/** The first month-end the cold-start seed replays from. */
const SEED_FROM = "2022-01-01";

type ShadowRampScore = {
  ramp: CandidateRamp;
  /** What the ramp read: the one-month bill, or the two bills' median for the guard. */
  input: number | null;
  ratePoints: number | null;
  fundingPressure: number | null;
  riskAppetite: number;
  conditions: RegimeKey | null;
  /** The registered tight reading: funding pressure above 70, or Freezing or Stormy. */
  tight: boolean | null;
  flag: RampFlag | null;
  machineState: RegimeMachineSnapshot | null;
};

export type ShadowRampRecord = {
  registration: "docs/research/premise-test-preregistration.md";
  /** Always false. Said in the record so a reader of stored data cannot mistake it for the call. */
  usedForGuidance: false;
  recordDate: string;
  /** How each candidate's state machine started: carried from the previous record, or seeded from the bundle. */
  machineStateFrom: "previous-record" | "seeded";
  scores: ShadowRampScore[];
};

/**
 * One-month-bill month-ends the percentile window can read: the bundled cache,
 * and any complete month the reading's own daily history covers that the cache
 * does not hold yet (the cache is refreshed monthly; the history is the live
 * read's trailing 92 days).
 */
const monthEndsFor = (treasury: TreasuryData): Map<string, number> => {
  const monthEnds = new Map<string, number>();
  const readingMonth = treasury.record_date.slice(0, 7);
  const lastPrintByMonth = new Map<string, { date: string; value: number }>();
  for (const point of treasury.oneMonthHistory ?? []) {
    const month = point.date.slice(0, 7);
    const latest = lastPrintByMonth.get(month);
    if (typeof point.value === "number" && month < readingMonth && (!latest || point.date > latest.date)) {
      lastPrintByMonth.set(month, { date: point.date, value: point.value });
    }
  }
  for (const [month, print] of lastPrintByMonth) {
    monthEnds.set(month, print.value);
  }
  for (const step of buildTimeMachineReplaySteps()) {
    if (typeof step.treasury.yields.oneMonth === "number") {
      monthEnds.set(step.treasury.record_date.slice(0, 7), step.treasury.yields.oneMonth);
    }
  }
  return monthEnds;
};

const REGIME_KEYS: readonly string[] = ["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"];

/**
 * A candidate's machine state from the previous stored record, or null when the
 * record does not carry a usable one. The record comes back out of KV as JSON the
 * snapshot store does not check field by field, so it is checked here before the
 * state machine reads it.
 */
const carriedMachineState = (previous: ShadowRampRecord | null, ramp: CandidateRamp): RegimeMachineSnapshot | null => {
  if (!previous || previous.registration !== "docs/research/premise-test-preregistration.md" || !Array.isArray(previous.scores)) {
    return null;
  }
  const state = previous.scores.find((score) => score?.ramp === ramp)?.machineState;
  const valid =
    state !== null &&
    state !== undefined &&
    REGIME_KEYS.includes(state.committedState) &&
    (state.pendingState === null || REGIME_KEYS.includes(state.pendingState)) &&
    typeof state.pendingCount === "number";
  return valid ? state : null;
};

const seedMachineState = (ramp: CandidateRamp, beforeDate: string, monthEnds: ReadonlyMap<string, number>) => {
  const steps = buildTimeMachineReplaySteps()
    .filter((step) => step.treasury.record_date >= SEED_FROM && step.treasury.record_date < beforeDate)
    .map((step) => ({ ...step, trailingMonthEnds: trailingMonthEndWindow(step.treasury.record_date.slice(0, 7), monthEnds) }));
  return replayRamp(ramp, steps).at(-1)?.machineState ?? null;
};

/**
 * The shadow record for one reading. Null, with the reason logged, if scoring
 * throws: the shadow must never cost the reading it sits beside.
 */
export const scoreShadowRamps = ({
  treasury,
  macroSeries,
  previous,
}: {
  treasury: TreasuryData;
  macroSeries: MacroSeriesReading[];
  previous: ShadowRampRecord | null;
}): ShadowRampRecord | null => {
  try {
    const monthEnds = monthEndsFor(treasury);
    const trailingMonthEnds = trailingMonthEndWindow(treasury.record_date.slice(0, 7), monthEnds);
    const scores = REGISTERED_CANDIDATE_RAMPS.map((ramp): ShadowRampScore => {
      const carried = carriedMachineState(previous, ramp);
      const score = scoreWithRamp({
        ramp,
        treasury,
        macroSeries,
        context: { baseRateHistory: treasury.oneMonthHistory },
        previousMachineState: carried ?? seedMachineState(ramp, treasury.record_date, monthEnds),
        trailingMonthEnds,
      });
      return {
        ramp,
        input: score.reading.input,
        ratePoints: score.reading.ratePoints,
        fundingPressure: score.fundingPressure,
        riskAppetite: score.riskAppetite,
        conditions: score.conditions,
        tight: isTightReading(score.fundingPressure, score.conditions),
        flag: score.reading.flag,
        machineState: score.machineState,
      };
    });
    return {
      registration: "docs/research/premise-test-preregistration.md",
      usedForGuidance: false,
      recordDate: treasury.record_date,
      machineStateFrom: REGISTERED_CANDIDATE_RAMPS.every((ramp) => carriedMachineState(previous, ramp) !== null) ? "previous-record" : "seeded",
      scores,
    };
  } catch (error) {
    console.error("[shadow-ramps] candidate scoring failed; the reading is stored without it.", error);
    return null;
  }
};

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "bun:test";

import { ENGINE_VERSION } from "../lib/regimeEngineCore";
import type { TreasuryPolicyHistoryPoint } from "../lib/regimeEnginePolicy";
import { scoreRegime } from "../lib/regimeEngineScoring";
import type { RegimeMachineSnapshot } from "../lib/regimeStateMachine";
import type { MacroSeriesReading, TreasuryData } from "../lib/types";

/*
 * `ENGINE_VERSION` names the calibration that scored a reading: the archive
 * generators stamp it on every entry and the operating snapshot hashes it. A
 * version that does not move when the scoring does is worse than none, so this
 * fingerprints the scorer's output (codes and numbers, no copy) on a fixed grid
 * of synthetic inputs and pins the digest to the version.
 *
 * When this fails, the scorer now answers differently for the same inputs. If
 * that is intended, bump `ENGINE_VERSION` in `lib/regimeEngineCore.ts` and add
 * the new version with the digest the failure prints. Do not overwrite an old
 * version's digest: that is the one edit that makes the stamp a lie.
 *
 * Synthetic on purpose: the bundled data changes on every regeneration, and a
 * new month of history must not read as a new calibration.
 */
const ENGINE_FINGERPRINTS: Record<string, string> = {
  "engine-2026-10-06": "72ec57668c48d605d6aa342685521018",
  /* The record basis: market inputs the archive does not score move nothing published. */
  "engine-2026-10-09": "c3316a6f2f62195f9a6fde9402790708",
  /* The Chicago Fed index joins the record basis, with its month-end history in the archive. */
  "engine-2026-10-09b": "ca529e0c34cc6e6af89eaf09fb71f69c",
  /* The saturation flag means the score has stopped responding to the base rate, not pressure past 100. */
  "engine-2026-10-21": "2f410e7a99bd4af8235a57d4fafb0d47",
};

const pad = (value: number) => String(value).padStart(2, "0");

// Rational sequences rather than trigonometry, so the grid is exact on every engine.
const POLICY_HISTORY: TreasuryPolicyHistoryPoint[] = Array.from({ length: 150 }, (_, index) => ({
  recordDate: `${2013 + Math.floor(index / 12)}-${pad((index % 12) + 1)}-28`,
  baseRate: index % 17 === 0 ? null : ((index * 37) % 55) / 10,
  curveSlope: index % 19 === 0 ? null : (((index * 23) % 31) - 10) / 10,
}));

const RECORD_DATE = "2025-06-27";

const macro = (
  id: MacroSeriesReading["id"],
  value: number,
  history: { date: string; value: number | null }[] = [],
): MacroSeriesReading => ({
  id,
  label: id,
  value,
  unit: "x",
  explanation: "fixture",
  sourceLabel: "fixture",
  sourceUrl: "https://example.com",
  formulaUrl: "/formulas",
  record_date: RECORD_DATE,
  fetched_at: `${RECORD_DATE}T00:00:00.000Z`,
  isLive: false,
  history,
});

const tail = (value: number) =>
  Array.from({ length: 12 }, (_, index) => ({ date: `2025-06-${pad(index + 10)}`, value: value + (index % 3) }));

const BASE_RATES: (number | null)[] = [null, 0.05, 1.5, 3.45, 3.62, 3.9, 4.4, 5.5];
const CURVES: ([number, number] | null)[] = [null, [1.0, 2.6], [2.0, 2.4], [3.0, 2.9], [4.5, 3.8], [2.0, 4.0]];
const MACRO_SETS: MacroSeriesReading[][] = [
  [],
  [macro("VIX_INDEX", 38, tail(35))],
  [macro("VIX_INDEX", 24, tail(23)), macro("HY_CREDIT_SPREAD", 6.0)],
  [
    macro("HY_CREDIT_SPREAD", 7),
    macro("CHICAGO_FCI", 0.6),
    macro("VC_FUNDING_VELOCITY", -25),
    macro("TECH_LAYOFF_TREND", 85),
    macro("BBB_CREDIT_SPREAD", 2.6, [{ date: "2024-01-31", value: 1.6 }, { date: "2024-06-28", value: 2.0 }]),
    macro("CPI_YOY", 3.5, [{ date: "2024-05-31", value: 3.1 }]),
    macro("UNEMPLOYMENT_RATE", 4.6, [{ date: "2024-05-31", value: 4.0 }, { date: "2024-11-29", value: 4.2 }]),
  ],
];
const MACHINE_STATES: (RegimeMachineSnapshot | null)[] = [
  null,
  { committedState: "EXPANSION", pendingState: null, pendingCount: 0, lastSignals: { tightness: 20, riskAppetite: 80 } },
  { committedState: "SCARCITY", pendingState: "DEFENSIVE", pendingCount: 1, lastSignals: { tightness: 80, riskAppetite: 55 } },
];

const fingerprint = (): string => {
  const outputs: unknown[] = [];
  for (const baseRate of BASE_RATES) {
    for (const curve of CURVES) {
      const treasury: TreasuryData = {
        source: "https://example.com/treasury",
        record_date: RECORD_DATE,
        fetched_at: `${RECORD_DATE}T00:00:00.000Z`,
        isLive: false,
        yields: {
          oneMonth: baseRate,
          twoYear: curve?.[0] ?? null,
          tenYear: curve?.[1] ?? null,
        },
      };
      for (const macroSeries of MACRO_SETS) {
        for (const machineState of MACHINE_STATES) {
          for (const withHistory of [false, true]) {
            const context = withHistory && baseRate !== null
              ? { baseRateHistory: [{ date: "2025-03-28", value: baseRate - 1.2 }, { date: RECORD_DATE, value: baseRate }] }
              : {};
            outputs.push(scoreRegime(treasury, undefined, macroSeries, machineState, context, POLICY_HISTORY));
          }
        }
      }
    }
  }
  // A threshold override, so a change to how overrides resolve is a change too.
  outputs.push(
    scoreRegime(
      { source: "x", record_date: RECORD_DATE, fetched_at: RECORD_DATE, isLive: false, yields: { oneMonth: 3.9, twoYear: 3.8, tenYear: 4.1 } },
      { tightnessRegime: 55, riskAppetiteRegime: 45, baseRateTightness: 3.2 },
      [],
      null,
      {},
      POLICY_HISTORY,
    ),
  );
  return createHash("sha256").update(JSON.stringify(outputs)).digest("hex").slice(0, 32);
};

describe("ENGINE_VERSION", () => {
  it("names the calibration the scorer actually runs", () => {
    const digest = fingerprint();
    assert.equal(
      ENGINE_FINGERPRINTS[ENGINE_VERSION],
      digest,
      `The scorer's output moved under ${ENGINE_VERSION}. If intended, bump ENGINE_VERSION and pin ` +
        `"<new version>": "${digest}" beside the old entries.`,
    );
  });

  it("never pins one output to two versions", () => {
    const digests = Object.values(ENGINE_FINGERPRINTS);
    assert.equal(new Set(digests).size, digests.length);
  });
});

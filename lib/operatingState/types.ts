import type { MacroSeriesReading, TreasuryData } from "../types";
import type { RegimeAssessment } from "../regimeEngine";
import type { WeeklyCallContract } from "../report/weeklyCallContract";
import type { RegimeMachineSnapshot } from "../regimeStateMachine";
import type { PostureTransitionEvent } from "../storage/postureTransitionEventRepository";

export type OperatingSnapshot = {
  id: string;
  /*
   * 2 since 2026-09-16: `diagnostics` renamed its two threshold-distance fields
   * from `tightnessDelta`/`riskAppetiteDelta`, which three artifacts had read as
   * a week-over-week move and published as "vs last week". A stored snapshot of
   * the old shape fails the guard and reads as absent, which the cron refills on
   * its next run — this is derived data, so discarding it costs one refresh.
   */
  schemaVersion: 2;
  epoch: string;
  recordDate: string;
  inputHash: string;
  sourceSnapshotIds: string[];
  treasury: TreasuryData;
  macroSeries: MacroSeriesReading[];
  assessment: RegimeAssessment;
  weeklyCall: WeeklyCallContract;
  machineState: RegimeMachineSnapshot;
  provenance: {
    sourceLabel: string;
    sourceUrl: string;
    recordDateLabel: string;
    timestampLabel: string;
    ageLabel: string;
    statusLabel: string;
    isLive: boolean;
  };
  freshness: {
    treasuryAgeHours: number;
    macroAgeHours: number;
    status: "fresh" | "stale" | "fallback";
  };
};

export type RefreshOperatingStateOptions = {
  fetcher?: typeof fetch;
  forceIngest?: boolean;
  now?: Date;
};

export type RefreshOperatingStateResult =
  | {
      ok: true;
      snapshot: OperatingSnapshot;
      weeklyCall: WeeklyCallContract;
      /** The read this one replaced, for anything judged on consecutive reads. Null on a cold store. */
      previousSnapshot: OperatingSnapshot | null;
      transition: PostureTransitionEvent | null;
      durationMs: number;
    }
  | {
      ok: false;
      error: string;
      durationMs: number;
    };

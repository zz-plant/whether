import type { MacroSeriesReading, TreasuryData } from "../types";
import type { RegimeAssessment } from "../regimeEngine";
import type { WeeklyCallContract } from "../report/weeklyCallContract";
import type { RegimeMachineSnapshot } from "../report/regimeStateMachine";
import type { PostureTransitionEvent } from "../storage/postureTransitionEventRepository";

export type OperatingSnapshot = {
  id: string;
  schemaVersion: 1;
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
      transition: PostureTransitionEvent | null;
      durationMs: number;
    }
  | {
      ok: false;
      error: string;
      durationMs: number;
    };

/**
 * Macro snapshot loader for non-yield-curve signals.
 * Keeps expanded series traceable with explicit sources and timestamps.
 */
import macroSnapshot from "../data/macro_snapshot.json";
import type { MacroSeriesReading } from "./types";

type MacroSnapshotPayload = {
  fetched_at: string;
  isLive: boolean;
  series: Array<
    Omit<MacroSeriesReading, "fetched_at" | "isLive"> & {
      fetched_at?: string;
      isLive?: boolean;
    }
  >;
};

const payload = macroSnapshot as MacroSnapshotPayload;

export const macroSeries: MacroSeriesReading[] = payload.series.map((series) => ({
  ...series,
  fetched_at: payload.fetched_at,
  isLive: payload.isLive,
}));

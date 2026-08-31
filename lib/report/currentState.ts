import type { MacroSeriesReading, TreasuryData } from "../types";
import { fetchTreasuryData } from "../treasury/treasuryClient";
import { snapshotData } from "../snapshot";
import { loadMacroSeries } from "../macroSnapshot";
import { loadCanonicalReportInputs } from "../ingestion/materialized";
import { getOperatingSnapshotStore } from "../operatingState/snapshotStore";
import type { OperatingSnapshot } from "../operatingState/types";

export type CurrentStateInputs = {
  treasury: TreasuryData;
  macroSeries: MacroSeriesReading[];
  canonicalInputs: {
    treasury: TreasuryData;
    macroSeries: MacroSeriesReading[];
    materializedSignals: unknown;
  } | null;
  storedSnapshot: OperatingSnapshot | null;
};

export const loadCurrentStateInputs = async ({
  fetcher = fetch,
  asOf,
}: {
  fetcher?: typeof fetch;
  asOf?: string;
} = {}): Promise<CurrentStateInputs> => {
  // If not historical asOf, attempt reading cached OperatingSnapshot first
  const storedSnapshot = asOf ? null : await getOperatingSnapshotStore().readLatest();

  const canonicalInputs = asOf
    ? null
    : await loadCanonicalReportInputs({ fetcher, refresh: "none" });

  let treasury: TreasuryData;
  let macroSeries: MacroSeriesReading[];

  if (canonicalInputs) {
    treasury = canonicalInputs.treasury;
    macroSeries = canonicalInputs.macroSeries;
  } else if (storedSnapshot) {
    treasury = storedSnapshot.treasury;
    macroSeries = storedSnapshot.macroSeries;
  } else {
    const [t, m] = await Promise.all([
      fetchTreasuryData({ fetcher, snapshotFallback: snapshotData, asOf }),
      loadMacroSeries(fetcher),
    ]);
    treasury = t;
    macroSeries = m;
  }

  return {
    treasury,
    macroSeries,
    canonicalInputs,
    storedSnapshot,
  };
};

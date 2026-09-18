import { getOperatingSnapshotStore } from "../operatingState/snapshotStore";
import { loadCanonicalReportInputs } from "../ingestion/materialized";
import { buildOperatingSnapshot } from "../operatingState/snapshot";
import type { OperatingSnapshot } from "../operatingState/types";

/**
 * The snapshot an export route draws from: the stored one, or one built from
 * the materialized inputs when nothing has been stored yet. Shared by the SVG
 * slide and the board slide files so the two cannot read different weeks.
 * `refresh: "none"` keeps an export off the ingest path, per AGENTS.md.
 */
export const loadExportSnapshot = async (): Promise<OperatingSnapshot | null> => {
  const stored = await getOperatingSnapshotStore().readLatest();
  if (stored) return stored;

  const inputs = await loadCanonicalReportInputs({ refresh: "none" });
  if (!inputs) return null;
  return buildOperatingSnapshot({ treasury: inputs.treasury, macroSeries: inputs.macroSeries });
};

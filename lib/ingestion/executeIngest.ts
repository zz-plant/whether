import { loadCanonicalReportInputs } from "./materialized";

export type IngestResult = {
  ok: boolean;
  treasury?: { recordDate: string; isLive: boolean };
  macroLive?: number;
  macroTotal?: number;
  error?: string;
};

export const executeIngest = async (): Promise<IngestResult> => {
  try {
    const result = await loadCanonicalReportInputs({});
    if (!result) {
      return { ok: false, error: "Ingestion produced no data" };
    }
    return {
      ok: true,
      treasury: { recordDate: result.treasury.record_date, isLive: result.treasury.isLive },
      macroLive: result.macroSeries.filter((s) => s.isLive).length,
      macroTotal: result.macroSeries.length,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

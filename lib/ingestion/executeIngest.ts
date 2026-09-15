import { loadCanonicalReportInputs } from "./materialized";
import { writeAnalytics } from "../telemetry/analyticsEngine";
import { revalidateReportDataCaches } from "../report/cacheTags";

type IngestResult = {
  ok: boolean;
  treasury?: { recordDate: string; isLive: boolean };
  macroLive?: number;
  macroTotal?: number;
  error?: string;
  durationMs?: number;
};

export const executeIngest = async (): Promise<IngestResult> => {
  const startTime = Date.now();
  try {
    const result = await loadCanonicalReportInputs({});
    const durationMs = Date.now() - startTime;
    if (!result) {
      writeAnalytics("ingest-pipeline", { ok: false, error: "Ingestion produced no data", durationMs }, { doubles: [0, 0, durationMs] });
      return { ok: false, error: "Ingestion produced no data", durationMs };
    }
    /* Fresh inputs invalidate tag-cached report data immediately instead of leaving
     * the homepage to wait out its time-based revalidate window. */
    await revalidateReportDataCaches();

    const macroLive = result.macroSeries.filter((s) => s.isLive).length;
    const macroTotal = result.macroSeries.length;
    writeAnalytics(
      "ingest-pipeline",
      {
        ok: true,
        recordDate: result.treasury.record_date,
        isTreasuryLive: result.treasury.isLive,
        macroLive,
        macroTotal,
        durationMs,
      },
      { doubles: [macroLive, macroTotal, durationMs] },
    );
    return {
      ok: true,
      treasury: { recordDate: result.treasury.record_date, isLive: result.treasury.isLive },
      macroLive,
      macroTotal,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    writeAnalytics("ingest-pipeline", { ok: false, error: errorMessage, durationMs }, { doubles: [0, 0, durationMs] });
    return {
      ok: false,
      error: errorMessage,
      durationMs,
    };
  }
};

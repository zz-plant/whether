/**
 * Weekly summary API endpoint for sharing the current report snapshot.
 */
import { NextResponse } from "next/server";
import { loadReportData } from "../../../lib/reportData";
import { TREASURY_SOURCE_LABEL } from "../../../lib/regimeEngine";
import { buildWeeklySummary } from "../../../lib/weeklySummary";

export const dynamic = "force-dynamic";

export const GET = async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const params = Object.fromEntries(searchParams.entries());
  const { assessment, recordDateLabel, fetchedAtLabel, treasury } = await loadReportData(params);
  const summary = buildWeeklySummary({
    assessment,
    recordDateLabel,
    fetchedAtLabel,
    sourceLabel: TREASURY_SOURCE_LABEL,
    sourceUrl: treasury.source,
  });

  return NextResponse.json({
    summary,
    data: {
      recordDate: treasury.record_date,
      fetchedAt: treasury.fetched_at,
      isLive: treasury.isLive,
      sourceUrl: treasury.source,
    },
  });
};

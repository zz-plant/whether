import { NextResponse } from "next/server";
import { loadReportDataSafe } from "../../../lib/report/reportData";
import type { SourceHealthRow } from "../../../lib/report/sourceHealth";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

const STALE_AFTER_HOURS = 6;
const RECORD_DATE_STALE_AFTER_HOURS = 96;

const toHours = (isoTimestamp: string, now = new Date()) => {
  const timestamp = Date.parse(isoTimestamp);
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return Number(((now.getTime() - timestamp) / 3_600_000).toFixed(2));
};

const getCommitSha = () =>
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.CF_PAGES_COMMIT_SHA ??
  process.env.GITHUB_SHA ??
  null;

export async function GET() {
  const now = new Date();
  const reportResult = await loadReportDataSafe(undefined, { route: "/api/health" });
  const { treasury, sourceHealth } = reportResult.ok ? reportResult.data : reportResult.fallback;
  const fetchedAgeHours = toHours(treasury.fetched_at, now);
  const recordDateAgeHours = toHours(`${treasury.record_date}T00:00:00.000Z`, now);
  const staleByFetchTimestamp = fetchedAgeHours === null ? true : fetchedAgeHours > STALE_AFTER_HOURS;
  const staleByRecordDate = recordDateAgeHours === null ? true : recordDateAgeHours > RECORD_DATE_STALE_AFTER_HOURS;
  const stale = staleByFetchTimestamp || staleByRecordDate;
  const treasuryStatus = stale ? "degraded" : "ok";

  const status = reportResult.ok && treasuryStatus === "ok" ? "ok" : reportResult.ok ? "degraded" : "down";
  const statusCode = status === "ok" ? 200 : 503;
  const sources = sourceHealth.map((source): SourceHealthRow & { status: "ok" | "degraded" | "unknown" } => ({
    ...source,
    status:
      source.freshnessStatus === "unknown"
        ? "unknown"
        : source.freshnessStatus === "fresh" && source.mode === "live"
          ? "ok"
          : "degraded",
  }));

  return NextResponse.json(
    {
      status,
      service: "whether",
      generatedAt: now.toISOString(),
      version: "v1",
      commitSha: getCommitSha(),
      checks: {
        treasuryData: {
          status: reportResult.ok ? treasuryStatus : "down",
          stale,
          staleByFetchTimestamp,
          staleByRecordDate,
          fallbackUsed: !reportResult.ok,
          staleAfterHours: STALE_AFTER_HOURS,
          staleRecordDateAfterHours: RECORD_DATE_STALE_AFTER_HOURS,
          fetchedAgeHours,
          recordDateAgeHours,
          fetchedAt: treasury.fetched_at,
          recordDate: treasury.record_date,
          isLive: treasury.isLive,
          source: treasury.source,
        },
      },
      sources,
    },
    { status: statusCode },
  );
}

import { NextResponse } from "next/server";
import { loadReportDataSafe } from "../../../lib/report/reportData";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

const STALE_AFTER_HOURS = 6;

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
  const { treasury } = reportResult.ok ? reportResult.data : reportResult.fallback;
  const ageHours = toHours(treasury.fetched_at, now);
  const stale = ageHours === null ? true : ageHours > STALE_AFTER_HOURS;
  const treasuryStatus = stale ? "degraded" : "ok";

  const status = reportResult.ok && treasuryStatus === "ok" ? "ok" : reportResult.ok ? "degraded" : "down";
  const statusCode = status === "ok" ? 200 : 503;

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
          fallbackUsed: !reportResult.ok,
          staleAfterHours: STALE_AFTER_HOURS,
          ageHours,
          fetchedAt: treasury.fetched_at,
          recordDate: treasury.record_date,
          isLive: treasury.isLive,
          source: treasury.source,
        },
      },
    },
    { status: statusCode },
  );
}

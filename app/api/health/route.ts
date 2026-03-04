import { NextResponse } from "next/server";
import { loadReportData } from "../../../lib/report/reportData";

export { edgeRuntime as runtime } from "../../../lib/next-runtime";
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
  try {
    const now = new Date();
    const { treasury } = await loadReportData();
    const ageHours = toHours(treasury.fetched_at, now);
    const stale = ageHours === null ? true : ageHours > STALE_AFTER_HOURS;
    const treasuryStatus = stale ? "degraded" : "ok";

    const status = treasuryStatus === "ok" ? "ok" : "degraded";
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
            status: treasuryStatus,
            stale,
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        status: "down",
        service: "whether",
        generatedAt: new Date().toISOString(),
        version: "v1",
        commitSha: getCommitSha(),
        checks: {
          treasuryData: {
            status: "down",
            error: message,
          },
        },
      },
      { status: 503 },
    );
  }
}

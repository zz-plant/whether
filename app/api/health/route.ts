import { NextResponse } from "next/server";
import { loadReportDataSafe } from "../../../lib/report/reportData";
import { withDeadline } from "../../../lib/withDeadline";
import { getDeployedVersion } from "../../../lib/runtime/versionMetadata";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

/**
 * Deliberately shorter than the report path's own deadline. A health check that blocks on
 * the dependency it reports on goes down with it and returns nothing at all, which is the
 * one outcome a monitor cannot act on. Probing with a tight bound means a stalled
 * dependency gets reported as a stalled dependency.
 */
const DEPENDENCY_PROBE_TIMEOUT_MS = 3_000;

type DependencyState = "ok" | "degraded" | "timeout";

const probeReportData = async (): Promise<DependencyState> => {
  try {
    const reportResult = await withDeadline(
      loadReportDataSafe(undefined, { route: "/api/health" }),
      DEPENDENCY_PROBE_TIMEOUT_MS,
      "health-report-data",
    );
    return reportResult.ok ? "ok" : "degraded";
  } catch {
    return "timeout";
  }
};

export async function GET() {
  const now = new Date();
  const reportData = await probeReportData();
  /* `version` is this endpoint's schema version and says nothing about what is running.
     `deployedVersion` is the Worker actually serving the request, so "is production
     current?" can be answered without trusting the pipeline that claims to have shipped
     it. Null off Cloudflare, where the binding does not exist. */
  const deployedVersion = getDeployedVersion();

  return NextResponse.json(
    {
      status: reportData === "ok" ? "ok" : "down",
      service: "whether",
      generatedAt: now.toISOString(),
      version: "v1",
      deployedVersion,
      dependencies: {
        reportData,
      },
    },
    { status: reportData === "ok" ? 200 : 503 },
  );
}

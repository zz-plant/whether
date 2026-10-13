import { NextResponse } from "next/server";
import { loadReportDataSafe } from "../../../lib/report/reportData";
import { withDeadline } from "../../../lib/withDeadline";
import { getBuildCommit, getDeployedVersion } from "../../../lib/runtime/versionMetadata";
import { listStaleLiveSources } from "../../../lib/report/sourceHealth";

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

type Probe = { reportData: DependencyState; staleSources: ReturnType<typeof listStaleLiveSources> };

const probeReportData = async (): Promise<Probe> => {
  try {
    const reportResult = await withDeadline(
      loadReportDataSafe(undefined, { route: "/api/health" }),
      DEPENDENCY_PROBE_TIMEOUT_MS,
      "health-report-data",
    );
    return reportResult.ok
      ? { reportData: "ok", staleSources: listStaleLiveSources(reportResult.data.sourceHealth) }
      : { reportData: "degraded", staleSources: [] };
  } catch {
    return { reportData: "timeout", staleSources: [] };
  }
};

export async function GET() {
  const now = new Date();
  const { reportData, staleSources } = await probeReportData();
  /* Stale live inputs are "degraded", not "down": the page still serves a reading, but
     one a reader would act on as current. A 200, so the site is not routed around, with
     the sources named so a monitor can say which feed stopped. */
  const status = reportData !== "ok" ? "down" : staleSources.length > 0 ? "degraded" : "ok";
  /* `version` is this endpoint's schema version and says nothing about what is running.
     `deployedVersion` is the Worker actually serving the request, so "is production
     current?" can be answered without trusting the pipeline that claims to have shipped
     it. Null off Cloudflare, where the binding does not exist. */
  const deployedVersion = getDeployedVersion();

  return NextResponse.json(
    {
      status,
      service: "whether",
      generatedAt: now.toISOString(),
      version: "v1",
      deployedVersion,
      commit: getBuildCommit(),
      dependencies: {
        reportData,
        dataFreshness: staleSources.length > 0 ? "stale" : "ok",
      },
      staleSources,
    },
    { status: reportData === "ok" ? 200 : 503 },
  );
}

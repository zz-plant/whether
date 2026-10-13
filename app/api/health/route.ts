import { NextResponse } from "next/server";
import { loadReportDataSafe } from "../../../lib/report/reportData";
import { withDeadline } from "../../../lib/withDeadline";
import { getBuildCommit, getDeployedVersion } from "../../../lib/runtime/versionMetadata";
import { judgeDataFreshness, listDegradedLiveSources } from "../../../lib/report/sourceHealth";
import { getDefaultIngestionStore } from "../../../lib/ingestion/store";
import { classifyIngestModelFreshness, type IngestModelFreshness } from "../../../lib/ingestion/cadence";

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

type Probe = { reportData: DependencyState; degradedSources: ReturnType<typeof listDegradedLiveSources> };

const probeReportData = async (): Promise<Probe> => {
  try {
    const reportResult = await withDeadline(
      loadReportDataSafe(undefined, { route: "/api/health" }),
      DEPENDENCY_PROBE_TIMEOUT_MS,
      "health-report-data",
    );
    return reportResult.ok
      ? { reportData: "ok", degradedSources: listDegradedLiveSources(reportResult.data.sourceHealth) }
      : { reportData: "degraded", degradedSources: [] };
  } catch {
    return { reportData: "timeout", degradedSources: [] };
  }
};

type ModelProbe = { ingestModel: IngestModelFreshness; ingestModelAsOf: string | null };

/**
 * The coordinator's materialized model, which its hourly alarm refreshes. The source rows above
 * follow the cron's daily snapshot, so they cannot tell a working alarm from a stopped one; on
 * 2026-10-13 the alarm ran without its FRED key for days behind rows that only the cron fed.
 * A model that cannot be read is "unknown", not stale: the report probe already covers outages.
 */
const probeIngestModel = async (now: Date): Promise<ModelProbe> => {
  try {
    const model = await withDeadline(
      getDefaultIngestionStore().readLatestMaterialized(),
      DEPENDENCY_PROBE_TIMEOUT_MS,
      "health-ingest-model",
    );
    const asOf = model?.asOf ?? null;
    return { ingestModel: classifyIngestModelFreshness(asOf, now), ingestModelAsOf: asOf };
  } catch {
    return { ingestModel: "unknown", ingestModelAsOf: null };
  }
};

export async function GET() {
  const now = new Date();
  const [{ reportData, degradedSources }, { ingestModel, ingestModelAsOf }] = await Promise.all([
    probeReportData(),
    probeIngestModel(now),
  ]);
  /* The past-their-window subset, under the name monitors have read it by since it shipped. */
  const staleSources = degradedSources.filter((source) => source.state === "stale");
  /* A degraded live input is "degraded", not "down": the page still serves a reading, but
     one a reader would act on as current. A 200, so the site is not routed around, with
     the sources named so a monitor can say which feed stopped. A stale ingest model is
     degraded for the same reason one step earlier: the next cron would publish old data. */
  const degraded = degradedSources.length > 0 || ingestModel === "stale";
  const status = reportData !== "ok" ? "down" : degraded ? "degraded" : "ok";
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
        dataFreshness: judgeDataFreshness(reportData === "ok", degradedSources),
        ingestModel,
      },
      degradedSources,
      staleSources,
      ingestModelAsOf,
    },
    { status: reportData === "ok" ? 200 : 503 },
  );
}

import { NextResponse } from "next/server";
import { loadReportDataSafe } from "../../../lib/report/reportData";
import { withDeadline } from "../../../lib/withDeadline";
import { getBuildCommit, getDeployedVersion } from "../../../lib/runtime/versionMetadata";
import { judgeDataFreshness, listDegradedLiveSources } from "../../../lib/report/sourceHealth";
import { getDefaultIngestionStore } from "../../../lib/ingestion/store";
import { classifyIngestModelFreshness, type IngestModelFreshness } from "../../../lib/ingestion/cadence";
import { missingRequiredSecrets } from "../../../lib/runtime/deploymentSecrets";
import { readSetting } from "../../../lib/runtime/settings";
import { readFailingRuns } from "../../../lib/delivery/runOutcomes";

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

type AutomationState = "ok" | "unconfigured" | "failing" | "unknown";

type AutomationProbe = {
  automation: AutomationState;
  missingSecrets: string[];
  failingRuns: Awaited<ReturnType<typeof readFailingRuns>>;
};

/**
 * Whether the scheduled work can run and did. Neither question is answered by the probes above:
 * from 2026-11-02 both data Workflows failed every day for want of GITHUB_TOKEN while the data
 * itself stayed fresh, so this endpoint said "ok" for three weeks. Missing secrets are judged
 * against this lane's own switches (lib/runtime/deploymentSecrets.ts), so a Preview or a dev
 * server, which switches none on, is never "unconfigured". A record that cannot be read is
 * "unknown", as with the ingest model, unless a secret is missing, which needs no read.
 */
const probeAutomation = async (): Promise<AutomationProbe> => {
  const missingSecrets = missingRequiredSecrets(
    {
      setting: (name) => readSetting(name),
      hasBinding: (name) => {
        const binding: unknown = Reflect.get(globalThis, name);
        return typeof binding === "object" && binding !== null;
      },
    },
    (name) => readSetting(name) !== null,
  );
  try {
    const failingRuns = await withDeadline(readFailingRuns(), DEPENDENCY_PROBE_TIMEOUT_MS, "health-run-outcomes");
    const automation = missingSecrets.length > 0 ? "unconfigured" : failingRuns.length > 0 ? "failing" : "ok";
    return { automation, missingSecrets, failingRuns };
  } catch {
    return { automation: missingSecrets.length > 0 ? "unconfigured" : "unknown", missingSecrets, failingRuns: [] };
  }
};

export async function GET() {
  const now = new Date();
  const [{ reportData, degradedSources }, { ingestModel, ingestModelAsOf }, { automation, missingSecrets, failingRuns }] =
    await Promise.all([probeReportData(), probeIngestModel(now), probeAutomation()]);
  /* The past-their-window subset, under the name monitors have read it by since it shipped. */
  const staleSources = degradedSources.filter((source) => source.state === "stale");
  /* A degraded live input is "degraded", not "down": the page still serves a reading, but
     one a reader would act on as current. A 200, so the site is not routed around, with
     the sources named so a monitor can say which feed stopped. A stale ingest model is
     degraded for the same reason one step earlier: the next cron would publish old data.
     Automation that cannot run or did not is degraded too: today's reading is fine, and the
     archive, the sends or the failure notice behind it are not. */
  const automationDegraded = automation === "unconfigured" || automation === "failing";
  const degraded = degradedSources.length > 0 || ingestModel === "stale" || automationDegraded;
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
        automation,
      },
      degradedSources,
      staleSources,
      ingestModelAsOf,
      missingSecrets,
      failingRuns,
    },
    { status: reportData === "ok" ? 200 : 503 },
  );
}

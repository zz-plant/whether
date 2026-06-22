import { NextResponse } from "next/server";
import { loadReportDataSafe } from "../../../lib/report/reportData";
import { getBusinessDayElapsedHours, type SourceHealthRow } from "../../../lib/report/sourceHealth";
import { getFredCircuitBreakerState } from "../../../lib/fred";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

const STALE_AFTER_HOURS = 6;
const RECORD_DATE_STALE_AFTER_HOURS = 120;

const toHours = (isoTimestamp: string, now = new Date()) => {
  const timestamp = Date.parse(isoTimestamp);
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return Number(((now.getTime() - timestamp) / 3_600_000).toFixed(2));
};

const toBusinessHours = (isoTimestamp: string | null | undefined, now = new Date()): number | null => {
  if (!isoTimestamp) return null;
  const hours = getBusinessDayElapsedHours(isoTimestamp, now);
  return hours === Infinity ? null : hours;
};

type WorkerVersionMetadata = {
  id?: string;
  tag?: string;
  timestamp?: string;
};

const getCommitSha = () => {
  // Workers Version Metadata binding (configured in wrangler.toml as
  // `[version_metadata] binding = "CF_VERSION_METADATA"`). Available on the
  // Workers runtime via globalThis at request time. `id` is the version UUID;
  // `tag` is the optional human-readable tag, used as a secondary reference.
  const versionMetadata = (globalThis as { CF_VERSION_METADATA?: WorkerVersionMetadata })
    .CF_VERSION_METADATA;
  return (
    versionMetadata?.id ??
    versionMetadata?.tag ??
    process.env.CF_PAGES_COMMIT_SHA ??
    process.env.GITHUB_SHA ??
    null
  );
};

type MonitorSourceHealthRow = {
  sourceName: string;
  cadenceLabel: string;
  freshnessStatus: "fresh" | "stale" | "unknown";
  freshnessSlaHours: number;
  lastSuccessfulFetchAt: string | null;
  activeFallbackReason: string | null;
  mode: "live" | "fallback";
  status: "ok" | "degraded" | "unknown";
};

const toMonitorMode = (mode: SourceHealthRow["mode"]): MonitorSourceHealthRow["mode"] =>
  mode === "live" ? "live" : "fallback";

const toMonitorStatus = (
  freshnessStatus: SourceHealthRow["freshnessStatus"],
  mode: MonitorSourceHealthRow["mode"],
): MonitorSourceHealthRow["status"] => {
  if (freshnessStatus === "unknown") {
    return "unknown";
  }

  return freshnessStatus === "fresh" && mode === "live" ? "ok" : "degraded";
};

const getNormalizedFreshnessStatus = (
  rows: SourceHealthRow[],
): MonitorSourceHealthRow["freshnessStatus"] => {
  if (rows.some((row) => row.freshnessStatus === "stale")) {
    return "stale";
  }

  if (rows.every((row) => row.freshnessStatus === "unknown")) {
    return "unknown";
  }

  if (rows.some((row) => row.freshnessStatus === "unknown")) {
    return "unknown";
  }

  return "fresh";
};

const normalizeMonitorSourceHealth = (sourceHealth: SourceHealthRow[]): MonitorSourceHealthRow[] => {
  const treasuryRow = sourceHealth.find((row) => row.sourceName === "Treasury");
  const macroRows = sourceHealth.filter((row) => row.sourceName !== "Treasury");

  const normalizedRows: MonitorSourceHealthRow[] = [];

  if (treasuryRow) {
    const mode = toMonitorMode(treasuryRow.mode);
    normalizedRows.push({
      ...treasuryRow,
      mode,
      status: toMonitorStatus(treasuryRow.freshnessStatus, mode),
    });
  }

  if (macroRows.length > 0) {
    const mode = macroRows.every((row) => row.mode === "live") ? "live" : "fallback";
    const fallbackReasons = macroRows
      .map((row) => row.activeFallbackReason)
      .filter((reason): reason is string => typeof reason === "string" && reason.trim().length > 0);
    const freshnessStatus = getNormalizedFreshnessStatus(macroRows);

    normalizedRows.push({
      sourceName: "Macro",
      cadenceLabel: "Mixed cadence",
      freshnessStatus,
      freshnessSlaHours: Math.max(...macroRows.map((row) => row.freshnessSlaHours)),
      lastSuccessfulFetchAt: macroRows
        .map((row) => row.lastSuccessfulFetchAt)
        .filter((timestamp): timestamp is string => typeof timestamp === "string")
        .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null,
      activeFallbackReason:
        fallbackReasons.length > 0 ? Array.from(new Set(fallbackReasons)).join(" ") : null,
      mode,
      status: toMonitorStatus(freshnessStatus, mode),
    });
  }

  return normalizedRows;
};

export async function GET() {
  const now = new Date();
  const reportResult = await loadReportDataSafe(undefined, { route: "/api/health" });
  const { treasury, sourceHealth } = reportResult.ok ? reportResult.data : reportResult.fallback;
  const fetchedAgeHours = toBusinessHours(treasury.fetched_at, now);
  const recordDateAgeHours = toHours(`${treasury.record_date}T00:00:00.000Z`, now);
  const staleByFetchTimestamp = fetchedAgeHours === null || fetchedAgeHours > STALE_AFTER_HOURS;
  const staleByRecordDate = recordDateAgeHours === null ? true : recordDateAgeHours > RECORD_DATE_STALE_AFTER_HOURS;
  const stale = staleByFetchTimestamp || staleByRecordDate;
  const treasuryStatus = stale ? "degraded" : "ok";

  const sources = normalizeMonitorSourceHealth(sourceHealth);
  const macroHealthRow = sources.find((row) => row.sourceName === "Macro");
  const macroStatus: MonitorSourceHealthRow["status"] = !macroHealthRow ? "unknown" : macroHealthRow.status;

  const status = reportResult.ok && treasuryStatus === "ok" && macroStatus === "ok" ? "ok" : reportResult.ok ? "degraded" : "down";
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
        macroData: {
          status: macroStatus,
          stale: macroHealthRow ? macroHealthRow.freshnessStatus === "stale" : true,
          fallback: macroHealthRow ? macroHealthRow.mode === "fallback" : true,
          source: "FRED",
          freshnessStatus: macroHealthRow?.freshnessStatus ?? "unknown",
          mode: macroHealthRow?.mode ?? "unknown",
          freshnessSlaHours: macroHealthRow?.freshnessSlaHours ?? null,
          lastSuccessfulFetchAt: macroHealthRow?.lastSuccessfulFetchAt ?? null,
          activeFallbackReason: macroHealthRow?.activeFallbackReason ?? null,
        },
      },
      fredCircuitBreaker: getFredCircuitBreakerState(),
      sources,
    },
    { status: statusCode },
  );
}

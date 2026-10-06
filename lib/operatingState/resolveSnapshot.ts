/**
 * Which reading a send or a check acts on, and what it does when there is none.
 *
 * The cron hands every step the snapshot it just materialized. The manual
 * routes hand nothing, and each sender used to decide on its own what "the
 * current snapshot" was — the weekly email and the month-end pulse read the
 * store and stopped when it was empty, the alert delivery and the regime check
 * read the store and fell back to a report read, and the Slack post skipped
 * the store and read the report. Five behaviours for one question, none of
 * them written down beside the others.
 *
 * Now the question has one answer with the miss policy named by the caller:
 *
 * - a given snapshot is used as given (its own weekly call unless one is
 *   passed beside it);
 * - otherwise the stored one, unless the caller opts out of the store;
 * - otherwise `onMiss`: `"refuse"` returns null, and `"report"` assembles the
 *   report. That read succeeds on a total upstream outage by serving the
 *   bundled copy, so a caller that takes it must judge readiness before acting
 *   on it — which is what `assessReadingReadiness` is for.
 *
 * `lib/export/exportSnapshot.ts` resolves its own way on purpose: an export is
 * built from the materialized inputs when nothing is stored, which is a read,
 * not a send.
 */
import type { OperatingSnapshot } from "./types";
import type { WeeklyCallContract } from "../report/weeklyCallContract";
import type { TreasuryData } from "../types";
import { getOperatingSnapshotStore } from "./snapshotStore";
import { assessPublishReadiness } from "../report/briefPublishGuard";
import { loadReportDataSafe, type ReportData } from "../report/reportData";

type SnapshotReading = {
  source: "given" | "stored";
  snapshot: OperatingSnapshot;
  weeklyCall: WeeklyCallContract;
};

type ReportReading = {
  source: "report";
  report: ReportData;
  /** Report assembly failed outright and `report` is the loader's fallback. */
  degraded: boolean;
};

export type OperatingReading = SnapshotReading | ReportReading;

type GivenReading = {
  snapshot?: OperatingSnapshot | null;
  weeklyCall?: WeeklyCallContract | null;
};

export async function resolveOperatingSnapshot(options: {
  given?: GivenReading;
  onMiss: "refuse";
}): Promise<SnapshotReading | null>;
export async function resolveOperatingSnapshot(options: {
  given?: GivenReading;
  onMiss: "report";
  /** False for a caller whose report read is the source of truth (the Slack post mirrors GET /api/brief/slack). */
  consultStore?: boolean;
  /** Names the caller in the report loader's dependency log. */
  route: string;
}): Promise<OperatingReading>;
export async function resolveOperatingSnapshot(options: {
  given?: GivenReading;
  onMiss: "refuse" | "report";
  consultStore?: boolean;
  route?: string;
}): Promise<OperatingReading | null> {
  const given = options.given?.snapshot;
  if (given) {
    return { source: "given", snapshot: given, weeklyCall: options.given?.weeklyCall ?? given.weeklyCall };
  }

  if (options.consultStore !== false) {
    const stored = await getOperatingSnapshotStore().readLatest();
    if (stored) return { source: "stored", snapshot: stored, weeklyCall: stored.weeklyCall };
  }

  if (options.onMiss === "refuse") return null;

  const result = await loadReportDataSafe(undefined, { route: options.route ?? "operating-snapshot" });
  return result.ok
    ? { source: "report", report: result.data, degraded: false }
    : { source: "report", report: result.fallback, degraded: true };
}

type ReadinessTreasury = Pick<TreasuryData, "isLive" | "fallback_at" | "fallback_reason" | "record_date">;

const readinessOf = (
  {
    treasury,
    degraded,
    isFallback,
    isLive,
  }: { treasury: ReadinessTreasury; degraded: boolean; isFallback: boolean; isLive: boolean },
  now: Date,
) =>
  assessPublishReadiness({
    degraded,
    /* The reading's own flag and the treasury's fallback stamp, together: the
       email read the first and the Slack post the second, so a reading marked
       one way and not the other was sendable by one and refused by the other. */
    isFallback: isFallback || Boolean(treasury.fallback_at || treasury.fallback_reason),
    isLive,
    fallbackReason: treasury.fallback_reason,
    recordDate: treasury.record_date,
    now,
  });

/**
 * Whether a snapshot may be sent as this week's reading: live, not a fallback,
 * and dated inside the archive's window (`briefPublishGuard`). The one check the
 * weekly email and the weekly Slack post both make.
 */
export const assessSnapshotReadiness = (
  snapshot: Pick<OperatingSnapshot, "treasury" | "freshness" | "provenance">,
  now: Date,
) =>
  readinessOf(
    {
      treasury: snapshot.treasury,
      degraded: false,
      isFallback: snapshot.freshness.status === "fallback",
      isLive: snapshot.provenance.isLive,
    },
    now,
  );

/** The same check for whichever reading `resolveOperatingSnapshot` returned. */
export const assessReadingReadiness = (reading: OperatingReading, now: Date) =>
  reading.source === "report"
    ? readinessOf(
        {
          treasury: reading.report.treasury,
          degraded: reading.degraded,
          isFallback: false,
          isLive: reading.report.treasury.isLive,
        },
        now,
      )
    : assessSnapshotReadiness(reading.snapshot, now);

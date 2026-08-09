import Link from "next/link";
import { DataProvenanceStrip, type DataProvenance } from "../dataProvenanceStrip";
import { resolveTrustReadinessCopy } from "../../../lib/report/trustStatus";
import type {
  ApprovalBucket,
  DegradedSourceRow,
  OutageExitGate,
  RecoveryPlan,
} from "./types";

export const resolveTrustProvenance = ({
  provenance,
  sourceLabel,
  sourceHref,
  degradedSourceRows,
}: {
  provenance?: DataProvenance;
  sourceLabel: string;
  sourceHref?: string;
  degradedSourceRows?: DegradedSourceRow[];
}): DataProvenance | undefined => {
  if (!provenance) {
    return undefined;
  }

  const hasDegradedSourceRows = Boolean(degradedSourceRows && degradedSourceRows.length > 0);
  const shouldDowngradeLiveLabel =
    hasDegradedSourceRows && provenance.statusLabel === "Live (high confidence)";

  return {
    ...provenance,
    sourceLabel,
    sourceUrl: sourceHref ?? provenance.sourceUrl,
    statusLabel: shouldDowngradeLiveLabel ? "Cached (medium)" : provenance.statusLabel,
  };
};

const trustPanelToneClass: Record<"stable" | "warning" | "historical", string> = {
  stable: "border-emerald-400/40 bg-emerald-500/10 text-emerald-100",
  warning: "border-amber-400/40 bg-amber-500/10 text-amber-100",
  historical: "border-slate-500/45 bg-slate-800/60 text-slate-200",
};

const sourceReadinessScore = (modeLabel: string, freshnessStatus: string) => {
  const mode = modeLabel.toLowerCase();
  const freshness = freshnessStatus.toLowerCase();
  let score = mode.includes("live") ? 100 : mode.includes("snapshot") ? 62 : 38;
  if (freshness.includes("stale")) score -= 22;
  if (freshness.includes("degraded")) score -= 26;
  return Math.max(18, Math.min(100, score));
};

export type HeroTrustProvenanceBlockProps = {
  trustStatusTone: "stable" | "warning" | "historical";
  trustStatusLabel: string;
  trustStatusDetail: string;
  trustStatusAction: string;
  outageType?:
    | "live-data"
    | "feed-unavailable"
    | "stale-cache"
    | "source-divergence"
    | "historical-snapshot";
  outageSeverity?: "advisory" | "blocking" | "critical";
  decisionImpactWindow?: string;
  approvalBuckets?: ApprovalBucket[];
  recoveryPlan?: RecoveryPlan;
  outageExitGate?: OutageExitGate;
  degradedSourceRows?: DegradedSourceRow[];
  statusLabel: string;
  fetchedAtLabel: string;
  resolvedNextRefreshLabel: string;
  sourceLabel: string;
  sourceHref?: string;
  provenance?: DataProvenance;
};

export function HeroTrustProvenanceBlock({
  trustStatusTone,
  trustStatusLabel,
  trustStatusDetail,
  trustStatusAction,
  outageType,
  outageSeverity,
  decisionImpactWindow,
  approvalBuckets,
  recoveryPlan,
  outageExitGate,
  degradedSourceRows,
  statusLabel,
  fetchedAtLabel,
  resolvedNextRefreshLabel,
  sourceLabel,
  sourceHref,
  provenance,
}: HeroTrustProvenanceBlockProps) {
  const trustProvenance = resolveTrustProvenance({
    provenance,
    sourceLabel,
    sourceHref,
    degradedSourceRows,
  });
  const trustReadiness = resolveTrustReadinessCopy({
    trustStatusTone,
    degradedSourceRows,
    trustStatusDetail,
  });
  const hasDegradedSourceRows = Boolean(degradedSourceRows && degradedSourceRows.length > 0);
  const isCompactStableState =
    trustReadiness.tone === "stable" && !outageSeverity && !hasDegradedSourceRows;
  const trustToneClass = trustPanelToneClass[trustReadiness.tone];
  const controlHeadline = trustStatusLabel;
  const trustStatusDetailForDisplay = trustStatusDetail;
  const trustStatusActionForDisplay = trustStatusAction;
  const currentApprovalLane = approvalBuckets?.[0];

  return (
    <section className="weather-panel weather-trust-board flex flex-col gap-3 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex min-h-[28px] items-center rounded-md border px-2.5 py-1 text-fluid-micro font-semibold uppercase tracking-[0.12em] ${trustToneClass}`}
            >
              {controlHeadline}
            </span>
            <span className="text-fluid-micro font-semibold uppercase tracking-[0.14em] text-slate-400">
              Approval readiness
            </span>
            {outageSeverity ? (
              <span
                className={`inline-flex min-h-[28px] items-center rounded-md border px-2.5 py-1 text-fluid-micro font-semibold uppercase tracking-[0.12em] ${
                  outageSeverity === "critical"
                    ? "border-rose-400/45 bg-rose-500/10 text-rose-100"
                    : outageSeverity === "blocking"
                      ? "border-amber-400/45 bg-amber-500/10 text-amber-100"
                      : "border-emerald-400/35 bg-emerald-500/10 text-emerald-100"
                }`}
              >
                {outageSeverity} · {(outageType ?? "live-data").replaceAll("-", " ")}
              </span>
            ) : null}
          </div>
          <p className="text-sm font-semibold text-slate-100">{trustStatusActionForDisplay}</p>
          <p className="max-w-xl text-xs leading-5 text-slate-400">
            {isCompactStableState
              ? "Live evidence is healthy enough for standard approvals. Open details only if freshness or source coverage is questioned."
              : trustStatusDetailForDisplay}
          </p>
          {decisionImpactWindow ? (
            <p className="text-xs leading-5 text-slate-400">{decisionImpactWindow}</p>
          ) : null}
        </div>
        <div className="text-right text-fluid-xs leading-5 text-slate-400">
          <p>Refreshed {fetchedAtLabel}</p>
          <p>Next {resolvedNextRefreshLabel}</p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <article className="weather-trust-lane px-3 py-3">
          <p className="text-fluid-micro font-semibold uppercase tracking-[0.12em] text-slate-400">
            Approval lane
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-100">
              {currentApprovalLane?.label ?? (isCompactStableState ? "Allowed now" : "Use caution")}
            </p>
            <span
              className={`rounded-md border px-2 py-0.5 text-fluid-micro font-semibold uppercase tracking-[0.08em] ${trustToneClass}`}
            >
              {trustReadiness.tone === "stable" ? "Clear" : "Watch"}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-300">
            {currentApprovalLane?.detail ?? trustStatusDetailForDisplay}
          </p>
        </article>

        <article className="weather-trust-lane px-3 py-3">
          <p className="text-fluid-micro font-semibold uppercase tracking-[0.12em] text-slate-400">
            Reliability window
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-100">
              {(degradedSourceRows?.length ?? 0) > 0
                ? `${degradedSourceRows?.length} source${(degradedSourceRows?.length ?? 0) === 1 ? "" : "s"} degraded`
                : "Core feeds look usable"}
            </p>
            <span className="text-fluid-micro uppercase tracking-[0.12em] text-slate-400">
              {outageExitGate
                ? `${outageExitGate.metCount}/${outageExitGate.totalCount} clear`
                : trustReadiness.tone === "warning"
                  ? "Next refresh matters"
                  : "Standard cadence"}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-300">
            {outageExitGate
              ? outageExitGate.summary
              : trustReadiness.tone === "warning"
                ? "Keep irreversible approvals staged until the next verified read clears."
                : "No additional recovery work is needed unless someone challenges freshness or provenance."}
          </p>
          {recoveryPlan ? (
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Owner {recoveryPlan.owner} · Checkpoint {recoveryPlan.nextCheckpoint}
            </p>
          ) : null}
        </article>
      </div>

      <details className="weather-auto-chevron weather-transmission-segment rounded-md px-3 py-2">
          <summary data-chevron className="min-h-[44px] cursor-pointer list-none pt-1 text-fluid-micro font-semibold uppercase tracking-[0.12em] text-slate-300">
            Source board
          </summary>
          <div className="mt-2">
            {trustProvenance ? (
              <DataProvenanceStrip provenance={trustProvenance} variant="compact" />
            ) : (
              <dl className="grid gap-2 text-xs text-slate-300">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Posture</dt>
                  <dd className="font-semibold text-slate-100">{statusLabel}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Confidence</dt>
                  <dd className="text-slate-200">{controlHeadline}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Data refreshed</dt>
                  <dd className="text-slate-200">{fetchedAtLabel}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Next refresh</dt>
                  <dd className="text-slate-200">{resolvedNextRefreshLabel}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Source</dt>
                  <dd className="text-right text-slate-200">
                    <span>{sourceLabel}</span>
                    {sourceHref ? (
                      <a
                        href={sourceHref}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 text-sky-200 underline decoration-slate-500/80 underline-offset-2 hover:text-slate-100"
                      >
                        View source
                      </a>
                    ) : null}
                  </dd>
                </div>
              </dl>
            )}
            {degradedSourceRows && degradedSourceRows.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {degradedSourceRows.slice(0, 4).map((row) => {
                  const score = sourceReadinessScore(row.modeLabel, row.freshnessStatus);
                  return (
                    <li key={`${row.sourceName}-${row.modeLabel}`} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-slate-100">{row.sourceName}</span>
                        <span className="text-slate-400">
                          {row.modeLabel} · {row.freshnessStatus}
                        </span>
                      </div>
                      <div className="h-2 rounded-sm bg-slate-800/90">
                        <div
                          className="h-2 rounded-sm bg-gradient-to-r from-rose-300 via-amber-300 to-sky-300"
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </details>
      <p className="text-fluid-xs text-slate-400">
        For formulas and the matching source-board context, see{" "}
        <Link
          href="/trust#source-board"
          className="underline decoration-slate-500/80 underline-offset-2"
        >
          /trust#source-board
        </Link>
        .
      </p>
    </section>
  );
}

export function InlineTrustBlock(props: HeroTrustProvenanceBlockProps) {
  return (
    <section className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <HeroTrustProvenanceBlock {...props} />
      </div>
    </section>
  );
}

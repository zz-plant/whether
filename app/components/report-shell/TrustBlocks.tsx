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
  });
  const hasDegradedSourceRows = Boolean(degradedSourceRows && degradedSourceRows.length > 0);
  const isCompactStableState =
    trustReadiness.tone === "stable" && !outageSeverity && !hasDegradedSourceRows;
  const trustToneClass = trustPanelToneClass[trustReadiness.tone];
  const controlHeadline = trustStatusLabel;
  const trustStatusDetailForDisplay =
    trustReadiness.tone === "warning"
      ? "Decision impact: keep the do now / hold / revisit path, but do not treat this as a clear read until freshness and confidence recover."
      : trustStatusDetail;
  const trustStatusActionForDisplay =
    trustReadiness.tone === "warning"
      ? "Pause irreversible approvals until one verified live refresh lands."
      : trustStatusAction;
  const currentApprovalLane = approvalBuckets?.[0];
  const secondaryApprovalLanes = approvalBuckets?.slice(1, 3) ?? [];
  const exitProgressPercent = outageExitGate
    ? Math.max(
        8,
        Math.min(100, (outageExitGate.metCount / Math.max(1, outageExitGate.totalCount)) * 100),
      )
    : 100;

  return (
    <>
      <section className="weather-panel flex flex-col gap-3 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex min-h-[28px] items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${trustToneClass}`}
            >
              {controlHeadline}
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
              Data trust
            </span>
          </div>
          {outageSeverity ? (
            <span
              className={`inline-flex min-h-[28px] items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
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

        <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 px-3 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Current readiness
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-100">{controlHeadline}</p>
            </div>
            <div className="text-right text-[11px] text-slate-400">
              <p>Data refreshed {fetchedAtLabel}</p>
              <p>Next refresh {resolvedNextRefreshLabel}</p>
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-200">{trustStatusActionForDisplay}</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">{trustStatusDetailForDisplay}</p>
          {decisionImpactWindow ? (
            <p className="mt-1 text-xs leading-5 text-slate-400">{decisionImpactWindow}</p>
          ) : null}
        </div>

        {isCompactStableState ? (
          <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 px-3 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Trust summary
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  Standard approval cadence is available.
                </p>
              </div>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${trustToneClass}`}
              >
                Allowed now
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-300">
              Inputs are fresh enough for this week&apos;s decision. Open more detail only if
              someone questions freshness or source coverage.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            <article className="rounded-xl border border-slate-700/70 bg-slate-950/60 px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Approval status
                </p>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${trustToneClass}`}
                >
                  {currentApprovalLane?.label ?? "Allowed now"}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-100">
                {currentApprovalLane?.detail ?? trustStatusDetailForDisplay}
              </p>
              {secondaryApprovalLanes.length > 0 ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {secondaryApprovalLanes.map((lane) => (
                    <div
                      key={lane.label}
                      className="rounded-lg border border-slate-700/60 bg-slate-950/55 px-2.5 py-2"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                        {lane.label}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-300">{lane.detail}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>

            <article className="rounded-xl border border-slate-700/70 bg-slate-950/60 px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Recovery progress
                </p>
                <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
                  {outageExitGate
                    ? `${outageExitGate.metCount}/${outageExitGate.totalCount} clear`
                    : "Stable"}
                </span>
              </div>
              {outageExitGate ? (
                <>
                  <div className="mt-2 h-2 rounded-full bg-slate-800/90">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-amber-300 via-sky-300 to-emerald-300"
                      style={{ width: `${exitProgressPercent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-300">{outageExitGate.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {outageExitGate.summary}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-300">
                  {trustReadiness.tone === "warning"
                    ? "No active recovery sequence, but trust stays on watch until the next verified live refresh."
                    : "No active recovery sequence. Live trust controls are clear."}
                </p>
              )}
              {recoveryPlan ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-700/60 bg-slate-950/55 px-2.5 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                      Owner
                    </p>
                    <p className="mt-1 text-xs text-slate-100">{recoveryPlan.owner}</p>
                  </div>
                  <div className="rounded-lg border border-slate-700/60 bg-slate-950/55 px-2.5 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                      Checkpoint
                    </p>
                    <p className="mt-1 text-xs text-slate-100">
                      {recoveryPlan.nextCheckpoint}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-700/60 bg-slate-950/55 px-2.5 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                      Exit
                    </p>
                    <p className="mt-1 text-xs text-slate-100">
                      {recoveryPlan.exitCondition}
                    </p>
                  </div>
                </div>
              ) : null}
            </article>

            <article className="rounded-xl border border-slate-700/70 bg-slate-950/60 px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Source status
                </p>
                <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
                  {(degradedSourceRows?.length ?? 0) > 0
                    ? `${degradedSourceRows?.length} degraded`
                    : "All core feeds live"}
                </span>
              </div>
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
                        <div className="h-2 rounded-full bg-slate-800/90">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-rose-300 via-amber-300 to-sky-300"
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-300">
                  No degraded source rows this refresh. Core sources are usable for standard
                  approval cadence.
                </p>
              )}
            </article>
          </div>
        )}

        <details className="weather-auto-chevron rounded-xl border border-slate-700/70 bg-slate-950/55 px-3 py-2">
          <summary className="min-h-[44px] cursor-pointer list-none pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
            Data source details
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
          </div>
        </details>
      </section>
      <p className="mt-3 text-xs text-slate-300">
        Keep the decision path moving; for methodology details, see{" "}
        <Link
          href="/method"
          className="underline decoration-slate-500/80 underline-offset-2"
        >
          /method
        </Link>
        .
      </p>
    </>
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

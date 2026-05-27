import type { ReactNode } from "react";
import { Collapsible } from "@base-ui/react/collapsible";

type TrustTone = "stable" | "warning" | "historical";
type OutageSeverity = "advisory" | "blocking" | "critical";
type OutageType = "live-data" | "feed-unavailable" | "stale-cache" | "source-divergence" | "historical-snapshot";

const toneConfig: Record<
  TrustTone,
  {
    label: string;
    icon: ReactNode;
    panelClassName: string;
    badgeClassName: string;
    detailClassName: string;
  }
> = {
  stable: {
    label: "Data normal",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          d="M20 6L9 17l-5-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    panelClassName: "border-emerald-400/60 bg-emerald-500/10 text-emerald-100",
    badgeClassName: "border-emerald-300/70 bg-emerald-400/20 text-emerald-100",
    detailClassName: "text-emerald-200",
  },
  warning: {
    label: "Caution",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          d="M12 4l8 14H4l8-14z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M12 9v4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="12" cy="16" r="1" fill="currentColor" />
      </svg>
    ),
    panelClassName: "border-amber-400/60 bg-amber-500/10 text-amber-100",
    badgeClassName: "border-amber-300/80 bg-amber-400/20 text-amber-100",
    detailClassName: "text-amber-200",
  },
  historical: {
    label: "Retrospective",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          d="M12 8v5l3 2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="12"
          cy="12"
          r="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    ),
    panelClassName: "border-slate-500/60 bg-slate-900/70 text-slate-200",
    badgeClassName: "border-slate-400/70 bg-slate-700/50 text-slate-100",
    detailClassName: "text-slate-200",
  },
};

export const CanonicalTrustModule = ({
  tone,
  label,
  detail,
  action,
  outageSeverity,
  outageType,
  decisionImpactWindow,
  approvalBuckets,
  recoveryPlan,
  outageExitGate,
  degradedSourceRows,
  sourceDetails,
  compact = false,
}: {
  tone: TrustTone;
  label: string;
  detail: string;
  action: string;
  outageSeverity?: OutageSeverity;
  outageType?: OutageType;
  decisionImpactWindow?: string;
  approvalBuckets?: Array<{ label: string; detail: string }>;
  recoveryPlan?: { owner: string; nextCheckpoint: string; exitCondition: string };
  outageExitGate?: { label: string; summary: string; metCount: number; totalCount: number };
  degradedSourceRows?: Array<{ sourceName: string; modeLabel: string; freshnessStatus: string }>;
  sourceDetails?: ReactNode;
  compact?: boolean;
}) => {
  const config = toneConfig[tone];
  const severityToneClass = outageSeverity === "critical"
    ? "border-rose-400/55 bg-rose-500/10 text-rose-100"
    : outageSeverity === "blocking"
      ? "border-amber-400/55 bg-amber-500/10 text-amber-100"
      : "border-emerald-400/45 bg-emerald-500/10 text-emerald-100";
  const outageTypeLabel = outageType
    ? outageType.replaceAll("-", " ")
    : "live data";
  const outageSummaryIncludesCount = outageExitGate
    ? outageExitGate.summary.includes(`${outageExitGate.metCount}/${outageExitGate.totalCount}`)
    : false;

  return (
    <section
      className={`weather-panel flex flex-col gap-2 px-4 py-4 ${config.panelClassName}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex min-h-[24px] items-center gap-1 rounded-full border px-2 py-1 text-fluid-xs font-semibold tracking-[0.14em] ${config.badgeClassName}`}
        >
          {config.icon}
          {config.label}
        </span>
        <p className="text-xs font-semibold tracking-[0.16em]">
          Sources
        </p>
      </div>
      <p className="text-sm font-semibold text-slate-100">{label}</p>
      {outageSeverity ? (
        <p className={`inline-flex w-fit items-center rounded-full border px-2 py-1 text-fluid-micro font-semibold uppercase tracking-[0.12em] ${severityToneClass}`}>
          {outageSeverity} outage · {outageTypeLabel}
        </p>
      ) : null}
      <p className={`text-xs leading-relaxed ${config.detailClassName}`}>
        {detail}
      </p>
      {decisionImpactWindow ? <p className="text-xs leading-relaxed text-slate-200">{decisionImpactWindow}</p> : null}
      {!compact ? (
        <div className="space-y-1 rounded-lg border border-slate-700/60 bg-slate-950/35 px-3 py-2">
          <p className="text-fluid-micro font-semibold uppercase tracking-[0.12em] text-slate-400">Decision rule</p>
          <p className="text-xs leading-relaxed text-slate-100/90 whitespace-pre-line">{action.replace(" Reversal:", "\nReversal:")}</p>
        </div>
      ) : null}
      {approvalBuckets && approvalBuckets.length > 0 ? (
        <div className="space-y-1 rounded-lg border border-slate-700/60 bg-slate-950/35 px-3 py-2">
          <p className="text-fluid-micro font-semibold uppercase tracking-[0.12em] text-slate-400">Outage approvals</p>
          <ul className="space-y-1 text-xs text-slate-100/90">
            {approvalBuckets.map((bucket) => (
              <li key={bucket.label}><span className="font-semibold text-slate-100">{bucket.label}:</span> {bucket.detail}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {recoveryPlan ? (
        <div className="space-y-1 rounded-lg border border-slate-700/60 bg-slate-950/35 px-3 py-2 text-xs text-slate-100/90">
          <p className="text-fluid-micro font-semibold uppercase tracking-[0.12em] text-slate-400">Recovery runbook</p>
          <p><span className="font-semibold text-slate-100">Owner:</span> {recoveryPlan.owner}</p>
          <p><span className="font-semibold text-slate-100">Next checkpoint:</span> {recoveryPlan.nextCheckpoint}</p>
          <p><span className="font-semibold text-slate-100">Exit condition:</span> {recoveryPlan.exitCondition}</p>
        </div>
      ) : null}
      {outageExitGate ? (
        <div className="space-y-1 rounded-lg border border-slate-700/60 bg-slate-950/35 px-3 py-2 text-xs text-slate-100/90">
          <p className="text-fluid-micro font-semibold uppercase tracking-[0.12em] text-slate-400">Outage exit gate</p>
          <p className="font-semibold text-slate-100">{outageExitGate.label}</p>
          <p>
            {outageExitGate.summary}
            {outageSummaryIncludesCount ? "" : ` (${outageExitGate.metCount}/${outageExitGate.totalCount})`}
          </p>
        </div>
      ) : null}
      {degradedSourceRows && degradedSourceRows.length > 0 ? (
        <div className="space-y-1 rounded-lg border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          <p className="text-fluid-micro font-semibold uppercase tracking-[0.12em] text-amber-100">Degraded sources this refresh</p>
          <ul className="space-y-1">
            {degradedSourceRows.slice(0, 3).map((row) => (
              <li key={row.sourceName} className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{row.sourceName}</span>
                <span>{row.modeLabel} · {row.freshnessStatus}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {sourceDetails ? (
        <Collapsible.Root className="mt-1 border-t border-slate-700/70 pt-3 text-slate-200">
          <Collapsible.Trigger
            type="button"
            className="group flex min-h-[44px] w-full items-center justify-between gap-2 text-left text-xs font-semibold tracking-[0.16em] text-slate-200 focus-visible:rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
          >
            <span>Data source details</span>
            <span className="sr-only group-data-[panel-open]:hidden">Collapsed</span>
            <span className="sr-only hidden group-data-[panel-open]:inline">Expanded</span>
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700/70 text-slate-400 transition-transform group-data-[panel-open]:rotate-180">
              ⌄
            </span>
          </Collapsible.Trigger>
          <Collapsible.Panel className="mt-2">{sourceDetails}</Collapsible.Panel>
        </Collapsible.Root>
      ) : null}
    </section>
  );
};

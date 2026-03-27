import Link from "next/link";
import type { Route } from "../../../../lib/navigation/routeType";
import type { HomePageWorkspaceModel } from "../../../../lib/report/homePageAssembler";
import { AuditIcon, BoltIcon, TrendUpIcon } from "../../uiIcons";
import { CardEyebrow, HomeBandHeader } from "./primitives";

export function AuditBandSection({ workspaceModel }: { workspaceModel: HomePageWorkspaceModel }) {
  const trustMarkerToneClass = workspaceModel.audit.trustMarkerTone === "stable"
    ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-100"
    : workspaceModel.audit.trustMarkerTone === "historical"
      ? "border-violet-400/35 bg-violet-500/10 text-violet-100"
      : "border-amber-400/35 bg-amber-500/10 text-amber-100";

  return (
    <section id="audit-this-call" className="home-band home-band--audit home-band-shell weather-panel weather-section-stage weather-section-stage--short scroll-mt-28 space-y-4 px-4 py-4 sm:px-5" aria-labelledby="audit-this-call-title">
      <HomeBandHeader
        step="01"
        kicker="Why this call"
        title="See what changed, then pressure-test the call with trust and evidence."
        description="Start with the weekly delta and reversal cue, then inspect freshness, source coverage, and evidence movers before you change pace."
        icon={<AuditIcon className="h-5 w-5 text-sky-100" />}
        toneClass="border-sky-400/40 text-sky-200"
        actions={<Link href={"/signals" as Route} className="weather-pill inline-flex min-h-[44px] items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-100"><TrendUpIcon className="h-3.5 w-3.5" /><span>Review full evidence</span></Link>}
      />
      <div className="grid gap-3 lg:grid-cols-2">
        <article className="home-band-card home-band-card--priority weather-surface weather-delta-card rounded-xl p-3" data-emphasis="true">
          <CardEyebrow icon={<AuditIcon className="h-3.5 w-3.5" />} label="Trust summary" accentClass="text-sky-200" />
          <p className="mt-2"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${trustMarkerToneClass}`}>{workspaceModel.audit.trustMarkerLabel}</span></p>
          <p className="mt-2 text-sm font-semibold text-slate-100">{workspaceModel.audit.trustStatusLabel} — {workspaceModel.audit.trustStatusDetail}</p>
          <p className="mt-2 text-sm text-slate-300">{workspaceModel.audit.trustStatusAction}</p>
          <p className="mt-2 text-xs text-slate-200">{workspaceModel.audit.decisionImpactWindow}</p>
          <p className="mt-2 text-xs text-slate-300">
            Outage mode: <span className="font-semibold text-slate-100">{workspaceModel.audit.outageSeverity}</span> · {workspaceModel.audit.outageType.replaceAll("-", " ")}
          </p>
          <p className="mt-3 text-xs text-slate-300">{workspaceModel.audit.freshnessSummary}</p>
          <p className="mt-1 text-xs text-slate-300">{workspaceModel.audit.sourceCoverageLine}</p>
          <div className="mt-3 rounded-md border border-slate-700/70 bg-slate-950/40 px-2.5 py-2 text-xs text-slate-200">
            <p className="font-semibold text-slate-100">Outage approvals</p>
            <ul className="mt-1 space-y-1">
              {workspaceModel.audit.approvalBuckets.map((bucket) => (
                <li key={bucket.label}><span className="font-semibold text-slate-100">{bucket.label}:</span> {bucket.detail}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-md border border-slate-700/70 bg-slate-950/40 px-2.5 py-2 text-xs text-slate-200">
            <p className="font-semibold text-slate-100">Recovery runbook</p>
            <p><span className="font-semibold text-slate-100">Owner:</span> {workspaceModel.audit.recoveryPlan.owner}</p>
            <p><span className="font-semibold text-slate-100">Checkpoint:</span> {workspaceModel.audit.recoveryPlan.nextCheckpoint}</p>
            <p><span className="font-semibold text-slate-100">Exit:</span> {workspaceModel.audit.recoveryPlan.exitCondition}</p>
          </div>
          <div className="rounded-md border border-slate-700/70 bg-slate-950/40 px-2.5 py-2 text-xs text-slate-200">
            <p className="font-semibold text-slate-100">{workspaceModel.audit.outageExitGate.label}</p>
            <p>{workspaceModel.audit.outageExitGate.summary}</p>
          </div>
          {workspaceModel.audit.sourceDegraded ? (
            <p className="mt-2 rounded-md border border-amber-400/40 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-100">
              Source mix is degraded this refresh. Keep approvals reversible until one clean live update lands.
            </p>
          ) : null}
          {workspaceModel.audit.degradedSourceRows.length > 0 ? (
            <ul className="space-y-1.5 text-xs text-amber-100" aria-label="Degraded source detail">
              {workspaceModel.audit.degradedSourceRows.slice(0, 3).map((row) => (
                <li key={row.sourceName} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-400/40 bg-amber-500/10 px-2.5 py-1.5">
                  <span className="font-medium">{row.sourceName}</span>
                  <span>{row.modeLabel} · {row.freshnessStatus}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {workspaceModel.audit.sourceRows.length > 0 ? (
            <ul className="mt-3 space-y-1.5 text-xs text-slate-300" aria-label="Source detail">
              {workspaceModel.audit.sourceRows.map((row) => (
                <li key={row.sourceName} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-700/80 px-2.5 py-1.5">
                  <span className="font-medium text-slate-100">{row.sourceName}</span>
                  <span className="text-slate-300">{row.modeLabel} · {row.freshnessStatus}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </article>

        <article className="home-band-card weather-surface weather-delta-card rounded-xl p-3">
          <CardEyebrow icon={<BoltIcon className="h-3.5 w-3.5" />} label="Decision pressure test" accentClass="text-amber-200" />
          <p className="mt-2 text-sm font-semibold text-slate-100">{workspaceModel.audit.revisitHeadline}</p>
          <p className="mt-2 text-sm text-slate-300">{workspaceModel.audit.revisitDetail}</p>
        </article>
      </div>
    </section>
  );
}

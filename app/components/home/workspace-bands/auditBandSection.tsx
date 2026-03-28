import Link from "next/link";
import type { Route } from "../../../../lib/navigation/routeType";
import type { HomePageWorkspaceModel } from "../../../../lib/report/homePageAssembler";
import { AuditIcon, ShieldIcon, TrendUpIcon } from "../../uiIcons";
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
        kicker="Evidence + trust"
        title="Leave home only when the brief needs proof or a trust audit."
        description="Weekly Brief owns the live call. Open Evidence for drivers, thresholds, and replay. Open Trust when you need to defend freshness, confidence, or formulas."
        icon={<AuditIcon className="h-5 w-5 text-sky-100" />}
        toneClass="border-sky-400/40 text-sky-200"
        actions={(
          <>
            <Link href={"/signals" as Route} className="weather-pill inline-flex min-h-[44px] items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-100">
              <TrendUpIcon className="h-3.5 w-3.5" />
              <span>Open Evidence</span>
            </Link>
            <Link href={"/method" as Route} className="weather-button inline-flex min-h-[44px] items-center gap-2 px-4 py-2 text-xs font-semibold tracking-[0.12em]">
              <ShieldIcon className="h-3.5 w-3.5" />
              <span>Open Trust</span>
            </Link>
          </>
        )}
      />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <article className="home-band-card home-band-card--priority weather-surface weather-delta-card rounded-xl p-3" data-emphasis="true">
          <CardEyebrow icon={<AuditIcon className="h-3.5 w-3.5" />} label="Home summary only" accentClass="text-sky-200" />
          <p className="mt-2"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${trustMarkerToneClass}`}>{workspaceModel.audit.trustMarkerLabel}</span></p>
          <p className="mt-2 text-sm font-semibold text-slate-100">{workspaceModel.audit.trustStatusLabel} — {workspaceModel.audit.trustStatusDetail}</p>
          <p className="mt-2 text-sm text-slate-300">{workspaceModel.audit.trustStatusAction}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-md border border-slate-700/70 bg-slate-950/40 px-2.5 py-2 text-xs text-slate-200">
              <p className="font-semibold text-slate-100">Freshness</p>
              <p className="mt-1">{workspaceModel.audit.freshnessSummary}</p>
            </div>
            <div className="rounded-md border border-slate-700/70 bg-slate-950/40 px-2.5 py-2 text-xs text-slate-200">
              <p className="font-semibold text-slate-100">Coverage</p>
              <p className="mt-1">{workspaceModel.audit.sourceCoverageLine}</p>
            </div>
          </div>
          <div className="mt-3 rounded-md border border-slate-700/70 bg-slate-950/40 px-2.5 py-2 text-xs text-slate-200">
            <p className="font-semibold text-slate-100">{workspaceModel.audit.revisitHeadline}</p>
            <p className="mt-1">{workspaceModel.audit.revisitDetail}</p>
          </div>
          {workspaceModel.audit.evidenceMovers.length > 0 ? (
            <ul className="mt-3 space-y-2 text-xs text-slate-200" aria-label="Top evidence movers">
              {workspaceModel.audit.evidenceMovers.slice(0, 2).map((item) => (
                <li key={item.key} className="rounded-md border border-slate-700/70 bg-slate-950/40 px-2.5 py-2">
                  <p className="font-semibold text-slate-100">{item.title}</p>
                  <p className="mt-1 text-slate-300">{item.detail}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </article>

        <div className="grid gap-3">
          <Link href={"/signals" as Route} className="home-band-link-card rounded-xl border border-slate-800/80 bg-slate-950/55 px-3 py-3 text-slate-100">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-200">Evidence owns</p>
            <p className="mt-2 text-sm font-semibold">Why the call moved</p>
            <p className="mt-1 text-xs text-slate-300">Drivers, thresholds, timestamps, and historical replay live there, not on home.</p>
            <p className="mt-3 text-xs text-slate-200">{workspaceModel.audit.evidenceMovers[0]?.title ?? "Review the active regime drivers and threshold context."}</p>
          </Link>

          <Link href={"/method" as Route} className="home-band-link-card rounded-xl border border-slate-800/80 bg-slate-950/55 px-3 py-3 text-slate-100">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-200">Trust owns</p>
            <p className="mt-2 text-sm font-semibold">Whether you can defend the call</p>
            <p className="mt-1 text-xs text-slate-300">Freshness, confidence, source coverage, and formulas live there, not in the weekly brief.</p>
            <p className="mt-3 text-xs text-slate-200">{workspaceModel.audit.decisionImpactWindow}</p>
          </Link>
        </div>
      </div>
    </section>
  );
}

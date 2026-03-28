import Link from "next/link";
import type { Route } from "../../../../lib/navigation/routeType";
import type { HomePageWorkspaceModel } from "../../../../lib/report/homePageAssembler";
import { AuditIcon, ShieldIcon, TrendUpIcon } from "../../uiIcons";
import { CardEyebrow, HomeBandHeader } from "./primitives";

const sourceModeScore = (modeLabel: string, freshnessStatus: string) => {
  const mode = modeLabel.toLowerCase();
  const freshness = freshnessStatus.toLowerCase();

  let score = mode.includes("live") ? 100 : mode.includes("snapshot") ? 62 : 34;
  if (freshness.includes("stale")) {
    score -= 20;
  }
  if (freshness.includes("degraded")) {
    score -= 24;
  }
  return Math.max(18, Math.min(100, score));
};

const readinessToneClass = (tone: HomePageWorkspaceModel["audit"]["trustMarkerTone"]) =>
  tone === "stable"
    ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-100"
    : tone === "historical"
      ? "border-violet-400/35 bg-violet-500/10 text-violet-100"
      : "border-amber-400/35 bg-amber-500/10 text-amber-100";

export function AuditBandSection({ workspaceModel }: { workspaceModel: HomePageWorkspaceModel }) {
  const trustToneClass = readinessToneClass(workspaceModel.audit.trustMarkerTone);

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
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
        <article className="home-band-card home-band-card--priority weather-surface rounded-xl p-3" data-emphasis="true">
          <CardEyebrow icon={<AuditIcon className="h-3.5 w-3.5" />} label="Readiness board" accentClass="text-sky-200" />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${trustToneClass}`}>
              {workspaceModel.audit.trustMarkerLabel}
            </span>
            <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-200">
              Use on home
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-100">{workspaceModel.audit.trustStatusAction}</p>
          <p className="mt-1 text-xs leading-5 text-slate-300">{workspaceModel.audit.trustMarkerDetail}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-700/70 bg-slate-950/45 px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Fresh</p>
              <p className="mt-1 text-xs text-slate-100">{workspaceModel.audit.freshnessSummary}</p>
            </div>
            <div className="rounded-lg border border-slate-700/70 bg-slate-950/45 px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Coverage</p>
              <p className="mt-1 text-xs text-slate-100">{workspaceModel.audit.sourceCoverageLine}</p>
            </div>
            <div className="rounded-lg border border-slate-700/70 bg-slate-950/45 px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Decision state</p>
              <p className="mt-1 text-xs text-slate-100">{workspaceModel.audit.revisitHeadline}</p>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-slate-700/70 bg-slate-950/45 px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Source readiness</p>
              <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{workspaceModel.audit.sourceRows.length} sources</span>
            </div>
            <ul className="mt-3 space-y-2">
              {workspaceModel.audit.sourceRows.slice(0, 4).map((row) => {
                const score = sourceModeScore(row.modeLabel, row.freshnessStatus);
                return (
                  <li key={`${row.sourceName}-${row.modeLabel}`} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-semibold text-slate-100">{row.sourceName}</span>
                      <span className="text-slate-400">{row.modeLabel} · {row.freshnessStatus}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800/90">
                      <div className="h-2 rounded-full bg-gradient-to-r from-sky-400 via-emerald-300 to-emerald-200" style={{ width: `${score}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </article>

        <div className="grid gap-3">
          <Link href={"/signals" as Route} className="home-band-link-card rounded-xl border border-slate-800/80 bg-slate-950/55 px-3 py-3 text-slate-100">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-200">Evidence owns</p>
            <p className="mt-2 text-sm font-semibold">Why the call moved</p>
            <p className="mt-1 text-xs text-slate-300">Use the evidence view when you need the driver stack, thresholds, and replay rather than the compact home readout.</p>
            {workspaceModel.audit.evidenceMovers.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {workspaceModel.audit.evidenceMovers.slice(0, 2).map((item) => (
                  <li key={item.key} className="rounded-lg border border-slate-700/70 bg-slate-950/45 px-2.5 py-2 text-xs">
                    <p className="font-semibold text-slate-100">{item.title}</p>
                    <p className="mt-1 text-slate-300">{item.detail}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </Link>

          <Link href={"/method" as Route} className="home-band-link-card rounded-xl border border-slate-800/80 bg-slate-950/55 px-3 py-3 text-slate-100">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-200">Trust owns</p>
            <p className="mt-2 text-sm font-semibold">Whether you can defend the call</p>
            <p className="mt-1 text-xs text-slate-300">Treat Trust as the audit surface for methodology, formulas, source coverage, and readiness edge cases.</p>
            <div className="mt-3 rounded-lg border border-slate-700/70 bg-slate-950/45 px-2.5 py-2 text-xs">
              <p className="font-semibold text-slate-100">Operating implication</p>
              <p className="mt-1 text-slate-300">{workspaceModel.audit.decisionImpactWindow}</p>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}

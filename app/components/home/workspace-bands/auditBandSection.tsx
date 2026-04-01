import Link from "next/link";
import type { Route } from "../../../../lib/navigation/routeType";
import type { HomePageWorkspaceModel } from "../../../../lib/report/homePageAssembler";
import { AuditIcon, ShieldIcon, TrendUpIcon } from "../../uiIcons";
import { CardEyebrow, HomeBandHeader } from "./primitives";

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
        step="02"
        kicker="Exceptions only"
        title="Open Evidence or Trust only if the call gets challenged."
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
      <article className="rounded-xl border border-slate-800/80 bg-slate-950/55 px-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardEyebrow icon={<AuditIcon className="h-3.5 w-3.5" />} label="Trust summary" accentClass="text-sky-200" />
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${trustToneClass}`}>
            {workspaceModel.audit.trustMarkerLabel}
          </span>
        </div>
        <p className="mt-2 text-sm font-semibold text-slate-100">{workspaceModel.audit.trustStatusAction}</p>
        <p className="mt-1 text-xs leading-5 text-slate-300">{workspaceModel.audit.trustMarkerDetail}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-700/70 bg-slate-950/45 px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Freshness</p>
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
      </article>

      <div className="grid gap-3 lg:grid-cols-2">
        <Link href={"/signals" as Route} className="home-band-link-card rounded-xl border border-slate-800/80 bg-slate-950/55 px-3 py-3 text-slate-100">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-200">Need proof?</p>
          <p className="mt-2 text-sm font-semibold">Open Evidence for why the call moved</p>
          <p className="mt-1 text-xs text-slate-300">Driver stack, thresholds, and replay live there.</p>
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-200">Need source defense?</p>
          <p className="mt-2 text-sm font-semibold">Open Trust for freshness, coverage, and method</p>
          <p className="mt-1 text-xs text-slate-300">Use this when someone asks whether the weekly read is reliable enough to act on.</p>
          <div className="mt-3 rounded-lg border border-slate-700/70 bg-slate-950/45 px-2.5 py-2 text-xs">
            <p className="font-semibold text-slate-100">Operating implication</p>
            <p className="mt-1 text-slate-300">{workspaceModel.audit.decisionImpactWindow}</p>
          </div>
        </Link>
      </div>
    </section>
  );
}

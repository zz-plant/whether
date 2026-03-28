import Link from "next/link";
import type { Route } from "../../../../lib/navigation/routeType";
import type { HomePageWorkspaceModel } from "../../../../lib/report/homePageAssembler";
import { HistoryIcon, LayoutGridIcon, ShieldIcon } from "../../uiIcons";
import { CardEyebrow, HomeBandHeader } from "./primitives";

export function CadenceBandSection({ workspaceModel }: { workspaceModel: HomePageWorkspaceModel }) {
  return (
    <section id="historical-replay-workspace" className="home-band home-band--history home-band-shell weather-panel weather-section-stage weather-section-stage--long scroll-mt-28 space-y-4 px-4 py-4 sm:px-5" aria-labelledby="historical-replay-workspace-title">
      <HomeBandHeader
        step="03"
        kicker="Only if a question remains"
        title="Pick one downstream surface and stop widening the workflow."
        description="Decision Tools handles owner-specific translation, Evidence handles replay, and Toolkits stay supporting. Do not duplicate those flows on home."
        icon={<HistoryIcon className="h-5 w-5 text-violet-100" />}
        toneClass="border-violet-400/40 text-violet-200"
      />
      <div className="weather-list-stagger grid gap-4 lg:grid-cols-3">
        <Link href={"/decide" as Route} className="home-band-link-card rounded-xl border border-slate-800/80 bg-slate-950/55 px-3 py-3 text-slate-100">
          <CardEyebrow icon={<LayoutGridIcon className="h-3.5 w-3.5" />} label="Decision Tools owns" accentClass="text-amber-200" />
          <p className="mt-2 text-sm font-semibold">{workspaceModel.translate.rolePath.title}</p>
          <p className="mt-1 text-xs text-slate-300">{workspaceModel.translate.rolePath.detail}</p>
          <p className="mt-3 text-xs text-slate-200">Use it only when the weekly plan is directionally right but the owner-specific translation is still unclear.</p>
        </Link>

        <Link href={workspaceModel.replay.openFullHref as Route} className="home-band-link-card rounded-xl border border-slate-800/80 bg-slate-950/55 px-3 py-3 text-slate-100">
          <CardEyebrow icon={<HistoryIcon className="h-3.5 w-3.5" />} label="Evidence owns replay" accentClass="text-violet-200" />
          <p className="mt-2 text-sm font-semibold">Historical replay and baseline comparison</p>
          <p className="mt-1 text-xs text-slate-300">{workspaceModel.replay.summary}</p>
          <ul className="mt-3 space-y-2">
            {workspaceModel.replay.preview.slice(0, 2).map((entry) => (
              <li key={entry.key} className="rounded-lg border border-slate-800/80 bg-slate-950/50 px-3 py-2">
                <p className="text-xs font-semibold text-slate-100">{entry.label}</p>
                <p className="mt-1 text-xs text-slate-300">{entry.summary}</p>
              </li>
            ))}
          </ul>
        </Link>

        <article className="home-band-card weather-surface weather-delta-card rounded-xl p-3">
          <CardEyebrow icon={<ShieldIcon className="h-3.5 w-3.5" />} label="Supporting surfaces" accentClass="text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-100">Use toolkits only after Decision Tools points you there.</p>
          <p className="mt-1 text-xs text-slate-300">Toolkits are runnable instruments, not a parallel place to interpret the weekly brief.</p>
          {workspaceModel.translate.toolkitShortcuts.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {workspaceModel.translate.toolkitShortcuts.map((toolkit) => (
                <Link key={toolkit.href} href={toolkit.href as Route} className="weather-pill inline-flex min-h-[40px] items-center gap-2 px-3 py-2 text-[11px] font-semibold text-slate-100">
                  <LayoutGridIcon className="h-3.5 w-3.5" />
                  <span>{toolkit.title}</span>
                </Link>
              ))}
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={"/toolkits" as Route} className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]">
              Browse toolkits
            </Link>
            <Link href={"/method" as Route} className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold text-slate-100">
              Open Trust
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import type { Route } from "../../../../lib/navigation/routeType";
import type { HomePageWorkspaceModel } from "../../../../lib/report/homePageAssembler";
import { HistoricalReplayDatePicker } from "../../../signals/components/historicalReplayDatePicker";
import { ArrowRightIcon, HistoryIcon, LayoutGridIcon } from "../../uiIcons";
import { CardEyebrow, HomeBandHeader } from "./primitives";

const HistoricalReplayDatePickerFallback = ({ initialDate, submitLabel }: { initialDate: string; submitLabel: string }) => (
  <form className="flex flex-wrap items-end gap-3" aria-busy="true">
    <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Replay date
      <input type="date" value={initialDate} readOnly={true} disabled={true} className="weather-control rounded-md border-slate-700 bg-slate-900 opacity-80" />
    </label>
    <button type="button" disabled={true} className="weather-button-primary inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold tracking-[0.12em] opacity-80">{submitLabel}</button>
  </form>
);

export function CadenceBandSection({ workspaceModel }: { workspaceModel: HomePageWorkspaceModel }) {
  return (
    <section id="historical-replay-workspace" className="home-band home-band--history home-band-shell weather-panel weather-section-stage weather-section-stage--long scroll-mt-28 space-y-4 px-4 py-4 sm:px-5" aria-labelledby="historical-replay-workspace-title">
      <HomeBandHeader
        step="03"
        kicker="Historical replay"
        title="Compare this week's live call with a prior baseline after you lock the plan."
        description="Use replay as continuity for the weekly ritual: check what changed, what held, and whether today's approvals are tighter or looser than the earlier read."
        icon={<HistoryIcon className="h-5 w-5 text-violet-100" />}
        toneClass="border-violet-400/40 text-violet-200"
      />
      <div className="weather-list-stagger grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <article className="home-band-card weather-surface weather-delta-card rounded-xl p-3">
          <CardEyebrow icon={<HistoryIcon className="h-3.5 w-3.5" />} label="Replay a prior monthly snapshot" accentClass="text-violet-200" />
          <div className="mt-3"><Suspense fallback={<HistoricalReplayDatePickerFallback initialDate={workspaceModel.replay.initialDate} submitLabel="Replay on home" />}><HistoricalReplayDatePicker initialDate={workspaceModel.replay.initialDate} forceAdvanced={false} submitHash="#historical-replay-workspace" submitLabel="Replay on home" /></Suspense></div>
          <p className="mt-3 text-sm text-slate-300">{workspaceModel.replay.summary}</p>
          <div className="mt-3"><Link href={workspaceModel.replay.openFullHref as Route} className="weather-pill inline-flex min-h-[44px] items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-100"><LayoutGridIcon className="h-3.5 w-3.5" /><span>Open full time machine</span></Link></div>
        </article>
        <article className="home-band-card weather-surface weather-delta-card rounded-xl p-3">
          <CardEyebrow icon={<ArrowRightIcon className="h-3.5 w-3.5" />} label="What this looked like then" accentClass="text-slate-300" />
          <ul className="mt-3 space-y-2">{workspaceModel.replay.preview.map((entry) => <li key={entry.key} className="home-band-list-item rounded-lg border border-slate-800/80 bg-slate-950/50 px-3 py-2"><p className="text-xs font-semibold text-slate-100">{entry.label}</p><p className="mt-1 text-xs text-slate-300">{entry.summary}</p></li>)}</ul>
        </article>
      </div>
    </section>
  );
}

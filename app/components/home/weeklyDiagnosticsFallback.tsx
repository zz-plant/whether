import { Skeleton } from "../skeleton";

export const WeeklyDiagnosticsFallback = () => (
  <section aria-label="Workspace updates pending" className="home-band-stack" aria-busy="true">
    <article className="home-band home-band--audit home-band-shell weather-panel weather-section-stage weather-section-stage--short space-y-4 px-4 py-4 sm:px-5">
      <div className="home-band-shell__header flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="home-band-kicker">Evidence + trust</p>
          <h2 className="text-xl font-semibold text-slate-100">Preparing compact evidence and trust handoff.</h2>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-100">
          <span className="weather-loading-beacon" />
          Updating
        </span>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="rounded-xl border border-slate-800/60 bg-slate-950/62 p-3">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-3.5 w-44 rounded-full bg-slate-500/44" />
            <Skeleton className="h-3 w-20 rounded-full bg-slate-500/32" />
          </div>
          <div className="mt-3 space-y-2">
            <Skeleton className="h-12 w-full rounded-xl bg-slate-500/38" />
            <Skeleton className="h-12 w-full rounded-xl bg-slate-500/34" />
            <Skeleton className="h-12 w-11/12 rounded-xl bg-slate-500/28" />
          </div>
        </div>
        <div className="rounded-xl border border-slate-800/60 bg-slate-950/62 p-3">
          <Skeleton className="h-3.5 w-32 rounded-full bg-slate-500/44" />
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <Skeleton className="h-16 w-full rounded-xl bg-slate-500/34" />
            <Skeleton className="h-16 w-full rounded-xl bg-slate-500/28" />
          </div>
        </div>
      </div>
    </article>

    <article className="home-band home-band--operations home-band-shell weather-panel weather-section-stage weather-section-stage--medium space-y-4 px-4 py-4 sm:px-5">
      <div className="home-band-shell__header flex items-center justify-between gap-2">
        <div className="space-y-1">
          <p className="home-band-kicker">Planning</p>
          <h2 className="text-xl font-semibold text-slate-100">Preparing the planning handoff.</h2>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Pending</span>
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Skeleton className="h-28 w-full rounded-xl bg-slate-500/32" />
        <Skeleton className="h-28 w-full rounded-xl bg-slate-500/28" />
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <Skeleton className="h-40 w-full rounded-xl bg-slate-500/26" />
        <Skeleton className="h-40 w-full rounded-xl bg-slate-500/22" />
        <Skeleton className="h-40 w-full rounded-xl bg-slate-500/18" />
      </div>
    </article>
  </section>
);

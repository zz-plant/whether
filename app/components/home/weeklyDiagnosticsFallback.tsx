import { Skeleton } from "../skeleton";

export const WeeklyDiagnosticsFallback = () => (
  <section aria-label="Loading diagnostics lane" className="space-y-3" aria-busy="true">
    <article className="rounded-[1.2rem] border border-sky-400/20 bg-slate-950/68 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">Decision support is streaming in</p>
          <p className="mt-1 text-sm text-slate-200">The weekly call is already ready. We&apos;re loading the decision matrix, role-specific guidance, and evidence support next.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-100">
          <span className="weather-loading-beacon" />
          Streaming
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

    <article className="rounded-xl border border-slate-700/55 bg-slate-950/84 p-5">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-40 rounded-full bg-slate-500/42" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Evidence after matrix</span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Skeleton className="h-16 w-full rounded-xl bg-slate-500/32" />
        <Skeleton className="h-16 w-full rounded-xl bg-slate-500/28" />
      </div>
    </article>
  </section>
);

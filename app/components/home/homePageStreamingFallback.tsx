import { Skeleton } from "../skeleton";

export const HomePageStreamingFallback = () => (
  <section aria-label="Loading weekly operating posture" className="space-y-5" aria-live="polite" aria-busy="true">
    <section className="weather-panel space-y-4 px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]">
            <span className="rounded-full border border-sky-400/35 bg-sky-400/10 px-2.5 py-1 text-sky-100">Weekly operating call</span>
            <span className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-2.5 py-1 text-cyan-100">Streaming live</span>
          </div>
          <p className="max-w-2xl text-sm text-slate-100">The top-fold planning call lands first. Diagnostics and share artifacts follow as the rest of the brief resolves.</p>
          <p className="text-[11px] text-slate-300">Built for Monday standup: first screen first, supporting detail second.</p>
        </div>
        <div className="rounded-xl border border-slate-700/75 bg-slate-950/70 px-3 py-2.5 text-right">
          <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100">
            <span className="weather-loading-beacon" />
            Top fold first
          </p>
          <p className="mt-1 text-[11px] text-slate-300">Call, guardrail, and flip cue render before deeper support.</p>
        </div>
      </div>

      <ol className="grid gap-2 text-xs sm:grid-cols-3">
        <li className="rounded-xl border border-cyan-300/35 bg-cyan-300/12 px-3 py-3 text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" aria-current="step">
          <span className="font-semibold">1. Sync signals</span>
          <span className="mt-1 block text-cyan-100/85">Market, labor, and credit inputs are binding.</span>
        </li>
        <li className="rounded-xl border border-slate-700/90 bg-slate-900/65 px-3 py-3 text-slate-200">
          <span className="font-semibold">2. Set posture</span>
          <span className="mt-1 block text-slate-300">Decision delta, guardrails, and flip triggers.</span>
        </li>
        <li className="rounded-xl border border-slate-700/90 bg-slate-900/65 px-3 py-3 text-slate-200">
          <span className="font-semibold">3. Build artifact</span>
          <span className="mt-1 block text-slate-300">Share-ready weekly call snapshot and support lanes.</span>
        </li>
      </ol>

      <article className="weather-panel-static rounded-[1.5rem] px-5 py-5 sm:px-6 sm:py-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-sky-400/35 bg-sky-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-100">
              Weekly operating call
            </span>
            <Skeleton className="h-7 w-40 rounded-full bg-slate-500/45" />
            <Skeleton className="h-7 w-36 rounded-full bg-slate-500/40" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full max-w-3xl rounded-xl bg-slate-500/50" />
            <Skeleton className="h-4 w-11/12 max-w-2xl rounded-full bg-slate-500/40" />
          </div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.95fr)]">
            <section className="rounded-xl border border-slate-800/65 bg-slate-950/70 px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-3.5 w-28 rounded-full bg-slate-500/45" />
                <Skeleton className="h-3.5 w-20 rounded-full bg-slate-500/35" />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-20 w-full rounded-xl bg-slate-500/42" />
                <Skeleton className="h-20 w-full rounded-xl bg-slate-500/38" />
                <Skeleton className="h-[4.5rem] w-full rounded-xl bg-slate-500/34 sm:col-span-2" />
              </div>
            </section>
            <section className="rounded-xl border border-slate-800/65 bg-slate-950/62 px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-3.5 w-36 rounded-full bg-slate-500/45" />
                <Skeleton className="h-5 w-24 rounded-full bg-slate-500/35" />
              </div>
              <div className="mt-3 space-y-2">
                <Skeleton className="h-14 w-full rounded-xl bg-slate-500/40" />
                <Skeleton className="h-14 w-full rounded-xl bg-slate-500/35" />
                <Skeleton className="h-14 w-11/12 rounded-xl bg-slate-500/30" />
              </div>
            </section>
          </div>
        </div>
      </article>
    </section>

    <section className="weather-panel space-y-4 px-5 py-5" aria-label="Checking live evidence stream">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Decision support follows automatically</p>
          <p className="mt-1 text-sm text-slate-200">Once the call is locked, we stream the evidence lane, bounded rule matrix, and share packaging.</p>
        </div>
        <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-200">
          Streaming next
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <article className="rounded-xl border border-slate-700/80 bg-slate-900/70 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Diagnostics lane</p>
          <div className="mt-2 space-y-2">
            <Skeleton className="h-3 w-3/4 rounded-full bg-slate-500/45" />
            <Skeleton className="h-12 w-full rounded-xl bg-slate-500/38" />
            <Skeleton className="h-12 w-full rounded-xl bg-slate-500/32" />
          </div>
        </article>
        <article className="rounded-xl border border-slate-700/80 bg-slate-900/70 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Share artifact</p>
          <div className="mt-2 space-y-2">
            <Skeleton className="h-3 w-2/3 rounded-full bg-slate-500/45" />
            <Skeleton className="h-10 w-full rounded-full bg-slate-500/35" />
            <Skeleton className="h-10 w-full rounded-full bg-slate-500/30" />
          </div>
        </article>
        <article className="rounded-xl border border-slate-700/80 bg-slate-900/70 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Trust strip</p>
          <div className="mt-2 space-y-2">
            <Skeleton className="h-3 w-1/2 rounded-full bg-slate-500/45" />
            <Skeleton className="h-3 w-full rounded-full bg-slate-500/35" />
            <Skeleton className="h-3 w-4/5 rounded-full bg-slate-500/30" />
          </div>
        </article>
      </div>
    </section>
  </section>
);

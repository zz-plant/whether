import { Skeleton } from "../skeleton";

export const HomePageStreamingFallback = () => (
  <section aria-label="Loading weekly operating posture" className="space-y-5" aria-live="polite" aria-busy="true">
    <section className="weather-panel space-y-3.5 px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Building this week&apos;s operator brief</p>
          <p className="max-w-xl text-sm text-slate-100">Live signals are loading. We&apos;ll land on a call, actions, and flip conditions.</p>
          <p className="text-[11px] text-slate-300">Usually ready in under 10 seconds for weekly standup.</p>
        </div>
        <span className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-100">
          Live refresh
        </span>
      </div>

      <ol className="grid gap-1.5 text-xs sm:grid-cols-3 sm:gap-2">
        <li className="rounded-lg border border-cyan-300/35 bg-cyan-300/12 px-3 py-2.5 text-cyan-50" aria-current="step">
          <span className="font-semibold">1. Sync signals</span>
          <span className="mt-1 block text-cyan-100/85">Market, labor, and credit inputs</span>
        </li>
        <li className="rounded-lg border border-slate-700/90 bg-slate-900/65 px-3 py-2.5 text-slate-200">
          <span className="font-semibold">2. Set posture</span>
          <span className="mt-1 block text-slate-300">Guardrails + flip triggers</span>
        </li>
        <li className="rounded-lg border border-slate-700/90 bg-slate-900/65 px-3 py-2.5 text-slate-200">
          <span className="font-semibold">3. Build artifact</span>
          <span className="mt-1 block text-slate-300">Share-ready weekly call snapshot</span>
        </li>
      </ol>

      <div className="space-y-2.5 rounded-xl border border-slate-700/80 bg-slate-900/70 p-2.5 sm:p-3">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-2.5 w-32 rounded-full bg-slate-600/80" />
          <Skeleton className="h-2.5 w-16 rounded-full bg-slate-600/60" />
        </div>
        <Skeleton className="h-8 w-full rounded-lg bg-slate-500/70" />
        <Skeleton className="h-8 w-full rounded-lg bg-slate-500/65" />
        <Skeleton className="h-2.5 w-10/12 rounded-full bg-slate-500/55" />
      </div>
    </section>

    <section className="weather-panel space-y-4 px-5 py-5" aria-label="Checking live evidence stream">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Checking live evidence</p>
        <Skeleton className="h-3 w-24 rounded-full bg-slate-600/65" />
      </div>
      <div className="space-y-2 rounded-xl border border-slate-700/80 bg-slate-900/70 p-3">
        <Skeleton className="h-3 w-full rounded-full bg-slate-600/70" />
        <Skeleton className="h-3 w-11/12 rounded-full bg-slate-600/65" />
        <Skeleton className="h-3 w-4/5 rounded-full bg-slate-600/60" />
        <Skeleton className="h-3 w-7/12 rounded-full bg-slate-600/60" />
      </div>
    </section>
  </section>
);

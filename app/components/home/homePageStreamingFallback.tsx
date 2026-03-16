import { Skeleton } from "../skeleton";

type HomePageStreamingFallbackProps = {
  searchParams?: {
    month?: string;
    year?: string;
  };
};

const resolveHistoricalContext = (searchParams?: HomePageStreamingFallbackProps["searchParams"]) => {
  const month = searchParams?.month?.trim();
  const year = searchParams?.year?.trim();

  if (!month || !year) {
    return null;
  }

  const numericMonth = Number(month);

  if (!Number.isInteger(numericMonth) || numericMonth < 1 || numericMonth > 12) {
    return "Historical replay requested";
  }

  return `Historical replay requested · ${year}-${String(numericMonth).padStart(2, "0")}`;
};

export const HomePageStreamingFallback = ({ searchParams }: HomePageStreamingFallbackProps) => {
  const historicalContext = resolveHistoricalContext(searchParams);
  const contextLabel = historicalContext ?? "Current weekly brief";
  const introLabel = historicalContext ? "Loading selected weekly brief" : "Loading weekly brief";

  return (
    <section aria-label="Loading weekly operating posture" className="space-y-5" aria-live="polite" aria-busy="true">
      <section className="weather-panel px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]">
              <span className="rounded-full border border-sky-400/35 bg-sky-400/10 px-2.5 py-1 text-sky-100">Weekly brief</span>
              <span className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-2.5 py-1 text-cyan-100">{contextLabel}</span>
            </div>
            <p className="max-w-2xl text-sm text-slate-100">{introLabel}</p>
          </div>
          <div className="rounded-xl border border-slate-700/75 bg-slate-950/70 px-3 py-2.5 text-right">
            <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100">
              <span className="weather-loading-beacon" />
              Loading
            </p>
          </div>
        </div>

        <article className="weather-panel-static rounded-[1.5rem] px-5 py-5 sm:px-6 sm:py-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-sky-400/35 bg-sky-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-100">
                Weekly brief
              </span>
              <span className="rounded-full border border-slate-700/70 bg-slate-950/65 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-200">
                {contextLabel}
              </span>
              <Skeleton className="h-7 w-28 rounded-full bg-slate-500/40" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-11 w-full max-w-3xl rounded-xl bg-slate-500/50" />
              <Skeleton className="h-5 w-11/12 max-w-2xl rounded-full bg-slate-500/40" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-7 w-40 rounded-full bg-slate-500/36" />
                <Skeleton className="h-7 w-32 rounded-full bg-slate-500/32" />
              </div>
            </div>
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.38fr)_minmax(18rem,0.92fr)]">
              <section className="grid gap-3 sm:grid-cols-2">
                <article className="rounded-xl border border-slate-800/65 bg-slate-950/70 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">What changed</p>
                  <div className="mt-3 space-y-2">
                    <Skeleton className="h-5 w-10/12 rounded-full bg-slate-500/42" />
                    <Skeleton className="h-5 w-8/12 rounded-full bg-slate-500/36" />
                  </div>
                </article>
                <article className="rounded-xl border border-cyan-300/25 bg-cyan-400/8 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-100">Do now</p>
                  <div className="mt-3 space-y-2">
                    <Skeleton className="h-5 w-11/12 rounded-full bg-slate-500/42" />
                    <Skeleton className="h-5 w-7/12 rounded-full bg-slate-500/34" />
                  </div>
                </article>
                <article className="rounded-xl border border-amber-300/25 bg-amber-400/8 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-100">Flip when</p>
                  <div className="mt-3 space-y-2">
                    <Skeleton className="h-5 w-10/12 rounded-full bg-slate-500/42" />
                    <Skeleton className="h-5 w-8/12 rounded-full bg-slate-500/34" />
                  </div>
                </article>
                <article className="rounded-xl border border-violet-300/25 bg-violet-400/8 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-100">Operating stance</p>
                  <div className="mt-3 space-y-2">
                    <Skeleton className="h-5 w-11/12 rounded-full bg-slate-500/42" />
                    <Skeleton className="h-5 w-9/12 rounded-full bg-slate-500/34" />
                  </div>
                </article>
              </section>
              <section className="space-y-3 rounded-xl border border-slate-800/65 bg-slate-950/62 px-4 py-4 sm:px-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">Snapshot and trust</p>
                  <Skeleton className="h-6 w-24 rounded-full bg-slate-500/35" />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Skeleton className="h-20 w-full rounded-xl bg-slate-500/40" />
                  <Skeleton className="h-20 w-full rounded-xl bg-slate-500/35" />
                  <Skeleton className="h-20 w-full rounded-xl bg-slate-500/32" />
                  <Skeleton className="h-20 w-full rounded-xl bg-slate-500/28" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-10/12 rounded-full bg-slate-500/35" />
                  <Skeleton className="h-4 w-9/12 rounded-full bg-slate-500/30" />
                </div>
              </section>
            </div>
          </div>
        </article>
      </section>

      <section className="weather-panel space-y-4 px-5 py-5" aria-label="Loading additional sections">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Loading additional sections</p>
          </div>
          <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-200">
            Loading
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
};

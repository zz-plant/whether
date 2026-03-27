import Image from "next/image";
import { Skeleton } from "../skeleton";
import { WeeklyDiagnosticsFallback } from "./weeklyDiagnosticsFallback";

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
        <article className="weather-appbar relative z-20 border-slate-800/70 px-4 py-4 sm:px-6 sm:py-5">
          <div className="space-y-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Image
                    src="/whether-logo.svg"
                    alt="Whether — Weekly Operating Posture (Loading)"
                    width={156}
                    height={36}
                    className="h-9 w-auto"
                    priority
                  />
                  <span className="rounded-full border border-sky-300/35 bg-sky-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-100">
                    Weekly operating forecast
                  </span>
                  <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-200">
                    {contextLabel}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-100/85">Current conditions</p>
                  <p className="max-w-3xl text-base font-semibold leading-relaxed text-slate-100 sm:text-lg">
                    This week&apos;s posture, action, and flip risk in one scan.
                  </p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[30rem]">
                <div className="weather-stat-card">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Posture</p>
                  <Skeleton className="mt-1 h-5 w-24 rounded-full bg-slate-500/40" />
                </div>
                <div className="weather-stat-card">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Signals updated</p>
                  <Skeleton className="mt-1 h-5 w-28 rounded-full bg-slate-500/35" />
                </div>
                <div className="weather-stat-card">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Record date</p>
                  <Skeleton className="mt-1 h-5 w-20 rounded-full bg-slate-500/32" />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="max-w-2xl text-sm text-slate-100">{introLabel}</p>
              <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100">
                <span className="weather-loading-beacon" />
                Loading
              </p>
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

      <section className="home-band-stack" aria-label="Loading additional sections">
        <section className="home-band home-band--flow home-band-shell home-band-shell--nav weather-panel weather-section-stage space-y-3 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Loading flow</p>
          <p className="text-sm text-slate-300">Decision card first, workspace second, deeper evidence last.</p>
          <div className="flex flex-wrap items-center gap-2">
            {["Decision card", "Workspace", "Evidence"].map((label) => (
              <span key={label} className="inline-flex min-h-[32px] items-center rounded-full border border-slate-700/80 bg-slate-950/65 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-slate-200">
                {label}
              </span>
            ))}
          </div>
          <Skeleton className="h-3 w-full max-w-2xl rounded-full bg-slate-500/26" />
        </section>

        <WeeklyDiagnosticsFallback />
      </section>
    </section>
  );
};

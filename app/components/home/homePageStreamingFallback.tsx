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

  return (
    <section aria-label="Loading weekly operating posture" className="space-y-5" aria-live="polite" aria-busy="true">
      <section className="weather-panel px-4 py-4 sm:px-5 sm:py-5">
        <article className="weather-appbar relative z-20 border-slate-800/70 px-4 py-4 sm:px-6 sm:py-5">
          <div className="space-y-4">
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
                Weekly brief loading
              </span>
              <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-200">
                {contextLabel}
              </span>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-100/85">Current conditions</p>
              <p className="max-w-2xl text-base font-semibold leading-relaxed text-slate-100 sm:text-lg">
                This week&apos;s posture, action, and flip condition are loading.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="max-w-2xl text-sm text-slate-100">
                {historicalContext ? "Selected historical week is loading." : "Current week is loading."}
              </p>
              <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100">
                <span className="weather-loading-beacon" />
                Loading
              </p>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.9fr)]">
              <section className="grid gap-3 sm:grid-cols-2">
                <article className="rounded-xl border border-slate-800/65 bg-slate-950/70 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Posture</p>
                  <Skeleton className="mt-3 h-6 w-28 rounded-full bg-slate-500/40" />
                </article>
                <article className="rounded-xl border border-slate-800/65 bg-slate-950/70 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Action</p>
                  <Skeleton className="mt-3 h-5 w-11/12 rounded-full bg-slate-500/40" />
                  <Skeleton className="mt-2 h-5 w-8/12 rounded-full bg-slate-500/32" />
                </article>
                <article className="rounded-xl border border-slate-800/65 bg-slate-950/70 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Revisit</p>
                  <Skeleton className="mt-3 h-5 w-24 rounded-full bg-slate-500/36" />
                </article>
                <article className="rounded-xl border border-slate-800/65 bg-slate-950/70 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Flip condition</p>
                  <Skeleton className="mt-3 h-5 w-10/12 rounded-full bg-slate-500/36" />
                </article>
              </section>
              <section className="space-y-3 rounded-xl border border-slate-800/65 bg-slate-950/62 px-4 py-4 sm:px-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">Trust</p>
                  <Skeleton className="h-6 w-24 rounded-full bg-slate-500/35" />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Skeleton className="h-16 w-full rounded-xl bg-slate-500/40" />
                  <Skeleton className="h-16 w-full rounded-xl bg-slate-500/35" />
                  <Skeleton className="h-16 w-full rounded-xl bg-slate-500/32" />
                  <Skeleton className="h-16 w-full rounded-xl bg-slate-500/28" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-10/12 rounded-full bg-slate-500/35" />
                  <Skeleton className="h-4 w-8/12 rounded-full bg-slate-500/30" />
                </div>
              </section>
            </div>
          </div>
        </article>
      </section>

      <WeeklyDiagnosticsFallback />
    </section>
  );
};

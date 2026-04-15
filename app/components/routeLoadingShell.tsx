import { LoadingStageRail } from "./loadingStageRail";
import { Skeleton } from "./skeleton";
import { ReportShell } from "./reportShell";

export function RouteLoadingShell({
  label = "Preparing brief",
  description = "Live brief is being prepared.",
  currentPath = "/",
  pageTitle = "Weekly Brief",
}: {
  label?: string;
  description?: string;
  currentPath?: string;
  pageTitle?: string;
}) {
  const loadingStages = [
    {
      label: "Signal sync",
      hint: "Refreshing the latest macro inputs and freshness checks.",
      state: "active" as const,
    },
    {
      label: "Decision pass",
      hint: `Rebuilding the ${pageTitle.toLowerCase()} summary and action cues.`,
      state: "next" as const,
    },
    {
      label: "Page handoff",
      hint: "Locking the route shell before the live brief streams in.",
      state: "queued" as const,
    },
  ];

  return (
    <ReportShell
      statusLabel={label}
      regime="NEUTRAL"
      recordDateLabel="Updating now"
      fetchedAtLabel="Updating data"
      treasurySource="fiscaldata.treasury.gov"
      pageTitle={pageTitle}
      pageSummary={description}
      sectionLinks={[]}
      trustStatusLabel="Update in progress"
      trustStatusDetail="Evidence checks are in progress."
      trustStatusAction="Keep this page open while the latest brief is prepared."
      trustStatusTone="stable"
      currentPath={currentPath}
    >
      <section aria-label="Preparing page" aria-live="polite" aria-busy="true" className="weather-panel-static space-y-5 rounded-[1.6rem] px-5 py-5 sm:px-6 sm:py-6">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,18rem)]">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]">
              <span className="rounded-full border border-sky-400/35 bg-sky-400/10 px-2.5 py-1 text-sky-100">{label}</span>
              <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-2.5 py-1 text-slate-200">In progress</span>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{pageTitle}</p>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-100">{description}</p>
            </div>
          </div>
          <div className="rounded-[1.25rem] border border-slate-700/75 bg-slate-950/72 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100">
                <span className="weather-loading-beacon" />
                Loading
              </p>
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Live refresh</span>
            </div>
            <div className="weather-loading-progress mt-3" aria-hidden="true" />
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Signals are syncing before the updated brief is released.
            </p>
          </div>
        </div>

        <LoadingStageRail title="Load sequence" items={loadingStages} />

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-7 w-28 rounded-full bg-slate-500/38" />
            <Skeleton className="h-7 w-36 rounded-full bg-slate-500/30" />
          </div>
          <div className="space-y-2.5">
            <Skeleton className="h-10 w-full max-w-3xl rounded-2xl bg-slate-500/48" />
            <Skeleton className="h-4 w-11/12 max-w-2xl rounded-full bg-slate-500/36" />
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.22fr)_minmax(18rem,0.78fr)]">
            <section className="grid gap-3 sm:grid-cols-2">
              <article className="rounded-xl border border-slate-800/65 bg-slate-950/70 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Summary
                </p>
                <Skeleton className="mt-3 h-5 w-10/12 rounded-full bg-slate-500/38" />
              </article>
              <article className="rounded-xl border border-slate-800/65 bg-slate-950/70 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Action
                </p>
                <Skeleton className="mt-3 h-5 w-11/12 rounded-full bg-slate-500/38" />
              </article>
              <article className="rounded-xl border border-slate-800/65 bg-slate-950/70 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Evidence
                </p>
                <Skeleton className="mt-3 h-5 w-10/12 rounded-full bg-slate-500/34" />
              </article>
              <article className="rounded-xl border border-slate-800/65 bg-slate-950/70 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Next step
                </p>
                <Skeleton className="mt-3 h-5 w-8/12 rounded-full bg-slate-500/30" />
              </article>
            </section>

            <section className="space-y-3 rounded-xl border border-slate-800/65 bg-slate-950/62 px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                  Trust
                </p>
                <Skeleton className="h-6 w-24 rounded-full bg-slate-500/32" />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Skeleton className="h-16 w-full rounded-xl bg-slate-500/36" />
                <Skeleton className="h-16 w-full rounded-xl bg-slate-500/30" />
                <Skeleton className="h-16 w-full rounded-xl bg-slate-500/28" />
                <Skeleton className="h-16 w-full rounded-xl bg-slate-500/24" />
              </div>
            </section>
          </div>
        </div>
      </section>
    </ReportShell>
  );
}

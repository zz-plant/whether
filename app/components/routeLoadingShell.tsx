import { Skeleton } from "./skeleton";
import { ReportShell } from "./reportShell";

export function RouteLoadingShell({
  label = "Weekly brief",
  description = "Macro conditions translated into operating decisions for leadership teams.",
  currentPath = "/",
  pageTitle = "Weekly Brief",
}: {
  label?: string;
  description?: string;
  currentPath?: string;
  pageTitle?: string;
}) {
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
      <section aria-label="Preparing page" aria-live="polite" aria-busy="true" className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-fluid-xs font-semibold uppercase tracking-[0.12em]">
          <span className="rounded-full border border-sky-400/35 bg-sky-400/10 px-2.5 py-1 text-sky-100">{label}</span>
          <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-2.5 py-1 text-slate-200">In progress</span>
        </div>

        <div className="text-center space-y-4 py-5">
          <Skeleton className="h-20 w-24 mx-auto rounded-lg bg-slate-500/48" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-48 mx-auto rounded-full bg-slate-500/36" />
            <Skeleton className="h-3 w-64 mx-auto rounded-full bg-slate-500/28" />
          </div>
        </div>

        <div className="relative flex items-center justify-center gap-2 py-2">
          <span className="h-px flex-1 bg-slate-500/18" />
          <Skeleton className="h-3 w-48 rounded-full bg-slate-500/24" />
          <span className="h-px flex-1 bg-slate-500/18" />
        </div>

        <div className="rounded-xl border border-slate-700/60 px-5 py-5 space-y-3">
          <Skeleton className="h-10 w-full rounded-lg bg-slate-500/48" />
          <Skeleton className="h-8 w-11/12 rounded-lg bg-slate-500/30" />
          <Skeleton className="h-2 w-full rounded-full bg-slate-500/28" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-12 rounded-full bg-slate-500/24" />
            <Skeleton className="h-3 w-8 rounded-full bg-slate-500/24" />
          </div>
          <Skeleton className="h-3 w-2/3 rounded-full bg-slate-500/22" />
          <div className="flex gap-3 pt-3 border-t border-slate-700/30">
            <Skeleton className="h-4 w-20 rounded-full bg-slate-500/20" />
            <Skeleton className="h-4 w-16 rounded-full bg-slate-500/20" />
          </div>
        </div>

        <div className="space-y-2">
          {["Why this call?", "Can I trust this?", "What else can I explore?", "How does this affect me?"].map((q) => (
            <div key={q} className="border-b border-slate-800/60 py-3">
              <span className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-400">{q} ▸</span>
            </div>
          ))}
        </div>
      </section>
    </ReportShell>
  );
}

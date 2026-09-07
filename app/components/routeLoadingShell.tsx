import { Skeleton } from "./skeleton";

type RouteLoadingShellProps = {
  label?: string;
  description?: string;
  currentPath?: string;
  pageTitle?: string;
};

export function RouteLoadingShell({
  label = "Weekly brief",
  description = "Macro conditions translated into operating decisions for leadership teams.",
  pageTitle = "Weekly Brief",
}: RouteLoadingShellProps) {
  return (
    <div className="weather-shell weather-page-enter relative isolate flex-1 overflow-x-clip text-slate-100">
      <div className="relative z-10 mx-auto w-full max-w-[96rem] px-[var(--weather-shell-pad-inline)] pb-8 pt-[calc(env(safe-area-inset-top)+0.5rem)] sm:pt-4">
        <section
          aria-label={`Preparing ${pageTitle}`}
          aria-live="polite"
          aria-busy="true"
          className="mx-auto w-full max-w-[72rem] space-y-4"
        >
        <div className="flex flex-wrap items-center gap-2 type-eyebrow">
          <span className="rounded-sm border border-sky-400/35 bg-sky-400/10 px-2.5 py-1 text-sky-100">{label}</span>
          <span className="rounded-sm border border-slate-700/70 bg-slate-950/70 px-2.5 py-1 text-slate-200">In progress</span>
        </div>

        <div className="text-center space-y-4 py-5">
          <Skeleton className="h-20 w-24 mx-auto rounded-lg bg-slate-500/48" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-48 mx-auto rounded-sm bg-slate-500/36" />
            <Skeleton className="h-3 w-64 mx-auto rounded-sm bg-slate-500/28" />
          </div>
        </div>

        <div className="relative flex items-center justify-center gap-2 py-2">
          <span className="h-px flex-1 bg-slate-500/18" />
          <Skeleton className="h-3 w-48 rounded-sm bg-slate-500/24" />
          <span className="h-px flex-1 bg-slate-500/18" />
        </div>

        <div className="rounded-xl border border-slate-700/60 px-5 py-5 space-y-3">
          <Skeleton className="h-10 w-full rounded-lg bg-slate-500/48" />
          <Skeleton className="h-8 w-11/12 rounded-lg bg-slate-500/30" />
          <Skeleton className="h-2 w-full rounded-sm bg-slate-500/28" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-12 rounded-sm bg-slate-500/24" />
            <Skeleton className="h-3 w-8 rounded-sm bg-slate-500/24" />
          </div>
          <Skeleton className="h-3 w-2/3 rounded-sm bg-slate-500/22" />
          <div className="flex gap-3 pt-3 border-t border-slate-700/30">
            <Skeleton className="h-4 w-20 rounded-sm bg-slate-500/20" />
            <Skeleton className="h-4 w-16 rounded-sm bg-slate-500/20" />
          </div>
        </div>

        <div className="space-y-2">
          {["Why this call?", "Can I trust this?", "What else can I explore?", "How does this affect me?"].map((q) => (
            <div key={q} className="border-b border-slate-800/60 py-3">
              <span className="type-eyebrow">{q} ▸</span>
            </div>
          ))}
        </div>
        <p className="sr-only">{description}</p>
        </section>
      </div>
    </div>
  );
}

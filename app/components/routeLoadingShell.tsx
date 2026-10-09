import { Skeleton } from "./skeleton";

type RouteLoadingShellProps = {
  currentPath?: string;
  pageTitle?: string;
};

/**
 * The Suspense fallback every report route streams first. It carries no sentence:
 * the server streams it before the page, so its text was the first thing a crawler
 * indexed on those routes ("Loading evidence: Checking what changed…", 2026-10-09).
 * The region is named by the page's title and marked busy, which is what a screen
 * reader needs while the page resolves.
 */
export function RouteLoadingShell({ pageTitle = "Weekly brief" }: RouteLoadingShellProps) {
  return (
    <div className="weather-shell weather-page-enter relative isolate flex-1 overflow-x-clip text-slate-100">
      <div className="relative z-10 mx-auto w-full max-w-[96rem] px-[var(--weather-shell-pad-inline)] pb-8 pt-[calc(env(safe-area-inset-top)+0.5rem)] sm:pt-4">
        <section
          aria-label={pageTitle}
          aria-live="polite"
          aria-busy="true"
          className="mx-auto w-full max-w-[72rem] space-y-4"
        >
        {/* Shaped like what replaces it — the report intro (kicker, status line,
            title, summary; the stamp and action column banking right from lg)
            and the first section's rule, heading and card — so the resolved
            route lands where the placeholder was. This used to print two
            badges and a four-question list no resolved page renders. */}
        <div className="weather-surface-secondary weather-page-intro px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="space-y-3 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-x-10 lg:space-y-0">
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-3 w-20 rounded-sm bg-slate-500/28" />
              <Skeleton className="h-3 w-56 rounded-sm bg-slate-500/24" />
              <Skeleton className="h-8 w-full max-w-xl rounded-md bg-slate-500/40" />
              <Skeleton className="h-4 w-full max-w-2xl rounded-sm bg-slate-500/24" />
            </div>
            <div className="space-y-3 lg:min-w-[14rem] lg:max-w-sm lg:shrink-0">
              <Skeleton className="h-3 w-40 rounded-sm bg-slate-500/22 lg:ml-auto" />
              <Skeleton className="h-11 w-36 rounded-lg bg-slate-500/28 lg:ml-auto" />
            </div>
          </div>
        </div>

        <div className="space-y-4 border-t border-[color:var(--border-default)] pt-6">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24 rounded-sm bg-slate-500/28" />
            <Skeleton className="h-6 w-72 max-w-full rounded-md bg-slate-500/36" />
          </div>
          <div className="weather-card space-y-3">
            <Skeleton className="h-4 w-11/12 rounded-sm bg-slate-500/26" />
            <Skeleton className="h-4 w-3/4 rounded-sm bg-slate-500/22" />
            <Skeleton className="h-2 w-full rounded-sm bg-slate-500/24" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-12 rounded-sm bg-slate-500/22" />
              <Skeleton className="h-3 w-8 rounded-sm bg-slate-500/22" />
            </div>
          </div>
        </div>
        </section>
      </div>
    </div>
  );
}

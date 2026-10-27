import type { ReactNode } from "react";
import { AnchorFeedback } from "./anchorFeedback";
import { FocusModeController } from "./focusModeController";
import { Skeleton } from "./skeleton";
import { regimeAccentStyle, regimeDataAttribute } from "../../lib/regimeAccent";

/* No transition here: one on every property animated the padding change at the
   `sm` breakpoint while a window resized (§I, never animate layout). The entrance
   is weather-page-enter's. */
const shellMainClassName = "mx-auto max-w-[72rem] px-4 py-4 sm:py-5 weather-page-enter";

export function Shell({
  children,
  loading,
  regime,
}: {
  children?: ReactNode;
  loading?: boolean;
  regime?: string;
}) {
  if (loading) {
    /* `Skeleton`, not `animate-pulse`: only the primitive's shimmer is switched
       off under prefers-reduced-motion (live-state.css), so a Tailwind pulse
       animated for exactly the people who asked it not to. The shapes mirror
       the hero — eyebrow, headline, summary, action row, the stamp column —
       and the two cards under it, so the resolved page lands where the
       placeholder was: a fallback of the wrong height is a layout shift. */
    return (
      <div className="flex-1 bg-[var(--bg-body)] text-[var(--app-text)]">
        <main id="main-content" className="mx-auto max-w-[72rem] px-4 py-4 sm:py-5">
          <output aria-busy="true" aria-label="Weekly brief" className="block">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_18rem] lg:gap-8">
              <div className="space-y-6 min-w-0">
                <div className="weather-card">
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="min-w-0 space-y-4">
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-24 rounded-sm bg-slate-500/28" />
                        <Skeleton className="h-9 w-full max-w-xl rounded-md bg-slate-500/40" />
                      </div>
                      <Skeleton className="h-4 w-full max-w-md rounded-sm bg-slate-500/24" />
                      <Skeleton className="h-8 w-full max-w-sm rounded-lg bg-slate-500/22" />
                    </div>
                    <div className="space-y-2 sm:text-right">
                      <Skeleton className="mx-auto h-20 w-20 rounded-full bg-slate-500/36 sm:mr-0" />
                      <Skeleton className="h-3 w-24 rounded-sm bg-slate-500/24" />
                    </div>
                  </div>
                </div>
                <Skeleton className="h-40 w-full rounded-xl bg-slate-500/18" />
                <Skeleton className="h-56 w-full rounded-xl bg-slate-500/18" />
              </div>
              <div className="space-y-4 lg:col-start-2">
                <Skeleton className="h-32 w-full rounded-xl bg-slate-500/18" />
                <Skeleton className="h-48 w-full rounded-xl bg-slate-500/18" />
              </div>
              <div className="space-y-6 min-w-0">
                <Skeleton className="h-64 w-full rounded-xl bg-slate-500/18" />
                <Skeleton className="h-32 w-full rounded-xl bg-slate-500/18" />
              </div>
            </div>
          </output>
        </main>
      </div>
    );
  }

  return (
    // The atmosphere resolves from data-regime (tokens.css), so the brief and
    // the report routes paint the same wash from the same table.
    //
    // flex-1, not min-h-screen: the body is already a min-h-screen column, so a
    // shell a full viewport tall *under* the header put the footer a header's
    // height below the fold on every short page — the first-visit brief ended
    // in a band of empty ground before the footer. PageShell grows the same way.
    <div
      className="weather-regime-ground flex-1 bg-[var(--bg-body)] text-[var(--app-text)] transition-colors"
      data-regime={regimeDataAttribute(regime)}
      style={regimeAccentStyle(regime)}
    >
      <FocusModeController />
      {/* What PageShell mounts on every other route: a hash link opens the
          disclosure it points into and lands once the streamed target has a box.
          The brief had none, so a link to `#company-calibration` (the shared-arrival
          greeting's "Scale it to your stage and runway") scrolled to a folded
          line instead of the stage and runway choices. */}
      <AnchorFeedback />
      <main id="main-content" data-home-shell-main className={shellMainClassName}>
        {children}
      </main>
    </div>
  );
}

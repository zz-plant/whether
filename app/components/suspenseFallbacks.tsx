import { Skeleton } from "./skeleton";

/**
 * Shaped fallbacks for the streaming boundaries.
 *
 * Two rules these exist to enforce, both of which the inline
 * `<div className="weather-card h-28 animate-pulse" />` fallbacks broke:
 *
 * - Reserve the space the real content will take. A fallback shorter or taller
 *   than what replaces it is a layout shift, and section VII puts CLS at zero.
 *   Mirroring the real component's wrapper classes gets the height right by
 *   construction rather than by a guessed `h-28`.
 * - Use the `Skeleton` primitive rather than `animate-pulse`. Only the primitive's
 *   shimmer is switched off under `prefers-reduced-motion` (live-state.css), so a
 *   Tailwind pulse animates for exactly the people who asked it not to.
 *
 * Each fallback is a live region: a streaming hole that never announces itself
 * leaves a screen-reader user with silence where content is about to appear.
 */

function LoadingRegion({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <output aria-busy="true" aria-label={label} className={`block ${className ?? ""}`.trimEnd()}>
      {children}
    </output>
  );
}

/** Mirrors `OperationsWorkstreamNav`: intro pair, then a 4-up card grid. */
export function WorkstreamNavFallback() {
  return (
    <LoadingRegion label="Loading workstream navigation" className="weather-panel px-4 py-4">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-3 w-32 rounded-sm bg-slate-500/28" />
        <Skeleton className="h-4 w-3/4 rounded-sm bg-slate-500/20" />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-20 w-full rounded-lg bg-slate-500/22" />
        ))}
      </div>
    </LoadingRegion>
  );
}

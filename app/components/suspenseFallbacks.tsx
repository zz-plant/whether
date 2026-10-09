import { WORKSTREAM_NAV_CLASS } from "../operate/components/workstreamNavLayout";
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
    // `<output>` is inline by default, so it gets `block` — unless the caller
    // already set a display of its own, which `block` would contend with.
    <output
      aria-busy="true"
      aria-label={label}
      className={(/(^|\s)(flex|grid|inline-flex|inline-grid|block)(\s|$)/.test(className ?? "") ? className ?? "" : `block ${className ?? ""}`).trim()}
    >
      {children}
    </output>
  );
}

/** Mirrors `OperationsWorkstreamNav`: intro pair, then a 4-up card grid. */
export function WorkstreamNavFallback() {
  return (
    <LoadingRegion label="Workstream navigation" className={WORKSTREAM_NAV_CLASS}>
      {[0, 1, 2].map((index) => (
        <div key={index} className="inline-flex min-h-11 items-center">
          <Skeleton className="h-4 w-24 rounded-sm bg-slate-500/22" />
        </div>
      ))}
    </LoadingRegion>
  );
}

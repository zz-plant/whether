/**
 * Thin scroll-progress bar pinned below the header.
 *
 * Driven by a scroll-driven animation, not a scroll listener: the width grows
 * over the document's scrollable range and the bar fades in over its first
 * 120px, which is the threshold the rAF listener used to poll (2026-10-22).
 * No script runs on scroll, so the bar costs nothing on the busiest page
 * while the reader is scrolling. The animation machinery lives in
 * layout-effects.css, keyed on `data-scroll-progress`; on browsers without
 * the feature the bar stays hidden — a decorative indicator is something a
 * reader can lose without losing information, which is also why it is
 * aria-hidden rather than a live progressbar.
 */
export function ScrollProgressBar() {
  return <div aria-hidden="true" data-scroll-progress className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px] bg-slate-400/70" />;
}

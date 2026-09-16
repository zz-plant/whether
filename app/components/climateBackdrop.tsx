/**
 * The regime's atmosphere behind a report route: the same top-of-page wash the
 * brief paints, read from `--regime-atmosphere` on the shell that carries
 * `data-regime`. This used to hold its own hue table at a flat 3% over the
 * whole viewport — Sunny in teal while every other surface drew it emerald,
 * and a wash that never faded, so the ground under every card was lifted
 * from #08090b to a grey and the ladder lost half its separation.
 */
export const ClimateBackdrop = () => (
  <div
    aria-hidden="true"
    className="weather-regime-ground pointer-events-none absolute inset-0 -z-10"
  />
);

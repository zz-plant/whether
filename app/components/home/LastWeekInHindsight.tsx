import { buildHindsight, type HindsightInput } from "../../../lib/report/hindsight";

/**
 * What the product can say about last week without asking the reader anything.
 *
 * Replaces "Close the week", which wanted the reader back at week's end with a
 * form. This is server-rendered from the same deltas the hero shows, so it is
 * on the page for a first-time visitor and reads the same on every device.
 */
export function LastWeekInHindsight(props: HindsightInput) {
  const hindsight = buildHindsight(props);

  return (
    <section
      aria-labelledby="hindsight-heading"
      data-sticky-strip-hide
      className="weather-section rounded-xl border border-slate-800/70 bg-slate-900/40 p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="hindsight-heading" className="type-section font-semibold tracking-tight text-white">
          Last week, in hindsight
        </h2>
        <p className="text-fluid-nano text-white/40">Computed from the record. Nothing to fill in.</p>
      </div>
      <p className="mt-2 text-fluid-sm font-medium text-white/90">{hindsight.headline}</p>
      <p className="mt-1 text-fluid-xs leading-5 text-slate-300">{hindsight.detail}</p>
      {hindsight.quiet ? null : (
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          {hindsight.lines.map((line) => (
            <div
              key={line.label}
              className={`rounded-lg border px-3 py-2 ${
                line.crossed ? "border-amber-500/40 bg-amber-500/[0.07]" : "border-white/[0.06] bg-white/[0.02]"
              }`}
            >
              <dt className="text-fluid-nano text-white/50">{line.label}</dt>
              <dd className="mt-0.5 text-fluid-xs tabular-nums text-slate-200">
                {line.previous} → <span className="font-semibold text-white">{line.current}</span>
                <span className="text-white/45">
                  {" "}· call changes {line.crossesWhen} {line.line}
                  {line.crossed ? " · crossed" : ` · ${Math.abs(line.room)} pts away`}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

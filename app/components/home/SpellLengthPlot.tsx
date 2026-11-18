import { Fragment } from "react";
import { ConditionLabel } from "../ui/conceptIcons";
import { MarkReadout } from "../ui/markReadout";
import type { SpellLengthPlot as SpellLengthPlotModel } from "../../../lib/report/lastTimeCallChanged";
import { buildTimeMachineHref } from "../../../lib/timeMachine/timeMachineSelection";

/**
 * How long each stretch of conditions lasted, drawn (2026-11-18): one row per
 * condition, a mark per stretch at its length on one shared axis, the stretch the
 * record ends in open, and a dashed rule at the shortest that ended. "Sunny 104 months
 * · Stormy 33 months" counted months under each condition and said nothing of how
 * they fell; the plot shows that Sunny came in one long stretch and two short ones,
 * and where the latest stretch sits against every earlier one. The sentences beside it
 * stay: they are what gets pasted.
 *
 * Every number is the model's (`describeSpellLengths`), the same walk and the same
 * shortest the sentence "every stretch has lasted at least 6 months" reads. The rows
 * carry each condition's total, which was the key's line, so that line is not printed
 * twice.
 *
 * HTML, not a scaled SVG: the labels stay text at the page's size at every width
 * (§XVII), and a mark is placed by its share of the axis. Each mark is a link to the
 * stretch's first month in the time machine; hover, focus or a tap names it
 * (`MarkReadout`).
 */

/** Marks closer than this share of the axis share a row's width, so they split it top and bottom. */
const CROWDED_SHARE = 0.05;

type Lane = "middle" | "top" | "bottom";

/** Which half of its row each mark takes: the middle, unless a neighbour is too close to tell apart. */
const lanesFor = (lengths: readonly number[], axisMax: number): Lane[] => {
  const order = lengths.map((months, index) => ({ months, index })).sort((left, right) => left.months - right.months);
  const lanes: Lane[] = lengths.map(() => "middle");
  order.forEach((entry, position) => {
    const before = order[position - 1];
    if (!before || (entry.months - before.months) / axisMax >= CROWDED_SHARE) return;
    if (lanes[before.index] === "middle") lanes[before.index] = "top";
    lanes[entry.index] = lanes[before.index] === "top" ? "bottom" : "top";
  });
  return lanes;
};

const LANE_BOX: Record<Lane, string> = {
  middle: "top-0 h-full",
  top: "top-0 h-1/2 items-end pb-0.5",
  bottom: "bottom-0 h-1/2 items-start pt-0.5",
};

const share = (months: number, axisMax: number) => `${(Math.min(months, axisMax) / axisMax) * 100}%`;

export function SpellLengthPlot({ plot }: { plot: SpellLengthPlotModel }) {
  const step = plot.axisMax > 48 ? 24 : 12;
  /* Every step, and the axis' own end where a step does not land on it, so the domain is read off the axis. */
  const steps = Array.from({ length: Math.floor(plot.axisMax / step) + 1 }, (_, index) => index * step);
  const ticks = steps.at(-1) === plot.axisMax ? steps : [...steps, plot.axisMax];
  return (
    <figure data-spell-plot className="max-w-3xl space-y-2">
      <MarkReadout>
        <div className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] gap-x-3 text-fluid-sm">
          {plot.rows.map((row, rowIndex) => {
            const lanes = lanesFor(row.stretches.map((stretch) => stretch.months), plot.axisMax);
            return (
              <Fragment key={row.regime}>
                <div className="flex min-h-11 flex-col justify-center py-1 leading-tight" data-spell-plot-row={row.regime}>
                  <ConditionLabel regime={row.regime}>{row.label}</ConditionLabel>
                  <span className="pl-[1.375rem] text-xs tabular-nums text-slate-400">{row.total}</span>
                </div>
                <div className="relative min-h-11" data-regime={row.regime}>
                  {/* The row's baseline: where its marks sit. */}
                  <span aria-hidden="true" className="absolute inset-x-0 top-1/2 border-t border-[color:var(--border-subtle)]" />
                  {plot.shortest !== null ? (
                    <span
                      aria-hidden="true"
                      data-spell-plot-shortest
                      className="absolute inset-y-0 border-l border-dashed border-[color:var(--app-text-muted)]"
                      style={{ left: share(plot.shortest, plot.axisMax) }}
                    />
                  ) : null}
                  {row.stretches.map((stretch, index) => {
                    const lane = lanes[index] ?? "middle";
                    /* The plot's one tab stop is its first mark; arrow keys reach the rest. */
                    const tabIndex = rowIndex === 0 && index === 0 ? 0 : -1;
                    return (
                      <a
                        key={`${stretch.start.year}-${stretch.start.month}`}
                        href={buildTimeMachineHref("/", { month: stretch.start.month, year: stretch.start.year })}
                        tabIndex={tabIndex}
                        aria-label={stretch.label}
                        data-mark={stretch.label}
                        data-spell-plot-mark={stretch.latest ? "latest" : "ended"}
                        className={`group absolute flex w-5 -translate-x-1/2 justify-center ${LANE_BOX[lane]} ${lane === "middle" ? "items-center" : ""}`}
                        style={{ left: share(stretch.months, plot.axisMax) }}
                      >
                        <span
                          aria-hidden="true"
                          className={
                            stretch.latest
                              ? "block size-3 rounded-full border-2 border-[color:var(--regime-ink)] bg-[var(--bg-body)] group-hover:scale-125"
                              : "block size-2.5 rounded-full bg-[var(--regime-ink)] group-hover:scale-125"
                          }
                        />
                      </a>
                    );
                  })}
                </div>
              </Fragment>
            );
          })}
          {/* The axis: months, from 0 to the longest stretch rounded up to a year. */}
          <div aria-hidden="true" />
          <div aria-hidden="true" className="relative h-5 border-t border-[color:var(--border-default)] text-xs tabular-nums text-slate-400">
            {ticks.map((tick) => (
              <span
                key={tick}
                className={`absolute top-1 ${tick === 0 ? "" : tick === plot.axisMax ? "-translate-x-full" : "-translate-x-1/2"}`}
                style={{ left: share(tick, plot.axisMax) }}
              >
                {tick}
              </span>
            ))}
          </div>
        </div>
      </MarkReadout>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
        <span>Months each stretch lasted, {plot.range}</span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block size-2.5 rounded-full bg-current" />ended
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block size-3 rounded-full border-2 border-current" />
          {plot.latestKey}
        </span>
        {plot.shortest !== null ? (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-3 border-l border-dashed border-current" />
            shortest, {plot.shortest} {plot.shortest === 1 ? "month" : "months"}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}

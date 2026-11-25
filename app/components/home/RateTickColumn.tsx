import { formatThresholdNumber } from "../../../lib/formatters";
import { formatShortRate } from "../../../lib/report/fedSteps";

/**
 * The short rate beside the conditions chart's funding-pressure lines (2026-11-18), drawn
 * inside the chart's SVG: for the chosen area's pause and restart and the change line,
 * "76 3.92%", each joined to its line's end by a hairline in the line's own ink, and the
 * rate's name rotated along the far edge as the left edge names its score. Only where the
 * rate alone makes funding pressure this week (`fundingPressureRateLookup`); the caller
 * draws nothing otherwise.
 *
 * The lines an area turns on sit close (66, 70 and 76 are 6 to 9 units apart on the
 * chart), so a label sits at its line where it can and is pushed apart where two would
 * overlap, and the column is kept between the corner glyphs.
 */

export type RateTick = { value: number; rate: number; kind: "pause" | "restart" | "change" };

const TEXT = 10;
const GAP = 11;

const STROKE: Record<RateTick["kind"], string> = {
  pause: "var(--line-crossed)",
  restart: "var(--line-clear-ink)",
  change: "var(--phase-boundary)",
};

/** Each label's height: at its line, pushed apart, then the column moved back inside `[minY, maxY]`. */
const placeRateTicks = <T extends { y: number }>(ticks: readonly T[], minY: number, maxY: number): Array<T & { labelY: number }> => {
  const placed = [...ticks]
    .sort((left, right) => left.y - right.y)
    .reduce<Array<T & { labelY: number }>>((acc, tick) => {
      const previous = acc.at(-1);
      acc.push({ ...tick, labelY: previous ? Math.max(tick.y, previous.labelY + GAP) : tick.y });
      return acc;
    }, []);
  const overflow = Math.max(0, (placed.at(-1)?.labelY ?? 0) - maxY);
  const underflow = Math.max(0, minY - ((placed[0]?.labelY ?? minY) - overflow));
  return placed.map((tick) => ({ ...tick, labelY: tick.labelY - overflow + underflow }));
};

export function RateTickColumn({
  ticks,
  label,
  y,
  plotRight,
  viewWidth,
  titleY,
  minY,
  maxY,
}: {
  ticks: readonly RateTick[];
  /** "1-month rate". */
  label?: string;
  /** Places a funding-pressure value on the chart. */
  y: (tightness: number) => number;
  plotRight: number;
  viewWidth: number;
  /** The plot's middle, where the rotated name centres. */
  titleY: number;
  minY: number;
  maxY: number;
}) {
  const labelX = plotRight + 7;
  const titleX = viewWidth - 8;
  return (
    <g data-rate-ticks="">
      {placeRateTicks(ticks.map((tick) => ({ ...tick, y: y(tick.value) })), minY, maxY).map((tick) => (
        <g key={`${tick.kind}-${tick.value}`} data-rate-tick={tick.kind}>
          <polyline
            points={`${plotRight},${tick.y} ${plotRight + 2},${tick.y} ${labelX - 2},${tick.labelY}`}
            fill="none"
            stroke={STROKE[tick.kind]}
            strokeWidth="0.8"
          />
          <text x={labelX} y={tick.labelY + TEXT * 0.34} className="fill-slate-400 tabular-nums" fontSize={TEXT}>
            {`${formatThresholdNumber(tick.value)} ${formatShortRate(tick.rate)}`}
          </text>
        </g>
      ))}
      {label ? (
        <text x={titleX} y={titleY} textAnchor="middle" transform={`rotate(-90, ${titleX}, ${titleY})`} className="fill-slate-400 text-[11px]">
          {`← ${label}`}
        </text>
      ) : null}
    </g>
  );
}

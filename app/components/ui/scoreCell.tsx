import type { ReactNode } from "react";

/**
 * A number with its reference. A score printed alone ("Funding pressure 12")
 * is not something a reader can act on: the line it is judged against, how
 * far it sits from that line, and where it was last week are what turn it
 * into a decision. The four parts always print in this order, on the page and
 * in every paste (`formatScoreReference` is the text form the exports use).
 */
type ScoreReference = {
  label: string;
  value: number;
  line: { value: number; label: string };
  previous?: number | null;
  /**
   * What `previous` is. "Last week" everywhere but the one cell that compares
   * against something else (the month a past call changed), where printing
   * "last week" over a years-old reading needed a footnote to take it back.
   */
  previousLabel?: string;
  /**
   * Units for a reading that is not a 0–100 score. The base rate is a percent
   * and the curve is a spread in points, and both are judged against a line
   * the same way; the defaults print a score ("12 of 100 · … · 64 pts below").
   */
  units?: ScoreUnits;
};

export type ScoreUnits = {
  /** Printed after the value and after the line, e.g. "%" or "pp". */
  suffix?: string;
  /** Printed after the value alone; "" for a reading with no fixed scale. */
  scale?: string;
  /** The word for a distance, e.g. "pts". "" prints the suffix instead. */
  distance?: string;
};

const DEFAULT_UNITS: Required<ScoreUnits> = { suffix: "", scale: "of 100", distance: "pts" };

const resolveUnits = (units?: ScoreUnits): Required<ScoreUnits> => ({ ...DEFAULT_UNITS, ...units });

const formatDistance = (distance: number, units: Required<ScoreUnits>) =>
  units.distance ? `${formatPoints(distance)} ${units.distance}` : `${formatPoints(distance)}${units.suffix}`;

const formatPoints = (points: number) => (points % 1 === 0 ? points.toFixed(0) : points.toFixed(1));

export const formatScoreReference = ({ label, value, line, previous, previousLabel = "Last week", units }: ScoreReference) => {
  const resolved = resolveUnits(units);
  const distance = Math.abs(value - line.value);
  const side = distance === 0 ? "at" : value > line.value ? "above" : "below";
  const parts = [
    `${label} ${formatPoints(value)}${resolved.suffix}${resolved.scale ? ` ${resolved.scale}` : ""}`,
    `${line.label} ${formatPoints(line.value)}${resolved.suffix}`,
    distance === 0 ? "at the line" : `${formatDistance(distance, resolved)} ${side}`,
  ];
  if (typeof previous === "number" && Number.isFinite(previous)) parts.push(`${previousLabel.toLowerCase()} ${formatPoints(previous)}${resolved.suffix}`);
  return parts.join(" · ");
};

type ScoreCellProps = ScoreReference & { className?: string; children?: ReactNode };

export function ScoreCell({ label, value, line, previous = null, previousLabel = "Last week", units, className = "", children }: ScoreCellProps) {
  const resolved = resolveUnits(units);
  const distance = Math.abs(value - line.value);
  const side = distance === 0 ? "at the line" : `${formatDistance(distance, resolved)} ${value > line.value ? "above" : "below"}`;
  const hasPrevious = typeof previous === "number" && Number.isFinite(previous);
  return (
    <dl className={`grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs ${className}`.trim()}>
      <dt className="text-slate-400">{label}</dt>
      <dd className="tabular-nums text-slate-100">
        <span className="text-base font-semibold">{formatPoints(value)}{resolved.suffix}</span>
        {resolved.scale ? <span className="text-slate-400"> {resolved.scale}</span> : null}
      </dd>
      <dt className="text-slate-400">{line.label}</dt>
      <dd className="tabular-nums text-slate-300">
        {formatPoints(line.value)}{resolved.suffix} · {side}
      </dd>
      {hasPrevious ? (
        <>
          <dt className="text-slate-400">{previousLabel}</dt>
          <dd className="tabular-nums text-slate-300">{formatPoints(previous)}{resolved.suffix}</dd>
        </>
      ) : null}
      {children}
    </dl>
  );
}

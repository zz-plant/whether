import type { ReactNode } from "react";

/**
 * A number with its reference. A score printed alone ("Funding pressure 12")
 * is not something a reader can act on: the line it is judged against, how
 * far it sits from that line, and where it was last week are what turn it
 * into a decision. The four parts always print in this order, on the page and
 * in every paste: `scoreReferenceParts` returns the parts, `formatScoreReference` is the
 * plain-text join of them, and the exports and the brief card draw the same parts.
 */
type ScoreReference = {
  label: string;
  value: number;
  line: { value: number; label: string };
  previous?: number | null;
  /**
   * What `previous` is. The reading routes pass the date it is from ("Aug 31",
   * `comparisonBasis(...).label`): the comparison behind them is the previous
   * monthly snapshot, and "last week" over it was a wrong number of days.
   * "Last week" is the default for a caller that has no date. The one cell
   * that compares against something else (the month a past call changed)
   * passes its own, where "last week" over a years-old reading needed a
   * footnote to take it back.
   */
  previousLabel?: string;
  /**
   * Units for a reading that is not a 0–100 score. The base rate is a percent
   * and the curve is a spread in points, and both are judged against a line
   * the same way; the defaults print a score ("12 of 100 · … · 64 pts below").
   */
  units?: ScoreUnits;
};

/**
 * A reference as text. `previousDate` is the date `previous` is from ("Aug 31")
 * when the caller knows it, and it changes the words, not only the label: a
 * date after a bare number reads as a second number ("aug 31 63"), so a dated
 * reading prints "was 63 on Aug 31" and an undated one keeps "last week 63".
 */
type TextScoreReference = ScoreReference & { previousDate?: string | null };

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

/* "1 pts above" was printing wherever a reading sat one point from its line. */
const formatDistance = (distance: number, units: Required<ScoreUnits>) =>
  units.distance
    ? `${formatPoints(distance)} ${distance === 1 && units.distance === "pts" ? "pt" : units.distance}`
    : `${formatPoints(distance)}${units.suffix}`;

const formatPoints = (points: number) => (points % 1 === 0 ? points.toFixed(0) : points.toFixed(1));

/**
 * The four parts of a score's reference, separately. A surface that sets the
 * number in its own type size (the brief card) draws these; `formatScoreReference`
 * is these joined, so the words on the card and in the paste are one derivation.
 */
export const scoreReferenceParts = ({
  label,
  value,
  line,
  previous,
  previousLabel = "Last week",
  previousDate = null,
  units,
}: TextScoreReference) => {
  const resolved = resolveUnits(units);
  const distance = Math.abs(value - line.value);
  const side = distance === 0 ? "at" : value > line.value ? "above" : "below";
  const previousValue =
    typeof previous === "number" && Number.isFinite(previous) ? `${formatPoints(previous)}${resolved.suffix}` : null;
  return {
    /** "Funding pressure 90 of 100" */
    reading: `${label} ${formatPoints(value)}${resolved.suffix}${resolved.scale ? ` ${resolved.scale}` : ""}`,
    /** "90": the number alone, as it prints beside its label. */
    value: `${formatPoints(value)}${resolved.suffix}`,
    /** "pause line 76" */
    line: `${line.label} ${formatPoints(line.value)}${resolved.suffix}`,
    /** "14 pts above", or "at the line" */
    distance: distance === 0 ? "at the line" : `${formatDistance(distance, resolved)} ${side}`,
    /** "was 63 on Aug 31", or "last week 63" with no date; null when there is no previous reading to compare. */
    previous:
      previousValue === null
        ? null
        : previousDate
          ? `was ${previousValue} on ${previousDate}`
          : `${previousLabel.toLowerCase()} ${previousValue}`,
  };
};

export const formatScoreReference = (reference: TextScoreReference) => {
  const { reading, line, distance, previous } = scoreReferenceParts(reference);
  return [reading, line, distance, previous].filter((part) => part !== null).join(" · ");
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

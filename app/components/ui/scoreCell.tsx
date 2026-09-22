import type { ReactNode } from "react";

/**
 * A number with its reference. A score printed alone ("Funding pressure 12")
 * is not something a reader can act on: the line it is judged against, how
 * far it sits from that line, and where it was last week are what turn it
 * into a decision. The four parts always print in this order, on the page and
 * in every paste (`formatScoreReference` is the text form the exports use).
 */
export type ScoreReference = {
  label: string;
  value: number;
  line: { value: number; label: string };
  previous?: number | null;
};

const formatPoints = (points: number) => (points % 1 === 0 ? points.toFixed(0) : points.toFixed(1));

export const formatScoreReference = ({ label, value, line, previous }: ScoreReference) => {
  const distance = Math.abs(value - line.value);
  const side = distance === 0 ? "at" : value > line.value ? "above" : "below";
  const parts = [
    `${label} ${formatPoints(value)} of 100`,
    `${line.label} ${formatPoints(line.value)}`,
    distance === 0 ? "at the line" : `${formatPoints(distance)} pts ${side}`,
  ];
  if (typeof previous === "number" && Number.isFinite(previous)) parts.push(`last week ${formatPoints(previous)}`);
  return parts.join(" · ");
};

type ScoreCellProps = ScoreReference & { className?: string; children?: ReactNode };

export function ScoreCell({ label, value, line, previous = null, className = "", children }: ScoreCellProps) {
  const distance = Math.abs(value - line.value);
  const side = distance === 0 ? "at the line" : `${formatPoints(distance)} pts ${value > line.value ? "above" : "below"}`;
  const hasPrevious = typeof previous === "number" && Number.isFinite(previous);
  return (
    <dl className={`grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs ${className}`.trim()}>
      <dt className="text-slate-400">{label}</dt>
      <dd className="tabular-nums text-slate-100">
        <span className="text-base font-semibold">{formatPoints(value)}</span>
        <span className="text-slate-400"> of 100</span>
      </dd>
      <dt className="text-slate-400">{line.label}</dt>
      <dd className="tabular-nums text-slate-300">
        {formatPoints(line.value)} · {side}
      </dd>
      {hasPrevious ? (
        <>
          <dt className="text-slate-400">Last week</dt>
          <dd className="tabular-nums text-slate-300">{formatPoints(previous)}</dd>
        </>
      ) : null}
      {children}
    </dl>
  );
}

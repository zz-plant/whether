import type { ReactNode } from "react";

/**
 * A score drawn against its lines.
 *
 * The product's mechanic is a 0–100 score judged against three lines: the
 * pause line, the resume line, and the line where the call itself changes.
 * "How close are we" is the one fact that decides whether to act this week or
 * wait, and it was rendered as text ("64 pts away"), as rails inside a box, as
 * a sparkline, as a quadrant SVG on /trust and as bare numbers on the answer
 * pages — six drawings of one idea. This is the one drawing: a track, the
 * lines labelled, this week's dot, last week's dot, and the distance to the
 * nearest line as the one number. Every surface that shows a score draws it.
 *
 * Presentational: it takes numbers and knows nothing about the engine.
 */
type LadderLineKind = "pause" | "resume" | "callChange";

export type LadderLine = {
  kind: LadderLineKind;
  value: number;
  /** Overrides the default label for the kind. */
  label?: string;
};

type ScoreLadderProps = {
  label: ReactNode;
  value: number;
  /** The comparison reading; drawn hollow. Null when there is nothing to compare against. */
  previous?: number | null;
  /**
   * What the hollow dot is. "Last week" on every reading route; /history/compare
   * draws period B against period A and /history draws the month before the
   * last completed one, and a hollow dot captioned "last week" there would be
   * a claim about a comparison nobody made.
   */
  previousLabel?: string;
  lines: readonly LadderLine[];
  max?: number;
  className?: string;
};

const LINE_LABELS: Record<LadderLineKind, string> = {
  pause: "Pause",
  resume: "Resume",
  callChange: "Call changes",
};

const LINE_CLASS: Record<LadderLineKind, string> = {
  pause: "bg-semantic-caution-border text-semantic-caution-fg",
  resume: "bg-semantic-easing-border text-semantic-easing-fg",
  callChange: "bg-[var(--regime-accent)] text-[var(--regime-ink)]",
};

const clampPercent = (value: number, max: number) => Math.min(100, Math.max(0, (value / max) * 100));

const formatPoints = (points: number) => (points % 1 === 0 ? points.toFixed(0) : points.toFixed(1));

/** The line nearest the value, and the distance to it, for the caption and for callers that print one. */
export const nearestLadderLine = (value: number, lines: readonly LadderLine[]) => {
  let best: { line: LadderLine; distance: number } | null = null;
  for (const line of lines) {
    const distance = Math.abs(value - line.value);
    if (!best || distance < best.distance) best = { line, distance };
  }
  return best;
};

/**
 * The three lines as a ladder takes them, from the numbers a surface has. The
 * pause and resume lines come from a rule's rails (`buildSharedCorridorRails`)
 * and are absent when the rule states none; the call-change line is the
 * threshold in force and is always drawn.
 */
export const buildLadderLines = ({
  pause,
  resume,
  callChange,
}: {
  pause?: number;
  resume?: number;
  callChange: number;
}): LadderLine[] => [
  ...(typeof pause === "number" ? [{ kind: "pause" as const, value: pause }] : []),
  ...(typeof resume === "number" ? [{ kind: "resume" as const, value: resume }] : []),
  { kind: "callChange" as const, value: callChange },
];

export const describeLadderPosition = (value: number, lines: readonly LadderLine[]) => {
  const nearest = nearestLadderLine(value, lines);
  if (!nearest) return `${formatPoints(value)} of 100`;
  const label = (nearest.line.label ?? LINE_LABELS[nearest.line.kind]).toLowerCase();
  if (nearest.distance === 0) return `${formatPoints(value)} of 100 · at the ${label} line`;
  const side = value > nearest.line.value ? "above" : "below";
  return `${formatPoints(value)} of 100 · ${formatPoints(nearest.distance)} pts ${side} the ${label} line`;
};

export function ScoreLadder({
  label,
  value,
  previous = null,
  previousLabel = "Last week",
  lines,
  max = 100,
  className = "",
}: ScoreLadderProps) {
  const caption = describeLadderPosition(value, lines);
  /* The three lines can sit within a few points of each other — 66, 70 and 76
     is the common case — and their labels then overlap into one smudge. Each
     label that would collide with the one before it drops to the next row, on
     a longer tick, so every line keeps a label the reader can read. */
  const laidOut = [...lines]
    .sort((left, right) => left.value - right.value)
    .map((line, index, sorted) => {
      const previous = sorted[index - 1];
      const collides = previous !== undefined && (line.value - previous.value) / max < 0.13;
      return { line, collides };
    })
    .reduce<{ line: LadderLine; row: number }[]>((rows, entry) => {
      const previousRow = rows[rows.length - 1]?.row ?? 0;
      return [...rows, { line: entry.line, row: entry.collides ? previousRow + 1 : 0 }];
    }, []);
  const hasPrevious = typeof previous === "number" && Number.isFinite(previous);
  return (
    <figure className={`space-y-1.5 ${className}`.trim()} data-score-ladder>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
        <span className="font-medium text-slate-200">{label}</span>
        <span className="tabular-nums text-slate-400">{caption}</span>
      </figcaption>
      {hasPrevious ? <span className="sr-only">{previousLabel} {formatPoints(previous)}.</span> : null}
      <div
        className="relative"
        style={{ height: `${34 + Math.max(0, ...laidOut.map((entry) => entry.row)) * 11}px` }}
        aria-hidden="true"
      >
        <div className="absolute inset-x-0 top-3 h-1.5 rounded-full bg-slate-800" />
        {laidOut.map(({ line, row }) => (
          <div
            key={`${line.kind}-${line.value}`}
            className="absolute top-1.5 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${clampPercent(line.value, max)}%` }}
          >
            <span className={`w-0.5 ${LINE_CLASS[line.kind].split(" ")[0]}`} style={{ height: `${18 + row * 11}px` }} />
            <span className={`mt-0.5 whitespace-nowrap text-[10px] leading-none ${LINE_CLASS[line.kind].split(" ")[1]}`}>
              {line.label ?? LINE_LABELS[line.kind]} {formatPoints(line.value)}
            </span>
          </div>
        ))}
        {hasPrevious ? (
          <span
            className="absolute top-2.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-slate-300 bg-transparent"
            style={{ left: `${clampPercent(previous, max)}%` }}
            title={`${previousLabel}: ${formatPoints(previous)}`}
          />
        ) : null}
        <span
          className="absolute top-2 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-[var(--bg-panel)] bg-slate-100"
          style={{ left: `${clampPercent(value, max)}%` }}
        />
      </div>
    </figure>
  );
}

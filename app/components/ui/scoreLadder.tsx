import type { CSSProperties, ReactNode } from "react";

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
   * What the hollow dot is. The reading routes pass the date of the reading it
   * is drawn from ("Aug 31", `comparisonBasis(...).label`) and "Last week" is
   * the default for a caller with no date; /history/compare draws period B
   * against period A and /history draws the month before the last completed
   * one, and a hollow dot captioned "last week" there would be a claim about a
   * comparison nobody made.
   */
  previousLabel?: string;
  lines: readonly LadderLine[];
  max?: number;
  className?: string;
};

const LINE_LABELS: Record<LadderLineKind, string> = {
  pause: "Pause",
  resume: "Resume",
  callChange: "Change line",
};

const LINE_CLASS: Record<LadderLineKind, string> = {
  pause: "bg-semantic-caution-border text-semantic-caution-fg",
  resume: "bg-semantic-easing-border text-semantic-easing-fg",
  /* Neutral, not the regime accent: on a Freezing week the accent is the red
     the page wash, the stamp and an alarm already use, and a red tick read as
     a line already broken. Where conditions change is a boundary, not a state. */
  callChange: "bg-slate-300 text-slate-200",
};

const clampPercent = (value: number, max: number) => Math.min(100, Math.max(0, (value / max) * 100));

const formatPoints = (points: number) => (points % 1 === 0 ? points.toFixed(0) : points.toFixed(1));

/*
 * Label collision is a pixel question asked of a percentage track. The labels
 * are centred on their ticks at 11px type, so two neighbours need half of each
 * label's width between them.
 *
 * A tick carries its number only; the key under the track names the lines, in
 * the order the ticks sit. "Change line 70" is about 80px of text, and the
 * common lines (66, 70, 76) sit 9px apart in a 224px column, so a named label
 * stacked three rows deep wherever it was drawn. Two digits clear on one row
 * from about 450px.
 *
 * The server cannot measure the track, so the layout is computed for both
 * widths a ladder is drawn at — the 14rem column of the homepage table, and a
 * 28rem-or-wider track — and a container query picks the one that applies.
 * (It used to be computed for 224px alone and applied at every width, so a
 * full-width desktop ladder stacked labels that had room to spare.)
 */
const LADDER_TRACK_WIDTHS = { narrow: 224, wide: 448 } as const;
/* 11px ticks and a 12px key, not the 10px both were: a ladder is what a
   screenshot of /trust or /signals is taken to show, and a channel re-encoding
   a phone capture takes 10px numbers past reading. The ticks stop at 11px so
   the common 66/70/76 lines still share one row on a wide track. */
const LABEL_CHAR_PX = 6.2;
const LABEL_GAP_PX = 5;

type TrackStyle = CSSProperties & { "--ladder-rows": number; "--ladder-rows-wide": number };
type MarkStyle = CSSProperties & { "--row": number; "--row-wide": number };

const markStyle = (left: number, row: number, wideRow: number): MarkStyle => ({
  left: `${left}%`,
  "--row": row,
  "--row-wide": wideRow,
});

const tickText = (line: LadderLine) => formatPoints(line.value);
const lineName = (line: LadderLine) => line.label ?? LINE_LABELS[line.kind];

/**
 * Each label on the lowest row where it clears every label already placed on
 * that row, for a track of `trackPx`. Greedy over lines sorted by value, so
 * close lines take extra rows and far-apart ones share the first.
 */
export const layoutLadderLabels = (
  lines: readonly LadderLine[],
  max = 100,
  trackPx: number = LADDER_TRACK_WIDTHS.narrow,
): { line: LadderLine; row: number }[] => {
  const placed: { line: LadderLine; row: number; centre: number; halfWidth: number }[] = [];
  for (const line of [...lines].sort((left, right) => left.value - right.value)) {
    const centre = (clampPercent(line.value, max) / 100) * trackPx;
    const halfWidth = (tickText(line).length * LABEL_CHAR_PX) / 2;
    let row = 0;
    while (
      placed.some((other) => other.row === row && Math.abs(centre - other.centre) < halfWidth + other.halfWidth + LABEL_GAP_PX)
    ) {
      row += 1;
    }
    placed.push({ line, row, centre, halfWidth });
  }
  return placed.map(({ line, row }) => ({ line, row }));
};

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

/** The line's name inside a sentence ("9 pts above the pause line"). */
const LINE_PHRASES: Record<LadderLineKind, string> = {
  pause: "pause line",
  resume: "resume line",
  callChange: "change line",
};

export const describeLadderPosition = (value: number, lines: readonly LadderLine[]) => {
  const nearest = nearestLadderLine(value, lines);
  if (!nearest) return `${formatPoints(value)} of 100`;
  const phrase = nearest.line.label ? `${nearest.line.label.toLowerCase()} line` : LINE_PHRASES[nearest.line.kind];
  if (nearest.distance === 0) return `${formatPoints(value)} of 100 · at the ${phrase}`;
  const side = value > nearest.line.value ? "above" : "below";
  return `${formatPoints(value)} of 100 · ${formatPoints(nearest.distance)} ${nearest.distance === 1 ? "pt" : "pts"} ${side} the ${phrase}`;
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
  /* Rows for each width the ladder is drawn at; the container query on the
     track picks one. Positions go through custom properties so one element
     serves both layouts. */
  const narrow = layoutLadderLabels(lines, max, LADDER_TRACK_WIDTHS.narrow);
  const wideRows = new Map(
    layoutLadderLabels(lines, max, LADDER_TRACK_WIDTHS.wide).map(({ line, row }) => [line, row] as const),
  );
  const laidOut = narrow.map(({ line, row }) => ({ line, row, wideRow: wideRows.get(line) ?? row }));
  const maxRow = (key: "row" | "wideRow") => Math.max(0, ...laidOut.map((entry) => entry[key]));
  const hasPrevious = typeof previous === "number" && Number.isFinite(previous);
  const trackStyle: TrackStyle = {
    "--ladder-rows": maxRow("row"),
    "--ladder-rows-wide": maxRow("wideRow"),
  };
  return (
    <figure className={`@container space-y-1.5 ${className}`.trim()} data-score-ladder>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
        <span className="font-medium text-slate-200">{label}</span>
        <span className="tabular-nums text-slate-400">{caption}</span>
      </figcaption>
      <div
        className="relative h-[calc(38px+var(--ladder-rows)*13px)] @[28rem]:h-[calc(38px+var(--ladder-rows-wide)*13px)]"
        style={trackStyle}
        aria-hidden="true"
      >
        <div className="absolute inset-x-0 top-3 h-1.5 rounded-full bg-slate-800" />
        {/* Ticks first, then every label as a second layer. Each line used to
            be one translated wrapper holding its tick and its label; a
            transform makes a stacking context, so a later line's tick painted
            over an earlier line's label whatever the label's z-index, and on a
            phone it ran through the text. */}
        {laidOut.map(({ line, row, wideRow }) => (
          <span
            key={`tick-${line.kind}-${line.value}`}
            data-ladder-tick
            className={`absolute top-1.5 h-[calc(18px+var(--row)*13px)] w-0.5 -translate-x-1/2 @[28rem]:h-[calc(18px+var(--row-wide)*13px)] ${LINE_CLASS[line.kind].split(" ")[0]}`}
            style={markStyle(clampPercent(line.value, max), row, wideRow)}
          />
        ))}
        {laidOut.map(({ line, row, wideRow }) => (
          <span
            key={`label-${line.kind}-${line.value}`}
            data-ladder-row={row}
            data-ladder-row-wide={wideRow}
            className={`absolute top-[calc(26px+var(--row)*13px)] -translate-x-1/2 whitespace-nowrap rounded-[2px] bg-[var(--bg-body)] px-0.5 text-[11px] leading-none tabular-nums @[28rem]:top-[calc(26px+var(--row-wide)*13px)] ${LINE_CLASS[line.kind].split(" ")[1]}`}
            style={markStyle(clampPercent(line.value, max), row, wideRow)}
          >
            {tickText(line)}
          </span>
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
      {/* The lines' key, left to right in the order the ticks sit, so a line
          can be matched by position as well as by colour. */}
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] leading-none text-slate-400" data-ladder-key>
        {narrow.map(({ line }) => (
          <span key={`key-${line.kind}-${line.value}`} className="inline-flex items-center gap-1">
            <span aria-hidden="true" className={`inline-block h-2 w-0.5 ${LINE_CLASS[line.kind].split(" ")[0]}`} />
            <span className={LINE_CLASS[line.kind].split(" ")[1]}>{lineName(line)}</span>{" "}
            <span className="tabular-nums">{formatPoints(line.value)}</span>
          </span>
        ))}
      </p>
      {/* The hollow dot's key. It was a tooltip inside an aria-hidden track, so
          a sighted reader had nothing saying which dot was which. */}
      {hasPrevious ? (
        <p className="flex items-center gap-1.5 text-[12px] leading-none text-slate-400">
          <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full border-2 border-slate-300" />
          {`${previousLabel}: ${formatPoints(previous)}`}
        </p>
      ) : null}
    </figure>
  );
}

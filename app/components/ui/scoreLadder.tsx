"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { ConditionIcon, LineStateIcon } from "./conceptIcons";
import type { RegimeKey } from "../../../lib/types";
import { travelTimeAt } from "../../../lib/report/home/weekMove";

/**
 * A score drawn against its lines.
 *
 * The product's mechanic is a 0–100 score judged against three lines: the
 * pause line, the restart line, and the line where the call itself changes.
 * "How close are we" is the one fact that decides whether to act this week or
 * wait, and it was rendered as text ("64 pts away"), as rails inside a box, as
 * a sparkline, as a quadrant SVG on /trust and as bare numbers on the answer
 * pages — six drawings of one idea. This is the one drawing: a track, the
 * lines labelled with the range each guards shaded, this week's dot, last
 * week's dot and the move between them, and the distance to the nearest line
 * as the one number. Every surface that shows a score draws it.
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
  /**
   * How far a common and an unusual month has moved this score, drawn around the dot as a
   * weather app draws a day's range (2026-11-05). Where it reaches a line, a month like
   * those crosses it. A count of past months, not a chance of the next one.
   */
  monthRange?: { common: number; unusual: number } | null;
  /** The score with the left-out inputs counted, where that changes conditions: their glyph, plotted. */
  feelsLike?: { value: number; regime: RegimeKey } | null;
  /**
   * Direct-manipulation callback when a surface (such as Scenario Studio) commits
   * the scrubbed score rather than springing back to `value`.
   */
  onScrubValue?: (nextValue: number) => void;
  /**
   * Draw the week's move as travel (week-move.css): the dot runs from the earlier
   * reading to this one, and each line between them marks the moment it is passed.
   * Only inside a card that replays the move; everywhere else the ladder is still.
   */
  travel?: boolean;
  /**
   * Print the value as a figure beside the label (docs/design/rebuild-covenant.md): the
   * two published scores, in the binding voice, where the brief states them. A ladder in
   * a table or a comparison keeps the plain caption.
   */
  figure?: boolean;
  className?: string;
};

const LINE_LABELS: Record<LadderLineKind, string> = {
  pause: "Pause",
  /* "Restart", the one word for this line (docs/editorial-guardrails.md, Decision
     vocabulary). The key said "Resume" beside prose that said "restart". */
  resume: "Restart",
  callChange: DECISION_CONTRACT_LABELS.watch.changeLine,
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

/* Two places, so a subtraction's float error ("8.000000000000007%") never reaches the markup. */
const roundPercent = (percent: number) => Math.round(percent * 100) / 100;

/* The range each line guards, tinted in its line's colour at a fraction of
   its strength: a reading inside the amber band is paused, one inside the
   green band may resume, and the reader sees which side of a line the dot is
   on without comparing two numbers. */
const ZONE_CLASS: Record<"pause" | "resume", string> = {
  pause: "bg-semantic-caution-border/25",
  resume: "bg-semantic-easing-border/20",
};

/** Whether `line` guards the range above it, judged against another line on the track; undefined when there is none to judge by. */
const guardsAbove = (line: LadderLine, other: LadderLine | undefined) =>
  other && other.value !== line.value ? line.value > other.value : undefined;

/*
 * The pause and resume ranges, each on the side its line faces. A line faces
 * away from the other: funding pressure pauses above 76 and resumes below 66,
 * risk appetite pauses below 44 and resumes above 54. The change line settles
 * it when only one of the pair is drawn. A line with nothing to face away
 * from gets no range, rather than a guess at its direction.
 */
const ladderZones = (lines: readonly LadderLine[], max: number) => {
  const pause = lines.find((line) => line.kind === "pause");
  const resume = lines.find((line) => line.kind === "resume");
  const change = lines.find((line) => line.kind === "callChange");
  return [
    { kind: "pause" as const, line: pause, above: pause ? guardsAbove(pause, resume) ?? guardsAbove(pause, change) : undefined },
    { kind: "resume" as const, line: resume, above: resume ? guardsAbove(resume, pause) ?? guardsAbove(resume, change) : undefined },
  ].flatMap(({ kind, line, above }) => {
    if (!line || above === undefined) return [];
    const at = clampPercent(line.value, max);
    return [{ kind, left: roundPercent(above ? at : 0), width: roundPercent(above ? 100 - at : at) }];
  });
};

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
const SNAP_DETENT_POINTS = 1.4;
const DRAG_ACTIVATION_PX = 4;

type TrackStyle = CSSProperties & { "--ladder-rows": number; "--ladder-rows-wide": number };
type MarkStyle = CSSProperties & { "--row": number; "--row-wide": number };

const markStyle = (left: number, row: number, wideRow: number): MarkStyle => ({
  left: `${left}%`,
  "--row": row,
  "--row-wide": wideRow,
});

const tickText = (line: LadderLine) => formatPoints(line.value);
const lineName = (line: LadderLine) => line.label ?? LINE_LABELS[line.kind];

const formatSignedDelta = (delta: number) => {
  const rounded = Math.round(delta);
  if (rounded > 0) return `+${rounded}`;
  if (rounded < 0) return `−${Math.abs(rounded)}`;
  return "0";
};

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
 * pause and restart lines come from a rule's rails (`buildSharedCorridorRails`)
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

/*
 * The nearest line by its number, not its name ("5 pts above 50", until
 * 2026-11-03 "5 pts above the change line"): the ladder under the caption labels
 * every tick, so the number finds the tick and the name said "line" again.
 */
export const describeLadderPosition = (value: number, lines: readonly LadderLine[]) => {
  const nearest = nearestLadderLine(value, lines);
  if (!nearest) return `${formatPoints(value)} of 100`;
  const at = formatPoints(nearest.line.value);
  if (nearest.distance === 0) return `${formatPoints(value)} of 100 · at ${at}`;
  const side = value > nearest.line.value ? "above" : "below";
  return `${formatPoints(value)} of 100 · ${formatPoints(nearest.distance)} ${nearest.distance === 1 ? "pt" : "pts"} ${side} ${at}`;
};

/**
 * Which end of the scale is worse, read off the ladder's own lines: a pause
 * line above the restart line means a rising score is the bad direction
 * (funding pressure); below it, a falling one (risk appetite). Null without
 * both lines, where the ladder cannot say (2026-10-14: the two scores point
 * opposite ways, and nothing on a ladder said which).
 */
const ladderWorseDirection = (lines: readonly LadderLine[]): "higher" | "lower" | null => {
  const pause = lines.find((line) => line.kind === "pause");
  const resume = lines.find((line) => line.kind === "resume");
  if (!pause || !resume || pause.value === resume.value) return null;
  return pause.value > resume.value ? "higher" : "lower";
};

/* Which end is worse when only one of the pair is drawn: the change line faces it, as it
   does for the shaded ranges. Only for the drawing; the "(higher is worse)" note keeps to
   ladders that state both lines. */
const ladderWorseByChangeLine = (lines: readonly LadderLine[]): "higher" | "lower" | null => {
  const change = lines.find((line) => line.kind === "callChange");
  const pause = lines.find((line) => line.kind === "pause");
  const resume = lines.find((line) => line.kind === "resume");
  if (!change) return null;
  if (pause && pause.value !== change.value) return pause.value > change.value ? "higher" : "lower";
  if (resume && resume.value !== change.value) return resume.value < change.value ? "higher" : "lower";
  return null;
};

export function ScoreLadder({
  label,
  value,
  previous = null,
  previousLabel = "Last week",
  lines,
  max = 100,
  monthRange,
  feelsLike,
  onScrubValue,
  travel = false,
  figure = false,
  className = "",
}: ScoreLadderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    didDrag: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const [scrub, setScrub] = useState<{
    value: number;
    settling: boolean;
  } | null>(null);
  const scrubRef = useRef(scrub);

  const updateScrub = (next: { value: number; settling: boolean } | null) => {
    scrubRef.current = next;
    setScrub(next);
  };

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const stopSpring = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const worse = ladderWorseDirection(lines);
  /* A score that is worse higher is drawn high to low (2026-11-03), so right is the
     easier side on every ladder, as up and right are on the conditions map. The two
     scores point opposite ways, and a reader had to check the "(higher is worse)"
     note to know which end of each track was good. */
  const reversed = (worse ?? ladderWorseByChangeLine(lines)) === "higher";
  const at = (point: number) => (reversed ? roundPercent(100 - clampPercent(point, max)) : clampPercent(point, max));

  const animateBackToRest = (startValue: number) => {
    stopSpring();
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      Math.abs(startValue - value) < 0.25
    ) {
      updateScrub(null);
      return;
    }

    let pos = startValue;
    let vel = 0;
    let lastTime = performance.now();
    const stiffness = 300;
    const damping = 28;

    const step = (now: number) => {
      const dt = Math.min(0.032, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const force = -stiffness * (pos - value) - damping * vel;
      vel += force * dt;
      pos += vel * dt;

      if (Math.abs(pos - value) < 0.3 && Math.abs(vel) < 1.5) {
        rafRef.current = null;
        updateScrub(null);
        return;
      }

      updateScrub({
        value: Math.min(max, Math.max(0, pos)),
        settling: true,
      });
      rafRef.current = requestAnimationFrame(step);
    };

    updateScrub({
      value: startValue,
      settling: true,
    });
    rafRef.current = requestAnimationFrame(step);
  };

  const readPointerScore = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return null;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return null;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const rawValue = (reversed ? 1 - ratio : ratio) * max;
    const nearest = nearestLadderLine(rawValue, lines);
    const snapped = nearest && nearest.distance <= SNAP_DETENT_POINTS ? nearest.line.value : Math.round(rawValue);
    return Math.min(max, Math.max(0, snapped));
  };

  const applyScrub = (nextValue: number) => {
    stopSpring();
    if (onScrubValue) {
      onScrubValue(nextValue);
      updateScrub({ value: nextValue, settling: false });
      return;
    }
    updateScrub({ value: nextValue, settling: false });
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    stopSpring();
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      didDrag: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    if (onScrubValue) {
      const initial = readPointerScore(event.clientX);
      if (initial !== null) {
        dragStateRef.current.didDrag = true;
        applyScrub(initial);
      }
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    if (!state.didDrag && Math.abs(event.clientX - state.startX) < DRAG_ACTIVATION_PX) return;
    state.didDrag = true;
    const next = readPointerScore(event.clientX);
    if (next !== null) applyScrub(next);
  };

  const finishPointerInteraction = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    dragStateRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (state.didDrag) {
      suppressClickRef.current = true;
      const latest = scrubRef.current;
      if (onScrubValue) {
        updateScrub(null);
      } else if (latest) {
        animateBackToRest(latest.value);
      }
    } else if (scrubRef.current) {
      animateBackToRest(scrubRef.current.value);
    }
  };

  const isScrubbing = scrub !== null;
  const scrubbedRounded = scrub ? Math.round(scrub.value) : value;
  const caption = isScrubbing
    ? `${describeLadderPosition(scrubbedRounded, lines)} (${formatSignedDelta(scrubbedRounded - value)} vs ${formatPoints(value)})`
    : describeLadderPosition(value, lines);
  /* Rows for each width the ladder is drawn at; the container query on the
     track picks one. Positions go through custom properties so one element
     serves both layouts. */
  const narrow = layoutLadderLabels(lines, max, LADDER_TRACK_WIDTHS.narrow);
  const wideRows = new Map(
    layoutLadderLabels(lines, max, LADDER_TRACK_WIDTHS.wide).map(({ line, row }) => [line, row] as const),
  );
  const laidOut = narrow.map(({ line, row }) => ({ line, row, wideRow: wideRows.get(line) ?? row }));
  const maxRow = (key: "row" | "wideRow") => Math.max(0, ...laidOut.map((entry) => entry[key]));
  /* An earlier reading at the same score draws under the dot, and its key says what the
     caption does: only a reading that differs has anything to add. */
  const hasPrevious = typeof previous === "number" && Number.isFinite(previous) && previous !== value;
  const zones = ladderZones(lines, max).map((zone) =>
    reversed ? { ...zone, left: roundPercent(100 - zone.left - zone.width) } : zone,
  );
  /* The move from the earlier reading to this one, as a segment between the
     two dots, so a week's change reads as a distance travelled. */
  const move =
    hasPrevious && previous !== value
      ? {
          left: roundPercent(Math.min(at(previous), at(value))),
          width: roundPercent(Math.abs(at(value) - at(previous))),
        }
      : null;
  const travels = travel && hasPrevious;
  /* When the travelling dot reaches a line, as a share of the travel's duration; null for
     a line the move did not pass. */
  const passedAt = (point: number): number | null => {
    if (!travels || previous === null) return null;
    const share = (point - previous) / (value - previous);
    return share > 0 && share < 1 ? travelTimeAt(share) : null;
  };
  const travelStyle: CSSProperties & { "--week-move-dx": string } = {
    "--week-move-dx": `${roundPercent(at(previous ?? value) - at(value))}%`,
  };
  const readingDot = (
    <span
      data-ladder-reading
      className="absolute top-2 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-[var(--bg-panel)] bg-slate-100"
      style={{ left: `${at(value)}%` }}
    />
  );
  const scrubMove = isScrubbing
    ? {
        left: roundPercent(Math.min(at(value), at(scrub.value))),
        width: roundPercent(Math.abs(at(scrub.value) - at(value))),
      }
    : null;
  const rangeBands = monthRange
    ? (["unusual", "common"] as const).flatMap((band) => {
        const size = monthRange[band];
        if (!(size > 0)) return [];
        const low = at(value - size);
        const high = at(value + size);
        return [{ band, left: roundPercent(Math.min(low, high)), width: roundPercent(Math.abs(high - low)) }];
      })
    : [];
  const trackStyle: TrackStyle = {
    "--ladder-rows": maxRow("row"),
    "--ladder-rows-wide": maxRow("wideRow"),
    /* A vertical swipe that starts on the track still scrolls the page (2026-11-10):
       `none` swallowed it, and the phone brief carries a ladder on its first screen. */
    touchAction: "pan-y",
    userSelect: "none",
    cursor: isScrubbing ? "grabbing" : "ew-resize",
  };
  return (
    <figure
      className={`@container space-y-1.5 ${className}`.trim()}
      data-score-ladder
      data-scrubbing={isScrubbing ? "" : undefined}
    >
      <figcaption
        className={
          figure
            ? "grid grid-cols-[auto_minmax(0,1fr)] items-end gap-x-3 gap-y-0.5 text-xs [&>span:not([data-ladder-figure])]:col-start-2"
            : "flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs"
        }
      >
        {figure ? (
          <span
            data-ladder-figure
            aria-hidden="true"
            className="type-figure row-span-2 text-[3rem] text-slate-50 @[22rem]:text-[5.75rem]"
          >
            {formatPoints(scrubbedRounded)}
          </span>
        ) : null}
        <span className="font-medium text-slate-200">
          {label}
          {worse ? (
            <span className="ml-1.5 font-normal text-slate-400" data-ladder-direction={worse}>
              {worse === "higher" ? "(higher is worse)" : "(higher is better)"}
            </span>
          ) : null}
        </span>
        <span className={`tabular-nums ${isScrubbing ? "text-slate-100" : "text-slate-400"}`} data-ladder-caption>
          {caption}
        </span>
      </figcaption>
      <div
        ref={trackRef}
        className="relative h-[calc(38px+var(--ladder-rows)*13px)] @[28rem]:h-[calc(38px+var(--ladder-rows-wide)*13px)]"
        style={trackStyle}
        aria-hidden="true"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerInteraction}
        onPointerCancel={finishPointerInteraction}
        onClick={(event) => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        <div className="absolute inset-x-0 top-3 h-1.5 overflow-hidden rounded-full bg-[color:var(--bg-raised)]">
          {zones.map((zone) => (
            <span
              key={zone.kind}
              data-ladder-zone={zone.kind}
              className={`absolute inset-y-0 ${ZONE_CLASS[zone.kind]}`}
              style={{ left: `${zone.left}%`, width: `${zone.width}%` }}
            />
          ))}
        </div>
        {rangeBands.map((range) => (
          <span
            key={range.band}
            data-ladder-month-range={range.band}
            className={`absolute top-[9px] h-3 rounded-full ${range.band === "common" ? "bg-slate-300/45" : "bg-slate-300/20"}`}
            style={{ left: `${range.left}%`, width: `${range.width}%` }}
          />
        ))}
        {/* Ticks first, then every label as a second layer. Each line used to
            be one translated wrapper holding its tick and its label; a
            transform makes a stacking context, so a later line's tick painted
            over an earlier line's label whatever the label's z-index, and on a
            phone it ran through the text. */}
        {laidOut.map(({ line, row, wideRow }) => (
          <span
            key={`tick-${line.kind}-${line.value}`}
            data-ladder-tick
            className={`absolute top-1.5 h-[calc(18px+var(--row)*13px)] w-0.5 -translate-x-1/2 @[28rem]:h-[calc(18px+var(--row-wide)*13px)] ${LINE_CLASS[line.kind].split(" ")[0]} ${passedAt(line.value) === null ? "" : "week-move-tick"}`}
            style={{
              ...markStyle(at(line.value), row, wideRow),
              ...(passedAt(line.value) === null ? {} : { "--week-move-at": passedAt(line.value) }),
            }}
          />
        ))}
        {laidOut.map(({ line, row, wideRow }) => (
          <span
            key={`label-${line.kind}-${line.value}`}
            data-ladder-row={row}
            data-ladder-row-wide={wideRow}
            className={`absolute top-[calc(26px+var(--row)*13px)] -translate-x-1/2 whitespace-nowrap rounded-[2px] bg-[var(--bg-body)] px-0.5 text-[12px] leading-none tabular-nums @[28rem]:top-[calc(26px+var(--row-wide)*13px)] ${LINE_CLASS[line.kind].split(" ")[1]}`}
            style={markStyle(at(line.value), row, wideRow)}
          >
            {tickText(line)}
          </span>
        ))}
        {move ? (
          <span
            data-ladder-move
            className={`absolute top-[14px] h-0.5 bg-slate-300 ${travels ? "week-move-bar" : ""}`}
            style={{
              left: `${move.left}%`,
              width: `${move.width}%`,
              /* Grows from the earlier reading's end. */
              ...(travels && previous !== null ? { transformOrigin: at(previous) < at(value) ? "left" : "right" } : {}),
            }}
          />
        ) : null}
        {hasPrevious ? (
          <span
            className="absolute top-2.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-slate-300 bg-[var(--bg-body)]"
            style={{ left: `${at(previous)}%` }}
            title={`${previousLabel}: ${formatPoints(previous)}`}
          />
        ) : null}
        {feelsLike ? (
          <ConditionIcon
            regime={feelsLike.regime}
            className="absolute top-[7px] -translate-x-1/2"
            style={{ left: `${at(feelsLike.value)}%` }}
            data-ladder-feels-like
          />
        ) : null}
        {travels && previous !== null ? (
          /* A rail as wide as the track, so the travel is a transform in the track's own
             percentages and no layout property animates (ui-ux-standards §IX). */
          <span
            className="week-move-dot pointer-events-none absolute inset-x-0 top-0 h-0"
            style={travelStyle}
          >
            {readingDot}
          </span>
        ) : (
          readingDot
        )}
        {isScrubbing && scrubMove ? (
          <>
            <span
              data-ladder-scrub-move
              className="absolute top-[13px] h-1 rounded-full bg-[color:var(--app-text)] opacity-75"
              style={{ left: `${scrubMove.left}%`, width: `${scrubMove.width}%` }}
            />
            <span
              data-ladder-scrub-thumb
              className="absolute top-1.5 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-[color:var(--app-text)] bg-[color:var(--bg-body)]"
              style={{ left: `${at(scrub.value)}%` }}
            />
          </>
        ) : null}
      </div>
      {/* The lines' key, left to right in the order the ticks sit, so a line
          can be matched by position as well as by colour. The pause and resume
          lines carry the pause and play glyphs the state badge uses, so the two
          differ in shape as well as ink; the change line keeps its plain tick. */}
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] leading-none text-slate-400" data-ladder-key>
        {(reversed ? [...narrow].reverse() : narrow).map(({ line }) => (
          <span key={`key-${line.kind}-${line.value}`} className="inline-flex items-center gap-1">
            {line.kind === "callChange" ? (
              <span aria-hidden="true" className={`inline-block h-2 w-0.5 ${LINE_CLASS[line.kind].split(" ")[0]}`} />
            ) : (
              <LineStateIcon state={line.kind === "pause" ? "crossed" : "clear"} />
            )}
            <span className={LINE_CLASS[line.kind].split(" ")[1]}>{lineName(line)}</span>{" "}
            <span className="tabular-nums">{formatPoints(line.value)}</span>
          </span>
        ))}
      </p>
      {/* The hollow dot's key. It was a tooltip inside an aria-hidden track, so
          a sighted reader had nothing saying which dot was which. */}
      {rangeBands.length > 0 || feelsLike ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] leading-none text-slate-400" data-ladder-range-key>
          {rangeBands.map((range) => (
            <span key={range.band} className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className={`inline-block h-2 w-3 rounded-full ${range.band === "common" ? "bg-slate-300/45" : "bg-slate-300/20"}`} />
              {range.band === "common" ? "Common move" : "Unusual move"}
            </span>
          ))}
          {feelsLike ? (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <ConditionIcon regime={feelsLike.regime} />
              {`Feels like ${formatPoints(feelsLike.value)}`}
            </span>
          ) : null}
        </p>
      ) : null}
      {hasPrevious ? (
        <p className="flex items-center gap-1.5 text-[12px] leading-none text-slate-400">
          <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full border-2 border-slate-300" />
          {`${previousLabel}: ${formatPoints(previous)}`}
        </p>
      ) : null}
    </figure>
  );
}

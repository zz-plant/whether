"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { InputTrail } from "../../../lib/report/home/inputTrail";
import { Sparkline } from "./sparkline";

/**
 * A market input's trailing daily readings, under the figure the row prints
 * (`buildInputTrails`, 2026-11-18): the line, the line it is judged against, the
 * earlier reading as a hollow tick, and the range stated under it.
 *
 * A readout, the record band's pattern (ui-ux-standards §XXX): pointing at the line,
 * or focusing it and pressing the arrow keys, puts that day's date and reading in the
 * caption, where the range was; Home and End go to the ends; Escape, leaving or
 * blurring restores it. The drawing and its caption are server-rendered, so the
 * trail reads the same with no script; the readout is the only thing this adds.
 */
export function InputTrailChart({ trail, label }: { trail: InputTrail; label: string }) {
  const [active, setActive] = useState<number | null>(null);
  const frameRef = useRef<HTMLLabelElement | null>(null);
  const last = trail.points.length - 1;
  const point = active === null ? null : trail.points[active];
  /* `buildInputTrail` returns no trail under three readings, so the last point exists;
     the fallback only keeps the type honest. */
  const shown = point ?? trail.points[last] ?? { label: "", valueLabel: "" };

  /* Hover reads the day under the pointer; a range input does not follow a pointer
     that is not pressing it. */
  const onPointerMove = (event: ReactPointerEvent<HTMLLabelElement>) => {
    if (event.pointerType !== "mouse") return;
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    setActive(Math.round(ratio * last));
  };

  return (
    <figure className="min-w-0 text-sm" data-input-trail={trail.key}>
      {/* A native range over the drawing: the arrow keys, Home and End, a press and a
          drag come with it, and the focus ring is drawn on the frame — a label, so the
          frame is part of the control (§XXVII), and a press anywhere on it is the range's. */}
      <label
        ref={frameRef}
        className="relative inline-flex min-h-11 items-center py-2 text-slate-400 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color:var(--accent-action)]"
        onPointerMove={onPointerMove}
        onPointerLeave={() => setActive(null)}
      >
        <Sparkline
          points={trail.points}
          label={label}
          domain={trail.domain}
          reference={trail.line}
          mark={trail.comparison ?? undefined}
          activeIndex={active}
          widthEm={11}
          decorative
        />
        <input
          type="range"
          min={0}
          max={last}
          step={1}
          value={active ?? last}
          aria-label={`${label}, daily readings`}
          aria-valuetext={`${shown.label}: ${shown.valueLabel}`}
          aria-describedby={`input-trail-${trail.key}-summary`}
          className="absolute inset-0 h-full w-full cursor-crosshair opacity-0"
          style={{ touchAction: "pan-y" }}
          onChange={(event) => setActive(Number(event.currentTarget.value))}
          onFocus={() => setActive((current) => current ?? last)}
          onBlur={() => setActive(null)}
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === "Escape") setActive(null);
          }}
        />
      </label>
      {/* One line, swapped in place, so the readout moves nothing (CLS 0). */}
      <figcaption className="text-fluid-nano tabular-nums text-slate-400" aria-hidden="true" data-input-trail-caption>
        {point ? (
          <span className="text-slate-200">{`${point.label}: ${point.valueLabel}`}</span>
        ) : (
          trail.caption
        )}
      </figcaption>
      {/* The line's key: its dash where it is drawn, an arrow to the edge it lies past. */}
      <p className={`flex items-center gap-1.5 text-fluid-nano ${trail.line.crossed ? "text-line-crossed-fg" : "text-slate-400"}`} aria-hidden="true">
        {trail.line.offScale ? (
          <span className="inline-block w-3 text-center leading-none">{trail.line.offScale === "below" ? "↓" : "↑"}</span>
        ) : (
          <span className="inline-block w-3 border-t border-dashed border-current" />
        )}
        <span>{trail.lineCaption}</span>
      </p>
      <p id={`input-trail-${trail.key}-summary`} className="sr-only">
        {trail.summary}
      </p>
    </figure>
  );
}

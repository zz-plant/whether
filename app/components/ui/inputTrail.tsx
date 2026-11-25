"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { InputTrail, InputTrailKey, InputTrailSpan, InputTrailView } from "../../../lib/report/home/inputTrail";
import { ViewChoices, useHomeView } from "../home/homeView";
import { Sparkline } from "./sparkline";

/* "Since 2012" carries its year as a date; "Last 3 months" names no date to carry. One
   span, so a pill's flex box does not drop the space before the year. */
const SpanLabel = ({ label }: { label: string }) => {
  const year = /^Since (\d{4})$/.exec(label)?.[1];
  return year ? <span>Since <time dateTime={year}>{year}</time></span> : <span>{label}</span>;
};

/** The default reach carries no key, so its view is null. */
const viewValue = (span: InputTrailSpan) => (span === "daily" ? null : span);

/**
 * A market input's trailing readings, under the figure the row prints
 * (`buildInputTrails`, 2026-11-18): the line, the line it is judged against, the
 * earlier reading as a hollow tick, and the range stated under it.
 *
 * A readout, the record band's pattern (ui-ux-standards §XXX): pointing at the line,
 * or focusing it and pressing the arrow keys, puts that day's date and reading in the
 * caption, where the range was; Home and End go to the ends; Escape, leaving or
 * blurring restores it. The drawing and its caption are server-rendered, so the
 * trail reads the same with no script; the readout is the only thing this adds.
 *
 * Over the drawing, how far back it reaches (2026-11-18): "Last 3 months · Since 2012",
 * two links to the two views of the page (`?trail=`), the one shown marked current. Links
 * and not a switch: the homepage counts no field for them, each works before the script
 * loads, and a copied link opens on the reach the sender saw. Once the page is live a
 * click shows the other reach in place, in both trails at once (`useHomeView`). Where
 * only one reach can be drawn its name stays, as plain text: it states the drawing's days.
 */
export function InputTrailChart({
  trail,
  label,
  param,
  spanHrefs,
}: {
  trail: InputTrail;
  label: string;
  /** The page's query key for the reach (`?trail=`); without it the trail shows the reach it was built for. */
  param?: string;
  /** Where each reach's link goes; the page's query with `?trail=` set. */
  spanHrefs?: Partial<Record<InputTrailSpan, string>>;
}) {
  const asked = useHomeView(param ?? "", viewValue(trail.span));
  const wanted: InputTrailSpan = param ? (asked === "since-2012" ? "since-2012" : "daily") : trail.span;
  const view: InputTrailView = wanted === trail.span ? trail : trail.other ?? trail;
  const choices = trail.spans.length > 1 && param && spanHrefs ? trail.spans : null;
  return (
    <figure className="min-w-0 text-sm" data-input-trail={trail.key} data-input-trail-span={view.span}>
      {choices && param ? (
        <ViewChoices
          param={param}
          current={viewValue(view.span)}
          label={`${label}: how far back`}
          className="pb-1"
          choices={choices.map((choice) => ({
            value: viewValue(choice.span),
            href: spanHrefs?.[choice.span] ?? "#",
            label: <SpanLabel label={choice.label} />,
            name: `${label}, ${choice.label.toLowerCase()}`,
          }))}
        />
      ) : (
        <p className="text-fluid-nano text-slate-400" data-input-trail-spans>
          <SpanLabel label={trail.spans.find((choice) => choice.span === view.span)?.label ?? ""} />
        </p>
      )}
      {/* Keyed by the reach, so a readout left on one does not carry onto the other. */}
      <TrailDrawing key={view.span} view={view} trailKey={trail.key} label={label} />
    </figure>
  );
}

function TrailDrawing({ view, trailKey, label }: { view: InputTrailView; trailKey: InputTrailKey; label: string }) {
  const [active, setActive] = useState<number | null>(null);
  const frameRef = useRef<HTMLLabelElement | null>(null);
  const last = view.points.length - 1;
  const point = active === null ? null : view.points[active];
  /* `buildInputTrail` returns no trail under three readings, so the last point exists;
     the fallback only keeps the type honest. */
  const shown = point ?? view.points[last] ?? { label: "", valueLabel: "" };

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
    <>
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
          points={view.points}
          label={label}
          domain={view.domain}
          reference={view.line}
          mark={view.comparison ?? undefined}
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
          aria-label={`${label}, ${view.pointsLabel}`}
          aria-valuetext={`${shown.label}: ${shown.valueLabel}`}
          aria-describedby={`input-trail-${trailKey}-summary`}
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
          <span className="text-slate-200">
            <time dateTime={point.dateTime}>{point.label}</time>
            {`: ${point.valueLabel}`}
          </span>
        ) : (
          view.caption
        )}
      </figcaption>
      {/* The line's key: its dash where it is drawn, an arrow to the edge it lies past. */}
      <p className={`flex items-center gap-1.5 text-fluid-nano ${view.line.crossed ? "text-line-crossed-fg" : "text-slate-400"}`} aria-hidden="true">
        {view.line.offScale ? (
          <span className="inline-block w-3 text-center leading-none">{view.line.offScale === "below" ? "↓" : "↑"}</span>
        ) : (
          <span className="inline-block w-3 border-t border-dashed border-current" />
        )}
        <span>{view.lineCaption}</span>
      </p>
      <p id={`input-trail-${trailKey}-summary`} className="sr-only">
        {view.summary}
      </p>
    </>
  );
}

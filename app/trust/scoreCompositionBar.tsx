"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { RATE_PARAM, describeFedSteps, describeRateDialAnswer, formatShortRate } from "../../lib/report/fedSteps";
import type { RateDial } from "../../lib/report/rateScenario";
import type { CompositionPart, CompositionSource } from "../../lib/report/scoreComposition";

/**
 * One score drawn as the points its inputs gave it, on its 0–100 scale.
 *
 * The parts come laid out from `buildScoreComposition` (`from`, `to`), the
 * object the sentence above the bar prints, so the drawing cannot disagree
 * with the arithmetic beside it. Counted parts run end to end in the ink; a
 * part that took points away is hatched over the run it removed; the inputs
 * the published score leaves out sit dashed on their own row under it.
 *
 * Picking a part reads it out under the bar: its reading, how the score weighs
 * it, its points and where to read it at the source. The parts are a native
 * radio group (`SegmentedControl`'s reasoning): one tab stop, arrows move,
 * hover and focus pick the same part, and a tap picks it on a touch screen.
 * The pick stays when the pointer leaves, so the source link under it can be
 * reached. It opens on the biggest counted input.
 *
 * Funding pressure's bar also takes the short rate (2026-11-18): a native range in
 * hundredths of a point (`buildRateDial`, which re-scored every stop through the engine).
 * Moved off this week's rate, the parts redraw at that rate, this week's total stays
 * marked on the scale, and one sentence under the control says which areas would pause
 * or restart, the rate in Fed steps from this week, and funding pressure there. The
 * sentence above the bar is this week's and does not change. The rate is the URL's
 * (`?rate=3.85`, replaced rather than pushed), so a link opens on the same bar.
 */

type ScoreCompositionBarProps = {
  /** "Funding pressure", for the group's name. */
  label: string;
  /** This week's score, which the scale marks once the rate is moved. */
  published?: number;
  parts: readonly CompositionPart[];
  notCounted: CompositionPart | null;
  largest: CompositionSource | null;
  /** The score at other short rates, and the rate the URL names; funding pressure's bar only. */
  rateDial?: (RateDial & { initialRate?: number }) | null;
};

const roundRate = (value: number) => Math.round(value * 100) / 100;
const clampRate = (dial: RateDial, value: number) => roundRate(Math.min(dial.max, Math.max(dial.min, value)));
/* Within half a hundredth, a rate is this week's. */
const isThisWeek = (dial: RateDial, rate: number) => Math.abs(rate - dial.rate) < 0.005;

/* Keeps the rate in the URL without a history entry per step, and drops the key at this week's rate. */
const writeRate = (dial: RateDial, rate: number) => {
  const url = new URL(window.location.href);
  if (isThisWeek(dial, rate)) url.searchParams.delete(RATE_PARAM);
  else url.searchParams.set(RATE_PARAM, rate.toFixed(2));
  window.history.replaceState(window.history.state, "", url);
};

/* Each hit area is at least 44px wide, centred on its part, and the narrower
   parts sit on top, so a sliver of a few points can still be hovered. */
const hitStyle = (part: CompositionPart, layer: number): CSSProperties => {
  const width = part.to - part.from;
  const centre = part.from + width / 2;
  return {
    left: `clamp(0px, calc(${centre}% - max(${width / 2}%, 22px)), calc(100% - max(${width}%, 44px)))`,
    width: `max(${width}%, 44px)`,
    zIndex: layer,
  };
};

const formatPoints = (points: number) => (points > 0 ? `+${points}` : points < 0 ? `−${Math.abs(points)}` : "0");

/* Ink only: a part of a score is not a condition or a line state (ui-ux-standards §XVI). */
const FILL = ["color-mix(in srgb, var(--app-text) 82%, var(--bg-body))", "color-mix(in srgb, var(--app-text) 52%, var(--bg-body))"];
const HATCH =
  "repeating-linear-gradient(135deg, var(--app-text-muted) 0 1.5px, transparent 1.5px 5px)";

/* A part's name fits inside it from about a third of the scale (110px of a 340px phone bar). */
const LABEL_MIN_POINTS = 30;

export function ScoreCompositionBar({
  label,
  published,
  parts: publishedParts,
  notCounted: publishedNotCounted,
  largest,
  rateDial = null,
}: ScoreCompositionBarProps) {
  const name = useId();
  const rateId = useId();
  const [rate, setRate] = useState(() => (rateDial ? clampRate(rateDial, rateDial.initialRate ?? rateDial.rate) : 0));
  const moved = Boolean(rateDial && !isThisWeek(rateDial, rate));
  const stop = rateDial?.stops.find((candidate) => rate >= candidate.from - 0.001 && rate <= candidate.to + 0.001) ?? null;
  /* The URL follows the control a moment after it settles, never on the first paint. */
  const firstPaint = useRef(true);
  useEffect(() => {
    if (!rateDial) return;
    if (firstPaint.current) {
      firstPaint.current = false;
      return;
    }
    const timer = window.setTimeout(() => writeRate(rateDial, rate), 250);
    return () => window.clearTimeout(timer);
  }, [rateDial, rate]);
  /* At a moved rate each part takes its points there, and the rate part reads that rate. */
  const parts: readonly CompositionPart[] =
    moved && stop && rateDial
      ? publishedParts.map((part) => {
          /* A part the stop leaves out gave nothing at that rate. */
          const at = stop.parts.find((candidate) => candidate.source === part.source) ?? { points: 0, from: 0, to: 0 };
          return {
            ...part,
            ...at,
            reading: part.source === "rateLevel" ? `${rateDial.readingLabel} ${formatShortRate(rate)}` : part.reading,
          };
        })
      : publishedParts;
  /* What the inputs left out would add is this week's, so it shows at this week's rate only. */
  const notCounted = moved ? null : publishedNotCounted;
  const drawnCounted = parts.filter((part) => part.points !== 0);
  const drawn = notCounted ? [...drawnCounted, notCounted] : drawnCounted;
  const [selected, setSelected] = useState<CompositionSource | null>(largest ?? drawn[0]?.source ?? null);
  const active = [...parts, ...(notCounted ? [notCounted] : [])].find((part) => part.source === selected) ?? null;
  if (drawn.length === 0 && !rateDial) return null;

  /* Additions first and subtractions over them: a subtraction is drawn on the run it took back. */
  const layered = [...drawnCounted].sort((left, right) => Number(left.points < 0) - Number(right.points < 0));
  const byWidth = [...drawn].sort((left, right) => right.to - right.from - (left.to - left.from));
  const layerOf = (part: CompositionPart) => byWidth.indexOf(part) + 1;
  let additions = 0;

  const option = (part: CompositionPart) => (
    <label
      key={part.source}
      className="group absolute inset-y-0 cursor-pointer rounded-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-[color:var(--accent-action)]"
      style={hitStyle(part, layerOf(part))}
      onPointerEnter={() => setSelected(part.source)}
    >
      <input
        type="radio"
        name={name}
        value={part.source}
        checked={selected === part.source}
        onChange={() => setSelected(part.source)}
        className="absolute inset-0 m-0 cursor-pointer appearance-none opacity-0"
        aria-label={`${part.name}, ${formatPoints(part.points)} points${part.counted ? "" : ", not counted"}`}
        style={{ touchAction: "manipulation" }}
      />
    </label>
  );

  return (
    <div className="space-y-1.5">
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="sr-only">{`Inputs to ${label.toLowerCase()}, on its 0 to 100 scale`}</legend>
        <div className="relative h-11" aria-hidden="true">
          {/* The scale itself, so the bar reads against 0–100 and not against its own length. */}
          <div className="absolute inset-x-0 top-3.5 h-4 bg-[color:var(--border-subtle)]" />
          {layered.map((part) => {
            const isSubtraction = part.points < 0;
            const fill = isSubtraction ? undefined : FILL[additions++ % FILL.length];
            const isActive = part.source === selected;
            return (
              <div
                key={part.source}
                data-composition-part={part.source}
                className={`absolute top-3.5 flex h-4 items-center overflow-hidden ${
                  isSubtraction ? "border border-[color:var(--app-text-muted)] bg-[color:var(--bg-body)]" : ""
                } ${isActive ? "outline-[1.5px] outline-offset-2 outline-[color:var(--app-text)]" : ""}`}
                style={{
                  left: `${part.from}%`,
                  width: `${part.to - part.from}%`,
                  backgroundColor: fill,
                  backgroundImage: isSubtraction ? HATCH : undefined,
                }}
              >
                {!isSubtraction && part.points >= LABEL_MIN_POINTS ? (
                  <span className="truncate px-1.5 text-fluid-nano font-semibold leading-none text-[color:var(--bg-body)]">
                    {part.name}
                  </span>
                ) : null}
              </div>
            );
          })}
          {/* This week's total, kept on the scale while the bar draws another rate. */}
          {moved && typeof published === "number" ? (
            <>
              <div data-this-week-mark="" className="absolute top-1 h-[1.875rem] w-px bg-[color:var(--app-text)]" style={{ left: `${published}%` }} />
              <span
                className="absolute -top-1 whitespace-nowrap text-fluid-nano text-slate-300"
                style={published >= 50 ? { right: `calc(${100 - published}% + 0.25rem)` } : { left: `calc(${published}% + 0.25rem)` }}
              >
                This week {published}
              </span>
            </>
          ) : null}
        </div>
        {/* The options over the drawing, one per drawn part. */}
        <div className="relative -mt-11 h-11">{drawnCounted.map(option)}</div>
        {notCounted ? (
          <>
            <div className="relative h-11" aria-hidden="true">
              <div
                data-composition-part={notCounted.source}
                className={`absolute top-1 h-3 border-[1.5px] border-dashed border-[color:var(--app-text-muted)] ${
                  notCounted.source === selected ? "outline-[1.5px] outline-offset-2 outline-[color:var(--app-text)]" : ""
                }`}
                style={{ left: `${notCounted.from}%`, width: `${notCounted.to - notCounted.from}%` }}
              />
              {/* Named where it is drawn, on the side with room. */}
              <span
                className="absolute top-0.5 whitespace-nowrap text-fluid-nano text-slate-400"
                style={
                  notCounted.from >= 30
                    ? { right: `calc(${100 - notCounted.from}% + 0.5rem)` }
                    : { left: `calc(${notCounted.to}% + 0.5rem)` }
                }
              >
                Not counted
              </span>
            </div>
            <div className="relative -mt-11 h-11">{option(notCounted)}</div>
          </>
        ) : null}
      </fieldset>
      <div aria-hidden="true" className="relative h-4 text-fluid-nano tabular-nums text-slate-400">
        {[0, 25, 50, 75, 100].map((tick) => (
          <span
            key={tick}
            className="absolute"
            style={tick === 0 ? { left: 0 } : tick === 100 ? { right: 0 } : { left: `${tick}%`, transform: "translateX(-50%)" }}
          >
            {tick}
          </span>
        ))}
      </div>
      {rateDial ? (
        <div className="space-y-1 pt-2" data-rate-dial="">
          <label htmlFor={rateId} className="block text-sm font-semibold text-slate-100">
            {`What if ${rateDial.rateName} moves?`}
          </label>
          <div className="flex items-center gap-3 text-fluid-nano tabular-nums text-slate-400">
            <span aria-hidden="true">{formatShortRate(rateDial.min)}</span>
            <input
              id={rateId}
              type="range"
              min={rateDial.min}
              max={rateDial.max}
              step="0.01"
              value={rate}
              onChange={(event) => setRate(clampRate(rateDial, Number(event.target.value)))}
              aria-valuetext={
                moved
                  ? `${formatShortRate(rate)}, ${describeFedSteps(rate - rateDial.rate).phrase} ${rate < rateDial.rate ? "below" : "above"} this week`
                  : `${formatShortRate(rate)}, this week's rate`
              }
              className="h-11 min-w-0 flex-1 cursor-pointer accent-[color:var(--accent-action)]"
              style={{ touchAction: "manipulation" }}
            />
            <span aria-hidden="true">{formatShortRate(rateDial.max)}</span>
          </div>
          <output htmlFor={rateId} aria-live="polite" className="block text-sm text-slate-200" data-rate-answer="">
            {stop
              ? describeRateDialAnswer({ rate, thisWeek: rateDial.rate, rateName: rateDial.rateName, tightness: stop.tightness, lead: stop.lead })
              : null}
          </output>
        </div>
      ) : null}
      <div aria-live="polite" className="min-h-[5.25rem] pt-1 text-sm" data-composition-readout>
        {active ? (
          <>
            <p className="font-semibold text-slate-100">
              {active.name}
              {active.counted ? null : <span className="font-normal text-slate-400"> · not counted</span>}
              {active.source === largest ? <span className="font-normal text-slate-400"> · the biggest single input</span> : null}
            </p>
            <p className="text-slate-300">
              {active.reading}. {active.weight}.
            </p>
            <p className="flex flex-wrap items-baseline gap-x-3 text-slate-300">
              <span className="font-semibold tabular-nums text-slate-100">{formatPoints(active.points)} points</span>
              {active.sources.map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="weather-hit font-semibold text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100"
                >
                  {source.label} →
                </a>
              ))}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}

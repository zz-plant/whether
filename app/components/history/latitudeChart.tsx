import type { LatitudeChart as LatitudeChartModel } from "../../../lib/report/latitudeChart";
import { OPERATING_LATITUDE_LABEL } from "../../../lib/report/reportCopy";
import { buildSparklinePath } from "../ui/sparkline";
import { ScreenshotCaption } from "../screenshotCaption";
import { LatitudeChartReadout } from "./latitudeChartReadout";

/* The drawing's own units. The SVG stretches to its box (`preserveAspectRatio="none"`)
   and carries no text, so nothing in it is drawn at the wrong size at any width; the
   labels are HTML beside it (§XVII). */
const W = 1000;
const H = 200;
const PAD_Y = 8;

const yAt = (value: number) => H - PAD_Y - (value / 100) * (H - 2 * PAD_Y);
/** A value's height as a share of the plot, for the HTML labels and the readout's dot. */
const topShare = (value: number) => (yAt(value) / H) * 100;

/**
 * Room to move at every month-end (2026-11-18), above the table that lists it.
 *
 * One line on the score's own 0–100 scale, with the value the paragraph above names
 * drawn across it (dashed), and each month's conditions as a strip beneath in its
 * fill and pattern (§XXX), so a reader sees the line through Sunny stay above it and
 * the line through Freezing stay below. Its points are the table's rows
 * (`buildLatitudeChart` reads `TrackRecord.allRows`) and its line is the paragraph's
 * (`latitudeConditionLine`), so the three cannot disagree.
 *
 * The record band at the top of the page draws the two scores this blends; it does
 * not draw this one, and the fold below ("Explore past months and score trends")
 * draws those two over thirteen months, so this is the only drawing of the series.
 *
 * Once the page is live the plot is a slider (`LatitudeChartReadout`): pointing or
 * the arrow keys read a month out above the chart, and a click or Enter opens the
 * brief as it read that month. Each month is also a plain link in the drawing, so
 * with scripts off a click still opens it.
 */
export function LatitudeChart({ chart }: { chart: LatitudeChartModel }) {
  const n = chart.points.length;
  const latest = chart.points.at(-1);
  if (n < 2 || !latest) return null;
  const slot = W / n;
  /* The sparkline's projection, so the line and every other score drawing share one
     piece of geometry; shifted half a month so each point sits over its own month. */
  const path = buildSparklinePath(
    chart.points.map((point) => point.value),
    [0, 100],
    W - slot,
    H,
    PAD_Y,
  );
  const lastYear = chart.years.at(-1)?.year;

  return (
    <figure className="@container m-0 space-y-2" data-latitude-chart>
      <p data-latitude-readout aria-hidden="true" className="min-h-[1.5rem] text-fluid-sm leading-snug tabular-nums text-slate-300">
        <span data-readout-rest>Latest: {latest.readout}</span>
        <span data-readout-live hidden className="text-slate-100" />
      </p>
      <div className="pl-8">
        <div className="relative h-36 @[40rem]:h-44">
          {/* The scale's ends and the paragraph's line, beside the plot and on its height. */}
          <div aria-hidden="true" className="absolute inset-y-0 right-full mr-1.5 w-7 text-right text-fluid-nano tabular-nums leading-none text-slate-400">
            {[100, chart.line, 0].map((value) => (
              <span key={value} className="absolute right-0 -translate-y-1/2" style={{ top: `${topShare(value)}%` }}>
                {value}
              </span>
            ))}
          </div>
          {/* A picture until the readout makes it a slider; its words are the caption's. */}
          <div
            data-latitude-plot
            data-slider-label={`${OPERATING_LATITUDE_LABEL} by month`}
            className="absolute inset-0 cursor-crosshair touch-pan-y outline-offset-2 focus-visible:outline-2 focus-visible:outline-[color:var(--accent-action)]"
          >
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 block h-full w-full overflow-visible text-[color:var(--app-text)]">
              <line x1="0" x2={W} y1={yAt(100)} y2={yAt(100)} stroke="currentColor" strokeOpacity="0.14" vectorEffect="non-scaling-stroke" />
              <line x1="0" x2={W} y1={yAt(0)} y2={yAt(0)} stroke="currentColor" strokeOpacity="0.3" vectorEffect="non-scaling-stroke" />
              <line x1="0" x2={W} y1={yAt(chart.line)} y2={yAt(chart.line)} stroke="currentColor" strokeOpacity="0.6" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" data-latitude-line={chart.line} />
              <path
                d={path}
                transform={`translate(${slot / 2} 0)`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              {/* One column a month, each a link to that month: the drawing's marks are real links. */}
              <g data-latitude-months>
                {chart.points.map((point, index) => (
                  <a
                    key={point.recordDate}
                    href={point.href}
                    tabIndex={-1}
                    aria-label={point.readout}
                    data-index={index}
                    data-month={point.recordDate.slice(0, 7)}
                    data-top={topShare(point.value).toFixed(2)}
                    data-readout-text={point.readout}
                  >
                    <rect x={index * slot} y="0" width={slot} height={H} fill="transparent" />
                  </a>
                ))}
              </g>
            </svg>
            <span data-latitude-cursor hidden className="pointer-events-none absolute inset-y-0 w-px -translate-x-1/2 bg-[color:var(--app-text)] opacity-60" />
            <span data-latitude-dot hidden className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--app-text)] ring-2 ring-[color:var(--bg-body)]" />
          </div>
        </div>
        {/* Each month's conditions, a run at a time, in the cell fill and pattern the page's
            other condition cells use. A row of runs rather than placed boxes: the cell
            class positions itself (record-band.css), and the runs are contiguous anyway. */}
        <div aria-hidden="true" className="mt-1.5 flex h-3" data-latitude-conditions>
          {chart.runs.map((run) => (
            <span
              key={run.start}
              data-regime={run.regime}
              className="record-week-cell block h-full shrink-0 after:hidden"
              style={{ width: `${(run.length / n) * 100}%` }}
            />
          ))}
        </div>
        <div aria-hidden="true" className="relative mt-1 h-4 text-fluid-nano leading-none tabular-nums text-slate-400">
          {chart.years.map(({ year, index }) => {
            /* Every year from 40rem, every other one under it; the newest sits flush right so
               its label never runs past the plot. */
            const odd = (lastYear ?? year) % 2 !== year % 2;
            if (year === lastYear) {
              return (
                <span key={year} className="absolute top-0 right-0">
                  {year}
                </span>
              );
            }
            return (
              <span
                key={year}
                className={`absolute top-0 border-l border-current pl-1 ${odd ? "hidden @[40rem]:inline" : ""}`}
                style={{ left: `${(index / n) * 100}%` }}
              >
                {year}
              </span>
            );
          })}
        </div>
      </div>
      <figcaption className="max-w-prose text-fluid-nano leading-relaxed text-slate-400">
        {OPERATING_LATITUDE_LABEL} at each month-end, {chart.rangeLabel}, on its 0–100 scale. The dashed line is{" "}
        {chart.line}; the strip under the chart is each month&rsquo;s conditions.
        {/* The readout line above is hidden from assistive tech; its resting words are here. */}
        <span className="sr-only"> Latest: {latest.readout}.</span>
      </figcaption>
      {/* A chart a reader crops ends in its source (§XXVIII); its period is the caption's. */}
      <ScreenshotCaption />
      <LatitudeChartReadout />
    </figure>
  );
}

import Link from "next/link";
import { RECORD_BAND_HEIGHT, buildRecordBand } from "../../lib/report/recordBand";
import { isLightField } from "../../lib/report/recordBandCodec";
import { REGIME_LABELS } from "../../lib/regimePresentation";
import type { RegimeKey } from "../../lib/types";
import { ConditionIcon } from "./ui/conceptIcons";
import { getPublishedBriefs } from "../../lib/report/publishedBriefs";
import { getTimeMachineRegimeSeries } from "../../lib/timeMachine/timeMachineCache";
import { RecordBandReadout } from "./recordBandReadout";

const CONDITIONS: readonly RegimeKey[] = ["EXPANSION", "DEFENSIVE", "VOLATILE", "SCARCITY"];

const monthLabel = (recordDate: string) =>
  new Date(`${recordDate}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

/**
 * The record band, under the navigation of every route (docs/design/rebuild-covenant.md).
 * Since 2026-11-12 it is the Forecast's weather strip (.impeccable/surfaces/app-page-tsx.md):
 * each stretch is drawn as a small sky, lighter at the top, and moving along it reads
 * the month out as a card with its condition and its two scores as large numerals,
 * while the homepage's sky takes that month's weather.
 *
 * It is the page's one field of colour and its only ornament, and every mark in it is
 * a reading: a field per stretch of conditions, risk appetite above and funding
 * pressure below as fine lines, a mark under the band for each published brief. The
 * proof of how long the record runs used to sit seven sections down the brief, 24px
 * tall; here a visitor meets it before a word of copy.
 *
 * Two records, kept apart. The fields and lines are the month-end readings, scored
 * with today's formula. The marks under the band are the briefs as they were
 * published, and a week with none stays empty. The caption counts each by name.
 *
 * Server-rendered from the bundled month-end series, which every route already holds;
 * it reads no live data, so the frame adds no request to a route that made none. The
 * still image needs no script. The month readout is a small island that does nothing
 * until the band is touched (recordBandReadout.tsx).
 */
export function RecordBand() {
  const model = buildRecordBand(
    getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER),
    getPublishedBriefs().map((brief) => ({ recordDate: brief.recordDate, regime: brief.regime, slug: brief.slug })),
  );
  if (!model) return null;
  const firstLabel = monthLabel(model.firstDate);
  const lastLabel = monthLabel(model.lastDate);
  const briefCount = model.marks.length;
  const readings = `${model.months} month-end readings since ${firstLabel}`;
  const summary = `${readings}, scored with today’s formula`;
  const briefsCounted = briefCount > 0 ? `${briefCount} ${briefCount === 1 ? "brief" : "briefs"}` : null;
  const published = briefsCounted ? `${briefsCounted}, published as written` : null;
  return (
    <aside className="record-band" aria-label="The record" data-record-band data-first={model.firstDate} data-months={model.encoded}>
      <p className="sr-only">
        Conditions by month, {firstLabel} to {lastLabel}: they changed {model.changes} {model.changes === 1 ? "time" : "times"}.
        {published ? ` ${published}.` : null}
      </p>
      <div className="record-band-plate" data-record-band-plate>
        <svg
          className="record-band-art"
          viewBox={`0 0 ${model.months} ${RECORD_BAND_HEIGHT}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          {/* One sky per condition, from the data-regime map: each gradient names its
              regime, so its stops read that condition's fill (record-band.css). */}
          <defs>
            {CONDITIONS.map((regime) => (
              <linearGradient key={regime} id={`record-sky-${regime}`} data-regime={regime} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" className="record-band-sky-top" />
                <stop offset="1" className="record-band-sky-base" />
              </linearGradient>
            ))}
          </defs>
          {model.runs.map((run) => (
            <rect
              key={run.start}
              className="record-band-field"
              data-regime={run.regime}
              style={{ fill: `url(#record-sky-${run.regime})` }}
              x={run.start}
              y={0}
              /* A hair wider than its months, so no seam of ground shows between two fields. */
              width={run.length + 0.05}
              height={RECORD_BAND_HEIGHT}
            />
          ))}
          <g className="record-band-lines record-band-lines-narrow">
            {model.narrow.paths.map((path, index) => (
              <path key={index} d={path.d} className={path.light ? "is-light" : "is-dense"} />
            ))}
          </g>
          {model.runs.slice(1).map((run) => (
            <line key={run.start} className="record-band-seam" x1={run.start} x2={run.start} y1={0} y2={RECORD_BAND_HEIGHT} />
          ))}
          {model.publishedFrom !== null ? (
            <line
              className="record-band-published-from"
              x1={model.publishedFrom * model.months}
              x2={model.publishedFrom * model.months}
              y1={0}
              y2={RECORD_BAND_HEIGHT}
            />
          ) : null}
        </svg>
        <svg
          className="record-band-art record-band-wide"
          viewBox={`0 0 ${model.wide.width} ${RECORD_BAND_HEIGHT}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <g className="record-band-lines">
            {model.wide.paths.map((path, index) => (
              <path key={index} d={path.d} className={path.light ? "is-light" : "is-dense"} />
            ))}
          </g>
        </svg>
        {/* The two bundles named where they run, in the first field: no key to decode. */}
        <span className="record-band-label record-band-label-risk" aria-hidden="true">Risk appetite</span>
        <span className="record-band-label record-band-label-pressure" aria-hidden="true">Funding pressure</span>
        {/* Each stretch named in its own field, where the band is the page's figure
            (History): the condition, and how long it held where the field has the room. */}
        {model.runs.map((run) => {
          const share = run.length / model.months;
          return share >= 0.035 ? (
            <span
              key={run.start}
              aria-hidden="true"
              className={`record-band-field-label ${isLightField(run.regime) ? "is-light" : "is-dense"}`}
              style={{ left: `${(run.start / model.months) * 100}%` }}
            >
              {REGIME_LABELS[run.regime]}
              {share >= 0.12 ? ` · ${run.length} months` : null}
            </span>
          ) : null;
        })}
        <span className="record-band-cursor" data-record-band-cursor hidden />
        {/* The month under the pointer, as the weather strip reads it: filled and placed by
            recordBandReadout.tsx, hidden until then. Hidden from assistive tech too: the
            slider's aria-valuetext says the same in words. */}
        <div className="record-band-reading" data-record-band-reading aria-hidden="true" hidden>
          <span className="record-band-reading-when">
            <span className="record-band-reading-month" data-reading-month />
            <span className="record-band-reading-condition">
              {CONDITIONS.map((regime) => (
                <span key={regime} data-reading-glyph={regime} hidden>
                  <ConditionIcon regime={regime} />
                </span>
              ))}
              <span data-reading-condition />
            </span>
          </span>
          <span className="record-band-reading-figure">
            <span className="type-figure" data-reading-pressure />
            <span className="record-band-reading-label">Funding pressure</span>
          </span>
          <span className="record-band-reading-figure">
            <span className="type-figure" data-reading-risk />
            <span className="record-band-reading-label">Risk appetite</span>
          </span>
        </div>
        <div className="record-band-overlay" data-record-band-overlay />
      </div>
      <div className="record-band-axis" aria-hidden="true">
        {model.years.map(({ year, at }) => (
          <span key={year} className="record-band-year" data-step={year % 4 === 0 ? 4 : year % 2 === 0 ? 2 : 1} style={{ left: `${at * 100}%` }}>
            {year}
          </span>
        ))}
        {model.marks.map((mark) => (
          <i key={mark.slug} className="record-band-brief" style={{ left: `${mark.at * 100}%` }} />
        ))}
      </div>
      <p className="record-band-caption">
        <span data-record-band-readout data-default={published ? `${summary} · ${published}` : summary}>
          {/* The qualifiers give way on a phone, where the caption would take two lines. */}
          {readings}
          <span className="record-band-caption-long">, scored with today&rsquo;s formula</span>
          {briefsCounted ? (
            <>
              {" "}
              &middot; {briefsCounted}
              <span className="record-band-caption-long">, published as written</span>
            </>
          ) : null}
        </span>
        <span aria-hidden="true"> &middot; </span>
        <Link href="/history" className="record-band-link">
          History
        </Link>
      </p>
      <RecordBandReadout />
    </aside>
  );
}

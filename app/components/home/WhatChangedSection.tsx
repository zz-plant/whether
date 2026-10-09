import Link from "next/link";
import { HomeSection } from "./HomeSection";
import { ScoreLadder } from "../ui/scoreLadder";
import { GovernedAreas } from "../ui/governedAreas";
import { PlainEnglishScoreNote, SignalScaleNote } from "../ui/plainLanguage";
import { compositeSignalScales } from "../../../lib/report/signalTranslations";
import { TrendGlyph, describeTrend, trendDirectionFromDelta, trendToneClass } from "../illustrations/TrendGlyph";
import { HOME_SECTIONS, type SignalChangeRow } from "../../../lib/report/home/homeSectionModel";
import { comparisonBasis, type ComparisonBasis } from "../../../lib/report/comparisonBasis";

/**
 * Movement: one row per signal, each a from → to chip and, for the two
 * composite scores, the score on its ladder. The hero's three readout cells
 * and the Key drivers card both drew these same four readings; this is the one
 * drawing. The section opens on the table (2026-10-09): its lead sentence
 * restated the card ("Since Sep 30, conditions changed from Cloudy to
 * Freezing"), and the areas' own rows say which lines each move crossed. A read
 * with no previous week still gets one sentence saying so, instead of four
 * empty chips saying nothing.
 *
 * Every term defines itself in its row (the scale note, what the score means
 * at its level, the line names on the ladder), so the section no longer ends
 * by sending a reader to a glossary.
 *
 * The column and the ladders' hollow dot name the reading they compare with
 * ("Sep 29 → this week"): last week's published brief, or the previous
 * month-end where there is none. The column used to say "Last week" over a
 * month-end. A row the earlier reading did not record draws "—".
 */
const DeltaChip = ({ row, basis }: { row: SignalChangeRow; basis: ComparisonBasis }) => {
  if (row.previous === null || row.delta === null) {
    return <span className="text-slate-500">—</span>;
  }
  const direction = trendDirectionFromDelta(row.delta);
  const tone = trendToneClass(direction, row.increaseIsPositive);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-sm border border-current/30 px-1.5 py-0.5 tabular-nums ${tone}`}>
      <span className="sr-only">
        {describeTrend({ label: row.label, delta: row.delta, current: row.value ?? undefined, period: basis.since })}
      </span>
      <span aria-hidden="true" className="text-slate-400">{row.previousLabel}</span>
      <span aria-hidden="true">→</span>
      <span aria-hidden="true" className="font-semibold">{row.valueLabel}</span>
      <TrendGlyph direction={direction} className="h-3 w-3" />
    </span>
  );
};

const isCompositeSignalKey = (key: SignalChangeRow["key"]): key is keyof typeof compositeSignalScales =>
  Object.prototype.hasOwnProperty.call(compositeSignalScales, key);

export function WhatChangedSection({
  rows,
  lead,
  comparisonUnavailable,
  basis = comparisonBasis(),
}: {
  rows: readonly SignalChangeRow[];
  /** Said over the table only when there is no earlier reading to compare with. */
  lead?: string;
  comparisonUnavailable: boolean;
  /** The earlier reading the rows are compared with; "last week" when the week does not date it. */
  basis?: ComparisonBasis;
}) {
  return (
    <HomeSection
      id={HOME_SECTIONS.changed.id}
      heading={HOME_SECTIONS.changed.heading}
      lead={lead}
      /* In the reader's order: first what moved (the evidence), then what
         that changes (the consequences by area). Keeps DOM and visual order aligned. */
    >
      {/* On phones each signal, movement and ladder gets the full measure.
          An auto-width movement column narrowed the signal's description to
          one word per line whenever a clipped score needed an explanation. */}
      <div className="md:overflow-x-auto overscroll-x-contain">
        <table
          className="w-full border-collapse text-left text-sm max-md:block md:min-w-[42rem] md:table-fixed"
          data-testid="what-changed-table"
        >
          {/* The signal column carries the scale note and what the score means at
              its level, so it needs room: left to itself the browser gave it the
              width of its longest word and wrapped the notes one word per line. */}
          <colgroup className="max-md:hidden">
            <col className="w-[19rem]" />
            <col className="w-[11rem]" />
            <col />
          </colgroup>
          <caption className="sr-only">
            {`Each signal this week against ${basis.reference} and against its lines`}
          </caption>
          <thead className="max-md:hidden">
            <tr className="border-b border-slate-800/80 text-xs text-slate-400">
              <th scope="col" className="py-2 pr-3 font-medium">Signal</th>
              <th scope="col" className="py-2 pr-3 font-medium">{`${basis.label} → this week`}</th>
              <th scope="col" className="py-2 font-medium">Against its lines</th>
            </tr>
          </thead>
          <tbody className="max-md:block">
            {rows.map((row) => (
              <tr
                key={row.key}
                id={
                  row.key === "tightness"
                    ? "signal-funding-pressure"
                    : row.key === "riskAppetite"
                      ? "signal-risk-appetite"
                      : row.key === "baseRate"
                        ? "signal-base-rate"
                        : "signal-curve-slope"
                }
                className="border-b border-slate-800/50 align-top max-md:grid max-md:grid-cols-1 max-md:gap-y-3 max-md:py-4"
                data-signal={row.key}
              >
                <th scope="row" className="py-2.5 pr-4 align-top font-semibold text-slate-100 max-md:p-0">
                  <div className="space-y-1">
                    <Link
                      href={`/signals#${row.key}`}
                      className="weather-hit text-base font-semibold text-slate-100 hover:text-sky-300 underline decoration-slate-700 hover:decoration-sky-400 underline-offset-2 transition-colors"
                      title={`View ${row.label} evidence and historical charts`}
                    >
                      {row.label}
                    </Link>
                    {row.key === "tightness" || row.key === "riskAppetite" ? (
                      <GovernedAreas metric={row.key} target="table" />
                    ) : row.key === "baseRate" ? (
                      <span className="block text-fluid-nano font-normal text-slate-400">
                        Feeds into <a href="#signal-funding-pressure" className="weather-hit underline decoration-slate-600 underline-offset-2 hover:text-sky-300">Funding pressure</a>
                      </span>
                    ) : row.key === "curveSlope" ? (
                      <span className="block text-fluid-nano font-normal text-slate-400">
                        Feeds into <a href="#signal-risk-appetite" className="weather-hit underline decoration-slate-600 underline-offset-2 hover:text-sky-300">Risk appetite</a>, and{" "}
                        <a href="#signal-funding-pressure" className="weather-hit underline decoration-slate-600 underline-offset-2 hover:text-sky-300">Funding pressure</a> once inverted
                      </span>
                    ) : null}
                    {/* Which inputs took the score from the earlier reading to
                        this one. The chip says how far it went; without this a
                        27-point move reads as the market having moved 27 points,
                        when part of a score's move can be an input the earlier
                        score never had. */}
                    {row.movement ? (
                      <p className="text-fluid-xs font-normal leading-relaxed text-slate-300" data-movement={row.key}>
                        <span className="text-slate-400">What moved it: </span>
                        {row.movement}
                      </p>
                    ) : null}
                    {/* The scale and what the score means at its level, one click
                        away. They were four more stacked lines in every row, at
                        the same small size as the name and the move, so a row
                        had six layers and no first thing to read. */}
                    {row.scaleLabel || isCompositeSignalKey(row.key) ? (
                      <details className="weather-auto-chevron text-fluid-nano font-normal text-slate-400">
                        <summary className="cursor-pointer select-none">What the score means</summary>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-x-1.5">
                            {row.scaleLabel ? <span className="capitalize">{row.scaleLabel}</span> : null}
                            {row.scaleLabel && isCompositeSignalKey(row.key) ? (
                              <span aria-hidden="true" className="text-slate-600">·</span>
                            ) : null}
                            {isCompositeSignalKey(row.key) ? (
                              <SignalScaleNote signalKey={row.key} as="span" className="inline font-normal text-slate-400" />
                            ) : null}
                          </div>
                          {isCompositeSignalKey(row.key) && typeof row.value === "number" ? (
                            <PlainEnglishScoreNote
                              signalKey={row.key}
                              score={row.value}
                              className="whitespace-normal font-normal text-slate-300/80"
                            />
                          ) : null}
                        </div>
                      </details>
                    ) : null}
                  </div>
                </th>
                <td className="whitespace-nowrap py-2.5 pr-3 text-xs align-top max-md:p-0">
                  {comparisonUnavailable ? <span className="text-slate-500">—</span> : <DeltaChip row={row} basis={basis} />}
                </td>
                <td className="py-2.5 max-md:p-0 md:min-w-[14rem]">
                  {row.lines && typeof row.value === "number" ? (
                    <div className="space-y-2">
                      <ScoreLadder
                        label={<span className="sr-only">{row.label}</span>}
                        value={row.value}
                        previous={comparisonUnavailable ? null : row.previous}
                        previousLabel={basis.label}
                        lines={row.lines}
                      />
                      {row.saturatedPressure !== undefined ? (
                        /* A clipped score cannot move, so the chip reads flat at the
                           moment conditions are most extreme. Say it, under the
                           ladder that has the width for a sentence: in the chip
                           column it wrapped to four lines and stretched the row. */
                        <p className="max-w-[48ch] text-xs text-amber-300/80">
                          Pinned at the top of its scale, so it can&rsquo;t show a move. It would read {row.saturatedPressure.toFixed(0)}.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    /* An input, not a score: the call is decided on the two scores
                       it feeds. "No line of its own" was false for the base rate,
                       which funding pressure judges against a line. */
                    <span className="text-xs text-slate-500">
                      {row.key === "baseRate"
                        ? "Judged through funding pressure's lines."
                        : "Judged through the lines of both scores."}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </HomeSection>
  );
}

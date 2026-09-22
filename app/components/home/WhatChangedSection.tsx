import { HomeSection } from "./HomeSection";
import { ScoreLadder } from "../ui/scoreLadder";
import { GlossaryLink, PlainEnglishScoreNote, SignalScaleNote } from "../ui/plainLanguage";
import { compositeSignalScales } from "../../../lib/report/signalTranslations";
import { TrendGlyph, describeTrend, trendDirectionFromDelta, trendToneClass } from "../illustrations/TrendGlyph";
import { HOME_SECTIONS, type SignalChangeRow } from "../../../lib/report/home/homeSectionModel";

/**
 * Movement: one row per signal, each a from → to chip and, for the two
 * composite scores, the score on its ladder. The hero's three readout cells
 * and the Key drivers card both drew these same four readings; this is the one
 * drawing. The sentence over the table is the week's movement in one line,
 * and on a read with no previous week it says so once, instead of four empty
 * chips saying nothing.
 */
const DeltaChip = ({ row }: { row: SignalChangeRow }) => {
  if (row.previous === null || row.delta === null) {
    return <span className="text-slate-500">—</span>;
  }
  const direction = trendDirectionFromDelta(row.delta);
  const tone = trendToneClass(direction, row.increaseIsPositive);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-sm border border-current/30 px-1.5 py-0.5 tabular-nums ${tone}`}>
      <span className="sr-only">
        {describeTrend({ label: row.label, delta: row.delta, current: row.value ?? undefined })}
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
}: {
  rows: readonly SignalChangeRow[];
  /** The movement sentence, or the quiet-day line on a week the call held. */
  lead: string;
  comparisonUnavailable: boolean;
}) {
  return (
    <HomeSection
      id={HOME_SECTIONS.changed.id}
      heading={HOME_SECTIONS.changed.heading}
      lead={lead}
      /* On a phone the consequences come first: the Monday reader is checking
         whether to act, not why. From `md` up the evidence reads first again. */
      className="order-3 md:order-2"
    >
      {/* A table from sm up. Below it each row restacks — the signal and its
          move on one line, its ladder across the full width under them —
          because at 42rem the ladder column sat off a phone's right edge,
          behind a sideways scroll nobody knew was there. */}
      <div className="sm:overflow-x-auto">
        <table
          className="w-full border-collapse text-left text-sm max-sm:block sm:min-w-[42rem] sm:table-fixed"
          data-testid="what-changed-table"
        >
          {/* The signal column carries the scale note and what the score means at
              its level, so it needs room: left to itself the browser gave it the
              width of its longest word and wrapped the notes one word per line. */}
          <colgroup className="max-sm:hidden">
            <col className="w-[15rem]" />
            <col className="w-[11rem]" />
            <col />
          </colgroup>
          <caption className="sr-only">Each signal this week against last week and against its lines</caption>
          <thead className="max-sm:hidden">
            <tr className="border-b border-slate-800/80 text-xs text-slate-400">
              <th scope="col" className="py-2 pr-3 font-medium">Signal</th>
              <th scope="col" className="py-2 pr-3 font-medium">Last week → this week</th>
              <th scope="col" className="py-2 font-medium">Against its lines</th>
            </tr>
          </thead>
          <tbody className="max-sm:block">
            {rows.map((row) => (
              <tr
                key={row.key}
                className="border-b border-slate-800/50 align-top max-sm:grid max-sm:grid-cols-[1fr_auto] max-sm:gap-x-3 max-sm:gap-y-2 max-sm:py-3"
                data-signal={row.key}
              >
                <th scope="row" className="py-2.5 pr-4 align-top font-semibold text-slate-100 max-sm:p-0">
                  {row.label}
                  {row.scaleLabel ? <span className="block text-xs font-normal text-slate-500">{row.scaleLabel}</span> : null}
                  {/* Which end of the scale is which. A composite score is the one
                      number on this page with no unit, and a first-time reader has
                      no way to tell 0 from 100 without it. */}
                  {isCompositeSignalKey(row.key) ? <SignalScaleNote signalKey={row.key} className="font-normal" /> : null}
                  {/* What the score means at the level it is actually at. The
                      band label above says where it sits; this says what that
                      is like to operate in. */}
                  {isCompositeSignalKey(row.key) && typeof row.value === "number" ? (
                    <PlainEnglishScoreNote
                      signalKey={row.key}
                      score={row.value}
                      className="mt-1 whitespace-normal font-normal"
                    />
                  ) : null}
                </th>
                <td className="whitespace-nowrap py-2.5 pr-3 text-xs max-sm:p-0">
                  {comparisonUnavailable ? <span className="text-slate-500">—</span> : <DeltaChip row={row} />}
                  {row.saturatedPressure !== undefined ? (
                    /* A clipped score cannot move, so the chip reads flat at the
                       moment conditions are most extreme. Say it. The raw
                       pressure is what is missing from a score that has
                       stopped being able to report a move. */
                    <span className="mt-1 block max-w-[18rem] whitespace-normal text-amber-300/80">
                      Off the top of the scale. The score can&rsquo;t rise further, so it can&rsquo;t show a move.
                      {" "}It would read {row.saturatedPressure.toFixed(0)}.
                    </span>
                  ) : null}
                </td>
                <td className="py-2.5 max-sm:col-span-2 max-sm:p-0 sm:min-w-[14rem]">
                  {row.lines && typeof row.value === "number" ? (
                    <ScoreLadder
                      label={<span className="sr-only">{row.label}</span>}
                      value={row.value}
                      previous={comparisonUnavailable ? null : row.previous}
                      lines={row.lines}
                    />
                  ) : (
                    /* An input, not a score: the call is decided on the two scores
                       it feeds. "No line of its own" was false for the base rate,
                       which funding pressure judges against a line. */
                    <span className="text-xs text-slate-500">
                      {row.key === "baseRate"
                        ? "Feeds funding pressure; the call is judged on that score."
                        : "Feeds both scores; the call is judged on those."}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-fluid-nano text-white/45">
        Unfamiliar with a term here? <GlossaryLink>Open the glossary</GlossaryLink>
      </p>
    </HomeSection>
  );
}

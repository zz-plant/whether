import Link from "next/link";
import { UrlDetails } from "../ui/urlDetails";
import { HomeSection } from "./HomeSection";
import { Sparkline, interquartileRange, sparklineDomain, type SparklinePoint } from "../ui/sparkline";
import { ScoreLadder } from "../ui/scoreLadder";
import { GovernedAreas } from "../ui/governedAreas";
import { SignalContextDetails } from "../ui/plainLanguage";
import { TrendGlyph, trendToneClass } from "../illustrations/TrendGlyph";
import { HOME_SECTIONS, type SignalChangeRow } from "../../../lib/report/home/homeSectionModel";
import { comparisonBasis, type ComparisonBasis } from "../../../lib/report/comparisonBasis";
import { describeSignalMoveMeaning, type SignalMoveMeaning } from "../../../lib/report/signalMoveMeaning";

/**
 * Movement: one row per signal, each opening on what the move means in everyday
 * words and, for the two composite scores, the score on its ladder. The hero's
 * three readout cells and the Key drivers card both drew these same four
 * readings; this is the one drawing. The section opens on the table
 * (2026-10-09): its lead sentence restated the card ("Since Sep 30, conditions
 * changed from Cloudy to Freezing"), and the areas' own rows say which lines
 * each move crossed. A read with no previous week still gets one sentence saying
 * so, instead of four empty rows saying nothing.
 *
 * Every term defines itself in its row (the scale note, what the score means
 * at its level, the line names on the ladder), so the section no longer ends
 * by sending a reader to a glossary.
 *
 * The row leads with the meaning (2026-11-03): "Money got easier to raise.",
 * "Borrowing got slightly cheaper.", "No real change." (`signalMoveMeaning.ts`
 * sets the size words). It was a column of from-chips ("from 40 ↘") beside the
 * ladder, which a reader without macro background could not turn into anything,
 * and which repeated the ladder's own hollow-dot key ("Sep 29: 40"). The numbers
 * stay, second: on the ladder for a score, in the value cell for a market input.
 * The ladders' hollow dot and an input's earlier value name the reading they
 * compare with: last week's published brief, or the previous month-end where
 * there is none.
 */
const meaningOf = (row: SignalChangeRow, basis: ComparisonBasis) =>
  describeSignalMoveMeaning({
    key: row.key,
    value: row.value,
    delta: row.delta,
    saturated: row.saturatedPressure !== undefined,
    basis,
  });

const MoveMeaning = ({ row, meaning }: { row: SignalChangeRow; meaning: SignalMoveMeaning }) => {
  /* A score held at the top of its scale is not "unchanged": it cannot show a
     rise (2026-10-14). A flat "No change" said "no move" a row before the note
     that said the move was hidden, at the moment conditions were most extreme. */
  if (meaning.capped) {
    return (
      <p className="weather-caveat-mark text-sm font-medium text-caveat-fg" data-delta-capped data-move-meaning={row.key}>
        {meaning.text}
      </p>
    );
  }
  return (
    <p
      className={`flex items-baseline gap-1.5 text-sm font-medium ${trendToneClass(meaning.direction, row.increaseIsPositive)}`}
      data-move-meaning={row.key}
    >
      {meaning.direction === "flat" ? null : <TrendGlyph direction={meaning.direction} className="h-3 w-3 shrink-0 self-center" />}
      <span>{meaning.text}</span>
    </p>
  );
};

/** A history is a shape only with at least three actual readings. */
function MonthEndHistory({ points, label, showLabel = false }: { points?: readonly SparklinePoint[]; label: string; showLabel?: boolean }) {
  if (!points || points.length < 3) return null;
  return (
    <figure className="weather-signal-history mt-4 whitespace-normal text-slate-400">
      {showLabel ? <p className="mb-2 text-fluid-xs text-slate-300">{label}</p> : null}
      <Sparkline
        points={points}
        label={`${label}, month-end history`}
        domain={[0, 100]}
        band={interquartileRange(points.map((point) => point.value))}
        widthEm={9}
      />
      <figcaption className="mt-2 text-fluid-nano">Month-end · 0–100</figcaption>
    </figure>
  );
}

/** Compact small-multiples grid of the raw inputs behind the scores, autoscaled per series. */
function InputHistoryGrid({ series }: { series: readonly { key: string; label: string; points: readonly SparklinePoint[] }[] }) {
  const usable = series.filter((entry) => entry.points.length >= 3);
  if (usable.length === 0) return null;
  return (
    <div className="weather-input-history mt-4" data-testid="input-history-grid">
      <p className="mb-2 text-fluid-xs font-medium text-slate-300">Inputs over the last ~90 days</p>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {usable.map((entry) => (
          <li key={entry.key} className="min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-fluid-nano text-slate-300">{entry.label}</span>
            </div>
            <Sparkline
              points={entry.points}
              label={`${entry.label}, trailing ~90 days`}
              widthEm={8}
              tone="unchanged"
            />
            <p className="mt-1 text-fluid-nano tabular-nums text-slate-400">
              Range {sparklineDomain(entry.points.map((point) => point.value))
                .map((value) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value))
                .join("–")}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WhatChangedSection({
  rows,
  lead,
  comparisonUnavailable,
  basis = comparisonBasis(),
  heading = HOME_SECTIONS.changed.heading,
  history,
  historyCaveat,
  inputHistory,
  compact = false,
  historyOpen = false,
}: {
  rows: readonly SignalChangeRow[];
  compact?: boolean;
  historyOpen?: boolean;
  /** Month-end history on a shared 0–100 scale; never presented as weekly observations. */
  history?: Partial<Record<SignalChangeRow["key"], readonly SparklinePoint[]>>;
  historyCaveat?: string | null;
  /** Trailing ~90-day history of the raw inputs behind the scores, autoscaled per series. */
  inputHistory?: readonly { key: string; label: string; points: readonly SparklinePoint[] }[];
  /** Said over the table only when there is no earlier reading to compare with. */
  lead?: string;
  comparisonUnavailable: boolean;
  /** The earlier reading the rows are compared with; "last week" when the week does not date it. */
  basis?: ComparisonBasis;
  /** "What changed since Aug 31": the heading names the reading the move is measured from. */
  heading?: string;
}) {
  const meanings = new Map(rows.map((row) => [row.key, meaningOf(row, basis)] as const));
  /* A score that moved enough to say so goes first; one whose row says "No real
     change." keeps its place, or the table opened on a row with nothing to say. */
  const displayRows = compact
    ? [...rows].sort((a, b) => {
        const priority = (row: SignalChangeRow) =>
          row.key === "tightness" || row.key === "riskAppetite"
            ? (meanings.get(row.key)?.direction ?? "flat") === "flat" ? 1 : 0
            : 2;
        return priority(a) - priority(b);
      })
    : rows;
  const hasHistory = Object.values(history ?? {}).some((points) => points.length >= 3)
    || (inputHistory ?? []).some((entry) => entry.points.length >= 3);
  return (
    <HomeSection
      id={HOME_SECTIONS.changed.id}
      heading={heading}
      lead={lead}
      /* In the reader's order: first what moved (the evidence), then what
         that changes (the consequences by area). Keeps DOM and visual order aligned. */
    >
      {/* On phones each signal, its meaning and its ladder get the full measure.
          The meaning sits under the name, not in a column of its own, so it
          leads the row at every width: as a middle column it printed after the
          score's fold on a phone. */}
      <div className="md:overflow-x-auto overscroll-x-contain">
        <table
          className="weather-signal-table w-full border-collapse text-left text-sm max-md:block md:min-w-[42rem] md:table-fixed"
          data-testid="what-changed-table"
        >
          {/* The signal column carries the meaning, the scale note and what the
              score means at its level, so it needs room: left to itself the
              browser gave it the width of its longest word and wrapped the notes
              one word per line. */}
          <colgroup className="max-md:hidden">
            <col className="w-[20rem]" />
            <col />
          </colgroup>
          <caption className="sr-only">
            {`How each signal compares with ${basis.reference}, and where it stands now`}
          </caption>
          <thead className="max-md:hidden">
            <tr className="border-b border-[color:var(--border-subtle)] text-xs text-slate-400">
              <th scope="col" className="py-2 pr-3 font-medium">Signal</th>
              <th scope="col" className="py-2 font-medium">Where it stands</th>
            </tr>
          </thead>
          <tbody className="max-md:block">
            {displayRows.map((row) => (
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
                className="border-b border-[color:var(--border-faint)] align-top last:border-b-0 max-md:grid max-md:grid-cols-1 max-md:gap-y-3 max-md:py-4"
                data-signal={row.key}
                data-input={compact && row.key !== "tightness" && row.key !== "riskAppetite" ? "" : undefined}
              >
                <th scope="row" className="py-2.5 pr-4 align-top font-semibold text-slate-100 max-md:p-0">
                  <div className="space-y-1">
                    <Link
                      href={`/signals#${row.key}`}
                      className="weather-hit text-base font-semibold text-slate-100 hover:text-sky-300 underline decoration-slate-600 hover:decoration-sky-400 underline-offset-2 transition-colors"
                      title={`View ${row.label} evidence and historical charts`}
                    >
                      {row.label}
                    </Link>
                    {/* With nothing to compare, the lead over the table says so once. */}
                    {comparisonUnavailable ? null : <MoveMeaning row={row} meaning={meanings.get(row.key) ?? meaningOf(row, basis)} />}
                    {row.key === "tightness" || row.key === "riskAppetite" ? (
                      <GovernedAreas metric={row.key} target="table" />
                    ) : !compact && row.key === "baseRate" ? (
                      <span className="block text-fluid-nano font-normal text-slate-400">
                        Feeds into <a href="#signal-funding-pressure" className="weather-hit underline decoration-slate-600 underline-offset-2 hover:text-sky-300">Funding pressure</a>
                      </span>
                    ) : !compact && row.key === "curveSlope" ? (
                      <span className="block text-fluid-nano font-normal text-slate-400">
                        Feeds into <a href="#signal-risk-appetite" className="weather-hit underline decoration-slate-600 underline-offset-2 hover:text-sky-300">Risk appetite</a>, and{" "}
                        <a href="#signal-funding-pressure" className="weather-hit underline decoration-slate-600 underline-offset-2 hover:text-sky-300">Funding pressure</a> once inverted
                      </span>
                    ) : null}
                    {/* Which inputs took the score from the earlier reading to
                        this one. The meaning above says which way and how far;
                        without this a 27-point move reads as the market having
                        moved 27 points, when part of a score's move can be an
                        input the earlier score never had. */}
                    {row.movement ? (
                      <p className="text-fluid-xs font-normal leading-relaxed text-slate-300" data-movement={row.key}>
                        <span className="text-slate-400">What moved it: </span>
                        {row.movement}
                      </p>
                    ) : null}
                    {/* Plain-English meaning, scale anchors, historical startup era
                        context, and team reflection prompt. Folded in a 1-click disclosure
                        to maintain clean table scanning. */}
                    {!compact || row.lines ? <SignalContextDetails
                      signalKey={row.key}
                      score={typeof row.value === "number" ? row.value : undefined}
                      scaleLabel={row.scaleLabel}
                    /> : null}
                  </div>
                </th>
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
                        /* A clipped score cannot move, so its row would read flat at
                           the moment conditions are most extreme. The meaning says
                           what that leaves the reader with; this says why, with the
                           uncapped number, under the ladder that has the width. */
                        <p className="weather-caveat-mark max-w-[48ch] text-xs text-caveat-fg">
                          This is as high as the score goes. Uncapped it would be {row.saturatedPressure.toFixed(0)}, so a further rise can&rsquo;t show here.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    /* An input, not a score: this week's value, and the earlier one
                       where it moved, in the hollow-dot key's words ("Sep 29: 4.11").
                       The guidance is decided on the two scores it feeds. "No line of
                       its own" was false for the base rate, which funding pressure
                       judges against a line. */
                    <div className="space-y-1 text-xs text-slate-500">
                      <span className="block tabular-nums text-slate-200">{row.valueLabel}</span>
                      {!comparisonUnavailable && row.delta !== null && row.delta !== 0 && row.previousLabel ? (
                        <span className="block text-[12px] tabular-nums text-slate-400">{`${basis.label}: ${row.previousLabel}`}</span>
                      ) : null}
                      {compact ? null : (
                        <span className="block">
                          {row.key === "baseRate"
                            ? "Feeds into funding pressure, so it counts through that score."
                            : "Feeds into both scores, so it counts through them."}
                        </span>
                      )}
                    </div>
                  )}
                  {!compact ? <MonthEndHistory points={history?.[row.key]} label={row.label} /> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {compact && hasHistory ? (
        <UrlDetails queryKey="inputs" initialOpen={historyOpen}
          summary="Score history and market inputs" summaryClassName="weather-hit text-fluid-xs text-slate-300">
          <div className="space-y-4 pt-3">
            <div className="flex flex-wrap gap-8">
              {rows.map((row) => <MonthEndHistory showLabel key={row.key} points={history?.[row.key]} label={row.label} />)}
            </div>
            {historyCaveat ? <p className="max-w-3xl text-fluid-xs text-slate-400">{historyCaveat}</p> : null}
            {inputHistory ? <InputHistoryGrid series={inputHistory} /> : null}
          </div>
        </UrlDetails>
      ) : <>
        {historyCaveat && Object.values(history ?? {}).some((points) => points.length >= 3) ? (
          <p className="max-w-3xl text-fluid-xs text-slate-400">{historyCaveat}</p>
        ) : null}
        {inputHistory ? <InputHistoryGrid series={inputHistory} /> : null}
      </>}
    </HomeSection>
  );
}

import type { RecordCalendar } from "../../../lib/report/recordCalendar";
import { isLightField } from "../../../lib/report/recordBandCodec";
import { formatMonthShortUtc } from "../../../lib/formatters";
import { ConditionIcon, ConditionWord } from "../ui/conceptIcons";
import { HistoryReadout } from "./historyReadout";
import { ScreenshotCaption } from "../screenshotCaption";

const MONTHS = Array.from({ length: 12 }, (_unused, index) => index + 1);
const MONTH_LONG = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" });

/* A glyph on a condition's fill takes the band's line ink for that fill, as the band's
   own labels do (record-band.css): the condition's text ink is drawn for the page's
   ground, and on its own fill it all but vanishes (Stormy's light-theme ink on Stormy). */
const glyphInk = (regime: Parameters<typeof isLightField>[0]) =>
  isLightField(regime) ? "text-[color:var(--band-line-on-light)]" : "text-[color:var(--band-line-on-dense)]";

/**
 * Conditions by month, read by calendar: a row per year, newest on top, a column per
 * month, each cell the month-end's conditions in its fill and line pattern (§XXX, the
 * same `record-week-cell` the published weeks use, so a condition in a cell is drawn
 * one way on this page). The glyph marks where a stretch starts within a row, so each
 * row names its conditions without colour and a change shows where it fell; elsewhere
 * a 16px glyph in every one of 178 cells would be texture, not words.
 *
 * It replaced one word per year ("2025 Cloudy"), which hid 2025's two changes. The
 * record band above the page draws these months by time and cannot set one May
 * beside another; this is the calendar it cannot be, and it draws no brief (§XXX
 * keeps the two records apart). The year still links its archive page.
 *
 * Every cell is a link to the brief as it read that month, named for its month,
 * conditions and both scores; pointing at or focusing one prints the same words in
 * the line above the grid (`HistoryReadout`). One tab stop, the newest month; the
 * arrow keys move through the rest. The key under it is also the count of months
 * under each condition, which the page printed as its own line.
 */
export function ConditionsByYear({
  calendar,
  yearHref,
}: {
  calendar: RecordCalendar;
  /** The year's archive page, where there is one (a year still running has none). */
  yearHref: (year: number) => string | null;
}) {
  const newest = calendar.years
    .flatMap((row) => row.months)
    .reduce<string | null>((latest, cell) => (cell && (!latest || cell.recordDate > latest) ? cell.recordDate : latest), null);

  return (
    <figure className="@container m-0 max-w-[48rem] space-y-2" data-conditions-by-year data-readout-scope>
      {/* The month under the pointer or the focus; at rest, the grid's domain. One line
          tall at every width, so a long month's words never move the grid. */}
      <p data-readout aria-hidden="true" className="min-h-[2.75rem] text-fluid-sm leading-snug tabular-nums text-slate-300 @[30rem]:min-h-[1.5rem]">
        <span data-readout-rest>{calendar.rangeLabel} · one cell per month-end</span>
        <span data-readout-live hidden />
      </p>
      <table className="w-full table-fixed border-collapse">
        <caption className="sr-only">
          Conditions at each month-end, {calendar.rangeLabel}, a row per year and a column per month. Each month opens the
          brief as it read then.
        </caption>
        <colgroup>
          <col className="w-[2.75rem] @[36rem]:w-[3.5rem]" />
          {MONTHS.map((month) => (
            <col key={month} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="p-0">
              <span className="sr-only">Year</span>
            </th>
            {MONTHS.map((month) => {
              const short = formatMonthShortUtc(month);
              return (
                <th key={month} scope="col" className="px-0 pb-1 text-center text-fluid-nano font-normal text-slate-400">
                  <span className="sr-only">{MONTH_LONG.format(new Date(Date.UTC(2020, month - 1, 1)))}</span>
                  {/* An initial where twelve months share a phone's width, the short name from 36rem. */}
                  <span aria-hidden="true" className="@[36rem]:hidden">{short.slice(0, 1)}</span>
                  <span aria-hidden="true" className="hidden @[36rem]:inline">{short}</span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {calendar.years.map((row) => {
            const href = yearHref(row.year);
            return (
              <tr key={row.year}>
                <th scope="row" className="py-0 pr-2 text-left text-fluid-sm font-normal tabular-nums">
                  {href ? (
                    <a href={href} className="weather-hit text-slate-100 underline decoration-slate-600 underline-offset-4 [--weather-hit-up:0px]">
                      {row.year}
                    </a>
                  ) : (
                    <span className="text-slate-300">{row.year}</span>
                  )}
                </th>
                {row.months.map((cell, index) => (
                  <td key={index} className="p-0">
                    {cell ? (
                      <a
                        href={cell.href}
                        aria-label={cell.label}
                        data-readout-text={cell.label}
                        data-date={cell.recordDate}
                        data-year={cell.year}
                        data-month={cell.month}
                        tabIndex={cell.recordDate === newest ? 0 : -1}
                        className="group block touch-manipulation px-[1.5px] py-[3px] pointer-coarse:py-1"
                      >
                        <span
                          data-regime={cell.regime}
                          className="record-week-cell flex h-[1.875rem] items-center justify-center after:hidden group-hover:outline-2 group-hover:outline-offset-1 group-hover:outline-[color:var(--app-text)] pointer-coarse:h-9"
                        >
                          {cell.runStart ? <ConditionIcon regime={cell.regime} data-calendar-run-glyph="" className={glyphInk(cell.regime)} /> : null}
                        </span>
                      </a>
                    ) : (
                      /* A month not on the record yet, or a gap in it: an open cell, as the
                         published weeks draw a week with no brief. */
                      <span className="block px-[1.5px] py-[3px] pointer-coarse:py-1" aria-hidden="true">
                        <span className="block h-[1.875rem] border border-dashed border-[color:var(--border-strong)] pointer-coarse:h-9" />
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-300" aria-label="Months under each condition">
        {calendar.totals.map(({ regime, months }) => (
          <li key={regime} className="flex items-center gap-1.5">
            {/* The key's swatch is a cell as the grid draws a stretch's first month. */}
            <span aria-hidden="true" data-regime={regime} className="record-week-cell flex h-5 w-7 items-center justify-center after:hidden">
              <ConditionIcon regime={regime} className={`size-3.5 ${glyphInk(regime)}`} />
            </span>
            <ConditionWord regime={regime} />
            <span className="tabular-nums text-slate-500">
              {months} {months === 1 ? "month" : "months"}
            </span>
          </li>
        ))}
      </ul>
      {/* A chart a reader crops ends in its source (§XXVIII); its period is the line above it. */}
      <ScreenshotCaption />
      <HistoryReadout grid />
    </figure>
  );
}

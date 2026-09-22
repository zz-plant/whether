import type {
  TrackRecord as TrackRecordModel,
  TrackRecordRow,
} from "../../../lib/report/trackRecord";
import { formatDateUTC, formatMonthYearShortFromValue } from "../../../lib/formatters";
import { OPERATING_LATITUDE_LABEL } from "../../../lib/report/reportCopy";
import { CALL_CHANGE_RULE } from "../../../lib/report/trackRecordCopy";
import { UrlDetails } from "../ui/urlDetails";

/**
 * The record of what this product has called, framed as evidence rather than as
 * mechanism. `RegimeStats` below already derives similar numbers, but it is
 * titled "Regime velocity" and sits inside a collapsed disclosure — it reads as
 * a fact about the macro cycle, not as a fact about the product's consistency.
 *
 * This panel makes no accuracy claim. The engine does not forecast, so it cannot
 * be scored on being right; what it can be scored on is holding a call and
 * showing its work, which is what the numbers below say.
 */
const renderDelta = (delta: number | null) => {
  if (delta === null) {
    return <span className="text-slate-600">—</span>;
  }

  const tone = delta > 0 ? "text-emerald-300" : delta < 0 ? "text-rose-300" : "text-slate-400";

  return (
    <span className={tone}>
      {delta > 0 ? "+" : ""}
      {delta.toLocaleString("en-US")}
    </span>
  );
};

/**
 * One table, rendered twice: the recent window the panel leads with, and the
 * remainder behind a disclosure. Extracted rather than duplicated so the two can
 * never drift into two different tables of the same thing.
 */
const RecordTable = ({ rows, caption }: { rows: TrackRecordRow[]; caption: string }) => (
  <table className="w-full max-w-3xl table-fixed border-collapse text-left text-fluid-xs">
    <colgroup>
      <col className="w-[26%]" />
      <col className="w-[32%]" />
      <col className="w-[21%]" />
      <col className="w-[21%]" />
    </colgroup>
    <caption className="sr-only">{caption}</caption>
    <thead>
      <tr className="border-b border-slate-800/80 text-slate-400">
        <th scope="col" className="py-2 pr-3 font-medium">Month</th>
        <th scope="col" className="py-2 pr-3 font-medium">Call</th>
        <th scope="col" className="py-2 pr-3 text-right font-medium">{OPERATING_LATITUDE_LABEL}</th>
        <th scope="col" className="hidden py-2 text-right font-medium sm:table-cell">Change</th>
      </tr>
    </thead>
    <tbody>
      {/* A changed row is the only event in a run of held ones, so it is
          marked as one. Twelve rows reading "Sunny" with a grey badge on
          the seventh made the transition the least visible thing in a
          table whose subject is transitions. */}
      {rows.map((row) => (
        <tr
          key={row.recordDate}
          className={`border-b border-slate-800/40 last:border-0${
            row.changed ? " bg-slate-900/40" : ""
          }`}
        >
          {/* "Jul 31, 2026" wraps onto two lines in a 26% column at phone
              width; the month alone is the fact the row is keyed on. */}
          <td className="py-2 pr-3 font-mono text-slate-400">
            <span className="sm:hidden">{formatMonthYearShortFromValue(row.recordDate)}</span>
            <span className="hidden sm:inline">{formatDateUTC(row.recordDate)}</span>
          </td>
          <td className="py-2 pr-3 text-slate-200">
            <span className={row.changed ? "font-semibold text-slate-100" : undefined}>
              {row.regimeLabel}
            </span>
            {row.changed ? (
              <span className="ml-2 type-badge text-fluid-micro rounded-sm bg-sky-500/15 px-1.5 py-0.5 text-sky-200">
                changed
              </span>
            ) : null}
          </td>
          <td className="py-2 pr-3 text-right font-mono text-slate-200">
            {row.boldness.toLocaleString("en-US")}
            <span className="ml-2 sm:hidden">{renderDelta(row.boldnessDelta)}</span>
          </td>
          <td className="hidden py-2 text-right font-mono sm:table-cell">
            {renderDelta(row.boldnessDelta)}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

export function TrackRecord({
  record,
  allMonthsOpen = false,
}: {
  record: TrackRecordModel | null;
  allMonthsOpen?: boolean;
}) {
  if (!record) {
    return null;
  }

  const earlierRows = record.allRows.slice(record.rows.length);
  const oldestShownDate = record.rows[record.rows.length - 1]?.recordDate ?? record.firstRecordDate;
  const yearsCovered = record.monthsCovered / 12;
  const changeRate = yearsCovered >= 1
    ? `${(Math.round((record.regimeChanges / yearsCovered) * 10) / 10).toLocaleString("en-US")} per year`
    : `${record.regimeChanges.toLocaleString("en-US")} total`;

  return (
    <section className="weather-panel space-y-4 px-5 py-5" aria-labelledby="track-record-heading">
      <div>
        <h2 className="type-eyebrow type-eyebrow-section" id="track-record-heading">Track record</h2>
        <p className="text-sm text-slate-300">
          Every call this engine has made, from the same published formula. Not a forecast — a record
          you can audit.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div className="rounded-md bg-slate-950/40 px-3 py-2.5">
          <dt className="text-slate-400">Months on record</dt>
          <dd className="mt-1 text-lg font-bold text-slate-100">
            {record.monthsCovered.toLocaleString("en-US")}
          </dd>
        </div>
        <div className="rounded-md bg-slate-950/40 px-3 py-2.5">
          <dt className="text-slate-400">Current call held</dt>
          <dd className="mt-1 text-lg font-bold text-slate-100">
            {record.currentHoldMonths.toLocaleString("en-US")}
            <span className="text-sm font-normal text-slate-400">
              {record.currentHoldMonths === 1 ? " mo" : " mos"}
            </span>
          </dd>
        </div>
        <div className="rounded-md bg-slate-950/40 px-3 py-2.5">
          <dt className="text-slate-400">Call changes</dt>
          <dd className="mt-1 text-lg font-bold text-slate-100">{changeRate}</dd>
        </div>
        <div className="rounded-md bg-slate-950/40 px-3 py-2.5">
          <dt className="text-slate-400">Record starts</dt>
          <dd className="mt-1 text-lg font-bold text-slate-100">
            {formatDateUTC(record.firstRecordDate)}
          </dd>
        </div>
      </dl>

      {/* "The call has been X" read as a statement about the call on the site
          today. Every figure in this panel comes from the month-end series, so
          it is a statement about closed months, and the two disagree whenever
          the month in progress has moved — which is how this page said "Sunny"
          on a week the brief was calling Freezing. */}
      <p className="text-fluid-xs text-slate-400">
        Through {formatDateUTC(record.latestRecordDate)}, the month-end call had been{" "}
        <span className="font-medium text-slate-200">{record.currentRegimeLabel}</span>{" "}
        since {formatDateUTC(record.currentHoldStartDate)}.{" "}
        {CALL_CHANGE_RULE} One noisy month cannot move it, so a held call is the usual state and a
        change is the event worth reading.
      </p>

      {/* The tiles and the held-since line are the record; the month-by-month
          table is its evidence, one disclosure away. Leading with twelve rows
          of the same word pushed the phase map — the graphic that shows where
          the call sits — under a screen of table. URL-carried per §XII. */}
      <UrlDetails
        queryKey="months"
        initialOpen={allMonthsOpen}
        className="weather-auto-chevron"
        summaryClassName="cursor-pointer select-none rounded-lg border border-slate-800/60 bg-slate-950/30 px-3 py-2 text-fluid-xs font-medium text-slate-300"
        summary={
          <span>
            Monthly calls ({record.allRows.length.toLocaleString("en-US")}) ·{" "}
            {formatDateUTC(record.firstRecordDate)} to {formatDateUTC(record.latestRecordDate)}
          </span>
        }
      >
        {/* No min-width and no horizontal scroll: the delta folds into the
            latitude cell below sm rather than sitting off-screen. */}
        <div className="mt-3 space-y-4">
          <RecordTable
            rows={record.rows}
            caption={`The ${record.rows.length} most recent monthly calls, newest first, with the operating latitude score behind each call.`}
          />
          {earlierRows.length > 0 ? (
            <div>
              <p className="mb-2 text-fluid-nano type-eyebrow text-slate-500">
                Earlier months ({earlierRows.length.toLocaleString("en-US")}) ·{" "}
                {formatDateUTC(record.firstRecordDate)} to {formatDateUTC(oldestShownDate)}
              </p>
              <RecordTable
                rows={earlierRows}
                caption="The remainder of the monthly call history, newest first."
              />
            </div>
          ) : null}
        </div>
      </UrlDetails>

    </section>
  );
}

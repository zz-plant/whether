import type { ReactNode } from "react";
import type {
  TrackRecord as TrackRecordModel,
  TrackRecordRow,
} from "../../../lib/report/trackRecord";
import { formatDateUTC, formatMonthYearShortFromValue } from "../../../lib/formatters";
import { OPERATING_LATITUDE_GLOSS, OPERATING_LATITUDE_LABEL } from "../../../lib/report/reportCopy";
import { CALL_CHANGE_RULE } from "../../../lib/report/trackRecordCopy";
import { StatTile } from "../ui/statTile";
import { UrlDetails } from "../ui/urlDetails";

/**
 * The record of what this product has called, framed as evidence rather than as
 * mechanism. A `RegimeStats` panel used to derive the same numbers a second time
 * inside the raw-conditions disclosure, under "Current streak" and "Longest run";
 * it was one record on three layers of the page, and it is gone.
 *
 * This panel makes no accuracy claim. The engine does not forecast, so it cannot
 * be scored on being right; what it can be scored on is holding a call and
 * showing its work, which is what the numbers below say.
 *
 * Two pieces, because /history reads in the order a reader asks: the record's
 * answer (the tiles, with the confidence record beside them) comes before the
 * phase map that explains the mechanism, and the month-by-month table — the
 * evidence for the tiles — comes after it. One component rendered them as one
 * block, which put the mechanism either above the answer or below its evidence.
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
        <th scope="col" className="py-2 pr-3 font-medium">Conditions</th>
        <th scope="col" className="py-2 pr-3 text-right font-medium">{OPERATING_LATITUDE_LABEL} (0–100)</th>
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

/**
 * The record's answer: four figures and the held-since line, with room beside
 * them for the confidence record (`aside`), which grades the same months on the
 * other question a reader asks of a record.
 */
export function TrackRecordTiles({
  record,
  aside,
}: {
  record: TrackRecordModel | null;
  aside?: ReactNode;
}) {
  if (!record) {
    return null;
  }

  const yearsCovered = record.monthsCovered / 12;
  const changeRate = yearsCovered >= 1
    ? `${(Math.round((record.regimeChanges / yearsCovered) * 10) / 10).toLocaleString("en-US")} per year`
    : `${record.regimeChanges.toLocaleString("en-US")} total`;

  return (
    <section className="weather-panel space-y-4 px-5 max-sm:px-0 py-5" aria-labelledby="track-record-heading">
      <div>
        <h2 className="type-eyebrow type-eyebrow-section" id="track-record-heading">Track record</h2>
        <p className="text-sm text-slate-300">
          Every month-end reading Whether has made, scored with the same published formula, so
          you can check each one against what happened next.
        </p>
      </div>

      <div className={aside ? "grid gap-6 lg:grid-cols-2" : ""}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Months on record" value={record.monthsCovered.toLocaleString("en-US")} />
            <StatTile
              label="Current conditions held"
              value={record.currentHoldMonths.toLocaleString("en-US")}
              unit={record.currentHoldMonths === 1 ? "mo" : "mos"}
            />
            <StatTile label="Changes in conditions" value={changeRate} />
            <StatTile label="Record starts" value={formatDateUTC(record.firstRecordDate)} />
          </div>

          {/* "The call has been X" read as a statement about the call on the site
              today. Every figure in this panel comes from the month-end series, so
              it is a statement about closed months, and the two disagree whenever
              the month in progress has moved — which is how this page said "Sunny"
              on a week the brief was calling Freezing. */}
          <p className="text-fluid-xs text-slate-400">
            Through {formatDateUTC(record.latestRecordDate)}, month-end conditions had been{" "}
            <span className="font-medium text-slate-200">{record.currentRegimeLabel}</span>{" "}
            since {formatDateUTC(record.currentHoldStartDate)}.{" "}
            {CALL_CHANGE_RULE} One noisy month cannot move it, so unchanged conditions are the usual state and a
            change is the event worth reading.
          </p>
        </div>

        {aside ? <div className="min-w-0">{aside}</div> : null}
      </div>
    </section>
  );
}

/**
 * The evidence for the tiles: every monthly call, one disclosure away. Leading
 * with twelve rows of the same word pushed the phase map — the graphic that
 * shows where the call sits — under a screen of table. URL-carried per §XII.
 */
export function TrackRecordTable({
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

  return (
    <section className="weather-panel space-y-4 px-5 max-sm:px-0 py-5" aria-labelledby="monthly-calls-heading">
      <div>
        <h2 className="type-eyebrow type-eyebrow-section" id="monthly-calls-heading">Monthly readings</h2>
        <p className="text-sm text-slate-300">
          The {OPERATING_LATITUDE_LABEL.toLowerCase()} score behind each reading, newest first. It runs
          0 to 100: {OPERATING_LATITUDE_GLOSS}.
        </p>
      </div>

      <UrlDetails
        queryKey="months"
        initialOpen={allMonthsOpen}
        className="weather-auto-chevron"
        summaryClassName="cursor-pointer select-none rounded-lg border border-slate-800/60 bg-slate-950/30 px-3 py-2 text-fluid-xs font-medium text-slate-300"
        summary={
          <span>
            Monthly readings ({record.allRows.length.toLocaleString("en-US")}) ·{" "}
            {formatDateUTC(record.firstRecordDate)} to {formatDateUTC(record.latestRecordDate)}
          </span>
        }
      >
        {/* No min-width and no horizontal scroll: the delta folds into the
            latitude cell below sm rather than sitting off-screen. */}
        <div className="mt-3 space-y-4">
          <RecordTable
            rows={record.rows}
            caption={`The ${record.rows.length} most recent monthly readings, newest first, with the operating latitude score behind each one.`}
          />
          {earlierRows.length > 0 ? (
            <div>
              <p className="mb-2 text-fluid-nano type-eyebrow text-slate-500">
                Earlier months ({earlierRows.length.toLocaleString("en-US")}) ·{" "}
                {formatDateUTC(record.firstRecordDate)} to {formatDateUTC(oldestShownDate)}
              </p>
              <RecordTable
                rows={earlierRows}
                caption="The remainder of the monthly readings, newest first."
              />
            </div>
          ) : null}
        </div>
      </UrlDetails>
    </section>
  );
}

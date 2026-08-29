import type { TrackRecord as TrackRecordModel } from "../../../lib/report/trackRecord";
import { formatDateUTC } from "../../../lib/formatters";

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
export function TrackRecord({ record }: { record: TrackRecordModel | null }) {
  if (!record) {
    return null;
  }

  const yearsCovered = record.monthsCovered / 12;
  const changeRate = yearsCovered >= 1
    ? `${(Math.round((record.regimeChanges / yearsCovered) * 10) / 10).toLocaleString("en-US")} per year`
    : `${record.regimeChanges.toLocaleString("en-US")} total`;

  return (
    <section className="weather-panel space-y-4 px-5 py-5" aria-labelledby="track-record-heading">
      <div>
        <h2 className="type-eyebrow" id="track-record-heading">Track record</h2>
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
          <dt className="text-slate-400">Regime changes</dt>
          <dd className="mt-1 text-lg font-bold text-slate-100">{changeRate}</dd>
        </div>
        <div className="rounded-md bg-slate-950/40 px-3 py-2.5">
          <dt className="text-slate-400">Record starts</dt>
          <dd className="mt-1 text-lg font-bold text-slate-100">
            {formatDateUTC(record.firstRecordDate)}
          </dd>
        </div>
      </dl>

      <p className="text-fluid-xs text-slate-400">
        The call has been <span className="font-medium text-slate-200">{record.currentRegimeLabel}</span>{" "}
        since {formatDateUTC(record.currentHoldStartDate)}.
        Hysteresis in the scoring means a single noisy month cannot flip it, so a held call is the
        expected state and a change is the event worth reading.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[26rem] border-collapse text-left text-fluid-xs">
          <caption className="sr-only">
            Monthly operating call history, newest first, with the boldness score behind each call.
          </caption>
          <thead>
            <tr className="border-b border-slate-800/80 text-slate-400">
              <th scope="col" className="py-2 pr-3 font-medium">Month</th>
              <th scope="col" className="py-2 pr-3 font-medium">Call</th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">Boldness</th>
              <th scope="col" className="py-2 text-right font-medium">Change</th>
            </tr>
          </thead>
          <tbody>
            {record.rows.map((row) => (
              <tr key={row.recordDate} className="border-b border-slate-800/40 last:border-0">
                <td className="py-2 pr-3 font-mono text-slate-400">{formatDateUTC(row.recordDate)}</td>
                <td className="py-2 pr-3 text-slate-200">
                  {row.regimeLabel}
                  {row.changed ? (
                    <span className="ml-2 type-badge text-fluid-micro rounded-sm bg-slate-800 px-1.5 py-0.5 text-slate-200">
                      changed
                    </span>
                  ) : null}
                </td>
                <td className="py-2 pr-3 text-right font-mono text-slate-200">
                  {row.boldness.toLocaleString("en-US")}
                </td>
                <td className="py-2 text-right font-mono">
                  {row.boldnessDelta === null ? (
                    <span className="text-slate-600">—</span>
                  ) : (
                    <span
                      className={
                        row.boldnessDelta > 0
                          ? "text-emerald-300"
                          : row.boldnessDelta < 0
                            ? "text-rose-300"
                            : "text-slate-400"
                      }
                    >
                      {row.boldnessDelta > 0 ? "+" : ""}
                      {row.boldnessDelta.toLocaleString("en-US")}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

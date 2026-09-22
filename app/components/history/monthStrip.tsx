import { REGIME_LABELS, isRegimeKey } from "../../../lib/regimePresentation";
import { regimeDataAttribute } from "../../../lib/regimeAccent";

/**
 * The record's answer in one band: every month coloured by the call, the
 * changes marked, the current run annotated. /history used to open with the
 * two-axis phase map, which a first-time reader has to learn before it says
 * anything; this is legible in a second, and the phase map explains it below.
 *
 * Each segment carries `data-regime`, so its colour comes from the same
 * token the page shells use (`--regime-accent`), never a per-component table.
 */
type MonthStripEntry = { recordDate: string; regime: string };

type MonthStripProps = {
  entries: readonly MonthStripEntry[];
  className?: string;
};

const monthLabel = (recordDate: string) =>
  new Date(`${recordDate}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

export const describeCurrentRun = (entries: readonly MonthStripEntry[]) => {
  if (entries.length === 0) return null;
  const sorted = [...entries].sort((a, b) => a.recordDate.localeCompare(b.recordDate));
  const latest = sorted[sorted.length - 1];
  let held = 0;
  for (let i = sorted.length - 1; i >= 0 && sorted[i].regime === latest.regime; i -= 1) held += 1;
  const label = isRegimeKey(latest.regime) ? REGIME_LABELS[latest.regime] : latest.regime;
  return { label, held, since: sorted[sorted.length - held].recordDate, latest: latest.recordDate };
};

export function MonthStrip({ entries, className = "" }: MonthStripProps) {
  const sorted = [...entries].sort((a, b) => a.recordDate.localeCompare(b.recordDate));
  const run = describeCurrentRun(sorted);
  if (!run) return null;
  const changes = sorted.filter((entry, index) => index > 0 && entry.regime !== sorted[index - 1].regime).length;
  return (
    <figure className={`space-y-2 ${className}`.trim()} data-month-strip>
      <p className="sr-only">
        The call by month, {monthLabel(sorted[0].recordDate)} to {monthLabel(run.latest)}: {changes} changes; {run.label} held {run.held} months.
      </p>
      <div className="flex h-6 w-full overflow-hidden rounded-md" aria-hidden="true">
        {sorted.map((entry, index) => {
          const changed = index > 0 && entry.regime !== sorted[index - 1].regime;
          return (
            <span
              key={entry.recordDate}
              data-regime={regimeDataAttribute(entry.regime)}
              className={`h-full flex-1 bg-[var(--regime-accent)] ${changed ? "border-l border-[var(--bg-body)]" : ""}`}
              title={`${monthLabel(entry.recordDate)}: ${isRegimeKey(entry.regime) ? REGIME_LABELS[entry.regime] : entry.regime}`}
            />
          );
        })}
      </div>
      <figcaption className="flex flex-wrap justify-between gap-x-4 text-xs text-slate-400">
        <span>
          {monthLabel(sorted[0].recordDate)} – {monthLabel(run.latest)} · {changes} call {changes === 1 ? "change" : "changes"}
        </span>
        <span className="text-slate-200">
          {run.label}, held {run.held} {run.held === 1 ? "month" : "months"} since {monthLabel(run.since)}
        </span>
      </figcaption>
    </figure>
  );
}

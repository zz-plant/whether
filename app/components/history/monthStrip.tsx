import { REGIME_LABELS, REGIME_SEVERITY_RANK, isRegimeKey } from "../../../lib/regimePresentation";
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
  /* The key. Colour alone named nothing: the month names were tooltips on an
     aria-hidden band, so a sighted reader could not tell which past runs were
     which. Each condition that appears, mildest first, with its month count. */
  const counts = new Map<string, number>();
  for (const entry of sorted) counts.set(entry.regime, (counts.get(entry.regime) ?? 0) + 1);
  const legend = [...counts.entries()].sort(
    ([left], [right]) =>
      (isRegimeKey(left) ? REGIME_SEVERITY_RANK[left] : 99) - (isRegimeKey(right) ? REGIME_SEVERITY_RANK[right] : 99),
  );
  return (
    <figure className={`space-y-2 ${className}`.trim()} data-month-strip>
      <p className="sr-only">
        Conditions by month, {monthLabel(sorted[0].recordDate)} to {monthLabel(run.latest)}: {changes} {changes === 1 ? "change" : "changes"}; {run.label} held {run.held} {run.held === 1 ? "month" : "months"}.
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
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300" aria-label="Months under each condition">
        {legend.map(([regime, months]) => (
          <li key={regime} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              data-regime={regimeDataAttribute(regime)}
              className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--regime-accent)]"
            />
            {isRegimeKey(regime) ? REGIME_LABELS[regime] : regime}
            <span className="tabular-nums text-slate-500">{months} {months === 1 ? "month" : "months"}</span>
          </li>
        ))}
      </ul>
      <figcaption className="flex flex-wrap justify-between gap-x-4 text-xs text-slate-400">
        <span>
          {monthLabel(sorted[0].recordDate)} – {monthLabel(run.latest)} · {changes} {changes === 1 ? "change" : "changes"} in conditions
        </span>
        <span className="text-slate-200">
          {run.label}, held {run.held} {run.held === 1 ? "month" : "months"} since {monthLabel(run.since)}
        </span>
      </figcaption>
    </figure>
  );
}

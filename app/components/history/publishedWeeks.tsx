import Link from "next/link";
import { buildPublishedBriefPath, publishedBriefWeekLabel, type PublishedBrief } from "../../../lib/report/publishedBriefs";
import { getRegimePublicLabel } from "../../../lib/regimePresentation";

const DAY = 86_400_000;

/** The Monday of a date's week, in UTC. */
const mondayOf = (date: string) => {
  const day = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  const offset = (day.getUTCDay() + 6) % 7;
  return day.getTime() - offset * DAY;
};

const shortDate = (time: number) =>
  new Date(time).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/**
 * The published record week by week (docs/design/rebuild-covenant.md): one cell for
 * each week since the first brief, filled in its condition's ink where a brief was
 * published and left open where none was, so the gaps show at a glance. The cells state
 * no reason for an empty week; the list under it names each stretch of them in a line of
 * its own, with the reason where one is recorded (`UNPUBLISHED_WEEKS`,
 * lib/report/publishedBriefs.ts).
 */
export function PublishedWeeks({ briefs }: { briefs: readonly PublishedBrief[] }) {
  if (briefs.length === 0) return null;
  const byWeek = new Map(briefs.map((brief) => [mondayOf(brief.recordDate), brief]));
  const weeks = [...byWeek.keys()].sort((a, b) => a - b);
  const first = weeks.at(0);
  const last = weeks.at(-1);
  if (first === undefined || last === undefined) return null;
  const cells: { time: number; brief?: PublishedBrief }[] = [];
  for (let time = first; time <= last; time += 7 * DAY) cells.push({ time, brief: byWeek.get(time) });
  const empty = cells.filter((cell) => !cell.brief).length;
  return (
    <figure className="space-y-1.5" data-published-weeks>
      <ol className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}>
        {cells.map((cell) => (
          <li key={cell.time} className="min-w-0">
            {cell.brief ? (
              <Link
                href={buildPublishedBriefPath(cell.brief.slug)}
                data-regime={cell.brief.regime}
                title={`Week of ${publishedBriefWeekLabel(cell.brief)}: ${getRegimePublicLabel(cell.brief.regime)}`}
                className="record-week-cell block h-7 hover:outline-2 hover:outline-offset-1 hover:outline-[color:var(--app-text)]"
              >
                <span className="sr-only">
                  Week of {publishedBriefWeekLabel(cell.brief)}: {getRegimePublicLabel(cell.brief.regime)}
                </span>
              </Link>
            ) : (
              <span className="block h-7 border border-dashed border-[color:var(--border-strong)]" title={`Week of ${shortDate(cell.time)}: no brief`}>
                <span className="sr-only">Week of {shortDate(cell.time)}: no brief</span>
              </span>
            )}
          </li>
        ))}
      </ol>
      <figcaption className="flex flex-wrap justify-between gap-x-4 text-xs tabular-nums text-slate-400">
        <span>{shortDate(first)}</span>
        <span>
          One cell a week. {empty === 0 ? "Every week has a brief." : `${empty} of ${cells.length} ${cells.length === 1 ? "week has" : "weeks have"} no brief and stay empty.`}
        </span>
        <span>{shortDate(last)}</span>
      </figcaption>
    </figure>
  );
}

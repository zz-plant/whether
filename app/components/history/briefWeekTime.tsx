import type { ReactNode } from "react";
import { publishedBriefWeekLabel, type PublishedBrief } from "../../../lib/report/publishedBriefs";

/**
 * A published week's date in `<time dateTime>` (docs/seo/quality-gates.md, "Dates are
 * machine-readable"): the Monday the week is named by, as `publishedBriefWeekLabel` prints it
 * (`formatWeekMondayUTC`), so the attribute and the words name the same day.
 */
const briefWeekIso = (brief: Pick<PublishedBrief, "recordDate">) => {
  const date = new Date(`${brief.recordDate.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.valueOf())) return brief.recordDate;
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
};

export function BriefWeekTime({ brief, children }: { brief: Pick<PublishedBrief, "recordDate">; children?: ReactNode }) {
  return <time dateTime={briefWeekIso(brief)}>{children ?? publishedBriefWeekLabel(brief)}</time>;
}

/**
 * A run of weeks with the same guidance, newest first, as `publishedBriefRunLabel` words it
 * ("Week of Nov 9, 2026", "Weeks of Sep 28 – Oct 5, 2026"), each date in its own `<time>`.
 */
export function BriefRunLabel({ run }: { run: readonly Pick<PublishedBrief, "recordDate">[] }) {
  const newest = run.at(0);
  const oldest = run.at(-1);
  if (!newest || !oldest) return null;
  const last = publishedBriefWeekLabel(newest);
  if (run.length === 1) {
    return (
      <>
        Week of <BriefWeekTime brief={newest} />
      </>
    );
  }
  const first = publishedBriefWeekLabel(oldest);
  const year = last.slice(-6);
  return (
    <>
      Weeks of <BriefWeekTime brief={oldest}>{first.endsWith(year) ? first.slice(0, -6) : first}</BriefWeekTime> –{" "}
      <BriefWeekTime brief={newest}>{last}</BriefWeekTime>
    </>
  );
}

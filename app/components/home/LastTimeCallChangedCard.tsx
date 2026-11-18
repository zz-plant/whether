import { ChangeFollowThrough } from "./ChangeFollowThrough";
import { formatMonthLabel } from "../../../lib/timeMachine/monthFormatting";
import { describeAgainstToday, lastTimeVerb, type LastTimeCallChanged } from "../../../lib/report/lastTimeCallChanged";

/**
 * On a week the call changed: the last time it moved this way, what the two
 * scores did over the following three months, and the comparison for those
 * two months. Informed decisions are comparative, and the site had fourteen
 * years of record on offer only to a reader who went looking. Both scores
 * print through the score cell — the later reading, the line the call turns
 * on, and the reading at the change as "last" — so neither is a bare number.
 *
 * Under them, how that month differed from this week: an earlier month is one
 * outcome from one starting point, and "the scores stood here three months on"
 * reads as a forecast to anyone who is not told where they started.
 *
 * Since 2026-11-18 each cell heads a small panel of the months between
 * (`ChangeFollowThrough`): the earlier change's month-ends from the change to three
 * months on, and this week's reading at the change, against the line.
 */
export function LastTimeCallChangedCard({
  record,
  callChangeLines,
}: {
  record: LastTimeCallChanged;
  /** The lines the call turns on, for the two cells' reference. */
  callChangeLines: { tightness: number; riskAppetite: number };
}) {
  const changedAt = formatMonthLabel(record.changedAt.year, record.changedAt.month);
  const after = formatMonthLabel(record.after.year, record.after.month);
  const versus = describeAgainstToday(record);
  return (
    <aside
      data-testid="last-time-call-changed"
      aria-label={`The last time conditions ${lastTimeVerb(record)}`}
      className="space-y-3 border-t border-[color:var(--border-subtle)] pt-4"
    >
      <p className="type-eyebrow">The last time conditions {lastTimeVerb(record)}</p>
      <p className="text-fluid-sm leading-5 text-slate-200">
        <span className="font-semibold text-slate-50">{changedAt}:</span> {record.changedAt.fromLabel} to{" "}
        {record.changedAt.toLabel}. By {after}, {record.monthsLater} months on, the scores stood here.
      </p>
      {/* Two panels packed to the left edge, not one per half of the page: each is
          a cell and a small drawing, and halves left the second one stranded mid-page.
          They wrap on their own widths, so they sit together wherever both fit. */}
      <ChangeFollowThrough record={record} callChangeLines={callChangeLines} />
      <p data-testid="last-time-versus-today" className="max-w-[60ch] text-fluid-sm leading-5 text-slate-300">
        <span className="font-semibold text-slate-100">Against this week:</span> {versus.text}
      </p>
      {/* "Compare Sep 2022 with Dec 2022 →" went to /history/compare, which has redirected
          to /history since the compare view was retired; the panels above draw those
          months, each a link to its month in the time machine (2026-11-18). */}
    </aside>
  );
}

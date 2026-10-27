import { ActionLink } from "../ui/actionLink";
import { ScoreCell } from "../ui/scoreCell";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { regimeSignalLabel } from "../../../lib/report/signalTranslations";
import { formatMonthLabel } from "../../../lib/timeMachine/monthFormatting";
import { buildLastTimeCompareHref, describeAgainstToday, lastTimeVerb, type LastTimeCallChanged } from "../../../lib/report/lastTimeCallChanged";

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
      <p className="text-fluid-xs leading-5 text-slate-200">
        <span className="font-semibold text-slate-50">{changedAt}:</span> {record.changedAt.fromLabel} to{" "}
        {record.changedAt.toLabel}. By {after}, {record.monthsLater} months on, the scores stood here.
      </p>
      {/* Two cells packed to the left edge, not one per half of the page: each is
          three short lines, and halves left the second one stranded mid-page. */}
      <div className="grid gap-x-10 gap-y-3 sm:grid-cols-[max-content_max-content]">
        <ScoreCell
          label={regimeSignalLabel.tightness}
          value={record.tightness.later}
          line={{ value: callChangeLines.tightness, label: DECISION_CONTRACT_LABELS.watch.changeLine }}
          previous={record.tightness.atChange}
          previousLabel={changedAt}
        />
        <ScoreCell
          label={regimeSignalLabel.riskAppetite}
          value={record.riskAppetite.later}
          line={{ value: callChangeLines.riskAppetite, label: DECISION_CONTRACT_LABELS.watch.changeLine }}
          previous={record.riskAppetite.atChange}
          previousLabel={changedAt}
        />
      </div>
      <p data-testid="last-time-versus-today" className="max-w-[64ch] text-fluid-xs leading-5 text-slate-300">
        <span className="font-semibold text-slate-100">Against this week:</span> {versus.text}
      </p>
      <ActionLink href={buildLastTimeCompareHref(record)} variant="inline">
        Compare {changedAt} with {after} →
      </ActionLink>
    </aside>
  );
}

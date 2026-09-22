import { ActionLink } from "../ui/actionLink";
import { ScoreCell } from "../ui/scoreCell";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { regimeSignalLabel } from "../../../lib/report/signalTranslations";
import { formatMonthLabel } from "../../../lib/timeMachine/monthFormatting";
import { buildLastTimeCompareHref, type LastTimeCallChanged } from "../../../lib/report/lastTimeCallChanged";

/**
 * On a week the call changed: the last time it moved this way, what the two
 * scores did over the following three months, and the comparison for those
 * two months. Informed decisions are comparative, and the site had fourteen
 * years of record on offer only to a reader who went looking. Both scores
 * print through the score cell — the later reading, the line the call turns
 * on, and the reading at the change as "last" — so neither is a bare number.
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
  return (
    <aside
      data-testid="last-time-call-changed"
      aria-label="The last time the call moved this way"
      className="space-y-3 border-t border-slate-800/60 pt-4"
    >
      <p className="type-eyebrow">The last time the call moved this way</p>
      <p className="text-fluid-xs leading-5 text-slate-200">
        <span className="font-semibold text-white">{changedAt}:</span> {record.changedAt.fromLabel} to{" "}
        {record.changedAt.toLabel}. By {after}, {record.monthsLater} months on, the scores stood here.
      </p>
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <ScoreCell
          label={regimeSignalLabel.tightness}
          value={record.tightness.later}
          line={{ value: callChangeLines.tightness, label: DECISION_CONTRACT_LABELS.watch.postureFlips }}
          previous={record.tightness.atChange}
          previousLabel={changedAt}
        />
        <ScoreCell
          label={regimeSignalLabel.riskAppetite}
          value={record.riskAppetite.later}
          line={{ value: callChangeLines.riskAppetite, label: DECISION_CONTRACT_LABELS.watch.postureFlips }}
          previous={record.riskAppetite.atChange}
          previousLabel={changedAt}
        />
      </div>
      <ActionLink href={buildLastTimeCompareHref(record)} variant="inline">
        Compare {changedAt} with {after} →
      </ActionLink>
    </aside>
  );
}

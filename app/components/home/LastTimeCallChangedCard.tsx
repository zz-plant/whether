import { ChangeFollowThrough } from "./ChangeFollowThrough";
import { ViewSwitch, ViewSwitchChoices } from "./homeView";
import { buildHomeViewHref } from "../../../lib/report/home/homeSectionModel";
import { COMPARE_PARAM, describeAgainstToday, type LastTimeCallChanged } from "../../../lib/report/lastTimeCallChanged";

/** Where a compare link lands on a full load: the card, not the top of the section. */
const CARD_ID = "last-change";

/** The panels and the sentence for one change: what a choice in the row swaps. */
function Comparison({ record, callChangeLines }: { record: LastTimeCallChanged; callChangeLines: { tightness: number; riskAppetite: number } }) {
  return (
    <div className="space-y-3" data-compare-view={record.changedAt.recordDate.slice(0, 7)}>
      {/* Two panels packed to the left edge, not one per half of the page: each is
          a cell and a small drawing, and halves left the second one stranded mid-page.
          They wrap on their own widths, so they sit together wherever both fit. */}
      <ChangeFollowThrough record={record} callChangeLines={callChangeLines} />
      <p data-testid="last-time-versus-today" className="max-w-[60ch] text-fluid-sm leading-5 text-slate-300">
        {describeAgainstToday(record).text}
      </p>
    </div>
  );
}

/**
 * On a week the call changed: this week's change set beside an earlier one, what the two
 * scores did over the following three months, and how that change differed from this
 * week's. Informed decisions are comparative, and the site had fourteen years of record
 * on offer only to a reader who went looking. Both scores print through the score cell —
 * the later reading, the line the call turns on, and the reading at the change as "last" —
 * so neither is a bare number.
 *
 * Under them, how that month differed from this week, answer first ("Tightened both
 * times", "The other way"): an earlier month is one outcome from one starting point, and
 * "the scores stood here three months on" reads as a forecast to anyone who is not told
 * where they started.
 *
 * Since 2026-11-18 each cell heads a small panel of the months between
 * (`ChangeFollowThrough`), and a row of links over the panels names every change in
 * conditions on the record, "Sep 2022 · Stormy to Freezing", the last one the same way as
 * this week's marked by default. A link is a view of the page (`?compare=2022-09`): the
 * server renders each change's panels and sentence from the one walk
 * (`findCallChangeComparisons`), and a click shows another in place (`ViewSwitch`), so a
 * copied link opens on it and no choice reloads the page. The row took the place of the
 * eyebrow ("The last time conditions tightened"), the sentence that named the change and
 * its month three on (the chosen link and the panels' axis say both), and the section's
 * "Last changes:" line, which listed the same months.
 */
export function LastTimeCallChangedCard({
  record,
  comparisons,
  callChangeLines,
  query,
}: {
  /** The change the page was rendered on: `?compare=`'s, else the last one the same way. */
  record: LastTimeCallChanged;
  /** Every change's card, for switching in place; without it only `record` is drawn, and the links reload the page. */
  comparisons?: { byKey: Readonly<Record<string, LastTimeCallChanged>>; defaultKey: string } | null;
  /** The lines the call turns on, for the two cells' reference. */
  callChangeLines: { tightness: number; riskAppetite: number };
  /** The page's query, so a compare link keeps the rest of the view. */
  query?: Readonly<Record<string, string | undefined>>;
}) {
  const shownKey = record.changedAt.recordDate.slice(0, 7);
  const byKey = comparisons?.byKey ?? { [shownKey]: record };
  const defaultKey = comparisons?.defaultKey ?? record.choices.find((choice) => choice.lastSameWay)?.key ?? shownKey;
  const known = Object.keys(byKey);
  /* What the server drew, as the key's value: null for the default. */
  const initial = shownKey === defaultKey ? null : shownKey;
  return (
    <aside
      id={CARD_ID}
      data-testid="last-time-call-changed"
      aria-labelledby={`${CARD_ID}-question`}
      className="space-y-3 border-t border-[color:var(--border-subtle)] pt-4"
    >
      <p id={`${CARD_ID}-question`} className="type-eyebrow">Like which time?</p>
      {/* The default, the last change the same way, carries no key: its link is the plain page. */}
      <ViewSwitchChoices
        param={COMPARE_PARAM}
        initial={initial}
        fallback={defaultKey}
        known={known}
        labelledBy={`${CARD_ID}-question`}
        choices={record.choices
          .filter((choice) => known.includes(choice.key))
          .map((choice) => ({
            value: choice.key === defaultKey ? null : choice.key,
            href: buildHomeViewHref(query, { [COMPARE_PARAM]: choice.key === defaultKey ? null : choice.key }, CARD_ID),
            /* The month over the change, so two sit side by side on a phone; seven
               one-line labels stacked seven deep there. */
            label: (
              <span className="flex flex-col items-start leading-tight">
                <time dateTime={choice.key}>{choice.month}</time>
                <span className="text-xs font-normal">{choice.change}</span>
              </span>
            ),
            name: `Compare this week with ${choice.month}, ${choice.change}`,
          }))}
      />
      <ViewSwitch
        param={COMPARE_PARAM}
        initial={initial}
        fallback={defaultKey}
        views={Object.fromEntries(
          Object.entries(byKey).map(([key, change]) => [key, <Comparison key={key} record={change} callChangeLines={callChangeLines} />]),
        )}
      />
      {/* "Compare Sep 2022 with Dec 2022 →" went to /history/compare, which has redirected
          to /history since the compare view was retired; the panels above draw those
          months, each a link to its month in the time machine (2026-11-18). */}
    </aside>
  );
}

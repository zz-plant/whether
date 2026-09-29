import Link from "next/link";
import { ReportSection } from "../../components/reportSection";
import { TrustStrip, type TrustStripProps } from "../../components/trustStrip";
import { ScoreCell } from "../../components/ui/scoreCell";
import { ScoreLadder } from "../../components/ui/scoreLadder";
import { BoundedValue } from "../../components/ui/boundedValue";
import { ActionLink } from "../../components/ui/actionLink";
import { toRoute } from "../../../lib/navigation/routeType";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import type { CallLineLadder, SignalReferenceRow } from "../../../lib/report/evidenceReaderModel";
import { comparisonBasis, type ComparisonBasis } from "../../../lib/report/comparisonBasis";
import { buildSignalsFocusHref, focusTabs, type FocusTab } from "../evidenceQueryState";

/**
 * The first three of the evidence page's four sections, in the order a reader
 * answers their questions: what the call is, what moved, and how close the
 * scores sit to the lines that would change it. The instruments — charts, the
 * line editor, the month picker — are the fourth, in `evidenceInstruments.tsx`.
 *
 * What these replaced (2026-09-22): a decision summary whose "Main pressure"
 * cell restated the first entry of a five-queue "checks" section two screens
 * down; a "Reading depth" radio that gated the charts and the month picker
 * behind a second page; three gauge cards drawing each signal against its line
 * on a hand-built meter while the answer pages printed the same scores bare;
 * and a "Top drivers" list that was the same queue a third time. One table of
 * every signal now, drawn with the same `ScoreCell` the answer pages use, and
 * the focus tabs filter it instead of opening a section of their own.
 */

const formatValue = (row: SignalReferenceRow, value: number) =>
  `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(row.units.suffix ? 2 : 1)}${row.units.suffix ?? ""}`;

const TONE_CLASS: Record<SignalReferenceRow["direction"]["tone"], string> = {
  easing: "text-semantic-easing-fg",
  tightening: "text-semantic-tightening-fg",
  unchanged: "text-slate-400",
};

/**
 * The movement tier's one shape: from → to, never a bare signed number. Warm
 * for a move toward pressure, cool for a move away from it, whichever way the
 * number itself went. A signal with no recorded comparison shows the sentence
 * that is true of it rather than an arrow.
 */
const DeltaChip = ({ row }: { row: SignalReferenceRow }) => {
  if (row.value === null) return <span className="text-slate-500">—</span>;
  if (row.previous === null) {
    return <span className={`text-xs ${TONE_CLASS[row.direction.tone]}`}>{row.direction.label}</span>;
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border border-[var(--border-default)] px-1.5 py-0.5 text-xs tabular-nums ${TONE_CLASS[row.direction.tone]}`}
      title={row.direction.label}
    >
      <span className="text-slate-400">{formatValue(row, row.previous)}</span>
      <span aria-hidden="true">→</span>
      <span className="sr-only">to</span>
      <span className="font-semibold">{formatValue(row, row.value)}</span>
      <span className="sr-only">{row.direction.label}</span>
    </span>
  );
};

export const SignalsCallSection = ({
  callLine,
  trustStrip,
}: {
  callLine: string;
  trustStrip: Omit<TrustStripProps, "href" | "className">;
}) => (
  <ReportSection id="decision-summary" title="What this means now">
    <p className="text-base font-semibold text-slate-100 sm:text-lg">{callLine}</p>
    <TrustStrip {...trustStrip} href="/trust" />
  </ReportSection>
);

type ChangedSignalRow = SignalReferenceRow & { note: string | null };

export const SignalsWhatChangedSection = ({
  rows,
  activeFocus,
  focusLabelByTab,
  focusInstruments,
  searchParams,
  basis = comparisonBasis(),
}: {
  rows: ChangedSignalRow[];
  activeFocus: FocusTab;
  focusLabelByTab: Record<FocusTab, string>;
  focusInstruments: Array<{ label: string; why: string; href: string }>;
  searchParams?: Record<string, string | undefined>;
  /** The earlier reading the moves are measured against; "last week" when the week does not date it. */
  basis?: ComparisonBasis;
}) => {
  const showNotes = rows.some((row) => row.note);
  return (
    <ReportSection id="what-changed" title="What changed">
      {/* Filters on the table below, carried in the URL so a shared link shows
          the same rows. They used to open a section of their own. */}
      <nav aria-label="Start with these checks" className="flex flex-wrap gap-2">
        {focusTabs.map((focus) => {
          const isActive = focus === activeFocus;
          return (
            <ActionLink
              key={focus}
              variant="pill"
              href={toRoute(buildSignalsFocusHref(searchParams, focus))}
              aria-current={isActive ? "page" : undefined}
              className={isActive ? undefined : "text-slate-300"}
            >
              {focusLabelByTab[focus]}
            </ActionLink>
          );
        })}
      </nav>
      {/* A table from sm up; below it each row restacks — the signal and its
          move on one line, the reading against its line under them — because
          three columns clipped the score cells off a phone's right edge. */}
      <div className="sm:overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm max-sm:block sm:min-w-[36rem]">
          <caption className="sr-only">{`Every signal this week, against its line and ${basis.reference}`}</caption>
          <thead className="max-sm:hidden">
            <tr className="border-b border-slate-800/80 text-xs text-slate-400">
              <th scope="col" className="py-2 pr-3 font-medium">Signal</th>
              <th scope="col" className="py-2 pr-3 font-medium">{`Since ${basis.reference}`}</th>
              <th scope="col" className="py-2 pr-3 font-medium">Against its line</th>
              {showNotes ? <th scope="col" className="py-2 pr-3 font-medium">Why it matters</th> : null}
            </tr>
          </thead>
          <tbody className="max-sm:block">
            {rows.map((row) => (
              <tr
                key={row.key}
                id={row.key}
                className="border-b border-slate-800/50 align-top max-sm:grid max-sm:grid-cols-[1fr_auto] max-sm:gap-x-3 max-sm:gap-y-2 max-sm:py-3"
                data-signal={row.key}
              >
                <th scope="row" className="py-2.5 pr-3 font-semibold text-slate-100 max-sm:p-0">
                  {row.watchHref ? (
                    <Link href={toRoute(row.watchHref)} className="underline decoration-slate-600 underline-offset-4 hover:text-white">
                      {row.label}
                    </Link>
                  ) : (
                    row.label
                  )}
                  {row.kindLabel ? <span className="block text-xs font-normal text-slate-500">{row.kindLabel}</span> : null}
                </th>
                <td className="py-2.5 pr-3 max-sm:p-0">
                  <DeltaChip row={row} />
                  {/* What the score's move is made of. The chip says how far it
                      went; this says which inputs took it there, and that the
                      earlier score was built from rates alone. */}
                  {row.movement ? (
                    <p className="mt-1.5 max-w-[18rem] text-pretty text-xs leading-5 text-slate-400" data-movement={row.key}>
                      {row.movement}
                    </p>
                  ) : null}
                </td>
                <td className="py-2.5 pr-3 max-sm:col-span-2 max-sm:p-0">
                  {row.value === null ? (
                    <span className="text-slate-500">—</span>
                  ) : (
                    /* "This week", not the signal's name: the row header one
                       column over already says it, so every row printed
                       "Funding pressure" twice and on a phone the two sat
                       two lines apart. It pairs with the earlier reading's date below it. */
                    <ScoreCell
                      label="This week"
                      value={row.value}
                      line={row.line}
                      previous={row.previous}
                      previousLabel={row.previousLabel}
                      units={row.units}
                    />
                  )}
                </td>
                {showNotes ? (
                  <td className={`py-2.5 pr-3 text-slate-300 max-sm:col-span-2 max-sm:p-0 max-sm:text-xs ${row.note ? "" : "max-sm:hidden"}`.trim()}>
                    {row.note ?? <span className="text-slate-500">—</span>}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {focusInstruments.length > 0 ? (
        <ul className="space-y-1 text-sm text-slate-300" aria-label="Also check">
          {focusInstruments.map((instrument) => (
            <li key={instrument.href}>
              <a href={instrument.href} className="font-semibold text-slate-100 underline decoration-slate-600 underline-offset-4 hover:text-white">
                {instrument.label}
              </a>
              {" — "}
              {instrument.why}
            </li>
          ))}
        </ul>
      ) : null}
    </ReportSection>
  );
};

export const SignalsCallLinesSection = ({
  ladders,
  triggerCondition,
  reversalCondition,
  showMicroDecisionRows,
}: {
  ladders: CallLineLadder[];
  triggerCondition: string;
  reversalCondition: string;
  showMicroDecisionRows: boolean;
}) => {
  /* One `<dl>` for both cases. The split rows and the plain rows were the same
     markup written twice, differing only in whether the sentence went through
     `BoundedValue`. */
  const renderCondition = (value: string) =>
    showMicroDecisionRows ? <BoundedValue>{value}</BoundedValue> : value;
  return (
    <ReportSection id="call-lines" title={DECISION_CONTRACT_LABELS.watch.flipWatch}>
      <div className="grid gap-6 md:grid-cols-2">
        {ladders.map((ladder) => (
          <ScoreLadder
            key={ladder.key}
            label={ladder.label}
            value={ladder.value}
            previous={ladder.previous}
            previousLabel={ladder.previousLabel}
            lines={ladder.lines}
          />
        ))}
      </div>
      {/* Was two tinted cards nested inside this card, inside the section
          card — three containment levels for two sentences. Labelled rows
          carry the same distinction with one level, and the hue now sits on
          the label rather than on a box around it. */}
      <dl className="space-y-1.5 text-sm text-slate-200">
        <div className="flex flex-wrap gap-x-2">
          <dt className="shrink-0 font-semibold text-semantic-caution-fg">{DECISION_CONTRACT_LABELS.threshold.pauseIf}:</dt>
          <dd className="min-w-0">{renderCondition(triggerCondition)}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="shrink-0 font-semibold text-semantic-easing-fg">{DECISION_CONTRACT_LABELS.reversal.resumeWhen}:</dt>
          <dd className="min-w-0">{renderCondition(reversalCondition)}</dd>
        </div>
      </dl>
    </ReportSection>
  );
};

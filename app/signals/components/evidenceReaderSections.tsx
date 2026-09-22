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
}: {
  rows: ChangedSignalRow[];
  activeFocus: FocusTab;
  focusLabelByTab: Record<FocusTab, string>;
  focusInstruments: Array<{ label: string; why: string; href: string }>;
  searchParams?: Record<string, string | undefined>;
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
              className={isActive ? "border-sky-300/80" : "text-slate-300"}
            >
              {focusLabelByTab[focus]}
            </ActionLink>
          );
        })}
      </nav>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
          <caption className="sr-only">Every signal this week, against its line and last week</caption>
          <thead>
            <tr className="border-b border-slate-800/80 text-xs text-slate-400">
              <th scope="col" className="py-2 pr-3 font-medium">Signal</th>
              <th scope="col" className="py-2 pr-3 font-medium">Since last week</th>
              <th scope="col" className="py-2 pr-3 font-medium">Against its line</th>
              {showNotes ? <th scope="col" className="py-2 pr-3 font-medium">Why it matters</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} id={row.key} className="border-b border-slate-800/50 align-top" data-signal={row.key}>
                <th scope="row" className="py-2.5 pr-3 font-semibold text-slate-100">
                  {row.watchHref ? (
                    <Link href={toRoute(row.watchHref)} className="underline decoration-slate-600 underline-offset-4 hover:text-white">
                      {row.label}
                    </Link>
                  ) : (
                    row.label
                  )}
                  {row.kindLabel ? <span className="block text-xs font-normal text-slate-500">{row.kindLabel}</span> : null}
                </th>
                <td className="py-2.5 pr-3">
                  <DeltaChip row={row} />
                </td>
                <td className="py-2.5 pr-3">
                  {row.value === null ? (
                    <span className="text-slate-500">—</span>
                  ) : (
                    <ScoreCell label={row.label} value={row.value} line={row.line} previous={row.previous} units={row.units} />
                  )}
                </td>
                {showNotes ? <td className="py-2.5 pr-3 text-slate-300">{row.note ?? <span className="text-slate-500">—</span>}</td> : null}
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
          <ScoreLadder key={ladder.key} label={ladder.label} value={ladder.value} previous={ladder.previous} lines={ladder.lines} />
        ))}
      </div>
      {/* Was two tinted cards nested inside this card, inside the section
          card — three containment levels for two sentences. Labelled rows
          carry the same distinction with one level, and the hue now sits on
          the label rather than on a box around it. */}
      <dl className="space-y-1.5 text-sm text-slate-200">
        <div className="flex flex-wrap gap-x-2">
          <dt className="shrink-0 font-semibold text-semantic-caution-fg">Wrong if:</dt>
          <dd className="min-w-0">{renderCondition(triggerCondition)}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="shrink-0 font-semibold text-semantic-easing-fg">Safe again when:</dt>
          <dd className="min-w-0">{renderCondition(reversalCondition)}</dd>
        </div>
      </dl>
    </ReportSection>
  );
};

import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { regimeSignalLabel } from "../../../lib/report/signalTranslations";
import type { ReportData } from "../../../lib/report/reportData";
import type { WeeklyBriefSnapshot } from "../../../lib/report/weeklyBriefSnapshot";
import type { MacroSeriesId, MacroSeriesReading, TreasuryYields } from "../../../lib/types";
import { DECISION_SLOT_TONE } from "../../trust/frameworkSection";

/**
 * One column of the comparison, rendered twice. The two sides used to be ~85
 * duplicated lines each, and small multiples only compare when they are drawn
 * with one encoding — the same rows, the same faces, the same order — so the
 * column is one component and the page passes it a period.
 */

const getCurveSpread = (yields: TreasuryYields | undefined) =>
  typeof yields?.tenYear === "number" && typeof yields?.twoYear === "number"
    ? yields.tenYear - yields.twoYear
    : null;

export const findMacroValue = (series: MacroSeriesReading[] | undefined, id: MacroSeriesId) => {
  const reading = series?.find((entry) => entry.id === id);
  return typeof reading?.value === "number" ? reading.value : null;
};

const formatPercent = (value: number | null, digits = 2) =>
  value === null ? "N/A" : `${value.toFixed(digits)}%`;

const SignalRow = ({ label, value }: { label: string; value: string }) => (
  <tr className="border-b border-slate-800/50 last:border-0">
    <td className="py-2.5 font-medium text-slate-400">{label}</td>
    <td className="py-2.5 text-right font-semibold tabular-nums text-slate-200">{value}</td>
  </tr>
);

export function ComparePeriodColumn({
  snapshot,
  report,
  label,
}: {
  snapshot: WeeklyBriefSnapshot;
  report: ReportData;
  label: string;
}) {
  const summary = snapshot.weeklyDecisionCardModel.decision.weeklyLeadershipSummary;
  const status = snapshot.weeklyDecisionCardModel.status;
  const scores = report.assessment.scores;
  const spread = getCurveSpread(report.treasury.yields);
  const periodNoun = label.toLowerCase();

  return (
    <div className="space-y-6">
      <div className="weather-panel p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="type-eyebrow">{label}</p>
          <span className="text-xs tabular-nums text-slate-400">{report.recordDateLabel}</span>
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-100">
          {status.postureWithStageLabel || status.postureLabel}
        </h2>
        <p className="mt-2 text-sm italic text-slate-300">&ldquo;{summary.shorthandLine}&rdquo;</p>
      </div>

      <div className="weather-panel space-y-4 p-6">
        <h3 className="type-eyebrow">Rules in {periodNoun}</h3>
        <div className="space-y-2">
          <p className="text-sm">
            <span className="font-medium text-slate-400">Hiring window:</span>{" "}
            <span className="font-semibold text-slate-100">{summary.hiringWindow}</span>
          </p>
          <p className="text-sm">
            <span className="font-medium text-slate-400">Expansion pace:</span>{" "}
            <span className="font-semibold text-slate-100">{summary.expansionWindow}</span>
          </p>
          <p className="text-sm">
            <span className="font-medium text-slate-400">Fundraising window:</span>{" "}
            <span className="font-semibold text-slate-100">{summary.raiseWindow}</span>
          </p>
        </div>

        <dl className="space-y-3 border-t border-slate-800/80 pt-4">
          <div>
            <dt className={`text-fluid-xs font-semibold ${DECISION_SLOT_TONE.action}`}>
              {DECISION_CONTRACT_LABELS.action.actionNow}
            </dt>
            <dd className="mt-1 text-sm text-slate-200">{snapshot.weeklyCall.actionNow}</dd>
          </div>
          <div>
            <dt className={`text-fluid-xs font-semibold ${DECISION_SLOT_TONE.threshold}`}>
              {DECISION_CONTRACT_LABELS.threshold.pauseIf}
            </dt>
            <dd className="mt-1 text-sm text-slate-200">{snapshot.weeklyCall.pauseIf}</dd>
          </div>
          <div>
            <dt className={`text-fluid-xs font-semibold ${DECISION_SLOT_TONE.reversal}`}>
              {DECISION_CONTRACT_LABELS.reversal.changeCourseIf}
            </dt>
            <dd className="mt-1 text-sm text-slate-200">{snapshot.weeklyCall.changeCourseIf}</dd>
          </div>
        </dl>
      </div>

      <div className="weather-panel p-6">
        <h3 className="type-eyebrow mb-4">Signals in {periodNoun}</h3>
        <table className="w-full text-left text-sm">
          <tbody>
            <SignalRow label="Funding pressure" value={scores.tightness.toFixed(1)} />
            <SignalRow label="Risk appetite" value={scores.riskAppetite.toFixed(1)} />
            <SignalRow
              label={`${regimeSignalLabel.baseRate} (1M/3M)`}
              value={scores.baseRate !== undefined ? formatPercent(scores.baseRate) : "N/A"}
            />
            <SignalRow label="Recession warning gauge (10Y−2Y)" value={formatPercent(spread)} />
            <SignalRow
              label="Corporate borrowing premium (BBB)"
              value={formatPercent(findMacroValue(report.macroSeries, "BBB_CREDIT_SPREAD"))}
            />
            <SignalRow
              label="Inflation (CPI, year over year)"
              value={formatPercent(findMacroValue(report.macroSeries, "CPI_YOY"))}
            />
            <SignalRow
              label="Unemployment rate"
              value={formatPercent(findMacroValue(report.macroSeries, "UNEMPLOYMENT_RATE"), 1)}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}

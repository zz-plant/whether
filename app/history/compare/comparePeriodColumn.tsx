import { DECISION_CONTRACT_LABELS, describeMacroNotOnRecord } from "../../../lib/report/reportCopy";
import { weeklyCallChangeLines } from "../../../lib/report/weeklyCallContract";
import { decisionAreaLabel, decisionAreaOrder } from "../../../lib/report/boundedDecisionRules";
import { buildHomeAreaRows, describeAreaPauseStatus } from "../../../lib/report/home/homeSectionModel";
import {
  classifyScoreBand,
  compositeSignalScales,
  regimeSignalLabel,
  type CompositeSignalKey,
} from "../../../lib/report/signalTranslations";
import type { ReportData } from "../../../lib/report/reportData";
import type { WeeklyBriefSnapshot } from "../../../lib/report/weeklyBriefSnapshot";
import type { MacroSeriesId, MacroSeriesReading, TreasuryYields } from "../../../lib/types";
import { DECISION_SLOT_TONE } from "../../about/methodSection";

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

const formatPercent = (value: number | null, digits = 2, missing = "N/A") =>
  value === null ? missing : `${value.toFixed(digits)}%`;

const SignalRow = ({ label, value, meaning }: { label: string; value: string; meaning?: string }) => (
  <tr className="border-b border-slate-800/50 last:border-0">
    <td className="py-2.5 font-medium text-slate-400">
      {label}
      {meaning ? <span className="mt-0.5 block text-fluid-xs font-normal text-slate-500">{meaning}</span> : null}
    </td>
    <td className="py-2.5 text-right font-semibold tabular-nums text-slate-200">{value}</td>
  </tr>
);

/*
 * A score out of 100 carries its scale and what that reading means, the way
 * `formatSignalReading` states it: "72.4" beside "Funding pressure" was only
 * readable to someone who already knew which end of the scale is bad.
 */
const ScoreRow = ({ signalKey, score }: { signalKey: CompositeSignalKey; score: number }) => {
  const scale = compositeSignalScales[signalKey];
  const band = classifyScoreBand(score);
  const anchor = band === "high" ? scale.highAnchor : band === "low" ? scale.lowAnchor : scale.midAnchor;
  const meaning = `${anchor.charAt(0).toUpperCase()}${anchor.slice(1)}.`;
  return <SignalRow label={regimeSignalLabel[signalKey]} value={`${Math.round(score)}/100`} meaning={meaning} />;
};

export function ComparePeriodColumn({
  snapshot,
  report,
  label,
}: {
  snapshot: WeeklyBriefSnapshot;
  report: ReportData;
  label: string;
}) {
  const { decision, status } = snapshot.weeklyDecisionCardModel;
  const summary = decision.weeklyLeadershipSummary;
  const scores = report.assessment.scores;
  const spread = getCurveSpread(report.treasury.yields);
  /* The macro series go back about three months; a replayed month further back
     has no value of its own, and says so rather than borrowing this week's. */
  const macroMissing = report.historicalSelection ? describeMacroNotOnRecord() : "N/A";
  /*
   * Each area against its own pause line, in the site's one area order, from the
   * rows and words the homepage and /resolve print. These rows were "Hiring
   * window", "Expansion pace" and "Fundraising window": words graded against
   * cutoffs no rule publishes (risk appetite 45/65 for expansion), so a Freezing
   * week whose guidance said "freeze new commitments" printed "Expansion pace:
   * Open" at risk appetite 48. "Pace" is also the word for speed up / hold / slow
   * down. Read from the period's published lines, the row cannot disagree with
   * the rules beside it.
   */
  const areaRows = buildHomeAreaRows({
    actionStripItems: decision.actionStripItems,
    decisionRules: decision.decisionRules ?? [],
    movement: null,
    scores: { tightness: scores.tightness, riskAppetite: scores.riskAppetite },
  });
  const areaStanding = decisionAreaOrder.map((area) => {
    const row = areaRows.find((candidate) => candidate.area === area);
    return { area, text: (row ? describeAreaPauseStatus(row)?.text : undefined) ?? "—" };
  });

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
        {/* The latitude's move, about the number: not quoted, since it is no
            longer a sentence about the guidance to cite. */}
        <p className="mt-2 text-sm text-slate-300">{summary.shorthandLine}</p>
      </div>

      <div className="weather-panel space-y-4 p-6">
        {/* The label as given: lowercasing it printed "Rules in period a". */}
        <h3 className="type-eyebrow">Rules in {label}</h3>
        <div className="space-y-2">
          {areaStanding.map(({ area, text }) => (
            <p key={area} className="text-sm">
              <span className="font-medium text-slate-400">{decisionAreaLabel(area)}:</span>{" "}
              <span className="font-semibold text-slate-100">{text}</span>
            </p>
          ))}
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
          {weeklyCallChangeLines(snapshot.weeklyCall).map(({ label, value }) => (
            <div key={label}>
              <dt className={`text-fluid-xs font-semibold ${DECISION_SLOT_TONE.reversal}`}>{label}</dt>
              <dd className="mt-1 text-sm text-slate-200">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="weather-panel p-6">
        <h3 className="type-eyebrow mb-4">Signals in {label}</h3>
        <table className="w-full text-left text-sm">
          <tbody>
            <ScoreRow signalKey="tightness" score={scores.tightness} />
            <ScoreRow signalKey="riskAppetite" score={scores.riskAppetite} />
            <SignalRow
              label={regimeSignalLabel.baseRate}
              value={scores.baseRate !== undefined ? formatPercent(scores.baseRate) : "N/A"}
            />
            <SignalRow label={`${regimeSignalLabel.curveSlope} (10-year minus 2-year rate)`} value={formatPercent(spread)} />
            <SignalRow
              label="Corporate borrowing premium"
              meaning="Extra interest mid-grade companies pay over the government."
              value={formatPercent(findMacroValue(report.macroSeries, "BBB_CREDIT_SPREAD"), 2, macroMissing)}
            />
            <SignalRow
              label="Inflation, year over year"
              value={formatPercent(findMacroValue(report.macroSeries, "CPI_YOY"), 2, macroMissing)}
            />
            <SignalRow
              label="Unemployment rate"
              value={formatPercent(findMacroValue(report.macroSeries, "UNEMPLOYMENT_RATE"), 1, macroMissing)}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}

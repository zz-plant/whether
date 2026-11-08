import { getRegimePublicLabel } from "../../../lib/regimePresentation";
import { getTimeMachineRegimeSeries, getTimeMachineSnapshots } from "../../../lib/timeMachine/timeMachineCache";
import { evaluateRegime } from "../../../lib/regimeEngine";
import { formatMonthLabel } from "../../../lib/timeMachine/monthFormatting";
import { Fact, FactList } from "../../components/ui/factList";
import { ScoreLadder, buildLadderLines } from "../../components/ui/scoreLadder";
import {
  decisionAreaLabel,
  decisionAreaOrder,
  ruleMetricLabel,
  type RuleConditionMetric,
} from "../../../lib/report/boundedDecisionRules";
import { buildHomeAreaRows, describeAreaPauseStatus } from "../../../lib/report/home/homeSectionModel";
import { buildSharedCorridorRails } from "../../../lib/report/operatingCalls";
import { BORROWING_PREMIUM_MEANING, ComparePeriodColumn, findMacroValue } from "./comparePeriodColumn";
import { DateSelector, type DateOption } from "./DateSelector";
import { isSavedCopy } from "../../../lib/report/provenanceStatus";
import { describeMacroNotOnRecord } from "../../../lib/report/reportCopy";
import {
  loadCompareData,
  type CompareDataResult,
  type CompareSearchParams,
} from "../../../lib/report/compareDataLoader";

export async function ComparePanel({
  searchParams,
  initialResult,
}: {
  searchParams?: Partial<CompareSearchParams>;
  initialResult?: CompareDataResult;
}) {
  const result = initialResult ?? (await loadCompareData(searchParams));

  const governedRegimes = new Map(
    getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER).map((entry) => [entry.recordDate, entry.regime]),
  );
  const snapshots = getTimeMachineSnapshots();
  const dateOptions: DateOption[] = snapshots
    .map((s) => {
      const regime = governedRegimes.get(s.record_date) ?? evaluateRegime(s).regime;
      return {
        year: s.year,
        month: s.month,
        label: `${formatMonthLabel(s.year, s.month)} · ${getRegimePublicLabel(regime)}`,
      };
    })
    .reverse();

  const yearA = result.yearA;
  const monthA = result.monthA;
  const yearB = result.yearB;
  const monthB = result.monthB;
  const searchA = yearA && monthA ? { year: String(yearA), month: String(monthA) } : undefined;

  const selectorBlock = (
    <div id="compare-selectors" className="weather-panel weather-switch gap-6 [--col-min:16rem]">
      <DateSelector
        label="Period A"
        paramPrefix="A"
        options={dateOptions}
        currentYear={searchA ? yearA : undefined}
        currentMonth={searchA ? monthA : undefined}
        currentWeekLabel="This week"
      />
      <DateSelector
        label="Period B"
        paramPrefix="B"
        options={dateOptions}
        currentYear={yearB}
        currentMonth={monthB}
      />
    </div>
  );

  if (!result.ok) {
    return (
      <div className="space-y-6">
        {selectorBlock}
        <div
          role="alert"
          className="weather-panel space-y-2 border border-amber-600/40 bg-amber-950/20 p-6 text-slate-200"
        >
          <p className="type-eyebrow text-amber-400">Comparison unavailable</p>
          <h2 className="type-section text-slate-100">Unable to load comparison</h2>
          <p className="text-sm text-slate-300">
            {result.error || "The selected periods could not be loaded. Please choose another month above."}
          </p>
        </div>
      </div>
    );
  }

  const { snapshot: snapA } = result.snapshotResultA;
  const { snapshot: snapB } = result.snapshotResultB;

  const reportA = snapA.reportData;
  const reportB = snapB.reportData;

  const bbbA = findMacroValue(reportA.macroSeries, "BBB_CREDIT_SPREAD");
  const bbbB = findMacroValue(reportB.macroSeries, "BBB_CREDIT_SPREAD");
  const bbbMissing = [
    bbbA === null ? `Period A (${reportA.recordDateLabel})` : null,
    bbbB === null ? `Period B (${reportB.recordDateLabel})` : null,
  ].filter((entry): entry is string => entry !== null);
  const bbbDetail =
    bbbA !== null && bbbB !== null
      ? BORROWING_PREMIUM_MEANING
      : `${BORROWING_PREMIUM_MEANING} ${describeMacroNotOnRecord(bbbMissing.join(" or "))}.`;

  const scoresA = reportA.assessment.scores;
  const railsA = buildSharedCorridorRails(reportA.actionStripItems ?? [], scoresA);
  const ladderFor = (metric: RuleConditionMetric, callChange: number) => {
    const rail = railsA.find((candidate) => candidate.metric === metric);
    return {
      label: ruleMetricLabel[metric],
      value: scoresA[metric],
      previous: reportB.assessment.scores[metric],
      lines: buildLadderLines({ pause: rail?.guardrail, resume: rail?.clearsAt, callChange }),
    };
  };
  const ladders = [
    ladderFor("tightness", reportA.assessment.thresholds.tightnessRegime),
    ladderFor("riskAppetite", reportA.assessment.thresholds.riskAppetiteRegime),
  ];

  const isFallback = isSavedCopy(reportA.treasury);

  // Compute changed rules between Period A and Period B
  const areaRowsA = buildHomeAreaRows({
    actionStripItems: snapA.weeklyDecisionCardModel.decision.actionStripItems,
    decisionRules: snapA.weeklyDecisionCardModel.decision.decisionRules ?? [],
    movement: null,
    scores: { tightness: reportA.assessment.scores.tightness, riskAppetite: reportA.assessment.scores.riskAppetite },
  });
  const areaRowsB = buildHomeAreaRows({
    actionStripItems: snapB.weeklyDecisionCardModel.decision.actionStripItems,
    decisionRules: snapB.weeklyDecisionCardModel.decision.decisionRules ?? [],
    movement: null,
    scores: { tightness: reportB.assessment.scores.tightness, riskAppetite: reportB.assessment.scores.riskAppetite },
  });

  type ChangedRule = {
    label: string;
    was: string;
    became: string;
  };

  const changedRules: ChangedRule[] = [];

  for (const area of decisionAreaOrder) {
    const rowA = areaRowsA.find((candidate) => candidate.area === area);
    const rowB = areaRowsB.find((candidate) => candidate.area === area);
    const standingA = rowA ? describeAreaPauseStatus(rowA) : undefined;
    const standingB = rowB ? describeAreaPauseStatus(rowB) : undefined;

    if (standingA && standingB && (standingA.text !== standingB.text || standingA.state !== standingB.state)) {
      changedRules.push({
        label: decisionAreaLabel(area),
        was: standingB.text,
        became: standingA.text,
      });
    }
  }

  if (snapA.weeklyCall.actionNow !== snapB.weeklyCall.actionNow) {
    changedRules.push({
      label: "Action",
      was: snapB.weeklyCall.actionNow,
      became: snapA.weeklyCall.actionNow,
    });
  }

  if (snapA.weeklyCall.pauseIf !== snapB.weeklyCall.pauseIf) {
    changedRules.push({
      label: "Pause threshold",
      was: snapB.weeklyCall.pauseIf,
      became: snapA.weeklyCall.pauseIf,
    });
  }

  return (
    <div className="space-y-6">
      {selectorBlock}

      <section id="compare-key-deltas" className="weather-panel @container p-6 space-y-4">
        <div>
          <p className="type-label text-slate-400">Difference</p>
          <h2 className="type-section text-slate-100 mt-1">What changed between them</h2>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-panel)] p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-300">Macro conditions:</span>
            <span className="rounded border border-[color:var(--border-default)] bg-[color:var(--bg-nested)] px-2 py-0.5 font-semibold text-slate-100">
              {getRegimePublicLabel(reportA.assessment.regime)} (Period A)
            </span>
            <span className="text-slate-500">vs</span>
            <span className="rounded border border-[color:var(--border-subtle)] bg-[color:var(--bg-nested)] px-2 py-0.5 font-semibold text-slate-300">
              {getRegimePublicLabel(reportB.assessment.regime)} (Period B)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-fluid-nano font-mono">
            {reportA.assessment.scores.tightness !== reportB.assessment.scores.tightness ? (
              <span className={`rounded border px-2 py-0.5 ${reportA.assessment.scores.tightness > reportB.assessment.scores.tightness ? "border-amber-700/40 bg-amber-950/30 text-amber-300" : "border-emerald-700/40 bg-emerald-950/30 text-emerald-300"}`}>
                Funding pressure: {reportA.assessment.scores.tightness - reportB.assessment.scores.tightness > 0 ? "+" : ""}{reportA.assessment.scores.tightness - reportB.assessment.scores.tightness} pts
              </span>
            ) : null}
            {reportA.assessment.scores.riskAppetite !== reportB.assessment.scores.riskAppetite ? (
              <span className={`rounded border px-2 py-0.5 ${reportA.assessment.scores.riskAppetite > reportB.assessment.scores.riskAppetite ? "border-emerald-700/40 bg-emerald-950/30 text-emerald-300" : "border-amber-700/40 bg-amber-950/30 text-amber-300"}`}>
                Risk appetite: {reportA.assessment.scores.riskAppetite - reportB.assessment.scores.riskAppetite > 0 ? "+" : ""}{reportA.assessment.scores.riskAppetite - reportB.assessment.scores.riskAppetite} pts
              </span>
            ) : null}
          </div>
        </div>

        {/* Leading with rules that changed between the two named dates */}
        <div className="rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-nested)] p-4 space-y-2">
          <h3 className="type-eyebrow text-slate-200">
            Rules that changed between {reportB.recordDateLabel} and {reportA.recordDateLabel}
          </h3>
          {changedRules.length > 0 ? (
            <ul className="space-y-2 text-sm text-slate-200">
              {changedRules.map((rule) => (
                <li key={rule.label} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-semibold text-slate-300">{rule.label}:</span>
                  <span className="text-slate-400">was {rule.was} (Period B) &rarr;</span>
                  <span className="font-medium text-slate-100">{rule.became} (Period A)</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-300">
              Operating area rules and pause thresholds were identical between these two dates.
            </p>
          )}
        </div>

        {/* Full readings below */}
        <div className="mt-4 grid gap-x-8 gap-y-4 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_14rem]">
          {ladders.map((ladder) => (
            <ScoreLadder
              key={ladder.label}
              label={ladder.label}
              value={ladder.value}
              previous={ladder.previous}
              previousLabel="Period B"
              lines={ladder.lines}
            />
          ))}
          <div className="space-y-1">
            <FactList>
              <Fact
                label="Corporate borrowing premium, A minus B"
                value={bbbA !== null && bbbB !== null ? `${(bbbA - bbbB).toFixed(2)}%` : "—"}
              />
            </FactList>
            <p className="text-xs text-slate-400">{bbbDetail}</p>
          </div>
        </div>
        <p className="mt-2 text-fluid-sm text-slate-400">
          Period A is the filled dot, period B the hollow one; the lines are the ones in force in period A.
        </p>
      </section>

      {/* On a phone the two period columns stack, so a reader deep in Period B
          has to remember what Period A was. The bar stays with the scroll and
          names both, with the conditions that make them different. */}
      <div className="sticky top-0 z-10 -mx-2 flex items-center justify-between gap-3 border-b border-[color:var(--border-subtle)] bg-[var(--bg-body)]/95 px-2 py-2 text-xs backdrop-blur md:hidden">
        <span className="min-w-0 truncate">
          <span className="font-semibold text-slate-100">A</span>{" "}
          {getRegimePublicLabel(reportA.assessment.regime)}
          <span className="text-slate-400"> · {reportA.recordDateLabel}</span>
        </span>
        <span className="min-w-0 truncate text-right">
          <span className="font-semibold text-slate-100">B</span>{" "}
          {getRegimePublicLabel(reportB.assessment.regime)}
          <span className="text-slate-400"> · {reportB.recordDateLabel}</span>
        </span>
      </div>

      <div id="ops-compare-grid" className="weather-switch gap-6 [--col-min:22rem]">
        <ComparePeriodColumn snapshot={snapA} report={reportA} label="Period A" />
        <ComparePeriodColumn snapshot={snapB} report={reportB} label="Period B" />
      </div>

      {isFallback ? (
        <p className="text-fluid-sm text-slate-400">Saved copy — not a live reading.</p>
      ) : null}
    </div>
  );
}

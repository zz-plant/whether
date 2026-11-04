import { getRegimePublicLabel } from "../../../lib/regimePresentation";
import { loadWeeklyBriefSnapshot } from "../../../lib/report/weeklyBriefSnapshot";
import { getTimeMachineRegimeSeries, getTimeMachineSnapshots } from "../../../lib/timeMachine/timeMachineCache";
import { evaluateRegime } from "../../../lib/regimeEngine";
import { formatMonthLabel } from "../../../lib/timeMachine/monthFormatting";
import { Fact, FactList } from "../../components/ui/factList";
import { ScoreLadder, buildLadderLines } from "../../components/ui/scoreLadder";
import { ruleMetricLabel, type RuleConditionMetric } from "../../../lib/report/boundedDecisionRules";
import { buildSharedCorridorRails } from "../../../lib/report/operatingCalls";
import { BORROWING_PREMIUM_MEANING, ComparePeriodColumn, findMacroValue } from "./comparePeriodColumn";
import { DateSelector, type DateOption } from "./DateSelector";
import { isSavedCopy } from "../../../lib/report/provenanceStatus";
import { describeMacroNotOnRecord } from "../../../lib/report/reportCopy";

type CompareSearchParams = {
  yearA?: string;
  monthA?: string;
  yearB?: string;
  monthB?: string;
};

export async function ComparePanel({
  searchParams,
}: {
  searchParams?: Partial<CompareSearchParams>;
}) {
  const resolvedSearchParams = searchParams;

  const yearA = resolvedSearchParams?.yearA ? Number(resolvedSearchParams.yearA) : undefined;
  const monthA = resolvedSearchParams?.monthA ? Number(resolvedSearchParams.monthA) : undefined;

  const yearB = resolvedSearchParams?.yearB ? Number(resolvedSearchParams.yearB) : 2020;
  const monthB = resolvedSearchParams?.monthB ? Number(resolvedSearchParams.monthB) : 3;

  const searchA = yearA && monthA ? { year: String(yearA), month: String(monthA) } : undefined;
  const searchB = { year: String(yearB), month: String(monthB) };

  const snapshotResultA = await loadWeeklyBriefSnapshot(searchA, { route: "/history/compare" });
  const snapshotResultB = await loadWeeklyBriefSnapshot(searchB, { route: "/history/compare" });

  const { snapshot: snapA } = snapshotResultA;
  const { snapshot: snapB } = snapshotResultB;

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

  const isFallback = isSavedCopy(reportA.treasury);

  return (
    <div className="space-y-6">
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

      <section id="compare-key-deltas" className="weather-panel @container p-6">
        <p className="type-label text-slate-400">Difference</p>
        <h2 className="type-section text-slate-100 mt-1">What changed between them</h2>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-panel)] p-3">
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
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
      <div id="compare-selectors" className="weather-panel grid gap-6 md:grid-cols-2">
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

      <section id="compare-key-deltas" className="weather-panel p-6">
        <p className="type-label text-slate-400">Difference</p>
        <h2 className="type-section text-slate-100 mt-1">What changed between them</h2>

        <div className="mt-4 grid gap-x-8 gap-y-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_14rem]">
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
        <p className="mt-2 text-fluid-xs text-slate-400">
          Period A is the filled dot, period B the hollow one; the lines are the ones in force in period A.
        </p>
      </section>

      <div id="ops-compare-grid" className="grid gap-6 lg:grid-cols-2">
        <ComparePeriodColumn snapshot={snapA} report={reportA} label="Period A" />
        <ComparePeriodColumn snapshot={snapB} report={reportB} label="Period B" />
      </div>

      {isFallback ? (
        <p className="text-fluid-xs text-slate-400">Saved copy — not a live reading.</p>
      ) : null}
    </div>
  );
}
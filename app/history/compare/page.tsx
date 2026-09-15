import type { Metadata } from "next";
import { buildPageMetadata } from "../../../lib/seo";
import { ReportShell } from "../../components/reportShell";
import { loadWeeklyBriefSnapshot } from "../../../lib/report/weeklyBriefSnapshot";
import { getTimeMachineRegimeSeries, getTimeMachineSnapshots } from "../../../lib/timeMachine/timeMachineCache";
import { evaluateRegime } from "../../../lib/regimeEngine";
import { formatMonthLabel } from "../../../lib/timeMachine/monthFormatting";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { DateSelector, type DateOption } from "./DateSelector";

export const runtime = "edge";

type CompareSearchParams = {
  yearA?: string;
  monthA?: string;
  yearB?: string;
  monthB?: string;
};

const toImageParam = (value: string | undefined) =>
  value && /^\d+$/.test(value) ? value : undefined;

const buildCompareImageParams = (searchParams?: Partial<CompareSearchParams>) => {
  const params: Record<string, string> = { template: "compare" };
  const yearA = toImageParam(searchParams?.yearA);
  const monthA = toImageParam(searchParams?.monthA);
  if (yearA && monthA) {
    params.yearA = yearA;
    params.monthA = monthA;
  }
  const yearB = toImageParam(searchParams?.yearB);
  const monthB = toImageParam(searchParams?.monthB);
  if (yearB && monthB) {
    params.yearB = yearB;
    params.monthB = monthB;
  }
  return params;
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<Partial<CompareSearchParams>>;
}): Promise<Metadata> {
  const resolved = searchParams ? await searchParams : undefined;
  const imageParams = buildCompareImageParams(resolved);

  return buildPageMetadata({
    title: "Compare periods — two months side by side",
    description: "Side-by-side comparison of two past months: regime, Operating latitude, and operating rules.",
    path: "/history/compare",
    imageAlt: "Whether comparison of two past periods",
    imageParams,
  });
}

const getCurveSpread = (yields: any) => {
  if (typeof yields?.tenYear === "number" && typeof yields?.twoYear === "number") {
    return yields.tenYear - yields.twoYear;
  }
  return null;
};

const findMacroVal = (series: any[] | undefined, id: string) => {
  if (!series) return null;
  const matching = series.find((s) => s.id === id);
  return matching && typeof matching.value === "number" ? matching.value : null;
};

export default async function HistoryComparePage({
  searchParams,
}: {
  searchParams?: Promise<any>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  
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

  const yieldsA = reportA.treasury?.yields ?? (reportA as any).yields;
  const yieldsB = reportB.treasury?.yields ?? (reportB as any).yields;

  const spreadA = getCurveSpread(yieldsA);
  const spreadB = getCurveSpread(yieldsB);

  const cpiA = findMacroVal(reportA.macroSeries, "CPI_YOY");
  const cpiB = findMacroVal(reportB.macroSeries, "CPI_YOY");

  const bbbA = findMacroVal(reportA.macroSeries, "BBB_CREDIT_SPREAD");
  const bbbB = findMacroVal(reportB.macroSeries, "BBB_CREDIT_SPREAD");

  const unempA = findMacroVal(reportA.macroSeries, "UNEMPLOYMENT_RATE");
  const unempB = findMacroVal(reportB.macroSeries, "UNEMPLOYMENT_RATE");

  const scoreA = snapA.weeklyDecisionCardModel.decision.weeklyLeadershipSummary.boldnessScore;
  const scoreB = snapB.weeklyDecisionCardModel.decision.weeklyLeadershipSummary.boldnessScore;
  const boldnessDelta = scoreA - scoreB;

  // Build options list from cache. Regime labels come off the same threaded walk
  // /history serves — a point evaluation here would label a tightening month by
  // what an instant quadrant read says, disagreeing with the record the reader
  // can cross-check one page away.
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
        label: `${formatMonthLabel(s.year, s.month)} (${regime})`,
      };
    })
    .reverse();

  // Combine actions for the shell
  const isFallback = Boolean(reportA.treasury?.fallback_at || reportA.treasury?.fallback_reason);

  const compareSectionLinks = [
    { href: "#compare-selectors", label: "Period selection" },
    { href: "#compare-key-deltas", label: "Macro deltas" },
    { href: "#ops-compare-grid", label: "Side-by-side rules" },
  ];

  return (
    <ReportShell
      model={{
        status: {
          statusLabel: reportA.statusLabel,
          recordDateLabel: reportA.recordDateLabel,
          fetchedAtLabel: reportA.fetchedAtLabel,
          treasurySource: reportA.treasury?.source,
        },
        page: {
          pageTitle: "Compare two periods",
          currentPath: "/history/compare",
          pageSummary: "Signals and operating calls for any two past months, side by side.",
          sectionLinks: compareSectionLinks,
        },
        trust: {
          trustStatusLabel: snapA.trustStatus.trustStatusLabel,
          trustStatusDetail: snapA.trustStatus.trustStatusDetail,
          trustStatusAction: snapA.trustStatus.trustStatusAction,
          trustStatusTone: snapA.trustStatus.trustStatusTone,
          showOfflineBadge: isFallback && !reportA.historicalSelection,
        },
        actions: {
          primaryCta: { href: "/", label: "Weekly Brief" },
          secondaryCta: { href: "/history", label: "Regime History" },
        },
        payloads: {
          decisionBanner: {
            label: "Compare",
            decision: "Pick any two past months below to compare their signals and operating rules side by side.",
            horizon: "Replay Mode",
            confidence: snapA.trustStatus.trustStatusLabel,
            effectiveDate: reportA.recordDateLabel,
            evidenceHref: "#ops-compare-grid",
          },
          commandBar: {
            regime: reportA.assessment.regime,
            call: snapA.weeklyCall.currentCall,
            doNow: snapA.weeklyCall.doNowBullets,
            flipConditions: [snapA.weeklyCall.changeCourseIf, ...snapA.weeklyCall.flipConditionLabels].slice(0, 4),
            updatedAt: reportA.fetchedAtLabel,
          },
        },
      }}
    >
      <div className="space-y-6">
        {/* Date Selectors Row */}
        <div id="compare-selectors" className="grid gap-6 md:grid-cols-2 p-6 rounded-lg border border-slate-800 bg-slate-950/60 backdrop-blur-md">
          <DateSelector
            label="Period A"
            paramPrefix="A"
            options={dateOptions}
            currentYear={yearA ?? snapshots[snapshots.length - 1].year}
            currentMonth={monthA ?? snapshots[snapshots.length - 1].month}
          />
          <DateSelector
            label="Period B"
            paramPrefix="B"
            options={dateOptions}
            currentYear={yearB}
            currentMonth={monthB}
          />
        </div>

        {/* Delta Analysis Panel */}
        <section id="compare-key-deltas" className="weather-panel p-6">
          <p className="type-label text-slate-400">Difference</p>
          <h2 className="type-section text-slate-100 mt-1">What changed between them</h2>
          
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="weather-surface p-4 text-center">
              <p className="type-eyebrow">Operating latitude change</p>
              <p className={`mt-2 text-2xl font-bold ${boldnessDelta > 0 ? "text-emerald-400" : boldnessDelta < 0 ? "text-rose-400" : "text-slate-300"}`}>
                {boldnessDelta > 0 ? `+${boldnessDelta}` : boldnessDelta} pts
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {boldnessDelta > 0 ? "Period A is more aggressive" : boldnessDelta < 0 ? "Period A is more defensive" : "Equivalent risk postures"}
              </p>
            </div>

            <div className="weather-surface p-4 text-center">
              <p className="type-eyebrow">Yield curve slope change</p>
              <p className="mt-2 text-2xl font-bold text-slate-200">
                {spreadA !== null && spreadB !== null ? `${(spreadA - spreadB).toFixed(2)}%` : "N/A"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Spread diff: {(spreadA ?? 0).toFixed(2)}% vs {(spreadB ?? 0).toFixed(2)}%
              </p>
            </div>

            <div className="weather-surface p-4 text-center">
              <p className="type-eyebrow">Credit spread change</p>
              <p className="mt-2 text-2xl font-bold text-slate-200">
                {bbbA !== null && bbbB !== null ? `${(bbbA - bbbB).toFixed(2)}%` : "N/A"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Risk premium: {(bbbA ?? 0).toFixed(2)}% vs {(bbbB ?? 0).toFixed(2)}%
              </p>
            </div>
          </div>
        </section>

        {/* Side-by-Side Comparison Columns */}
        <div id="ops-compare-grid" className="grid gap-6 lg:grid-cols-2">
          {/* Column A */}
          <div className="space-y-6">
            <div className="weather-panel p-6 border-sky-500/20">
              <div className="flex items-center justify-between">
                <span className="weather-pill bg-sky-500/10 text-sky-300 font-semibold">Period A</span>
                <span className="text-xs text-slate-400">{snapA.reportData.recordDateLabel}</span>
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-100">
                {snapA.weeklyDecisionCardModel.status.postureWithStageLabel || snapA.weeklyDecisionCardModel.status.postureLabel}
              </h2>
              <p className="mt-2 text-sm text-slate-300 italic">
                &ldquo;{snapA.weeklyDecisionCardModel.decision.weeklyLeadershipSummary.shorthandLine}&rdquo;
              </p>
            </div>

            <div className="weather-panel p-6 space-y-4">
              <h3 className="type-eyebrow">Rules in period A</h3>
              <div className="space-y-2">
                <p className="text-sm"><span className="text-slate-400 font-medium">Hiring window:</span> <span className="text-slate-100 font-semibold">{snapA.weeklyDecisionCardModel.decision.weeklyLeadershipSummary.hiringWindow}</span></p>
                <p className="text-sm"><span className="text-slate-400 font-medium">Expansion pace:</span> <span className="text-slate-100 font-semibold">{snapA.weeklyDecisionCardModel.decision.weeklyLeadershipSummary.expansionWindow}</span></p>
                <p className="text-sm"><span className="text-slate-400 font-medium">Fundraising window:</span> <span className="text-slate-100 font-semibold">{snapA.weeklyDecisionCardModel.decision.weeklyLeadershipSummary.raiseWindow}</span></p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 space-y-3">
                <div>
                  <p className="type-eyebrow text-emerald-300">{DECISION_CONTRACT_LABELS.action.actionNow}</p>
                  <p className="mt-1 text-sm text-slate-200">{snapA.weeklyCall.actionNow}</p>
                </div>
                <div>
                  <p className="type-eyebrow text-amber-300">{DECISION_CONTRACT_LABELS.threshold.pauseIf}</p>
                  <p className="mt-1 text-sm text-slate-200">{snapA.weeklyCall.pauseIf}</p>
                </div>
                <div>
                  <p className="type-eyebrow text-violet-300">{DECISION_CONTRACT_LABELS.reversal.changeCourseIf}</p>
                  <p className="mt-1 text-sm text-slate-200">{snapA.weeklyCall.changeCourseIf}</p>
                </div>
              </div>
            </div>

            <div className="weather-panel p-6">
              <h3 className="type-eyebrow mb-4">Signals in period A</h3>
              <table className="w-full text-sm text-left">
                <tbody>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-2.5 text-slate-400 font-medium">Funding pressure</td>
                    <td className="py-2.5 text-right text-slate-200 font-semibold">{(reportA.assessment.scores.tightness).toFixed(1)}</td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-2.5 text-slate-400 font-medium">Risk appetite</td>
                    <td className="py-2.5 text-right text-slate-200 font-semibold">{(reportA.assessment.scores.riskAppetite).toFixed(1)}</td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-2.5 text-slate-400 font-medium">Fed interest rate (1M/3M)</td>
                    <td className="py-2.5 text-right text-slate-200 font-semibold">
                      {reportA.assessment.scores.baseRate !== undefined ? `${reportA.assessment.scores.baseRate.toFixed(2)}%` : "N/A"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-2.5 text-slate-400 font-medium">Recession warning gauge (10Y−2Y)</td>
                    <td className="py-2.5 text-right text-slate-200 font-semibold">
                      {spreadA !== null ? `${spreadA.toFixed(2)}%` : "N/A"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-2.5 text-slate-400 font-medium">Corporate borrowing premium (BBB)</td>
                    <td className="py-2.5 text-right text-slate-200 font-semibold">
                      {bbbA !== null ? `${bbbA.toFixed(2)}%` : "N/A"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-2.5 text-slate-400 font-medium">Inflation (CPI, year over year)</td>
                    <td className="py-2.5 text-right text-slate-200 font-semibold">
                      {cpiA !== null ? `${cpiA.toFixed(2)}%` : "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-slate-400 font-medium">Unemployment rate</td>
                    <td className="py-2.5 text-right text-slate-200 font-semibold">
                      {unempA !== null ? `${unempA.toFixed(1)}%` : "N/A"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Column B */}
          <div className="space-y-6">
            <div className="weather-panel p-6 border-slate-700/60">
              <div className="flex items-center justify-between">
                <span className="weather-pill bg-slate-800 text-slate-300 font-semibold">Period B</span>
                <span className="text-xs text-slate-400">{snapB.reportData.recordDateLabel}</span>
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-100">
                {snapB.weeklyDecisionCardModel.status.postureWithStageLabel || snapB.weeklyDecisionCardModel.status.postureLabel}
              </h2>
              <p className="mt-2 text-sm text-slate-300 italic">
                &ldquo;{snapB.weeklyDecisionCardModel.decision.weeklyLeadershipSummary.shorthandLine}&rdquo;
              </p>
            </div>

            <div className="weather-panel p-6 space-y-4">
              <h3 className="type-eyebrow">Rules in period B</h3>
              <div className="space-y-2">
                <p className="text-sm"><span className="text-slate-400 font-medium">Hiring window:</span> <span className="text-slate-100 font-semibold">{snapB.weeklyDecisionCardModel.decision.weeklyLeadershipSummary.hiringWindow}</span></p>
                <p className="text-sm"><span className="text-slate-400 font-medium">Expansion pace:</span> <span className="text-slate-100 font-semibold">{snapB.weeklyDecisionCardModel.decision.weeklyLeadershipSummary.expansionWindow}</span></p>
                <p className="text-sm"><span className="text-slate-400 font-medium">Fundraising window:</span> <span className="text-slate-100 font-semibold">{snapB.weeklyDecisionCardModel.decision.weeklyLeadershipSummary.raiseWindow}</span></p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 space-y-3">
                <div>
                  <p className="type-eyebrow text-emerald-300">{DECISION_CONTRACT_LABELS.action.actionNow}</p>
                  <p className="mt-1 text-sm text-slate-200">{snapB.weeklyCall.actionNow}</p>
                </div>
                <div>
                  <p className="type-eyebrow text-amber-300">{DECISION_CONTRACT_LABELS.threshold.pauseIf}</p>
                  <p className="mt-1 text-sm text-slate-200">{snapB.weeklyCall.pauseIf}</p>
                </div>
                <div>
                  <p className="type-eyebrow text-violet-300">{DECISION_CONTRACT_LABELS.reversal.changeCourseIf}</p>
                  <p className="mt-1 text-sm text-slate-200">{snapB.weeklyCall.changeCourseIf}</p>
                </div>
              </div>
            </div>

            <div className="weather-panel p-6">
              <h3 className="type-eyebrow mb-4">Signals in period B</h3>
              <table className="w-full text-sm text-left">
                <tbody>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-2.5 text-slate-400 font-medium">Funding pressure</td>
                    <td className="py-2.5 text-right text-slate-200 font-semibold">{(reportB.assessment.scores.tightness).toFixed(1)}</td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-2.5 text-slate-400 font-medium">Risk appetite</td>
                    <td className="py-2.5 text-right text-slate-200 font-semibold">{(reportB.assessment.scores.riskAppetite).toFixed(1)}</td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-2.5 text-slate-400 font-medium">Fed interest rate (1M/3M)</td>
                    <td className="py-2.5 text-right text-slate-200 font-semibold">
                      {reportB.assessment.scores.baseRate !== undefined ? `${reportB.assessment.scores.baseRate.toFixed(2)}%` : "N/A"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-2.5 text-slate-400 font-medium">Recession warning gauge (10Y−2Y)</td>
                    <td className="py-2.5 text-right text-slate-200 font-semibold">
                      {spreadB !== null ? `${spreadB.toFixed(2)}%` : "N/A"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-2.5 text-slate-400 font-medium">Corporate borrowing premium (BBB)</td>
                    <td className="py-2.5 text-right text-slate-200 font-semibold">
                      {bbbB !== null ? `${bbbB.toFixed(2)}%` : "N/A"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-2.5 text-slate-400 font-medium">Inflation (CPI, year over year)</td>
                    <td className="py-2.5 text-right text-slate-200 font-semibold">
                      {cpiB !== null ? `${cpiB.toFixed(2)}%` : "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-slate-400 font-medium">Unemployment rate</td>
                    <td className="py-2.5 text-right text-slate-200 font-semibold">
                      {unempB !== null ? `${unempB.toFixed(1)}%` : "N/A"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </ReportShell>
  );
}

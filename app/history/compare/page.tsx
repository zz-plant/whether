import type { Metadata } from "next";
import { buildPageMetadata } from "../../../lib/seo";
import { ReportShell } from "../../components/reportShell";
import { loadWeeklyBriefSnapshot } from "../../../lib/report/weeklyBriefSnapshot";
import { getTimeMachineSnapshots } from "../../../lib/timeMachine/timeMachineCache";
import { evaluateRegime } from "../../../lib/regimeEngine";
import { formatMonthLabel } from "../../../lib/timeMachine/monthFormatting";
import { DateSelector, type DateOption } from "./DateSelector";

export const runtime = "edge";

export const metadata: Metadata = buildPageMetadata({
  title: "Whether Report — Compare Epochs",
  description: "Side-by-side comparison of historical macro regimes, boldness scores, and playbook rules.",
  path: "/history/compare",
  imageAlt: "Whether historical compare tool",
  imagePath: "/social/history.svg",
});

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

  // Build options list from cache
  const snapshots = getTimeMachineSnapshots();
  const dateOptions: DateOption[] = snapshots
    .map((s) => {
      const regime = evaluateRegime(s).regime;
      return {
        year: s.year,
        month: s.month,
        label: `${formatMonthLabel(s.year, s.month)} (${regime})`,
      };
    })
    .reverse();

  // Combine actions for the shell
  const isFallback = Boolean(reportA.treasury?.fallback_at || reportA.treasury?.fallback_reason);

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
          pageTitle: "Epoch Comparison",
          currentPath: "/history/compare",
          pageSummary: "Compare side-by-side macro signal diffs and operating posture recommendations across epochs.",
          sectionLinks: [],
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
            decision: "Select any two historical epochs below to analyze their signals and decision rules side-by-side.",
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
        <div className="grid gap-6 md:grid-cols-2 p-6 rounded-lg border border-slate-800 bg-slate-950/60 backdrop-blur-md">
          <DateSelector
            label="Epoch A (Left Column)"
            paramPrefix="A"
            options={dateOptions}
            currentYear={yearA ?? snapshots[snapshots.length - 1].year}
            currentMonth={monthA ?? snapshots[snapshots.length - 1].month}
          />
          <DateSelector
            label="Epoch B (Right Column)"
            paramPrefix="B"
            options={dateOptions}
            currentYear={yearB}
            currentMonth={monthB}
          />
        </div>

        {/* Delta Analysis Panel */}
        <section className="weather-panel p-6">
          <p className="type-label text-slate-400">Delta analysis</p>
          <h3 className="type-section text-slate-100 mt-1">Comparison Highlights</h3>
          
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="weather-surface p-4 text-center">
              <p className="text-fluid-micro font-semibold uppercase tracking-[0.12em] text-slate-400">Boldness Score Shift</p>
              <p className={`mt-2 text-2xl font-bold ${boldnessDelta > 0 ? "text-emerald-400" : boldnessDelta < 0 ? "text-rose-400" : "text-slate-300"}`}>
                {boldnessDelta > 0 ? `+${boldnessDelta}` : boldnessDelta} pts
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {boldnessDelta > 0 ? "Epoch A is more aggressive" : boldnessDelta < 0 ? "Epoch A is more defensive" : "Equivalent risk postures"}
              </p>
            </div>

            <div className="weather-surface p-4 text-center">
              <p className="text-fluid-micro font-semibold uppercase tracking-[0.12em] text-slate-400">Yield Curve Delta</p>
              <p className="mt-2 text-2xl font-bold text-slate-200">
                {spreadA !== null && spreadB !== null ? `${(spreadA - spreadB).toFixed(2)}%` : "N/A"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Spread diff: {(spreadA ?? 0).toFixed(2)}% vs {(spreadB ?? 0).toFixed(2)}%
              </p>
            </div>

            <div className="weather-surface p-4 text-center">
              <p className="text-fluid-micro font-semibold uppercase tracking-[0.12em] text-slate-400">BBB Spread Diff</p>
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
                <span className="weather-pill bg-sky-500/10 text-sky-300 font-semibold">Epoch A</span>
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
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Playbook Rules</h3>
              <div className="space-y-2">
                <p className="text-sm"><span className="text-slate-400 font-medium">Hiring Window:</span> <span className="text-slate-100 font-semibold">{snapA.weeklyDecisionCardModel.decision.weeklyLeadershipSummary.hiringWindow}</span></p>
                <p className="text-sm"><span className="text-slate-400 font-medium">Expansion Pace:</span> <span className="text-slate-100 font-semibold">{snapA.weeklyDecisionCardModel.decision.weeklyLeadershipSummary.expansionWindow}</span></p>
                <p className="text-sm"><span className="text-slate-400 font-medium">Fundraising Window:</span> <span className="text-slate-100 font-semibold">{snapA.weeklyDecisionCardModel.decision.weeklyLeadershipSummary.raiseWindow}</span></p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-emerald-300">Action Now</p>
                  <p className="mt-1 text-sm text-slate-200">{snapA.weeklyCall.actionNow}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-300">Pause Guardrail</p>
                  <p className="mt-1 text-sm text-slate-200">{snapA.weeklyCall.pauseIf}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-violet-300">Reversal Trigger</p>
                  <p className="mt-1 text-sm text-slate-200">{snapA.weeklyCall.changeCourseIf}</p>
                </div>
              </div>
            </div>

            <div className="weather-panel p-6">
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 mb-4">Macro Signals</h3>
              <table className="w-full text-sm text-left">
                <tbody>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-2.5 text-slate-400 font-medium">Tightness Score</td>
                    <td className="py-2.5 text-right text-slate-200 font-semibold">{(reportA.assessment.scores.tightness).toFixed(1)}</td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-2.5 text-slate-400 font-medium">Risk Appetite</td>
                    <td className="py-2.5 text-right text-slate-200 font-semibold">{(reportA.assessment.scores.riskAppetite).toFixed(1)}</td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-2.5 text-slate-400 font-medium">Base Rate (1M/3M)</td>
                    <td className="py-2.5 text-right text-slate-200 font-semibold">
                      {reportA.assessment.scores.baseRate !== undefined ? `${reportA.assessment.scores.baseRate.toFixed(2)}%` : "N/A"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-2.5 text-slate-400 font-medium">Curve Spread (10Y-2Y)</td>
                    <td className="py-2.5 text-right text-slate-200 font-semibold">
                      {spreadA !== null ? `${spreadA.toFixed(2)}%` : "N/A"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-2.5 text-slate-400 font-medium">BBB Credit Spread</td>
                    <td className="py-2.5 text-right text-slate-200 font-semibold">
                      {bbbA !== null ? `${bbbA.toFixed(2)}%` : "N/A"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-2.5 text-slate-400 font-medium">CPI Inflation (YoY)</td>
                    <td className="py-2.5 text-right text-slate-200 font-semibold">
                      {cpiA !== null ? `${cpiA.toFixed(2)}%` : "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-slate-400 font-medium">Unemployment Rate</td>
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
                <span className="weather-pill bg-slate-800 text-slate-300 font-semibold">Epoch B</span>
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
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Playbook Rules</h3>
              <div className="space-y-2">
                <p className="text-sm"><span className="text-slate-400 font-medium">Hiring Window:</span> <span className="text-slate-100 font-semibold">{snapB.weeklyDecisionCardModel.decision.weeklyLeadershipSummary.hiringWindow}</span></p>
                <p className="text-sm"><span className="text-slate-400 font-medium">Expansion Pace:</span> <span className="text-slate-100 font-semibold">{snapB.weeklyDecisionCardModel.decision.weeklyLeadershipSummary.expansionWindow}</span></p>
                <p className="text-sm"><span className="text-slate-400 font-medium">Fundraising Window:</span> <span className="text-slate-100 font-semibold">{snapB.weeklyDecisionCardModel.decision.weeklyLeadershipSummary.raiseWindow}</span></p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-emerald-300">Action Now</p>
                  <p className="mt-1 text-sm text-slate-200">{snapB.weeklyCall.actionNow}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-300">Pause Guardrail</p>
                  <p className="mt-1 text-sm text-slate-200">{snapB.weeklyCall.pauseIf}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-violet-300">Reversal Trigger</p>
                  <p className="mt-1 text-sm text-slate-200">{snapB.weeklyCall.changeCourseIf}</p>
                </div>
              </div>
            </div>

            <div className="weather-panel p-6">
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 mb-4">Macro Signals</h3>
              <table className="w-full text-sm text-left">
                <tbody>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-2.5 text-slate-400 font-medium">Tightness Score</td>
                    <td className="py-2.5 text-right text-slate-200 font-semibold">{(reportB.assessment.scores.tightness).toFixed(1)}</td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-2.5 text-slate-400 font-medium">Risk Appetite</td>
                    <td className="py-2.5 text-right text-slate-200 font-semibold">{(reportB.assessment.scores.riskAppetite).toFixed(1)}</td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-2.5 text-slate-400 font-medium">Base Rate (1M/3M)</td>
                    <td className="py-2.5 text-right text-slate-200 font-semibold">
                      {reportB.assessment.scores.baseRate !== undefined ? `${reportB.assessment.scores.baseRate.toFixed(2)}%` : "N/A"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-2.5 text-slate-400 font-medium">Curve Spread (10Y-2Y)</td>
                    <td className="py-2.5 text-right text-slate-200 font-semibold">
                      {spreadB !== null ? `${spreadB.toFixed(2)}%` : "N/A"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-2.5 text-slate-400 font-medium">BBB Credit Spread</td>
                    <td className="py-2.5 text-right text-slate-200 font-semibold">
                      {bbbB !== null ? `${bbbB.toFixed(2)}%` : "N/A"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-800/50">
                    <td className="py-2.5 text-slate-400 font-medium">CPI Inflation (YoY)</td>
                    <td className="py-2.5 text-right text-slate-200 font-semibold">
                      {cpiB !== null ? `${cpiB.toFixed(2)}%` : "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-slate-400 font-medium">Unemployment Rate</td>
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

import type { Metadata } from "next";
import { buildPageMetadata } from "../../../lib/seo";
import { getRegimePublicLabel } from "../../../lib/regimePresentation";
import { ReportShell } from "../../components/reportShell";
import { loadWeeklyBriefSnapshot } from "../../../lib/report/weeklyBriefSnapshot";
import { getTimeMachineRegimeSeries, getTimeMachineSnapshots } from "../../../lib/timeMachine/timeMachineCache";
import { evaluateRegime } from "../../../lib/regimeEngine";
import { formatMonthLabel } from "../../../lib/timeMachine/monthFormatting";
import { StatTile } from "../../components/ui/statTile";
import { ComparePeriodColumn, findMacroValue, getCurveSpread } from "./comparePeriodColumn";
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
    description: "Two past months side by side: the conditions, the operating latitude, and the rules in force.",
    path: "/history/compare",
    imageAlt: "Whether comparison of two past periods",
    imageParams,
  });
}

export default async function HistoryComparePage({
  searchParams,
}: {
  searchParams?: Promise<Partial<CompareSearchParams>>;
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

  const spreadA = getCurveSpread(reportA.treasury.yields);
  const spreadB = getCurveSpread(reportB.treasury.yields);

  const bbbA = findMacroValue(reportA.macroSeries, "BBB_CREDIT_SPREAD");
  const bbbB = findMacroValue(reportB.macroSeries, "BBB_CREDIT_SPREAD");

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
        label: `${formatMonthLabel(s.year, s.month)} · ${getRegimePublicLabel(regime)}`,
      };
    })
    .reverse();

  // Combine actions for the shell
  const isFallback = Boolean(reportA.treasury.fallback_at || reportA.treasury.fallback_reason);

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
        },
        page: {
          pageTitle: "Compare two periods",
          pageSummary: "Signals and operating calls for any two past months, side by side.",
          sectionLinks: compareSectionLinks,
        },
        trust: {
          trustStatusTone: snapA.trustStatus.trustStatusTone,
          showOfflineBadge: isFallback && !reportA.historicalSelection,
        },
      }}
    >
      <div className="space-y-6">
        <div id="compare-selectors" className="weather-panel grid gap-6 md:grid-cols-2">
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

        <section id="compare-key-deltas" className="weather-panel p-6">
          <p className="type-label text-slate-400">Difference</p>
          <h2 className="type-section text-slate-100 mt-1">What changed between them</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <StatTile
              label="Operating latitude change"
              value={
                <span className={boldnessDelta > 0 ? "text-emerald-400" : boldnessDelta < 0 ? "text-rose-400" : undefined}>
                  {boldnessDelta > 0 ? `+${boldnessDelta}` : boldnessDelta}
                </span>
              }
              unit="pts"
              detail={
                boldnessDelta > 0
                  ? "Period A had more room to move"
                  : boldnessDelta < 0
                    ? "Period A had less room to move"
                    : "No difference"
              }
            />
            <StatTile
              label="Yield curve slope change"
              value={spreadA !== null && spreadB !== null ? `${(spreadA - spreadB).toFixed(2)}%` : "N/A"}
              detail={`10-year minus 2-year: ${(spreadA ?? 0).toFixed(2)}% vs ${(spreadB ?? 0).toFixed(2)}%`}
            />
            <StatTile
              label="Credit spread change"
              value={bbbA !== null && bbbB !== null ? `${(bbbA - bbbB).toFixed(2)}%` : "N/A"}
              detail={`Credit spread: ${(bbbA ?? 0).toFixed(2)}% vs ${(bbbB ?? 0).toFixed(2)}%`}
            />
          </div>
        </section>

        <div id="ops-compare-grid" className="grid gap-6 lg:grid-cols-2">
          <ComparePeriodColumn snapshot={snapA} report={reportA} label="Period A" />
          <ComparePeriodColumn snapshot={snapB} report={reportB} label="Period B" />
        </div>
      </div>
    </ReportShell>
  );
}

import type { Metadata } from "next";
import { buildPageMetadata } from "../../../lib/seo";
import { getRegimePublicLabel } from "../../../lib/regimePresentation";
import { ReportShell } from "../../components/reportShell";
import { loadWeeklyBriefSnapshot } from "../../../lib/report/weeklyBriefSnapshot";
import { getTimeMachineRegimeSeries, getTimeMachineSnapshots } from "../../../lib/timeMachine/timeMachineCache";
import { evaluateRegime } from "../../../lib/regimeEngine";
import { formatMonthLabel } from "../../../lib/timeMachine/monthFormatting";
import { StatTile } from "../../components/ui/statTile";
import { ScoreLadder, buildLadderLines } from "../../components/ui/scoreLadder";
import { ruleMetricLabel, type RuleConditionMetric } from "../../../lib/report/boundedDecisionRules";
import { buildSharedCorridorRails } from "../../../lib/report/operatingCalls";
import { ComparePeriodColumn, findMacroValue } from "./comparePeriodColumn";
import { DateSelector, type DateOption } from "./DateSelector";
import { isSavedCopy } from "../../../lib/report/provenanceStatus";
import { describeMacroNotOnRecord } from "../../../lib/report/reportCopy";

export const runtime = "edge";

type CompareSearchParams = {
  yearA?: string;
  monthA?: string;
  yearB?: string;
  monthB?: string;
};

/*
 * The URL shape, which the homepage's "last time the call changed" card links
 * to: `/history/compare?yearA=2024&monthA=3&yearB=2024&monthB=2`. Period A is
 * the month under examination and period B the one it is compared against;
 * months are 1–12, unpadded, and each pair must name a month-end the archive
 * holds (`hasTimeMachineEntry`). A missing pair A means the current week, and
 * a missing pair B defaults below.
 */
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

  const bbbA = findMacroValue(reportA.macroSeries, "BBB_CREDIT_SPREAD");
  const bbbB = findMacroValue(reportB.macroSeries, "BBB_CREDIT_SPREAD");
  /* A period with no premium on record is named, never read as zero. The detail
     filled a missing side with `?? 0` and printed "0.00%" beside a real figure;
     and while the report carried this week's macro series for every month, both
     sides were today's, so it read "0.00% … 1.46% vs 1.46%" for Mar 2020. */
  const bbbMissing = [
    bbbA === null ? `Period A (${reportA.recordDateLabel})` : null,
    bbbB === null ? `Period B (${reportB.recordDateLabel})` : null,
  ].filter((entry): entry is string => entry !== null);
  const bbbDetail =
    bbbA !== null && bbbB !== null
      ? `Extra interest mid-grade companies pay over the government: ${bbbA.toFixed(2)}% vs ${bbbB.toFixed(2)}%`
      : `Extra interest mid-grade companies pay over the government. ${describeMacroNotOnRecord(bbbMissing.join(" or "))}.`;

  /* Each score drawn once, period A filled and period B hollow, against the
     lines in force for period A: its pause and resume lines from the rules it
     published, and the line where the call changes from its thresholds. The
     delta tiles this replaces printed a signed number with no line, and the
     operating-latitude one at that — a composite of these two. */
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
  const isFallback = isSavedCopy(reportA.treasury);

  const compareSectionLinks = [
    { href: "#compare-selectors", label: "Period selection" },
    { href: "#compare-key-deltas", label: "What changed" },
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
          pageSummary: "Signals and operating guidance for any two past months, side by side.",
          sectionLinks: compareSectionLinks,
          currentPath: "/history/compare",
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
            {/* Named for what it costs a company, not for the bond index it is read
                from (Moody's BBB corporate yield over the 10-year Treasury). */}
            <StatTile
              label="Corporate borrowing premium, A minus B"
              value={bbbA !== null && bbbB !== null ? `${(bbbA - bbbB).toFixed(2)}%` : "—"}
              detail={bbbDetail}
            />
          </div>
          <p className="mt-2 text-fluid-xs text-slate-400">
            Period A is the filled dot, period B the hollow one; the lines are the ones in force in period A.
          </p>
        </section>

        <div id="ops-compare-grid" className="grid gap-6 lg:grid-cols-2">
          <ComparePeriodColumn snapshot={snapA} report={reportA} label="Period A" />
          <ComparePeriodColumn snapshot={snapB} report={reportB} label="Period B" />
        </div>
      </div>
    </ReportShell>
  );
}

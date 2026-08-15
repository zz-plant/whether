import { ActionLink } from "../components/ui/actionLink";
import { HistoricalTrendChart } from "../components/historicalTrendChart";
import { RegimeStats } from "../components/history/RegimeStats";
import { ReportShell } from "../components/reportShell";
import { getTimeMachineMonthsByYear, getTimeMachineRegimeSeries } from "../../lib/timeMachine/timeMachineCache";
import { buildPostureArchivePath, postureArchiveYears } from "../../lib/summary/postureArchiveYears";
import { DecisionArchive } from "./decisionArchive";
import { HistoryExplorer } from "./historyExplorer";

type HistorySearchParams = { month?: string; year?: string };

export default async function HistoryPage({
  searchParams,
}: {
  searchParams?: Promise<HistorySearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const regimeSeries = getTimeMachineRegimeSeries();
  const statsSeries = getTimeMachineRegimeSeries(60);
  const tightnessTrend = regimeSeries.slice(-12).map((entry) => ({ date: entry.recordDate, value: entry.tightness }));
  const riskAppetiteTrend = regimeSeries.slice(-12).map((entry) => ({ date: entry.recordDate, value: entry.riskAppetite }));

  return (
    <ReportShell
      model={{
        status: { statusLabel: "Historical", recordDateLabel: "", fetchedAtLabel: "", treasurySource: "https://fred.stlouisfed.org" },
        page: { pageTitle: "History", pageSummary: "Tightness and risk appetite over time.", sectionLinks: [], currentPath: "/history" },
        trust: { trustStatusLabel: "Stable", trustStatusDetail: "", trustStatusAction: "", trustStatusTone: "stable" },
        chrome: { sidebarVariant: "full" },
      }}
    >
      <section className="weather-panel space-y-5 px-5 py-5">
        <HistoryExplorer
          coverage={getTimeMachineMonthsByYear()}
          initialMonth={Number(resolvedSearchParams?.month) || 0}
          initialYear={Number(resolvedSearchParams?.year) || 0}
          regimeSeries={regimeSeries}
        />
        <RegimeStats series={statsSeries} />
        <div className="grid gap-6 sm:grid-cols-2">
          <HistoricalTrendChart label="Tightness" color="var(--color-semantic-tightening-border)" points={tightnessTrend} />
          <HistoricalTrendChart label="Risk appetite" color="var(--color-semantic-easing-border)" points={riskAppetiteTrend} increaseIsPositive />
        </div>
      </section>

      <DecisionArchive />

      <section className="weather-panel space-y-4 px-5 py-5">
        <h2 className="type-eyebrow">Posture by year</h2>
        <p className="text-sm text-slate-300">
          What the operating posture was in each closed period, with the regime splits and mid-period reversals behind it.
        </p>
        <ul className="flex flex-wrap gap-2">
          {postureArchiveYears.map((year) => (
            <li key={year.slug}>
              <ActionLink href={buildPostureArchivePath(year.slug)} variant="pill">
                {year.title}
                <span className="ml-2 text-slate-400">{year.operatorLabel}</span>
              </ActionLink>
            </li>
          ))}
        </ul>
      </section>
    </ReportShell>
  );
}

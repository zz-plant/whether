import { ActionLink } from "../components/ui/actionLink";
import { HistoricalTrendChart } from "../components/historicalTrendChart";
import { RegimeStats } from "../components/history/RegimeStats";
import { ReportShell } from "../components/reportShell";
import { getTimeMachineMonthsByYear, getTimeMachineRegimeSeries } from "../../lib/timeMachine/timeMachineCache";
import { buildPostureArchivePath, postureArchiveYears } from "../../lib/summary/postureArchiveYears";
import { buildPublishedBriefPath, getPublishedBriefs } from "../../lib/report/publishedBriefs";
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
  const publishedBriefs = getPublishedBriefs();

  return (
    <ReportShell
      model={{
        status: { statusLabel: "Historical", recordDateLabel: "", fetchedAtLabel: "", treasurySource: "https://fred.stlouisfed.org" },
        page: { pageTitle: "History", pageSummary: "The permanent record of past weekly calls.", sectionLinks: [], currentPath: "/history" },
        trust: { trustStatusLabel: "Stable", trustStatusDetail: "", trustStatusAction: "", trustStatusTone: "stable" },
        chrome: { sidebarVariant: "full" },
      }}
    >
      {publishedBriefs.length > 0 ? (
        <section className="weather-panel space-y-4 px-5 py-5">
          <div>
            <h2 className="type-eyebrow">Published weekly briefs</h2>
            <p className="text-sm text-slate-300">
              Permanent, immutable weekly operating calls cited in executive and board documents.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {publishedBriefs.map((brief) => (
              <li key={brief.slug}>
                <ActionLink
                  href={buildPublishedBriefPath(brief.slug)}
                  variant="pill"
                  className="flex w-full flex-col items-start justify-start gap-1.5 p-3.5 text-left rounded-lg border border-slate-800/80 bg-slate-900/40 hover:border-sky-500/50 hover:bg-slate-900/70"
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-fluid-micro font-mono text-slate-400">{brief.recordDateLabel}</span>
                    <span className="type-badge text-fluid-micro rounded-sm px-1.5 py-0.5 bg-slate-800 text-slate-200">
                      {brief.postureLabel}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-slate-100 line-clamp-1">{brief.headline}</span>
                  <span className="text-fluid-xs text-slate-400 line-clamp-2">{brief.summary}</span>
                </ActionLink>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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

      <details className="group weather-panel px-5 py-4">
        <summary className="flex min-h-11 cursor-pointer select-none items-center justify-between gap-3 text-fluid-xs font-medium text-white/70 after:ml-auto after:pl-2 after:text-slate-400 after:content-['▾'] group-open:after:content-['▴']">
          <span>Explore raw historical conditions</span>
        </summary>
        <div className="mt-4 space-y-5">
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
        </div>
      </details>
    </ReportShell>
  );
}

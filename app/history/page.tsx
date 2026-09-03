import { ActionLink } from "../components/ui/actionLink";
import { HistoricalTrendChart } from "../components/historicalTrendChart";
import { UrlDetails } from "../components/ui/urlDetails";
import { isDisclosureOpenInParams } from "../components/ui/disclosureUrlState";
import { RegimeStats } from "../components/history/RegimeStats";
import { TrackRecord } from "../components/history/TrackRecord";
import { ReportShell } from "../components/reportShell";
import { getTimeMachineMonthsByYear, getTimeMachineRegimeSeries } from "../../lib/timeMachine/timeMachineCache";
import { buildPostureArchivePath, postureArchiveYears } from "../../lib/summary/postureArchiveYears";
import { buildPublishedBriefPath, getPublishedBriefs } from "../../lib/report/publishedBriefs";
import { buildTrackRecord } from "../../lib/report/trackRecord";
import { formatDateUTC } from "../../lib/formatters";
import { toWeatherLabel } from "../../lib/regimeLabels";
import { getRegimePublicLabel } from "../../lib/regimePresentation";
import { ExportBoardAnnexButton } from "../components/history/ExportBoardAnnexButton";
import { DecisionArchive } from "./decisionArchive";
import { HistoryExplorer } from "./historyExplorer";

type HistorySearchParams = { month?: string; year?: string; months?: string };

export default async function HistoryPage({
  searchParams,
}: {
  searchParams?: Promise<HistorySearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const regimeSeries = getTimeMachineRegimeSeries();
  const statsSeries = getTimeMachineRegimeSeries(60);
  // The whole record, not a trailing window. "Months on record: 60" next to
  // "Record starts Aug 2021" beside a year strip that reached 2010 was three
  // answers to one question. The stats disclosure below still reads 60 months.
  const fullSeries = getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER);
  const tightnessTrend = regimeSeries.slice(-12).map((entry) => ({ date: entry.recordDate, value: entry.tightness }));
  const riskAppetiteTrend = regimeSeries.slice(-12).map((entry) => ({ date: entry.recordDate, value: entry.riskAppetite }));
  const publishedBriefs = getPublishedBriefs();
  const trackRecord = buildTrackRecord(fullSeries);

  return (
    <ReportShell
      model={{
        // The newest month the record actually covers. This was an empty string,
        // which rendered a dangling "As of" on the one page whose subject is dates.
        status: {
          statusLabel: trackRecord?.currentRegimeLabel ?? "Historical",
          recordDateLabel: trackRecord ? formatDateUTC(trackRecord.latestRecordDate) : "",
          fetchedAtLabel: "",
          treasurySource: "https://fred.stlouisfed.org",
        },
        page: { pageTitle: "History", pageSummary: "Past calls, as they were published.", sectionLinks: [], currentPath: "/history" },
        trust: { trustStatusLabel: "Stable", trustStatusDetail: "", trustStatusAction: "", trustStatusTone: "stable" },
        chrome: { sidebarVariant: "full" },
      }}
    >
      {/* The shell's h1 already says History and TrackRecord names itself directly below, so a
          second h1 here restated both; only the export action keeps this row. */}
      <div className="flex justify-end mb-4">
        <ExportBoardAnnexButton record={trackRecord} />
      </div>

      <TrackRecord
        record={trackRecord}
        allMonthsOpen={isDisclosureOpenInParams(resolvedSearchParams, "months")}
      />

      {publishedBriefs.length > 0 ? (
        <section className="weather-panel space-y-4 px-5 py-5">
          <div>
            <h2 className="type-eyebrow">Published weekly briefs</h2>
            {/* Say what the archive holds, not what it aspires to. With one entry,
                "permanent, immutable calls cited in board documents" promised a
                record the page could not show. The count is the honest claim; the
                append-only rule is the guarantee worth stating. */}
            <p className="text-sm text-slate-300">
              {publishedBriefs.length === 1
                ? "One week published so far. Entries are never edited after publication, so the archive fills forward from here."
                : `${publishedBriefs.length} weeks published. Entries are never edited after publication, so a past call reads the way it did when it was made.`}
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
                      {getRegimePublicLabel(brief.regime)}
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
                <span className="ml-2 text-slate-400">{toWeatherLabel(year.operatorLabel)}</span>
              </ActionLink>
            </li>
          ))}
        </ul>
      </section>

      <UrlDetails
        queryKey="explore"
        initialOpen={isDisclosureOpenInParams(resolvedSearchParams, "explore")}
        className="weather-auto-chevron weather-panel px-5 py-4"
        summaryClassName="cursor-pointer select-none text-fluid-xs font-medium text-white/70"
        summary={<span>Explore raw historical conditions</span>}
      >
        <div className="mt-4 space-y-5">
          <HistoryExplorer
            coverage={getTimeMachineMonthsByYear()}
            initialMonth={Number(resolvedSearchParams?.month) || 0}
            initialYear={Number(resolvedSearchParams?.year) || 0}
            regimeSeries={regimeSeries}
          />
          <RegimeStats series={statsSeries} />
          <div className="grid gap-6 sm:grid-cols-2">
            <HistoricalTrendChart label="Funding pressure" color="var(--color-semantic-tightening-border)" points={tightnessTrend} periodLabel="months" />
            <HistoricalTrendChart label="Risk appetite" color="var(--color-semantic-easing-border)" points={riskAppetiteTrend} increaseIsPositive periodLabel="months" />
          </div>
        </div>
      </UrlDetails>
    </ReportShell>
  );
}

import { ActionLink } from "../components/ui/actionLink";
import { HistoricalTrendChart } from "../components/historicalTrendChart";
import { UrlDetails } from "../components/ui/urlDetails";
import { isDisclosureOpenInParams } from "../components/ui/disclosureUrlState";
import { RegimePhaseMap } from "../components/history/RegimePhaseMap";
import { RegimeStats } from "../components/history/RegimeStats";
import { TrackRecord } from "../components/history/TrackRecord";
import { TrackRecordSection } from "../components/history/TrackRecordSection";
import { ReportShell } from "../components/reportShell";
import { getTimeMachineRegimeSeries } from "../../lib/timeMachine/timeMachineCache";
import { buildPostureArchivePath, postureArchiveYears } from "../../lib/summary/postureArchiveYears";
import { buildPublishedBriefPath, getPublishedBriefs } from "../../lib/report/publishedBriefs";
import { buildHistoryStructuredData } from "../../lib/seo/pageStructuredData";
import { buildTrackRecord } from "../../lib/report/trackRecord";
import { resolvePhaseSpan } from "../../lib/regimePhaseSpace";
import { formatDateUTC } from "../../lib/formatters";
import { toWeatherLabel } from "../../lib/regimeLabels";
import { getRegimePublicLabel } from "../../lib/regimePresentation";
import { ExportBoardAnnexButton } from "../components/history/ExportBoardAnnexButton";
import { HistoryExplorer } from "./historyExplorer";
import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";

/*
 * /history had no `metadata` export at all, so it inherited the root layout's
 * title, description and (until that was removed) its canonical — shipping the
 * homepage's three identity tags on the hub that 81 archive-period URLs hang
 * off, the largest single cluster in the sitemap.
 */
export const metadata: Metadata = buildPageMetadata({
  title: "Regime History and Track Record",
  description:
    "Every monthly regime call on record, when the posture changed, how long each regime held, and the published weekly briefs behind the track record.",
  path: "/history",
  imageAlt: "Whether regime history and track record",
});

type HistorySearchParams = { month?: string; year?: string; span?: string; explore?: string; months?: string };

/** The phase map's window rides in the URL, so its links have to preserve the
 *  other params on the page — a reader who has the raw-conditions disclosure open
 *  and the year picker set should not lose either by changing the window. */
const buildSpanHref = (params: HistorySearchParams | undefined, span: string) => {
  const query = new URLSearchParams();
  if (params?.month) query.set("month", params.month);
  if (params?.year) query.set("year", params.year);
  if (params?.explore) query.set("explore", params.explore);
  query.set("span", span);
  return `/history?${query.toString()}#phase-map-heading`;
};

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
  const phaseSpan = resolvePhaseSpan(resolvedSearchParams?.span);
  const phaseSeries = fullSeries.slice(-phaseSpan.months);

  const historySectionLinks = [
    { href: "#regime-map", label: "Regime plane" },
    { href: "#track-record", label: "Track record" },
    ...(publishedBriefs.length > 0 ? [{ href: "#published-briefs", label: "Published briefs" }] : []),
  ];

  /*
   * The hub's markup: a CollectionPage over the regime-history Dataset, with an
   * ItemList naming the 82 archive periods and every published week that hang
   * off it. Until now the largest cluster in the sitemap had no declared parent.
   */
  const structuredData = buildHistoryStructuredData({
    /* The year strip below is what this page links; the quarters are reachable
       from their parent year. Declaring them here would name URLs the rendered
       page does not contain. */
    periods: postureArchiveYears.map((year) => ({ slug: year.slug, title: year.title, kind: "year" as const })),
    publishedBriefs,
    coverage:
      fullSeries.length > 0
        ? { from: fullSeries[0].recordDate, to: fullSeries[fullSeries.length - 1].recordDate }
        : null,
  });

  return (
    <ReportShell
      model={{
        // The newest month the record actually covers. This was an empty string,
        // which rendered a dangling "As of" on the one page whose subject is dates.
        // The line describes the record, not the live brief: every other page
        // fills this slot from the live read, and with a "stable" tone this page
        // printed "Live" beside the archive's latest month — two different
        // current calls one click apart. The historical tone names what the
        // numbers are.
        status: {
          statusLabel: trackRecord?.currentRegimeLabel ?? "Historical",
          regime: trackRecord?.currentRegime,
          recordDateLabel: trackRecord ? formatDateUTC(trackRecord.latestRecordDate) : "",
          fetchedAtLabel: "",
        },
        page: { pageTitle: "History", pageSummary: "Past calls, as they were published.", sectionLinks: historySectionLinks },
        trust: { trustStatusTone: "historical" },
        chrome: { sidebarVariant: "full" },
        payloads: { structuredData },
      }}
    >
      {/* The shell's h1 already says History and TrackRecord names itself directly below, so a
          second h1 here restated both; only the export action keeps this row. */}
      <div className="flex justify-end mb-4">
        <ExportBoardAnnexButton record={trackRecord} />
      </div>

      {/* The plane first. It is the one graphic on the page that shows where the
          call sits and how near the next one is; the record below says how often
          it moved and lists each call. It used to sit under a twelve-row table. */}
      <div id="regime-map" data-page-section="regime-map" tabIndex={-1} className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400">
        <RegimePhaseMap
          series={phaseSeries}
          activeSpan={phaseSpan.key}
          spanHref={(span) => buildSpanHref(resolvedSearchParams, span)}
          totalMonths={fullSeries.length}
        />
      </div>

      <div id="track-record" data-page-section="track-record" tabIndex={-1} className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400">
        <TrackRecord
          record={trackRecord}
          allMonthsOpen={isDisclosureOpenInParams(resolvedSearchParams, "months")}
        />
      </div>

      {publishedBriefs.length > 0 ? (
        <section
          id="published-briefs"
          data-page-section="published-briefs"
          tabIndex={-1}
          aria-labelledby="published-briefs-heading"
          className="weather-panel space-y-4 px-5 py-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400"
        >
          <div>
            <h2 id="published-briefs-heading" className="type-eyebrow">Published weekly briefs</h2>
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

      {/* Grades the record above: which regime changes were visible in the near band
          beforehand, and which were not. */}
      <TrackRecordSection series={statsSeries} />

      <section
        data-page-section="posture-by-year"
        tabIndex={-1}
        aria-labelledby="posture-by-year-heading"
        className="weather-panel space-y-4 px-5 py-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400"
      >
        <h2 id="posture-by-year-heading" className="type-eyebrow">Posture by year</h2>
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
          {/* The whole record, not the trailing 24 months `regimeSeries` holds
              for the trend sparklines: the explorer offers every month back to
              2012, and handing it a shorter series left most of them selectable
              but unresolvable. */}
          <HistoryExplorer
            initialMonth={Number(resolvedSearchParams?.month) || 0}
            initialYear={Number(resolvedSearchParams?.year) || 0}
            regimeSeries={fullSeries}
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

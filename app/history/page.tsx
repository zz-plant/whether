import { ScreenshotCaption } from "../components/screenshotCaption";
import Link from "next/link";
import { ActionLink } from "../components/ui/actionLink";
import { Tag } from "../components/ui/tag";
import { HistoricalTrendChart } from "../components/historicalTrendChart";
import { UrlDetails } from "../components/ui/urlDetails";
import { isDisclosureOpenInParams } from "../components/ui/disclosureUrlState";
import { RegimePhaseMap } from "../components/history/RegimePhaseMap";
import { MonthStrip } from "../components/history/monthStrip";
import { TrackRecordTable, TrackRecordTiles } from "../components/history/TrackRecord";
import { TrackRecordSection } from "../components/history/TrackRecordSection";
import { CONFIDENCE_RECORD_TITLE, ConfidenceRecordSummary } from "../components/history/confidenceRecord";
import { ReportShell } from "../components/reportShell";
import { getTimeMachineRegimeSeries } from "../../lib/timeMachine/timeMachineCache";
import { buildPostureArchivePath, postureArchiveYears } from "../../lib/summary/postureArchiveYears";
import { buildPublishedBriefPath, getPublishedBriefs, groupPublishedBriefRuns, publishedBriefDisplay, publishedBriefRunLabel, publishedBriefWeekLabel } from "../../lib/report/publishedBriefs";
import { buildHistoryStructuredData } from "../../lib/seo/pageStructuredData";
import { buildTrackRecord } from "../../lib/report/trackRecord";
import { resolvePhaseSpan } from "../../lib/regimePhaseSpace";
import { formatDateUTC } from "../../lib/formatters";
import { regimeKeyFromLabel, toWeatherLabel } from "../../lib/regimeLabels";
import { getRegimePublicLabel } from "../../lib/regimePresentation";
import { ConditionIcon } from "../components/ui/conceptIcons";
import { ExportBoardAnnexButton } from "../components/history/ExportBoardAnnexButton";
import { HistoryExplorer } from "./historyExplorer";
import { ComparePanel } from "../history/compare/ComparePanel";
import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { regimeSignalLabel } from "../../lib/report/signalTranslations";
import { RISK_APPETITE_REGIME_THRESHOLD, TIGHTNESS_REGIME_THRESHOLD } from "../../lib/regimeEngine";

/*
 * /history had no `metadata` export at all, so it inherited the root layout's
 * title, description and (until that was removed) its canonical — shipping the
 * homepage's three identity tags on the hub that 81 archive-period URLs hang
 * off, the largest single cluster in the sitemap.
 */
export const metadata: Metadata = buildPageMetadata({
  title: "History and Track Record",
  description:
    "Every month-end reading on record, each change in conditions, the length of each spell, and the published weekly briefs behind the track record.",
  path: "/history",
  imageAlt: "Whether history and track record",
  imageParams: { template: "record", eyebrow: "History" },
});

type HistorySearchParams = { month?: string; year?: string; span?: string; explore?: string; months?: string; map?: string; compare?: string; yearA?: string; monthA?: string; yearB?: string; monthB?: string };

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
  // answers to one question. The grading section below still reads 60 months.
  const fullSeries = getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER);
  /* Thirteen month-ends for a twelve-month move. Twelve read "Risk appetite
     fell 6 over 12 months to 56" across Sep 2025 to Aug 2026, which is eleven
     months; from Aug 2025 (66) it fell 10. */
  const tightnessTrend = regimeSeries.slice(-13).map((entry) => ({ date: entry.recordDate, value: entry.tightness }));
  const riskAppetiteTrend = regimeSeries.slice(-13).map((entry) => ({ date: entry.recordDate, value: entry.riskAppetite }));
  const publishedBriefs = getPublishedBriefs();
  const trackRecord = buildTrackRecord(fullSeries);
  const phaseSpan = resolvePhaseSpan(resolvedSearchParams?.span);
  const phaseSeries = fullSeries.slice(-phaseSpan.months);
  /* The month strip ends at the last month-end, and its "held since" line was
     where a predicted-attention pass (2026-09-30) put the eye first, while every
     other route showed the week's call — Sunny here, Freezing there, with
     nothing saying why. The newest published week bridges the two, from the
     record rather than a live read, and only when it is newer than the strip. */
  const latestWeek = publishedBriefs.reduce<(typeof publishedBriefs)[number] | undefined>(
    (latest, brief) => (!latest || brief.recordDate > latest.recordDate ? brief : latest),
    undefined,
  );
  const weekAfterRecord =
    latestWeek && trackRecord && latestWeek.recordDate > trackRecord.latestRecordDate ? latestWeek : undefined;

  /* The two questions the page summary names, in that order: what the
     guidance said (the month strip with its years, then the published weeks),
     then how it held up (the tiles and their grading). The method (the phase
     map) and the lookup tables follow, closed. The published weeks sat fifth,
     under the phase map, though they are the record a reader cites. The rail
     follows the page. */
  const historySectionLinks = [
    ...(fullSeries.length > 0 ? [{ href: "#call-by-month", label: "Conditions by month" }] : []),
    ...(publishedBriefs.length > 0 ? [{ href: "#published-briefs", label: "Published briefs" }] : []),
    ...(trackRecord ? [{ href: "#track-record", label: "Track record" }] : []),
    { href: "#regime-map", label: "How the two scores set conditions" },
    ...(trackRecord ? [{ href: "#monthly-calls", label: "Monthly readings" }] : []),
  ];

  /*
   * The hub's markup: a CollectionPage over the regime-history Dataset, with an
   * ItemList naming the 82 archive periods and every published week that hang
   * off it. Until now the largest cluster in the sitemap had no declared parent.
   */
  const compareOpen = Boolean(resolvedSearchParams?.yearA || resolvedSearchParams?.monthA || resolvedSearchParams?.compare === "1");
  const compareContent = compareOpen ? await ComparePanel({ searchParams: resolvedSearchParams }) : null;

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
          /* Qualified, because the status line is the largest type in the
             intro and the intro is what a phone screenshot of this page
             catches. A bare "Sunny" there, with "As of Aug 31" in small print
             beside it, reads as the current call on a week the brief may be
             calling something else. */
          statusLabel: trackRecord ? trackRecord.currentRegimeLabel : "Historical",
          statusPrefix: trackRecord ? "Last completed month" : undefined,
          /* Deliberately no regime. This field is only the page accent — the hue
             the whole chrome, every section rule and the mobile outline draw in
             — and it is the site saying "this is the weather". Fed the month-end
             regime, /history rendered its entire chrome Sunny on a week the
             brief was calling Freezing, so the site changed its mind one click
             apart. The status line above still names the archive's own regime,
             which is the part that describes the numbers on the page; the accent
             is neutral, because this page is about every regime on record rather
             than one. */
          recordDateLabel: trackRecord ? formatDateUTC(trackRecord.latestRecordDate) : "",
          fetchedAtLabel: "",
        },
        /* "Record", the group this page is the hub of (`navigationGroups`): the
           header tab, the sub-tab and the breadcrumb all name it so. */
        page: { pageTitle: "Record", pageSummary: "Look up the guidance for any past month and see how it held up.", sectionLinks: historySectionLinks, currentPath: "/history" },
        trust: { trustStatusTone: "historical" },
        chrome: { sidebarVariant: "full" },
        payloads: { structuredData },
      }}
    >
      {/* The record's answer, legible in a second: every month coloured by the
          call, the changes marked, the current run named. The page used to open
          with the phase map, which a first-time reader has to learn before it
          says anything; the map is drawn below, as the explanation. */}
      {fullSeries.length > 0 ? (
        <section
          id="call-by-month"
          data-page-section="call-by-month"
          tabIndex={-1}
          aria-labelledby="call-by-month-heading"
          className="weather-panel space-y-4 px-5 max-sm:px-0 py-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400"
        >
          <h2 id="call-by-month-heading" className="text-[1.375rem] leading-tight font-semibold text-white sm:text-2xl">Conditions by month</h2>
          {weekAfterRecord ? (
            <p className="text-sm text-slate-300">
              Since the last month-end, the week of {publishedBriefWeekLabel(weekAfterRecord)} was published as{" "}
              <span className="font-semibold text-white">{publishedBriefDisplay(weekAfterRecord).conditions}</span>.{" "}
              {/* Inline with vertical padding, not the 44px inline-flex box: on a
                  phone the box wrapped onto its own line and opened the paragraph
                  to twice its leading. */}
              <Link
                href={buildPublishedBriefPath(weekAfterRecord.slug)}
                className="weather-hit py-3 font-semibold text-sky-300 underline decoration-sky-700 underline-offset-4 hover:text-sky-200"
              >
                Read that week
              </Link>
            </p>
          ) : null}
          <MonthStrip entries={fullSeries} />
          {/* Each closed year, under the strip it summarises. "Conditions by
              year" was a section of its own near the foot of the page, ten
              screens from the strip that draws the same months. */}
          <div className="space-y-2">
            <h3 className="type-eyebrow">Each closed year</h3>
            {/* Two even columns on a phone: fourteen chips of three widths
                wrapped into a ragged stack. From `sm` they flow. */}
            <ul className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {postureArchiveYears.map((year) => {
                const yearRegime = regimeKeyFromLabel(year.operatorLabel);
                return (
                  <li key={year.slug}>
                    <ActionLink href={buildPostureArchivePath(year.slug)} variant="pill" className="max-sm:w-full">
                      {year.title}
                      <span className="ml-2 inline-flex items-center gap-1 text-slate-400">
                        {yearRegime ? <ConditionIcon regime={yearRegime} /> : null}
                        {toWeatherLabel(year.operatorLabel)}
                      </span>
                    </ActionLink>
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="max-w-prose text-sm text-slate-300">
            These months are scored today, with the current model. They don&rsquo;t show what we said at
            the time or what any company did. For what we actually published, use the dated briefs below.
          </p>
          {/* One link (2026-10-27). "Compare funding conditions across periods" and "Read
              the current weekly brief" sat beside it, both already in the page's own tabs
              and the site's, and the compare page a third time in the fold below. */}
          <ActionLink href="/answers/how-to-brief-executives-on-market-conditions" variant="inline">Prepare a board decision note</ActionLink>
        </section>
      ) : null}

      {publishedBriefs.length > 0 ? (
        <section
          id="published-briefs"
          data-page-section="published-briefs"
          tabIndex={-1}
          aria-labelledby="published-briefs-heading"
          className="weather-panel space-y-4 px-5 max-sm:px-0 py-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400"
        >
          <div>
            <h2 id="published-briefs-heading" className="text-[1.375rem] leading-tight font-semibold text-white sm:text-2xl">Published weekly briefs</h2>
            {/* Say what the archive holds, not what it aspires to. With one entry,
                "permanent, immutable calls cited in board documents" promised a
                record the page could not show. The count is the honest claim; the
                append-only rule is the guarantee worth stating. The readings go
                unnumbered (2026-10-09): their count and window are the track
                record's "Months on record" tile, and this line printed them a
                second time ("177 month-end readings, Jan 2012 to Sep 2026"). */}
            <p className="text-sm text-slate-300">
              {publishedBriefs.length === 1
                ? `We keep every weekly brief, next to the monthly readings, and never edit one after it's published.`
                : `${publishedBriefs.length} weekly briefs, next to the monthly readings. We never edit a brief after it's published.`}
            </p>
          </div>
          {/* A link card, not a pill coerced into one: the `pill` variant is a
              control, and it was carrying a border, a fill and a column layout
              it does not own. The title is the anchor's first paragraph, which
              is where decision-flow.css puts the one underline. */}
          {/* One card per run of the same guidance, each saying the week once and the
              conditions once (2026-10-27). A card printed "Freezing — week of Oct 6,
              2026", then "Oct 6, 2026", then a FREEZING stamp, and four weeks of the
              same two sentences took four cards. The run links its newest week and
              lists every week under it, since each still has its own page. */}
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groupPublishedBriefRuns(publishedBriefs).map((run) => {
              const [newest] = run;
              return (
                <li key={newest.slug} data-frame-block="" className="flex flex-col gap-1.5">
                  {/* `minHeight: 0` beats the card's `min-height: 100%` (an unlayered class a
                      utility cannot override): at the item's full height it pushed a run's week
                      links out of the item and onto the next card. */}
                  <Link href={buildPublishedBriefPath(newest.slug)} className="weather-hub-link-card flex-1 text-slate-100" style={{ minHeight: 0 }}>
                    <p className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold tabular-nums text-slate-100">{publishedBriefRunLabel(run)}</span>
                      {/* The conditions stamp every page draws: glyph, word and hue. */}
                      <Tag regime={newest.regime}>{getRegimePublicLabel(newest.regime)}</Tag>
                    </p>
                    <p className="text-fluid-xs text-slate-400 line-clamp-2">{newest.summary}</p>
                  </Link>
                  {run.length > 1 ? (
                    <p className="flex flex-wrap gap-x-3 px-1 text-fluid-xs text-slate-400" data-brief-run-weeks>
                      <span>Each week:</span>
                      {run.map((brief) => (
                        <Link key={brief.slug} href={buildPublishedBriefPath(brief.slug)} className="weather-hit tabular-nums underline decoration-slate-600 underline-offset-4 hover:text-slate-200">
                          {publishedBriefWeekLabel(brief).replace(/, \d{4}$/, "")}
                        </Link>
                      ))}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* The tiles, with the confidence record's headline beside them: "how often
          did the call hold" and "how often was the margin right" are the same
          question asked twice. The study itself, table and all, is /calibration's;
          this page drew all of it until 2026-10-09. */}
      <div id="track-record" data-page-section="track-record" tabIndex={-1} className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400">
        {/* The export copies the track record, so it sits in that section's
            header. It had a row of its own between the page intro and the
            first section, belonging to neither. */}
        <TrackRecordTiles
          record={trackRecord}
          action={trackRecord ? <ExportBoardAnnexButton record={trackRecord} /> : null}
          aside={
            <div className="space-y-3">
              <h3 className="type-eyebrow">{CONFIDENCE_RECORD_TITLE}</h3>
              <ConfidenceRecordSummary />
              <p className="text-fluid-xs text-slate-400">
                <Link href="/calibration" className="weather-hit underline decoration-slate-600 underline-offset-4 hover:text-slate-200">
                  Read the calibration study
                </Link>
              </p>
            </div>
          }
        />
      </div>

      {/* Grades the record above: which regime changes were visible in the near band
          beforehand, and which were not. */}
      <TrackRecordSection series={statsSeries} recordChanges={trackRecord?.regimeChanges} />

      <div id="regime-map" data-page-section="regime-map" tabIndex={-1} className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400">
        <RegimePhaseMap
          series={phaseSeries}
          activeSpan={phaseSpan.key}
          spanHref={(span) => buildSpanHref(resolvedSearchParams, span)}
          totalMonths={fullSeries.length}
          /* A window link sets `span`, and lands on a chart it just changed. */
          open={isDisclosureOpenInParams(resolvedSearchParams, "map") || Boolean(resolvedSearchParams?.span)}
        />
      </div>

      <div id="monthly-calls" data-page-section="monthly-calls" tabIndex={-1} className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400">
        <TrackRecordTable
          record={trackRecord}
          allMonthsOpen={isDisclosureOpenInParams(resolvedSearchParams, "months")}
        />
      </div>

      <UrlDetails
        queryKey="compare"
        initialOpen={Boolean(resolvedSearchParams?.yearA || resolvedSearchParams?.monthA || resolvedSearchParams?.compare === "1")}
        className="weather-auto-chevron weather-panel px-5 py-4"
        summaryClassName="cursor-pointer select-none text-fluid-xs font-medium text-white/70"
        summary={<span>Compare two periods side by side</span>}
      >
        <div className="mt-4">
          {compareOpen ? compareContent : <ActionLink href="/history/compare" variant="inline">Open the full comparison</ActionLink>}
        </div>
      </UrlDetails>

      <UrlDetails
        queryKey="explore"
        initialOpen={isDisclosureOpenInParams(resolvedSearchParams, "explore")}
        className="weather-auto-chevron weather-panel px-5 py-4"
        summaryClassName="cursor-pointer select-none text-fluid-xs font-medium text-white/70"
        summary={<span>Explore past months and signal trends</span>}
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
          <div className="grid gap-6 sm:grid-cols-2">
            <HistoricalTrendChart label={regimeSignalLabel.tightness} color="var(--color-semantic-tightening-border)" points={tightnessTrend} periodLabel="months" changeLine={TIGHTNESS_REGIME_THRESHOLD} />
            <HistoricalTrendChart label={regimeSignalLabel.riskAppetite} color="var(--color-semantic-easing-border)" points={riskAppetiteTrend} increaseIsPositive periodLabel="months" changeLine={RISK_APPETITE_REGIME_THRESHOLD} />
            <ScreenshotCaption className="sm:col-span-2" />
          </div>
        </div>
      </UrlDetails>
    </ReportShell>
  );
}

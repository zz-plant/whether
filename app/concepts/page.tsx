import type { Metadata } from "next";

import { buildPageMetadata } from "../../lib/seo";
import { buildProductCanonStructuredData } from "../../lib/seo/pageStructuredData";
import { SecondaryPageHeader, SecondaryPageSection } from "../components/secondaryPageShell";
import { JsonLdScript } from "../components/jsonLdScript";
import { ActionLink } from "../components/ui/actionLink";
import { Tag } from "../components/ui/tag";
import { getTimeMachineRegimeSeries } from "../../lib/timeMachine/timeMachineCache";
import { buildPublishedBriefPath, latestPublishedBrief, publishedBriefDisplay } from "../../lib/report/publishedBriefs";
import { buildPostureArchivePath, postureArchiveYears } from "../../lib/summary/postureArchiveYears";
import { getOrderedRegimeLegend } from "../../lib/regimePresentation";
import { getPlaybookForRegime } from "../../lib/playbook";
import { formatDateUTC } from "../../lib/formatters";
import { ADVICE_STANCE_DEFINITIONS, ADVICE_STANCE_RUBRIC, ADVICE_STANCES } from "../../lib/adviceStance";
import {
  buildCanonBaseRate,
  buildCanonTimeline,
  canonChangeLines,
  canonEssays,
  describeCanonBaseRate,
  essaysWrittenIn,
  formatCanonAuthors,
  formatCanonPublished,
  formatCanonShare,
  type CanonReading,
} from "../../lib/productCanon";
import {
  buildAdvicePairs,
  buildCapitalAdviceLag,
  buildScoreAlignment,
  describeAdvicePairs,
  describeCapitalAdviceLag,
  describeScoreAlignment,
} from "../../lib/productCanonMeasures";
import { ContentPageShell } from "../components/ui/contentPageShell";
import { SectionTabs } from "../components/sectionTabs";
import { AdvicePlane, type AdvicePlanePoint } from "./advicePlane";
import { AdviceCorpusSection } from "./adviceCorpusSection";

export const runtime = "edge";

/**
 * Widely read writing on products and capital, against the month-end record.
 *
 * Restored on 2026-09-23 after six months as a redirect to /trust, and turned
 * into a test on 2026-10-09: does advice on money and headcount move with the
 * conditions while advice on method does not? What changed from the first
 * version, and why, is recorded at the top of `lib/productCanon.ts`. The short
 * form: every month-specific claim on this page is one the record varies by,
 * every share sits beside the share of months, and the page says what the
 * sample shows even where that is less than the question hopes.
 */
/* The title is the search: "product management reading list" is what people type,
   and the whole tag has to fit a result line (~60 characters with the site suffix).
   The H1 asks the page's question; the title stays the phrase people search. */
export const metadata: Metadata = buildPageMetadata({
  title: "Product Management Reading List, Dated by Market",
  description:
    `${canonEssays.length} product management essays, books and investor memos, from Cagan to Sequoia, each dated and placed on the market conditions of the month it came out.`,
  path: "/concepts",
  imageAlt: "Product management reading list, dated by market conditions",
  /* Without these the share card is the live weekly-guidance card, so a link to a
     reading list previewed as this week's numbers. */
  imageParams: {
    template: "reading",
    eyebrow: "Product management reading list",
    title: "Does startup advice follow the market?",
    subtitle: `${canonEssays.length} essays, books and investor memos, each placed on the record at the month it came out since 2012.`,
    kicker: "Whether — weekly operating guidance",
  },
});

const monthsLabel = (months: number) => (months === 1 ? "1 month" : `${months} months`);

/* The archive publishes a page per completed year; the current year has none yet,
   so a reading from it stays plain text rather than linking to a 404. */
const archivedYears = new Set(postureArchiveYears.map((year) => year.slug));

/* The conditions the month an essay came out, as the regime's stamp, then how
   long they had held. It was grey 14px text after "Conditions that month:", so
   the one fact the page exists to add read as the smallest thing in each entry. */
function ReadingLabel({ reading, recordStart }: { reading: CanonReading; recordStart: string | null }) {
  if (reading.kind === "before-record") {
    return (
      <span className="text-xs text-slate-400">
        Before the record{recordStart ? ` starts on ${recordStart}` : ""}
      </span>
    );
  }
  if (reading.kind === "after-record") {
    return <span className="text-xs text-slate-400">After the latest month on record</span>;
  }
  return (
    <>
      <Tag regime={reading.regime}>{reading.conditions}</Tag>
      <span className="text-xs text-slate-400">
        {reading.heldSinceRecordStart
          ? `at least ${monthsLabel(reading.heldMonths)} running, since the record starts`
          : reading.heldMonths === 1
            ? "the first month of it"
            : `${monthsLabel(reading.heldMonths)} running`}
      </span>
    </>
  );
}

type TimelineEssay = ReturnType<typeof buildCanonTimeline>[number];

/*
 * Where the list falls by year: one column per year from the oldest essay to
 * the newest, one square per essay, filled in the conditions the month it came
 * out and hollow outside the record. This is the one view of the list that
 * shows the clusters and the colours at once. Drawn from the same timeline the
 * entries print; aria-hidden, with the same facts in a sentence for a screen
 * reader, which also has the list itself.
 */
function EssayYearStrip({ timeline, recordStart }: { timeline: readonly TimelineEssay[]; recordStart: string | null }) {
  if (timeline.length === 0) return null;
  const firstYear = timeline[0].published.year;
  const lastYear = timeline[timeline.length - 1].published.year;
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index);
  const byYear = new Map<number, TimelineEssay[]>();
  for (const essay of timeline) byYear.set(essay.published.year, [...(byYear.get(essay.published.year) ?? []), essay]);
  /* The key lists only what the strip draws (ui-ux-standards §XVI), in the
     order the table above lists the conditions. */
  const drawn = new Set(timeline.flatMap((essay) => (essay.reading.kind === "reading" ? [essay.reading.regime] : [])));
  const legend = getOrderedRegimeLegend().filter((entry) => drawn.has(entry.regime));
  const beforeRecord = timeline.some((essay) => essay.reading.kind === "before-record");
  const afterRecord = timeline.some((essay) => essay.reading.kind === "after-record");
  const labelled = (year: number) => year === firstYear || year === lastYear || (year % 5 === 0 && year - firstYear > 2 && lastYear - year > 2);
  return (
    <figure className="max-w-2xl space-y-2" data-essay-year-strip>
      <p className="sr-only">
        {`${timeline.length} texts by year of first publication, ${firstYear} to ${lastYear}, each marked with the conditions the month it came out.`}
      </p>
      <div aria-hidden="true" className="grid grid-flow-col auto-cols-fr items-end gap-px border-b border-[color:var(--border-default)] pb-1">
        {years.map((year) => (
          <div key={year} className="flex flex-col-reverse items-center gap-0.5">
            {(byYear.get(year) ?? []).map((essay) =>
              essay.reading.kind === "reading" ? (
                <span
                  key={essay.slug}
                  data-regime={essay.reading.regime}
                  title={`${essay.title}, ${formatCanonPublished(essay)}: ${essay.reading.conditions}`}
                  className="block size-2.5 rounded-sm bg-[var(--regime-accent)] sm:size-3"
                />
              ) : (
                <span
                  key={essay.slug}
                  title={`${essay.title}, ${formatCanonPublished(essay)}`}
                  className="block size-2.5 rounded-sm border border-[color:var(--app-text-muted)] sm:size-3"
                />
              ),
            )}
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="grid grid-flow-col auto-cols-fr text-fluid-nano tabular-nums text-slate-400">
        {years.map((year) => (
          /* A year is wider than its column on a phone. Flex alignment, not
             text-align, so it overflows both ways about the column's centre
             (text that does not fit is start-aligned whatever text-align says),
             and the end labels hang inward instead of past the gutter. */
          <span
            key={year}
            className={`flex whitespace-nowrap ${year === firstYear ? "justify-start" : year === lastYear ? "justify-end" : "justify-center"}`}
          >
            {labelled(year) ? year : ""}
          </span>
        ))}
      </div>
      <ul aria-hidden="true" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
        {legend.map((entry) => (
          <li key={entry.regime} className="flex items-center gap-1.5">
            <span aria-hidden="true" data-regime={entry.regime} className="inline-block size-2.5 rounded-sm bg-[var(--regime-accent)]" />
            {entry.label}
          </li>
        ))}
        {[
          beforeRecord ? `Before the record${recordStart ? ` starts on ${recordStart}` : ""}` : null,
          afterRecord ? "After the latest month on record" : null,
        ].map((label) =>
          label ? (
            <li key={label} className="flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block size-2.5 rounded-sm border border-[color:var(--app-text-muted)]" />
              {label}
            </li>
          ) : null,
        )}
      </ul>
    </figure>
  );
}

/* One side of a pair: the advice, the text, its month and the record that month. */
function PairSide({ essay }: { essay: TimelineEssay }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-x-4">
      <p className="type-eyebrow">{ADVICE_STANCE_DEFINITIONS[essay.stance].label}</p>
      <div className="min-w-0 space-y-1">
        <p className="text-sm text-slate-300">
          <a href={`#${essay.slug}`} className="text-slate-100 underline decoration-slate-600 underline-offset-4 hover:text-white">
            {essay.title}
          </a>{" "}
          — {formatCanonAuthors(essay)}, {formatCanonPublished(essay)}
        </p>
        {essay.reading.kind === "reading" ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums text-slate-400">
            <Tag regime={essay.reading.regime}>{essay.reading.conditions}</Tag>
            <span>
              Funding pressure {essay.reading.fundingPressure} · Risk appetite {essay.reading.riskAppetite}
            </span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function ProductCanonPage() {
  const series = getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER);
  const timeline = buildCanonTimeline(series);
  const baseRate = buildCanonBaseRate(series, timeline);
  const lag = buildCapitalAdviceLag(timeline);
  const alignment = buildScoreAlignment(series, timeline);
  const pairs = buildAdvicePairs(timeline);
  const recordStart = series.length > 0 ? formatDateUTC(series[0].recordDate) : null;
  const recordEnd = series.length > 0 ? formatDateUTC(series[series.length - 1].recordDate) : null;
  const planePoints: AdvicePlanePoint[] = timeline.flatMap((essay) =>
    essay.reading.kind === "reading"
      ? [
          {
            slug: essay.slug,
            title: essay.title,
            published: formatCanonPublished(essay),
            stance: essay.stance,
            regime: essay.reading.regime,
            conditions: essay.reading.conditions,
            fundingPressure: essay.reading.fundingPressure,
            riskAppetite: essay.reading.riskAppetite,
          },
        ]
      : [],
  );

  const thisWeek = latestPublishedBrief
    ? {
        conditions: publishedBriefDisplay(latestPublishedBrief).conditions,
        publishedLabel: formatDateUTC(latestPublishedBrief.publishedAt),
        href: buildPublishedBriefPath(latestPublishedBrief.slug),
        essays: essaysWrittenIn(timeline, latestPublishedBrief.regime),
        monthsInConditions: baseRate.rows.find((row) => row.regime === latestPublishedBrief.regime)?.months ?? 0,
      }
    : null;

  return (
    <ContentPageShell measure="wide">
      <JsonLdScript data={buildProductCanonStructuredData({ essays: timeline })} />
      <SectionTabs currentPath="/concepts" />

      <SecondaryPageHeader
        title="Does startup advice follow the market?"
        description={`Mostly no: the advice did not change direction when the money did. ${timeline.length} widely read essays, books and investor memos, each placed on the record at the month it came out${recordStart && recordEnd ? ` from ${recordStart} to ${recordEnd}` : ""}. Advice on hiring, raising and spending is tagged Expand or Conserve, and method advice is tagged Craft. The test is whether the capital texts track the conditions while the craft texts do not. The list below is a reading list. The corpus beneath it tests the list.`}
      />

      <SecondaryPageSection title="What the record shows" description={describeCanonBaseRate(baseRate)}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          <AdvicePlane points={planePoints} lines={canonChangeLines} />
          <div className="min-w-0 space-y-6">
            <div className="overflow-x-auto">
              {/* Nowrap and a smaller face below `sm`: at 390px a wrapped cell split each count from its share. */}
              <table className="w-full whitespace-nowrap text-left text-xs text-slate-300 sm:text-sm">
                <caption className="sr-only">Texts of each kind published in each set of conditions, against months on record</caption>
                <thead className="type-eyebrow">
                  <tr>
                    <th scope="col" className="py-2 pr-3 font-medium sm:pr-4">Conditions</th>
                    <th scope="col" className="py-2 pr-3 font-medium sm:pr-4">Months</th>
                    {ADVICE_STANCES.map((stance) => (
                      <th key={stance} scope="col" className="py-2 pr-3 font-medium last:pr-0 sm:pr-4">
                        {ADVICE_STANCE_DEFINITIONS[stance].label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {baseRate.rows.map((row) => (
                    <tr key={row.regime} className="border-t border-[color:var(--border-subtle)]">
                      <th scope="row" className="py-2 pr-3 font-normal text-slate-100 sm:pr-4">{row.conditions}</th>
                      <td className="py-2 pr-3 tabular-nums sm:pr-4">
                        {row.months} ({formatCanonShare(row.monthShare)})
                      </td>
                      {ADVICE_STANCES.map((stance) => (
                        <td key={stance} className="py-2 pr-3 tabular-nums last:pr-0 sm:pr-4">
                          {row.byStance[stance].count} ({formatCanonShare(row.byStance[stance].share)})
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="border-t border-[color:var(--border-subtle)] text-slate-400">
                    <th scope="row" className="py-2 pr-3 font-normal sm:pr-4">On the record</th>
                    <td className="py-2 pr-3 tabular-nums sm:pr-4">{baseRate.monthsOnRecord}</td>
                    {ADVICE_STANCES.map((stance) => (
                      <td key={stance} className="py-2 pr-3 tabular-nums last:pr-0 sm:pr-4">
                        {baseRate.placed[stance]}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
              {baseRate.beforeRecord > 0 ? (
                <p className="mt-2 text-xs text-slate-400">
                  {baseRate.beforeRecord === 1
                    ? "One text predates the record and is left out of the shares."
                    : `${baseRate.beforeRecord} texts predate the record and are left out of the shares.`}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-semibold text-slate-100">How soon after the record moved</h3>
              <ul className="space-y-1.5 text-sm text-slate-300">
                {describeCapitalAdviceLag(lag).map((sentence) => (
                  <li key={sentence}>{sentence}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-semibold text-slate-100">Funding pressure or risk appetite</h3>
              <ul className="space-y-1.5 text-sm text-slate-300">
                {describeScoreAlignment(alignment).map((sentence) => (
                  <li key={sentence}>{sentence}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </SecondaryPageSection>

      <AdviceCorpusSection />

      {pairs.length > 0 ? (
        <SecondaryPageSection
          title="Same decision, opposite advice"
          description={`Each pair is two widely read texts on one decision, pointing opposite ways. ${describeAdvicePairs(pairs)}`}
        >
          <ul className="space-y-5">
            {pairs.map((pair) => (
              <li key={pair.decision} data-frame-block="" className="space-y-3 border-t border-[color:var(--border-subtle)] pt-4 first:border-t-0 first:pt-0">
                <h3 className="text-base font-semibold text-slate-100">{pair.decision}</h3>
                <PairSide essay={pair.expand} />
                <PairSide essay={pair.conserve} />
              </li>
            ))}
          </ul>
        </SecondaryPageSection>
      ) : null}

      {thisWeek ? (
        <SecondaryPageSection
          title={`Written in conditions like this week's: ${thisWeek.conditions}`}
          description={`This week's guidance, published ${thisWeek.publishedLabel}, is for ${thisWeek.conditions} conditions. These were published in ${thisWeek.conditions} months.`}
          actions={
            <ActionLink href={thisWeek.href} variant="pill">
              Read this week&rsquo;s guidance
            </ActionLink>
          }
        >
          {thisWeek.essays.length > 0 ? (
            <ul className="space-y-2 text-sm text-slate-300">
              {thisWeek.essays.map((essay) => (
                <li key={essay.slug}>
                  <a href={`#${essay.slug}`} className="text-slate-100 underline decoration-slate-600 underline-offset-4 hover:text-white">
                    {essay.title}
                  </a>{" "}
                  — {formatCanonAuthors(essay)}, {formatCanonPublished(essay)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-300">
              None of these was published in a {thisWeek.conditions} month, across the{" "}
              {monthsLabel(thisWeek.monthsInConditions)} of {thisWeek.conditions} on record.
            </p>
          )}
        </SecondaryPageSection>
      ) : null}

      <SecondaryPageSection
        title="The list, oldest first"
        description="The date is first publication. If an essay later became a book, the note says which version the date refers to."
      >
        <EssayYearStrip timeline={timeline} recordStart={recordStart} />
        {/* From `sm` each entry has a rail: when it came out and the conditions
            that month, as a stamp. Down the page the rail reads as a timeline
            and the stamps as the record's colours, so the list can be scanned
            for either without reading every entry. On a phone the rail is the
            entry's first line. The date opens that year in the archive. */}
        <ol className="mt-6 space-y-5">
          {timeline.map((essay) => {
            const year = String(essay.published.year);
            const published = (
              <time dateTime={`${year}-${String(essay.published.month).padStart(2, "0")}`}>
                {formatCanonPublished(essay)}
              </time>
            );
            return (
              <li
                key={essay.slug}
                id={essay.slug}
                /* Off-screen entries skip their rendering until approached
                   (2026-10-22): this list is the longest surface on the site
                   and every entry was fully laid out on load. The intrinsic
                   size is the estimate the scrollbar uses before an entry
                   renders; `auto` remembers the real one after. Anchor links
                   from "this week" above still land: the browser renders a
                   targeted entry even while it is skipped. */
                className="grid gap-x-8 gap-y-2 border-t border-[color:var(--border-subtle)] pt-4 first:border-t-0 first:pt-0 [content-visibility:auto] [contain-intrinsic-size:auto_260px] sm:grid-cols-[10rem_minmax(0,1fr)]"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:flex-col sm:items-start">
                  <p className="type-eyebrow">
                    {archivedYears.has(year) ? (
                      <a
                        href={buildPostureArchivePath(year)}
                        className="weather-hit underline decoration-slate-600 underline-offset-4 hover:text-slate-200"
                      >
                        {published}
                      </a>
                    ) : (
                      published
                    )}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 max-sm:contents">
                    <span className="sr-only">Conditions that month: </span>
                    <ReadingLabel reading={essay.reading} recordStart={recordStart} />
                  </p>
                </div>
                <div className="min-w-0 max-w-[68ch]">
                  <h3 className="text-base font-semibold text-slate-100">
                    <a
                      href={essay.sourceUrl}
                      rel="noopener noreferrer"
                      className="underline decoration-slate-600 underline-offset-4 hover:text-white"
                    >
                      {essay.title}
                    </a>
                  </h3>
                  <p className="text-sm text-slate-400">
                    {formatCanonAuthors(essay)}
                    {essay.kind === "investorMemo" ? " · investor memo" : null}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">{essay.argument}</p>
                  <p className="mt-1 text-xs text-slate-400" data-advice={essay.stance}>
                    <span className="font-semibold text-slate-200">{ADVICE_STANCE_DEFINITIONS[essay.stance].label}.</span>{" "}
                    {essay.stanceBasis}
                  </p>
                  {essay.publishedNote ? <p className="mt-1 text-xs text-slate-400">{essay.publishedNote}</p> : null}
                </div>
              </li>
            );
          })}
        </ol>
      </SecondaryPageSection>

      <SecondaryPageSection
        title="What this does not show"
        description="Every number above carries its limit. None of them is a forecast."
      >
        <ul className="space-y-2 text-sm text-slate-300">
          <li>
            <span className="text-slate-100">A small, chosen sample.</span> These texts were picked because they
            were widely read; counting every post in the archives above checks that choice.
          </li>
          <li>
            <span className="text-slate-100">Publication, not adoption.</span> Each date is when a text came out. Advice
            can spread years later, or be drafted months before.
          </li>
          <li>
            <span className="text-slate-100">Texts that share a month.</span> Several memos came out within weeks of each
            other in 2020 and 2022. They count separately here, though they are closer to one observation.
          </li>
          <li>
            <span className="text-slate-100">Co-occurrence, not cause.</span> The record shows the conditions a text came
            out in. It cannot show why its author wrote it.
          </li>
          <li>
            <span className="text-slate-100">Nothing before the record.</span> Texts published before the record starts stay
            on the list but aren&apos;t counted in any share.
          </li>
          <li>
            <span className="text-slate-100">Tags are judgment calls.</span> Each entry prints the line its tag rests on.
            The rule: {ADVICE_STANCE_RUBRIC}
          </li>
        </ul>
      </SecondaryPageSection>

      <SecondaryPageSection
        title="What the four conditions mean"
        description="The four words this week's guidance uses. Each pairs the work it rewards with the work it punishes."
      >
        <ul className="space-y-3 text-sm text-slate-300">
          {getOrderedRegimeLegend().map((entry) => {
            const playbook = getPlaybookForRegime(entry.regime);
            return (
              <li key={entry.regime} className="space-y-1">
                <p>
                  <span className="text-slate-100">{entry.label}.</span> {entry.weatherRationale}
                </p>
                {playbook ? (
                  <>
                    <p className="text-slate-400">{playbook.insight}</p>
                    <p className="text-slate-400">
                      <span className="text-slate-300">Do more:</span> {playbook.start.slice(0, 2).join(" · ")}.{" "}
                      <span className="text-slate-300">Do less:</span> {playbook.stop.slice(0, 2).join(" · ")}.
                    </p>
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      </SecondaryPageSection>

      <SecondaryPageSection title="Sources">
        <ul className="space-y-2 text-sm text-slate-300">
          <li>
            Conditions and scores each month: the month-end record on{" "}
            <ActionLink href="/history" variant="inline">
              the history page
            </ActionLink>
            , computed by the same method behind this week&rsquo;s guidance. Each text&rsquo;s date links to that year&rsquo;s page in the archive.
          </li>
          <li>
            Texts: each title links to its author, firm or original publisher, wherever it is still online.
          </li>
        </ul>
      </SecondaryPageSection>
    </ContentPageShell>
  );
}

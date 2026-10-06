import type { Metadata } from "next";

import { buildPageMetadata } from "../../lib/seo";
import { buildProductCanonStructuredData } from "../../lib/seo/pageStructuredData";
import { SecondaryPageHeader, SecondaryPageSection } from "../components/secondaryPageShell";
import { JsonLdScript } from "../components/jsonLdScript";
import { ActionLink } from "../components/ui/actionLink";
import { getTimeMachineRegimeSeries } from "../../lib/timeMachine/timeMachineCache";
import { buildPublishedBriefPath, latestPublishedBrief, publishedBriefDisplay } from "../../lib/report/publishedBriefs";
import { buildPostureArchivePath, postureArchiveYears } from "../../lib/summary/postureArchiveYears";
import { REGIME_STYLE_TOKENS, getOrderedRegimeLegend } from "../../lib/regimePresentation";
import { formatDateUTC } from "../../lib/formatters";
import {
  buildCanonBaseRate,
  buildCanonTimeline,
  canonEssays,
  describeCanonBaseRate,
  essaysWrittenIn,
  formatCanonAuthors,
  formatCanonPublished,
  type CanonReading,
} from "../../lib/productCanon";
import { ContentPageShell } from "../components/ui/contentPageShell";

export const runtime = "edge";

/**
 * Product-management writing against the month-end record.
 *
 * Restored on 2026-09-23 after six months as a redirect to /trust. What changed
 * from the first version, and why, is recorded at the top of
 * `lib/productCanon.ts`; the short form is that every month-specific claim on
 * this page is one the record actually varies by, and the page states the base
 * rate before a reader can mistake a coincidence for a finding.
 */
/* The title is the search: "product management reading list" is what people type,
   and the whole tag has to fit a result line (~60 characters with the site suffix).
   The description leads with what no other reading list has, before Google cuts it. */
export const metadata: Metadata = buildPageMetadata({
  title: "Product Management Reading List, Dated by Market",
  description:
    `${canonEssays.length} product management essays and books, from Cagan to Torres, each dated and placed on the market conditions of the month it came out.`,
  path: "/concepts",
  imageAlt: "Product management reading list, dated by market conditions",
  /* Without these the share card is the live weekly-guidance card, so a link to a
     reading list previewed as this week's numbers. */
  imageParams: {
    template: "reading",
    eyebrow: "Product management reading list",
    title: "Product writing, against the market it was written in",
    subtitle: `${canonEssays.length} essays and books, each dated and placed on the month-end record since 2012.`,
    kicker: "Whether — weekly operating guidance",
  },
});

const percent = (share: number) => `${Math.round(share * 100)}%`;

const monthsLabel = (months: number) => (months === 1 ? "1 month" : `${months} months`);

/* The archive publishes a page per completed year; the current year has none yet,
   so a reading from it stays plain text rather than linking to a 404. */
const archivedYears = new Set(postureArchiveYears.map((year) => year.slug));

function ReadingLabel({ reading, year, recordStart }: { reading: CanonReading; year: number; recordStart: string | null }) {
  if (reading.kind === "before-record") {
    return (
      <span className="text-slate-400">
        Before the record{recordStart ? `, which starts ${recordStart}` : ""}
      </span>
    );
  }
  if (reading.kind === "after-record") {
    return <span className="text-slate-400">After the latest month-end on record</span>;
  }
  const tokens = REGIME_STYLE_TOKENS[reading.regime];
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className={`inline-block h-2 w-2 rounded-full ${tokens.marker}`} />
      {archivedYears.has(String(year)) ? (
        <a
          href={buildPostureArchivePath(String(year))}
          className="text-slate-100 underline decoration-slate-600 underline-offset-4 hover:text-white"
        >
          {reading.conditions}
        </a>
      ) : (
        <span className="text-slate-100">{reading.conditions}</span>
      )}
      <span className="text-slate-400">
        {reading.heldSinceRecordStart
          ? `· at least ${monthsLabel(reading.heldMonths)} running, since the record starts`
          : reading.heldMonths === 1
            ? "· the first month of it"
            : `· ${monthsLabel(reading.heldMonths)} running`}
      </span>
    </span>
  );
}

export default function ProductCanonPage() {
  const series = getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER);
  const timeline = buildCanonTimeline(series);
  const baseRate = buildCanonBaseRate(series, timeline);
  const recordStart = series.length > 0 ? formatDateUTC(series[0].recordDate) : null;
  const recordEnd = series.length > 0 ? formatDateUTC(series[series.length - 1].recordDate) : null;

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

      <SecondaryPageHeader
        eyebrow="Reading list"
        title="Product writing, against the market it was written in"
        description={`${timeline.length} widely read product management essays and books, each placed on the month-end record${recordStart && recordEnd ? ` (${recordStart} to ${recordEnd})` : ""}: the conditions the month each came out, and how long they had held. A reading list, not evidence for the guidance.`}
      />

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
        title="Where the essays fell, beside where the months fell"
        description="A share of essays means little without the share of time those conditions held."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <caption className="sr-only">Essays published in each set of conditions, against months on record</caption>
            <thead className="type-eyebrow">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">Conditions</th>
                <th scope="col" className="py-2 pr-4 font-medium">Months on record</th>
                <th scope="col" className="py-2 font-medium">Essays published</th>
              </tr>
            </thead>
            <tbody>
              {baseRate.rows.map((row) => (
                <tr key={row.regime} className="border-t border-slate-800">
                  <th scope="row" className="py-2 pr-4 font-normal text-slate-100">{row.conditions}</th>
                  <td className="py-2 pr-4 tabular-nums">
                    {row.months} ({percent(row.monthShare)})
                  </td>
                  <td className="py-2 tabular-nums">
                    {row.essays} ({percent(row.essayShare)})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-slate-300">{describeCanonBaseRate(baseRate)}</p>
        {baseRate.essaysBeforeRecord > 0 ? (
          <p className="mt-2 text-sm text-slate-400">
            {baseRate.essaysBeforeRecord === 1
              ? "One essay predates the record and is left out of the shares."
              : `${baseRate.essaysBeforeRecord} essays predate the record and are left out of the shares.`}
          </p>
        ) : null}
      </SecondaryPageSection>

      <SecondaryPageSection
        title="The list, oldest first"
        description="The date is first publication. Where an essay became a book, the note says which one the date is."
      >
        <ol className="space-y-5">
          {timeline.map((essay) => (
            <li key={essay.slug} id={essay.slug} className="border-t border-slate-800 pt-4 first:border-t-0 first:pt-0">
              <p className="type-eyebrow">
                <time dateTime={`${essay.published.year}-${String(essay.published.month).padStart(2, "0")}`}>
                  {formatCanonPublished(essay)}
                </time>
              </p>
              <h3 className="mt-1 text-base font-semibold text-slate-100">
                <a
                  href={essay.sourceUrl}
                  rel="noopener noreferrer"
                  className="underline decoration-slate-600 underline-offset-4 hover:text-white"
                >
                  {essay.title}
                </a>
              </h3>
              <p className="text-sm text-slate-400">{formatCanonAuthors(essay)}</p>
              <p className="mt-2 text-sm text-slate-300">{essay.argument}</p>
              {essay.publishedNote ? <p className="mt-1 text-xs text-slate-400">{essay.publishedNote}</p> : null}
              <p className="mt-2 text-sm">
                <span className="text-slate-400">Conditions that month: </span>
                <ReadingLabel reading={essay.reading} year={essay.published.year} recordStart={recordStart} />
              </p>
            </li>
          ))}
        </ol>
      </SecondaryPageSection>

      <SecondaryPageSection
        title="What the four conditions mean"
        description="The same four words this week's guidance uses, and what each asks of a team today."
      >
        <ul className="space-y-2 text-sm text-slate-300">
          {getOrderedRegimeLegend().map((entry) => (
            <li key={entry.regime}>
              <span className="text-slate-100">{entry.label}.</span> {entry.weatherRationale}
            </li>
          ))}
        </ul>
      </SecondaryPageSection>

      <SecondaryPageSection title="Sources">
        <ul className="space-y-2 text-sm text-slate-300">
          <li>
            Conditions each month: the month-end record on{" "}
            <ActionLink href="/history" variant="inline">
              the history page
            </ActionLink>
            , computed by the same method behind this week&rsquo;s guidance. Each essay&rsquo;s conditions link to that year&rsquo;s page in the archive.
          </li>
          <li>
            Essays: linked at each title, to the author or original publisher wherever it is still online.
          </li>
        </ul>
      </SecondaryPageSection>
    </ContentPageShell>
  );
}

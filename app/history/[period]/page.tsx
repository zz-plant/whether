import { toWeatherLabel } from "../../../lib/regimeLabels";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionLink } from "../../components/ui/actionLink";
import { Tag } from "../../components/ui/tag";
import { ConditionLabel } from "../../components/ui/conceptIcons";
import { formatNumberWithUnit } from "../../../lib/formatters";
import { getRegimeWeatherRationale } from "../../../lib/regimePresentation";
import {
  buildCanonicalUrl,
  buildPageMetadata,
  organizationName,
} from "../../../lib/seo";
import { graph } from "../../../lib/seo/pageStructuredData";
import {
  buildAuthorSchema,
  buildPublisherSchema,
  publisherAuthor,
  publisherProfilePath,
} from "../../../lib/publisher";
import {
  buildPostureArchivePath,
  findPostureArchivePeriod,
  postureArchiveStaticParams,
  postureArchiveYears,
  type PostureArchivePeriod,
} from "../../../lib/summary/postureArchive";
import { ContentPageShell } from "../../components/ui/contentPageShell";
import { essaysPublishedIn, formatCanonAuthors, formatCanonPublished } from "../../../lib/productCanon";
import { Breadcrumbs } from "../../components/ui/breadcrumbs";
import { buildGroupBreadcrumbs, toVisibleBreadcrumbs } from "../../../lib/navigation/breadcrumbs";
import { JsonLdScript } from "../../components/jsonLdScript";
import { describeReconstructedPeriod } from "../../../lib/report/trackRecordCopy";
import { getPublishedBriefs, publishedBriefWeekLabel } from "../../../lib/report/publishedBriefs";

type Params = { period: string };

/**
 * Archive periods are closed historical records, so they never trip the freshness
 * gates that govern live posture routes. They are generated once and cached.
 */
export const dynamicParams = false;
export const revalidate = 86400;

export function generateStaticParams() {
  return postureArchiveStaticParams;
}

const shareFormatter = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 0 });

/*
 * The search snippet for a period, so it has to say what is particular to it.
 * It was the label, then the whole headline — "Conditions in 2010: Sunny. Sunny
 * mode. Capital is available…" — which restated the label, ran 218–270
 * characters against a ~160 snippet, and was word-for-word the same for every
 * period in the same state bar the year. The mix of readings and the number of
 * changes are the facts only this period has; the headline's first real
 * sentence is the fallback for a period with no readings behind it.
 */
const DESCRIPTION_LIMIT = 160;
const countChanges = (count: number) =>
  count === 0 ? "conditions held throughout" : count === 1 ? "conditions changed once" : `conditions changed ${count} times`;

/*
 * A period is headlined with the conditions that held for most of its readings
 * (`scripts/generatePostureArchiveIndex.ts`); where the readings split, the tag
 * says so. It was the closing reading from another series, bare: /history/2018
 * was "Stormy" over 48 Sunny weeks of 52, and /history/2022-q3 was "Stormy" over
 * 9 Freezing weeks of 14 that ended Freezing.
 */
const mixOf = (period: PostureArchivePeriod) => [...period.regimeMix].sort((left, right) => right.periods - left.periods);
const isTied = (period: PostureArchivePeriod) => {
  const mix = mixOf(period);
  return mix.length > 1 && mix[0].periods === mix[1].periods;
};
const headlineConditions = (period: PostureArchivePeriod) => {
  const label = toWeatherLabel(period.operatorLabel);
  return period.regimeMix.length > 1 && !isTied(period) ? `Mostly ${label}` : label;
};
/** The conditions at the period's last reading: where its last change went, or what it held. */
const closingConditions = (period: PostureArchivePeriod) =>
  toWeatherLabel(period.transitions[period.transitions.length - 1]?.toLabel ?? period.operatorLabel);

/** "Sunny for 48 of 52 weekly readings; Stormy at the close." The sentence the tag stands for. */
const describeHeadline = (period: PostureArchivePeriod): string | null => {
  const mix = mixOf(period);
  const headline = mix.find((share) => share.regime === period.regime);
  if (!headline || period.sampleCount <= 0) return null;
  const label = toWeatherLabel(headline.label);
  if (mix.length === 1) return `${label} for all ${period.sampleCount} ${cadenceNoun(period)}.`;
  const tiedWith = mix.filter((share) => share.regime !== period.regime && share.periods === headline.periods);
  const tie = tiedWith.length > 0 ? `, tied with ${tiedWith.map((share) => toWeatherLabel(share.label)).join(" and ")}` : "";
  const closing = closingConditions(period);
  const close = closing === label ? "" : `; ${closing} at the close`;
  return `${label} for ${headline.periods} of ${period.sampleCount} ${cadenceNoun(period)}${tie}${close}.`;
};

const describePeriod = (period: PostureArchivePeriod) => {
  const label = toWeatherLabel(period.operatorLabel);
  const lead = `Conditions in ${period.title} closed ${closingConditions(period)}.`;
  const unit = period.sampleCadence === "weekly" ? "weekly" : "monthly";
  const mix = [...period.regimeMix].sort((left, right) => right.periods - left.periods);
  const facts = period.sampleCount > 0 && mix.length > 0
    ? ` Across ${period.sampleCount} ${unit} readings: ${mix.map((entry) => `${entry.periods} ${toWeatherLabel(entry.label)}`).join(", ")}; ${countChanges(period.transitions.length)}.`
    : ` ${period.headline.replace(new RegExp(`^${label} mode\\.\\s*`, "i"), "").split(/(?<=\.)\s/)[0] ?? ""}`;
  const text = `${lead}${facts}`.trim();
  return text.length <= DESCRIPTION_LIMIT ? text : `${text.slice(0, DESCRIPTION_LIMIT - 1).replace(/\s+\S*$/, "")}…`;
};

/*
 * The card's side panel: this period's own record, where every archive card used
 * to carry the same "A closed period" box. The count, the mix as a bar in the
 * regimes' colours, and how often conditions changed — the facts a link to 2022
 * has and a link to 2014 does not. A period with no readings behind it would
 * keep the fixed panel; the ten 2010–2011 periods that had none predated the
 * record and are no longer in the index.
 */
const recordCardPanel = (period: PostureArchivePeriod): Record<string, string> => {
  if (period.sampleCount <= 0 || period.regimeMix.length === 0) return {};
  const unit = period.sampleCadence === "weekly" ? "week" : "month";
  const mix = [...period.regimeMix].sort((left, right) => right.periods - left.periods);
  const only = mix.length === 1 ? mix[0] : null;
  const title = only
    ? `${only.periods} of ${period.sampleCount} ${unit}s ${toWeatherLabel(only.label)}`
    : `${period.sampleCount} ${cadenceNoun(period)}`;
  const changes = period.transitions.length;
  // "Conditions", not "the call": lib/report/AGENTS.md retired the noun on 2026-09-23.
  const changeLine = changes === 0 ? "Conditions held throughout." : changes === 1 ? "Conditions changed once." : `Conditions changed ${changes} times.`;
  const body = only
    ? changeLine
    : `${mix.map((entry) => `${entry.periods} ${toWeatherLabel(entry.label)}`).join(" · ")}. ${changeLine}`;
  return {
    panelLabel: "The record",
    panelTitle: title,
    panelBody: body,
    mix: mix.map((entry) => `${entry.regime}:${entry.periods}`).join(","),
  };
};

const cadenceNoun = (period: PostureArchivePeriod) =>
  period.sampleCadence === "weekly" ? "weekly readings" : "monthly readings";

/*
 * The archive stores each rate under the label the data pipeline wrote ("US Treasury
 * 10Y", "Yield curve slope (10Y - 2Y)"), and the archive is append-only, so the plain
 * name is applied where it renders. A label this map does not know passes through.
 */
const READER_RATE_LABELS: Record<string, string> = {
  "The 1-month Treasury bill (1M)": "Short-term borrowing rate (one-month Treasury bill)",
  "US Treasury 2Y": "2-year Treasury rate",
  "US Treasury 10Y": "10-year Treasury rate",
  "Yield curve slope (10Y - 2Y)": "Recession warning gauge (10-year minus 2-year rate)",
};

const readerRateLabel = (label: string) => READER_RATE_LABELS[label] ?? label;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { period: slug } = await params;
  const period = findPostureArchivePeriod(slug);

  if (!period) return {};

  return buildPageMetadata({
    title: `${period.title} conditions — ${headlineConditions(period)}`,
    description: describePeriod(period),
    path: buildPostureArchivePath(period.slug),
    imageAlt: `Whether's reading of conditions in ${period.title}`,
    /* The period's own card, in its conditions' hue. These 82 pages used to share
       the live weekly card, so a link to 2014 previewed this week's reading. */
    /* The subtitle is the site's current sentence for those conditions, not the
       stored headline: the archive keeps the words it was generated with ("Sunny
       mode … the weekly call sets the tempo"), and a share card is new copy. */
    imageParams: {
      template: "record",
      eyebrow: "History",
      title: `${period.title}: ${headlineConditions(period)}`,
      /* The fact half only ("Money is cheap and available."): the instruction half
         is advice for this week, not for a closed year. */
      subtitle: getRegimeWeatherRationale(period.regime).split(/(?<=\.)\s/)[0] ?? "",
      regime: period.regime,
      ...recordCardPanel(period),
    },
  });
}

export default async function PostureArchivePeriodPage({ params }: { params: Promise<Params> }) {
  const { period: slug } = await params;
  const period = findPostureArchivePeriod(slug);

  if (!period) notFound();

  const headlineSentence = describeHeadline(period);
  const parent = period.parentSlug ? findPostureArchivePeriod(period.parentSlug) : undefined;
  const previous = period.previousSlug ? findPostureArchivePeriod(period.previousSlug) : undefined;
  const next = period.nextSlug ? findPostureArchivePeriod(period.nextSlug) : undefined;
  /* The reading list places each essay on this record; this is the other half of
     that link, so a year page names the product writing that came out inside it. */
  const essays = essaysPublishedIn({ year: period.year, quarter: period.kind === "quarter" ? period.quarter : undefined });
  const canonicalUrl = buildCanonicalUrl(buildPostureArchivePath(period.slug));
  const oldestBrief = getPublishedBriefs().reduce<ReturnType<typeof getPublishedBriefs>[number] | undefined>(
    (oldest, brief) => (!oldest || brief.recordDate < oldest.recordDate ? brief : oldest),
    undefined,
  );
  const firstPublishedWeek = oldestBrief ? publishedBriefWeekLabel(oldestBrief) : "2026";


  const articleStructuredData = graph([
    {
      "@type": "Article",
      headline: `${period.title} conditions — ${headlineConditions(period)}`,
      description: describePeriod(period),
      /* No datePublished: the period's own date claimed the page was published
         then, which is the impression the visible notice above corrects. */
      author: buildAuthorSchema(),
      publisher: buildPublisherSchema(organizationName),
      url: canonicalUrl,
      mainEntityOfPage: canonicalUrl,
      isPartOf: buildCanonicalUrl("/history"),
      temporalCoverage: period.kind === "year" ? String(period.year) : period.asOf,
    },
  ]);

  return (
    <ContentPageShell>
      <JsonLdScript data={articleStructuredData} />

      <Breadcrumbs
        items={toVisibleBreadcrumbs(
          buildGroupBreadcrumbs(buildPostureArchivePath(period.slug), [
            ...(parent ? [{ name: parent.title, path: buildPostureArchivePath(parent.slug) }] : []),
            { name: period.title, path: buildPostureArchivePath(period.slug) },
          ]),
        )}
      />

      {/* The breadcrumbs above already reach the brief, /history and the parent
          year, so the pill row that repeated them is gone; the closing section
          carries the one call to the current brief. One regime tag over the
          title: the status tag, an "Archived Period" mark, the glyph and a
          "this record does not change" line were four more statements that the
          period is closed. */}
      <section className="weather-panel space-y-4 px-6 max-sm:px-0 py-6">
        <div>
          {/* The conditions stamp, in the regime's own hue and glyph. It took a
              tone from a table of this page's own, which drew Cloudy in sky (the
              link colour) and Stormy in amber (Cloudy's hue). */}
          <Tag regime={period.regime}>{headlineConditions(period)}</Tag>
        </div>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
          Conditions in {period.title}
        </h1>
        <p className="rounded-md border border-amber-400/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-100" data-reconstructed-notice>
          {describeReconstructedPeriod(period.title, firstPublishedWeek)}
        </p>
        {headlineSentence ? <p className="text-sm font-semibold text-slate-100">{headlineSentence}</p> : null}
        <p className="text-sm text-slate-300">{period.headline}</p>
        <p className="text-sm text-slate-300">
          <span className="font-semibold text-slate-100">Guidance, by today&apos;s formula:</span> {period.guidance}
        </p>
        {/* "Maintained by", not "By": the page is kept by its author today; it
            was not written in the period it describes. */}
        <p className="text-xs text-slate-400">
          Maintained by{" "}
          <a
            href={publisherProfilePath}
            className="text-sky-300 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
            rel="author"
          >
            {publisherAuthor.name}
          </a>{" "}
          · reading dated <time dateTime={period.asOf}>{period.recordDateLabel}</time>
        </p>
      </section>

      {period.constraints.length ? (
        <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
          <h2 className="text-lg font-semibold text-slate-100">Operating constraints that applied</h2>
          <ul className="space-y-2 text-sm text-slate-300">
            {period.constraints.map((constraint) => (
              <li key={constraint} className="flex gap-2">
                <span aria-hidden="true" className="text-sky-300">
                  •
                </span>
                <span>{constraint}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {period.regimeMix.length ? (
        <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
          <h2 className="text-lg font-semibold text-slate-100">How the period actually split</h2>
          <p className="text-sm text-slate-300">
            Derived from {period.sampleCount} {cadenceNoun(period)} inside {period.title}.
          </p>
          <ul className="space-y-2 text-sm text-slate-300">
            {period.regimeMix.map((share) => (
              <li key={share.regime} className="flex flex-wrap items-center justify-between gap-2">
                <ConditionLabel regime={share.regime} className="font-semibold text-slate-100">
                  {toWeatherLabel(share.label)}
                </ConditionLabel>
                <span>
                  {shareFormatter.format(share.share / 100)} · {share.periods} of {period.sampleCount}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {period.transitions.length ? (
        <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
          <h2 className="text-lg font-semibold text-slate-100">Changes in conditions inside {period.title}</h2>
          <ul className="space-y-2 text-sm text-slate-300">
            {period.transitions.map((transition) => (
              <li key={transition.asOf} className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-100">{transition.dateLabel}</span>
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  <ConditionLabel regime={transition.from}>{toWeatherLabel(transition.fromLabel)}</ConditionLabel>
                  <span aria-hidden="true">→</span>
                  <span className="sr-only">to</span>
                  <ConditionLabel regime={transition.to}>{toWeatherLabel(transition.toLabel)}</ConditionLabel>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : period.regimeMix.length === 1 ? (
        /* Only where every reading inside the period says so. /history/2011 printed
           it with no readings at all, above its own Sunny Q1 and Q2. */
        <section className="weather-panel space-y-2 px-6 max-sm:px-0 py-6">
          <h2 className="text-lg font-semibold text-slate-100">Changes in conditions inside {period.title}</h2>
          <p className="text-sm text-slate-300">
            Conditions held at {toWeatherLabel(period.regimeMix[0].label)} for the whole period.
          </p>
        </section>
      ) : null}

      {period.rates.length ? (
        <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
          <h2 className="text-lg font-semibold text-slate-100">Signals of record</h2>
          <ul className="space-y-2 text-sm text-slate-300">
            {period.rates.map((rate) => (
              <li key={rate.label} className="flex flex-wrap items-baseline justify-between gap-2">
                <span>{readerRateLabel(rate.label)}</span>
                <span className="font-semibold text-slate-100">
                  {formatNumberWithUnit(rate.value, rate.unit)}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-400">
            Source: {period.sourceLabel}
            {period.sourceUrl ? (
              <>
                {" · "}
                <a
                  href={period.sourceUrl}
                  className="text-sky-300 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                  rel="noreferrer"
                  target="_blank"
                >
                  View series
                </a>
              </>
            ) : null}
          </p>
        </section>
      ) : null}

      {essays.length ? (
        <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
          <h2 className="text-lg font-semibold text-slate-100">From the reading list, published in {period.title}</h2>
          <ul className="space-y-2 text-sm text-slate-300">
            {essays.map((essay) => (
              <li key={essay.slug}>
                <Link
                  href={`/concepts#${essay.slug}`}
                  className="text-slate-100 underline decoration-slate-600 underline-offset-4 hover:text-white"
                >
                  {essay.title}
                </Link>{" "}
                — {formatCanonAuthors(essay)}, {formatCanonPublished(essay)}
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-400">
            These come from the{" "}
            <Link href="/concepts" className="underline decoration-slate-600 underline-offset-4 hover:text-slate-200">
              product management reading list
            </Link>
            . It places each title on the conditions of the month it came out.
          </p>
        </section>
      ) : null}

      {period.children.length ? (
        <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
          <h2 className="text-lg font-semibold text-slate-100">Quarter by quarter</h2>
          <ul className="space-y-3">
            {period.children.map((child) => (
              <li key={child.slug}>
                <Link
                  href={buildPostureArchivePath(child.slug)}
                  className="flex min-h-[44px] flex-col gap-1 rounded-lg px-2 py-2 transition-colors hover:bg-slate-800/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                >
                  <span className="flex flex-wrap items-center gap-x-1.5 text-sm font-semibold text-slate-100">
                    {child.title} —{" "}
                    <ConditionLabel regime={child.regime}>{toWeatherLabel(child.operatorLabel)}</ConditionLabel>
                  </span>
                  <span className="text-sm text-slate-300">{child.guidance}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <nav aria-label="Adjacent periods" className="flex flex-wrap gap-2">
        {previous ? (
          <ActionLink href={buildPostureArchivePath(previous.slug)} variant="ghost">
            ← {previous.title}
          </ActionLink>
        ) : null}
        {next ? (
          <ActionLink href={buildPostureArchivePath(next.slug)} variant="ghost">
            {next.title} →
          </ActionLink>
        ) : null}
      </nav>

      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Browse another year</h2>
        <ul className="flex flex-wrap gap-2">
          {postureArchiveYears.map((year) => (
            <li key={year.slug}>
              <ActionLink
                href={buildPostureArchivePath(year.slug)}
                variant="pill"
                aria-current={year.slug === period.slug ? "page" : undefined}
              >
                {year.title}
              </ActionLink>
            </li>
          ))}
        </ul>
      </section>

      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
        <h2 className="text-lg font-semibold text-slate-100">What are conditions now?</h2>
        <p className="text-sm text-slate-300">
          {period.title} is a closed record. The weekly brief has the current conditions, this week&apos;s move and the lines that would change it.
        </p>
        <ActionLink href="/" variant="primary">
          Open this week&apos;s brief
        </ActionLink>
      </section>
    </ContentPageShell>
  );
}

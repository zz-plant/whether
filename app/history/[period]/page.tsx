import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionLink } from "../../components/ui/actionLink";
import { Tag } from "../../components/ui/tag";
import { createBreadcrumbTrail } from "../../../lib/navigation/breadcrumbs";
import { formatNumberWithUnit } from "../../../lib/formatters";
import type { RegimeKey } from "../../../lib/regimeEngine";
import {
  buildBreadcrumbList,
  buildCanonicalUrl,
  buildPageMetadata,
  organizationName,
  serializeJsonLd,
} from "../../../lib/seo";
import { buildAuthorSchema, buildPublisherSchema } from "../../../lib/publisher";
import {
  buildPostureArchivePath,
  findPostureArchivePeriod,
  postureArchiveStaticParams,
  postureArchiveYears,
  type PostureArchivePeriod,
} from "../../../lib/summary/postureArchive";

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

const regimeTone: Record<RegimeKey, "sky" | "emerald" | "amber" | "rose"> = {
  EXPANSION: "emerald",
  VOLATILE: "amber",
  DEFENSIVE: "sky",
  SCARCITY: "rose",
};

const describePeriod = (period: PostureArchivePeriod) =>
  `Whether's operating posture for ${period.title}: ${period.operatorLabel}. ${period.headline}`;

const cadenceNoun = (period: PostureArchivePeriod) =>
  period.sampleCadence === "weekly" ? "weekly readings" : "monthly readings";

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { period: slug } = await params;
  const period = findPostureArchivePeriod(slug);

  if (!period) return {};

  return buildPageMetadata({
    title: `${period.title} operating posture — ${period.operatorLabel}`,
    description: describePeriod(period),
    path: buildPostureArchivePath(period.slug),
    imageAlt: `Whether operating posture for ${period.title}`,
  });
}

export default async function PostureArchivePeriodPage({ params }: { params: Promise<Params> }) {
  const { period: slug } = await params;
  const period = findPostureArchivePeriod(slug);

  if (!period) notFound();

  const parent = period.parentSlug ? findPostureArchivePeriod(period.parentSlug) : undefined;
  const previous = period.previousSlug ? findPostureArchivePeriod(period.previousSlug) : undefined;
  const next = period.nextSlug ? findPostureArchivePeriod(period.nextSlug) : undefined;
  const canonicalUrl = buildCanonicalUrl(buildPostureArchivePath(period.slug));

  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    ...buildBreadcrumbList(
      createBreadcrumbTrail([
        { path: "/" },
        { path: "/history" },
        ...(parent ? [{ path: buildPostureArchivePath(parent.slug), label: parent.title }] : []),
        { path: buildPostureArchivePath(period.slug), label: period.title },
      ]),
    ),
  };

  const articleStructuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${period.title} operating posture — ${period.operatorLabel}`,
    description: describePeriod(period),
    datePublished: period.asOf,
    dateModified: period.asOf,
    author: buildAuthorSchema(),
    publisher: buildPublisherSchema(organizationName),
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
    isPartOf: buildCanonicalUrl("/history"),
    temporalCoverage: period.kind === "year" ? String(period.year) : period.asOf,
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbStructuredData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleStructuredData) }} />

      <nav aria-label="Archive navigation" className="flex flex-wrap gap-2">
        <ActionLink href="/history" variant="pill">
          Back to history
        </ActionLink>
        {parent ? (
          <ActionLink href={buildPostureArchivePath(parent.slug)} variant="pill">
            {parent.title} overview
          </ActionLink>
        ) : null}
        <ActionLink href="/" variant="pill">
          This week&apos;s brief
        </ActionLink>
      </nav>

      <section className="weather-panel space-y-4 px-6 py-6">
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone={regimeTone[period.regime]}>{period.operatorLabel}</Tag>
          <Tag tone="slate">{period.regimeLabel}</Tag>
          <Tag tone="slate">{period.statusLabel}</Tag>
        </div>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
          What the operating posture was in {period.title}
        </h1>
        <p className="text-sm text-slate-300">{period.headline}</p>
        <p className="text-sm text-slate-300">
          <span className="font-semibold text-slate-100">Standing guidance:</span> {period.guidance}
        </p>
        <p className="text-xs text-slate-400">
          Closed period ending {period.recordDateLabel}. This record does not change.
        </p>
      </section>

      {period.constraints.length ? (
        <section className="weather-panel space-y-3 px-6 py-6">
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
        <section className="weather-panel space-y-3 px-6 py-6">
          <h2 className="text-lg font-semibold text-slate-100">How the period actually split</h2>
          <p className="text-sm text-slate-300">
            Derived from {period.sampleCount} {cadenceNoun(period)} inside {period.title}.
          </p>
          <ul className="space-y-2 text-sm text-slate-300">
            {period.regimeMix.map((share) => (
              <li key={share.regime} className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold text-slate-100">{share.label}</span>
                <span>
                  {shareFormatter.format(share.share / 100)} · {share.periods} of {period.sampleCount}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {period.transitions.length ? (
        <section className="weather-panel space-y-3 px-6 py-6">
          <h2 className="text-lg font-semibold text-slate-100">Posture changes inside {period.title}</h2>
          <ul className="space-y-2 text-sm text-slate-300">
            {period.transitions.map((transition) => (
              <li key={transition.asOf} className="flex flex-wrap items-baseline gap-2">
                <span className="font-semibold text-slate-100">{transition.dateLabel}</span>
                <span>
                  {transition.fromLabel} → {transition.toLabel}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="weather-panel space-y-2 px-6 py-6">
          <h2 className="text-lg font-semibold text-slate-100">Posture changes inside {period.title}</h2>
          <p className="text-sm text-slate-300">
            The posture held at {period.operatorLabel} for the whole period. No mid-period reversal was recorded.
          </p>
        </section>
      )}

      {period.rates.length ? (
        <section className="weather-panel space-y-3 px-6 py-6">
          <h2 className="text-lg font-semibold text-slate-100">Signals of record</h2>
          <ul className="space-y-2 text-sm text-slate-300">
            {period.rates.map((rate) => (
              <li key={rate.label} className="flex flex-wrap items-baseline justify-between gap-2">
                <span>{rate.label}</span>
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

      {period.children.length ? (
        <section className="weather-panel space-y-3 px-6 py-6">
          <h2 className="text-lg font-semibold text-slate-100">Quarter by quarter</h2>
          <ul className="space-y-3">
            {period.children.map((child) => (
              <li key={child.slug}>
                <Link
                  href={buildPostureArchivePath(child.slug)}
                  className="flex min-h-[44px] flex-col gap-1 rounded-lg px-2 py-2 transition-colors hover:bg-slate-800/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                >
                  <span className="text-sm font-semibold text-slate-100">
                    {child.title} — {child.operatorLabel}
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

      <section className="weather-panel space-y-3 px-6 py-6">
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

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">What is the posture now?</h2>
        <p className="text-sm text-slate-300">
          {period.title} is a closed record. The current call, what to do this week, and what would flip it live on
          the weekly brief.
        </p>
        <ActionLink href="/" variant="primary">
          Open this week&apos;s brief
        </ActionLink>
      </section>
    </main>
  );
}

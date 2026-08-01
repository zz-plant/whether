import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionLink } from "../../components/ui/actionLink";
import { Tag } from "../../components/ui/tag";
import { createBreadcrumbTrail } from "../../../lib/navigation/breadcrumbs";
import {
  buildBreadcrumbList,
  buildCanonicalUrl,
  buildOgImageUrl,
  buildPageMetadata,
  organizationName,
  serializeJsonLd,
} from "../../../lib/seo";
import { buildAuthorSchema, buildPublisherSchema, publisherAuthor } from "../../../lib/publisher";
import {
  buildPublishedBriefPath,
  findPublishedBrief,
  publishedBriefStaticParams,
  type PublishedBrief,
} from "../../../lib/report/publishedBriefs";

type Params = { week: string };

/**
 * Published weeks are frozen records. They are generated once and never revalidated,
 * so a brief cited in a meeting still says what it said on the day.
 */
export const dynamicParams = false;
export const revalidate = false;

export function generateStaticParams() {
  return publishedBriefStaticParams;
}

const decisionAreaLabels: Record<string, string> = {
  hiring: "Hiring",
  "product-tempo": "Product tempo",
  "capital-raising": "Capital raising",
  "burn-discipline": "Burn discipline",
  "expansion-bets": "Expansion bets",
};

const labelForArea = (area: string) => decisionAreaLabels[area] ?? area;

const briefTitle = (brief: PublishedBrief) =>
  `${brief.postureLabel}: the operating call for the week of ${brief.recordDateLabel}`;

const briefDescription = (brief: PublishedBrief) => `${brief.summary} What changed: ${brief.whatChanged}`;

const briefImageUrl = (brief: PublishedBrief) =>
  buildOgImageUrl({ template: "brief-chart", week: brief.slug, posture: brief.postureLabel, regime: brief.regime });

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { week } = await params;
  const brief = findPublishedBrief(week);

  if (!brief) return {};

  const metadata = buildPageMetadata({
    title: briefTitle(brief),
    description: briefDescription(brief),
    path: buildPublishedBriefPath(brief.slug),
    imageAlt: `Whether operating posture for the week of ${brief.recordDateLabel}`,
    imageParams: { template: "brief-chart", week: brief.slug, posture: brief.postureLabel, regime: brief.regime },
  });

  metadata.authors = [{ name: publisherAuthor.name, url: buildCanonicalUrl("/about") }];
  metadata.openGraph = {
    ...metadata.openGraph,
    type: "article",
    publishedTime: brief.publishedAt,
    modifiedTime: brief.publishedAt,
    authors: [buildCanonicalUrl("/about")],
  };

  return metadata;
}

export default async function PublishedBriefPage({ params }: { params: Promise<Params> }) {
  const { week } = await params;
  const brief = findPublishedBrief(week);

  if (!brief) notFound();

  const canonicalUrl = buildCanonicalUrl(buildPublishedBriefPath(brief.slug));

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: briefTitle(brief),
        description: briefDescription(brief),
        datePublished: brief.publishedAt,
        dateModified: brief.publishedAt,
        author: buildAuthorSchema(),
        publisher: buildPublisherSchema(organizationName),
        image: [briefImageUrl(brief)],
        url: canonicalUrl,
        mainEntityOfPage: canonicalUrl,
        isAccessibleForFree: true,
      },
      buildBreadcrumbList(
        createBreadcrumbTrail([
          { path: "/" },
          { path: buildPublishedBriefPath(brief.slug), label: `Week of ${brief.recordDateLabel}` },
        ]),
      ),
    ],
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }} />

      <article className="flex flex-col gap-6">
        <header className="weather-panel space-y-4 px-6 py-6">
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone="sky">{brief.postureLabel}</Tag>
            <Tag tone="slate">Confidence: {brief.confidenceLabel}</Tag>
          </div>
          <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{briefTitle(brief)}</h1>
          <p className="text-sm text-slate-300">{brief.summary}</p>
          <p className="text-xs text-slate-400">
            By{" "}
            <a
              href="/about"
              className="text-sky-300 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
              rel="author"
            >
              {publisherAuthor.name}
            </a>{" "}
            ·{" "}
            <time dateTime={brief.publishedAt}>Published {brief.recordDateLabel}</time>
          </p>
          {brief.correction ? (
            <p className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              <span className="font-semibold">Correction:</span> {brief.correction}
            </p>
          ) : null}
        </header>

        <section className="weather-panel space-y-3 px-6 py-6">
          <h2 className="text-lg font-semibold text-slate-100">What changed this week</h2>
          <p className="text-sm text-slate-300">{brief.whatChanged}</p>
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-slate-100">Do now:</span> {brief.actionNow}
          </p>
        </section>

        <section className="weather-panel space-y-3 px-6 py-6">
          <h2 className="text-lg font-semibold text-slate-100">What would flip the call</h2>
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-slate-100">Guardrail:</span> {brief.guardrailThreshold}
          </p>
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-slate-100">Reversal:</span> {brief.flipThreshold}
          </p>
        </section>

        {brief.decisions.length ? (
          <section className="weather-panel space-y-4 px-6 py-6">
            <h2 className="text-lg font-semibold text-slate-100">The calls, bounded</h2>
            <ul className="space-y-4">
              {brief.decisions.map((decision) => (
                <li key={decision.area} className="space-y-1 border-l-2 border-slate-700/60 pl-4">
                  <p className="text-sm font-semibold text-slate-100">{labelForArea(decision.area)}</p>
                  <p className="text-sm text-slate-300">{decision.call}</p>
                  {decision.doNow ? <p className="text-sm text-slate-300">Do now: {decision.doNow}</p> : null}
                  <p className="text-xs text-slate-400">Threshold: {decision.pauseTrigger}</p>
                  <p className="text-xs text-slate-400">Reversal: {decision.resumeTrigger}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {brief.evidence.length ? (
          <section className="weather-panel space-y-3 px-6 py-6">
            <h2 className="text-lg font-semibold text-slate-100">Evidence behind the call</h2>
            <ul className="space-y-3 text-sm text-slate-300">
              {brief.evidence.map((item) => (
                <li key={item.title}>
                  <span className="font-semibold text-slate-100">{item.title}</span> — {item.detail}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <footer className="weather-panel space-y-3 px-6 py-6">
          <h2 className="text-lg font-semibold text-slate-100">Provenance</h2>
          <p className="text-sm text-slate-300">
            Record date {brief.recordDateLabel} · {brief.sourceLabel} · captured {brief.freshnessLabel}
          </p>
          {brief.sourceUrl ? (
            <p className="text-sm">
              <a
                href={brief.sourceUrl}
                className="text-sky-300 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                rel="noreferrer"
                target="_blank"
              >
                View the source series
              </a>
            </p>
          ) : null}
          <p className="text-xs text-slate-400">
            This record is frozen. Corrections are published as a note on this page rather than a silent edit.
          </p>
        </footer>
      </article>

      <nav aria-label="Brief navigation" className="flex flex-wrap gap-2">
        <ActionLink href="/" variant="primary">
          This week&apos;s brief
        </ActionLink>
        <ActionLink href="/history" variant="pill">
          Every past posture
        </ActionLink>
        <ActionLink href="/about" variant="pill">
          About Whether
        </ActionLink>
      </nav>
    </main>
  );
}

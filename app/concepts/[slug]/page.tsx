import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  buildCanonicalUrl,
  buildBreadcrumbList,
  buildPageMetadata,
  organizationName,
  serializeJsonLd,
} from "../../../lib/seo";
import {
  findProductConceptArticle,
  getMacroContextForArticle,
  productConceptArticles,
  regimeToneByKey,
} from "../../../lib/productCanon";
import { getConceptPublicationRegime, getConceptRegimeStatus, getCurrentRegimeContext } from "../../../lib/conceptRegime";
import { createBreadcrumbTrail } from "../../../lib/navigation/breadcrumbs";
import { BreadcrumbTrail } from "../../components/breadcrumbTrail";

type ConceptArticlePageProps = {
  params: Promise<{ slug: string }>;
};

type DecisionDelta = {
  action: string;
  threshold: string;
  reversal: string;
};

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const recordDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const formatPublishedLabel = (year: number, month: number) => {
  return monthFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
};

const formatRecordDate = (isoDate: string) => {
  return recordDateFormatter.format(new Date(`${isoDate}T00:00:00Z`));
};

const ensureNonEmptyCopy = (value: string, fallback: string) => {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
};

const buildUniqueConceptSummary = (
  title: string,
  summary: string,
  audience: string,
  focus: string,
  whyItMattered: string,
) => {
  return ensureNonEmptyCopy(
    `${summary} For ${audience}, ${title} still matters as a ${focus.toLowerCase()} call because ${whyItMattered.toLowerCase()}`,
    summary,
  );
};

const buildDecisionDelta = ({
  title,
  focus,
  publicationRegimeLabel,
  currentRegimeLabel,
  regimeStatus,
}: {
  title: string;
  focus: string;
  publicationRegimeLabel?: string;
  currentRegimeLabel?: string;
  regimeStatus: "aligned" | "mismatch" | "unknown";
}): DecisionDelta => {
  const alignment = regimeStatus === "mismatch" ? "mismatch" : "aligned";

  const focusActionMap: Record<string, string> = {
    Identity:
      alignment === "mismatch"
        ? `Use ${title} to tighten role boundaries before adding scope, headcount, or new product lines.`
        : `Use ${title} to speed role clarity and delegation on active roadmap bets.`,
    Execution:
      alignment === "mismatch"
        ? `Use ${title} as a sequencing filter: demand evidence before full build commitments.`
        : `Use ${title} to increase experiment cadence and convert learning into shipment decisions.`,
    Strategy:
      alignment === "mismatch"
        ? `Use ${title} to narrow active priorities and cut low-conviction roadmap branches.`
        : `Use ${title} to support selective expansion where evidence and capacity both hold.`,
    "Future-proofing":
      alignment === "mismatch"
        ? `Use ${title} to gate AI/platform expansion behind reliability and cost controls.`
        : `Use ${title} to run controlled expansion bets with explicit model-risk limits.`,
  };

  const defaultAction =
    alignment === "mismatch"
      ? `Use ${title} as a risk-control lens before committing irreversible roadmap choices.`
      : `Use ${title} as an acceleration lens for near-term execution decisions.`;

  const publicationLabel = publicationRegimeLabel ?? "its original macro regime";
  const currentLabel = currentRegimeLabel ?? "the current macro regime";

  return {
    action: focusActionMap[focus] ?? defaultAction,
    threshold:
      regimeStatus === "mismatch"
        ? `Tighten this call when Whether posture remains in ${currentLabel} for 2 consecutive updates; treat this framework as constraint-first until then.`
        : `Keep this call active while Whether posture stays in or near ${publicationLabel}; tighten if posture shifts away for 2 consecutive updates.`,
    reversal:
      regimeStatus === "mismatch"
        ? `Reverse to expansion mode only after posture re-enters ${publicationLabel} for 2 consecutive updates.`
        : `Reverse to defense mode if posture leaves ${publicationLabel} for 2 consecutive updates.`,
  };
};

export const dynamicParams = false;

export async function generateStaticParams() {
  return productConceptArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: ConceptArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = findProductConceptArticle(slug);

  if (!article) {
    return buildPageMetadata({
      title: "Concept not found — Whether",
      description: "Requested concept article was not found.",
      path: "/concepts",
      imageAlt: "Concept article not found",
    });
  }

  const metadataDescription = buildUniqueConceptSummary(
    article.title,
    article.summary,
    article.audience,
    article.focus,
    article.whyItMattered,
  );

  return buildPageMetadata({
    title: `${article.title} in macro context — Whether`,
    description: metadataDescription,
    path: `/concepts/${article.slug}`,
    imageAlt: `${article.title} macro context breakdown`,
    imageParams: {
      template: "guides",
      eyebrow: "PM article context",
      title: article.title,
      subtitle: "Demystified with macro regime data from Whether.",
      kicker: `${article.author} · ${article.publishedYear}`,
    },
  });
}

export default async function ConceptArticlePage({ params }: ConceptArticlePageProps) {
  const { slug } = await params;
  const article = findProductConceptArticle(slug);

  if (!article) {
    notFound();
  }

  const macroContext = getMacroContextForArticle(article);
  const currentRegime = getCurrentRegimeContext();
  const publicationRegime = getConceptPublicationRegime(article);
  const regimeStatus = getConceptRegimeStatus(article, currentRegime?.regime ?? null);
  const publishedLabel = formatPublishedLabel(article.publishedYear, article.publishedMonth);
  const uniqueConceptSummary = buildUniqueConceptSummary(
    article.title,
    article.summary,
    article.audience,
    article.focus,
    article.whyItMattered,
  );
  const decisionDelta = buildDecisionDelta({
    title: article.title,
    focus: article.focus,
    publicationRegimeLabel: publicationRegime?.regimeLabel,
    currentRegimeLabel: currentRegime?.regimeLabel,
    regimeStatus,
  });
  const canonicalArticleUrl = buildCanonicalUrl(`/concepts/${article.slug}`);
  const conceptArticleStructuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    datePublished: new Date(Date.UTC(article.publishedYear, article.publishedMonth - 1, 1)).toISOString(),
    author: {
      "@type": "Person",
      name: article.author,
    },
    publisher: {
      "@type": "Organization",
      name: organizationName,
    },
    description: uniqueConceptSummary,
    mainEntityOfPage: canonicalArticleUrl,
    url: canonicalArticleUrl,
    sameAs: article.sourceUrl,
    about: [article.era, article.focus, article.audience],
  };

  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    ...buildBreadcrumbList(
      createBreadcrumbTrail([
        { path: "/" },
        { path: "/concepts" },
        { path: `/concepts/${article.slug}`, label: article.title },
      ]),
    ),
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(conceptArticleStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbStructuredData) }}
      />
      <BreadcrumbTrail
        items={[
          { label: "Home", href: "/" },
          { label: "Concepts", href: "/concepts" },
          { label: article.title },
        ]}
      />
      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">PM canon article</p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{article.title}</h1>
        <p className="text-sm text-slate-300">
          {article.author} · {publishedLabel} · Focus: {article.focus} · {article.sourceType} · ~{article.readMins} min read · Most relevant to {article.audience}
        </p>
        <p className="text-sm text-slate-200">{uniqueConceptSummary}</p>
        {regimeStatus === "mismatch" && publicationRegime && currentRegime ? (
          <p className="rounded-md border border-amber-400/40 bg-amber-900/30 px-3 py-2 text-xs text-amber-100">
            Macro-mismatch warning: this concept was written for {publicationRegime.regimeLabel}. Current regime is {currentRegime.regimeLabel}.
          </p>
        ) : null}
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Decision delta this week</h2>
        <p className="text-sm text-slate-300">
          Translate this concept into bounded execution rules for the current posture before planning your next cycle.
        </p>
        <dl className="space-y-3 text-sm">
          <div className="weather-surface space-y-1 px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Action now</dt>
            <dd className="text-slate-100">{decisionDelta.action}</dd>
          </div>
          <div className="weather-surface space-y-1 px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Tighten when</dt>
            <dd className="text-slate-100">{decisionDelta.threshold}</dd>
          </div>
          <div className="weather-surface space-y-1 px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Reverse when</dt>
            <dd className="text-slate-100">{decisionDelta.reversal}</dd>
          </div>
        </dl>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">What this article argued</h2>
        <p className="text-sm text-slate-200">{ensureNonEmptyCopy(article.whyItMattered, article.summary)}</p>
        <p className="text-sm text-slate-300">
          {ensureNonEmptyCopy(
            article.demystificationPrompt,
            "Use this piece to challenge assumptions before scaling scope.",
          )}
        </p>
        <a
          href={article.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
        >
          Read source article
        </a>
      </section>


      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Interpretation confidence & provenance</h2>
        <div className="weather-surface space-y-3 px-4 py-4">
          <p className="text-sm text-slate-200">
            Confidence level: <span className="font-semibold text-slate-100">{article.contextConfidence}</span>
          </p>
          <p className="text-sm text-slate-300">{article.provenanceNote}</p>
        </div>
      </section>

      {macroContext ? (
        <>
          <section className="weather-panel space-y-4 px-6 py-6">
            <h2 className="text-lg font-semibold text-slate-100">Macro context at publication</h2>
            <div className="weather-surface space-y-3 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-100">
                  Whether posture for {formatRecordDate(macroContext.primary.asOf)}
                </p>
                <span
                  className={`rounded-full border px-2 py-1 text-xs font-semibold ${regimeToneByKey[macroContext.primary.summary.regime]}`}
                >
                  {macroContext.primary.summary.regimeLabel}
                </span>
              </div>
              <p className="text-sm text-slate-200">{macroContext.primary.summary.summary}</p>
              <p className="text-sm text-slate-300">
                Guidance signal at the time: {macroContext.primary.summary.guidance}.
              </p>
            </div>
          </section>

          <section className="weather-panel space-y-4 px-6 py-6">
            <h2 className="text-lg font-semibold text-slate-100">Regime window around the article</h2>
            <ul className="space-y-3 text-sm text-slate-200">
              {macroContext.surrounding.map((entry) => (
                <li key={entry.asOf} className="weather-surface space-y-2 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-slate-100">{formatRecordDate(entry.asOf)}</p>
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-semibold ${regimeToneByKey[entry.summary.regime]}`}
                    >
                      {entry.summary.regimeLabel}
                    </span>
                  </div>
                  <p className="text-slate-300">{entry.summary.guidance}</p>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <section className="weather-panel space-y-3 px-6 py-6">
          <h2 className="text-lg font-semibold text-slate-100">Macro context unavailable</h2>
          <p className="text-sm text-slate-300">
            Whether historical monthly snapshots currently start in 2012, so this entry does not yet have
            a direct regime match.
          </p>
        </section>
      )}

      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Continue exploring</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/concepts"
            className="weather-button-primary inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold tracking-[0.12em]"
          >
            Back to timeline
          </Link>
          <Link
            href="/signals"
            className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            Open signal evidence
          </Link>
        </div>
      </section>
    </main>
  );
}

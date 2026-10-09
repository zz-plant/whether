import { buildBreadcrumbList, buildCanonicalUrl, organizationId, organizationName, websiteId, websiteName } from "../seo";
import { siteUrl } from "../siteUrl";
import { buildAuthorSchema, buildPublisherSchema } from "../publisher";
import { buildGroupBreadcrumbs, createBreadcrumbTrail } from "../navigation/breadcrumbs";
import type { PostureArchivePeriod } from "../summary/postureArchiveTypes";
import type { PublishedBrief } from "../report/publishedBriefs";
import { PRICING_SUMMARY, type PricingPlan } from "../pricing";
import { MARKET_DATA_PROVIDER_LABELS, type SaaSValuationSnapshot } from "../saasMultiples";
import type { SeoDecisionPayload } from "../report/seoDecisionPayload";

/**
 * Per-page JSON-LD, for the pages whose content already supports a schema.org
 * type they were not declaring.
 *
 * Every graph here shares the homepage's entity ids: the publisher carries
 * `#organization` and `isPartOf` points at `#website`, so a consumer that has
 * read the homepage resolves every page to the same two entities. Each page
 * still carries a full `WebSite` node, because an `@id` reference only
 * resolves against nodes on the same page.
 */
type JsonLdGraph = {
  "@context": "https://schema.org";
  "@graph": Array<Record<string, unknown>>;
};

const websiteNode = () => ({
  "@type": "WebSite",
  "@id": websiteId,
  name: websiteName,
  url: siteUrl,
});

const isPartOfSite = { "@id": websiteId } as const;

/**
 * A page's JSON-LD document: its nodes, after the site's `WebSite` node. Every page that
 * publishes JSON-LD goes through this, so each one carries the node its `@id` references resolve
 * against; eleven pages wrote `"@context"` by hand and nine of them left it out. The homepage is
 * the exception: it declares the full `WebSite` and `Organization` nodes itself
 * (`lib/report/home/structuredData.ts`).
 */
export const graph = (nodes: Array<Record<string, unknown>>): JsonLdGraph => ({
  "@context": "https://schema.org",
  "@graph": [websiteNode(), ...nodes],
});

/** ISO 8601 date (`YYYY-MM-DD`) from an ISO timestamp or date, or null when unparseable. */
const isoDate = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString().slice(0, 10);
};

/**
 * `/history`: the hub is a `CollectionPage` whose `mainEntity` is the regime
 * history `Dataset`, with an `ItemList` naming every archive period it links to
 * and every published week. The hub used to carry no markup at all, so the
 * largest cluster in the sitemap had no declared parent.
 *
 * `periods` must be the periods the page actually links. It renders the year
 * strip only — the 66 quarters hang off their parent year page — and an
 * `ItemList` naming URLs absent from the rendered HTML is markup that does not
 * reflect visible content, which is the defect this file removes elsewhere.
 */
export const buildHistoryStructuredData = ({
  periods,
  publishedBriefs,
  coverage,
}: {
  periods: readonly Pick<PostureArchivePeriod, "slug" | "title" | "kind">[];
  publishedBriefs: readonly Pick<PublishedBrief, "slug" | "headline">[];
  /** First and last record date on the monthly regime record, ISO. */
  coverage: { from: string; to: string } | null;
}): JsonLdGraph => {
  const url = buildCanonicalUrl("/history");
  const periodItems = periods.map((period) => ({
    "@type": "WebPage",
    url: buildCanonicalUrl(`/history/${period.slug}`),
    name: `${period.title} operating posture`,
  }));
  const briefItems = publishedBriefs.map((brief) => ({
    "@type": "Article",
    url: buildCanonicalUrl(`/brief/${brief.slug}`),
    name: brief.headline,
  }));

  return graph([
    {
      "@type": "CollectionPage",
      "@id": `${url}#webpage`,
      url,
      name: "Regime History and Track Record",
      inLanguage: "en",
      isPartOf: isPartOfSite,
      mainEntity: { "@id": `${url}#dataset` },
      hasPart: { "@id": `${url}#periods` },
    },
    {
      "@type": "Dataset",
      "@id": `${url}#dataset`,
      name: "Whether monthly regime history",
      description:
        "Every month-end reading on record: the operating posture, when it changed, and how long each regime held, scored from public US Treasury and macro series.",
      url,
      creator: buildPublisherSchema(organizationName),
      license: buildCanonicalUrl("/terms-of-service"),
      isAccessibleForFree: true,
      ...(coverage ? { temporalCoverage: `${coverage.from}/${coverage.to}` } : {}),
      variableMeasured: [
        { "@type": "PropertyValue", name: "Regime" },
        { "@type": "PropertyValue", name: "Funding pressure score" },
        { "@type": "PropertyValue", name: "Risk appetite score" },
      ],
    },
    {
      "@type": "ItemList",
      "@id": `${url}#periods`,
      name: "Operating posture by period",
      numberOfItems: periodItems.length + briefItems.length,
      itemListElement: [...periodItems, ...briefItems].map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item,
      })),
    },
    buildBreadcrumbList(buildGroupBreadcrumbs("/history")),
  ]);
};

/**
 * `/pricing`: one `Product` with an `Offer` per plan. The paid plans are not on
 * sale yet, so their availability is `PreOrder` rather than `InStock`; the page
 * says so in prose and the markup must not say otherwise.
 */
export const buildPricingStructuredData = ({
  plans,
  paidPlansOnSale,
}: {
  plans: readonly PricingPlan[];
  paidPlansOnSale: boolean;
}): JsonLdGraph => {
  const url = buildCanonicalUrl("/pricing");
  return graph([
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: "Pricing",
      inLanguage: "en",
      isPartOf: isPartOfSite,
      mainEntity: { "@id": `${url}#product` },
    },
    {
      "@type": "Product",
      "@id": `${url}#product`,
      name: "Whether Weekly Brief",
      description: PRICING_SUMMARY,
      /* Inlined, not referenced. An `@id` only resolves against nodes on the
         same page (see the header), and this graph carries no Organization —
         the reference dangled, which is the unresolvable entity these builders
         exist to avoid. `buildPublisherSchema` carries the same `@id`, so the
         two still describe one entity. */
      brand: buildPublisherSchema(organizationName),
      offers: plans.map((plan) => ({
        "@type": "Offer",
        name: plan.name,
        description: plan.tagline,
        price: plan.monthlyPriceUsd ?? 0,
        priceCurrency: "USD",
        ...(plan.monthlyPriceUsd === null
          ? {}
          : {
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                price: plan.monthlyPriceUsd,
                priceCurrency: "USD",
                billingDuration: 1,
                billingIncrement: 1,
                unitCode: "MON",
              },
            }),
        availability:
          plan.monthlyPriceUsd === null || paidPlansOnSale
            ? "https://schema.org/InStock"
            : "https://schema.org/PreOrder",
        url: plan.monthlyPriceUsd === null ? siteUrl : buildCanonicalUrl(`/contact?plan=${plan.id}`),
      })),
    },
    buildBreadcrumbList(createBreadcrumbTrail([{ path: "/" }, { path: "/pricing" }])),
  ]);
};

/**
 * `/comps`: the basket median as a `Dataset`, declared only when there is a
 * reading. An outage page has nothing to measure and says so; markup claiming a
 * dataset it does not show would be the reverse of what the page is for.
 */
export const buildCompsStructuredData = ({
  data,
  tickers,
}: {
  data: SaaSValuationSnapshot | null;
  tickers: readonly string[];
}): JsonLdGraph => {
  const url = buildCanonicalUrl("/comps");
  const measured = data
    ? [
        { "@type": "PropertyValue", name: "Median EV / revenue", value: data.medianEvToRevenue },
        { "@type": "PropertyValue", name: "Median revenue growth", value: data.medianRevenueGrowth },
        { "@type": "PropertyValue", name: "Companies in basket", value: data.companyCount },
      ].filter((entry) => entry.value !== null)
    : [];

  return graph([
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: "SaaS Valuation Multiples",
      inLanguage: "en",
      isPartOf: isPartOfSite,
      ...(data ? { mainEntity: { "@id": `${url}#dataset` } } : {}),
    },
    ...(data
      ? [
          {
            "@type": "Dataset",
            "@id": `${url}#dataset`,
            name: "Public SaaS valuation basket",
            description: `Median enterprise value to revenue and median revenue growth across ${tickers.length} public SaaS companies (${tickers.join(", ")}).`,
            url,
            creator: buildPublisherSchema(organizationName),
            license: buildCanonicalUrl("/terms-of-service"),
            isAccessibleForFree: true,
            ...(isoDate(data.fetchedAt) ? { temporalCoverage: isoDate(data.fetchedAt) } : {}),
            variableMeasured: measured,
            isBasedOn: {
              "@type": "CreativeWork",
              name: MARKET_DATA_PROVIDER_LABELS[data.source],
            },
          },
        ]
      : []),
    buildBreadcrumbList(createBreadcrumbTrail([{ path: "/" }, { path: "/comps" }])),
  ]);
};

/** `/api-docs`: the API as a `WebAPI`, with this page as its documentation. */
export const buildApiDocsStructuredData = (): JsonLdGraph => {
  const url = buildCanonicalUrl("/api-docs");
  return graph([
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: "API & Agent Tools",
      inLanguage: "en",
      isPartOf: isPartOfSite,
      mainEntity: { "@id": `${url}#api` },
    },
    {
      "@type": "WebAPI",
      "@id": `${url}#api`,
      name: "Whether Agent API",
      description:
        "Programmatic access to the weekly operating guidance, regime data, SaaS multiples, and the decision framework: an MCP server, REST endpoints, a Markdown brief, and an embeddable widget. No API key.",
      documentation: url,
      url: buildCanonicalUrl("/api/agent"),
      termsOfService: buildCanonicalUrl("/terms-of-service"),
      provider: buildPublisherSchema(organizationName),
      isAccessibleForFree: true,
    },
    buildBreadcrumbList(createBreadcrumbTrail([{ path: "/" }, { path: "/api-docs" }])),
  ]);
};

/** "45 minutes" / "2 hours" → ISO 8601 duration, or undefined when the copy is not a duration. */
const isoDuration = (value: string) => {
  const match = value.match(/(\d+)\s*(min|minute|hour|hr)/i);
  if (!match) return undefined;
  const amount = Number(match[1]);
  return /min/i.test(match[2]) ? `PT${amount}M` : `PT${amount}H`;
};

/** `/toolkits/[slug]`: the run sequence is a `HowTo`; the prep checklist is what you bring. */
export const buildToolkitHowTo = (toolkit: {
  slug: string;
  title: string;
  whenToUse: string;
  timeToRun: string;
  prepChecklist: readonly string[];
  runSequence: readonly { phase: string; objective: string; prompts: readonly string[]; deliverable: string }[];
}): JsonLdGraph => {
  const url = buildCanonicalUrl(`/toolkits/${toolkit.slug}`);
  const totalTime = isoDuration(toolkit.timeToRun);
  return graph([
    {
      "@type": "HowTo",
      "@id": `${url}#howto`,
      name: toolkit.title,
      description: toolkit.whenToUse,
      url,
      inLanguage: "en",
      isPartOf: isPartOfSite,
      author: buildAuthorSchema(),
      publisher: buildPublisherSchema(organizationName),
      ...(totalTime ? { totalTime } : {}),
      supply: toolkit.prepChecklist.map((item) => ({ "@type": "HowToSupply", name: item })),
      step: toolkit.runSequence.map((step, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        name: step.phase,
        text: `${step.objective} Deliverable: ${step.deliverable}`,
        url: `${url}#step-${index + 1}`,
        itemListElement: step.prompts.map((prompt) => ({ "@type": "HowToDirection", text: prompt })),
      })),
    },
    buildBreadcrumbList(
      buildGroupBreadcrumbs(`/toolkits/${toolkit.slug}`, [
        { name: "More tools", path: "/resources#more-tools" },
        { name: toolkit.title, path: `/toolkits/${toolkit.slug}` },
      ]),
    ),
  ]);
};

/**
 * `/answers/[slug]`: the `FAQPage`, now with the author, publisher and dates
 * the bare node lacked, joined to the site entities. The answer text is the
 * live one; `dateModified` is when the data behind it was last read.
 */
export const buildAnswerFaqStructuredData = ({
  slug,
  question,
  answer,
  payload,
  datePublishedIso,
  dateModifiedIso,
  additionalQuestions = [],
}: {
  slug: string;
  question: string;
  answer: string;
  payload: Pick<SeoDecisionPayload, "triggerThreshold" | "reversalCondition">;
  /**
   * The rest of what the page answers.
   *
   * The node carried two entries — the question and its flip condition — while
   * the page itself answered what to do this week, who it is for, how current
   * the reading is and what it rests on. Each of those is a passage an answer
   * engine can lift and attribute, and none of them were in the payload a
   * machine reads. Every entry is built from data the page already renders;
   * an empty answer is dropped rather than published as a blank.
   */
  additionalQuestions?: ReadonlyArray<{ question: string; answer: string }>;
  /** ISO. The record date the call was struck on. */
  datePublishedIso: string;
  /** ISO. When the data behind the answer was last read. */
  dateModifiedIso: string;
}): JsonLdGraph => {
  const url = buildCanonicalUrl(`/answers/${slug}`);
  return graph([
    {
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      url,
      name: question,
      inLanguage: "en",
      isPartOf: isPartOfSite,
      mainEntityOfPage: url,
      datePublished: datePublishedIso,
      dateModified: dateModifiedIso,
      author: buildAuthorSchema(),
      publisher: buildPublisherSchema(organizationName),
      mainEntity: [
        {
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        },
        {
          "@type": "Question",
          name: "What would change this answer?",
          acceptedAnswer: {
            "@type": "Answer",
            text: `${payload.triggerThreshold} ${payload.reversalCondition}`,
          },
        },
        ...additionalQuestions
          .filter((entry) => entry.question.trim() && entry.answer.trim())
          .map((entry) => ({
            "@type": "Question",
            name: entry.question,
            acceptedAnswer: { "@type": "Answer", text: entry.answer },
          })),
      ],
    },
    buildBreadcrumbList(buildGroupBreadcrumbs(`/answers/${slug}`, [{ name: question, path: `/answers/${slug}` }])),
  ]);
};

/**
 * `/calibration`: the confidence calibration study.
 *
 * Both a `Dataset` and a `ScholarlyArticle`, because it is both — a measured
 * result over a named sample, and a written finding about that result. The
 * `citation` names the upstream the archive is built from, which is what lets a
 * consumer check the claim rather than take it.
 */
export const buildCalibrationStudyStructuredData = ({
  totals,
}: {
  totals: { months: number; held: number };
}): JsonLdGraph => {
  const url = buildCanonicalUrl("/calibration");
  const name = "Confidence score calibration study";
  const description =
    `A calibration study of Whether's published confidence percent against ${totals.months} month-end readings: `
    + "every band understates, and distance from a regime boundary does not order the outcome.";

  return graph([
    {
      "@type": "ScholarlyArticle",
      "@id": `${url}#study`,
      url,
      headline: name,
      name,
      description,
      inLanguage: "en",
      isPartOf: isPartOfSite,
      mainEntityOfPage: url,
      author: buildAuthorSchema(),
      publisher: buildPublisherSchema(organizationName),
      about: {
        "@type": "Thing",
        name: "Calibration of a macro regime confidence score",
      },
      citation: {
        "@type": "CreativeWork",
        name: "FRED CSV Treasury series (DGS1MO/DGS3MO/DGS2/DGS10)",
        url: "https://fred.stlouisfed.org/",
      },
    },
    {
      "@type": "Dataset",
      "@id": `${url}#dataset`,
      name: "Whether regime hold rates by distance to boundary",
      description:
        `Month-end regime readings and whether the published regime held the following month. `
        + `${totals.held} of ${totals.months} held.`,
      url,
      creator: { "@id": organizationId },
      isBasedOn: {
        "@type": "CreativeWork",
        name: "FRED CSV Treasury series (DGS1MO/DGS3MO/DGS2/DGS10)",
        url: "https://fred.stlouisfed.org/",
      },
      variableMeasured: [
        { "@type": "PropertyValue", name: "Month-end readings compared", value: totals.months },
        { "@type": "PropertyValue", name: "Readings whose regime held one month later", value: totals.held },
      ],
    },
    buildBreadcrumbList(buildGroupBreadcrumbs("/calibration")),
  ]);
};

/**
 * `/concepts`: a `CollectionPage` whose `ItemList` names each essay on the page
 * as the `CreativeWork` it is — its own author, its own URL, its first
 * publication month. The items are the external works themselves, not anchors
 * on this page, because that is what the list is a list of.
 */
export const buildProductCanonStructuredData = ({
  essays,
}: {
  essays: ReadonlyArray<{
    title: string;
    authors: readonly string[];
    format: "essay" | "book";
    sourceUrl: string;
    published: { year: number; month: number };
  }>;
}): JsonLdGraph => {
  const url = buildCanonicalUrl("/concepts");
  const name = "Product writing, against the market it was written in";
  return graph([
    {
      "@type": "CollectionPage",
      "@id": `${url}#page`,
      url,
      name,
      inLanguage: "en",
      isPartOf: isPartOfSite,
      publisher: buildPublisherSchema(organizationName),
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: essays.length,
        itemListElement: essays.map((essay, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": essay.format === "book" ? "Book" : "Article",
            name: essay.title,
            url: essay.sourceUrl,
            author: essay.authors.map((name) => ({ "@type": "Person", name })),
            datePublished: `${essay.published.year}-${String(essay.published.month).padStart(2, "0")}`,
          },
        })),
      },
    },
    buildBreadcrumbList(buildGroupBreadcrumbs("/concepts")),
  ]);
};

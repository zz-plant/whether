import { buildBreadcrumbList, buildCanonicalUrl, buildOgImageUrl, organizationId, organizationName, shortSiteName, siteAlternateNames, websiteId } from "../seo";
import { siteUrl } from "../siteUrl";
import { buildAuthorSchema, buildPublisherSchema, publishedDataLicenseUrl, weeklyPublicationName } from "../publisher";
import { buildGroupBreadcrumbs, createBreadcrumbTrail } from "../navigation/breadcrumbs";
import type { PostureArchivePeriod } from "../summary/postureArchiveTypes";
import type { PublishedBrief } from "../report/publishedBriefs";
import { MARKET_DATA_PROVIDER_LABELS, type SaaSValuationSnapshot } from "../saasMultiples";
import type { SeoDecisionPayload } from "../report/seoDecisionPayload";
import { isDecisionArea, type DecisionArea } from "../report/boundedDecisionRules";

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
  name: shortSiteName,
  alternateName: [...siteAlternateNames],
  url: siteUrl,
  image: buildOgImageUrl({ template: "report" }),
});

export const isPartOfSite = { "@id": websiteId } as const;

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
export const isoDate = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString().slice(0, 10);
};

/**
 * The public concept a page is about, named the way a knowledge graph already knows it.
 *
 * "Whether" is an ordinary English word and "funding pressure" is this site's own term, so nothing
 * in the text ties a page to the concepts a retrieval system indexes. `sameAs` does. Each article
 * was opened to confirm it is about the concept, not a redirect to something broader: "New bets" has
 * no entry because `Market_expansion` redirects to `Economic_growth`, and a wrong link is worse than
 * none.
 */
const wikipediaTopic = (name: string, article: string) => ({
  "@type": "Thing",
  name,
  sameAs: `https://en.wikipedia.org/wiki/${article}`,
});

const DECISION_AREA_TOPIC: Record<DecisionArea, ReturnType<typeof wikipediaTopic> | null> = {
  hiring: wikipediaTopic("Recruitment", "Recruitment"),
  "product-tempo": wikipediaTopic("Product management", "Product_management"),
  "capital-raising": wikipediaTopic("Venture capital", "Venture_capital"),
  "burn-discipline": wikipediaTopic("Burn rate", "Burn_rate"),
  "expansion-bets": null,
};

/** What each signal watch reads, from its `evidence` line in `app/signals/clusterRoutes.ts`. */
const SIGNAL_WATCH_TOPICS: Record<string, ReadonlyArray<ReturnType<typeof wikipediaTopic>>> = {
  "capital-tightness-watch": [
    wikipediaTopic("Interest rate", "Interest_rate"),
    wikipediaTopic("United States Treasury security", "United_States_Treasury_security"),
  ],
  "risk-appetite-watch": [wikipediaTopic("Risk aversion", "Risk_aversion")],
  "yield-curve-flip-watch": [wikipediaTopic("Yield curve", "Yield_curve")],
};

export const areaTopics = (areas: readonly DecisionArea[]) =>
  areas.flatMap((area) => DECISION_AREA_TOPIC[area] ?? []);

/**
 * The site's own terms, by the ids `/about` gives them in its `DefinedTermSet`. A page that uses a
 * term points at it in `mentions` and does not define it again: one definition, many references
 * (docs/seo/quality-gates.md, "Entities are named once and linked").
 */
type SiteTerm =
  | "funding-pressure"
  | "risk-appetite"
  | "room-to-move"
  | "room-before-a-change"
  | "sunny"
  | "cloudy"
  | "stormy"
  | "freezing";

export const siteTerms = (...terms: readonly SiteTerm[]) => terms.map((term) => ({ "@id": `${siteUrl}/about#term-${term}` }));

/** The condition term a record's regime prints as ("SCARCITY" → Freezing), or none for a key it does not know. */
const CONDITION_TERM_BY_REGIME: Record<string, SiteTerm> = {
  EXPANSION: "sunny",
  DEFENSIVE: "cloudy",
  VOLATILE: "stormy",
  SCARCITY: "freezing",
};
const conditionTermFor = (regime: string): SiteTerm[] => {
  const term = CONDITION_TERM_BY_REGIME[regime];
  return term ? [term] : [];
};

/** The four conditions, the terms every page that names this week's weather mentions. */
export const CONDITION_TERMS: readonly SiteTerm[] = ["sunny", "cloudy", "stormy", "freezing"];

/* The market concepts the report pages read, each a Wikipedia article about the concept itself. */
export const MARKET_TOPICS = {
  interestRate: wikipediaTopic("Interest rate", "Interest_rate"),
  treasury: wikipediaTopic("United States Treasury security", "United_States_Treasury_security"),
  yieldCurve: wikipediaTopic("Yield curve", "Yield_curve"),
  fedFundsRate: wikipediaTopic("Federal funds rate", "Federal_funds_rate"),
  riskAversion: wikipediaTopic("Risk aversion", "Risk_aversion"),
  ventureCapital: wikipediaTopic("Venture capital", "Venture_capital"),
  startup: wikipediaTopic("Startup company", "Startup_company"),
  businessCycle: wikipediaTopic("Business cycle", "Business_cycle"),
} as const;

/** A question the page asks in a heading, and the sentence under it that answers it. */
export type VisibleQuestion = { question: string; answer: string };

export const questionNodes = (questions: readonly VisibleQuestion[]) =>
  questions
    .filter((entry) => entry.question.trim() && entry.answer.trim())
    .map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    }));

/** A route that serves a dataset, for `distribution`: the API or file a reader downloads it from. */
export const dataDownload = (path: `/${string}`, encodingFormat: "application/json" | "text/markdown") => ({
  "@type": "DataDownload",
  encodingFormat,
  contentUrl: buildCanonicalUrl(path),
});

/** A score as a measured variable: 0 to 100 points, with this week's value where the page prints it. */
export const scoreVariable = (name: string, value?: number) => ({
  "@type": "PropertyValue",
  name,
  minValue: 0,
  maxValue: 100,
  unitText: "points",
  ...(typeof value === "number" ? { value } : {}),
});

/**
 * A hub: a `CollectionPage` listing what it links.
 *
 * `/companies`, `/resources` and the three signal watches drew a trail and declared nothing else, so
 * their only structured statement was where they sat, not what they were. `items` must be pages the
 * hub renders a link to; a list naming URLs the page does not show is markup that misdescribes it.
 */
export const buildHubStructuredData = ({
  path,
  name,
  description,
  items,
  about = [],
  dateModifiedIso,
}: {
  path: `/${string}`;
  name: string;
  description: string;
  items: ReadonlyArray<{ path: string; name: string }>;
  about?: ReadonlyArray<Record<string, unknown>>;
  dateModifiedIso?: string;
}): JsonLdGraph => {
  const url = buildCanonicalUrl(path);
  return graph([
    {
      "@type": "CollectionPage",
      "@id": `${url}#webpage`,
      url,
      name,
      description,
      inLanguage: "en",
      isPartOf: isPartOfSite,
      publisher: buildPublisherSchema(organizationName),
      ...(about.length > 0 ? { about: [...about] } : {}),
      ...(dateModifiedIso ? { dateModified: dateModifiedIso } : {}),
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: items.length,
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: buildCanonicalUrl(item.path),
          name: item.name,
        })),
      },
    },
  ]);
};

/** `/signals/[cluster]`: a hub over its five decision scenarios, about what the watch reads. */
export const buildSignalWatchStructuredData = ({
  slug,
  name,
  description,
  scenarios,
  dateModifiedIso,
}: {
  slug: string;
  name: string;
  description: string;
  scenarios: ReadonlyArray<{ path: string; name: string }>;
  dateModifiedIso: string;
}): JsonLdGraph =>
  buildHubStructuredData({
    path: `/signals/${slug}`,
    name,
    description,
    items: scenarios,
    about: SIGNAL_WATCH_TOPICS[slug] ?? [],
    dateModifiedIso,
  });

/** `/signals/[cluster]/[decision-scenario]`: one signal read for one decision, so it is about both. */
export const buildSignalScenarioStructuredData = ({
  slug,
  signalTitle,
  area,
  name,
  description,
  dateModifiedIso,
}: {
  slug: string;
  signalTitle: string;
  area: DecisionArea;
  name: string;
  description: string;
  dateModifiedIso: string;
}): JsonLdGraph => {
  const url = buildCanonicalUrl(`/signals/${slug}/${area}`);
  return graph([
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name,
      description,
      inLanguage: "en",
      isPartOf: [isPartOfSite, { "@type": "CollectionPage", url: buildCanonicalUrl(`/signals/${slug}`), name: signalTitle }],
      publisher: buildPublisherSchema(organizationName),
      about: [...(SIGNAL_WATCH_TOPICS[slug] ?? []), ...areaTopics([area])],
      dateModified: dateModifiedIso,
    },
  ]);
};

/**
 * `/operate/financial` and `/operate/scenarios`: tools, declared as tools.
 *
 * Their title says calculator and their markup said only where they sit. No `offers` or rating: no
 * price is charged and no one has rated them, and the rich result those would chase needs both.
 */
export const buildWorkstreamStructuredData = ({
  path,
  name,
  alternateName,
  description,
  applicationCategory,
}: {
  path: `/${string}`;
  name: string;
  alternateName?: string;
  description: string;
  applicationCategory: string;
}): Record<string, unknown> => {
  const url = buildCanonicalUrl(path);
  return {
    "@type": "WebApplication",
    "@id": `${url}#app`,
    url,
    name,
    ...(alternateName ? { alternateName } : {}),
    description,
    applicationCategory,
    operatingSystem: "Any",
    inLanguage: "en",
    isAccessibleForFree: true,
    isPartOf: isPartOfSite,
    publisher: buildPublisherSchema(organizationName),
  };
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
  questions = [],
}: {
  periods: readonly Pick<PostureArchivePeriod, "slug" | "title" | "kind">[];
  publishedBriefs: readonly Pick<PublishedBrief, "slug" | "headline">[];
  /** First and last record date on the monthly regime record, ISO. */
  coverage: { from: string; to: string } | null;
  /** The questions the sections ask in their headings, with the answers they print first. */
  questions?: readonly VisibleQuestion[];
}): JsonLdGraph => {
  const url = buildCanonicalUrl("/history");
  const periodItems = periods.map((period) => ({
    "@type": "WebPage",
    url: buildCanonicalUrl(`/history/${period.slug}`),
    name: `${period.title} market conditions`,
  }));
  const briefItems = publishedBriefs.map((brief) => ({
    "@type": "Article",
    url: buildCanonicalUrl(`/brief/${brief.slug}`),
    name: brief.headline,
  }));

  /* The record's months, "2012-01/2026-10": it holds month-ends, so the month is its grain. */
  const month = (value: string) => value.slice(0, 7);
  return graph([
    {
      "@type": "CollectionPage",
      "@id": `${url}#webpage`,
      url,
      /* The page's title, as the tab and a search result print it; it was "Regime History and
         Track Record", in the engine's word for conditions. */
      name: "Has it been right?",
      description: "Every brief records what would have changed the guidance, and none has been edited since.",
      inLanguage: "en",
      isPartOf: isPartOfSite,
      publisher: buildPublisherSchema(organizationName),
      ...(coverage ? { dateModified: isoDate(coverage.to) ?? coverage.to } : {}),
      mainEntity: { "@id": `${url}#dataset` },
      hasPart: [{ "@id": `${url}#periods` }, ...questionNodes(questions)],
      about: [MARKET_TOPICS.businessCycle, MARKET_TOPICS.ventureCapital, MARKET_TOPICS.interestRate],
      mentions: siteTerms("funding-pressure", "risk-appetite", "room-to-move", ...CONDITION_TERMS),
    },
    {
      "@type": "Dataset",
      "@id": `${url}#dataset`,
      name: "Whether month-end record",
      description:
        "Every month-end reading since January 2012: the two scores, the room to move they make, the conditions they set, each change in conditions and how long each lasted. Scored from public US Treasury and market series with today's formula.",
      url,
      creator: buildPublisherSchema(organizationName),
      license: publishedDataLicenseUrl,
      isAccessibleForFree: true,
      ...(coverage ? { temporalCoverage: `${month(coverage.from)}/${month(coverage.to)}` } : {}),
      variableMeasured: [
        scoreVariable("Funding pressure"),
        scoreVariable("Risk appetite"),
        scoreVariable("Room to move"),
      ],
      measurementTechnique: buildCanonicalUrl("/about#method"),
      /* The routes that serve the record: month-end rows by API, and this week's reading beside them. */
      distribution: [dataDownload("/api/cli/history", "application/json"), dataDownload("/api/scores", "application/json")],
    },
    {
      "@type": "ItemList",
      "@id": `${url}#periods`,
      name: "Market conditions by period",
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
  areas = [],
  audience,
}: {
  slug: string;
  question: string;
  answer: string;
  /** The decisions the answer maps to, the one it argues first leading. */
  areas?: readonly DecisionArea[];
  /** Who the page says it is for, as it prints it. */
  audience?: string;
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
      ...(areaTopics(areas).length > 0 ? { about: areaTopics(areas) } : {}),
      ...(audience ? { audience: { "@type": "Audience", audienceType: audience } } : {}),
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
  questions = [],
}: {
  totals: { months: number; held: number };
  /** The questions the page asks in its headings, with the answers it prints first. */
  questions?: readonly VisibleQuestion[];
}): JsonLdGraph => {
  const url = buildCanonicalUrl("/calibration");
  const name = "How often the guidance held up";
  /* "Room before a change", the reader's name for the distance since 2026-10-28; this said
     "margin", which a reader took for a profit margin. */
  const description =
    `A calibration study of Whether's published room before a change against ${totals.months} month-to-month comparisons. `
    + "The room before a change is how far the scores are from changing conditions. "
    + "Every band understates how often conditions held, and distance from a change line does not order the outcome.";

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
      about: [
        { "@type": "Thing", name: "Calibration of the room before a change in startup funding conditions" },
        wikipediaTopic("Calibration (statistics)", "Calibration_(statistics)"),
        MARKET_TOPICS.ventureCapital,
      ],
      mentions: siteTerms("room-before-a-change", "funding-pressure", "risk-appetite", ...CONDITION_TERMS),
      ...(questions.length > 0 ? { hasPart: questionNodes(questions) } : {}),
      citation: {
        "@type": "CreativeWork",
        name: "FRED CSV Treasury series (DGS1MO/DGS3MO/DGS2/DGS10)",
        url: "https://fred.stlouisfed.org/",
      },
    },
    {
      "@type": "Dataset",
      "@id": `${url}#dataset`,
      name: "How often conditions held, by distance from a change",
      description:
        `Month-end readings and whether their conditions held the following month, by distance from the nearest change line. `
        + `${totals.held} of ${totals.months} held.`,
      ...(totals.months > 0 ? { temporalCoverage: "2012-01/.." } : {}),
      measurementTechnique: buildCanonicalUrl("/calibration"),
      url,
      creator: { "@id": organizationId },
      license: publishedDataLicenseUrl,
      isAccessibleForFree: true,
      isBasedOn: {
        "@type": "CreativeWork",
        name: "FRED CSV Treasury series (DGS1MO/DGS3MO/DGS2/DGS10)",
        url: "https://fred.stlouisfed.org/",
      },
      variableMeasured: [
        { "@type": "PropertyValue", name: "Month-end readings compared", value: totals.months },
        { "@type": "PropertyValue", name: "Readings whose conditions held one month later", value: totals.held },
      ],
    },
    buildBreadcrumbList(buildGroupBreadcrumbs("/calibration")),
  ]);
};

/**
 * `/concepts`: a `CollectionPage` whose `ItemList` names each text on the page
 * as the `CreativeWork` it is — its own author, its own URL, its first
 * publication month. The items are the external works themselves, not anchors
 * on this page, because that is what the list is a list of. A memo signed by a
 * firm alone is authored by that firm, as an `Organization`.
 */
export const buildProductCanonStructuredData = ({
  essays,
}: {
  essays: ReadonlyArray<{
    title: string;
    authors: readonly string[];
    firm?: string;
    format: "essay" | "book";
    sourceUrl: string;
    published: { year: number; month: number };
  }>;
}): JsonLdGraph => {
  const url = buildCanonicalUrl("/concepts");
  const name = "Does startup advice follow the market?";
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
            author:
              essay.authors.length > 0 || !essay.firm
                ? essay.authors.map((name) => ({ "@type": "Person", name }))
                : [{ "@type": "Organization", name: essay.firm }],
            datePublished: `${essay.published.year}-${String(essay.published.month).padStart(2, "0")}`,
          },
        })),
      },
    },
    buildBreadcrumbList(buildGroupBreadcrumbs("/concepts")),
  ]);
};

/**
 * `/brief/[week]`: structured data for a frozen weekly brief.
 * A dated news article, and an issue of the periodical the weeks make up, with
 * explicit temporalCoverage and semantic topics.
 */
export const buildPublishedBriefStructuredData = ({
  brief,
  canonicalUrl,
  imageUrls,
  headline,
  description,
  dateModified,
  questions = [],
}: {
  brief: PublishedBrief;
  canonicalUrl: string;
  /** `buildPublishedBriefImageUrls`: the card at 16:9, 4:3 and 1:1. */
  imageUrls: readonly string[];
  headline: string;
  description: string;
  /** `publishedBriefModifiedAt`: a correction is the one edit a record takes. */
  dateModified: string;
  /** The questions the page asks in its headings ("What happened next?"), with the answers it prints first. */
  questions?: readonly VisibleQuestion[];
}): JsonLdGraph =>
  graph([
    {
      "@type": "NewsArticle",
      "@id": `${canonicalUrl}#article`,
      headline,
      description,
      datePublished: brief.publishedAt,
      dateModified,
      isPartOf: {
        "@type": "PublicationIssue",
        issueNumber: brief.slug,
        datePublished: brief.publishedAt,
        isPartOf: {
          "@type": "Periodical",
          name: weeklyPublicationName,
          url: buildCanonicalUrl("/history"),
          publisher: { "@id": organizationId },
        },
      },
      temporalCoverage: `${brief.recordDate}/${brief.recordDate}`,
      author: buildAuthorSchema(),
      publisher: buildPublisherSchema(organizationName),
      image: [...imageUrls],
      url: canonicalUrl,
      mainEntityOfPage: canonicalUrl,
      isAccessibleForFree: true,
      keywords: [
        "startup operating guidance",
        "venture capital macro",
        "startup hiring guidance",
        "burn rate discipline",
        `week of ${brief.recordDateLabel}`,
        brief.regime,
      ],
      about: [
        { "@type": "Thing", name: "Startup Operating Guidance" },
        MARKET_TOPICS.ventureCapital,
        MARKET_TOPICS.yieldCurve,
        MARKET_TOPICS.startup,
        ...areaTopics(brief.decisions.map((decision) => decision.area).filter(isDecisionArea)),
      ],
      /* The site's terms the week prints: its two scores, the room before a change, and its conditions. */
      mentions: siteTerms("funding-pressure", "risk-appetite", "room-before-a-change", ...conditionTermFor(brief.regime)),
      ...(questions.length > 0 ? { hasPart: questionNodes(questions) } : {}),
    },
  ]);

/**
 * A company page says what it is about and where it sits, and claims no reviewer or rating.
 *
 * The company is identified by its SEC registrant number, the same one its figures are read by.
 * A name and a ticker leave "Block", "Target" and "Snap" ambiguous, and a page's name ("Google") can
 * differ from the filer's (Alphabet); the CIK and the EDGAR page do not.
 */
export const buildCompanyPageStructuredData = ({
  path,
  title,
  description,
  company,
  ticker,
  cik,
  trail,
  audience,
  dateModifiedIso,
}: {
  path: `/${string}`;
  title: string;
  description: string;
  company: string;
  ticker: string;
  cik: number;
  trail: ReadonlyArray<{ name: string; path: `/${string}` }>;
  /** The role a role page speaks to; a company overview speaks to no one role. */
  audience?: string;
  /** The reading the page's conditions come from. */
  dateModifiedIso: string;
}): JsonLdGraph =>
  graph([
    {
      "@type": "WebPage",
      "@id": `${buildCanonicalUrl(path)}#webpage`,
      url: buildCanonicalUrl(path),
      name: title,
      description,
      inLanguage: "en",
      dateModified: dateModifiedIso,
      about: {
        "@type": "Corporation",
        name: company,
        tickerSymbol: ticker,
        identifier: { "@type": "PropertyValue", propertyID: "SEC CIK", value: String(cik) },
        sameAs: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${String(cik).padStart(10, "0")}`,
      },
      ...(audience ? { audience: { "@type": "Audience", audienceType: audience } } : {}),
      isPartOf: { "@id": websiteId },
      /* A full node, not `{ "@id": organizationId }`: an id resolves only against a node on the same
         page, and these 350 pages carried none, so their publisher resolved to nothing. */
      publisher: buildPublisherSchema(organizationName),
    },
    buildBreadcrumbList(trail.map((item) => ({ name: item.name, path: item.path }))),
  ]);

/** A role page is about an occupation, and claims no reviewer or rating. */
export const buildRolePageStructuredData = ({
  path,
  title,
  role,
  trail,
  dateModifiedIso,
}: {
  path: `/${string}`;
  title: string;
  role: string;
  /** The reading the page's conditions come from. */
  dateModifiedIso: string;
  /** Everything after Roles, the page itself last. */
  trail: ReadonlyArray<{ name: string; path: `/${string}` }>;
}): JsonLdGraph =>
  graph([
    {
      "@type": "WebPage",
      "@id": `${buildCanonicalUrl(path)}#webpage`,
      url: buildCanonicalUrl(path),
      name: title,
      about: { "@type": "Occupation", name: role },
      dateModified: dateModifiedIso,
      isPartOf: { "@id": websiteId },
      publisher: buildPublisherSchema(organizationName),
    },
    buildBreadcrumbList([{ name: "Roles", path: "/roles" }, ...trail]),
  ]);

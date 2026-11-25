import {
  buildBreadcrumbList,
  organizationKnowsAbout,
  buildOgImageUrl,
  defaultSiteDescription,
  organizationId,
  organizationName,
  organizationSameAs,
  shortSiteName,
  siteAlternateNames,
  websiteId,
} from "../../seo";
import { siteUrl } from "../../siteUrl";
import { buildAuthorSchema, publishedDataLicenseUrl } from "../../publisher";
import { MARGIN_LABEL, formatMarginBand } from "../reportFormatting";
import { wikipediaTopic } from "../../seo/pageStructuredData";
import {
  SITE_VOCABULARY,
  conditionTermSlug,
  definedTermId,
  definedTermReference,
  type DefinedTermSlug,
} from "../../seo/definedTerms";
import { isRegimeKey } from "../../regimePresentation";
import type { HomeQuestion } from "./homeSectionModel";

/** A JSON-LD document. Typed loosely on purpose — this is serialized to JSON, and
 *  a consumer (or a test) reads nodes by key rather than by a TS shape. Giving the
 *  builder a declared return type is what keeps every call site from casting. */
type JsonLdDocument = {
  "@context": string;
  "@graph": Array<Record<string, unknown>>;
};

/**
 * The weekly brief's own facts, as the graph needs them.
 *
 * Dates are ISO 8601 because schema.org's Date/DateTime are, and consumers drop
 * anything else. The homepage used to publish `recordDateLabel` ("Jun 17, 2026")
 * and `fetchedAtLabel` ("Jun 22, 2026, 5:05 PM") straight into `datePublished`
 * and `dateModified`, so the one page whose entire premise is *this week* carried
 * no machine-readable recency at all. Pass `treasury.record_date` and
 * `treasury.fetched_at`, not their display labels.
 */
export type HomeBriefStructuredDataInput = {
  headline: string;
  description: string;
  /** ISO 8601. The record date the call was struck on. */
  datePublishedIso: string;
  /** ISO 8601. When the underlying data was last read. */
  dateModifiedIso: string;
  regimeLabel: string;
  confidenceLabel: string;
  /** The engine key the conditions word names, for its term's id. */
  regime?: string;
  /** The week's two scores, as the page prints them. */
  scores?: { tightness: number; riskAppetite: number };
};

/** The page node's id, which the visible questions hang from (`withHomeQuestions`). */
const HOME_PAGE_NODE_ID = `${siteUrl}/#webpage`;

const vocabularyDescription = (slug: DefinedTermSlug) =>
  SITE_VOCABULARY.find((term) => term.slug === slug)?.description;

/* A score as a dataset variable: its value on its 0-100 scale, in the site's own words,
   pointing at the term the method page defines. */
const scoreVariable = (slug: DefinedTermSlug, name: string, value: number) => ({
  "@type": "PropertyValue",
  name,
  propertyID: definedTermId(slug),
  value: Math.round(value),
  minValue: 0,
  maxValue: 100,
  unitText: "points",
  description: vocabularyDescription(slug),
});

/*
 * The market concepts the page names, as a knowledge graph knows them (`wikipediaTopic`),
 * and the site's own terms by their ids on the method page. Each is printed on `/`: the Fed
 * step sizes, the short-term borrowing rate (the 1-month Treasury bill), the yield curve
 * behind the recession warning gauge, the two scores, Room before a change and the four
 * conditions on the chart's key.
 */
const HOME_ABOUT = [
  wikipediaTopic("Startup company", "Startup_company"),
  wikipediaTopic("Venture capital", "Venture_capital"),
];

const HOME_MENTIONS = [
  wikipediaTopic("Federal Reserve", "Federal_Reserve"),
  wikipediaTopic("Federal funds rate", "Federal_funds_rate"),
  wikipediaTopic("United States Treasury security", "United_States_Treasury_security"),
  wikipediaTopic("Yield curve", "Yield_curve"),
  ...(["funding-pressure", "risk-appetite", "room-before-a-change", "sunny", "cloudy", "stormy", "freezing"] as const).map(definedTermReference),
];

/**
 * The page's questions under its page node (2026-11-18): each heading on `/` that asks a
 * question, as a `Question` whose `acceptedAnswer` is the sentence printed under it. The
 * route builds both from one object (`buildHomeQuestions`) and passes the same strings to
 * the sections, so the markup says what the page says and nothing it does not.
 */
const isJsonLdDocument = (value: unknown): value is JsonLdDocument =>
  typeof value === "object" && value !== null && Array.isArray(Reflect.get(value, "@graph"));

/* Typed for the graph the builder returns; the assembly hands it over as `unknown`, and
   anything that is not a graph passes through untouched. */
export function withHomeQuestions(document: JsonLdDocument, questions: readonly HomeQuestion[]): JsonLdDocument;
export function withHomeQuestions(document: unknown, questions: readonly HomeQuestion[]): unknown;
export function withHomeQuestions(document: unknown, questions: readonly HomeQuestion[]): unknown {
  if (!isJsonLdDocument(document) || questions.length === 0) return document;
  return {
    ...document,
    "@graph": document["@graph"].map((node) =>
      node["@id"] === HOME_PAGE_NODE_ID
        ? {
            ...node,
            hasPart: questions.map((question) => ({
              "@type": "Question",
              "@id": `${siteUrl}/#${question.id}`,
              url: `${siteUrl}/#${question.id}`,
              name: question.question,
              answerCount: 1,
              acceptedAnswer: { "@type": "Answer", text: question.answer },
            })),
          }
        : node,
    ),
  };
}

/**
 * The homepage entity graph.
 *
 * This is the only place the site declares its `Organization` and `WebSite`
 * nodes on the URL search engines resolve site-level entities from. It was built
 * on every request and then dropped — `app/page.tsx` renders its own layout and
 * never read the assembled value — so for as long as that held, the homepage
 * shipped a lone Article node and the brand entity was anchored nowhere. Render
 * this; do not add a second, competing script tag to the page.
 *
 * It is the one page graph not built with `graph` (`lib/seo/pageStructuredData.ts`), which
 * prepends a short `WebSite` node: this one declares that node in full, so it would be there
 * twice. The ids are the shared `organizationId` and `websiteId` every other graph points at.
 */
export const buildHomeStructuredData = (brief: HomeBriefStructuredDataInput): JsonLdDocument => ({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": organizationId,
      name: organizationName,
      url: siteUrl,
      logo: `${siteUrl}/icon.svg`,
      description: defaultSiteDescription,
      sameAs: [...organizationSameAs],
      /* The named person behind the call, as the same Person node the article
         bylines resolve to. A one-author publication whose author is anchored
         nowhere is the shape of a content farm. */
      founder: buildAuthorSchema(),
      knowsAbout: [...organizationKnowsAbout],
    },
    {
      "@type": "WebSite",
      "@id": websiteId,
      name: shortSiteName,
      alternateName: [...siteAlternateNames],
      url: siteUrl,
      image: buildOgImageUrl({ template: "report" }),
      description: defaultSiteDescription,
      inLanguage: "en",
      mainEntityOfPage: `${siteUrl}/`,
      publisher: {
        "@id": organizationId,
      },
    },
    {
      "@type": "CollectionPage",
      "@id": HOME_PAGE_NODE_ID,
      name: "Whether Weekly Brief",
      url: siteUrl,
      description: defaultSiteDescription,
      inLanguage: "en",
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `${siteUrl}/`,
      },
      isPartOf: {
        "@id": websiteId,
      },
      about: [
        {
          "@type": "Thing",
          name: "The weekly guidance: what rates and credit mean for hiring, spend and raising",
        },
        ...HOME_ABOUT,
      ],
      mentions: HOME_MENTIONS,
      /*
       * This week's reading, in the site's words (2026-11-18). It was named "US Treasury
       * yield curve snapshot", which is one of its inputs: the reading is the two scores and
       * the conditions they set, on a date, from a method the method page states.
       */
      mainEntity: {
        "@type": "Dataset",
        "@id": `${siteUrl}/#dataset`,
        name: "This week's reading: funding pressure and risk appetite",
        description: brief.scores
          ? `The two 0–100 scores this week's guidance rests on, from public U.S. interest-rate and credit data: funding pressure ${Math.round(brief.scores.tightness)} and risk appetite ${Math.round(brief.scores.riskAppetite)}, which set the conditions at ${brief.regimeLabel}.`
          : "The two 0–100 scores this week's guidance rests on, from public U.S. interest-rate and credit data, and the conditions they set.",
        url: `${siteUrl}/`,
        creator: {
          "@id": organizationId,
        },
        license: publishedDataLicenseUrl,
        isAccessibleForFree: true,
        temporalCoverage: brief.datePublishedIso,
        dateModified: brief.dateModifiedIso,
        measurementTechnique: `${siteUrl}/about#method`,
        /*
         * The posture, regime and confidence, in a property schema.org actually
         * defines. These three used to ride on the Article node inside a `result`
         * object whose keys — posture, regime, confidence, provenance — are not
         * schema.org terms on any type, so the densest payload on the site was
         * expressed in a private vocabulary inside a public format and no
         * consumer could read it. `variableMeasured` on a Dataset is the
         * equivalent that parses.
         */
        variableMeasured: [
          ...(brief.scores
            ? [
                scoreVariable("funding-pressure", "Funding pressure", brief.scores.tightness),
                scoreVariable("risk-appetite", "Risk appetite", brief.scores.riskAppetite),
              ]
            : []),
          {
            "@type": "PropertyValue",
            name: "Conditions",
            value: brief.regimeLabel,
            ...(brief.regime && isRegimeKey(brief.regime)
              ? {
                  propertyID: definedTermId(conditionTermSlug(brief.regime)),
                  description: vocabularyDescription(conditionTermSlug(brief.regime)),
                }
              : {}),
          },
          /*
           * The word, not the engine's code. This shipped `"MED"` — the value
           * `RegimeConfidenceLabel` stores — into the one payload on the site
           * written to be read by machines, so every consumer that quoted the
           * confidence quoted an abbreviation with no key beside it. The
           * reader-facing surfaces were moved to the word form; this one was
           * missed because nothing renders it on screen.
           */
          {
            "@type": "PropertyValue",
            name: MARGIN_LABEL,
            propertyID: definedTermId("room-before-a-change"),
            value: formatMarginBand(brief.confidenceLabel),
          },
        ],
        isBasedOn: {
          "@type": "CreativeWork",
          name: "FRED CSV Treasury series (DGS1MO/DGS3MO/DGS2/DGS10)",
          url: "https://fred.stlouisfed.org/",
        },
        /*
         * Where the data actually is. `isBasedOn` names the upstream this is
         * derived from; `distribution` is the part a dataset consumer needs —
         * the machine-readable copies of *this* reading. The site has served
         * all three for a long time, advertises them in `llms.txt`, the agent
         * manifest and `<link rel="alternate">`, and the node that exists to
         * describe the dataset named none of them.
         */
        distribution: [
          {
            "@type": "DataDownload",
            encodingFormat: "application/json",
            name: "Agent API — current brief",
            contentUrl: `${siteUrl}/api/agent?cadence=weekly`,
          },
          {
            "@type": "DataDownload",
            encodingFormat: "application/json",
            name: "Current guidance (JSON)",
            contentUrl: `${siteUrl}/api/posture/current`,
          },
          {
            "@type": "DataDownload",
            encodingFormat: "text/markdown",
            name: "Weekly brief (Markdown)",
            contentUrl: `${siteUrl}/brief.md`,
          },
        ],
      },
    },
    {
      "@type": ["Article", "Report"],
      "@id": `${siteUrl}/#weekly-brief`,
      headline: brief.headline,
      name: brief.headline,
      description: brief.description,
      abstract: brief.description,
      about: {
        "@type": "Thing",
        name: "This week's guidance for startup leaders",
      },
      datePublished: brief.datePublishedIso,
      dateModified: brief.dateModifiedIso,
      author: buildAuthorSchema(),
      publisher: {
        "@id": organizationId,
      },
      image: [buildOgImageUrl({ template: "report" })],
      url: siteUrl,
      mainEntityOfPage: {
        "@id": `${siteUrl}/#webpage`,
      },
      isPartOf: {
        "@id": websiteId,
      },
      isBasedOn: {
        "@id": `${siteUrl}/#dataset`,
      },
      inLanguage: "en",
      isAccessibleForFree: true,
    },
    /* No FAQPage (2026-11-18): it marked up three questions the page never printed. The
       questions the page does ask hang from the page node (`withHomeQuestions`). */
    buildBreadcrumbList([{ name: "Home", path: "/" }]),
  ],
});

import {
  buildBreadcrumbList,
  organizationKnowsAbout,
  buildOgImageUrl,
  defaultSiteDescription,
  organizationId,
  organizationName,
  organizationSameAs,
  websiteId,
  websiteName,
} from "../../seo";
import { siteUrl } from "../../siteUrl";
import { buildAuthorSchema } from "../../publisher";
import { homeDecisionFaqItems } from "../decisionTransmissionCopy";
import { MARGIN_LABEL, formatMarginBand } from "../reportFormatting";

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
  postureLabel: string;
  regimeLabel: string;
  confidenceLabel: string;
};

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
      name: websiteName,
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
      "@id": `${siteUrl}/#webpage`,
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
      about: {
        "@type": "Thing",
        name: "The weekly guidance: what rates and credit mean for hiring, spend and raising",
      },
      mainEntity: {
        "@type": "Dataset",
        "@id": `${siteUrl}/#dataset`,
        name: "US Treasury yield curve snapshot",
        description:
          "The weekly US Treasury reading Whether bases its guidance on, with its margin from the change lines and what would change it.",
        creator: {
          "@id": organizationId,
        },
        license: `${siteUrl}/terms-of-service`,
        temporalCoverage: brief.datePublishedIso,
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
          { "@type": "PropertyValue", name: "Weekly guidance", value: brief.postureLabel },
          { "@type": "PropertyValue", name: "Market conditions", value: brief.regimeLabel },
          /*
           * The word, not the engine's code. This shipped `"MED"` — the value
           * `RegimeConfidenceLabel` stores — into the one payload on the site
           * written to be read by machines, so every consumer that quoted the
           * confidence quoted an abbreviation with no key beside it. The
           * reader-facing surfaces were moved to the word form; this one was
           * missed because nothing renders it on screen.
           */
          { "@type": "PropertyValue", name: MARGIN_LABEL, value: formatMarginBand(brief.confidenceLabel) },
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
    {
      "@type": "FAQPage",
      "@id": `${siteUrl}/#weekly-decision-faq`,
      mainEntity: homeDecisionFaqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
      isPartOf: {
        "@id": websiteId,
      },
    },
    buildBreadcrumbList([{ name: "Home", path: "/" }]),
  ],
});

import {
  buildBreadcrumbList,
  buildOgImageUrl,
  defaultSiteDescription,
  organizationName,
  websiteName,
} from "../../seo";
import { siteUrl } from "../../siteUrl";
import { createBreadcrumbTrail } from "../../navigation/breadcrumbs";
import { buildAuthorSchema } from "../../publisher";
import { homeDecisionFaqItems } from "../decisionTransmissionCopy";

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
 */
export const buildHomeStructuredData = (brief: HomeBriefStructuredDataInput): JsonLdDocument => ({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}#organization`,
      name: organizationName,
      url: siteUrl,
      logo: `${siteUrl}/icon.svg`,
      description: defaultSiteDescription,
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}#website`,
      name: websiteName,
      url: siteUrl,
      description: defaultSiteDescription,
      inLanguage: "en",
      mainEntityOfPage: `${siteUrl}/`,
      publisher: {
        "@id": `${siteUrl}#organization`,
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
        "@id": `${siteUrl}#website`,
      },
      about: {
        "@type": "Thing",
        name: "Weekly operating posture and decision triggers for leadership teams",
      },
      mainEntity: {
        "@type": "Dataset",
        "@id": `${siteUrl}/#dataset`,
        name: "US Treasury yield curve snapshot",
        description:
          "Weekly US Treasury yield-curve regime snapshot used by Whether to guide what leaders should change now, with confidence and flip conditions.",
        creator: {
          "@id": `${siteUrl}#organization`,
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
          { "@type": "PropertyValue", name: "Operating posture", value: brief.postureLabel },
          { "@type": "PropertyValue", name: "Regime", value: brief.regimeLabel },
          { "@type": "PropertyValue", name: "Confidence", value: brief.confidenceLabel },
        ],
        isBasedOn: {
          "@type": "CreativeWork",
          name: "FRED CSV Treasury series (DGS1MO/DGS3MO/DGS2/DGS10)",
          url: "https://fred.stlouisfed.org/",
        },
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
        name: "US macro operating posture for startup leaders",
      },
      datePublished: brief.datePublishedIso,
      dateModified: brief.dateModifiedIso,
      author: buildAuthorSchema(),
      publisher: {
        "@id": `${siteUrl}#organization`,
      },
      image: [buildOgImageUrl({ template: "report" })],
      url: siteUrl,
      mainEntityOfPage: {
        "@id": `${siteUrl}/#webpage`,
      },
      isPartOf: {
        "@id": `${siteUrl}#website`,
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
        "@id": `${siteUrl}#website`,
      },
    },
    buildBreadcrumbList(createBreadcrumbTrail([{ path: "/" }])),
  ],
});

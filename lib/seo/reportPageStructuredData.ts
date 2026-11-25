import { buildBreadcrumbList, buildCanonicalUrl, organizationId, organizationName } from "../seo";
import { buildPublisherSchema, publishedDataLicenseUrl } from "../publisher";
import { buildGroupBreadcrumbs } from "../navigation/breadcrumbs";
import {
  CONDITION_TERMS,
  MARKET_TOPICS,
  areaTopics,
  dataDownload,
  graph,
  isPartOfSite,
  isoDate,
  questionNodes,
  scoreVariable,
  siteTerms,
  wikipediaTopic,
  type VisibleQuestion,
} from "./pageStructuredData";

/**
 * JSON-LD for the three report routes that ask their sections as questions: `/signals`, `/trust`
 * and `/operate` (2026-11-25). Each page node carries the questions its headings ask, with the
 * sentence under each as the accepted answer, read from the same object the page renders
 * (docs/seo/quality-gates.md, "Structured data mirrors what is visible"). Split from
 * `pageStructuredData.ts`, whose helpers these share, to keep that file under the line cap.
 */
type JsonLdGraph = ReturnType<typeof graph>;

const FRED_TOPIC = wikipediaTopic("Federal Reserve Economic Data", "Federal_Reserve_Economic_Data");

/**
 * `/signals`: the page, the questions it asks (its h1 and each closed instrument, with the answer
 * each prints) and this week's reading as a `Dataset` that names what it measures. The node was
 * a "Macro signal evidence feed" with no variables, coverage or download until 2026-11-25, and
 * the page restated the `Organization` node `graph` already references.
 */
export const buildSignalsStructuredData = ({
  questions,
  recordDateIso,
  scores,
}: {
  questions: readonly VisibleQuestion[];
  /** The record date of this week's reading. */
  recordDateIso: string;
  scores: { tightness: number; riskAppetite: number };
}): JsonLdGraph => {
  const url = buildCanonicalUrl("/signals");
  const recordDate = isoDate(recordDateIso);
  return graph([
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      name: "Interest rates and funding data behind this week's guidance",
      url,
      description: questions[0]?.answer ?? "The interest rates and funding data behind this week's guidance.",
      inLanguage: "en",
      isPartOf: isPartOfSite,
      publisher: buildPublisherSchema(organizationName),
      ...(recordDate ? { dateModified: recordDate } : {}),
      mainEntity: { "@id": `${url}#reading` },
      hasPart: questionNodes(questions),
      about: [
        MARKET_TOPICS.interestRate,
        MARKET_TOPICS.treasury,
        MARKET_TOPICS.yieldCurve,
        MARKET_TOPICS.fedFundsRate,
        MARKET_TOPICS.riskAversion,
      ],
      mentions: siteTerms("funding-pressure", "risk-appetite", ...CONDITION_TERMS),
    },
    {
      "@type": "Dataset",
      "@id": `${url}#reading`,
      name: "This week's Whether reading",
      description:
        "This week's funding pressure and risk appetite scores, scored from public US Treasury rates and market series, with the inputs behind each.",
      url,
      creator: { "@id": organizationId },
      license: publishedDataLicenseUrl,
      isAccessibleForFree: true,
      ...(recordDate ? { temporalCoverage: recordDate, dateModified: recordDate } : {}),
      variableMeasured: [
        scoreVariable("Funding pressure", scores.tightness),
        scoreVariable("Risk appetite", scores.riskAppetite),
      ],
      measurementTechnique: buildCanonicalUrl("/about#method"),
      distribution: [dataDownload("/api/scores", "application/json"), dataDownload("/brief.md", "text/markdown")],
    },
    buildBreadcrumbList(buildGroupBreadcrumbs("/signals")),
  ]);
};

/**
 * `/trust`: the page and the questions it asks, each with the sentence under it
 * (app/trust/trustQuestions.ts). It carried a breadcrumb and nothing else until 2026-11-25, so
 * the page that says whether to act on the week declared neither what it is about nor what it
 * answers.
 */
export const buildTrustStructuredData = ({
  questions,
  recordDateIso,
}: {
  questions: readonly VisibleQuestion[];
  /** The record date of the reading the page judges. */
  recordDateIso: string;
}): JsonLdGraph => {
  const url = buildCanonicalUrl("/trust");
  const recordDate = isoDate(recordDateIso);
  return graph([
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      name: questions[0]?.question ?? "Can we trust this week's guidance?",
      url,
      description: questions[0]?.answer,
      inLanguage: "en",
      isPartOf: isPartOfSite,
      publisher: buildPublisherSchema(organizationName),
      ...(recordDate ? { dateModified: recordDate } : {}),
      hasPart: questionNodes(questions),
      about: [
        MARKET_TOPICS.interestRate,
        MARKET_TOPICS.treasury,
        MARKET_TOPICS.yieldCurve,
        FRED_TOPIC,
      ],
      mentions: siteTerms("funding-pressure", "risk-appetite", "room-to-move", "room-before-a-change", ...CONDITION_TERMS),
    },
    buildBreadcrumbList(buildGroupBreadcrumbs("/trust")),
  ]);
};

/**
 * `/operate`: the page and its `FAQPage`, whose questions are the step headings the page asks and
 * whose answers are the sentences under them (`buildPlanQuestions`, app/operate/planQuestions.ts).
 * The FAQ named three questions no section asked until 2026-11-25.
 */
export const buildOperateStructuredData = ({
  name,
  description,
  questions,
  dateModifiedIso,
}: {
  name: string;
  description: string;
  questions: readonly VisibleQuestion[];
  /** The reading the rules were set from. */
  dateModifiedIso?: string | null;
}): JsonLdGraph => {
  const url = buildCanonicalUrl("/operate");
  return graph([
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      name,
      url,
      description,
      inLanguage: "en",
      isPartOf: isPartOfSite,
      publisher: buildPublisherSchema(organizationName),
      ...(dateModifiedIso ? { dateModified: dateModifiedIso } : {}),
      about: [...areaTopics(["hiring", "burn-discipline", "capital-raising"]), MARKET_TOPICS.startup],
      mentions: siteTerms("funding-pressure", "risk-appetite", "room-before-a-change"),
    },
    buildBreadcrumbList(buildGroupBreadcrumbs("/operate")),
    {
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      url,
      isPartOf: { "@id": `${url}#webpage` },
      mainEntity: questionNodes(questions),
    },
  ]);
};

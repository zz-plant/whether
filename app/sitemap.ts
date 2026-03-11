import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/siteUrl";
import { snapshotData } from "../lib/snapshot";
import {
  failureModes,
  postureDefinitions,
  situationUseCases,
  toolkitDefinitions,
  useCaseRoles,
} from "../lib/decisionDomainCatalog";
import { productConceptArticles } from "../lib/productCanon";
import { conceptAudiences, conceptFocuses, toConceptTaxonomySlug } from "../lib/productCanon";
import { resourcePillarPages, resourceSupportingPages } from "../lib/resourcesContent";
import { resourceArticles } from "../lib/resourceArticles";
import { tierOneDecisionPages } from "./answers/decisionPages";
import { stageGuides } from "./guides/stageGuides";
import { stakeholderGuides } from "./guides/stakeholderGuides";
import { roleLandings } from "./solutions/career-paths/roleLandingData";
import { regimePages } from "./startup-macro-posture/clusterData";
import { indexableDecideClusterRoutes } from "./decide/clusterRoutes";
import { indexableToolkitClusters } from "./toolkits/clusterRoutes";
import { signalScenarioRoutes } from "./seoRouteClusters";
import { loadReportDataSafe } from "../lib/report/reportData";
import { buildHomeBriefModel } from "../lib/report/homeBriefModel";
import { evaluateSeoQualityGates } from "../lib/report/seoQualityGates";
import { isRedirectOnlySitemapPath } from "./sitemapExclusions";

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

type SitemapEntryDescriptor = {
  path: `/${string}` | "";
  changeFrequency: ChangeFrequency;
  priority: number;
  lastModified: Date;
};

const fallbackLastModified = new Date("2026-02-01T00:00:00.000Z");

const parseLastModified = (value: string): Date | null => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const resolveLastModified = (...candidates: string[]): Date => {
  for (const candidate of candidates) {
    const parsed = parseLastModified(candidate);
    if (parsed) return parsed;
  }
  return fallbackLastModified;
};

const staticContentLastModified = new Date("2026-02-01T00:00:00.000Z");

const buildPublishedMonthDate = (year: number, month: number): Date =>
  new Date(Date.UTC(year, Math.max(0, month - 1), 1));

const buildEntry = ({
  path,
  changeFrequency,
  priority,
  lastModified,
}: SitemapEntryDescriptor): MetadataRoute.Sitemap[number] => ({
  url: `${siteUrl}${path}`,
  lastModified,
  changeFrequency,
  priority,
});

export const isProgrammaticSitemapEligible = async (): Promise<boolean> => {
  const reportResult = await loadReportDataSafe(undefined, { route: "/sitemap" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const homeBriefModel = buildHomeBriefModel(reportData);
  const primaryRule = homeBriefModel.decisionRules[0];

  return evaluateSeoQualityGates({
    pageKey: "sitemap-programmatic",
    currentCall: primaryRule?.recommendation,
    immediateAction: primaryRule?.doNow[0],
    triggerThreshold: primaryRule?.pauseTrigger,
    reversalCondition: primaryRule?.resumeTrigger,
    evidenceCount: reportData.reportEvidenceItems.length,
    evidenceTitles: reportData.reportEvidenceItems.map((item) => item.title),
    fetchedAtIso: reportData.treasury.fetched_at,
    isFallbackSnapshot: !reportResult.ok,
    provenanceStatusLabel: reportData.treasuryProvenance?.statusLabel,
    provenanceLinks: [reportData.treasury.source, reportData.macroSeries[0]?.sourceUrl].filter((link): link is string => Boolean(link)),
    confidenceLabel: homeBriefModel.confidenceLabel,
    fallbackLabel: reportResult.ok ? "live" : "fallback",
    trustSummary: reportData.treasuryProvenance?.statusLabel,
    citationMeta: reportData.recordDateLabel,
    interpretationLabel: `${primaryRule?.recommendation ?? ""}|${primaryRule?.doNow[0] ?? ""}`,
  }).eligible;
};

export default async function sitemap(options?: { programmaticEligible?: boolean }): Promise<MetadataRoute.Sitemap> {
  const reportLastModified = resolveLastModified(snapshotData.record_date, snapshotData.fetched_at);
  const programmaticEligible = options?.programmaticEligible ?? (await isProgrammaticSitemapEligible());

  const coreEntries: SitemapEntryDescriptor[] = [
    { path: "", lastModified: reportLastModified, changeFrequency: "weekly", priority: 1 },
    { path: "/start", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.9 },
    { path: "/posture", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.8 },
    { path: "/signals", lastModified: reportLastModified, changeFrequency: "weekly", priority: 0.9 },
    { path: "/decide", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.82 },
    { path: "/method", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.78 },
    { path: "/resources", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.8 },
    { path: "/methodology", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.56 },
    { path: "/toolkits", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.52 },
    { path: "/search", lastModified: staticContentLastModified, changeFrequency: "weekly", priority: 0.62 },
    { path: "/answers", lastModified: staticContentLastModified, changeFrequency: "weekly", priority: 0.74 },
    { path: "/operations", lastModified: staticContentLastModified, changeFrequency: "weekly", priority: 0.84 },
    { path: "/operations/plan", lastModified: staticContentLastModified, changeFrequency: "weekly", priority: 0.72 },
    { path: "/operations/data", lastModified: staticContentLastModified, changeFrequency: "weekly", priority: 0.68 },
    { path: "/operations/integrations", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.62 },
    { path: "/guides", lastModified: staticContentLastModified, changeFrequency: "weekly", priority: 0.78 },
    { path: "/guides/stage", lastModified: staticContentLastModified, changeFrequency: "weekly", priority: 0.74 },
    { path: "/solutions", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.72 },
    { path: "/solutions/career-paths", lastModified: staticContentLastModified, changeFrequency: "weekly", priority: 0.74 },
    { path: "/solutions/market-regime-playbook", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.7 },
    { path: "/solutions/product-roadmapping", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.7 },
    { path: "/solutions/engineering-capacity", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.7 },
    { path: "/learn", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.72 },
    { path: "/learn/concepts", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.66 },
    { path: "/learn/failure-modes", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.66 },
    { path: "/should-we-hire-engineers-right-now", lastModified: reportLastModified, changeFrequency: "weekly", priority: 0.8 },
    { path: "/should-startups-slow-roadmap-expansion", lastModified: reportLastModified, changeFrequency: "weekly", priority: 0.78 },
    { path: "/is-it-risk-on-or-risk-off-for-startups", lastModified: reportLastModified, changeFrequency: "weekly", priority: 0.8 },
    { path: "/startup-funding-climate-this-week", lastModified: reportLastModified, changeFrequency: "weekly", priority: 0.8 },
    { path: "/should-startups-raise-capital-now", lastModified: reportLastModified, changeFrequency: "weekly", priority: 0.8 },
    { path: "/when-should-startups-cut-burn", lastModified: reportLastModified, changeFrequency: "weekly", priority: 0.8 },
    { path: "/should-startups-slow-product-development", lastModified: reportLastModified, changeFrequency: "weekly", priority: 0.78 },
    { path: "/startup-market-outlook", lastModified: reportLastModified, changeFrequency: "weekly", priority: 0.78 },
    { path: "/startup-macro-posture", lastModified: staticContentLastModified, changeFrequency: "weekly", priority: 0.84 },
    { path: "/startup-macro-posture/index", lastModified: staticContentLastModified, changeFrequency: "weekly", priority: 0.8 },
    { path: "/library/failure-modes", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.75 },
    { path: "/concepts", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.75 },
    { path: "/about", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.45 },
    { path: "/terms-of-service", lastModified: staticContentLastModified, changeFrequency: "yearly", priority: 0.4 },
    { path: "/acceptable-use-policy", lastModified: staticContentLastModified, changeFrequency: "yearly", priority: 0.4 },
  ];

  const postureEntries: SitemapEntryDescriptor[] = postureDefinitions.map((posture) => ({
    path: `/posture/${posture.slug}`,
    lastModified: staticContentLastModified,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const decideRoleBridgeEntries: SitemapEntryDescriptor[] = useCaseRoles.map((role) => ({
    path: `/decide/${role.slug}`,
    lastModified: staticContentLastModified,
    changeFrequency: "monthly",
    priority: 0.58,
  }));

  const decideSituationBridgeEntries: SitemapEntryDescriptor[] = situationUseCases.map((slug) => ({
    path: `/decide/${slug}`,
    lastModified: staticContentLastModified,
    changeFrequency: "monthly",
    priority: 0.58,
  }));

  const toolkitEntries: SitemapEntryDescriptor[] = toolkitDefinitions.map((toolkit) => ({
    path: `/toolkits/${toolkit.slug}`,
    lastModified: staticContentLastModified,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const failureModeEntries: SitemapEntryDescriptor[] = failureModes.map((slug) => ({
    path: `/library/failure-modes/${slug}`,
    lastModified: staticContentLastModified,
    changeFrequency: "monthly",
    priority: 0.65,
  }));

  const canonEntries: SitemapEntryDescriptor[] = productConceptArticles.map((article) => ({
    path: `/concepts/${article.slug}`,
    lastModified: buildPublishedMonthDate(article.publishedYear, article.publishedMonth),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const resourcePillarEntries: SitemapEntryDescriptor[] = resourcePillarPages.map((page) => ({
    path: `/resources/${page.slug}`,
    lastModified: staticContentLastModified,
    changeFrequency: "monthly",
    priority: 0.79,
  }));

  const resourceSupportEntries: SitemapEntryDescriptor[] = [
    resourceSupportingPages.decisionShieldOverview.path,
    resourceSupportingPages.capitalPostureTemplate.path,
  ].map((path) => ({
    path: path as `/${string}`,
    lastModified: staticContentLastModified,
    changeFrequency: "monthly",
    priority: 0.68,
  }));

  const resourceArticleEntries: SitemapEntryDescriptor[] = resourceArticles.map((article) => ({
    path: `/resources/${article.slug}`,
    lastModified: staticContentLastModified,
    changeFrequency: "monthly",
    priority: 0.73,
  }));

  const vcAuthorityEntries: SitemapEntryDescriptor[] = [
    {
      path: "/resources/how-vc-firms-can-enforce-capital-discipline-across-portfolios",
      lastModified: staticContentLastModified,
      changeFrequency: "monthly",
      priority: 0.78,
    },
  ];

  const decisionAnswerEntries: SitemapEntryDescriptor[] = (programmaticEligible ? tierOneDecisionPages : []).map((page) => ({
    path: `/answers/${page.slug}`,
    lastModified: staticContentLastModified,
    changeFrequency: "weekly",
    priority: 0.72,
  }));

  const regimeDeepEntries: SitemapEntryDescriptor[] = (programmaticEligible ? regimePages : []).map((regime) => ({
    path: `/startup-macro-posture/${regime.slug}`,
    lastModified: staticContentLastModified,
    changeFrequency: "weekly",
    priority: 0.76,
  }));

  const stageGuideEntries: SitemapEntryDescriptor[] = stageGuides.map((stageGuide) => ({
    path: `/guides/stage/${stageGuide.slug}`,
    lastModified: staticContentLastModified,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const stakeholderGuideEntries: SitemapEntryDescriptor[] = stakeholderGuides.map((stakeholderGuide) => ({
    path: `/guides/${stakeholderGuide.slug}`,
    lastModified: staticContentLastModified,
    changeFrequency: "weekly",
    priority: 0.72,
  }));

  const careerRoleEntries: SitemapEntryDescriptor[] = roleLandings.map((roleLanding) => ({
    path: `/solutions/career-paths/${roleLanding.slug}`,
    lastModified: staticContentLastModified,
    changeFrequency: "weekly",
    priority: 0.68,
  }));

  const conceptFocusEntries: SitemapEntryDescriptor[] = conceptFocuses.map((focus) => ({
    path: `/concepts/focus/${toConceptTaxonomySlug(focus)}`,
    lastModified: staticContentLastModified,
    changeFrequency: "monthly",
    priority: 0.64,
  }));

  const conceptAudienceEntries: SitemapEntryDescriptor[] = conceptAudiences.map((audience) => ({
    path: `/concepts/audience/${toConceptTaxonomySlug(audience)}`,
    lastModified: staticContentLastModified,
    changeFrequency: "monthly",
    priority: 0.64,
  }));

  const signalsClusterEntries: SitemapEntryDescriptor[] = signalScenarioRoutes.map((clusterRoute) => ({
    path: `/signals/${clusterRoute.signalSlug}/${clusterRoute.decisionScenario}`,
    lastModified: reportLastModified,
    changeFrequency: "weekly",
    priority: 0.68,
  }));

  const decideClusterEntries: SitemapEntryDescriptor[] = indexableDecideClusterRoutes.map((clusterRoute) => ({
    path: `/decide/${clusterRoute.slug}/${clusterRoute.cluster}`,
    lastModified: staticContentLastModified,
    changeFrequency: "monthly",
    priority: 0.62,
  }));

  const toolkitClusterEntries: SitemapEntryDescriptor[] = indexableToolkitClusters.map((clusterRoute) => ({
    path: `/toolkits/${clusterRoute.slug}/${clusterRoute.cluster}`,
    lastModified: staticContentLastModified,
    changeFrequency: "monthly",
    priority: 0.62,
  }));

  return [
    ...coreEntries,
    ...postureEntries,
    ...decideRoleBridgeEntries,
    ...decideSituationBridgeEntries,
    ...toolkitEntries,
    ...failureModeEntries,
    ...canonEntries,
    ...resourcePillarEntries,
    ...resourceSupportEntries,
    ...resourceArticleEntries,
    ...vcAuthorityEntries,
    ...decisionAnswerEntries,
    ...regimeDeepEntries,
    ...stageGuideEntries,
    ...stakeholderGuideEntries,
    ...careerRoleEntries,
    ...conceptFocusEntries,
    ...conceptAudienceEntries,
    ...signalsClusterEntries,
    ...decideClusterEntries,
    ...toolkitClusterEntries,
  ]
    .filter((entry) => !isRedirectOnlySitemapPath(entry.path))
    .map(buildEntry);
}

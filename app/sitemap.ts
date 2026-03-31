import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/siteUrl";
import { snapshotData } from "../lib/snapshot";
import { resourcePillarPages } from "../lib/resourcesContent";
import { resourceArticles } from "../lib/resourceArticles";
import { tierOneDecisionPages } from "./answers/decisionPages";
import { signalScenarioRoutes } from "./seoRouteClusters";
import { evaluateSeoQualityGates } from "../lib/report/seoQualityGates";
import { isRetiredSitemapPath } from "./sitemapExclusions";
import { loadWeeklyBriefSnapshot } from "../lib/report/weeklyBriefSnapshot";
import {
  isIndexableAnswerSlug,
  isIndexableResourceArticleSlug,
  isIndexableResourcePillarSlug,
} from "../lib/seo/indexationPolicy";

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
  const { reportData, degraded, snapshot } = await loadWeeklyBriefSnapshot(undefined, { route: "/sitemap" });
  const homeBriefModel = snapshot.homeBriefModel;
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
    isFallbackSnapshot: degraded,
    provenanceStatusLabel: reportData.treasuryProvenance?.statusLabel,
    provenanceLinks: [reportData.treasury.source, reportData.macroSeries[0]?.sourceUrl].filter((link): link is string => Boolean(link)),
    confidenceLabel: homeBriefModel.confidenceLabel,
    fallbackLabel: degraded ? "fallback" : "live",
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
    { path: "/signals", lastModified: reportLastModified, changeFrequency: "weekly", priority: 0.9 },
    { path: "/decide", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.82 },
    { path: "/method", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.78 },
    { path: "/operations", lastModified: staticContentLastModified, changeFrequency: "weekly", priority: 0.84 },
    { path: "/about", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.45 },
    { path: "/terms-of-service", lastModified: staticContentLastModified, changeFrequency: "yearly", priority: 0.4 },
    { path: "/acceptable-use-policy", lastModified: staticContentLastModified, changeFrequency: "yearly", priority: 0.4 },
  ];

  const resourcePillarEntries: SitemapEntryDescriptor[] = resourcePillarPages
    .filter((page) => isIndexableResourcePillarSlug(page.slug))
    .map((page) => ({
    path: `/resources/${page.slug}`,
    lastModified: staticContentLastModified,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const resourceArticleEntries: SitemapEntryDescriptor[] = resourceArticles
    .filter((article) => isIndexableResourceArticleSlug(article.slug))
    .map((article) => ({
    path: `/resources/${article.slug}`,
    lastModified: staticContentLastModified,
    changeFrequency: "monthly",
    priority: 0.58,
    }));

  const vcAuthorityEntries: SitemapEntryDescriptor[] = [
    {
      path: "/resources/how-vc-firms-can-enforce-capital-discipline-across-portfolios",
      lastModified: staticContentLastModified,
      changeFrequency: "monthly",
      priority: 0.59,
    },
  ];

  const decisionAnswerEntries: SitemapEntryDescriptor[] = (programmaticEligible ? tierOneDecisionPages : [])
    .filter((page) => isIndexableAnswerSlug(page.slug))
    .map((page) => ({
      path: `/answers/${page.slug}`,
      lastModified: staticContentLastModified,
      changeFrequency: "weekly",
      priority: 0.58,
    }));

  const signalsClusterEntries: SitemapEntryDescriptor[] = signalScenarioRoutes.map((clusterRoute) => ({
    path: `/signals/${clusterRoute.signalSlug}/${clusterRoute.decisionScenario}`,
    lastModified: reportLastModified,
    changeFrequency: "weekly",
    priority: 0.68,
  }));

  return [
    ...coreEntries,
    ...resourcePillarEntries,
    ...resourceArticleEntries,
    ...vcAuthorityEntries,
    ...decisionAnswerEntries,
    ...signalsClusterEntries,
  ]
    .filter((entry) => !isRetiredSitemapPath(entry.path))
    .map(buildEntry);
}

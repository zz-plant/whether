import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/siteUrl";
import { snapshotData } from "../lib/snapshot";
import {
  failureModes,
  postureDefinitions,
  situationUseCases,
  toolkitDefinitions,
  useCaseRoles,
} from "../lib/informationArchitecture";
import { productConceptArticles } from "../lib/productCanon";
import { resourcePillarPages, resourceSupportingPages } from "../lib/resourcesContent";
import { resourceArticles } from "../lib/resourceArticles";
import { tierOneDecisionPages } from "./answers/decisionPages";
import { regimePages } from "./startup-macro-posture/clusterData";

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

export default function sitemap(): MetadataRoute.Sitemap {
  const reportLastModified = resolveLastModified(snapshotData.record_date, snapshotData.fetched_at);

  const coreEntries: SitemapEntryDescriptor[] = [
    { path: "", lastModified: reportLastModified, changeFrequency: "weekly", priority: 1 },
    { path: "/start", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.9 },
    { path: "/posture", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.8 },
    { path: "/decide", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.82 },
    { path: "/learn", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.78 },
    { path: "/resources", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.8 },
    { path: "/method", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.62 },
    { path: "/methodology", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.56 },
    { path: "/decide/use-cases", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.55 },
    { path: "/toolkits", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.52 },
    { path: "/answers", lastModified: staticContentLastModified, changeFrequency: "weekly", priority: 0.74 },
    { path: "/startup-macro-posture", lastModified: staticContentLastModified, changeFrequency: "weekly", priority: 0.84 },
    { path: "/startup-macro-posture/index", lastModified: staticContentLastModified, changeFrequency: "weekly", priority: 0.8 },
    { path: "/library", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.5 },
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

  const decisionAnswerEntries: SitemapEntryDescriptor[] = tierOneDecisionPages.map((page) => ({
    path: `/answers/${page.slug}`,
    lastModified: staticContentLastModified,
    changeFrequency: "weekly",
    priority: 0.72,
  }));

  const regimeDeepEntries: SitemapEntryDescriptor[] = regimePages.map((regime) => ({
    path: `/startup-macro-posture/${regime.slug}`,
    lastModified: staticContentLastModified,
    changeFrequency: "weekly",
    priority: 0.76,
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
  ].map(buildEntry);
}

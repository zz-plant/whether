import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/siteUrl";
import { snapshotData } from "../lib/snapshot";
import { postureDefinitions, toolkitDefinitions, useCaseRoles, situationUseCases, failureModes } from "../lib/informationArchitecture";
import { productConceptArticles } from "../lib/productCanon";

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

const buildEntry = ({ path, changeFrequency, priority, lastModified }: SitemapEntryDescriptor): MetadataRoute.Sitemap[number] => ({
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
    { path: "/use-cases", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.8 },
    { path: "/toolkits", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.8 },
    { path: "/library", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.75 },
    { path: "/library/failure-modes", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.75 },
    { path: "/library/canon", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.75 },
    { path: "/about", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.6 },
    { path: "/terms-of-service", lastModified: staticContentLastModified, changeFrequency: "yearly", priority: 0.4 },
    { path: "/acceptable-use-policy", lastModified: staticContentLastModified, changeFrequency: "yearly", priority: 0.4 },
  ];

  const postureEntries: SitemapEntryDescriptor[] = postureDefinitions.map((posture) => ({
    path: `/posture/${posture.slug}`,
    lastModified: staticContentLastModified,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const roleUseCaseEntries: SitemapEntryDescriptor[] = useCaseRoles.map((role) => ({
    path: `/use-cases/${role.slug}`,
    lastModified: staticContentLastModified,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const situationEntries: SitemapEntryDescriptor[] = situationUseCases.map((slug) => ({
    path: `/use-cases/${slug}`,
    lastModified: staticContentLastModified,
    changeFrequency: "monthly",
    priority: 0.7,
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
    path: `/library/canon/${article.slug}`,
    lastModified: buildPublishedMonthDate(article.publishedYear, article.publishedMonth),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [
    ...coreEntries,
    ...postureEntries,
    ...roleUseCaseEntries,
    ...situationEntries,
    ...toolkitEntries,
    ...failureModeEntries,
    ...canonEntries,
  ].map(buildEntry);
}

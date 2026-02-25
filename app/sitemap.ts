import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/siteUrl";
import { snapshotData } from "../lib/snapshot";
import { stageGuides } from "./guides/stageGuides";
import { stakeholderGuides } from "./guides/stakeholderGuides";
import { roleLandings } from "./solutions/career-paths/roleLandingData";
import { productConceptArticles } from "../lib/productCanon";

// Market Climate Station SEO map for the primary report surface.

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

    if (parsed) {
      return parsed;
    }
  }

  return fallbackLastModified;
};

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
  const staticLastModified = resolveLastModified(snapshotData.fetched_at, snapshotData.record_date);

  const coreEntries: SitemapEntryDescriptor[] = [
    { path: "", lastModified: reportLastModified, changeFrequency: "weekly", priority: 1 },
    { path: "/signals", lastModified: reportLastModified, changeFrequency: "weekly", priority: 0.8 },
    { path: "/operations", lastModified: reportLastModified, changeFrequency: "weekly", priority: 0.8 },
    {
      path: "/operations/decisions",
      lastModified: reportLastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      path: "/operations/briefings",
      lastModified: reportLastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      path: "/methodology",
      lastModified: staticLastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      path: "/terms-of-service",
      lastModified: staticLastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      path: "/acceptable-use-policy",
      lastModified: staticLastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    { path: "/onboarding", lastModified: staticLastModified, changeFrequency: "monthly", priority: 0.6 },
    { path: "/guides", lastModified: staticLastModified, changeFrequency: "monthly", priority: 0.7 },
    { path: "/guides/stage", lastModified: staticLastModified, changeFrequency: "monthly", priority: 0.7 },
    { path: "/concepts", lastModified: staticLastModified, changeFrequency: "monthly", priority: 0.7 },
    {
      path: "/solutions/product-roadmapping",
      lastModified: staticLastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      path: "/solutions/engineering-capacity",
      lastModified: staticLastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      path: "/solutions/market-regime-playbook",
      lastModified: staticLastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      path: "/solutions/career-paths",
      lastModified: staticLastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    { path: "/llms.txt", lastModified: reportLastModified, changeFrequency: "weekly", priority: 0.5 },
  ];

  const stakeholderEntries: SitemapEntryDescriptor[] = stakeholderGuides.map((guide) => ({
    path: `/guides/${guide.slug}`,
    lastModified: staticLastModified,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const stageEntries: SitemapEntryDescriptor[] = stageGuides.map((guide) => ({
    path: `/guides/stage/${guide.slug}`,
    lastModified: staticLastModified,
    changeFrequency: "monthly",
    priority: 0.6,
  }));


  const conceptArticleEntries: SitemapEntryDescriptor[] = productConceptArticles.map((article) => ({
    path: `/concepts/${article.slug}`,
    lastModified: staticLastModified,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const careerPathEntries: SitemapEntryDescriptor[] = roleLandings.map((role) => ({
    path: `/solutions/career-paths/${role.slug}`,
    lastModified: staticLastModified,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...coreEntries, ...stakeholderEntries, ...stageEntries, ...conceptArticleEntries, ...careerPathEntries].map(buildEntry);
}

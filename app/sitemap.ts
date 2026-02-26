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
  const staticLastModified = staticContentLastModified;

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
      path: "/operations/data",
      lastModified: reportLastModified,
      changeFrequency: "weekly",
      priority: 0.6,
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
    { path: "/solutions", lastModified: staticLastModified, changeFrequency: "monthly", priority: 0.7 },
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
    lastModified: buildPublishedMonthDate(article.publishedYear, article.publishedMonth),
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

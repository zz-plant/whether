import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/siteUrl";
import { snapshotData } from "../lib/snapshot";
import { stageGuides } from "./guides/stageGuides";
import { stakeholderGuides } from "./guides/stakeholderGuides";
import { roleLandings } from "./solutions/career-paths/roleLandingData";

// Market Climate Station SEO map for the primary report surface.

export default function sitemap(): MetadataRoute.Sitemap {
  const reportLastModified = new Date(snapshotData.record_date);
  const staticLastModified = new Date("2026-02-01");

  const stakeholderPages: MetadataRoute.Sitemap = stakeholderGuides.map((guide) => ({
    url: `${siteUrl}/guides/${guide.slug}`,
    lastModified: staticLastModified,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const stagePages: MetadataRoute.Sitemap = stageGuides.map((guide) => ({
    url: `${siteUrl}/guides/stage/${guide.slug}`,
    lastModified: staticLastModified,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const careerPathPages: MetadataRoute.Sitemap = roleLandings.map((role) => ({
    url: `${siteUrl}/solutions/career-paths/${role.slug}`,
    lastModified: staticLastModified,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [
    {
      url: siteUrl,
      lastModified: reportLastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/signals`,
      lastModified: reportLastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/operations`,
      lastModified: reportLastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/operations/plan`,
      lastModified: reportLastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/operations/decisions`,
      lastModified: reportLastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/operations/briefings`,
      lastModified: reportLastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/methodology`,
      lastModified: staticLastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/terms-of-service`,
      lastModified: staticLastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/acceptable-use-policy`,
      lastModified: staticLastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/onboarding`,
      lastModified: staticLastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/guides`,
      lastModified: staticLastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/guides/stage`,
      lastModified: staticLastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/solutions/product-roadmapping`,
      lastModified: staticLastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/solutions/engineering-capacity`,
      lastModified: staticLastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/solutions/market-regime-playbook`,
      lastModified: staticLastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/solutions/career-paths`,
      lastModified: staticLastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...stakeholderPages,
    ...stagePages,
    ...careerPathPages,
    {
      url: `${siteUrl}/llms.txt`,
      lastModified: reportLastModified,
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];
}

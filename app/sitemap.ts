import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/siteUrl";
import { snapshotData } from "../lib/snapshot";
import { stageGuides } from "./guides/stageGuides";
import { stakeholderGuides } from "./guides/stakeholderGuides";

// Market Climate Station SEO map for the primary report surface.

export default function sitemap(): MetadataRoute.Sitemap {
  const contentLastModified = new Date(snapshotData.record_date);
  const stakeholderPages: MetadataRoute.Sitemap = stakeholderGuides.map((guide) => ({
    url: `${siteUrl}/guides/${guide.slug}`,
    lastModified: contentLastModified,
    changeFrequency: "monthly",
    priority: 0.6,
  }));
  const stagePages: MetadataRoute.Sitemap = stageGuides.map((guide) => ({
    url: `${siteUrl}/guides/stage/${guide.slug}`,
    lastModified: contentLastModified,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [
    {
      url: siteUrl,
      lastModified: contentLastModified,
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: `${siteUrl}/formulas`,
      lastModified: contentLastModified,
      changeFrequency: "monthly",
      priority: 0.6
    },
    {
      url: `${siteUrl}/methodology`,
      lastModified: contentLastModified,
      changeFrequency: "monthly",
      priority: 0.7
    },
    {
      url: `${siteUrl}/signals`,
      lastModified: contentLastModified,
      changeFrequency: "weekly",
      priority: 0.8
    },
    {
      url: `${siteUrl}/onboarding`,
      lastModified: contentLastModified,
      changeFrequency: "monthly",
      priority: 0.6
    },
    {
      url: `${siteUrl}/operations`,
      lastModified: contentLastModified,
      changeFrequency: "weekly",
      priority: 0.8
    },
    {
      url: `${siteUrl}/operations/plan`,
      lastModified: contentLastModified,
      changeFrequency: "weekly",
      priority: 0.7
    },
    {
      url: `${siteUrl}/operations/decisions`,
      lastModified: contentLastModified,
      changeFrequency: "weekly",
      priority: 0.7
    },
    {
      url: `${siteUrl}/operations/briefings`,
      lastModified: contentLastModified,
      changeFrequency: "weekly",
      priority: 0.7
    },
    {
      url: `${siteUrl}/guides`,
      lastModified: contentLastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/guides/stage`,
      lastModified: contentLastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...stakeholderPages,
    ...stagePages,
    {
      url: `${siteUrl}/llms.txt`,
      lastModified: contentLastModified,
      changeFrequency: "weekly",
      priority: 0.5,
    }
  ];
}

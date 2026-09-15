import { resourceArticles } from "./resourceArticles";
import { resourcePillarPages } from "./resourcesContent";
import { isIndexableResourceArticleSlug, isIndexableResourcePillarSlug } from "./seo/indexationPolicy";

type ResourceHubEntry = {
  href: `/resources/${string}`;
  title: string;
  description: string;
  kind: "pillar" | "article" | "standalone";
};

/**
 * Every indexable page under /resources, for the hub that links them.
 *
 * Until 2026-09-15 `/resources` was a redirect to an anchor on /operate, so the
 * six indexable pages beneath it had breadcrumbs that 308'd, and three of them
 * had no inbound link from anywhere. A URL a crawler can only reach from the
 * sitemap is a URL it ranks accordingly. The sitemap test checks that every
 * `/resources/*` URL it emits appears here.
 */
export const buildResourceHubEntries = (): ResourceHubEntry[] => [
  ...resourcePillarPages
    .filter((page) => isIndexableResourcePillarSlug(page.slug))
    .map((page): ResourceHubEntry => ({
      href: `/resources/${page.slug}`,
      title: page.title,
      description: page.description,
      kind: "pillar",
    })),
  ...resourceArticles
    .filter((article) => isIndexableResourceArticleSlug(article.slug))
    .map((article): ResourceHubEntry => ({
      href: `/resources/${article.slug}`,
      title: article.title,
      description: article.description,
      kind: "article",
    })),
  /*
   * `standalone`: its own route, in neither content list. It was declared here
   * and again in `app/sitemap.ts`; the sitemap reads this entry now, so the URL
   * is stated once.
   */
  {
    href: "/resources/how-vc-firms-can-enforce-capital-discipline-across-portfolios",
    title: "How VC firms can enforce capital discipline across portfolios",
    description:
      "A portfolio-level operating standard: one posture read, one set of reversal triggers, applied across every company a firm backs.",
    kind: "standalone",
  },
];

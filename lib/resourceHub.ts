import type { DecisionArea } from "./report/boundedDecisionRules";
import { getResourceArticleDecisionAreas, resourceArticles, type ResourceArticle } from "./resourceArticles";
import { resourcePillarPages } from "./resourcesContent";
import { isIndexableResourceArticleSlug, isIndexableResourcePillarSlug } from "./seo/indexationPolicy";

type ResourceHubEntry = {
  href: `/resources/${string}`;
  title: string;
  description: string;
  kind: "pillar" | "article" | "standalone";
  /** The decision area an article argues, for the Guides page's grouping. Frameworks span every area and carry none. */
  decisionArea?: DecisionArea;
};

/*
 * The area each article is about, where the intent mapping reads it wrong: the
 * hiring-freeze policy is written for a CFO, and the CFO intent leads with
 * spending, so the Guides page would have filed a hiring guide under Spending.
 */
const articleLeadAreaBySlug: Record<string, DecisionArea> = {
  "should-we-freeze-hiring-high-interest-rate-environment": "hiring",
  "how-much-runway-do-we-need-tightening-market": "burn-discipline",
};

const articleLeadArea = (article: ResourceArticle): DecisionArea | undefined =>
  articleLeadAreaBySlug[article.slug] ?? getResourceArticleDecisionAreas(article)[0];

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
      decisionArea: articleLeadArea(article),
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
      "A portfolio-level operating standard: one guidance reading, one set of pause and resume lines, applied across every company a firm backs.",
    kind: "standalone",
  },
];

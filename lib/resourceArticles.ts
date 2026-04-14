import type { Route } from "./navigation/routeType";
import type { DecisionArea } from "./report/boundedDecisionRules";
import type {
  ResourceArticleData,
  ResourceArticleEmbedData,
  ResourceArticleSectionData,
} from "./resourceContentSource";
import { resourceArticleContent } from "./resourceContentSource";

export type ResourceArticle = Omit<ResourceArticleData, "toolLink"> & {
  toolLink: { href: Route; label: string };
};

export type ResourceArticleEmbed = ResourceArticleEmbedData;
export type ResourceArticleSection = ResourceArticleSectionData;

const activeResourceArticleSlugs = [
  "should-we-freeze-hiring-high-interest-rate-environment",
  "how-much-runway-do-we-need-tightening-market",
] as const;

const retiredResourceArticleSlugs = [
  "platform-rewrites-during-capital-tightening-risk-analysis",
  "how-venture-capital-cycles-affect-startup-operating-strategy",
  "from-freeze-to-selective-offense-case-study",
  "vc-portfolio-governance-case-example-burn-multiple-normalization",
  "operator-posture-standardization-case-example-product-finance",
] as const;

const activeResourceArticleSlugSet = new Set<string>(activeResourceArticleSlugs);
const retiredResourceArticleSlugSet = new Set<string>(retiredResourceArticleSlugs);

export const resourceArticles: ResourceArticle[] = resourceArticleContent
  .filter((article) => activeResourceArticleSlugSet.has(article.slug))
  .map((article) => ({
    ...article,
    toolLink: {
      ...article.toolLink,
      href: article.toolLink.href as Route,
    },
  }));

export const isRetiredResourceArticleSlug = (slug: string) =>
  retiredResourceArticleSlugSet.has(slug);

export const findResourceArticleBySlug = (slug: string) =>
  resourceArticles.find((article) => article.slug === slug);

export const generateStaticParams = () => resourceArticles.map((article) => ({ slug: article.slug }));

const resourceDecisionAreasByIntent: Record<ResourceArticle["intent"], DecisionArea[]> = {
  cfo: ["burn-discipline", "capital-raising", "hiring"],
  board: ["capital-raising", "burn-discipline", "expansion-bets"],
  "vp-product": ["product-tempo", "expansion-bets", "hiring"],
  "vc-partner": ["capital-raising", "burn-discipline", "expansion-bets"],
};

export const getResourceArticleDecisionAreas = (article: ResourceArticle): DecisionArea[] => {
  const byIntent = resourceDecisionAreasByIntent[article.intent] ?? [];
  const byCluster = article.cluster === "vc" ? (["capital-raising", "burn-discipline"] as DecisionArea[]) : [];
  return Array.from(new Set([...byIntent, ...byCluster]));
};

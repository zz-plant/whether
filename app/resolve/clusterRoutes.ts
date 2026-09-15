import { useCaseRoles } from "../../lib/decisionDomainCatalog";
import { decideCanonicalRoutes } from "../seoRouteClusters";

type DecideClusterRoute = {
  slug: string;
  cluster: string;
  isIndexable: boolean;
  isCanonical: boolean;
};

const validRoles = new Set(useCaseRoles.map((role) => role.slug));

const decideClusterRoutes: DecideClusterRoute[] = decideCanonicalRoutes.map((route) => ({
  slug: route.role,
  cluster: route.scenario,
  isIndexable: validRoles.has(route.role),
  isCanonical: route.isCanonical,
}));

export const decideClusterStaticParams = decideClusterRoutes
  .filter((route) => route.isIndexable)
  .map((route) => ({ slug: route.slug, cluster: route.cluster }));

export const decideCanonicalClusterStaticParams = decideClusterRoutes
  .filter((route) => route.isIndexable && route.isCanonical)
  .map((route) => ({ slug: route.slug, cluster: route.cluster }));

export const findDecideClusterRoute = (slug: string, cluster: string) =>
  decideClusterRoutes.find((route) => route.slug === slug && route.cluster === cluster && route.isIndexable);

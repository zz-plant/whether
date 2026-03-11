import { findToolkitDefinition } from "../../lib/decisionDomainCatalog";
import { toolkitCanonicalRoutes } from "../seoRouteClusters";

type ToolkitClusterDefinition = {
  slug: string;
  cluster: string;
  isIndexable: boolean;
  isCanonical: boolean;
};

const toolkitClusterDefinitions: ToolkitClusterDefinition[] = toolkitCanonicalRoutes.map((route) => ({
  slug: route.toolkitType,
  cluster: route.macroContext,
  isIndexable: Boolean(findToolkitDefinition(route.toolkitType)),
  isCanonical: route.isCanonical,
}));

export const toolkitClusterStaticParams = toolkitClusterDefinitions
  .filter((cluster) => cluster.isIndexable)
  .map((cluster) => ({ slug: cluster.slug, cluster: cluster.cluster }));

export const findToolkitCluster = (slug: string, cluster: string) =>
  toolkitClusterDefinitions.find(
    (entry) => entry.slug === slug && entry.cluster === cluster && entry.isIndexable,
  );

export const indexableToolkitClusters = toolkitClusterDefinitions.filter((cluster) => cluster.isIndexable && cluster.isCanonical);

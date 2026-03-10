import { toolkitDefinitions } from "../../lib/informationArchitecture";

type ToolkitClusterDefinition = {
  slug: string;
  cluster: "decision-contract";
  isIndexable: boolean;
};

const toolkitClusterDefinitions: ToolkitClusterDefinition[] = toolkitDefinitions.map((toolkit) => ({
  slug: toolkit.slug,
  cluster: "decision-contract",
  isIndexable: toolkit.runSequence.length > 0 && toolkit.prepChecklist.length > 0,
}));

export const toolkitClusterStaticParams = toolkitClusterDefinitions
  .filter((cluster) => cluster.isIndexable)
  .map((cluster) => ({ slug: cluster.slug, cluster: cluster.cluster }));

export const findToolkitCluster = (slug: string, cluster: string) =>
  toolkitClusterDefinitions.find(
    (entry) => entry.slug === slug && entry.cluster === cluster && entry.isIndexable,
  );

export const indexableToolkitClusters = toolkitClusterDefinitions.filter((cluster) => cluster.isIndexable);


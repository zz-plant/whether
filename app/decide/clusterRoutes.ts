import {
  findToolkitDefinition,
  situationUseCaseDefinitions,
  useCaseRoles,
  type ToolkitSlug,
} from "../../lib/informationArchitecture";

type DecideClusterRoute = {
  slug: string;
  cluster: string;
  toolkitSlug: ToolkitSlug;
  isIndexable: boolean;
};

const roleClusters: DecideClusterRoute[] = useCaseRoles.flatMap((role) =>
  role.recommendedToolkitSlugs.map((toolkitSlug) => ({
    slug: role.slug,
    cluster: toolkitSlug,
    toolkitSlug,
    isIndexable: Boolean(findToolkitDefinition(toolkitSlug)),
  })),
);

const situationClusters: DecideClusterRoute[] = situationUseCaseDefinitions.flatMap((situation) =>
  situation.recommendedToolkitSlugs.map((toolkitSlug) => ({
    slug: situation.slug,
    cluster: toolkitSlug,
    toolkitSlug,
    isIndexable: Boolean(findToolkitDefinition(toolkitSlug)),
  })),
);

const decideClusterRoutes = [...roleClusters, ...situationClusters];

export const decideClusterStaticParams = decideClusterRoutes
  .filter((route) => route.isIndexable)
  .map((route) => ({ slug: route.slug, cluster: route.cluster }));

export const findDecideClusterRoute = (slug: string, cluster: string) =>
  decideClusterRoutes.find((route) => route.slug === slug && route.cluster === cluster && route.isIndexable);

export const indexableDecideClusterRoutes = decideClusterRoutes.filter((route) => route.isIndexable);


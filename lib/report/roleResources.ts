import { toolkitDefinitions } from "../decisionDomainCatalog";
import { findStakeholderGuide } from "../../app/guides/stakeholderGuides";

type ToolkitItem = (typeof toolkitDefinitions)[number];

type RoleGuidanceLink = {
  stakeholderSlug: string;
  stakeholderTitle: string;
  tagline: string;
};

type RoleResourceInfo = {
  leadershipGuidance?: RoleGuidanceLink;
  toolkits: ToolkitItem[];
};

const ROLE_MAPPINGS: Record<
  string,
  {
    stakeholderSlug: string;
    toolkitSlugs: readonly string[];
  }
> = {
  "finance-teams": {
    stakeholderSlug: "finance-leaders",
    toolkitSlugs: ["rollback", "decision-rights", "ops-capacity"],
  },
  "software-engineers": {
    stakeholderSlug: "vps-of-engineering",
    toolkitSlugs: ["ops-capacity", "rollback", "launch-gates"],
  },
  "engineering-managers": {
    stakeholderSlug: "vps-of-engineering",
    toolkitSlugs: ["ops-capacity", "rollback", "launch-gates"],
  },
  "product-managers": {
    stakeholderSlug: "heads-of-product",
    toolkitSlugs: ["focus", "pmf", "claims"],
  },
  designers: {
    stakeholderSlug: "heads-of-product",
    toolkitSlugs: ["focus", "pmf"],
  },
  "data-analysts": {
    stakeholderSlug: "finance-leaders",
    toolkitSlugs: ["focus", "ops-capacity"],
  },
  "growth-leaders": {
    stakeholderSlug: "founders-ceos",
    toolkitSlugs: ["claims", "pmf", "launch-gates"],
  },
  "customer-support": {
    stakeholderSlug: "founders-ceos",
    toolkitSlugs: ["ops-capacity", "claims"],
  },
  recruiters: {
    stakeholderSlug: "founders-ceos",
    toolkitSlugs: ["ops-capacity", "rollback"],
  },
  "it-security": {
    stakeholderSlug: "vps-of-engineering",
    toolkitSlugs: ["ops-capacity", "rollback", "decision-rights"],
  },
};

export function getRoleResources(roleSlug: string): RoleResourceInfo {
  const mapping = ROLE_MAPPINGS[roleSlug];
  if (!mapping) {
    return { toolkits: [] };
  }

  const guide = findStakeholderGuide(mapping.stakeholderSlug);
  const leadershipGuidance = guide
    ? {
        stakeholderSlug: guide.slug,
        stakeholderTitle: guide.title,
        tagline: guide.tagline,
      }
    : undefined;

  const toolkits = mapping.toolkitSlugs
    .map((slug) => toolkitDefinitions.find((t) => t.slug === slug))
    .filter((t): t is ToolkitItem => Boolean(t));

  return {
    leadershipGuidance,
    toolkits,
  };
}

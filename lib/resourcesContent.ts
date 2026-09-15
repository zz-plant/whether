import type { Route } from "./navigation/routeType";
import type {
  GovernanceLexiconTermData,
  ResourcePillarPageData,
} from "./resourceContentSource";
import { resourceMetaContent, resourcePillarContent } from "./resourceContentSource";

export type GovernanceLexiconTerm = GovernanceLexiconTermData;
export type ResourcePillarPage = Omit<ResourcePillarPageData, "canonicalPath"> & {
  canonicalPath: Route;
};

type ResourceSupportingPages = {
  decisionShieldOverview: { path: Route; title: string };
  capitalPostureTemplate: { path: Route; title: string };
  reversalTriggerChecklist: { path: Route; title: string };
  quarterlyCapitalPostureMemoExample: { path: Route; title: string };
};

export const governanceLexicon: GovernanceLexiconTerm[] = resourceMetaContent.governanceLexicon;

export const canonicalCapitalDisciplinePath =
  resourceMetaContent.canonicalCapitalDisciplinePath as Route;

export const resourcePillarPages: ResourcePillarPage[] = resourcePillarContent.map((page) => ({
  ...page,
  canonicalPath: page.canonicalPath as Route,
}));

export const resourceSupportingPages: ResourceSupportingPages = {
  decisionShieldOverview: {
    ...resourceMetaContent.resourceSupportingPages.decisionShieldOverview,
    path: resourceMetaContent.resourceSupportingPages.decisionShieldOverview.path as Route,
  },
  capitalPostureTemplate: {
    ...resourceMetaContent.resourceSupportingPages.capitalPostureTemplate,
    path: resourceMetaContent.resourceSupportingPages.capitalPostureTemplate.path as Route,
  },
  reversalTriggerChecklist: {
    ...resourceMetaContent.resourceSupportingPages.reversalTriggerChecklist,
    path: resourceMetaContent.resourceSupportingPages.reversalTriggerChecklist.path as Route,
  },
  quarterlyCapitalPostureMemoExample: {
    ...resourceMetaContent.resourceSupportingPages.quarterlyCapitalPostureMemoExample,
    path: resourceMetaContent.resourceSupportingPages.quarterlyCapitalPostureMemoExample.path as Route,
  },
};

export const findResourcePillarBySlug = (slug: string) =>
  resourcePillarPages.find((page) => page.slug === slug);

import {
  navigationLayers,
  navigationLayerByKey,
  primaryNavigationLayers,
  type NavigationLayer,
} from "./informationArchitecture";
import { pathMatchesLink } from "./pathMatching";
import { reportShellCorePaths } from "../report/reportNavigation";

const fallbackLabel = "Report";

export const normalizePathname = (pathname: string) =>
  pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

export const isReportShellRoute = (pathname: string) => {
  const normalizedPathname = normalizePathname(pathname);
  return reportShellCorePaths.some((route) => pathMatchesLink(route, normalizedPathname));
};

export const resolveGlobalHeaderRouteLabel = (pathname: string) => {
  const normalizedPathname = normalizePathname(pathname);
  return navigationLayers.find((layer) => pathMatchesLink(layer.href, normalizedPathname))?.label ?? fallbackLabel;
};

export const resolveGlobalHeaderTagline = (pathname: string) => {
  const normalizedPathname = normalizePathname(pathname);

  if (pathMatchesLink("/", normalizedPathname)) {
    return {
      title: "Weekly operating brief for hiring, spend, and pace.",
      description: "Start here, share from here, and open one deeper page only if a specific question remains.",
    } as const;
  }

  const activeLayer = navigationLayers.find((layer) => pathMatchesLink(layer.href, normalizedPathname));

  if (!activeLayer) {
    return {
      title: "Operating posture navigation",
      description: null,
    } as const;
  }

  const parentLayer = activeLayer.parentKey ? navigationLayerByKey[activeLayer.parentKey] : null;
  const actionDescriptionByKey: Partial<Record<NavigationLayer["key"], string>> = {
    "weekly-brief": "Read the weekly call, then leave home only if proof, planning, translation, or trust still needs work.",
    signals: "Validate what changed, why it changed, and which thresholds or replay history would alter this week's decision.",
    operations: "Approve the weekly plan, guardrails, finance posture, and share-ready artifact in one pass.",
    decide: "Resolve one remaining edge case after the weekly brief and plan are already directionally clear.",
    method: "Run a fast trust check on freshness, confidence, source coverage, and reversal conditions before irreversible moves.",
    toolkits: "Run one bounded instrument only after Decision Tools has already narrowed the decision.",
  };

  return {
    title: activeLayer.label,
    description:
      activeLayer.tier === "supporting" && parentLayer
        ? `${actionDescriptionByKey[activeLayer.key] ?? activeLayer.description} Primary parent: ${parentLayer.label}.`
        : (actionDescriptionByKey[activeLayer.key] ?? activeLayer.description),
  } as const;
};

export type GlobalHeaderNavigationLink = NavigationLayer & { isActive: boolean };

export const resolveGlobalHeaderNavigationLinks = (pathname: string): GlobalHeaderNavigationLink[] => {
  const normalizedPathname = normalizePathname(pathname);

  return primaryNavigationLayers.map((link) => ({
    ...link,
    isActive: pathMatchesLink(link.href, normalizedPathname),
  }));
};

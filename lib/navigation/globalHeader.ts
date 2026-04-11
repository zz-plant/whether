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
  const activeLayer = navigationLayers.find((layer) => pathMatchesLink(layer.href, normalizedPathname));
  return activeLayer ? activeLayer.navLabel ?? activeLayer.label : fallbackLabel;
};

export const resolveGlobalHeaderTagline = (pathname: string) => {
  const normalizedPathname = normalizePathname(pathname);

  if (pathMatchesLink("/", normalizedPathname)) {
    return {
      title: "Weekly operating brief for hiring, spend, and pace.",
      description: "Start here for this week's call, next move, and pause line.",
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
    "weekly-brief": "See this week's call, next move, and pause line.",
    signals: "See what changed and what to watch.",
    operations: "Approve or hold hiring, spend, roadmap, and what to share.",
    decide: "Close one open question.",
    method: "Check freshness, confidence, and sources.",
    toolkits: "Use a tool or template for a specific task.",
  };

  return {
    title: activeLayer.navLabel ?? activeLayer.label,
    description:
      activeLayer.tier === "supporting" && parentLayer
        ? `${actionDescriptionByKey[activeLayer.key] ?? activeLayer.description} See ${parentLayer.label} for the broader set of options.`
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

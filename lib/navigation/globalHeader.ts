import {
  navigationLayers,
  navigationLayerByKey,
  primaryNavigationLayers,
  type NavigationLayer,
} from "./informationArchitecture";
import { pathMatchesLink } from "./pathMatching";
import { reportShellCorePaths } from "../report/reportNavigation";

const fallbackLabel = "Page";

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
      title: "Weekly planning brief for hiring, spending, and growth pace.",
      description: "Start here for this week's brief, what to do now, and what would change it.",
    } as const;
  }

  const activeLayer = navigationLayers.find((layer) => pathMatchesLink(layer.href, normalizedPathname));

  if (!activeLayer) {
    return {
      title: fallbackLabel,
      description: null,
    } as const;
  }

  const parentLayer = activeLayer.parentKey ? navigationLayerByKey[activeLayer.parentKey] : null;
  const actionDescriptionByKey: Partial<Record<NavigationLayer["key"], string>> = {
    "weekly-brief": "See this week's brief, what to do now, and what would change it.",
    signals: "See what changed and what to watch.",
    planning: "Approve or hold hiring, spend, roadmap, and what to share.",
    resolve: "Close one open question.",
    trust: "Check freshness, confidence, and sources.",
    history: "See trends and historical snapshots.",
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

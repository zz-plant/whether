import {
  navigationGroupLabels,
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
      title: "Startup market weather: weekly posture for hiring, fundraising, and runway.",
      description: "Scan the call, lock the decision, and open the right execution surface.",
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

  return {
    title: activeLayer.label,
    description:
      activeLayer.tier === "supporting" && parentLayer
        ? `${activeLayer.description} Primary parent: ${parentLayer.label}.`
        : activeLayer.description,
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

export const globalHeaderGroupLabels = navigationGroupLabels;

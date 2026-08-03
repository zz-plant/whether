import {
  navigationLayers,
  primaryNavigationLayers,
  reportShellPaths,
  type NavigationLayer,
} from "./informationArchitecture";
import { pathMatchesLink } from "./pathMatching";

const fallbackLabel = "Page";

export const normalizePathname = (pathname: string) =>
  pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

export const isReportShellRoute = (pathname: string) => {
  const normalizedPathname = normalizePathname(pathname);
  return reportShellPaths.some((route) => pathMatchesLink(route, normalizedPathname));
};

// Prefer the most specific layer when hrefs nest (e.g. /history/compare under
// /history).
const findActiveLayer = (pathname: string) => {
  const normalizedPathname = normalizePathname(pathname);
  return [...navigationLayers]
    .sort((a, b) => b.href.length - a.href.length)
    .find((layer) => pathMatchesLink(layer.href, normalizedPathname));
};

const findActivePrimaryLayer = (pathname: string) =>
  primaryNavigationLayers.find((layer) => pathMatchesLink(layer.href, normalizePathname(pathname)));

export const resolveGlobalHeaderRouteLabel = (pathname: string) => {
  const activeLayer = findActiveLayer(pathname);
  return activeLayer ? activeLayer.navLabel ?? activeLayer.label : fallbackLabel;
};

// Next step in the operator loop: walks primaryNavigationLayers in IA order
// and cycles back to the brief after the last hub.
export const resolveReportHeaderNextStep = (pathname: string) => {
  const activeLayer = findActivePrimaryLayer(pathname);

  if (!activeLayer) {
    return null;
  }

  const activeIndex = primaryNavigationLayers.indexOf(activeLayer);
  const nextLayer = primaryNavigationLayers[(activeIndex + 1) % primaryNavigationLayers.length];
  return { href: nextLayer.href, label: nextLayer.navLabel ?? nextLayer.label } as const;
};

export type GlobalHeaderNavigationLink = NavigationLayer & { isActive: boolean };

export const resolveGlobalHeaderNavigationLinks = (pathname: string): GlobalHeaderNavigationLink[] => {
  const normalizedPathname = normalizePathname(pathname);

  return primaryNavigationLayers.map((link) => ({
    ...link,
    isActive: pathMatchesLink(link.href, normalizedPathname),
  }));
};

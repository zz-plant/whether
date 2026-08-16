import {
  navigationLayers,
  primaryNavigationLayers,
  reportShellPaths,
  utilityLinks,
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

// Resolve route label from utility links (framework, template, api-docs, about, etc.)
const resolveUtilityRouteLabel = (pathname: string) => {
  const normalizedPathname = normalizePathname(pathname);
  return utilityLinks.find((link) => pathMatchesLink(link.href, normalizedPathname))?.label ?? null;
};

export const resolveGlobalHeaderRouteLabel = (pathname: string) => {
  const activeLayer = findActiveLayer(pathname);

  if (activeLayer) {
    return activeLayer.navLabel ?? activeLayer.label;
  }

  return resolveUtilityRouteLabel(normalizePathname(pathname)) ?? fallbackLabel;
};

// Next step in the operator loop. The weekly brief is the only primary layer,
// so any other report-shell route resolves back to the one-screen brief rather
// than promoting a further hub. Non-report routes return null.
export const resolveReportHeaderNextStep = (pathname: string) => {
  const normalizedPathname = normalizePathname(pathname);

  if (normalizedPathname === "/") {
    return null;
  }

  if (isReportShellRoute(normalizedPathname)) {
    return { href: "/", label: "Weekly Brief" } as const;
  }

  return null;
};

export type GlobalHeaderNavigationLink = NavigationLayer & { isActive: boolean };

export const resolveGlobalHeaderNavigationLinks = (pathname: string): GlobalHeaderNavigationLink[] => {
  const normalizedPathname = normalizePathname(pathname);

  return primaryNavigationLayers.map((link) => ({
    ...link,
    isActive: pathMatchesLink(link.href, normalizedPathname),
  }));
};

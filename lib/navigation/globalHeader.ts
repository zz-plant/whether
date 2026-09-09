import {
  contentSections,
  navigationLayers,
  primaryNavigationLayers,
  reportShellPaths,
  utilityLinks,
  type NavigationLayer,
} from "./informationArchitecture";
import { pathMatchesLink } from "./pathMatching";

const fallbackLabel = "Page";

// Route families the IA names as content rather than as layers or utilities.
const resolveSectionRouteLabel = (pathname: string) =>
  [...contentSections]
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.label ?? null;

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

  const normalizedPathname = normalizePathname(pathname);

  return (
    resolveUtilityRouteLabel(normalizedPathname)
    ?? resolveSectionRouteLabel(normalizedPathname)
    ?? fallbackLabel
  );
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

// The operator loop in IA order — brief → plan → evidence → resolve → trust →
// history — with only the deepest nested layer (compare, under history) left to
// its parent page. The desktop bar renders the primary tier from this list and
// puts the supporting tier inside More; exactly one link is active, the most
// specific layer matching the path.
export const resolveGlobalHeaderLoopLinks = (pathname: string): GlobalHeaderNavigationLink[] => {
  const activeLayer = findActiveLayer(pathname);

  return navigationLayers
    .filter((layer) => layer.key !== "compare")
    .map((link) => ({
      ...link,
      isActive: activeLayer?.key === link.key,
    }));
};

/**
 * Whether the desktop nav row will visibly mark the current route.
 *
 * The header drops the route label beside the wordmark only where the
 * navigation names the route itself. That is now true for the brief alone: the
 * supporting layers sit inside the closed More menu, the same place the utility
 * links always were, so on `/operate` or `/trust` nothing in the bar is active
 * and the label has to come back — exactly as it always did for `/pricing`.
 * Callers render the label when this returns false.
 */
export const hasVisibleActiveNavLink = (pathname: string) =>
  resolveGlobalHeaderNavigationLinks(pathname).some((link) => link.isActive);

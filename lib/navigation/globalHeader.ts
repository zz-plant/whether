import {
  navigationLayers,
  primaryNavigationLayers,
  reportShellPaths,
  utilityLinks,
  type NavigationLayer,
} from "./informationArchitecture";
import { pathMatchesLink } from "./pathMatching";

const fallbackLabel = "Page";

/**
 * Labels for routes that no navigation layer or utility link claims.
 *
 * These all resolved to the bare fallback, so the header on the most linkable
 * URL on the site — a frozen, citable weekly record — read "Whether · Page"
 * while every other route named itself. Prefix-matched, longest first, so a
 * future exact entry can still win.
 */
const sectionRouteLabels: ReadonlyArray<readonly [prefix: string, label: string]> = [
  ["/answers", "Answer"],
  ["/brief", "Published brief"],
  ["/resources", "Resource"],
  ["/toolkits", "Toolkit"],
  ["/contact", "Contact"],
];

const resolveSectionRouteLabel = (pathname: string) =>
  [...sectionRouteLabels]
    .sort((a, b) => b[0].length - a[0].length)
    .find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ?? null;

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

// The operator loop as the desktop header shows it: brief → plan → evidence →
// resolve → trust → history, in IA order, with only the deepest nested layer
// (compare, under history) left to its parent page. The header used to render
// the brief, an API link, and a More menu — the loop the IA file defines was
// reachable only from the mobile drawer and in-page cues. Exactly one link is
// active: the most specific layer matching the path.
export const resolveGlobalHeaderLoopLinks = (pathname: string): GlobalHeaderNavigationLink[] => {
  const activeLayer = findActiveLayer(pathname);

  return navigationLayers
    .filter((layer) => layer.key !== "compare")
    .map((link) => ({
      ...link,
      isActive: activeLayer?.key === link.key,
    }));
};

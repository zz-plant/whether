import {
  contentSections,
  loopNavigationLayers,
  navigationLayers,
  primaryNavigationLayers,
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
  // A layer the row does not render (compare, under history) lights its
  // nearest rendered ancestor, so /history/compare marks the History tab.
  let activeLayer = findActiveLayer(pathname);
  while (activeLayer) {
    const current = activeLayer;
    if (loopNavigationLayers.some((layer) => layer.key === current.key)) break;
    activeLayer = current.parentKey ? navigationLayers.find((layer) => layer.key === current.parentKey) : undefined;
  }
  const activeKey = activeLayer?.key;

  return loopNavigationLayers.map((link) => ({
    ...link,
    isActive: activeKey === link.key,
  }));
};

/**
 * Whether the desktop nav row will visibly mark the current route.
 *
 * The header drops the route label beside the wordmark only where the
 * navigation names the route itself. The six loop layers render as tabs, so
 * any of them (and any route nested under one) counts; `/pricing`, `/about`,
 * `/brief/<week>` and the content families sit outside the loop, so the label
 * comes back for those. Callers render the label when this returns false.
 */
export const hasVisibleActiveNavLink = (pathname: string) =>
  resolveGlobalHeaderLoopLinks(pathname).some((link) => link.isActive);

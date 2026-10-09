import {
  contentSections,
  navigationGroupByKey,
  navigationGroups,
  navigationPages,
  pagesInGroup,
  utilityLinks,
  type NavigationGroup,
  type NavigationPage,
} from "./informationArchitecture";
import type { Route } from "./routeType";
import { pathMatchesLink } from "./pathMatching";

const fallbackLabel = "Page";

export const normalizePathname = (pathname: string) =>
  pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

const matchesPrefix = (prefix: string, pathname: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

// Longest first, so /history/compare wins over /history and /operate/financial
// over /operate. The brief matches only "/" itself (pathMatchesLink).
const pagesBySpecificity = [...navigationPages].sort((a, b) => b.href.length - a.href.length);

/** The grouped page a path is on, or under: the most specific match. */
export const findActivePage = (pathname: string): NavigationPage | undefined => {
  const normalizedPathname = normalizePathname(pathname);
  return pagesBySpecificity.find((page) => pathMatchesLink(page.href, normalizedPathname));
};

const memberPrefixesBySpecificity = navigationGroups
  .flatMap((group) => group.memberPrefixes.map((prefix) => ({ group, prefix })))
  .sort((a, b) => b.prefix.length - a.prefix.length);

/**
 * The group a path belongs to: its page's group, or the group that owns its
 * route family (the frozen weeks under Record, the answers under Guides).
 * Utility and legal routes belong to none.
 */
export const findActiveGroup = (pathname: string): NavigationGroup | undefined => {
  const page = findActivePage(pathname);
  if (page) return navigationGroupByKey[page.group];
  const normalizedPathname = normalizePathname(pathname);
  return memberPrefixesBySpecificity.find(({ prefix }) => matchesPrefix(prefix, normalizedPathname))?.group;
};

// Route families the IA names as content rather than as pages or utilities.
const resolveSectionRouteLabel = (pathname: string) =>
  [...contentSections]
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find(({ prefix }) => matchesPrefix(prefix, pathname))?.label ?? null;

const resolveUtilityRouteLabel = (pathname: string) =>
  utilityLinks.find((link) => pathMatchesLink(link.href, pathname))?.label ?? null;

/** The route's own name, for the sublabel under the wordmark. */
export const resolveGlobalHeaderRouteLabel = (pathname: string) => {
  const normalizedPathname = normalizePathname(pathname);
  return (
    findActivePage(normalizedPathname)?.label
    ?? resolveUtilityRouteLabel(normalizedPathname)
    ?? resolveSectionRouteLabel(normalizedPathname)
    ?? fallbackLabel
  );
};

export type GlobalHeaderNavigationLink = NavigationGroup & { isActive: boolean };

/** The four groups in header order, the one the path belongs to marked active. */
export const resolveGlobalHeaderNavigationLinks = (pathname: string): GlobalHeaderNavigationLink[] => {
  const activeKey = findActiveGroup(pathname)?.key;
  return navigationGroups.map((group) => ({ ...group, isActive: group.key === activeKey }));
};

/**
 * Whether the header's group tabs will visibly mark the current route.
 *
 * The header drops the route label beside the wordmark from `md` only where a
 * tab marks the route. Every grouped page and route family does; `/pricing`,
 * `/about`, `/share` and the legal pages sit outside the groups, so the label
 * comes back for those. Callers render the label when this returns false.
 */
export const hasVisibleActiveNavLink = (pathname: string) => Boolean(findActiveGroup(pathname));

type SectionTabLink = {
  href: Route;
  label: string;
  /** `tab` and `secondary` are the group's own pages; `cross` reaches a section of another group's page. */
  placement: NavigationPage["placement"] | "cross";
  isActive: boolean;
};

/**
 * The sub-tab row for the group a path is on: its pages in order, then its
 * cross-links. Null for a one-page group, or a path in no group.
 */
export const resolveSectionTabs = (pathname: string): { group: NavigationGroup; links: SectionTabLink[] } | null => {
  const group = findActiveGroup(pathname);
  if (!group) return null;
  const pages = pagesInGroup(group.key);
  if (pages.length < 2) return null;
  const activeKey = findActivePage(pathname)?.key;
  return {
    group,
    links: [
      ...pages.map((page): SectionTabLink => ({
        href: page.href,
        label: page.label,
        placement: page.placement,
        isActive: page.key === activeKey,
      })),
      ...group.crossLinks.map((link): SectionTabLink => ({ ...link, placement: "cross", isActive: false })),
    ],
  };
};

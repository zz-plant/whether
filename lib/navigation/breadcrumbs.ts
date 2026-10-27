import { findActiveGroup, findActivePage, normalizePathname } from "./globalHeader";
import { navigationLabelByPath } from "./informationArchitecture";
import type { Route } from "./routeType";

/** One crumb, with the address it names. Structured data needs every address; the visible trail drops the last. */
type BreadcrumbItem = {
  name: string;
  path: Route;
};

/**
 * The trail for a path, read from its group: the group, then the page when it is
 * not the group's hub, then any crumbs the caller names (an intermediate such as
 * "More tools", and the leaf — an answer, a week, a period).
 *
 * `/signals` reads "This week › Why it changed", `/operate/financial` "Decide ›
 * Runway planner", `/history/compare` "Record › Compare periods", an answer
 * "Guides › <question>". A hub on its own (`/operate`) gets Home first, so the
 * trail is never one crumb long. A path outside the groups starts at Home.
 *
 * The trails used to be hand-written per route — "Home › Evidence › …",
 * "Home › Resolve › Toolkits › …" — so a renamed tab left every breadcrumb under
 * it saying the old name.
 */
export const buildGroupBreadcrumbs = (
  path: Route,
  trailing: ReadonlyArray<{ name: string; path: Route }> = [],
): BreadcrumbItem[] => {
  const normalizedPath = normalizePathname(path);
  const group = findActiveGroup(normalizedPath);
  const page = findActivePage(normalizedPath);
  const home: BreadcrumbItem = { name: "Home", path: "/" };

  const head: BreadcrumbItem[] = group ? [{ name: group.label, path: group.href }] : [home];
  if (page && page.href !== group?.href) head.push({ name: page.label, path: page.href });
  const items = [...head, ...trailing];
  return items.length === 1 && items[0].path !== "/" ? [home, ...items] : items;
};

/** The same trail for `<Breadcrumbs>`: the current page last, unlinked. */
export const toVisibleBreadcrumbs = (items: readonly BreadcrumbItem[]): Array<{ label: string; href?: Route }> =>
  items.map((item, index) => (index === items.length - 1 ? { label: item.name } : { label: item.name, href: item.path }));

const toTitleCase = (value: string) =>
  value
    .replace(/[-_]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

/** A path's crumb name: the caller's, the IA page's, or the last segment title-cased. "/" is Home. */
export const getBreadcrumbLabel = (path: string, fallbackLabel?: string) => {
  if (fallbackLabel) return fallbackLabel;
  const normalizedPath = normalizePathname(path);
  if (normalizedPath === "/") return "Home";
  const label = navigationLabelByPath[normalizedPath];
  if (label) return label;
  const segments = normalizedPath.split("/").filter(Boolean);
  return segments.length ? toTitleCase(segments[segments.length - 1]) : "Home";
};

/**
 * An explicit trail, for the pages outside the four groups (About, Contact,
 * API & MCP) whose trail is Home and the page. A grouped page reads
 * its trail from `buildGroupBreadcrumbs`, so a renamed group renames it.
 */
export const createBreadcrumbTrail = (items: Array<{ path: string; label?: string }>) =>
  items.map((item) => ({ name: getBreadcrumbLabel(item.path, item.label), path: item.path }));

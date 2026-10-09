/*
 * Legacy spellings that still mark their renamed page active. Every one of them
 * is a permanent redirect (next.config.js), so a reader only ever renders under
 * one through a client-side transition the redirect has not caught yet.
 *
 * `/resolve` had an entry here, carrying `/answer` and the bare `/answers`. The
 * Resolve page folded into Decide and Guides on 2026-10-08: the bare paths
 * redirect, and `/answers/<slug>` belongs to Guides through its member prefixes
 * (informationArchitecture.ts), not through an alias.
 */
const ROUTE_ALIASES: Record<string, string[]> = {
  "/signals": ["/evidence"],
  "/operate": ["/planning"],
};

export const pathMatchesLink = (linkHref: string, currentPath: string) => {
  if (linkHref === "/") {
    return currentPath === "/";
  }

  const normalizedCurrent = currentPath.split("?")[0].split("#")[0];

  if (normalizedCurrent === linkHref || normalizedCurrent.startsWith(`${linkHref}/`)) {
    return true;
  }

  const aliases = ROUTE_ALIASES[linkHref];
  return aliases ? aliases.some((alias) => normalizedCurrent === alias || normalizedCurrent.startsWith(`${alias}/`)) : false;
};

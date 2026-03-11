export const redirectOnlySitemapPaths = [
  "/guides",
  "/solutions",
  "/learn/concepts",
  "/operate",
  "/templates",
  "/toolkit",
  "/operations/briefings",
  "/operations/decisions",
  "/library",
  "/library/canon",
  "/brief",
  "/brief/stage",
] as const;

const redirectOnlyPathSet = new Set<string>(redirectOnlySitemapPaths);

export const isRedirectOnlySitemapPath = (path: string): boolean => redirectOnlyPathSet.has(path);

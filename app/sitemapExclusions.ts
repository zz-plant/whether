export const retiredSitemapPaths = [
  "/guides",
  "/solutions",
  "/learn/concepts",
  "/start",
  "/onboarding",
  "/reference",
  "/formulas",
  "/evidence",
  "/operate",
  "/templates",
  "/toolkit",
  "/operations/briefings",
  "/operations/plan",
  "/operations/decisions",
  "/operations/data",
  "/operations/cli",
  "/operations/integrations",
  "/library",
  "/library/canon",
  "/library/failure-modes",
  "/brief",
  "/briefing",
  "/plan",
  "/brief/stage",
] as const;

const retiredPathSet = new Set<string>(retiredSitemapPaths);

export const isRetiredSitemapPath = (path: string): boolean => retiredPathSet.has(path);

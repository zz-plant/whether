import type { MetadataRoute } from "next";

export type SeoSitemapFamilyAudit = {
  family: string;
  totalUrls: number;
  decisionContractRequired: boolean;
  thinRiskUrls: number;
};

export type SeoSitemapAuditResult = {
  totalUrls: number;
  generatedAtIso: string;
  families: SeoSitemapFamilyAudit[];
};

const FAMILY_PREFIXES = [
  "/answers/",
  "/startup-macro-posture/",
  "/signals/",
  "/decide/",
  "/toolkits/",
  "/resources/",
] as const;

const DECISION_CONTRACT_REQUIRED = new Set<string>([
  "/answers/",
  "/startup-macro-posture/",
  "/signals/",
  "/decide/",
  "/toolkits/",
]);

export const resolveSitemapFamily = (urlPath: string): string => {
  const matchingPrefix = FAMILY_PREFIXES.find((prefix) => urlPath.startsWith(prefix));
  return matchingPrefix ?? "other";
};

export const buildSeoSitemapAudit = (
  indexableEntries: MetadataRoute.Sitemap,
  nonIndexableEntries: MetadataRoute.Sitemap,
  now: Date = new Date(),
): SeoSitemapAuditResult => {
  const nonIndexableSet = new Set(nonIndexableEntries.map((entry) => new URL(entry.url).pathname));

  const rows = new Map<string, SeoSitemapFamilyAudit>();
  for (const entry of indexableEntries) {
    const path = new URL(entry.url).pathname;
    const family = resolveSitemapFamily(path);
    const decisionContractRequired = DECISION_CONTRACT_REQUIRED.has(family);
    const current = rows.get(family) ?? {
      family,
      totalUrls: 0,
      decisionContractRequired,
      thinRiskUrls: 0,
    };

    current.totalUrls += 1;
    if (decisionContractRequired && nonIndexableSet.has(path)) {
      current.thinRiskUrls += 1;
    }

    rows.set(family, current);
  }

  const families = [...rows.values()].sort((a, b) => b.totalUrls - a.totalUrls || a.family.localeCompare(b.family));

  return {
    totalUrls: indexableEntries.length,
    generatedAtIso: now.toISOString(),
    families,
  };
};

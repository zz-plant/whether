import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/siteUrl";
import { snapshotData } from "../lib/snapshot";
import { resourcePillarPages } from "../lib/resourcesContent";
import { resourceArticles } from "../lib/resourceArticles";
import { tierOneDecisionPages } from "./answers/decisionPages";
import { signalScenarioRoutes } from "./seoRouteClusters";
import { evaluateSeoQualityGates } from "../lib/report/seoQualityGates";
import { isRetiredSitemapPath } from "./sitemapExclusions";
import { loadWeeklyBriefSnapshot } from "../lib/report/weeklyBriefSnapshot";
import { readProgrammaticPayload } from "../lib/seo/programmaticPayloadBuilder";
import {
  isIndexableAnswerSlug,
  isIndexableArchivePeriodSlug,
  isIndexableResourceArticleSlug,
  isIndexableResourcePillarSlug,
} from "../lib/seo/indexationPolicy";
import { buildPostureArchivePath, getPostureArchivePeriods } from "../lib/summary/postureArchive";
import { buildPublishedBriefPath, getPublishedBriefs } from "../lib/report/publishedBriefs";

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

type SitemapEntryDescriptor = {
  path: `/${string}` | "";
  changeFrequency: ChangeFrequency;
  priority: number;
  lastModified: Date;
};

const fallbackLastModified = new Date("2026-02-01T00:00:00.000Z");

const parseLastModified = (value: string): Date | null => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const resolveLastModified = (...candidates: string[]): Date => {
  for (const candidate of candidates) {
    const parsed = parseLastModified(candidate);
    if (parsed) return parsed;
  }
  return fallbackLastModified;
};

const staticContentLastModified = new Date("2026-02-01T00:00:00.000Z");

const buildEntry = ({
  path,
  changeFrequency,
  priority,
  lastModified,
}: SitemapEntryDescriptor): MetadataRoute.Sitemap[number] => ({
  url: `${siteUrl}${path}`,
  lastModified,
  changeFrequency,
  priority,
});

const isSignalScenarioIndexable = async (path: `/${string}`): Promise<boolean> => {
  try {
    const payloadRecord = await readProgrammaticPayload(path);
    const payload = payloadRecord.payload;

    if (payload.noindex || payload.degraded) {
      return false;
    }

    return !(payload.noindexReasons ?? []).some(
      (reason) => reason.startsWith("freshness-") || reason.includes("provenance"),
    );
  } catch {
    return false;
  }
};

const isProgrammaticSitemapEligible = async (): Promise<boolean> => {
  const { reportData, degraded, snapshot } = await loadWeeklyBriefSnapshot(undefined, { route: "/sitemap" });
  const homeBriefModel = snapshot.homeBriefModel;
  const primaryRule = homeBriefModel.decisionRules[0];

  return evaluateSeoQualityGates({
    pageKey: "sitemap-programmatic",
    currentCall: primaryRule?.recommendation,
    immediateAction: primaryRule?.doNow[0],
    triggerThreshold: primaryRule?.pauseTrigger,
    reversalCondition: primaryRule?.resumeTrigger,
    evidenceCount: reportData.reportEvidenceItems.length,
    evidenceTitles: reportData.reportEvidenceItems.map((item) => item.title),
    fetchedAtIso: reportData.treasury.fetched_at,
    isFallbackSnapshot: degraded,
    provenanceStatusLabel: reportData.treasuryProvenance?.statusLabel,
    provenanceLinks: [reportData.treasury.source, reportData.macroSeries[0]?.sourceUrl].filter((link): link is string => Boolean(link)),
    confidenceLabel: homeBriefModel.confidenceLabel,
    fallbackLabel: degraded ? "fallback" : "live",
    trustSummary: reportData.treasuryProvenance?.statusLabel,
    citationMeta: reportData.recordDateLabel,
    interpretationLabel: `${primaryRule?.recommendation ?? ""}|${primaryRule?.doNow[0] ?? ""}`,
  }).eligible;
};

export default async function sitemap(options?: { programmaticEligible?: boolean }): Promise<MetadataRoute.Sitemap> {
  const reportLastModified = resolveLastModified(snapshotData.record_date, snapshotData.fetched_at);
  const programmaticEligible = options?.programmaticEligible ?? (await isProgrammaticSitemapEligible());

  const coreEntries: SitemapEntryDescriptor[] = [
    { path: "", lastModified: reportLastModified, changeFrequency: "weekly", priority: 1 },
    { path: "/signals", lastModified: reportLastModified, changeFrequency: "weekly", priority: 0.9 },
    { path: "/resolve", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.82 },
    // Deep links, not destinations: the adoption plan's one-screen redraft ruled
    // that trust is an inline line on `/` with the formula reference kept as a
    // deep link, and compare is a disclosure under history. Both stay indexable;
    // neither is ranked like a hub.
    { path: "/trust", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.5 },
    { path: "/operate", lastModified: staticContentLastModified, changeFrequency: "weekly", priority: 0.84 },
    { path: "/terms-of-service", lastModified: staticContentLastModified, changeFrequency: "yearly", priority: 0.4 },
    { path: "/acceptable-use-policy", lastModified: staticContentLastModified, changeFrequency: "yearly", priority: 0.4 },
    { path: "/comps", lastModified: reportLastModified, changeFrequency: "weekly", priority: 0.75 },
    { path: "/api-docs", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.5 },
    { path: "/history", lastModified: staticContentLastModified, changeFrequency: "weekly", priority: 0.7 },
    { path: "/history/compare", lastModified: staticContentLastModified, changeFrequency: "weekly", priority: 0.4 },
    { path: "/pricing", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.55 },
    { path: "/about", lastModified: staticContentLastModified, changeFrequency: "yearly", priority: 0.5 },
    { path: "/contact", lastModified: staticContentLastModified, changeFrequency: "yearly", priority: 0.45 },
    { path: "/share", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.65 },
    { path: "/feed.xml", lastModified: reportLastModified, changeFrequency: "weekly", priority: 0.5 },
  ];

  const resourcePillarEntries: SitemapEntryDescriptor[] = resourcePillarPages
    .filter((page) => isIndexableResourcePillarSlug(page.slug))
    .map((page) => ({
    path: `/resources/${page.slug}`,
    lastModified: staticContentLastModified,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const resourceArticleEntries: SitemapEntryDescriptor[] = resourceArticles
    .filter((article) => isIndexableResourceArticleSlug(article.slug))
    .map((article) => ({
    path: `/resources/${article.slug}`,
    lastModified: staticContentLastModified,
    changeFrequency: "monthly",
    priority: 0.58,
    }));

  const vcAuthorityEntries: SitemapEntryDescriptor[] = [
    {
      path: "/resources/how-vc-firms-can-enforce-capital-discipline-across-portfolios",
      lastModified: staticContentLastModified,
      changeFrequency: "monthly",
      priority: 0.59,
    },
  ];

  const decisionAnswerEntries: SitemapEntryDescriptor[] = (programmaticEligible ? tierOneDecisionPages : [])
    .filter((page) => isIndexableAnswerSlug(page.slug))
    .map((page) => ({
      path: `/answers/${page.slug}`,
      lastModified: staticContentLastModified,
      changeFrequency: "weekly",
      priority: 0.58,
    }));

  // Published weeks are frozen dated articles. Like archive periods they carry no
  // freshness risk, so the live-payload gate does not apply to them.
  const publishedBriefEntries: SitemapEntryDescriptor[] = getPublishedBriefs().map((brief) => ({
    path: buildPublishedBriefPath(brief.slug),
    lastModified: resolveLastModified(brief.publishedAt),
    changeFrequency: "yearly",
    priority: 0.7,
  }));

  // Archive periods are closed records, so they are exempt from the programmatic
  // freshness gate that governs live-posture pages.
  const archivePeriodEntries: SitemapEntryDescriptor[] = getPostureArchivePeriods()
    .filter((period) => isIndexableArchivePeriodSlug(period.slug))
    .map((period) => ({
      path: buildPostureArchivePath(period.slug),
      lastModified: resolveLastModified(period.asOf),
      changeFrequency: "yearly",
      priority: period.kind === "year" ? 0.62 : 0.55,
    }));

  const signalScenarioEntryCandidates: Array<SitemapEntryDescriptor | null> = programmaticEligible
    ? await Promise.all(
      signalScenarioRoutes.map(async (clusterRoute) => {
        const path = `/signals/${clusterRoute.signalSlug}/${clusterRoute.decisionScenario}` as const;
        if (!(await isSignalScenarioIndexable(path))) {
          return null;
        }

        return {
          path,
          lastModified: reportLastModified,
          changeFrequency: "weekly" as const,
          priority: 0.68,
        };
      }),
    )
    : [];

  const signalsClusterEntries: SitemapEntryDescriptor[] = signalScenarioEntryCandidates.filter(
    (entry): entry is SitemapEntryDescriptor => entry !== null,
  );

  return [
    ...coreEntries,
    ...resourcePillarEntries,
    ...resourceArticleEntries,
    ...vcAuthorityEntries,
    ...decisionAnswerEntries,
    ...signalsClusterEntries,
    ...archivePeriodEntries,
    ...publishedBriefEntries,
  ]
    .filter((entry) => !isRetiredSitemapPath(entry.path))
    .map(buildEntry);
}

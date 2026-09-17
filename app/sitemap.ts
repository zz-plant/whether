import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/siteUrl";
import { snapshotData } from "../lib/snapshot";
import { resourcePillarPages } from "../lib/resourcesContent";
import { resourceArticles } from "../lib/resourceArticles";
import { buildResourceHubEntries } from "../lib/resourceHub";
import { tierOneDecisionPages } from "./answers/decisionPages";
import { signalScenarioRoutes } from "./seoRouteClusters";
import { evaluateSeoQualityGates } from "../lib/report/seoQualityGates";
import { isRetiredSitemapPath } from "./sitemapExclusions";
import { loadWeeklyBriefSnapshot } from "../lib/report/weeklyBriefSnapshot";
import { readProgrammaticPayload } from "../lib/seo/programmaticPayloadBuilder";
import { isStaleForIndexing, shouldNoindexPayload } from "../lib/seo/freshnessIndexation";
import { signalsClusterStaticParams } from "./signals/clusterRoutes";
import { workstreamSlugs } from "./operate/workstreams";
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

/* The same predicate the scenario page applies to its own robots tag. */
const isSignalScenarioIndexable = async (path: `/${string}`): Promise<boolean> => {
  try {
    return !shouldNoindexPayload((await readProgrammaticPayload(path)).payload);
  } catch {
    return false;
  }
};

/**
 * Both freshness questions this file asks, from one read.
 *
 * `programmaticEligible` governs the answer and scenario URLs; `watchHubsFresh`
 * governs the three signal watch hubs, on the rule their own pages apply. They
 * were two separate report loads, which on a build container — where the
 * upstreams are reachable and a read can trigger an ingest — meant doing that
 * work twice to answer one question about one snapshot.
 */
const resolveSitemapReadiness = async (): Promise<{ programmaticEligible: boolean; watchHubsFresh: boolean }> => {
  const { reportData, degraded, snapshot } = await loadWeeklyBriefSnapshot(undefined, { route: "/sitemap" });
  const homeBriefModel = snapshot.homeBriefModel;
  const primaryRule = homeBriefModel.decisionRules[0];

  /*
   * The same call `app/signals/[cluster]/page.tsx` makes for its own robots
   * tag. Submitting these on the programmatic gate alone would list three URLs
   * whose pages render `noindex`: that gate treats only a fallback snapshot as
   * degraded, while the page also withholds a read that is not `treasury.isLive`.
   */
  const watchHubsFresh = !isStaleForIndexing({
    fetchedAtIso: reportData.treasury.fetched_at,
    isFallbackSnapshot: degraded || !reportData.treasury.isLive,
  });

  const programmaticEligible = evaluateSeoQualityGates({
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

  return { programmaticEligible, watchHubsFresh };
};

export default async function sitemap(options?: { programmaticEligible?: boolean }): Promise<MetadataRoute.Sitemap> {
  const reportLastModified = resolveLastModified(snapshotData.record_date, snapshotData.fetched_at);
  /* One read for both questions; the override skips it, as it always has. */
  const readiness = options?.programmaticEligible === undefined
    ? await resolveSitemapReadiness()
    : { programmaticEligible: options.programmaticEligible, watchHubsFresh: options.programmaticEligible };
  const { programmaticEligible } = readiness;

  const coreEntries: SitemapEntryDescriptor[] = [
    { path: "", lastModified: reportLastModified, changeFrequency: "weekly", priority: 1 },
    { path: "/signals", lastModified: reportLastModified, changeFrequency: "weekly", priority: 0.9 },
    { path: "/resolve", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.82 },
    // Deep links, not destinations: the adoption plan's one-screen redraft ruled
    // that trust is an inline line on `/` with the formula reference kept as a
    // deep link, and compare is a disclosure under history. Both stay indexable;
    // neither is ranked like a hub.
    { path: "/trust", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.5 },
    { path: "/glossary", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.5 },
    { path: "/operate", lastModified: staticContentLastModified, changeFrequency: "weekly", priority: 0.84 },
    // The two workstreams are indexable pages with their own metadata; they
    // were submitted nowhere because the page file kept its route map private.
    ...workstreamSlugs.map((slug): SitemapEntryDescriptor => ({
      path: `/operate/${slug}`,
      lastModified: reportLastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    })),
    { path: "/resources", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.6 },
    { path: "/privacy", lastModified: staticContentLastModified, changeFrequency: "yearly", priority: 0.4 },
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

  /*
   * From the hub's list, not a second copy. This page is neither a
   * `resourcePillarPage` nor a `resourceArticle`, so it was declared once here
   * and once in `lib/resourceHub.ts`; renaming it required editing both files
   * and nothing failed if only one was.
   */
  const vcAuthorityEntries: SitemapEntryDescriptor[] = buildResourceHubEntries()
    .filter((entry) => entry.kind === "standalone")
    .map((entry) => ({
      path: entry.href,
      lastModified: staticContentLastModified,
      changeFrequency: "monthly",
      priority: 0.59,
    }));

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
  // freshness gate that governs live-posture pages. They are also 82 of the
  // ~130 URLs here, so they sit below every hub and live page: a quarter at
  // 0.55 outranked the two operate workstreams and the resource guides.
  const archivePeriodEntries: SitemapEntryDescriptor[] = getPostureArchivePeriods()
    .filter((period) => isIndexableArchivePeriodSlug(period.slug))
    .map((period) => ({
      path: buildPostureArchivePath(period.slug),
      lastModified: resolveLastModified(period.asOf),
      changeFrequency: "yearly",
      priority: period.kind === "year" ? 0.55 : 0.4,
    }));

  /*
   * The three signal watch hubs. They were in no sitemap and linked from no
   * hub, so the 15 scenario URLs hung off parents a crawler never saw — and
   * they are submitted only while their reading is fresh enough for their own
   * pages to be indexable (`resolveSitemapReadiness`).
   */
  const signalWatchEntries: SitemapEntryDescriptor[] = programmaticEligible && readiness.watchHubsFresh
    ? signalsClusterStaticParams.map(({ cluster }): SitemapEntryDescriptor => ({
        path: `/signals/${cluster}`,
        lastModified: reportLastModified,
        changeFrequency: "weekly",
        priority: 0.72,
      }))
    : [];

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
    ...signalWatchEntries,
    ...signalsClusterEntries,
    ...archivePeriodEntries,
    ...publishedBriefEntries,
  ]
    .filter((entry) => !isRetiredSitemapPath(entry.path))
    .map(buildEntry);
}

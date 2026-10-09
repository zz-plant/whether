import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/siteUrl";
import { snapshotData } from "../lib/snapshot";
import { resourcePillarPages } from "../lib/resourcesContent";
import { resourceArticles } from "../lib/resourceArticles";
import { buildResourceHubEntries } from "../lib/resourceHub";
import { answerPages } from "./answers/decisionPages";
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
  /** Null when nothing tracks when the page's content last changed; see below. */
  lastModified: Date | null;
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

/*
 * No `lastmod` for a page nothing dates. This was one constant, 2026-02-01,
 * submitted for fifteen pages — twelve of which did not exist yet on that date
 * (/privacy was written 2026-09-17, /pricing 2026-08-28) — and for five that
 * change every week (/history, /operate, /history/compare and the answer pages)
 * beside `changefreq: weekly`. Google reads `lastmod` only from a sitemap whose
 * dates it finds consistently accurate, so a wrong date on a static page costs
 * the weekly pages the signal they actually need. An omitted `lastmod` makes no
 * claim; a page that has a real date — the live read, a published week, an
 * archive period, a resource's `updatedAt` — carries it.
 */
const staticContentLastModified = null;

const buildEntry = ({
  path,
  changeFrequency,
  priority,
  lastModified,
}: SitemapEntryDescriptor): MetadataRoute.Sitemap[number] => ({
  url: `${siteUrl}${path}`,
  ...(lastModified ? { lastModified } : {}),
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
/**
 * The live read's own dates, for `lastmod`.
 *
 * `reportLastModified` used to come from `snapshotData` — the *bundled fallback*
 * in `data/snapshot_fallback.json`, whose record date is whenever that file was
 * last regenerated. On 2026-09-17 it said 2026-06-17, so `/` and `/signals`
 * submitted `changefreq: weekly` beside a `lastmod` thirteen weeks old, on the
 * two pages whose whole premise is that they are current. A crawler reconciling
 * "claims weekly, unchanged for a quarter" concludes the claim is false.
 *
 * The homepage's JSON-LD already got this right and carries a comment saying so
 * (`HomeBriefStructuredDataInput`); the sitemap never got the same fix, and this
 * function was already loading the live snapshot for the readiness gates below.
 * The bundled dates stay as the fallback, which is what they are.
 */
const resolveSitemapReadiness = async (): Promise<{
  programmaticEligible: boolean;
  watchHubsFresh: boolean;
  reportLastModified: Date;
}> => {
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

  const liveReportLastModified = resolveLastModified(
    reportData.treasury.record_date,
    reportData.treasury.fetched_at,
    snapshotData.record_date,
    snapshotData.fetched_at,
  );

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

  return { programmaticEligible, watchHubsFresh, reportLastModified: liveReportLastModified };
};

export default async function sitemap(options?: { programmaticEligible?: boolean }): Promise<MetadataRoute.Sitemap> {
  /* One read for three questions now; the override skips it, as it always has,
     and falls back to the bundled dates because it has no live read to offer. */
  const readiness = options?.programmaticEligible === undefined
    ? await resolveSitemapReadiness()
    : {
        programmaticEligible: options.programmaticEligible,
        watchHubsFresh: options.programmaticEligible,
        reportLastModified: resolveLastModified(snapshotData.record_date, snapshotData.fetched_at),
      };
  const { programmaticEligible, reportLastModified } = readiness;

  /* /history lists every published week and every archive period, so it
     changes when either gains an entry. */
  const historyLastModified = [
    ...getPublishedBriefs().map((brief) => parseLastModified(brief.publishedAt)),
    ...getPostureArchivePeriods().map((period) => parseLastModified(period.asOf)),
  ].reduce<Date | null>((latest, date) => (date && (!latest || date > latest) ? date : latest), null);

  const coreEntries: SitemapEntryDescriptor[] = [
    { path: "", lastModified: reportLastModified, changeFrequency: "weekly", priority: 1 },
    { path: "/signals", lastModified: reportLastModified, changeFrequency: "weekly", priority: 0.9 },
    // Deep links, not destinations: the adoption plan's one-screen redraft ruled
    // that trust is an inline line on `/` with the formula reference kept as a
    // deep link, and compare is a disclosure under history. Both stay indexable;
    // neither is ranked like a hub.
    { path: "/trust", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.5 },
    /* Derived from the bundled archive at module load, so the monthly refresh
       moves it — it takes the report's date, not the static one. */
    { path: "/calibration", lastModified: reportLastModified, changeFrequency: "monthly", priority: 0.6 },
    { path: "/operate", lastModified: reportLastModified, changeFrequency: "weekly", priority: 0.84 },
    // The two workstreams are indexable pages with their own metadata; they
    // were submitted nowhere because the page file kept its route map private.
    ...workstreamSlugs.map((slug): SitemapEntryDescriptor => ({
      path: `/operate/${slug}`,
      lastModified: reportLastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    })),
    /* Guides, one of the four header groups since 2026-10-08. It took /resolve's
       place (a redirect now) and its direct answers, each stamped with this
       week's standing, so it moves with the read and ranks like a hub. */
    { path: "/resources", lastModified: reportLastModified, changeFrequency: "weekly", priority: 0.82 },
    { path: "/privacy", lastModified: staticContentLastModified, changeFrequency: "yearly", priority: 0.4 },
    { path: "/terms-of-service", lastModified: staticContentLastModified, changeFrequency: "yearly", priority: 0.4 },
    { path: "/acceptable-use-policy", lastModified: staticContentLastModified, changeFrequency: "yearly", priority: 0.4 },
    { path: "/comps", lastModified: reportLastModified, changeFrequency: "weekly", priority: 0.75 },
    { path: "/api-docs", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.5 },
    { path: "/history", lastModified: historyLastModified, changeFrequency: "weekly", priority: 0.7 },
    { path: "/concepts", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.5 },
    { path: "/history/compare", lastModified: historyLastModified, changeFrequency: "weekly", priority: 0.4 },
    { path: "/pricing", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.55 },
    { path: "/about", lastModified: staticContentLastModified, changeFrequency: "yearly", priority: 0.5 },
    { path: "/contact", lastModified: staticContentLastModified, changeFrequency: "yearly", priority: 0.45 },
    { path: "/share", lastModified: staticContentLastModified, changeFrequency: "monthly", priority: 0.65 },
  ];

  const resourcePillarEntries: SitemapEntryDescriptor[] = resourcePillarPages
    .filter((page) => isIndexableResourcePillarSlug(page.slug))
    .map((page) => ({
    path: `/resources/${page.slug}`,
    lastModified: resolveLastModified(page.updatedAt),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const resourceArticleEntries: SitemapEntryDescriptor[] = resourceArticles
    .filter((article) => isIndexableResourceArticleSlug(article.slug))
    .map((article) => ({
    path: `/resources/${article.slug}`,
    lastModified: resolveLastModified(article.updatedAt),
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

  const decisionAnswerEntries: SitemapEntryDescriptor[] = (programmaticEligible ? answerPages : [])
    .filter((page) => isIndexableAnswerSlug(page.slug))
    .map((page) => ({
      path: `/answers/${page.slug}`,
      // Each answer states this week's call, so it moves with the read.
      lastModified: reportLastModified,
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

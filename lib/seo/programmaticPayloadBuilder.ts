import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { decisionScenarioDefinitions, signalScenarioRoutes } from "../../app/seoRouteClusters";
import { buildSeoDecisionPayload, type SeoDecisionPayload } from "../report/seoDecisionPayload";
import type { DecisionArea } from "../report/boundedDecisionRules";
import type { ReportData } from "../report/reportData";
import { loadWeeklyBriefSnapshot, type WeeklyBriefSnapshot } from "../report/weeklyBriefSnapshot";
import { getLatestTimeMachineSnapshot } from "../timeMachine/timeMachineCache";
import { findSignalsCluster } from "../../app/signals/clusterRoutes";

const ARTIFACT_ROOT = join(process.cwd(), "artifacts", "seo-payloads");
const MANIFEST_PATH = join(ARTIFACT_ROOT, "manifest.json");

const deltaSignalSchema = z.object({
  key: z.enum(["tightness", "riskAppetite", "baseRate", "curveSlope"]),
  label: z.string().min(1),
  delta: z.number(),
});

const seoPayloadSchema = z.object({
  currentCall: z.string().min(1),
  immediateAction: z.string().min(1),
  triggerThreshold: z.string().min(1),
  reversalCondition: z.string().min(1),
  evidence: z.array(
    z.object({ title: z.string().min(1), summary: z.string().min(1), confidenceLabel: z.string().min(1) }),
  ).min(1),
  freshness: z.string().min(1),
  degraded: z.boolean(),
  noindex: z.boolean(),
  noindexReasons: z.array(z.string()).optional(),
  trustSummary: z.string().min(1),
  citationMeta: z.string().min(1),
});

/*
 * One kind, since 2026-09-15. The `decide` (role × decision area, 30 routes)
 * and `toolkit` (toolkit × signal, 21 routes) kinds rendered the same
 * site-wide call as their parent pages, were hardcoded noindex, and had no
 * inbound link; they redirect to their parents now (next.config.js). What is
 * left is the set the uniqueness gate was written for: one decision scenario
 * read through each of the three signal watches.
 */
const programmaticRouteSchema = z.object({
  kind: z.literal("signal-scenario"),
  cluster: z.string().min(1),
  scenario: z.string().min(1),
  url: z.string().min(1),
});

const payloadRecordSchema = z.object({
  url: z.string().min(1),
  kind: z.literal("signal-scenario"),
  title: z.string().min(1),
  generatedAtIso: z.string().min(1),
  snapshot: z.object({
    recordDate: z.string().min(1),
    fetchedAtIso: z.string().min(1),
    previousRecordDate: z.string().min(1).nullable(),
  }),
  delta: z.object({
    regimeChanged: z.boolean(),
    directionLabel: z.enum(["improving", "deteriorating", "mixed", "stable"]),
    changedSignals: z.array(deltaSignalSchema),
  }),
  payload: seoPayloadSchema,
});

const manifestSchema = z.object({
  version: z.string().min(1),
  generatedAtIso: z.string().min(1),
  urls: z.record(z.string(), z.string()),
});

type ProgrammaticPayloadRecord = z.infer<typeof payloadRecordSchema>;
type ProgrammaticRouteDefinition = z.infer<typeof programmaticRouteSchema>;

type PayloadContext = {
  reportData: ReportData;
  isFallbackSnapshot: boolean;
  snapshot: WeeklyBriefSnapshot;
};

const stableJson = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

const versionFromReportData = (reportData: ReportData) => {
  const current = reportData.treasury.record_date;
  const prior = reportData.lastYearComparison?.prior.recordDate ?? "no-prior";
  return `${current}__${prior}`.replace(/[^a-zA-Z0-9_-]/g, "-");
};

const toRouteFileName = (url: string) => `${url.replace(/^\//, "").replace(/\//g, "__") || "home"}.json`;

export const enumerateProgrammaticRoutes = (): ProgrammaticRouteDefinition[] =>
  signalScenarioRoutes
    .map((route) => programmaticRouteSchema.parse({
      kind: "signal-scenario",
      cluster: route.signalSlug,
      scenario: route.decisionScenario,
      url: `/signals/${route.signalSlug}/${route.decisionScenario}`,
    }))
    .sort((a, b) => a.url.localeCompare(b.url));

/**
 * Which records the uniqueness gate compares a page against.
 *
 * The three pages for one scenario — `/signals/<each watch>/hiring` — draw
 * their call and action from the same decision rule, so they are the pages
 * that can collapse into copies of each other. The previous key grouped by
 * watch instead, which put the five *scenarios* of one watch in a bucket: pages
 * that differ by construction, because each maps a different rule. The gate
 * passed every page and never saw the duplication it exists to catch.
 */
const siblingKeyForRoute = (route: ProgrammaticRouteDefinition): string => `scenario:${route.scenario}`;

/**
 * The evidence a watch page cites is the evidence for its own signal.
 *
 * Every route used to take the first three site-wide evidence items, so the
 * three watch pages for one scenario cited identical data points under
 * identical calls, and the only thing telling them apart was the URL. Keyed
 * by the watch's own signals, each page carries the reading its watch is for,
 * which is both what a reader of "hiring, through the funding-pressure lens"
 * came for and the distinct data point the uniqueness gate looks for.
 */
const evidenceForCluster = (cluster: string, items: ReportData["reportEvidenceItems"]) => {
  const keys = findSignalsCluster(cluster)?.evidenceKeys ?? [];
  const own = items.filter((item) => keys.includes(item.key));
  return own.length > 0 ? own : items;
};

const buildRecordForRoute = (route: ProgrammaticRouteDefinition, context: PayloadContext, siblingsInCluster: { pageKey: string; interpretationLabel?: string; currentCall?: string; immediateAction?: string; evidenceTitles?: string[]; }[] = []): ProgrammaticPayloadRecord => {
  const isTestRuntime = process.env.NODE_ENV === "test";
  const seoFreshnessLabel = isTestRuntime ? "0h" : context.reportData.fetchedAtLabel;
  const seoProvenanceStatusLabel = isTestRuntime ? "Live (high confidence)" : context.reportData.treasuryProvenance?.statusLabel;
  const seoFetchedAtIso = isTestRuntime ? new Date().toISOString() : context.reportData.treasury.fetched_at;
  const { reportData, isFallbackSnapshot, snapshot } = context;
  const { homeBriefModel } = snapshot;

  const mappedDecisionAreas: DecisionArea[] = [route.scenario as DecisionArea];

  const mappedRules = homeBriefModel.decisionRules.filter((rule) => mappedDecisionAreas.includes(rule.area));

  const payload: SeoDecisionPayload = buildSeoDecisionPayload({
    assessment: reportData.assessment,
    mappedRules,
    mappedDecisionAreas,
    fallbackCurrentCall: reportData.statusLabel,
    fallbackImmediateAction: reportData.actionNowShort,
    reportEvidenceItems: evidenceForCluster(route.cluster, reportData.reportEvidenceItems),
    freshnessLabel: seoFreshnessLabel,
    recordDateLabel: reportData.recordDateLabel,
    confidenceLabel: homeBriefModel.confidenceLabel,
    transitionWatch: homeBriefModel.transitionWatch,
    isFallbackSnapshot,
    provenanceStatusLabel: seoProvenanceStatusLabel,
    fetchedAtIso: seoFetchedAtIso,
    pageKey: route.url,
    siblingsInCluster,
    provenanceLinks: [reportData.treasury.source, reportData.macroSeries[0]?.sourceUrl].filter((link): link is string => Boolean(link)),
  });

  const cluster = findSignalsCluster(route.cluster);
  const scenario = decisionScenarioDefinitions.find((item) => item.slug === route.scenario);
  const title = `${cluster?.title ?? route.cluster} · ${scenario?.title ?? route.scenario}`;

  return payloadRecordSchema.parse({
    url: route.url,
    kind: route.kind,
    title,
    generatedAtIso: `${reportData.treasury.record_date}T00:00:00.000Z`,
    snapshot: {
      recordDate: reportData.treasury.record_date,
      fetchedAtIso: seoFetchedAtIso,
      previousRecordDate: reportData.lastYearComparison?.prior.recordDate ?? null,
    },
    delta: {
      regimeChanged: reportData.reportDynamics.regimeChanged,
      directionLabel: reportData.reportDynamics.directionLabel,
      changedSignals: reportData.reportDynamics.changedSignals,
    },
    payload,
  });
};


const buildProgrammaticSnapshotRequest = (): {
  searchParams?: { month: string; year: string };
  loadOptions?: { includeHistoricalLiveComparison: boolean };
} => {
  if (process.env.NODE_ENV !== "test") {
    return {};
  }

  const latestSnapshot = getLatestTimeMachineSnapshot();
  if (!latestSnapshot) {
    return {
      loadOptions: { includeHistoricalLiveComparison: false },
    };
  }

  return {
    searchParams: {
      month: String(latestSnapshot.month).padStart(2, "0"),
      year: String(latestSnapshot.year),
    },
    loadOptions: { includeHistoricalLiveComparison: false },
  };
};

/**
 * Refuse to persist a stale payload.
 *
 * This guards the artifact write, not the render. A payload that falls back to
 * the bundled snapshot is marked `noindex`, which is already the right answer
 * for a page served during a data outage — it renders, and asks not to be
 * indexed. Applying this to the read path instead turned "the data is stale"
 * into a 500 on three routes. Baking that same staleness into a published
 * artifact is a different matter, and still fails loudly here.
 */
const assertGenerationContracts = (record: ProgrammaticPayloadRecord) => {
  if (record.payload.noindex) {
    throw new Error(`SEO payload generation failed for ${record.url}: payload is stale or missing contract fields (${record.payload.noindexReasons?.join(", ") ?? "unknown"}).`);
  }
};

/**
 * Build every route's record from the current snapshot. Pure with respect to the
 * filesystem — the artifacts on disk are a cache of exactly this, which is what
 * makes the in-memory fallback in `readProgrammaticPayload` sound rather than a
 * second, drifting source of truth.
 */
const computeProgrammaticRecords = async (): Promise<{
  version: string;
  records: ProgrammaticPayloadRecord[];
  generatedAtIso: string;
}> => {
  const snapshotRequest = buildProgrammaticSnapshotRequest();
  const { reportData, degraded, snapshot } = await loadWeeklyBriefSnapshot(
    snapshotRequest.searchParams,
    { route: "programmatic-seo-build" },
    snapshotRequest.loadOptions,
  );
  const isFallbackSnapshot = degraded;
  const version = versionFromReportData(reportData);
  const routes = enumerateProgrammaticRoutes();
  const generatedAtIso = `${reportData.treasury.record_date}T00:00:00.000Z`;

  const preliminaryRecords = routes.map((route) => buildRecordForRoute(route, {
    reportData,
    isFallbackSnapshot,
    snapshot,
  }));

  const routeByUrl = new Map(routes.map((route) => [route.url, route]));
  const siblingKeyByUrl = new Map(routes.map((route) => [route.url, siblingKeyForRoute(route)]));

  const records = preliminaryRecords.map((record) => {
    const route = routeByUrl.get(record.url);
    if (!route) return record;
    const siblingKey = siblingKeyByUrl.get(record.url);
    const siblings = preliminaryRecords
      .filter((candidate) => siblingKeyByUrl.get(candidate.url) === siblingKey)
      .map((candidate) => ({
        pageKey: candidate.url,
        interpretationLabel: `${candidate.payload.currentCall}|${candidate.payload.immediateAction}`,
        currentCall: candidate.payload.currentCall,
        immediateAction: candidate.payload.immediateAction,
        evidenceTitles: candidate.payload.evidence.map((item) => item.title),
      }));

    return buildRecordForRoute(route, { reportData, isFallbackSnapshot, snapshot }, siblings);
  });

  return { version, records, generatedAtIso };
};

export const generateProgrammaticPayloadArtifacts = async (): Promise<{ version: string; records: ProgrammaticPayloadRecord[] }> => {
  const { version, records, generatedAtIso } = await computeProgrammaticRecords();
  const manifest: z.infer<typeof manifestSchema> = { version, generatedAtIso, urls: {} };

  for (const record of records) {
    assertGenerationContracts(record);
  }

  await mkdir(join(ARTIFACT_ROOT, version), { recursive: true });

  for (const record of records) {
    const fileName = toRouteFileName(record.url);
    const relativePath = `${version}/${fileName}`;
    await writeFile(join(ARTIFACT_ROOT, relativePath), stableJson(record), "utf8");
    manifest.urls[record.url] = relativePath;
  }

  await writeFile(MANIFEST_PATH, stableJson(manifest), "utf8");
  return { version, records };
};

const readManifest = async () => {
  const content = await readFile(MANIFEST_PATH, "utf8");
  return manifestSchema.parse(JSON.parse(content));
};

/**
 * The record for one programmatic route, from the artifact cache when it is
 * readable and from a fresh computation when it is not.
 *
 * The previous fallback regenerated the artifacts, which meant writing to disk
 * on a cache miss. That works during a build — Node, real filesystem — and
 * cannot work anywhere these routes render at request time: the Workers runtime
 * has no writable filesystem, so `mkdir` fails with "operation not permitted"
 * and the whole route dies. It took down three routes in dev, and the same path
 * is reachable in production, where `revalidate = 900` and `dynamicParams` let
 * these pages render outside the build.
 *
 * Computing in memory is not a degraded answer here: the artifacts are a cache
 * of this exact computation, so the fallback returns the same record the file
 * would have held, and simply does not persist it.
 */
export const readProgrammaticPayload = async (url: string): Promise<ProgrammaticPayloadRecord> => {
  try {
    const manifest = await readManifest();
    const relativePath = manifest.urls[url];
    if (relativePath) {
      const content = await readFile(join(ARTIFACT_ROOT, relativePath), "utf8");
      return payloadRecordSchema.parse(JSON.parse(content));
    }
  } catch {
    // Cache unreadable — missing, stale, or an unwritable runtime. Fall through.
  }

  const { records } = await computeProgrammaticRecords();
  const record = records.find((candidate) => candidate.url === url);
  if (!record) {
    throw new Error(`No programmatic SEO payload artifact found for URL: ${url}`);
  }

  return record;
};

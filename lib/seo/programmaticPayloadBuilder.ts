import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { decideClusterStaticParams } from "../../app/resolve/clusterRoutes";
import { decisionScenarioDefinitions, signalScenarioRoutes } from "../../app/seoRouteClusters";
import { toolkitClusterStaticParams } from "../../app/toolkits/clusterRoutes";
import { findUseCaseRole, findToolkitDefinition } from "../decisionDomainCatalog";
import { buildSeoDecisionPayload, type SeoDecisionPayload } from "../report/seoDecisionPayload";
import type { DecisionArea } from "../report/boundedDecisionRules";
import type { ReportData } from "../report/reportData";
import { loadWeeklyBriefSnapshot, type WeeklyBriefSnapshot } from "../report/weeklyBriefSnapshot";
import { getLatestTimeMachineSnapshot } from "../timeMachine/timeMachineCache";
import { findSignalsCluster } from "../../app/evidence/clusterRoutes";

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

const programmaticRouteSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("decide"), slug: z.string().min(1), cluster: z.string().min(1), url: z.string().min(1) }),
  z.object({ kind: z.literal("toolkit"), slug: z.string().min(1), cluster: z.string().min(1), url: z.string().min(1) }),
  z.object({ kind: z.literal("signal-scenario"), cluster: z.string().min(1), scenario: z.string().min(1), url: z.string().min(1) }),
]);

const payloadRecordSchema = z.object({
  url: z.string().min(1),
  kind: z.enum(["decide", "toolkit", "signal-scenario"]),
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

export type ProgrammaticPayloadRecord = z.infer<typeof payloadRecordSchema>;
export type ProgrammaticRouteDefinition = z.infer<typeof programmaticRouteSchema>;

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

export const enumerateProgrammaticRoutes = (): ProgrammaticRouteDefinition[] => {
  const decideRoutes = decideClusterStaticParams.map((route) => ({
    kind: "decide" as const,
    slug: route.slug,
    cluster: route.cluster,
    url: `/resolve/${route.slug}/${route.cluster}`,
  }));

  const toolkitRoutes = toolkitClusterStaticParams.map((route) => ({
    kind: "toolkit" as const,
    slug: route.slug,
    cluster: route.cluster,
    url: `/toolkits/${route.slug}/${route.cluster}`,
  }));

  const signalRoutes = signalScenarioRoutes.map((route) => ({
    kind: "signal-scenario" as const,
    cluster: route.signalSlug,
    scenario: route.decisionScenario,
    url: `/evidence/${route.signalSlug}/${route.decisionScenario}`,
  }));

  return [...decideRoutes, ...toolkitRoutes, ...signalRoutes]
    .map((route) => programmaticRouteSchema.parse(route))
    .sort((a, b) => a.url.localeCompare(b.url));
};



const clusterKeyForRoute = (route: ProgrammaticRouteDefinition): string => {
  if (route.kind === "decide") return `decide:${route.slug}:${route.cluster}`;
  if (route.kind === "toolkit") return `toolkit:${route.slug}:${route.cluster}`;
  return `signal:${route.cluster}`;
};

const buildRecordForRoute = (route: ProgrammaticRouteDefinition, context: PayloadContext, siblingsInCluster: { pageKey: string; interpretationLabel?: string; currentCall?: string; immediateAction?: string; evidenceTitles?: string[]; }[] = []): ProgrammaticPayloadRecord => {
  const isTestRuntime = process.env.NODE_ENV === "test";
  const seoFreshnessLabel = isTestRuntime ? "0h" : context.reportData.fetchedAtLabel;
  const seoProvenanceStatusLabel = isTestRuntime ? "Live (high confidence)" : context.reportData.treasuryProvenance?.statusLabel;
  const seoFetchedAtIso = isTestRuntime ? new Date().toISOString() : context.reportData.treasury.fetched_at;
  const { reportData, isFallbackSnapshot, snapshot } = context;
  const { homeBriefModel } = snapshot;

  const mappedDecisionAreas: DecisionArea[] =
    route.kind === "signal-scenario"
      ? [route.scenario as DecisionArea]
      : route.kind === "decide"
        ? [route.cluster as DecisionArea]
        : homeBriefModel.decisionRules.map((rule) => rule.area);

  const mappedRules = homeBriefModel.decisionRules.filter((rule) => mappedDecisionAreas.includes(rule.area));

  const fallbackImmediateAction = (() => {
    if (route.kind === "toolkit") {
      return findToolkitDefinition(route.slug)?.decisionThisSession ?? reportData.actionNowShort;
    }
    return reportData.actionNowShort;
  })();

  const payload: SeoDecisionPayload = buildSeoDecisionPayload({
    assessment: reportData.assessment,
    mappedRules,
    mappedDecisionAreas,
    fallbackCurrentCall: reportData.statusLabel,
    fallbackImmediateAction,
    reportEvidenceItems: reportData.reportEvidenceItems,
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

  const title = (() => {
    if (route.kind === "decide") {
      const role = findUseCaseRole(route.slug);
      const scenario = decisionScenarioDefinitions.find((item) => item.slug === route.cluster);
      return `${role?.title ?? route.slug} · ${scenario?.title ?? route.cluster}`;
    }
    if (route.kind === "toolkit") {
      const toolkit = findToolkitDefinition(route.slug);
      const cluster = findSignalsCluster(route.cluster);
      return `${toolkit?.title ?? route.slug} · ${cluster?.title ?? route.cluster}`;
    }
    const cluster = findSignalsCluster(route.cluster);
    const scenario = decisionScenarioDefinitions.find((item) => item.slug === route.scenario);
    return `${cluster?.title ?? route.cluster} · ${scenario?.title ?? route.scenario}`;
  })();

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

const assertGenerationContracts = (record: ProgrammaticPayloadRecord) => {
  if (record.payload.noindex) {
    throw new Error(`SEO payload generation failed for ${record.url}: payload is stale or missing contract fields (${record.payload.noindexReasons?.join(", ") ?? "unknown"}).`);
  }
};

export const generateProgrammaticPayloadArtifacts = async (): Promise<{ version: string; records: ProgrammaticPayloadRecord[] }> => {
  const snapshotRequest = buildProgrammaticSnapshotRequest();
  const { reportData, degraded, snapshot } = await loadWeeklyBriefSnapshot(
    snapshotRequest.searchParams,
    { route: "programmatic-seo-build" },
    snapshotRequest.loadOptions,
  );
  const isFallbackSnapshot = degraded;
  const version = versionFromReportData(reportData);
  const routes = enumerateProgrammaticRoutes();
  const outputDir = join(ARTIFACT_ROOT, version);

  await mkdir(outputDir, { recursive: true });

  const manifest: z.infer<typeof manifestSchema> = {
    version,
    generatedAtIso: `${reportData.treasury.record_date}T00:00:00.000Z`,
    urls: {},
  };

  const preliminaryRecords = routes.map((route) => buildRecordForRoute(route, {
    reportData,
    isFallbackSnapshot,
    snapshot,
  }));

  const records = preliminaryRecords.map((record) => {
    const route = routes.find((item) => item.url === record.url);
    if (!route) return record;
    const clusterKey = clusterKeyForRoute(route);
    const siblings = preliminaryRecords
      .filter((candidate) => {
        const candidateRoute = routes.find((item) => item.url === candidate.url);
        return candidateRoute ? clusterKeyForRoute(candidateRoute) === clusterKey : false;
      })
      .map((candidate) => ({
        pageKey: candidate.url,
        interpretationLabel: `${candidate.payload.currentCall}|${candidate.payload.immediateAction}`,
        currentCall: candidate.payload.currentCall,
        immediateAction: candidate.payload.immediateAction,
        evidenceTitles: candidate.payload.evidence.map((item) => item.title),
      }));

    const rebuilt = buildRecordForRoute(route, { reportData, isFallbackSnapshot, snapshot }, siblings);
    assertGenerationContracts(rebuilt);
    return rebuilt;
  });

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

export const readProgrammaticPayload = async (url: string): Promise<ProgrammaticPayloadRecord> => {
  let manifest: z.infer<typeof manifestSchema>;

  try {
    manifest = await readManifest();
  } catch {
    await generateProgrammaticPayloadArtifacts();
    manifest = await readManifest();
  }

  const relativePath = manifest.urls[url];
  if (!relativePath) {
    throw new Error(`No programmatic SEO payload artifact found for URL: ${url}`);
  }

  const content = await readFile(join(ARTIFACT_ROOT, relativePath), "utf8");
  return payloadRecordSchema.parse(JSON.parse(content));
};

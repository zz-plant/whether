import { buildAgentPayload, buildAgentPrompt } from "./agentHandoff";
import { loadReportRouteContext } from "./api/reportRoute";
import type { RegimeAssessment } from "./regimeEngine";
import { assessPublishReadiness } from "./report/briefPublishGuard";
import type { PostureStateContract } from "./report/postureStateContract";
import { buildPostureState } from "./report/postureStateSource";
import type { ReportData, ReportDataFallback } from "./report/reportData";
import { buildSummaryHash } from "./summary/summaryHash";
import { buildMonthlySummary } from "./summary/monthlySummary";
import { buildQuarterlySummary, getQuarterLabel } from "./summary/quarterlySummary";
import { buildWeeklySummary } from "./summary/weeklySummary";
import { buildYearlySummary, getYearLabel } from "./summary/yearlySummary";
import { resolveSiteUrl } from "./siteUrl";

export const supportedAgentCadences = ["weekly", "monthly", "quarterly", "yearly"] as const;

type AgentCadence = (typeof supportedAgentCadences)[number];

export const isAgentCadence = (value: string): value is AgentCadence =>
  (supportedAgentCadences as readonly string[]).includes(value);

/* The four cadences build four differently shaped summaries. Without this map the
   return type is their union, so every caller that reads a weekly-only field —
   the RSS feed, the weekly email, the MCP brief tool — reached for `as any` to
   get at it. That cast disables checking on the whole object, which is how a
   change to the weekly summary shape could break the feed and the customer-facing
   email without the compiler noticing. Keying the summary to the cadence means a
   caller passing the "weekly" literal gets the weekly shape and real checking. */
type SummaryByCadence = {
  weekly: ReturnType<typeof buildWeeklySummary>;
  monthly: ReturnType<typeof buildMonthlySummary>;
  quarterly: ReturnType<typeof buildQuarterlySummary>;
  yearly: ReturnType<typeof buildYearlySummary>;
};

/* This read through `loadReportData`, which throws when report assembly fails, and nothing
   here caught it — so a durable-store read failure inside the loader answered every cadence
   of this public endpoint with a 500 and an empty body, while `/api/weekly` and its siblings
   kept serving. They go through `loadReportRouteContext`, which catches the failure, logs
   which dependency degraded, and returns the bundled snapshot behind a flag.

   `degraded` carries the same meaning here as on those sibling routes and no more:
   `!reportResult.ok`, assembly failed outright. It is deliberately not a freshness signal.
   Under a total live-data outage treasury and macro fall back to their own snapshots,
   assembly succeeds, and this flag stays false — the trap docs/agents/lessons/automation-and-deploy-gate.md records, where a script
   read through a gracefully degrading loader and froze a ten-week-old brief while exiting 0.
   `lib/report/briefPublishGuard.ts` is what judges publish readiness, on the fallback and
   record-age flags that do move under an outage. Anything that writes from this payload
   gates there, not on this flag. Every caller today only reads.

   `publishReadiness` is that judgment, returned so a consumer that automates on the call
   (the Jev handoff, `?format=jev`) can refuse a fallback or stale week the same way the
   Slack and email sends do, instead of reading `degraded` as a freshness signal. */
export type AgentInterfaceContext = {
  reportData: ReportData | ReportDataFallback;
  degraded: boolean;
  postureState: PostureStateContract;
};

/**
 * What every agent-facing answer is built from, loaded once: the week's report
 * data and the posture state that publishes its confidence. Split from the
 * builders so a test (or a second view of the same week) can hand them a
 * crafted context instead of going through the loader.
 */
export const loadAgentInterfaceContext = async (route = "agent-interface"): Promise<AgentInterfaceContext> => {
  const { reportData, degraded } = await loadReportRouteContext({ route });
  const postureState = await buildPostureState({
    record: reportData.treasury,
    assessment: reportData.assessment,
    reportDynamics: reportData.reportDynamics,
  });
  return { reportData, degraded, postureState };
};

/* The summary builders speak the engine's vocabulary (LOW / MEDIUM / HIGH); the
   published label is HIGH / MED / LOW. */
const ENGINE_CONFIDENCE = {
  HIGH: "HIGH",
  MED: "MEDIUM",
  LOW: "LOW",
} as const satisfies Record<PostureStateContract["currentState"]["confidenceLabel"], RegimeAssessment["diagnostics"]["confidence"]>;

export const buildAgentInterfaceResponse = async <Cadence extends AgentCadence>(
  cadence: Cadence,
  { route = "agent-interface" }: { route?: string } = {},
) => buildAgentInterfaceFromContext(cadence, await loadAgentInterfaceContext(route));

export const buildAgentInterfaceFromContext = <Cadence extends AgentCadence>(
  cadence: Cadence,
  { reportData, degraded, postureState }: AgentInterfaceContext,
  now = new Date(),
) => {
  const {
    assessment,
    actionNowShort,
    macroSeries,
    reportDynamics,
    sensors,
    startItems,
    stopItems,
    treasury,
    treasuryProvenance,
    recordDateLabel,
    weeklyRecordDateLabel,
  } = reportData;

  /* One confidence, the one every page and every other route publishes
     (`resolvePublishedConfidence`, through the posture state). `summary.confidence`
     used to be the engine's own label, which is its confirmation gate and not a
     published fact: on the Sep 25 read it said MEDIUM here and in the RSS item
     while the page, `/api/scores` and the CLI said HIGH, so an agent gating on
     confidence got a different answer from each endpoint it asked. The summary
     builders read the label twice, in the field and in the prose sentence, so they
     are handed a view of the assessment that carries the published one. */
  const confidence = {
    label: postureState.currentState.confidenceLabel,
    percent: postureState.currentState.confidencePercent,
  };
  const summarizedAssessment: RegimeAssessment = {
    ...assessment,
    diagnostics: { ...assessment.diagnostics, confidence: ENGINE_CONFIDENCE[confidence.label] },
  };

  /* A record of thunks rather than a conditional chain. Indexing a mapped type
     with the generic cadence preserves the key/value relationship, so the call
     returns the matching summary shape with no type assertion — a conditional
     expression cannot narrow against a generic and would need one. */
  const summaryBuilders: { [C in AgentCadence]: () => SummaryByCadence[C] } = {
    weekly: () =>
      buildWeeklySummary({
        assessment: summarizedAssessment,
        provenance: treasuryProvenance,
        recordDateLabel: weeklyRecordDateLabel,
        record: treasury,
      }),
    monthly: () =>
      buildMonthlySummary({
        assessment: summarizedAssessment,
        provenance: treasuryProvenance,
        recordDateLabel,
        record: treasury,
      }),
    quarterly: () =>
      buildQuarterlySummary({
        assessment: summarizedAssessment,
        provenance: treasuryProvenance,
        recordDateLabel,
        periodLabel: getQuarterLabel(treasury.record_date) ?? recordDateLabel,
      }),
    yearly: () =>
      buildYearlySummary({
        assessment: summarizedAssessment,
        provenance: treasuryProvenance,
        recordDateLabel,
        periodLabel: getYearLabel(treasury.record_date) ?? recordDateLabel,
      }),
  };

  const summary = summaryBuilders[cadence]();

  const agentPayload = buildAgentPayload(assessment, treasury, sensors, macroSeries, {
    decisionSupport: {
      reportDynamics,
      actionNowShort,
      startItems,
      stopItems,
      postureState,
    },
  });
  const agentPrompt = buildAgentPrompt(assessment, treasury);

  return {
    cadence,
    defaultCadence: "weekly" as const,
    supportedCadences: [...supportedAgentCadences],
    summary,
    /** The published confidence: the same word and percent the page, `/api/scores` and the CLI carry. */
    confidence,
    copy: summary.copy,
    provenance: summary.provenance,
    recordDateLabel: summary.recordDateLabel,
    degraded,
    publishReadiness: assessPublishReadiness({
      degraded,
      isFallback: Boolean(treasury.fallback_at || treasury.fallback_reason),
      isLive: treasury.isLive,
      fallbackReason: treasury.fallback_reason,
      recordDate: treasury.record_date ?? treasury.fetched_at,
      now,
    }),
    agentHandoff: {
      payload: agentPayload,
      prompt: agentPrompt,
    },
    summaryHash: cadence === "weekly" || cadence === "monthly" ? buildSummaryHash(summary) : null,
    links: {
      self: `/api/agent?cadence=${cadence}`,
      llms: "/llms.txt",
      discovery: "/.well-known/whether-agent.json",
    },
    generatedAt: now.toISOString(),
    version: "v1",
  };
};

interface PullRecentSiteInfoOptions {
  cadence?: AgentCadence;
  siteBaseUrl?: string;
  fetchImpl?: typeof fetch;
}

export const pullRecentSiteInfo = async ({
  cadence = "weekly",
  siteBaseUrl,
  fetchImpl = fetch,
}: PullRecentSiteInfoOptions = {}) => {
  const baseUrl = resolveSiteUrl(siteBaseUrl ?? process.env.NEXT_PUBLIC_SITE_URL);
  const endpoint = new URL("/api/agent", baseUrl);
  endpoint.searchParams.set("cadence", cadence);

  const response = await fetchImpl(endpoint.toString(), {
    headers: {
      accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Unable to pull recent site info from ${endpoint.toString()} (status ${response.status}).`
    );
  }

  return {
    siteUrl: baseUrl,
    endpoint: endpoint.toString(),
    cadence,
    payload: await response.json(),
  };
};

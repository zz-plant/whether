import { buildAgentPayload, buildAgentPrompt } from "./agentHandoff";
import { loadReportData } from "./report/reportData";
import { buildPostureState } from "./report/postureStateSource";
import { buildSummaryHash } from "./summary/summaryHash";
import { buildMonthlySummary } from "./summary/monthlySummary";
import { buildQuarterlySummary, getQuarterLabel } from "./summary/quarterlySummary";
import { buildWeeklySummary } from "./summary/weeklySummary";
import { buildYearlySummary, getYearLabel } from "./summary/yearlySummary";
import { resolveSiteUrl } from "./siteUrl";

export const supportedAgentCadences = ["weekly", "monthly", "quarterly", "yearly"] as const;

export type AgentCadence = (typeof supportedAgentCadences)[number];

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

export const buildAgentInterfaceResponse = async <Cadence extends AgentCadence>(
  cadence: Cadence,
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
  } =
    await loadReportData();
  const postureState = await buildPostureState({
    recordDate: treasury.record_date,
    assessment,
    reportDynamics,
  });

  /* A record of thunks rather than a conditional chain. Indexing a mapped type
     with the generic cadence preserves the key/value relationship, so the call
     returns the matching summary shape with no type assertion — a conditional
     expression cannot narrow against a generic and would need one. */
  const summaryBuilders: { [C in AgentCadence]: () => SummaryByCadence[C] } = {
    weekly: () =>
      buildWeeklySummary({
        assessment,
        provenance: treasuryProvenance,
        recordDateLabel: weeklyRecordDateLabel,
      }),
    monthly: () =>
      buildMonthlySummary({
        assessment,
        provenance: treasuryProvenance,
        recordDateLabel,
      }),
    quarterly: () =>
      buildQuarterlySummary({
        assessment,
        provenance: treasuryProvenance,
        recordDateLabel,
        periodLabel: getQuarterLabel(treasury.record_date) ?? recordDateLabel,
      }),
    yearly: () =>
      buildYearlySummary({
        assessment,
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
    copy: summary.copy,
    provenance: summary.provenance,
    recordDateLabel: summary.recordDateLabel,
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
    generatedAt: new Date().toISOString(),
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

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { HistoricalBanner } from "./components/historicalBanner";
import { ReportShell } from "./components/reportShell";
import { buildHomeMetadata, type HomePageSearchParams } from "../lib/report/homeMetadata";
import { assembleHomePage } from "../lib/report/homePageAssembler";
import { buildAgentInterfaceResponse, isAgentCadence } from "../lib/agentInterface";
import { isArtifactMode } from "../lib/shareArtifacts";
import { HomePageStreamingFallback } from "./components/home/homePageStreamingFallback";
import { HomeRoutePrefetch } from "./components/homeRoutePrefetch";
import { decisionTransmissionSummaryLine } from "../lib/report/decisionTransmissionCopy";
import { buildWeeklyTrustCueLine } from "../lib/report/trustStatus";
import { parseOperatorContextFromCookies } from "../lib/report/operatorContext";
import {
  HomeDecisionSection,
  HomeWhatChangedSection,
} from "./components/home/homeBriefSections";
import { StartupActivity } from "./components/home/startupActivity";
import { SaaSMultiplesIndicator } from "./components/home/saasMultiplesIndicator";
import { BriefHero } from "./components/home/BriefHero";
import { CadenceSelector } from "./components/cadenceSelector";
import { DecisionTrendline } from "./components/home/DecisionTrendline";
import { DecisionSimulator } from "./components/home/DecisionSimulator";
import { RegimeTransitionProbability } from "./components/home/RegimeTransitionProbability";
import { CompanyMetricsPanel } from "./components/home/CompanyMetricsPanel";
import { TickerCompany } from "./components/home/TickerCompany";
import { EmailSubscribe } from "./components/home/EmailSubscribe";
import { SourceDisagreement } from "./components/evidence/SourceDisagreement";
import { FrameworkCard } from "./components/home/FrameworkCard";
import { TabNotifier } from "./components/home/TabNotifier";
import { FlipBanner } from "./components/home/FlipBanner";
import { EvidenceContent } from "./components/home/EvidenceContent";
import { TrustContent } from "./components/home/TrustContent";
import { ResolveContent } from "./components/home/ResolveContent";
import { ErrorBoundary } from "../lib/components/ErrorBoundary";
import { getMonthlyRegimeHistory } from "../lib/summary/monthlyRegimeHistory";
import { computeTransitionProbability } from "./components/home/RegimeTransitionProbability";

export const revalidate = 300;
export const runtime = "edge";

export const generateMetadata = async ({
  searchParams,
}: {
  searchParams?: Promise<HomePageSearchParams>;
}): Promise<Metadata> => buildHomeMetadata(searchParams);

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<HomePageSearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return (
    <Suspense fallback={<HomePageStreamingFallback searchParams={resolvedSearchParams} />}>
      <HomePageReportContent searchParams={resolvedSearchParams} />
    </Suspense>
  );
}

export const HomePageReportContent = async ({
  searchParams,
}: {
  searchParams?: HomePageSearchParams | Promise<HomePageSearchParams>;
}) => {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const isScreenshot = resolvedSearchParams?.screenshot === "1";

  // Read operator context from cookies for personalization
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const operatorContext = parseOperatorContextFromCookies(cookieHeader);

  const activeCadence = resolvedSearchParams?.cadence && isAgentCadence(resolvedSearchParams.cadence)
    ? resolvedSearchParams.cadence
    : "weekly";

  const homepage = await assembleHomePage({
    searchParams: resolvedSearchParams,
    operatorContext,
  });

  const cadenceData = activeCadence !== "weekly"
    ? await buildAgentInterfaceResponse(activeCadence).catch(() => null)
    : null;
  const initialArtifactMode = isArtifactMode(resolvedSearchParams?.artifactMode)
    ? resolvedSearchParams.artifactMode
    : undefined;
  const reportData = homepage.reportResult.ok ? homepage.reportResult.data : homepage.reportResult.fallback;
  const postureLabel = homepage.weeklyDecisionCardModel.status.postureWithStageLabel ?? "";
  const confidenceLabel = homepage.weeklyDecisionCardModel.status.confidenceLabel;
  const actionItems = homepage.weeklyDecisionCardModel.decision.actionStripItems ?? [];
  const flipConditionLabels = homepage.weeklyDecisionCardModel.decision.compactFlipConditionLabels ?? [];
  const canonicalDecision = homepage.weeklyDecisionCardModel.decision.canonicalDecisionCopy;
  const regime = homepage.reportShell.regime;
  const regimeHistory = getMonthlyRegimeHistory();
  const prevRegime = regimeHistory.length >= 2 ? regimeHistory[regimeHistory.length - 2].regime : undefined;
  const recentRegimes = regimeHistory.slice(-3).map((r) => r.regime);
  const macroTrendline = regimeHistory.slice(-6);
  const transition = computeTransitionProbability(regime);
  const signalDirection = (homepage.weeklyDecisionCardModel.status.trendLabel?.toLowerCase().includes("tighten") ? "tighten" : homepage.weeklyDecisionCardModel.status.trendLabel?.toLowerCase().includes("ease") ? "ease" : "hold") as "tighten" | "ease" | "hold";

  const reliabilityScore = (() => {
    const confidenceScore = confidenceLabel === "HIGH" ? 90 : confidenceLabel === "MED" ? 60 : 30;
    const freshnessScore = homepage.reportShell.showOfflineBadge ? 50 : 100;
    const degradedCount = homepage.reportShell.degradedSourceRows?.length ?? 0;
    const totalSources = Math.max(degradedCount + 3, 4);
    const coverageScore = Math.round(((totalSources - degradedCount) / totalSources) * 100);
    return Math.round((confidenceScore + freshnessScore + coverageScore) / 3);
  })();

  const compactShareText = [
    `Whether Weekly Brief — ${reportData.weeklyRecordDate}`,
    `${postureLabel} \u00b7 ${confidenceLabel} confidence`,
    homepage.weeklyDecisionCardModel.decision.operatingStanceLine,
    [
      homepage.weeklyDecisionCardModel.decision.actionNowShort,
      homepage.weeklyDecisionCardModel.decision.guardrailThreshold
        ? `Pause if tightness crosses ${homepage.weeklyDecisionCardModel.decision.guardrailThreshold}`
        : null,
      flipConditionLabels.length
        ? `Flip if ${flipConditionLabels.join(", ")}`
        : null,
    ].filter(Boolean).join(" | "),
    "whether.work",
  ].filter(Boolean).join("\n");
  const isHistorical = Boolean(reportData.historicalSelection);

  /* Stage-specific action text — makes personalization visible */
  const stageActionOverrides: Record<string, string> = {
    "pre-seed": "Preserve runway · Gate small bets",
    seed: "Extend runway · Staged critical hires only",
    "series-a": "Gate team growth · Protect unit economics",
    "series-b-plus": "Scale proven channels · Milestone-check new bets",
    public: "Manage shareholder expectations · Optimize free cash flow",
  };
  const stageAction = operatorContext.companyStage && stageActionOverrides[operatorContext.companyStage]
    ? stageActionOverrides[operatorContext.companyStage]
    : null;

  const trustCue = buildWeeklyTrustCueLine({
    confidenceLabel,
    freshnessLabel: homepage.reportShell.fetchedAtLabel,
    transitionWatch: "OFF",
  });

  const artifactPayload = await homepage.leadershipArtifactPayloadPromise.catch(() => null);

  const structuredDecisionData = {
    "@context": "https://schema.org",
    "@type": ["Article", "Report"],
    "headline": `Whether Weekly Brief — ${reportData.weeklyRecordDate}`,
    "name": `Whether Weekly Brief — ${reportData.weeklyRecordDate}`,
    "about": "US Macro Operating Posture for Startup and Product Leaders",
    "datePublished": reportData.weeklyRecordDate,
    "dateModified": homepage.reportShell.fetchedAtLabel,
    "result": {
      "posture": postureLabel,
      "regime": regime,
      "confidence": confidenceLabel,
      "decisions": actionItems.map((item) => ({
        "action": item.areaActionNow,
        "threshold": item.triggerThreshold,
        "reversal": item.reversalCondition,
      })),
      "canonicalDecisionCopy": canonicalDecision,
      "provenance": {
        "source": homepage.reportShell.treasurySource,
        "dataDate": homepage.reportShell.recordDateLabel,
        "refreshedAt": homepage.reportShell.fetchedAtLabel,
        "confidence": confidenceLabel,
        "trustStatus": homepage.reportShell.trustStatusLabel,
        "trustDetail": homepage.reportShell.trustStatusDetail ?? "",
      },
      "trustCue": trustCue,
      "briefMdUrl": "/brief.md",
      "agentApiUrl": "/api/agent?cadence=weekly",
    },
  };

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [{
      "@type": "ListItem",
      "position": 1,
      "name": "Weekly Brief",
      "item": "https://whether.work",
    }],
  };

  const scoresDataset = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "name": "Whether Weekly Scores",
    "description": `Credit conditions: ${homepage.weeklyDecisionCardModel.diagnostics.currentScores.tightness}, Investor sentiment: ${homepage.weeklyDecisionCardModel.diagnostics.currentScores.riskAppetite}. Regime: ${regime}. Confidence: ${confidenceLabel}.`,
    "dateModified": homepage.reportShell.fetchedAtLabel,
  };

  return (
    <ReportShell
      model={{
        status: {
          regime: homepage.reportShell.regime,
          statusLabel: homepage.reportShell.statusLabel,
          recordDateLabel: homepage.reportShell.recordDateLabel,
          fetchedAtLabel: homepage.reportShell.fetchedAtLabel,
          treasurySource: homepage.reportShell.treasurySource,
        },
        page: {
          pageTitle: "Weekly Brief",
          pageSummary: decisionTransmissionSummaryLine,
          sectionLinks: homepage.reportShell.sectionLinks,
          currentPath: "/",
        },
        trust: {
          trustStatusLabel: homepage.reportShell.trustStatusLabel,
          trustStatusDetail: homepage.reportShell.trustStatusDetail,
          trustStatusAction: homepage.reportShell.trustStatusAction,
          trustStatusTone: homepage.reportShell.trustStatusTone,
          outageType: homepage.reportShell.outageType,
          outageSeverity: homepage.reportShell.outageSeverity,
          decisionImpactWindow: homepage.reportShell.decisionImpactWindow,
          approvalBuckets: homepage.reportShell.approvalBuckets,
          recoveryPlan: homepage.reportShell.recoveryPlan,
          outageExitGate: homepage.reportShell.outageExitGate,
          degradedSourceRows: homepage.reportShell.degradedSourceRows,
          showOfflineBadge: homepage.reportShell.showOfflineBadge,
          inlineTrustPlacement: "hidden",
          provenance: homepage.reportShell.provenance,
        },
        chrome: {
          sidebarVariant: "full",
          hideHeroChrome: true,
          heroVariant: "compact",
          ambientMode: "standard",
        },
        actions: {
          exportCta: {
            href: "/planning#ops-export-briefs",
            label: "Copy brief",
            copyText: compactShareText,
            copyTarget: "Weekly brief",
            telemetryEvent: {
              pagePath: "/",
              cluster: "authority" as const,
              intent: "vp-product" as const,
              ctaId: "homepage-copy-brief",
            },
          },
          sharePayload: artifactPayload ? {
            recordDate: reportData.weeklyRecordDate,
            postureLabel: postureLabel,
            confidenceLabel: confidenceLabel,
            operatingStance: homepage.weeklyDecisionCardModel.decision.operatingStanceLine,
            actionNow: homepage.weeklyDecisionCardModel.decision.actionNowShort || canonicalDecision?.doNowLines?.[0],
            guardrail: homepage.weeklyDecisionCardModel.decision.guardrailThreshold?.toString(),
            flipConditions: flipConditionLabels,
            citation: artifactPayload.callCitation,
            weeklyCallSnapshotText: artifactPayload.weeklyCallSnapshotText,
            weeklyOperatorBriefText: artifactPayload.weeklyOperatorBriefText,
            deltaOnlyBriefText: artifactPayload.deltaOnlyBriefText,
            boardSummary: artifactPayload.boardSummary,
            meetingPackText: artifactPayload.meetingPackText,
          } : null,
          nextStep: {
            href: "/planning",
            description: "Turn this into a weekly plan",
          },
        },
        payloads: {
          structuredData: homepage.reportShell.structuredData,
          commandBar: undefined,
          historicalBanner: homepage.reportShell.historicalBanner ? (
            <HistoricalBanner
              banner={homepage.reportShell.historicalBanner.banner}
              liveHref={homepage.reportShell.historicalBanner.liveHref}
              previousHref={homepage.reportShell.historicalBanner.previousHref}
              timeMachineHref={homepage.reportShell.historicalBanner.timeMachineHref}
            />
          ) : null,
        },
      }}
    >
      <h1 className="sr-only">Weekly Brief</h1>
      <script
        type="application/ld+json"
        id="whether-structured-data"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredDecisionData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(scoresDataset) }}
      />
      {cadenceData && activeCadence !== "weekly" ? (
        <div className="mb-3 rounded-lg border border-sky-500/20 bg-sky-500/8 px-4 py-3">
          <p className="text-fluid-micro font-semibold uppercase tracking-[0.12em] text-sky-200">
            {activeCadence === "monthly" ? "Monthly" : activeCadence === "quarterly" ? "Quarterly" : "Yearly"} summary
          </p>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-200">
            {cadenceData && typeof cadenceData === "object" ? (
              (() => {
                const c = cadenceData as { summary?: { regime?: string; action?: string }; recordDateLabel?: string };
                return (
                  <>
                    {c.summary?.regime ? <span>Regime: <strong>{c.summary.regime}</strong></span> : null}
                    {c.summary?.action ? <span>Action: <strong>{c.summary.action}</strong></span> : null}
                    {c.recordDateLabel ? <span className="text-slate-500">As of {c.recordDateLabel}</span> : null}
                  </>
                );
              })()
            ) : <span>Viewing the {activeCadence} brief.</span>}
          </div>
        </div>
      ) : null}
      <div className="space-y-4" data-screenshot={isScreenshot ? "true" : undefined}>
        <FlipBanner
          direction={signalDirection}
          tightness={homepage.weeklyDecisionCardModel.diagnostics.currentScores.tightness}
        />
        <BriefHero
          regime={regime}
          prevRegime={prevRegime}
          regimeHistory={recentRegimes}
          postureLabel={homepage.weeklyDecisionCardModel.status.postureWithStageLabel ?? homepage.weeklyDecisionCardModel.status.postureLabel}
          tightness={homepage.weeklyDecisionCardModel.diagnostics.currentScores.tightness}
          tightnessDelta={homepage.weeklyDecisionCardModel.decision.reportDynamics.changedSignals.find((s) => s.key === "tightness")?.delta ?? 0}
          confidenceLabel={homepage.weeklyDecisionCardModel.status.confidenceLabel}
          recordDate={homepage.reportShell.recordDateLabel}
          fetchedAt={homepage.reportShell.fetchedAtLabel}
          showOfflineBadge={homepage.reportShell.showOfflineBadge}
          degradedSourceCount={homepage.reportShell.degradedSourceRows?.length}
          decisionShiftSummary={homepage.weeklyDecisionCardModel.decision.decisionShiftSummary}
          reliabilityScore={reliabilityScore}
        />

        <TabNotifier
          direction={
            postureLabel.toLowerCase().includes("tighten") ? "tighten" :
            postureLabel.toLowerCase().includes("eas") ? "ease" :
            postureLabel.toLowerCase().includes("revisit") ? "revisit" : "hold"
          }
          tightness={homepage.weeklyDecisionCardModel.diagnostics.currentScores.tightness}
          reliabilityScore={reliabilityScore}
        />

        <div className="relative flex items-center justify-center gap-2 px-5 py-2">
          <span className="h-px flex-1 bg-slate-800/60" />
          <span className="flex min-w-0 max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-fluid-micro text-slate-500">
            {operatorContext.companyStage ? (
              <span>
                {operatorContext.companyStage === "pre-seed" ? "Pre-seed" :
                 operatorContext.companyStage === "seed" ? "Seed" :
                 operatorContext.companyStage === "series-a" ? "Series A" :
                 operatorContext.companyStage === "series-b-plus" ? "Series B+" :
                 operatorContext.companyStage === "public" ? "Public" : operatorContext.companyStage}
                {operatorContext.rateSensitivity ? (
                  <span> · {operatorContext.rateSensitivity === "high" ? "High" : operatorContext.rateSensitivity === "medium" ? "Medium" : "Low"} sensitivity</span>
                ) : null}
              </span>
            ) : null}
            <span>{homepage.reportShell.recordDateLabel}</span>
            <span className="text-slate-700">·</span>
            <span>{homepage.reportShell.treasurySource}</span>
            {homepage.reportShell.fetchedAtLabel ? (
              <>
                <span className="text-slate-700">·</span>
                <span>Updated {homepage.reportShell.fetchedAtLabel}</span>
              </>
            ) : null}
            {transition.probability > 0 ? (
              <>
                <span className="text-slate-700">·</span>
                <span>{transition.probability}% of {transition.likelyNext.charAt(0) + transition.likelyNext.slice(1).toLowerCase()} in ~{transition.avgDuration}w</span>
              </>
            ) : null}
            {transition.probability > 0 ? (
              <>
                <span className="text-slate-700">·</span>
                <span>{transition.probability > 50 ? "Check back Monday" : transition.probability > 25 ? "Watch for change" : "Conditions stable"}</span>
              </>
            ) : null}
          </span>
          <span className="h-px flex-1 bg-slate-800/60" />
        </div>

        <FrameworkCard
          direction={signalDirection}
          call={canonicalDecision?.doNowLines?.[0] ?? homepage.weeklyDecisionCardModel.decision.actionNowShort ?? homepage.weeklyDecisionCardModel.decision.immediateDecision}
          actionNow={homepage.weeklyDecisionCardModel.decision.actionNowShort}
          guardrail={homepage.weeklyDecisionCardModel.decision.guardrailThreshold
            ? `tightness crosses ${homepage.weeklyDecisionCardModel.decision.guardrailThreshold}`
            : undefined}
          flipConditions={flipConditionLabels.length ? flipConditionLabels : undefined}
          confidenceLabel={homepage.weeklyDecisionCardModel.status.confidenceLabel}
          reliabilityScore={reliabilityScore}
          tightness={homepage.weeklyDecisionCardModel.diagnostics.currentScores.tightness}
          recordDate={homepage.reportShell.recordDateLabel}
        />

        <ErrorBoundary label="Weekly decision card">
          <div data-share-section="decision">
            <HomeWhatChangedSection
              weeklyDecisionCardModel={homepage.weeklyDecisionCardModel}
              leadershipArtifactPayloadPromise={homepage.leadershipArtifactPayloadPromise}
              fallbackActive={homepage.fallbackActive}
              searchParams={resolvedSearchParams}
              initialArtifactMode={initialArtifactMode}
            />
          </div>
        </ErrorBoundary>

        {isHistorical ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/8 px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-amber-200">
              Historical snapshot — {reportData.recordDateLabel}
            </span>
            <Link href="/" className="rounded-full border border-amber-400/40 px-3 py-1 text-fluid-micro font-medium text-amber-200 hover:bg-amber-500/10 transition-colors no-underline">
              ← Back to present
            </Link>
          </div>
        ) : null}

        <section className="space-y-2">
          <details className="group border-b border-app-border py-3 px-5" data-page-section="evidence" tabIndex={0}>
            <summary className="cursor-pointer list-none text-fluid-micro font-semibold tracking-[0.08em] text-app-text-secondary hover:text-app-text select-none">Evidence &amp; tools ▸</summary>
            <div className="mt-2 weather-reveal space-y-4">
              <div>
                <p className="text-fluid-micro text-slate-500 mb-2">Why this call</p>
                <EvidenceContent />
              </div>
              <div>
                <p className="text-fluid-micro text-slate-500 mb-2">Trust</p>
                <TrustContent />
              </div>
              <div>
                <p className="text-fluid-micro text-slate-500 mb-2">Explore</p>
                <ResolveContent />
                <div className="mt-4 space-y-3">
                  <DecisionSimulator
                    currentTightness={homepage.weeklyDecisionCardModel.diagnostics.currentScores.tightness}
                    currentRiskAppetite={homepage.weeklyDecisionCardModel.diagnostics.currentScores.riskAppetite}
                    currentRegime={homepage.weeklyDecisionCardModel.status.postureLabel}
                  />
                  <RegimeTransitionProbability currentRegime={regime} />
                </div>
              </div>
              <div>
                <p className="text-fluid-micro text-slate-500 mb-2">Your context</p>
                <TickerCompany tightness={homepage.weeklyDecisionCardModel.diagnostics.currentScores.tightness} />
                <div className="mt-4">
                  <CompanyMetricsPanel
                    tightness={homepage.weeklyDecisionCardModel.diagnostics.currentScores.tightness}
                    companyStage={operatorContext.companyStage ?? undefined}
                  />
                </div>
                <div className="mt-3">
                  <DecisionTrendline regimes={macroTrendline} />
                </div>
                <div className="mt-3">
                  <SourceDisagreement
                    tightnessDelta={homepage.weeklyDecisionCardModel.decision.reportDynamics.changedSignals.find((s) => s.key === "tightness")?.delta ?? 0}
                    riskAppetiteDelta={homepage.weeklyDecisionCardModel.decision.reportDynamics.changedSignals.find((s) => s.key === "riskAppetite")?.delta ?? 0}
                  />
                </div>
              </div>
            </div>
          </details>
        </section>

        <StartupActivity />
        <SaaSMultiplesIndicator />
      </div>


      <HomeRoutePrefetch />
      <ErrorBoundary label="Workspace bands">
        <HomeDecisionSection workspaceModelPromise={homepage.workspaceModelPromise} />
      </ErrorBoundary>
    </ReportShell>
  );
};

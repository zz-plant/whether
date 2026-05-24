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
import { OperatorContextWrapper } from "./components/home/operatorContextWrapper";
import {
  HomeDecisionSection,
  HomeWhatChangedSection,
  HomeKeyTermsDisclosure,
} from "./components/home/homeBriefSections";
import { FirstVisitBanner } from "./components/home/firstVisitBanner";
import { RitualComplete } from "./components/home/ritualComplete";
import { StayInTheLoop } from "./components/home/StayInTheLoop";
import { HowItWorks } from "./components/home/howItWorks";
import { DiscoverabilityStrip } from "./components/home/discoverabilityStrip";
import { StartupActivity } from "./components/home/startupActivity";
import { SaaSMultiplesIndicator } from "./components/home/saasMultiplesIndicator";
import { PageDeltaSummary } from "./components/home/pageDeltaSummary";
import { RegimeSuggestions } from "./components/home/regimeSuggestions";
import { CollapsibleGroup } from "./components/home/CollapsibleGroup";
import { TimeTravelTrigger } from "./components/home/TimeTravelTrigger";
import { BriefHero } from "./components/home/BriefHero";
import { CadenceSelector } from "./components/cadenceSelector";
import { OnboardingGate } from "./components/home/OnboardingGate";
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
      <div className="-mt-4 space-y-3" data-screenshot={isScreenshot ? "true" : undefined}>
        <FlipBanner
          direction={(homepage.weeklyDecisionCardModel.status.trendLabel?.toLowerCase().includes("tighten") ? "tighten" : homepage.weeklyDecisionCardModel.status.trendLabel?.toLowerCase().includes("ease") ? "ease" : "hold") as "tighten" | "ease" | "hold" | "revisit"}
          tightness={homepage.weeklyDecisionCardModel.diagnostics.currentScores.tightness}
        />
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          Macro conditions translated into weekly operating decisions for leadership teams. No econ degree required.
        </p>
        <BriefHero
          regime={regime}
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

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-fluid-micro text-slate-500">
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
          {operatorContext.companyStage ? <span className="text-slate-700">·</span> : null}
          <span>{homepage.reportShell.recordDateLabel}</span>
          <span className="text-slate-700">·</span>
          <span>Source: {homepage.reportShell.treasurySource}</span>
          {homepage.reportShell.fetchedAtLabel ? (
            <>
              <span className="text-slate-700">·</span>
              <span>Updated {homepage.reportShell.fetchedAtLabel}</span>
            </>
          ) : null}
        </div>

        <FrameworkCard
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
        ) : (
          <TimeTravelTrigger />
        )}

        {!isHistorical ? (
          <>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-fluid-micro text-slate-400 justify-between">
              <CadenceSelector />
              <div className="flex items-center gap-x-2">
                <span className="text-slate-400">View</span>
                <Link href="/" className={`${!resolvedSearchParams?.view || resolvedSearchParams.view === "default" ? "text-sky-200" : "text-slate-400 hover:text-slate-300"} no-underline`} title="Standard operating brief">Default</Link>
                <Link href="/?view=sector" className={`${resolvedSearchParams?.view === "sector" ? "text-sky-200" : "text-slate-400 hover:text-slate-300"} no-underline`} title="View through your sector's lens">Sector</Link>
                <Link href="/?view=company" className={`${resolvedSearchParams?.view === "company" ? "text-sky-200" : "text-slate-400 hover:text-slate-300"} no-underline`} title="View for your company stage">Company</Link>
                <Link href="/?view=financial" className={`${resolvedSearchParams?.view === "financial" ? "text-sky-200" : "text-slate-400 hover:text-slate-300"} no-underline`} title="CFO and finance lens">Financial</Link>
                <Link href="/?view=forecast" className={`${resolvedSearchParams?.view === "forecast" ? "text-sky-200" : "text-slate-400 hover:text-slate-300"} no-underline`} title="Posture-focused forecast view">Posture</Link>
              </div>
            </div>

            <CollapsibleGroup storageKey="whether_tailor_open" label="Customize" defaultOpen={!operatorContext.companyStage} summary={operatorContext.companyStage ? `${operatorContext.companyStage === "pre-seed" ? "Pre-seed" : operatorContext.companyStage === "seed" ? "Seed" : operatorContext.companyStage === "series-a" ? "Series A" : operatorContext.companyStage === "series-b-plus" ? "Series B+" : operatorContext.companyStage === "public" ? "Public" : operatorContext.companyStage}${operatorContext.rateSensitivity ? ` · ${operatorContext.rateSensitivity === "high" ? "High" : operatorContext.rateSensitivity === "medium" ? "Medium" : "Low"} sensitivity` : ""}` : undefined}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-fluid-micro text-slate-400">
                <span className="text-slate-400">Stage</span>
                {operatorContext.companyStage ? (
                  <span className="rounded-full bg-slate-800/50 px-3 py-1 font-medium text-slate-300">
                    {operatorContext.companyStage === "pre-seed" ? "Pre-seed" :
                     operatorContext.companyStage === "seed" ? "Seed" :
                     operatorContext.companyStage === "series-a" ? "Series A" :
                     operatorContext.companyStage === "series-b-plus" ? "Series B+" :
                     operatorContext.companyStage === "public" ? "Public" : operatorContext.companyStage}
                  </span>
                ) : (
                <a href="/trust" className="rounded-full border border-slate-700/70 px-3 py-1 text-slate-400 hover:border-sky-500/40 hover:text-sky-200 transition-colors no-underline">
                  Select your stage
                </a>
              )}
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">Rate</span>
              {operatorContext.rateSensitivity ? (
                <span className="rounded-full bg-slate-800/50 px-3 py-1 font-medium text-slate-300">
                  {operatorContext.rateSensitivity === "high" ? "High" :
                   operatorContext.rateSensitivity === "medium" ? "Medium" : "Low"}
                </span>
              ) : (
                <a href="/trust" className="rounded-full border border-slate-700/70 px-3 py-1 text-slate-400 hover:border-sky-500/40 hover:text-sky-200 transition-colors no-underline">
                  Set sensitivity
                </a>
                )}
              </div>
              <OperatorContextWrapper />
            </CollapsibleGroup>
          </>
        ) : null}

        <section className="space-y-3">
          <details className="group rounded-xl border border-slate-800/60 bg-slate-900/30 px-4 py-3" data-page-section="evidence" tabIndex={0}>
            <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.1em] text-slate-400 hover:text-slate-300 select-none">Why this call? ▸</summary>
            <div className="mt-2 weather-reveal">
              <EvidenceContent />
            </div>
          </details>

          <details className="group rounded-xl border border-slate-800/60 bg-slate-900/30 px-4 py-3" data-page-section="trust" tabIndex={0}>
            <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.1em] text-slate-400 hover:text-slate-300 select-none">Can I trust this? ▸</summary>
            <div className="mt-2 weather-reveal">
              <TrustContent />
            </div>
          </details>

          <details className="group rounded-xl border border-slate-800/60 bg-slate-900/30 px-4 py-3" data-page-section="resolve" tabIndex={0}>
            <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.1em] text-slate-400 hover:text-slate-300 select-none">What else can I explore? ▸</summary>
            <div className="mt-2 weather-reveal">
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
          </details>

          <details className="group rounded-xl border border-slate-800/60 bg-slate-900/30 px-4 py-3" data-page-section="you" tabIndex={0}>
            <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.1em] text-slate-400 hover:text-slate-300 select-none">How does this affect me? ▸</summary>
            <div className="mt-2 weather-reveal">
              <TickerCompany tightness={homepage.weeklyDecisionCardModel.diagnostics.currentScores.tightness} />
              <div className="mt-4">
                <CompanyMetricsPanel
                tightness={homepage.weeklyDecisionCardModel.diagnostics.currentScores.tightness}
                companyStage={operatorContext.companyStage ?? undefined}
              />
              </div>
              <div className="mt-3">
                <DecisionTrendline />
              </div>
              <div className="mt-3">
                <SourceDisagreement
                  tightnessDelta={homepage.weeklyDecisionCardModel.decision.reportDynamics.changedSignals.find((s) => s.key === "tightness")?.delta ?? 0}
                  riskAppetiteDelta={homepage.weeklyDecisionCardModel.decision.reportDynamics.changedSignals.find((s) => s.key === "riskAppetite")?.delta ?? 0}
                />
              </div>
            </div>
          </details>
        </section>

        <OnboardingGate>
          <FirstVisitBanner />

          <HowItWorks />

          <Suspense fallback={<div className="h-24 animate-pulse rounded-md bg-slate-950/30" />}>
            <HomeKeyTermsDisclosure />
          </Suspense>

          <RitualComplete recordDate={homepage.reportShell.recordDateLabel} />
        </OnboardingGate>

        {!isHistorical ? (
          <div className="flex items-center gap-3 text-fluid-micro">
            <Link href="/planning" className="rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-2 font-semibold text-sky-200 hover:bg-sky-500/20 transition-colors no-underline">
              Turn this into a plan →
            </Link>
            <Link href="/share" className="text-slate-400 hover:text-sky-200 transition-colors no-underline">
              Or share this brief
            </Link>
          </div>
        ) : null}

        {!isHistorical ? (
          <StayInTheLoop />
        ) : null}

        {!isHistorical ? (
          <div className="max-w-sm mx-auto">
            <p className="text-fluid-xs text-slate-400 mb-2 text-center">Get the brief in your inbox every Monday</p>
            <EmailSubscribe />
          </div>
        ) : null}
        <StartupActivity />
        <SaaSMultiplesIndicator />
      </div>

      <DiscoverabilityStrip />
      <HomeRoutePrefetch />
      <ErrorBoundary label="Workspace bands">
        <HomeDecisionSection workspaceModelPromise={homepage.workspaceModelPromise} />
      </ErrorBoundary>
    </ReportShell>
  );
};

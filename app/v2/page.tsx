import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { buildHomeMetadata, type HomePageSearchParams } from "../../lib/report/homeMetadata";
import { loadHomePageAssembly } from "../../lib/report/homePageAssemblyLoader";
import { Shell } from "./components/Shell";
import { DecisionHero } from "./components/DecisionHero";
import { DeltaTrustStrip } from "./components/DeltaTrustStrip";
import { ActionCard } from "./components/ActionCard";
import { RegimeHistory } from "./components/RegimeHistory";
import { EvidenceDrawer } from "./components/EvidenceDrawer";
import { RitualCheck } from "./components/RitualCheck";
import { ToolsPanel } from "./components/ToolsPanel";
import { SubscribeForm } from "./components/SubscribeForm";
import { StickyCallStrip } from "./components/StickyCallStrip";
import { CompareStrip } from "./components/CompareStrip";
import { FreshnessDot } from "./components/FreshnessDot";
import { SwipeableWeek } from "./components/SwipeableWeek";
import { DecisionSimulator } from "../components/home/DecisionSimulator";
import { RegimeTransitionProbability, computeTransitionProbability } from "../components/home/RegimeTransitionProbability";
import { DecisionTrendline } from "../components/home/DecisionTrendline";
import { CompanyMetricsPanel } from "../components/home/CompanyMetricsPanel";
import { TickerCompany } from "../components/home/TickerCompany";
import { SourceDisagreement } from "../components/evidence/SourceDisagreement";
import { buildAgentInterfaceResponse, isAgentCadence } from "../../lib/agentInterface";
import { summarizeSourceHealthCoverage } from "../../lib/report/sourceHealth";
import { getRegimePublicLabel } from "../../lib/regimePresentation";
import {
  computeReliabilityScore,
  DIRECTION_ARROW,
  buildV2HeroSignalData,
  type SignalDirection,
} from "./viewModel";
import { formatSignedDelta } from "../../lib/formatters";

export const revalidate = 300;
export const runtime = "edge";

export const generateMetadata = async ({
  searchParams,
}: {
  searchParams?: Promise<HomePageSearchParams>;
}): Promise<Metadata> => buildHomeMetadata(searchParams);

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<HomePageSearchParams>;
}) {
  const resolved = searchParams ? await searchParams : undefined;

  return (
    <Suspense fallback={<Shell loading />}>
      <PageContent searchParams={resolved} />
    </Suspense>
  );
}

function CadenceSummary({ cadenceData }: { cadenceData: { summary?: { regime?: string; action?: string }; recordDateLabel?: string } }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-white/70">
      {cadenceData.summary?.regime ? <span>Regime: <strong>{cadenceData.summary.regime}</strong></span> : null}
      {cadenceData.summary?.action ? <span>Action: <strong>{cadenceData.summary.action}</strong></span> : null}
      {cadenceData.recordDateLabel ? <span className="text-white/40">As of {cadenceData.recordDateLabel}</span> : null}
    </div>
  );
}

function hasCadenceSummary(value: unknown): value is { summary?: { regime?: string; action?: string }; recordDateLabel?: string } {
  return typeof value === "object" && value !== null;
}

function compactSentence(value: string | undefined, maxLength = 132) {
  if (!value) return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function WeeklyTopFoldContract({
  model,
  memoryRegimes,
}: {
  model: Awaited<ReturnType<typeof loadHomePageAssembly>>["homepage"]["weeklyDecisionCardModel"];
  memoryRegimes: Array<{ record_date: string; regime: string }>;
}) {
  const weeklySummary = model.decision.weeklyLeadershipSummary;
  const memoryRailItems = model.history.memoryRail.slice(-4).map((item) => item.posture);
  const memoryFallbackItems = memoryRegimes.slice(-4).map((item) => item.regime);
  const memoryItems = (memoryRailItems.length >= 4 ? memoryRailItems : memoryFallbackItems).slice(-4);
  const revisitState = model.decision.revisitDecisions
    ? "YES — Revisit queue active."
    : "NO — Hold posture.";
  const revisitQueue = model.decision.revisitQueue.slice(0, 3);
  const guardrailRows = [
    {
      trigger: model.decision.guardrailThreshold ?? model.decision.guardrail,
      consequence: model.decision.actionNowShort ?? model.decision.immediateDecision,
      reversal: model.decision.reversalTrigger,
    },
    {
      trigger: model.decision.flipThreshold ?? model.decision.compactFlipConditionLabels?.[0] ?? model.diagnostics.flipRiskMeter.triggerLabel,
      consequence: model.decision.netConstraintSummary,
      reversal: model.decision.canonicalDecisionCopy?.flipTrigger ?? model.decision.reversalTrigger,
    },
  ].filter((row) => row.trigger && row.consequence && row.reversal).slice(0, 1);

  return (
    <section
      data-testid="weekly-top-fold"
      aria-label="Weekly decision transmission contract"
      className="weather-card grid gap-4 lg:grid-cols-12"
    >
      <div className="space-y-2 lg:col-span-7">
        <p className="text-fluid-nano font-semibold tracking-[0.08em] text-white/40">THIS WEEK</p>
        <div className="grid gap-2 text-fluid-micro text-white/55 sm:grid-cols-2 lg:grid-cols-4">
          <span>Boldness budget: {weeklySummary.notchShiftLabel}</span>
          <span>Hiring window: {weeklySummary.hiringWindow}</span>
          <span>Expansion window: {weeklySummary.expansionWindow}</span>
          <span>Raise window: {weeklySummary.raiseWindow}</span>
        </div>
        <p className="text-sm font-semibold text-white/75">Boldness Budget: {weeklySummary.boldnessScore} / 100</p>
        <p className="text-fluid-micro text-white/50">Change: {formatSignedDelta(weeklySummary.boldnessDelta)}</p>
        <p className="text-fluid-micro text-white/50">Net delta: {weeklySummary.netDeltaLabel}</p>
        <p className="text-fluid-micro font-medium text-sky-200/80">{weeklySummary.shorthandLine}</p>
      </div>

      <div className="space-y-2 lg:col-span-5">
        <p className="text-fluid-nano font-semibold tracking-[0.08em] text-white/40">Revisit last week’s roadmap/hiring decisions?</p>
        <p className="text-sm font-semibold text-white/75">{revisitState}</p>
        {revisitQueue.length ? (
          <ul className="space-y-1.5 text-fluid-micro text-white/50">
            {revisitQueue.map((item) => (
              <li key={item.id}>
                <span className="font-medium text-white/65">{item.label}:</span>{" "}
                {compactSentence(item.action, 96)}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="space-y-1 border-t border-white/[0.06] pt-2 text-fluid-micro text-white/45">
          {guardrailRows.map((row, index) => (
            <p key={index}>
              <span className="text-white/60">Watch:</span> {compactSentence(row.trigger, 84)}
            </p>
          ))}
        </div>
        {memoryItems.length ? (
          <p className="text-fluid-micro text-white/45">Last 4 weeks: {memoryItems.join(" → ")}</p>
        ) : null}
        <p className="text-fluid-micro text-white/45">Hiring window trend: {weeklySummary.hiringWindow}</p>
      </div>
    </section>
  );
}

async function PageContent({ searchParams }: { searchParams?: HomePageSearchParams }) {
  const activeCadence = searchParams?.cadence && isAgentCadence(searchParams.cadence) ? searchParams.cadence : "weekly";

  let data: Awaited<ReturnType<typeof loadHomePageAssembly>>;
  let cadenceData: Awaited<ReturnType<typeof buildAgentInterfaceResponse>> | null = null;

  try {
    [data, cadenceData] = await Promise.all([
      loadHomePageAssembly(searchParams),
      activeCadence !== "weekly"
        ? buildAgentInterfaceResponse(activeCadence).catch(() => null)
        : Promise.resolve(null),
    ]);
  } catch {
    return (
      <Shell regime="EXPANSION">
        <div className="text-center py-16 space-y-3">
          <p className="text-white/40 text-sm">Unable to load the weekly brief.</p>
          <p className="text-white/30 text-fluid-micro">The data pipeline may be temporarily unavailable. Please try again shortly.</p>
        </div>
      </Shell>
    );
  }

  const { homepage, reportData, regimeHistory, operatorContext } = data;
  const isDegraded = !homepage.reportResult.ok;

  const postureLabel = homepage.weeklyDecisionCardModel.status.postureWithStageLabel ?? "";
  const confidenceLabel = homepage.weeklyDecisionCardModel.status.confidenceLabel;
  const regime = homepage.reportShell.regime;
  const publicRegimeLabel = getRegimePublicLabel(regime);
  const macroTrendline = regimeHistory.slice(-12);

  const tightness = homepage.weeklyDecisionCardModel.diagnostics.currentScores.tightness;
  const riskAppetite = homepage.weeklyDecisionCardModel.diagnostics.currentScores.riskAppetite;
  const weeklyLeadershipSummary = homepage.weeklyDecisionCardModel.decision.weeklyLeadershipSummary;

  const signalDeltas = new Map(
    homepage.weeklyDecisionCardModel.decision.reportDynamics.changedSignals.map((s) => [s.key, s.delta] as const)
  );
  const tightnessDelta = signalDeltas.get("tightness") ?? 0;
  const riskAppetiteDelta = signalDeltas.get("riskAppetite") ?? 0;

  const signalDirection: SignalDirection = (
    homepage.weeklyDecisionCardModel.status.trendLabel?.toLowerCase().includes("tighten") ? "tighten"
    : homepage.weeklyDecisionCardModel.status.trendLabel?.toLowerCase().includes("ease") ? "ease"
    : "hold"
  );

  const reliabilityScore = computeReliabilityScore({
    confidenceLabel,
    showOfflineBadge: homepage.reportShell.showOfflineBadge,
    degradedCount: homepage.reportShell.degradedSourceRows?.length ?? 0,
  });

  const canonicalDecision = homepage.weeklyDecisionCardModel.decision.canonicalDecisionCopy;
  const primaryCall = canonicalDecision?.doNowLines?.[0] ?? homepage.weeklyDecisionCardModel.decision.actionNowShort ?? weeklyLeadershipSummary.shorthandLine;
  const flipConditionLabels = homepage.weeklyDecisionCardModel.decision.compactFlipConditionLabels ?? [];

  const sourceHealthSummary = summarizeSourceHealthCoverage(data.reportData?.sourceHealth);
  const v2HeroSignalData = buildV2HeroSignalData(reportData);

  const transition = computeTransitionProbability(regime);
  const toolHighlight = transition.probability > 50 ? "Transition" : Math.abs(tightnessDelta) > 3 ? "Simulator" : undefined;

  return (
    <Shell regime={regime}>
      <h1 className="sr-only" id="share-ready-artifact">Weekly Brief</h1>
      <FreshnessDot label={homepage.reportShell.fetchedAtLabel} />
      {isDegraded ? (
        <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-fluid-micro">
          <span className="font-semibold text-amber-300/80">Data is degraded.</span>{" "}
          <span className="text-amber-300/50">Using cached snapshot. Decisions should be staged, not committed, until live data returns.</span>
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem] lg:gap-8">
        <div className="space-y-6 min-w-0">
          <SwipeableWeek>
            <DecisionHero
            tightness={tightness}
            tightnessDelta={tightnessDelta}
            boldnessScore={weeklyLeadershipSummary.boldnessScore}
            boldnessDelta={weeklyLeadershipSummary.boldnessDelta}
            boldnessShorthand={weeklyLeadershipSummary.shorthandLine}
            weeklyCall={primaryCall}
            regime={regime}
            postureLabel={postureLabel}
            signalDirection={signalDirection}
            recordDate={homepage.reportShell.recordDateLabel}
            fetchedAt={homepage.reportShell.fetchedAtLabel}
            operatorContext={operatorContext}
            confidenceLabel={confidenceLabel}
            signalData={v2HeroSignalData}
          />

          <CompareStrip currentRegime={regime} currentTightness={tightness} tightnessDelta={tightnessDelta} />

          <ActionCard
            call={primaryCall}
            actionNow={homepage.weeklyDecisionCardModel.decision.actionNowShort}
            guardrail={homepage.weeklyDecisionCardModel.decision.guardrailThreshold
              ? `tightness crosses ${homepage.weeklyDecisionCardModel.decision.guardrailThreshold}`
              : undefined}
            flipConditions={flipConditionLabels.length ? flipConditionLabels : undefined}
            tightness={tightness}
            boldnessScore={weeklyLeadershipSummary.boldnessScore}
            boldnessDelta={weeklyLeadershipSummary.boldnessDelta}
            direction={signalDirection}
            recordDate={homepage.reportShell.recordDateLabel}
          />

          <WeeklyTopFoldContract
            model={homepage.weeklyDecisionCardModel}
            memoryRegimes={macroTrendline}
          />

          </SwipeableWeek>
        </div>

        <div className="space-y-4 lg:col-start-2">
          <DeltaTrustStrip
            tightnessDelta={tightnessDelta}
            riskAppetiteDelta={riskAppetiteDelta}
            confidenceLabel={confidenceLabel}
            reliabilityScore={reliabilityScore}
            sourceHealthSummary={sourceHealthSummary}
            direction={signalDirection}
          />
          <RegimeHistory regimes={macroTrendline} currentRegime={regime} />
        </div>

        <div className="space-y-6 min-w-0">
          <EvidenceDrawer highlight={toolHighlight}>
            <ToolsPanel>
              <DecisionSimulator
                currentTightness={tightness}
                currentRiskAppetite={riskAppetite}
                currentRegime={homepage.weeklyDecisionCardModel.status.postureLabel}
              />
              <RegimeTransitionProbability currentRegime={regime} />
              <DecisionTrendline regimes={macroTrendline} />
              <CompanyMetricsPanel tightness={tightness} companyStage={operatorContext.companyStage ?? undefined} />
              <TickerCompany tightness={tightness} />
              <SourceDisagreement tightnessDelta={tightnessDelta} riskAppetiteDelta={riskAppetiteDelta} />
            </ToolsPanel>
          </EvidenceDrawer>

          <SubscribeForm />

          <RitualCheck recordDate={homepage.reportShell.recordDateLabel} />

          <Link
            href="/planning"
            className="weather-card flex items-center justify-between hover:border-sky-500/30 transition-colors no-underline group"
          >
            <div>
              <p className="text-fluid-xs font-semibold tracking-[0.04em] text-white/70 group-hover:text-white/90">Open weekly plan</p>
              <p className="text-fluid-micro text-white/40 mt-0.5">Turn this read into this week&apos;s plan</p>
            </div>
            <span className="text-white/30 group-hover:text-white/60 transition-colors">→</span>
          </Link>

          {cadenceData && activeCadence !== "weekly" ? (
            <div className="rounded-lg border border-sky-500/20 bg-sky-500/8 px-4 py-3">
              <p className="text-xs font-semibold tracking-[0.06em] text-sky-200">
                {activeCadence === "monthly" ? "Monthly" : activeCadence === "quarterly" ? "Quarterly" : "Yearly"} summary
              </p>
              {hasCadenceSummary(cadenceData) ? (
                <CadenceSummary cadenceData={cadenceData} />
              ) : <span className="text-xs text-white/40">Viewing the {activeCadence} brief.</span>}
            </div>
          ) : null}
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": ["Article", "Report"],
            "headline": `Whether Weekly Brief — ${homepage.reportShell.recordDateLabel}`,
            "name": `Whether Weekly Brief — ${homepage.reportShell.recordDateLabel}`,
            "about": "US Macro Operating Posture for Startup Leaders",
            "datePublished": homepage.reportShell.recordDateLabel,
            "dateModified": homepage.reportShell.fetchedAtLabel,
            "result": {
              "posture": postureLabel,
              "regime": publicRegimeLabel,
              "confidence": confidenceLabel,
              "provenance": {
                "source": homepage.reportShell.treasurySource ?? "FRED",
                "dataDate": homepage.reportShell.recordDateLabel,
                "refreshedAt": homepage.reportShell.fetchedAtLabel,
                "confidence": confidenceLabel,
              },
            },
        }),
          }}
        />

      <StickyCallStrip
        call={primaryCall}
        arrow={DIRECTION_ARROW[signalDirection]}
        boldnessScore={weeklyLeadershipSummary.boldnessScore}
        boldnessDelta={weeklyLeadershipSummary.boldnessDelta}
        guardrail={homepage.weeklyDecisionCardModel.decision.guardrailThreshold
          ? `tightness crosses ${homepage.weeklyDecisionCardModel.decision.guardrailThreshold}`
          : undefined}
      />
    </Shell>
  );
}

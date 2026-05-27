import type { Metadata } from "next";
import { Suspense } from "react";
import { buildHomeMetadata, type HomePageSearchParams } from "../../lib/report/homeMetadata";
import { loadHomePageAssembly } from "../../lib/report/homePageAssemblyLoader";
import { HomePageStreamingFallback } from "../components/home/homePageStreamingFallback";
import { V2Shell } from "./components/V2Shell";
import { V2DecisionHero } from "./components/V2DecisionHero";
import { V2DeltaTrust } from "./components/V2DeltaTrust";
import { V2ActionCard } from "./components/V2ActionCard";
import { V2RegimeHistory } from "./components/V2RegimeHistory";
import { V2EvidenceDrawer } from "./components/V2EvidenceDrawer";
import { V2RitualCheck } from "./components/V2RitualCheck";
import { V2ToolsPanel } from "./components/V2ToolsPanel";
import { DecisionSimulator } from "../components/home/DecisionSimulator";
import { RegimeTransitionProbability } from "../components/home/RegimeTransitionProbability";
import { DecisionTrendline } from "../components/home/DecisionTrendline";
import { CompanyMetricsPanel } from "../components/home/CompanyMetricsPanel";
import { TickerCompany } from "../components/home/TickerCompany";
import { SourceDisagreement } from "../components/evidence/SourceDisagreement";
import { HistoricalBanner } from "../components/historicalBanner";
import { buildAgentInterfaceResponse, isAgentCadence } from "../../lib/agentInterface";
import Link from "next/link";

export const revalidate = 300;
export const runtime = "edge";

export const generateMetadata = async ({
  searchParams,
}: {
  searchParams?: Promise<HomePageSearchParams>;
}): Promise<Metadata> => buildHomeMetadata(searchParams);

export default async function V2Page({
  searchParams,
}: {
  searchParams?: Promise<HomePageSearchParams>;
}) {
  const resolved = searchParams ? await searchParams : undefined;

  return (
    <Suspense fallback={<V2Shell loading />}>
      <V2PageContent searchParams={resolved} />
    </Suspense>
  );
}

function CadenceSummary({ cadenceData }: { cadenceData: { summary?: { regime?: string; action?: string }; recordDateLabel?: string } }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-300">
      {cadenceData.summary?.regime ? <span>Regime: <strong>{cadenceData.summary.regime}</strong></span> : null}
      {cadenceData.summary?.action ? <span>Action: <strong>{cadenceData.summary.action}</strong></span> : null}
      {cadenceData.recordDateLabel ? <span className="text-slate-500">As of {cadenceData.recordDateLabel}</span> : null}
    </div>
  );
}

async function V2PageContent({ searchParams }: { searchParams?: HomePageSearchParams }) {
  const activeCadence = searchParams?.cadence && isAgentCadence(searchParams.cadence) ? searchParams.cadence : "weekly";

  const [data, cadenceData] = await Promise.all([
    loadHomePageAssembly(searchParams),
    activeCadence !== "weekly"
      ? buildAgentInterfaceResponse(activeCadence).catch(() => null)
      : Promise.resolve(null),
  ]);

  const { homepage, regimeHistory, operatorContext } = data;

  const postureLabel = homepage.weeklyDecisionCardModel.status.postureWithStageLabel ?? "";
  const confidenceLabel = homepage.weeklyDecisionCardModel.status.confidenceLabel;
  const regime = homepage.reportShell.regime;
  const macroTrendline = regimeHistory.slice(-6);

  const tightness = homepage.weeklyDecisionCardModel.diagnostics.currentScores.tightness;
  const riskAppetite = homepage.weeklyDecisionCardModel.diagnostics.currentScores.riskAppetite;

  const signalDeltas = new Map(
    homepage.weeklyDecisionCardModel.decision.reportDynamics.changedSignals.map((s) => [s.key, s.delta] as const)
  );
  const tightnessDelta = signalDeltas.get("tightness") ?? 0;
  const riskAppetiteDelta = signalDeltas.get("riskAppetite") ?? 0;

  const signalDirection = (
    homepage.weeklyDecisionCardModel.status.trendLabel?.toLowerCase().includes("tighten") ? "tighten"
    : homepage.weeklyDecisionCardModel.status.trendLabel?.toLowerCase().includes("ease") ? "ease"
    : "hold"
  ) as "tighten" | "ease" | "hold";

  const reliabilityScore = (() => {
    const c = confidenceLabel === "HIGH" ? 90 : confidenceLabel === "MED" ? 60 : 30;
    const f = homepage.reportShell.showOfflineBadge ? 50 : 100;
    const d = homepage.reportShell.degradedSourceRows?.length ?? 0;
    const t = Math.max(d + 3, 4);
    return Math.round((c + f + Math.round(((t - d) / t) * 100)) / 3);
  })();

  const canonicalDecision = homepage.weeklyDecisionCardModel.decision.canonicalDecisionCopy;
  const flipConditionLabels = homepage.weeklyDecisionCardModel.decision.compactFlipConditionLabels ?? [];

  const sourceCount = Math.max((homepage.reportShell.degradedSourceRows?.length ?? 0) + 3, 4);
  const degradedCount = homepage.reportShell.degradedSourceRows?.length ?? 0;
  const reportData = homepage.reportResult.ok ? homepage.reportResult.data : homepage.reportResult.fallback;
  const isHistorical = Boolean(reportData.historicalSelection);

  return (
    <V2Shell regime={regime}>
      {isHistorical ? (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/8 px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold tracking-[0.04em] text-amber-200">
            Historical snapshot — {reportData.recordDateLabel}
          </span>
          <Link href="/" className="rounded-full border border-amber-400/40 px-3 py-1 text-xs font-medium text-amber-200 hover:bg-amber-500/10 transition-colors no-underline">
            ← Back to present
          </Link>
        </div>
      ) : null}

      {isHistorical && homepage.reportShell.historicalBanner ? (
        <HistoricalBanner
          banner={homepage.reportShell.historicalBanner.banner}
          liveHref={homepage.reportShell.historicalBanner.liveHref}
          previousHref={homepage.reportShell.historicalBanner.previousHref}
          timeMachineHref={homepage.reportShell.historicalBanner.timeMachineHref}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem] lg:gap-8">
        <div className="space-y-6">
          <V2DecisionHero
            tightness={tightness}
            tightnessDelta={tightnessDelta}
            regime={regime}
            postureLabel={postureLabel}
            signalDirection={signalDirection}
            recordDate={homepage.reportShell.recordDateLabel}
            fetchedAt={homepage.reportShell.fetchedAtLabel}
            operatorContext={operatorContext}
          />

          <V2ActionCard
            call={canonicalDecision?.doNowLines?.[0] ?? homepage.weeklyDecisionCardModel.decision.actionNowShort ?? ""}
            actionNow={homepage.weeklyDecisionCardModel.decision.actionNowShort}
            guardrail={homepage.weeklyDecisionCardModel.decision.guardrailThreshold
              ? `tightness crosses ${homepage.weeklyDecisionCardModel.decision.guardrailThreshold}`
              : undefined}
            flipConditions={flipConditionLabels.length ? flipConditionLabels : undefined}
            tightness={tightness}
            direction={signalDirection}
            recordDate={homepage.reportShell.recordDateLabel}
          />

          <V2EvidenceDrawer>
            <V2ToolsPanel>
              <Suspense fallback={<div className="h-24 animate-pulse rounded-md bg-slate-950/30" />}>
                <DecisionSimulator
                  currentTightness={tightness}
                  currentRiskAppetite={riskAppetite}
                  currentRegime={homepage.weeklyDecisionCardModel.status.postureLabel}
                />
              </Suspense>
              <Suspense fallback={<div className="h-16 animate-pulse rounded-md bg-slate-950/30" />}>
                <RegimeTransitionProbability currentRegime={regime} />
              </Suspense>
              <Suspense fallback={<div className="h-24 animate-pulse rounded-md bg-slate-950/30" />}>
                <DecisionTrendline regimes={macroTrendline} />
              </Suspense>
              <Suspense fallback={<div className="h-32 animate-pulse rounded-md bg-slate-950/30" />}>
                <CompanyMetricsPanel tightness={tightness} companyStage={operatorContext.companyStage ?? undefined} />
              </Suspense>
              <Suspense fallback={<div className="h-16 animate-pulse rounded-md bg-slate-950/30" />}>
                <TickerCompany tightness={tightness} />
              </Suspense>
              <Suspense fallback={<div className="h-16 animate-pulse rounded-md bg-slate-950/30" />}>
                <SourceDisagreement tightnessDelta={tightnessDelta} riskAppetiteDelta={riskAppetiteDelta} />
              </Suspense>
            </V2ToolsPanel>
          </V2EvidenceDrawer>

          <V2RitualCheck recordDate={homepage.reportShell.recordDateLabel} />

          {cadenceData && activeCadence !== "weekly" ? (
            <div className="rounded-lg border border-sky-500/20 bg-sky-500/8 px-4 py-3">
              <p className="text-xs font-semibold tracking-[0.06em] text-sky-200">
                {activeCadence === "monthly" ? "Monthly" : activeCadence === "quarterly" ? "Quarterly" : "Yearly"} summary
              </p>
              {cadenceData && typeof cadenceData === "object" ? (
                <CadenceSummary cadenceData={cadenceData as { summary?: { regime?: string; action?: string }; recordDateLabel?: string }} />
              ) : <span className="text-xs text-slate-400">Viewing the {activeCadence} brief.</span>}
            </div>
          ) : null}

        </div>

        <aside className="hidden lg:block space-y-4">
          <V2DeltaTrust
            tightnessDelta={tightnessDelta}
            riskAppetiteDelta={riskAppetiteDelta}
            confidenceLabel={confidenceLabel}
            reliabilityScore={reliabilityScore}
            sourceCount={sourceCount}
            degradedCount={degradedCount}
            direction={signalDirection}
          />

          <V2RegimeHistory regimes={macroTrendline} currentRegime={regime} />
        </aside>
      </div>

      <div className="lg:hidden mt-6 space-y-4">
        <V2DeltaTrust
          tightnessDelta={tightnessDelta}
          riskAppetiteDelta={riskAppetiteDelta}
          confidenceLabel={confidenceLabel}
          reliabilityScore={reliabilityScore}
          sourceCount={sourceCount}
          degradedCount={degradedCount}
          direction={signalDirection}
        />
        <V2RegimeHistory regimes={macroTrendline} currentRegime={regime} />
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": ["Article", "Report"],
            "headline": `Whether Weekly Brief — ${homepage.reportShell.recordDateLabel}`,
            "about": "US Macro Operating Posture for Startup Leaders",
            "datePublished": homepage.reportShell.recordDateLabel,
            "dateModified": homepage.reportShell.fetchedAtLabel,
          }),
        }}
      />
    </V2Shell>
  );
}

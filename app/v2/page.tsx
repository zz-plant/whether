import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { buildHomeMetadata, type HomePageSearchParams } from "../../lib/report/homeMetadata";
import { loadHomePageAssembly } from "../../lib/report/homePageAssemblyLoader";
import { V2Shell } from "./components/V2Shell";
import { V2DecisionHero } from "./components/V2DecisionHero";
import { DeltaTrustStrip } from "./components/DeltaTrustStrip";
import { ActionCard } from "./components/ActionCard";
import { V2RegimeHistory } from "./components/V2RegimeHistory";
import { V2EvidenceDrawer } from "./components/V2EvidenceDrawer";
import { V2RitualCheck } from "./components/V2RitualCheck";
import { V2ToolsPanel } from "./components/V2ToolsPanel";
import { V2SubscribeForm } from "./components/V2SubscribeForm";
import { StickyCallStrip } from "./components/StickyCallStrip";
import { CompareStrip } from "./components/CompareStrip";
import { FreshnessDot } from "./components/FreshnessDot";
import { SwipeableWeek } from "./components/SwipeableWeek";
import { DecisionSimulator } from "../components/home/DecisionSimulator";
import { RegimeTransitionProbability, computeTransitionProbability } from "../components/home/RegimeTransitionProbability";
import { DecisionTrendline } from "../components/home/DecisionTrendline";
import { CompanyMetricsPanel } from "../components/home/CompanyMetricsPanel";
import { TickerCompany } from "../components/home/TickerCompany";
import { EmailSubscribe } from "../components/home/EmailSubscribe";
import { SourceDisagreement } from "../components/evidence/SourceDisagreement";
import { buildAgentInterfaceResponse, isAgentCadence } from "../../lib/agentInterface";
import { getRegimePublicLabel } from "../../lib/regimePresentation";
import {
  computeReliabilityScore,
  DIRECTION_ARROW,
  type SignalDirection,
} from "./viewModel";

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
    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-white/70">
      {cadenceData.summary?.regime ? <span>Regime: <strong>{cadenceData.summary.regime}</strong></span> : null}
      {cadenceData.summary?.action ? <span>Action: <strong>{cadenceData.summary.action}</strong></span> : null}
      {cadenceData.recordDateLabel ? <span className="text-white/40">As of {cadenceData.recordDateLabel}</span> : null}
    </div>
  );
}

async function V2PageContent({ searchParams }: { searchParams?: HomePageSearchParams }) {
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
      <V2Shell regime="EXPANSION">
        <div className="text-center py-16 space-y-3">
          <p className="text-white/40 text-sm">Unable to load the weekly brief.</p>
          <p className="text-white/30 text-fluid-micro">The data pipeline may be temporarily unavailable. Please try again shortly.</p>
        </div>
      </V2Shell>
    );
  }

  const { homepage, regimeHistory, operatorContext } = data;
  const isDegraded = !homepage.reportResult.ok;

  const postureLabel = homepage.weeklyDecisionCardModel.status.postureWithStageLabel ?? "";
  const confidenceLabel = homepage.weeklyDecisionCardModel.status.confidenceLabel;
  const regime = homepage.reportShell.regime;
  const publicRegimeLabel = getRegimePublicLabel(regime);
  const macroTrendline = regimeHistory.slice(-12);

  const tightness = homepage.weeklyDecisionCardModel.diagnostics.currentScores.tightness;
  const riskAppetite = homepage.weeklyDecisionCardModel.diagnostics.currentScores.riskAppetite;

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
  const flipConditionLabels = homepage.weeklyDecisionCardModel.decision.compactFlipConditionLabels ?? [];

  const sourceCount = Math.max((homepage.reportShell.degradedSourceRows?.length ?? 0) + 3, 4);
  const degradedCount = homepage.reportShell.degradedSourceRows?.length ?? 0;
  const isScreenshot = searchParams?.screenshot === "1";

  const transition = computeTransitionProbability(regime);
  const toolHighlight = transition.probability > 50 ? "Transition" : Math.abs(tightnessDelta) > 3 ? "Simulator" : undefined;

  return (
    <V2Shell regime={regime}>
      <FreshnessDot label={homepage.reportShell.fetchedAtLabel} />
      {isDegraded ? (
        <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-fluid-micro">
          <span className="font-semibold text-amber-300/80">Data is degraded.</span>{" "}
          <span className="text-amber-300/50">Using cached snapshot. Decisions should be staged, not committed, until live data returns.</span>
        </div>
      ) : null}
      <p className="text-fluid-micro text-center text-white/35 mb-4 lg:hidden">
        Tightness {tightness}/100 · {regime.charAt(0) + regime.slice(1).toLowerCase()} · {signalDirection === "tighten" ? "tightening" : signalDirection === "ease" ? "easing" : "holding"} · {confidenceLabel === "HIGH" ? "high confidence" : confidenceLabel === "MED" ? "moderate confidence" : "low confidence"}
      </p>
      <div data-screenshot={isScreenshot ? "true" : undefined}>
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem] lg:gap-8">
        <div className="space-y-6 min-w-0">
          <SwipeableWeek>
            <V2DecisionHero
            tightness={tightness}
            tightnessDelta={tightnessDelta}
            regime={regime}
            postureLabel={postureLabel}
            signalDirection={signalDirection}
            recordDate={homepage.reportShell.recordDateLabel}
            fetchedAt={homepage.reportShell.fetchedAtLabel}
            operatorContext={operatorContext}
            confidenceLabel={confidenceLabel}
            signalData={{
              baseRate: 4.33,
              baseRateUsed: "FED",
            }}
          />

          <CompareStrip currentRegime={regime} currentTightness={tightness} tightnessDelta={tightnessDelta} />

          <ActionCard
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

          </SwipeableWeek>

          <div className="lg:hidden space-y-4">
            <DeltaTrustStrip
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

          <V2EvidenceDrawer highlight={toolHighlight}>
            <V2ToolsPanel>
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
            </V2ToolsPanel>
          </V2EvidenceDrawer>

          <V2SubscribeForm />

          <V2RitualCheck recordDate={homepage.reportShell.recordDateLabel} />

          <Link
            href="/planning"
            className="weather-card flex items-center justify-between hover:border-sky-500/30 transition-colors no-underline group"
          >
            <div>
              <p className="text-fluid-xs font-semibold tracking-[0.04em] text-white/70 group-hover:text-white/90">Next step</p>
              <p className="text-fluid-micro text-white/40 mt-0.5">Turn this read into this week&apos;s plan</p>
            </div>
            <span className="text-white/30 group-hover:text-white/60 transition-colors">→</span>
          </Link>

          {cadenceData && activeCadence !== "weekly" ? (
            <div className="rounded-lg border border-sky-500/20 bg-sky-500/8 px-4 py-3">
              <p className="text-xs font-semibold tracking-[0.06em] text-sky-200">
                {activeCadence === "monthly" ? "Monthly" : activeCadence === "quarterly" ? "Quarterly" : "Yearly"} summary
              </p>
              {cadenceData && typeof cadenceData === "object" ? (
                <CadenceSummary cadenceData={cadenceData as { summary?: { regime?: string; action?: string }; recordDateLabel?: string }} />
              ) : <span className="text-xs text-white/40">Viewing the {activeCadence} brief.</span>}
            </div>
          ) : null}

        </div>

        <aside className="hidden lg:block space-y-4">
          <DeltaTrustStrip
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
      </div>

      <div className="mb-8">
        <EmailSubscribe />
      </div>

      <StickyCallStrip
        call={canonicalDecision?.doNowLines?.[0] ?? ""}
        arrow={DIRECTION_ARROW[signalDirection]}
        tightnessDelta={tightnessDelta}
      />
    </V2Shell>
  );
}

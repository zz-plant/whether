import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { buildHomeMetadata, type HomePageSearchParams } from "../lib/report/homeMetadata";
import { ActionLink } from "./components/ui/actionLink";
import { buildPublishedBriefPath, latestPublishedBrief } from "../lib/report/publishedBriefs";
import { loadHomePageAssembly } from "../lib/report/homePageAssemblyLoader";
import { Shell } from "./components/Shell";
import { DecisionHero } from "./components/DecisionHero";
import { RegimeHistory } from "./components/RegimeHistory";
import { EvidenceDrawer } from "./components/EvidenceDrawer";
import { RitualCheck } from "./components/RitualCheck";
import { ToolsPanel } from "./components/ToolsPanel";
import { SubscribeForm } from "./components/SubscribeForm";
import { StickyCallStrip } from "./components/StickyCallStrip";
import { ThreeWhethersCard } from "./components/ThreeWhethersCard";
import { CompareStrip } from "./components/CompareStrip";
import { FreshnessDot } from "./components/FreshnessDot";
import { SwipeableWeek } from "./components/SwipeableWeek";
import { CadenceCallCard } from "./components/CadenceCallCard";
import dynamic from "next/dynamic";
import { computeTransitionProbability } from "./components/home/RegimeTransitionProbability";
import { buildAgentInterfaceResponse, isAgentCadence } from "../lib/agentInterface";
import { getRegimePublicLabel } from "../lib/regimePresentation";
import {
  DIRECTION_ARROW,
  REGIME_DISPLAY,
  buildV2HeroSignalData,
  type SignalDirection,
} from "./viewModel";
import { formatDateUTC } from "../lib/formatters";
import { getMonthlyRegimeHistory } from "../lib/summary/monthlyRegimeHistory";

const EvidenceTools = dynamic(
  () => import("./components/EvidenceTools").then((mod) => mod.EvidenceTools),
  {
    ssr: false,
    loading: () => <div className="weather-card h-24 animate-pulse" />,
  },
);

const ScenarioSimulator = dynamic(
  () => import("./components/ScenarioSimulator").then((mod) => mod.ScenarioSimulator),
  {
    ssr: false,
    loading: () => <div className="weather-card h-32 animate-pulse" />,
  },
);

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
  const regimeHistory = getMonthlyRegimeHistory();

  return (
    <Shell regime={regimeHistory.at(-1)?.regime}>
      <PageContent searchParams={resolved} regimeHistory={regimeHistory} />
      <CanonicalWeekPermalink />
    </Shell>
  );
}

/**
 * This view changes every week under one URL, so it cannot be cited or indexed as
 * a dated article. Point at the frozen copy of the week instead.
 */
function CanonicalWeekPermalink() {
  if (!latestPublishedBrief) return null;

  return (
    <section className="weather-panel flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <p className="text-sm text-slate-300">
        This week is published as a permanent record dated {latestPublishedBrief.recordDateLabel}.
      </p>
      <ActionLink href={buildPublishedBriefPath(latestPublishedBrief.slug)} variant="pill">
        Citable permalink
      </ActionLink>
    </section>
  );
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
  const rawItems = (memoryRailItems.length >= 4 ? memoryRailItems : memoryFallbackItems).slice(-4);
  const memoryItems = rawItems.map((label) => REGIME_DISPLAY[label] ?? label ?? "—");
  const shouldRevisit = model.decision.revisitDecisions;
  const revisitQueue = model.decision.revisitQueue.slice(0, 3);

  return (
    <section
      data-testid="weekly-top-fold"
      aria-label="Revisit queue"
      className="weather-card grid gap-4 lg:grid-cols-12"
    >
      <div className="space-y-2 lg:col-span-7">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-sm px-2 py-0.5 text-fluid-nano font-bold tracking-[0.06em] uppercase ${
              shouldRevisit
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
            }`}
          >
            {shouldRevisit ? "REVISIT" : "ON TRACK"}
          </span>
          <p className="text-fluid-micro text-white/50">Posture shift: {weeklySummary.notchShiftLabel}</p>
        </div>
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
      </div>

      <div className="space-y-2 lg:col-span-5">
        <p className="text-fluid-nano font-semibold tracking-[0.08em] text-white/60 uppercase">Continuity</p>
        {memoryItems.length ? (
          <p className="text-fluid-micro text-white/50">{memoryItems.join(" → ")}</p>
        ) : null}
      </div>
    </section>
  );
}

type RegimeEntry = { record_date: string; regime: string };

type BelowTheFoldEvidenceProps = {
  enrichmentPromise: Promise<unknown>;
  highlight: string | undefined;
  tightness: number;
  boldnessScore: number;
  pauseThreshold: number;
  currentRiskAppetite: number;
  currentRegime: string;
  regimes: RegimeEntry[];
  companyStage: string | undefined;
  tightnessDelta: number;
  riskAppetiteDelta: number;
  recordDate: string;
  recentRecordDates: string[];
};

async function BelowTheFoldEvidence(props: BelowTheFoldEvidenceProps) {
  await props.enrichmentPromise.catch(() => undefined);

  return (
    <>
      <EvidenceDrawer highlight={props.highlight}>
        <ToolsPanel>
          <ScenarioSimulator
            baseTightness={props.tightness}
            baseBoldness={props.boldnessScore}
            pauseThreshold={props.pauseThreshold}
          />
          <EvidenceTools
            currentTightness={props.tightness}
            currentRiskAppetite={props.currentRiskAppetite}
            currentRegime={props.currentRegime}
            regimes={props.regimes}
            companyStage={props.companyStage}
            tightnessDelta={props.tightnessDelta}
            riskAppetiteDelta={props.riskAppetiteDelta}
          />
        </ToolsPanel>
      </EvidenceDrawer>

      <RitualCheck
        recordDate={props.recordDate}
        recentRecordDates={props.recentRecordDates}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4 mt-4">
        <Link
          href="/planning"
          className="inline-flex items-center gap-2 text-fluid-micro text-sky-300/70 hover:text-sky-300 transition-colors no-underline"
        >
          Build this week&apos;s plan →
        </Link>
        <SubscribeForm />
      </div>
    </>
  );
}

async function BelowTheFoldHistory({
  enrichmentPromise,
  regimes,
}: {
  enrichmentPromise: Promise<unknown>;
  regimes: RegimeEntry[];
}) {
  await enrichmentPromise.catch(() => undefined);
  return <RegimeHistory regimes={regimes} />;
}

async function PageContent({
  searchParams,
  regimeHistory,
}: {
  searchParams?: HomePageSearchParams;
  regimeHistory: ReturnType<typeof getMonthlyRegimeHistory>;
}) {
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
      <div className="text-center py-16 space-y-4">
        <div className="space-y-2">
          <p className="text-white/60 text-sm">Couldn&apos;t load this week&apos;s brief.</p>
          <p className="text-white/50 text-fluid-micro">Data sources are temporarily unavailable or delayed.</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 text-emerald-300 hover:bg-emerald-500/15 transition-colors text-sm font-medium"
          >
            Retry now
          </button>
          <Link
            href="/trust"
            className="inline-flex items-center gap-2 text-sky-300/70 hover:text-sky-300 text-sm font-medium transition-colors"
          >
            Check data status →
          </Link>
        </div>
      </div>
    );
  }

  const { homepage, reportData, operatorContext } = data;
  const isDegraded = !homepage.reportResult.ok;

  const postureLabel = homepage.weeklyDecisionCardModel.status.postureWithStageLabel ?? "";
  const confidenceLabel = homepage.weeklyDecisionCardModel.status.confidenceLabel;
  const regime = homepage.reportShell.regime;
  const publicRegimeLabel = getRegimePublicLabel(regime);
  const macroTrendline = regimeHistory.slice(-24);

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

  const canonicalDecision = homepage.weeklyDecisionCardModel.decision.canonicalDecisionCopy;
  const primaryCall = canonicalDecision?.doNowLines?.[0] ?? homepage.weeklyDecisionCardModel.decision.actionNowShort ?? weeklyLeadershipSummary.shorthandLine;
  const flipConditionLabels = homepage.weeklyDecisionCardModel.decision.compactFlipConditionLabels ?? [];

  const v2HeroSignalData = buildV2HeroSignalData(reportData);

  const transition = computeTransitionProbability(regime);
  const toolHighlight = transition.probability > 50 ? "Transition" : Math.abs(tightnessDelta) > 3 ? "Simulator" : undefined;

  const guardrailThresholdRaw = homepage.weeklyDecisionCardModel.decision.guardrailThreshold;
  const parsedGuardrailThreshold = typeof guardrailThresholdRaw === "number"
    ? guardrailThresholdRaw
    : Number.parseFloat(String(guardrailThresholdRaw ?? ""));
  const pauseThreshold = Number.isFinite(parsedGuardrailThreshold) ? parsedGuardrailThreshold : 70;

  const enrichmentPromise = homepage.workspaceModelPromise ?? Promise.resolve();

  const numericGuardrailLabel = Number.isFinite(parsedGuardrailThreshold)
    ? `tightness crosses ${parsedGuardrailThreshold}`
    : undefined;
  const guardrailLabel = numericGuardrailLabel
    ?? homepage.weeklyDecisionCardModel.decision.guardrail
    ?? (typeof guardrailThresholdRaw === "string" ? guardrailThresholdRaw : undefined);
  const reversalTriggerLabel = homepage.weeklyDecisionCardModel.decision.reversalTrigger;
  const briefShareLines = [
    homepage.weeklyDecisionCardModel.decision.actionNowShort
      ? `Do now: ${homepage.weeklyDecisionCardModel.decision.actionNowShort}`
      : null,
    guardrailLabel ? `Guardrail: ${guardrailLabel}` : null,
    reversalTriggerLabel ? `Reversal: ${reversalTriggerLabel}` : null,
    flipConditionLabels.length > 0 ? `Flip watch: ${flipConditionLabels.join("; ")}` : null,
  ].filter((line): line is string => Boolean(line));

  return (
    <>
      <h1 className="sr-only" id="share-ready-artifact">Weekly Brief</h1>
      <FreshnessDot
        label={homepage.reportShell.fetchedAtLabel}
        recordDate={homepage.reportShell.recordDateLabel}
        treasurySource={homepage.reportShell.treasurySource}
        trustStatusLabel={homepage.reportShell.trustStatusLabel}
        degradedSourceRows={homepage.reportShell.degradedSourceRows}
        showOfflineBadge={homepage.reportShell.showOfflineBadge}
      />
      {isDegraded ? (
        <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-fluid-micro">
          <span className="font-semibold text-amber-300/80">Some data is cached.</span>{" "}
          <span className="text-amber-300/50">Stage decisions but don&apos;t commit until live data returns.</span>
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_18rem] lg:gap-8">
        <div className="space-y-6 min-w-0">
          <SwipeableWeek
            currentMonth={searchParams?.month ? parseInt(searchParams.month, 10) : undefined}
            currentYear={searchParams?.year ? parseInt(searchParams.year, 10) : undefined}
            serverMonths={macroTrendline.map((entry) => {
              const d = new Date(entry.record_date);
              return {
                recordDate: entry.record_date,
                month: d.getMonth() + 1,
                year: d.getFullYear(),
              };
            })}
          >
            {activeCadence !== "weekly" && cadenceData ? (
              <CadenceCallCard cadence={activeCadence} data={cadenceData} />
            ) : null}
           <DecisionHero
               tightness={tightness}
               tightnessDelta={tightnessDelta}
               riskAppetite={riskAppetite}
               boldnessScore={weeklyLeadershipSummary.boldnessScore}
               boldnessDelta={weeklyLeadershipSummary.boldnessDelta}
               boldnessShorthand={weeklyLeadershipSummary.shorthandLine}
               weeklyCall={primaryCall}
               actionNow={homepage.weeklyDecisionCardModel.decision.actionNowShort}
               regime={regime}
               postureLabel={postureLabel}
               signalDirection={signalDirection}
               recordDate={homepage.reportShell.recordDateLabel}
               fetchedAt={homepage.reportShell.fetchedAtLabel}
               operatorContext={operatorContext}
               confidenceLabel={confidenceLabel}
               trustStatusLabel={homepage.reportShell.trustStatusLabel}
               treasurySource={homepage.reportShell.treasurySource}
               degradedCount={homepage.reportShell.degradedSourceRows?.length ?? 0}
                isFallback={homepage.reportShell.showOfflineBadge}
                signalData={v2HeroSignalData}
                flipConditions={flipConditionLabels}
                transitionProbability={transition.probability}
                guardrail={guardrailLabel}
                reversalTrigger={reversalTriggerLabel}
                shareLines={briefShareLines}
               />

            <ThreeWhethersCard
               signalDirection={signalDirection}
               tightness={tightness}
               guardrail={numericGuardrailLabel}
             />

            <WeeklyTopFoldContract
               model={homepage.weeklyDecisionCardModel}
               memoryRegimes={macroTrendline}
             />

             <CompareStrip
              currentRegime={regime}
              currentTightness={tightness}
              tightnessDelta={tightnessDelta}
              serverPrevious={macroTrendline.length >= 2 ? { regime: macroTrendline[macroTrendline.length - 2].regime, recordDate: macroTrendline[macroTrendline.length - 2].record_date } : null}
              autoExpand={Math.abs(tightnessDelta) >= 3 || (macroTrendline.length >= 2 && macroTrendline[macroTrendline.length - 2].regime !== regime)}
            />
          </SwipeableWeek>

          <Suspense fallback={
            <div className="space-y-6">
              <div className="weather-card h-20 animate-pulse" />
              <div className="weather-card h-32 animate-pulse" />
              <div className="weather-card h-12 animate-pulse" />
            </div>
          }>
            <BelowTheFoldEvidence
              enrichmentPromise={enrichmentPromise}
              highlight={toolHighlight}
              tightness={tightness}
              boldnessScore={weeklyLeadershipSummary.boldnessScore}
              pauseThreshold={pauseThreshold}
              currentRiskAppetite={riskAppetite}
              currentRegime={homepage.weeklyDecisionCardModel.status.postureLabel}
              regimes={macroTrendline}
              companyStage={operatorContext.companyStage ?? undefined}
              tightnessDelta={tightnessDelta}
              riskAppetiteDelta={riskAppetiteDelta}
              recordDate={homepage.reportShell.recordDateLabel}
              recentRecordDates={macroTrendline.slice(-4).map((entry) => formatDateUTC(entry.record_date))}
            />
          </Suspense>
        </div>

          <div className="space-y-4 lg:col-start-2">
          <Suspense fallback={<div className="weather-card h-48 animate-pulse" />}>
            <BelowTheFoldHistory
              enrichmentPromise={enrichmentPromise}
              regimes={macroTrendline}
            />
          </Suspense>
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
    </>
  );
}

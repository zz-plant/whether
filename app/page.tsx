import type { Metadata } from "next";
import { buildHomeMetadata, type HomePageSearchParams } from "../lib/report/homeMetadata";
import { ActionLink } from "./components/ui/actionLink";
import { buildPublishedBriefPath, selectCitablePermalinkBrief } from "../lib/report/publishedBriefs";
import { loadHomePageAssembly } from "../lib/report/homePageAssemblyLoader";
import { Shell } from "./components/Shell";
import { DecisionHero } from "./components/DecisionHero";
import { RitualCheck } from "./components/RitualCheck";
import { DecisionStalenessPanel } from "./components/home/DecisionStalenessPanel";
import { SubscribeForm } from "./components/SubscribeForm";
import { StickyCallStrip } from "./components/StickyCallStrip";
import { DecisionPlanStressTester } from "./components/DecisionPlanStressTester";
import { CompareStrip } from "./components/CompareStrip";
import { ActivationTracker } from "./components/activationTracker";
import { FirstVisitExplainer } from "./components/homeFirstRunOrientation";
import { isDisclosureOpenInParams } from "./components/ui/disclosureUrlState";
import { FreshnessDot } from "./components/FreshnessDot";
import { SwipeableWeek } from "./components/SwipeableWeek";
import { CadenceCallCard } from "./components/CadenceCallCard";
import { buildCadenceCallModel, type CadenceCallHorizon } from "../lib/report/cadenceCallModel";
import { getRegimePublicLabel } from "../lib/regimePresentation";
import { DECISION_CONTRACT_LABELS } from "../lib/report/reportCopy";
import {
  buildV2HeroSignalData,
  type SignalDirection,
} from "./viewModel";
import { formatDateUTC, formatMonthYearShortFromValue } from "../lib/formatters";
import { buildBoldnessScore } from "../lib/report/weeklyLeadershipBrief";
import { decisionAreaLabel } from "../lib/report/boundedDecisionRules";
import { getMonthlyRegimeHistory } from "../lib/summary/monthlyRegimeHistory";
import { HomeBriefLoadError } from "./components/home/HomeBriefLoadError";
import { buildTimeMachineHref, parseTimeMachineRequest } from "../lib/timeMachine/timeMachineSelection";
import { resolveHistoricalDate } from "../lib/timeMachine/timeMachine";

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
    </Shell>
  );
}

/**
 * This view changes every week under one URL, so it cannot be cited or indexed as
 * a dated article. Point at the frozen copy of the week instead.
 *
 * Gated on how far the archive has fallen behind. When the freeze job stops
 * running this module keeps rendering the last week it managed to write, which
 * stamps an old date onto the one screen whose entire claim is that it is
 * current — the module then argues against the page it sits on. Rendering
 * nothing is the safer failure.
 */
/* The card carries no elevation: it sits inside the brief column, and a nested
 * box that lifts off its own container is what the depth ladder in surfaces.css
 * exists to prevent. That rule cannot reach a shadow written as a utility, so
 * this one stays removed at the call site. */
function CanonicalWeekPermalink({ currentRecordDate }: { currentRecordDate: string }) {
  const brief = selectCitablePermalinkBrief(currentRecordDate);
  if (!brief) return null;

  return (
    <section className="rounded-xl border border-slate-800/80 bg-slate-900/50 backdrop-blur-md space-y-2.5 px-4 py-3.5">
      <p className="text-fluid-xs text-slate-300">
        This week is published as a permanent record dated <span className="font-medium text-white">{brief.recordDateLabel}</span>.
      </p>
      <ActionLink href={buildPublishedBriefPath(brief.slug)} variant="pill">
        Citable permalink
      </ActionLink>
    </section>
  );
}

type BelowTheFoldEvidenceProps = {
  tightness: number;
  riskAppetite: number;
  recordDate: string;
  recentRecordDates: string[];
  operateHref?: string;
  /** Named for the selected cadence, so the one plan CTA on the page matches the
   *  horizon the reader is looking at. */
  planLabel?: string;
};

function BelowTheFoldEvidence(props: BelowTheFoldEvidenceProps) {
  return (
    <>
      <DecisionStalenessPanel
        conditions={{ tightness: props.tightness, riskAppetite: props.riskAppetite }}
      />

      {/* `pill`, not `primary`. DD-005 settled Copy Brief in the hero as the one
          canonical primary action on this page; a second full-weight blue button
          further down competed with it and gave the reader no way to rank them.
          §X reserves `pill` for exactly this — a secondary navigation CTA. */}
      <div className="mt-4 border-t border-white/[0.06] pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ActionLink href={props.operateHref ?? "/operate"} variant="pill">
            {props.planLabel ?? "Build this week’s plan →"}
          </ActionLink>
          <RitualCheck
            recordDate={props.recordDate}
            recentRecordDates={props.recentRecordDates}
          />
        </div>
      </div>
    </>
  );
}

/** Only the horizons the cadence selector offers. `yearly` is a valid agent cadence but
 *  has no tab, so an arbitrary ?cadence= value falls back to the weekly default. */
const HOME_CADENCE_HORIZONS: readonly CadenceCallHorizon[] = ["monthly", "quarterly"];

const resolveHomeCadence = (value: string | undefined): CadenceCallHorizon | "weekly" =>
  HOME_CADENCE_HORIZONS.find((horizon) => horizon === value) ?? "weekly";

async function PageContent({
  searchParams,
  regimeHistory,
}: {
  searchParams?: HomePageSearchParams;
  regimeHistory: ReturnType<typeof getMonthlyRegimeHistory>;
}) {
  const activeCadence = resolveHomeCadence(searchParams?.cadence);

  let data: Awaited<ReturnType<typeof loadHomePageAssembly>>;

  try {
    data = await loadHomePageAssembly(searchParams);
  } catch {
    return <HomeBriefLoadError />;
  }

  const { homepage, reportData } = data;
  const isDegraded = !homepage.reportResult.ok;

  const timeMachineRequest = parseTimeMachineRequest(searchParams);
  const operateHref = buildTimeMachineHref("/operate", timeMachineRequest);

  const postureLabel = homepage.weeklyDecisionCardModel.status.postureWithStageLabel ?? "";
  const confidenceLabel = homepage.weeklyDecisionCardModel.status.confidenceLabel;
  const regime = homepage.reportShell.regime;
  const publicRegimeLabel = getRegimePublicLabel(regime);
  const activeStage = homepage.weeklyDecisionCardModel.decision.startupVariantPolicy.selectedMode;

  const asOfDate = timeMachineRequest
    ? resolveHistoricalDate(timeMachineRequest.year, timeMachineRequest.month)
    : null;
  const asOfTimestamp = asOfDate ? new Date(asOfDate).getTime() : Number.NaN;
  const alignedRegimeHistory = Number.isFinite(asOfTimestamp)
    ? regimeHistory.filter((entry) => new Date(entry.record_date).getTime() <= asOfTimestamp)
    : regimeHistory;
  const macroTrendline = alignedRegimeHistory.slice(-24);

  // Same score the hero headlines, computed back across the window so the number
  // carries its own history. Months missing either input are dropped rather than
  // interpolated — a gap is honest, an invented point is not.
  const boldnessTrend = macroTrendline.flatMap((entry) =>
    entry.tightness != null && entry.riskAppetite != null
      ? [{
          label: formatMonthYearShortFromValue(entry.record_date),
          value: buildBoldnessScore(entry.tightness, entry.riskAppetite),
        }]
      : [],
  );

  const signalDeltas = new Map(
    homepage.weeklyDecisionCardModel.decision.reportDynamics.changedSignals.map((s) => [s.key, s.delta] as const)
  );
  const tightnessDelta = signalDeltas.get("tightness") ?? 0;
  const riskAppetiteDelta = signalDeltas.get("riskAppetite") ?? 0;

  // Derived from `assessment.scores` rather than from the diagnostics copy so the prior
  // read and the current one come off the same series. `changedSignals` is empty both
  // when nothing moved and when there is no prior read at all, and the two are not the
  // same claim — so an empty list yields no prior read rather than an invented flat one.
  const cadencePreviousScores = signalDeltas.size > 0
    ? {
        tightness: reportData.assessment.scores.tightness - tightnessDelta,
        riskAppetite: reportData.assessment.scores.riskAppetite - riskAppetiteDelta,
      }
    : null;

  // Built here rather than fetched: the previous card awaited the whole agent-interface
  // payload behind Suspense and swallowed its failure, which is why every cadence tab
  // rendered the same page. Everything it needs is already loaded and in hand.
  const cadenceCall =
    activeCadence === "weekly"
      ? null
      : buildCadenceCallModel({
          horizon: activeCadence,
          assessment: reportData.assessment,
          recordDate: reportData.treasury.record_date,
          recordDateLabel: homepage.reportShell.recordDateLabel,
          regimeHistory: alignedRegimeHistory,
          planHref: operateHref,
          previousScores: cadencePreviousScores,
        });

  const tightness = homepage.weeklyDecisionCardModel.diagnostics.currentScores.tightness;
  const riskAppetite = homepage.weeklyDecisionCardModel.diagnostics.currentScores.riskAppetite;
  const weeklyLeadershipSummary = homepage.weeklyDecisionCardModel.decision.weeklyLeadershipSummary;

  const signalDirection: SignalDirection = (
    homepage.weeklyDecisionCardModel.status.trendLabel?.toLowerCase().includes("tighten") ? "tighten"
    : homepage.weeklyDecisionCardModel.status.trendLabel?.toLowerCase().includes("ease") ? "ease"
    : "hold"
  );

  const canonicalDecision = homepage.weeklyDecisionCardModel.decision.canonicalDecisionCopy;
  const primaryCall = canonicalDecision?.doNowLines?.[0] ?? homepage.weeklyDecisionCardModel.decision.actionNowShort ?? weeklyLeadershipSummary.shorthandLine;
  const flipConditionLabels = homepage.weeklyDecisionCardModel.decision.compactFlipConditionLabels ?? [];
  const revisitQueue = homepage.weeklyDecisionCardModel.decision.revisitQueue;
  const revisitAreaIds = new Set(revisitQueue.map((item) => item.id));
  const noChangeAreas = homepage.weeklyDecisionCardModel.decision.decisionRules
    .filter((rule) => !revisitAreaIds.has(rule.area))
    .map((rule) => decisionAreaLabel(rule.area));

  const v2HeroSignalData = buildV2HeroSignalData(reportData);

  const guardrailThresholdRaw = homepage.weeklyDecisionCardModel.decision.guardrailThreshold;
  const parsedGuardrailThreshold = typeof guardrailThresholdRaw === "number"
    ? guardrailThresholdRaw
    : Number.parseFloat(String(guardrailThresholdRaw ?? ""));

  const numericGuardrailLabel = Number.isFinite(parsedGuardrailThreshold)
    ? `Funding pressure crosses ${parsedGuardrailThreshold}`
    : undefined;
  const guardrailLabel = numericGuardrailLabel
    ?? homepage.weeklyDecisionCardModel.decision.guardrail
    ?? (typeof guardrailThresholdRaw === "string" ? guardrailThresholdRaw : undefined);
  const reversalTriggerLabel = homepage.weeklyDecisionCardModel.decision.reversalTrigger;
  const briefShareLines = [
    homepage.weeklyDecisionCardModel.decision.actionNowShort
      ? `${DECISION_CONTRACT_LABELS.action.doNow}: ${homepage.weeklyDecisionCardModel.decision.actionNowShort}`
      : null,
    guardrailLabel ? `${DECISION_CONTRACT_LABELS.threshold.guardrail}: ${guardrailLabel}` : null,
    reversalTriggerLabel ? `${DECISION_CONTRACT_LABELS.reversal.reversal}: ${reversalTriggerLabel}` : null,
    flipConditionLabels.length > 0
      ? `${DECISION_CONTRACT_LABELS.watch.flipWatch}: ${flipConditionLabels.join("; ")}`
      : null,
  ].filter((line): line is string => Boolean(line));

  return (
    <>
      <h1 className="sr-only" id="share-ready-artifact">
        {cadenceCall
          ? [cadenceCall.cadenceLabel, cadenceCall.periodLabel].filter(Boolean).join(" — ")
          : "Weekly Brief"}
      </h1>
      <ActivationTracker path="/" />
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
      <div className="mx-auto max-w-[64rem] space-y-8">
        <div className="space-y-8 min-w-0">
          {/* Above the brief, not after it. This is the orientation line for a
              first-time visitor, and it sat below the hero, all three operating
              levers, and the compare strip — roughly 2,800px down on mobile,
              where it cannot orient anyone. Its own bottom-border styling was
              always that of a top strip. Hiding once dismissed is a global CSS
              rule keyed on the data attribute (app/layout.tsx), so it stays
              pre-paint and CLS-free at either position. */}
          <FirstVisitExplainer />
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
            {cadenceCall ? <CadenceCallCard model={cadenceCall} /> : null}
            <DecisionHero
              tightness={tightness}
              tightnessDelta={tightnessDelta}
              riskAppetite={riskAppetite}
              riskAppetiteDelta={riskAppetiteDelta}
              boldnessScore={weeklyLeadershipSummary.boldnessScore}
              boldnessDelta={weeklyLeadershipSummary.boldnessDelta}
              boldnessTrend={boldnessTrend}
              boldnessShorthand={weeklyLeadershipSummary.shorthandLine}
              weeklyCall={primaryCall}
              actionNow={homepage.weeklyDecisionCardModel.decision.actionNowShort}
              regime={regime}
              postureLabel={postureLabel}
              signalDirection={signalDirection}
              recordDate={homepage.reportShell.recordDateLabel}
              fetchedAt={homepage.reportShell.fetchedAtLabel}
              confidenceLabel={confidenceLabel}
              trustStatusLabel={homepage.reportShell.trustStatusLabel}
              treasurySource={homepage.reportShell.treasurySource}
              degradedCount={homepage.reportShell.degradedSourceRows?.length ?? 0}
              isFallback={homepage.reportShell.showOfflineBadge}
              signalData={v2HeroSignalData}
              signalIndicators={homepage.weeklyDecisionCardModel.diagnostics.regimeSignalIndicators}
              flipConditions={flipConditionLabels}
              guardrail={guardrailLabel}
              reversalTrigger={reversalTriggerLabel}
              shareLines={briefShareLines}
              revisitDecisions={homepage.weeklyDecisionCardModel.decision.revisitDecisions}
              revisitQueue={revisitQueue}
              noChangeAreas={noChangeAreas}
              thresholdBusinessConsequence={homepage.weeklyDecisionCardModel.decision.thresholdBusinessConsequence}
              signalBreakdownOpen={isDisclosureOpenInParams(searchParams, "why")}
              activeStage={activeStage}
            />

            <DecisionPlanStressTester
              assessment={reportData.assessment}
              recordDate={homepage.reportShell.recordDateLabel}
            />

            <CompareStrip
              currentRegime={regime}
              currentTightness={tightness}
              tightnessDelta={tightnessDelta}
              riskAppetite={riskAppetite}
              riskAppetiteDelta={riskAppetiteDelta}
              currentRecordDate={homepage.reportShell.recordDateLabel}
              serverPrevious={macroTrendline.length >= 2 ? { regime: macroTrendline[macroTrendline.length - 2].regime, recordDate: macroTrendline[macroTrendline.length - 2].record_date } : null}
            />
          </SwipeableWeek>

          <BelowTheFoldEvidence
            tightness={tightness}
            riskAppetite={riskAppetite}
            recordDate={homepage.reportShell.recordDateLabel}
            recentRecordDates={macroTrendline.slice(-4).map((entry) => formatDateUTC(entry.record_date))}
            operateHref={operateHref}
            planLabel={cadenceCall?.planLabel}
          />
        </div>

        <div className="space-y-4 border-t border-slate-800/70 pt-6">
          <SubscribeForm />
          <CanonicalWeekPermalink currentRecordDate={reportData.treasury.record_date} />
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
        direction={signalDirection}
        boldnessScore={weeklyLeadershipSummary.boldnessScore}
        boldnessDelta={weeklyLeadershipSummary.boldnessDelta}
        shareLines={briefShareLines}
      />
    </>
  );
}

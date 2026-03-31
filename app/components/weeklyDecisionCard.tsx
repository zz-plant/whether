import type { ReactNode } from "react";
import { WeeklyCallModePanel } from "./weeklyCallModePanel";
import { DecisionHeroSection } from "./weekly-card/DecisionHeroSection";
import { DiagnosticsSection } from "./weekly-card/DiagnosticsSection";
import { ActionStripSection } from "./weekly-card/ActionStripSection";
import { BoundedRulesMatrix } from "./weekly-card/BoundedRulesMatrix";
import { ConfidenceMiniChart } from "./weekly-card/ConfidenceMiniChart";
import { InputInfluenceSection } from "./weekly-card/InputInfluenceSection";
import {
  MoreContextDisclosureBody,
} from "./weekly-card/MoreContextDisclosureBody";
import { DecisionTransmissionRail } from "./weekly-card/DecisionTransmissionRail";
import {
  buildPolicyDetails,
  buildRoleHref,
  buildRoleTranslationCards,
  getOwnerLabelForArea,
  resolveRoleView,
} from "./weekly-card/policySupport";
import type { DiagnosticsSectionProps } from "./weekly-card/types";
import {
  compactInset,
  disclosureSummaryClass,
  sectionSpacing,
  tierOneHeading,
  tierOnePanel,
} from "./weekly-card/shared";
import { RegimeBanner } from "./weekly-card/regime-banner/RegimeBanner";
import { WeeklyDecisionContent } from "./weekly-card/decision-content/WeeklyDecisionContent";
import type { RegimeKey } from "../../lib/regimeEngine";
import type {
  StartupVariantPolicy,
  WeeklyDecisionCardViewModel,
} from "../../lib/report/homeBriefModel";
import { buildCompactFreshnessMeta } from "../../lib/report/reportFormatting";
import { buildWeeklyCitationMetaLine, buildTrustMarker } from "../../lib/report/trustStatus";

/**
 * Loop stage owner: presentation/artifact.
 *
 * This component renders decision-ready artifacts from view models and should
 * avoid deriving posture/threshold policy logic directly.
 */

export type WeeklyDecisionCardProps = {
  model: WeeklyDecisionCardViewModel;
  actions?: ReactNode;
  diagnosticsLane?: ReactNode;
  searchParams?: Record<string, string | undefined>;
};

export type WeeklyDecisionDiagnosticsLaneProps = DiagnosticsSectionProps;
export const WeeklyDecisionDiagnosticsLane = DiagnosticsSection;
// Legacy hero export retained for isolated section tests only.
export const DecisionCallHeader = DecisionHeroSection;
export { BoundedRulesMatrix } from "./weekly-card/BoundedRulesMatrix";
export { MoreContextDisclosureBody } from "./weekly-card/MoreContextDisclosureBody";

export function WeeklyDecisionCard(props: WeeklyDecisionCardProps) {
  const { model, actions, diagnosticsLane, searchParams } = props;
  const { status, decision, presentation, diagnostics, history, artifact } = model;
  const {
    statusLabel,
    regimeKey,
    postureLabel,
    stageLabel,
    postureWithStageLabel,
    confidenceLabel,
    confidencePercent,
    confidenceHistory = [],
    confidenceTrend,
    trendLabel,
    isFallbackSnapshot = false,
  } = status;
  const {
    operatingStanceLine,
    weeklyMemoLines,
    guardrail,
    reversalTrigger,
    actionNowShort,
    immediateDecision,
    guardrailThreshold,
    flipThreshold,
    compactFlipConditionLabels = [],
    canonicalDecisionCopy,
    canonicalFlipConditions = [],
    reportDynamics,
    decisionShiftSummary,
    transitionProbabilities,
    decisionRules,
    decisionMatrix,
    actionStripItems = [],
    startupVariantPolicy,
    roleAwareTemplates,
    executiveOperationalStance,
    revisitDecisions,
    weeklyMovement,
  } = decision;
  const {
    whyItMattersLine,
    glossaryHref,
  } = presentation ?? {};
  const {
    regimeDistance,
    flipRiskMeter,
    evidenceItems,
    failureModes = [],
    inputInfluence = [],
    currentScores,
    startupClimateIndex,
    whyThisCall,
  } = diagnostics;
  const {
    memoryRail,
    historicalTimeline,
    historicalAnalogs,
    lastYearComparison,
    macroOverlay,
  } = history;
  const sinceLastReview = model.sinceLastReview;
  const { citation, recordDateLabel, fetchedAtLabel } = artifact;
  const freshnessMeta = buildCompactFreshnessMeta({
    updatedAtLabel: fetchedAtLabel,
    confidenceLabel,
    isFallbackSnapshot,
  });
  const freshnessLabel = freshnessMeta.updatedAtLabel;
  const citationMetaLine = buildWeeklyCitationMetaLine({
    statusLabel,
    confidenceLabel,
    recordDateLabel,
    freshnessLabel,
  });
  const inlineTrustMarker = buildTrustMarker({
    confidenceLabel,
    freshnessMeta,
    isFallbackSnapshot,
  });
  const snapshotDoNow = immediateDecision;
  const snapshotGuardrail = guardrailThreshold?.trim()
    || executiveOperationalStance.avoid[0]?.trim()
    || guardrail;
  const snapshotWatch = canonicalDecisionCopy?.flipTrigger ?? flipThreshold ?? reversalTrigger;
  const structuredFlipLabels = canonicalFlipConditions
    .map((condition) => condition.label.trim())
    .filter((label) => label.length > 0)
    .filter((label, index, labels) => labels.indexOf(label) === index)
    .slice(0, 4);
  const canonicalFlipLabels = (canonicalDecisionCopy?.flipConditions ?? [])
    .map((label) => label.trim())
    .filter((label) => label.length > 0)
    .filter((label, index, labels) => labels.indexOf(label) === index)
    .slice(0, 4);
  const effectiveFlipLabels = canonicalFlipLabels.length > 0
    ? canonicalFlipLabels
    : structuredFlipLabels.length > 0
    ? structuredFlipLabels
    : compactFlipConditionLabels.filter((label, index, labels) => labels.indexOf(label) === index).slice(0, 4);
  const stabilityRule = "Stability rule: act on posture shifts only after 2 consecutive weekly reads, unless the flip trigger fires at HIGH confidence.";
  const trustStateLabel = inlineTrustMarker.label.toUpperCase();
  const trustStateDetail = inlineTrustMarker.detail;
  const decisionBullets = [
    { label: "What changed", detail: decisionShiftSummary.replace(/^Changed:\s*/i, "").trim() },
    { label: "What that changes", detail: immediateDecision.trim() },
    { label: "What to revisit", detail: guardrail.trim() },
    { label: "What would flip", detail: snapshotWatch.trim() },
  ];
  const guardrailPolicyDetails = buildPolicyDetails({
    rule: decisionRules.find((rule) => rule.area === "burn-discipline") ?? decisionRules[0],
    summary: "Use this as the enforceable weekly boundary before approving new fixed-cost commitments.",
    fallbackOwner: "CFO",
  });
  const flipPolicyDetails = canonicalFlipConditions[0]
    ? {
      summary: "This is the pre-committed trigger that reopens the weekly posture call.",
      chips: [
        `Metric ${canonicalFlipConditions[0].metric === "riskAppetite" ? "Risk appetite" : "Tightness"}`,
        `Trigger ${canonicalFlipConditions[0].operator} ${canonicalFlipConditions[0].value.toFixed(1)}`,
        `Owner ${getOwnerLabelForArea(canonicalFlipConditions[0].area)}`,
      ],
    }
    : buildPolicyDetails({
      rule: decisionRules.find((rule) => rule.area === "product-tempo") ?? decisionRules[0],
      summary: "Use the primary flip trigger to decide when this week’s posture should be revisited.",
      fallbackOwner: "CEO",
    });
  const roleTranslations = buildRoleTranslationCards({ decisionRules });
  const activeRole = resolveRoleView(searchParams?.role);
  const roleHrefs = {
    finance: buildRoleHref("finance", searchParams),
    product: buildRoleHref("product", searchParams),
  };

  const hasMaterialTrustDelta = inlineTrustMarker.degraded;
  const resolvedStartupVariantPolicy = startupVariantPolicy ?? {
    selectedMode: "series-a",
    options: [
      { mode: "seed", label: "Seed" },
      { mode: "series-a", label: "Series A" },
      { mode: "series-b", label: "Series B" },
      { mode: "growth", label: "Growth" },
      { mode: "public", label: "Public" },
      { mode: "bootstrapped", label: "Bootstrapped" },
    ],
    adjustmentsByMode: {
      seed: {
        mode: "seed",
        label: "Seed",
        description: "Protect runway while preserving rapid proof loops.",
        doNowAdjustments: ["Prioritize experiments that can prove customer pull inside one sprint."],
        avoidAdjustments: ["Avoid bundling multiple irreversible hires before one milestone clears."],
        watchAdjustments: ["Runway trigger: tighten immediately when boundary distance compresses."],
        thresholdEmphasis: "Emphasize runway and evidence cadence over growth breadth.",
        reversalTriggerDiscipline: "Reverse to faster hiring only after improving reads and shipped traction proof.",
      },
      "series-a": {
        mode: "series-a",
        label: "Series A",
        description: "Balance growth tempo with repeatability proof.",
        doNowAdjustments: ["Scale only where activation and retention targets are tracking."],
        avoidAdjustments: ["Avoid parallel expansion programs that obscure payback accountability."],
        watchAdjustments: ["Payback trigger: revisit if boundary distance narrows."],
        thresholdEmphasis: "Emphasize payback windows and repeatable pipeline conversion.",
        reversalTriggerDiscipline: "Reverse to aggressive expansion only after trigger clears and conversion quality holds.",
      },
      "series-b": {
        mode: "series-b",
        label: "Series B",
        description: "Protect operating leverage while preserving selective scale lanes.",
        doNowAdjustments: ["Concentrate approvals on lanes with measurable efficiency lift."],
        avoidAdjustments: ["Avoid fixed-cost expansions that assume forward multiple recovery."],
        watchAdjustments: ["Leverage trigger: hold expansion when boundary distance compresses."],
        thresholdEmphasis: "Emphasize efficiency lift and margin durability before headcount scale.",
        reversalTriggerDiscipline: "Reverse to broader scaling only when both boundaries clear resume bands.",
      },
      growth: {
        mode: "growth",
        label: "Growth",
        description: "Scale durable GTM and platform leverage without losing unit discipline.",
        doNowAdjustments: ["Concentrate scale on channels with proven CAC payback inside the planning window."],
        avoidAdjustments: ["Avoid top-line-first expansions that outrun support and margin readiness."],
        watchAdjustments: ["Growth trigger: rephase expansion when either boundary distance compresses."],
        thresholdEmphasis: "Emphasize CAC payback, retention durability, and support capacity before adding fixed cost.",
        reversalTriggerDiscipline: "Reverse to faster scaling only after conversion efficiency and macro reads improve together.",
      },
      public: {
        mode: "public",
        label: "Public",
        description: "Prioritize earnings resilience and guided execution consistency.",
        doNowAdjustments: ["Bias capital allocation toward initiatives with near-term margin and cash-flow reliability."],
        avoidAdjustments: ["Avoid guidance-risk programs that depend on optimistic macro re-rating."],
        watchAdjustments: ["Guidance trigger: tighten discretionary spend when boundary distance narrows."],
        thresholdEmphasis: "Emphasize earnings durability, cash conversion, and guidance credibility.",
        reversalTriggerDiscipline: "Reverse to broader spend only after boundary pressure eases and guidance confidence improves.",
      },
      bootstrapped: {
        mode: "bootstrapped",
        label: "Bootstrapped",
        description: "Maximize cash durability and compounding customer value.",
        doNowAdjustments: ["Prioritize self-funded growth loops with near-term cash payback."],
        avoidAdjustments: ["Avoid commitments that require external financing to finish."],
        watchAdjustments: ["Cash trigger: tighten spend when either boundary narrows."],
        thresholdEmphasis: "Emphasize cash conversion and reversible commitments over growth optics.",
        reversalTriggerDiscipline: "Reverse to higher spend only after cash payback proof holds across weekly reads.",
      },
    },
  } satisfies StartupVariantPolicy;
  const resolvedRegimeKey = regimeKey ?? "DEFENSIVE";

  return (
    <section className="weather-panel space-y-4 px-4 py-4 sm:space-y-5 sm:px-5 sm:py-5 lg:px-6 lg:py-6" aria-labelledby="weekly-posture-brief-title">
      <RegimeBanner
        statusLabel={statusLabel}
        regimeKey={resolvedRegimeKey}
        postureLabel={postureLabel}
        stageLabel={stageLabel}
        postureWithStageLabel={postureWithStageLabel}
        recordDateLabel={recordDateLabel}
        confidencePercent={confidencePercent}
        confidenceLabel={confidenceLabel}
        trendLabel={trendLabel}
        regimeDistance={regimeDistance}
        flipRiskMeter={flipRiskMeter}
      />

      <WeeklyDecisionContent
        modePanel={(
          <WeeklyCallModePanel
            startupVariantPolicy={resolvedStartupVariantPolicy}
            postureLabel={postureWithStageLabel ?? statusLabel}
            operatingCall={canonicalDecisionCopy?.operatingCall ?? operatingStanceLine}
            trendLabel={trendLabel}
            confidencePercent={confidencePercent}
            confidenceLabel={confidenceLabel}
            snapshotGuardrail={snapshotGuardrail}
            snapshotWatch={snapshotWatch}
            revisitDecisions={revisitDecisions}
            effectiveFlipLabels={effectiveFlipLabels}
            compactInsetClassName={compactInset}
            tierOnePanelClassName={tierOnePanel}
            sectionSpacingClassName={sectionSpacing}
            tierOneHeadingClassName={tierOneHeading}
            whyItMattersLine={whyItMattersLine}
            needsTrustWarning={hasMaterialTrustDelta}
            trustStateLabel={trustStateLabel}
            trustStateDetail={trustStateDetail}
            trustReason={isFallbackSnapshot ? artifact.freshnessLine : undefined}
            inlineTrustLabel={inlineTrustMarker.label}
            inlineTrustTone={inlineTrustMarker.tone}
            stabilityRule={stabilityRule}
            decisionBullets={decisionBullets}
            guardrailPolicyDetails={guardrailPolicyDetails}
            flipPolicyDetails={flipPolicyDetails}
            roleTranslations={roleTranslations}
            activeRole={activeRole}
            roleHrefs={roleHrefs}
            glossaryHref={glossaryHref}
          />
        )}
        influenceSection={inputInfluence.length > 0 ? (
          <details className="group rounded-lg border border-slate-800/55 bg-slate-950/35 px-2.5 py-2">
            <summary className={`${disclosureSummaryClass} cursor-pointer list-none`}>
              <span>Input influence</span>
              <span aria-hidden="true" className="weather-disclosure-trigger-indicator text-sm group-open:rotate-180">▾</span>
            </summary>
            <div className="weather-disclosure-panel animate-collapsible-in mt-2">
              <InputInfluenceSection items={inputInfluence} />
            </div>
          </details>
        ) : null}
        diagnosticsSection={(
          <details className="group rounded-lg border border-slate-800/55 bg-slate-950/35 px-2.5 py-2">
            <summary className={`${disclosureSummaryClass} cursor-pointer list-none`}>
              <span>Diagnostics</span>
              <span aria-hidden="true" className="weather-disclosure-trigger-indicator text-sm group-open:rotate-180">▾</span>
            </summary>
            <div className="weather-disclosure-panel animate-collapsible-in mt-2">
              {diagnosticsLane ?? (
                <DiagnosticsSection
                  weeklyMemoLines={weeklyMemoLines}
                  immediateDecision={immediateDecision}
                  revisitDecisions={revisitDecisions}
                  guardrail={guardrail}
                  regimeDistance={regimeDistance}
                  postureWithStageLabel={postureWithStageLabel}
                  statusLabel={statusLabel}
                  trendLabel={trendLabel}
                  confidencePercent={confidencePercent}
                  decisionMatrix={decisionMatrix}
                  decisionRules={decisionRules}
                  roleAwareTemplates={roleAwareTemplates}
                  evidenceItems={evidenceItems}
                  reportDynamics={reportDynamics}
                  weeklyMovement={weeklyMovement}
                  transitionProbabilities={transitionProbabilities}
                  failureModes={failureModes}
                  sinceLastReview={sinceLastReview}
                />
              )}
            </div>
          </details>
        )}
        matrixSection={(
          <details className="group rounded-lg border border-slate-800/55 bg-slate-950/35 px-2.5 py-2">
            <summary className={`${disclosureSummaryClass} cursor-pointer list-none`}>
              <span>Bounded rules matrix</span>
              <span aria-hidden="true" className="weather-disclosure-trigger-indicator text-sm group-open:rotate-180">▾</span>
            </summary>
            <div className="weather-disclosure-panel animate-collapsible-in mt-2">
              <BoundedRulesMatrix
                decisionMatrix={decisionMatrix}
                decisionRules={decisionRules}
                startupVariantPolicy={resolvedStartupVariantPolicy}
                currentScores={currentScores}
              />
            </div>
          </details>
        )}
        contextSection={(
          <MoreContextDisclosureBody
            startupClimateIndex={startupClimateIndex}
            evidenceItems={evidenceItems}
            whyThisCall={whyThisCall}
            memoryRail={memoryRail}
            historicalTimeline={historicalTimeline}
            historicalAnalogs={historicalAnalogs}
            lastYearComparison={lastYearComparison}
            macroOverlay={macroOverlay}
          />
        )}
        actionStripSection={actionStripItems.length > 0 ? <ActionStripSection items={actionStripItems} /> : null}
        asideContent={(
          <>
            <DecisionTransmissionRail
              actionNow={snapshotDoNow}
              guardrail={snapshotGuardrail}
              flipWhen={snapshotWatch}
              citationMetaLine={citationMetaLine}
              citation={citation}
              actions={actions}
            />
            {confidenceHistory.length > 0 && confidenceTrend ? (
              <ConfidenceMiniChart
                confidenceHistory={confidenceHistory}
                confidenceTrend={confidenceTrend}
              />
            ) : null}
          </>
        )}
      />
    </section>
  );
}

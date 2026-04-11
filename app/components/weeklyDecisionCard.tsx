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
import { buildWeeklyDecisionPresentation } from "./weekly-card/presentationAdapter";
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
  WeeklyDecisionCardViewModel,
} from "../../lib/report/homeBriefModel";

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
  } = status;
  const {
    operatingStanceLine,
    weeklyMemoLines,
    guardrail,
    immediateDecision,
    canonicalDecisionCopy,
    reportDynamics,
    transitionProbabilities,
    decisionRules,
    decisionMatrix,
    actionStripItems = [],
    startupVariantPolicy,
    roleAwareTemplates,
    revisitDecisions,
    revisitQueue,
    decisionReadiness,
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
  const { citation, recordDateLabel } = artifact;
  const snapshotCurrentCall = canonicalDecisionCopy?.operatingCall ?? operatingStanceLine;
  const snapshotDoNow = immediateDecision;
  const {
    activeRole,
    roleHrefs,
    roleTranslations,
    citationMetaLine,
    inlineTrustMarker,
    trustStateDetail,
    hasMaterialTrustDelta,
    trustStrip,
    snapshotGuardrail,
    snapshotWatch,
    effectiveFlipLabels,
    decisionBullets,
    guardrailPolicyDetails,
    flipPolicyDetails,
  } = buildWeeklyDecisionPresentation({ model, searchParams });
  const stabilityRule = "Stability rule: act on posture shifts only after 2 consecutive weekly reads, unless the flip trigger fires at HIGH confidence.";
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
        trustStrip={trustStrip}
      />

      <WeeklyDecisionContent
        modePanel={(
          <WeeklyCallModePanel
            startupVariantPolicy={startupVariantPolicy}
            postureLabel={postureWithStageLabel ?? statusLabel}
            operatingCall={canonicalDecisionCopy?.operatingCall ?? operatingStanceLine}
            snapshotGuardrail={snapshotGuardrail}
            snapshotWatch={snapshotWatch}
            revisitDecisions={revisitDecisions}
            revisitQueue={revisitQueue}
            decisionReadiness={decisionReadiness}
            effectiveFlipLabels={effectiveFlipLabels}
            compactInsetClassName={compactInset}
            tierOnePanelClassName={tierOnePanel}
            sectionSpacingClassName={sectionSpacing}
            tierOneHeadingClassName={tierOneHeading}
            whyItMattersLine={whyItMattersLine}
            needsTrustWarning={hasMaterialTrustDelta}
            trustStateDetail={trustStateDetail}
            trustReason={status.isFallbackSnapshot ? artifact.freshnessLine : undefined}
            inlineTrustLabel={inlineTrustMarker.label}
            inlineTrustTone={inlineTrustMarker.tone}
            stabilityRule={stabilityRule}
            weeklyLeadershipSummary={decision.weeklyLeadershipSummary}
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
                startupVariantPolicy={startupVariantPolicy}
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
              currentCall={snapshotCurrentCall}
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

import type { ReactNode } from "react";
import { WeeklyCallModePanel } from "./weeklyCallModePanel";
import { DecisionHeroSection } from "./weekly-card/DecisionHeroSection";
import { ActionStripSection } from "./weekly-card/ActionStripSection";
import { DiagnosticsSection } from "./weekly-card/DiagnosticsSection";
import { BoundedRulesMatrix } from "./weekly-card/BoundedRulesMatrix";
import { MoreContextDisclosureBody } from "./weekly-card/MoreContextDisclosureBody";
import { buildWeeklyDecisionPresentation } from "./weekly-card/presentationAdapter";
import type { DiagnosticsSectionProps } from "./weekly-card/types";
import {
  compactInset,
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
  const { model, actions, searchParams } = props;
  const { status, decision, presentation, diagnostics, artifact } = model;
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
    canonicalDecisionCopy,
    actionStripItems = [],
    startupVariantPolicy,
    revisitDecisions,
    revisitQueue,
    decisionReadiness,
  } = decision;
  const {
    whyItMattersLine,
    glossaryHref,
  } = presentation ?? {};
  const {
    regimeDistance,
    flipRiskMeter,
  } = diagnostics;
  const { citation, recordDateLabel } = artifact;
  const {
    citationMetaLine,
    inlineTrustMarker,
    trustStateDetail,
    hasMaterialTrustDelta,
    trustStrip,
    comparisonSummary,
    postureSteps,
    trajectoryDeltaSummary,
    snapshotGuardrail,
    snapshotWatch,
    effectiveFlipLabels,
    decisionBullets,
    driverHighlights,
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
            comparisonSummary={comparisonSummary}
            postureSteps={postureSteps}
            trajectoryDeltaSummary={trajectoryDeltaSummary}
            stabilityRule={stabilityRule}
            weeklyLeadershipSummary={decision.weeklyLeadershipSummary}
            decisionBullets={decisionBullets}
            driverHighlights={driverHighlights}
            guardrailPolicyDetails={guardrailPolicyDetails}
            flipPolicyDetails={flipPolicyDetails}
            glossaryHref={glossaryHref}
            citationMetaLine={citationMetaLine}
            citation={citation}
            actions={actions}
            confidenceHistory={confidenceHistory}
            confidenceTrend={confidenceTrend}
            confidencePercent={confidencePercent}
          />
        )}
        actionStripSection={actionStripItems.length > 0 ? <ActionStripSection items={actionStripItems} /> : null}
      />
    </section>
  );
}

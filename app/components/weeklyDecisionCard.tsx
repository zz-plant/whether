import type { ReactNode } from "react";
import { WeeklyCallModePanel } from "./weeklyCallModePanel";
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
import { WeeklyDecisionContent } from "./weekly-card/decision-content/WeeklyDecisionContent";
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
export { DecisionHeroSection as DecisionCallHeader } from "./weekly-card/DecisionHeroSection";
export { BoundedRulesMatrix } from "./weekly-card/BoundedRulesMatrix";
export { MoreContextDisclosureBody } from "./weekly-card/MoreContextDisclosureBody";

export function WeeklyDecisionCard(props: WeeklyDecisionCardProps) {
  const { model, actions, searchParams } = props;
  const { status, decision, presentation, artifact } = model;
  const {
    confidencePercent,
    confidenceHistory = [],
    confidenceTrend,
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
  const { citation } = artifact;
  const {
    citationMetaLine,
    inlineTrustMarker,
    trustStateDetail,
    hasMaterialTrustDelta,
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
  const stabilityRule = "Wait for two confirming weeks before acting on posture shifts, unless the flip trigger fires at HIGH confidence.";
  const primaryDriver = driverHighlights[0] ?? null;
  const changedThisWeekBullet = decisionBullets.find((item) => item.label === "What changed")?.detail ?? "No material weekly delta.";
  const deltaLeadLine = changedThisWeekBullet.replace(/^(Changed|Updated|Revised):\s*/i, "").trim().split(/\b(?:Do now|Action|Flip):/i)[0]?.trim() || changedThisWeekBullet;
  const deltaFirstSentence = deltaLeadLine.length > 120 ? `${deltaLeadLine.slice(0, 117)}...` : deltaLeadLine;
  const postureDirectionChip = (direction: string) =>
    direction === "tightening" ? "weather-chip-amber" :
    direction === "opening" ? "weather-chip-emerald" :
    "weather-chip-slate";
  const overallDirection = primaryDriver?.postureDirection ?? "flat";

  return (
    <section className="weather-panel weather-decision-card space-y-4 sm:space-y-5" aria-labelledby="weekly-decision-card-title">
      <h2 id="weekly-decision-card-title" className="sr-only">
        Weekly brief
      </h2>
      <section className="weather-decision-delta" aria-label="What changed">
        <span className="weather-chip weather-chip-slate">This week</span>
        <span className={`weather-chip ${postureDirectionChip(overallDirection)}`}>
          {overallDirection === "tightening" ? "Tightening" : overallDirection === "opening" ? "Easing" : "Steady"}
        </span>
        <span className="weather-decision-delta-value">{deltaFirstSentence}</span>
        {trajectoryDeltaSummary ? (
          <span className="weather-decision-delta-label ml-auto hidden sm:inline">{trajectoryDeltaSummary}</span>
        ) : null}
      </section>
      <WeeklyDecisionContent
        modePanel={(
          <WeeklyCallModePanel
            model={{
              startupVariantPolicy,
              operatingCall: canonicalDecisionCopy?.operatingCall ?? operatingStanceLine,
              actionNow: decision.actionNowShort?.trim() || canonicalDecisionCopy?.doNowLines[0] || decision.immediateDecision,
              snapshotGuardrail,
              snapshotWatch,
              revisitDecisions,
              revisitQueue,
              decisionReadiness,
              effectiveFlipLabels,
              compactInsetClassName: compactInset,
              tierOnePanelClassName: tierOnePanel,
              sectionSpacingClassName: sectionSpacing,
              tierOneHeadingClassName: tierOneHeading,
              whyItMattersLine,
              needsTrustWarning: hasMaterialTrustDelta,
              trustStateDetail,
              trustReason: status.isFallbackSnapshot ? artifact.freshnessLine : undefined,
              inlineTrustLabel: inlineTrustMarker.label,
              inlineTrustTone: inlineTrustMarker.tone,
              comparisonSummary,
              postureSteps,
              trajectoryDeltaSummary,
              stabilityRule,
              weeklyLeadershipSummary: decision.weeklyLeadershipSummary,
              decisionBullets,
              driverHighlights,
              guardrailPolicyDetails,
              flipPolicyDetails,
              glossaryHref,
              citationMetaLine,
              citation,
              actions,
              confidenceHistory,
              confidenceTrend,
              confidencePercent,
            }}
          />
        )}
        actionStripSection={actionStripItems.length > 0 ? <ActionStripSection items={actionStripItems} /> : null}
        topPinnedRule={
          actionStripItems.length > 0
            ? (() => {
                const top = actionStripItems[0];
                return {
                  label: top.label,
                  actionNow: top.areaActionNow,
                  triggerThreshold: top.triggerThreshold,
                  reversalCondition: top.reversalCondition,
                };
              })()
            : undefined
        }
      />
    </section>
  );
}

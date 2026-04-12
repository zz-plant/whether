import { buildCompactFreshnessMeta, formatTrustStripDisplay } from "../../../lib/report/reportFormatting";
import { buildWeeklyCitationMetaLine, buildTrustMarker } from "../../../lib/report/trustStatus";
import type { WeeklyDecisionCardViewModel } from "../../../lib/report/homeBriefModel";
import { deltaLabelBySignal } from "../../../lib/report/briefFormatting";
import { isImprovingSignalDelta } from "../../../lib/report/reportData";
import {
  buildPolicyDetails,
  buildRoleHref,
  buildRoleTranslationCards,
  getOwnerLabelForArea,
  resolveRoleView,
} from "./policySupport";

const formatDriverDeltaLabel = (delta: number) => {
  const roundedDelta = Math.abs(delta) >= 10 ? delta.toFixed(0) : delta.toFixed(1);
  return `${delta > 0 ? "+" : ""}${roundedDelta} vs last week`;
};

const formatTrajectoryDelta = (value: number) => {
  if (value === 0) {
    return "unchanged";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
};

export const buildWeeklyDecisionPresentation = ({
  model,
  searchParams,
}: {
  model: WeeklyDecisionCardViewModel;
  searchParams?: Record<string, string | undefined>;
}) => {
  const { status, decision, artifact } = model;
  const freshnessMeta = buildCompactFreshnessMeta({
    updatedAtLabel: artifact.fetchedAtLabel,
    confidenceLabel: status.confidenceLabel,
    isFallbackSnapshot: Boolean(status.isFallbackSnapshot),
  });
  const citationMetaLine = buildWeeklyCitationMetaLine({
    statusLabel: status.statusLabel,
    confidenceLabel: status.confidenceLabel,
    recordDateLabel: artifact.recordDateLabel,
    freshnessLabel: freshnessMeta.updatedAtLabel,
  });
  const inlineTrustMarker = buildTrustMarker({
    confidenceLabel: status.confidenceLabel,
    freshnessMeta,
    isFallbackSnapshot: Boolean(status.isFallbackSnapshot),
  });
  const trustStrip = formatTrustStripDisplay({
    updatedAtLabel: artifact.fetchedAtLabel,
    confidenceLabel: status.confidenceLabel,
    isFallbackSnapshot: Boolean(status.isFallbackSnapshot),
    provenanceCount: model.diagnostics.evidenceItems.length,
  });
  const snapshotGuardrail =
    decision.guardrailThreshold?.trim()
    || decision.executiveOperationalStance.avoid[0]?.trim()
    || decision.guardrail;
  const snapshotWatch =
    decision.canonicalDecisionCopy?.flipTrigger ?? decision.flipThreshold ?? decision.reversalTrigger;
  const structuredFlipLabels = (decision.canonicalFlipConditions ?? [])
    .map((condition) => condition.label.trim())
    .filter((label) => label.length > 0)
    .filter((label, index, labels) => labels.indexOf(label) === index)
    .slice(0, 4);
  const canonicalFlipLabels = (decision.canonicalDecisionCopy?.flipConditions ?? [])
    .map((label) => label.trim())
    .filter((label) => label.length > 0)
    .filter((label, index, labels) => labels.indexOf(label) === index)
    .slice(0, 4);
  const effectiveFlipLabels =
    canonicalFlipLabels.length > 0
      ? canonicalFlipLabels
      : structuredFlipLabels.length > 0
        ? structuredFlipLabels
        : (decision.compactFlipConditionLabels ?? [])
            .filter((label, index, labels) => labels.indexOf(label) === index)
            .slice(0, 4);
  const guardrailPolicyDetails = buildPolicyDetails({
    rule: decision.decisionRules.find((rule) => rule.area === "burn-discipline") ?? decision.decisionRules[0],
    summary:
      "Use this as the enforceable weekly boundary before approving new fixed-cost commitments.",
    fallbackOwner: "CFO",
  });
  const flipPolicyDetails = decision.canonicalFlipConditions?.[0]
    ? {
        summary: "This is the pre-committed trigger that reopens the weekly posture call.",
        chips: [
          `Metric ${decision.canonicalFlipConditions[0].metric === "riskAppetite" ? "Risk appetite" : "Tightness"}`,
          `Trigger ${decision.canonicalFlipConditions[0].operator} ${decision.canonicalFlipConditions[0].value.toFixed(1)}`,
          `Owner ${getOwnerLabelForArea(decision.canonicalFlipConditions[0].area)}`,
        ],
      }
    : buildPolicyDetails({
        rule: decision.decisionRules.find((rule) => rule.area === "product-tempo") ?? decision.decisionRules[0],
        summary:
          "Use the primary flip trigger to decide when this week’s posture should be revisited.",
        fallbackOwner: "CEO",
      });
  const evidenceByKey = new Map(
    model.diagnostics.evidenceItems.map((item) => [item.key, item] as const),
  );
  const changedSignalByKey = new Map(
    (decision.reportDynamics.changedSignals ?? []).map((signal) => [signal.key, signal] as const),
  );
  const changedSignalKeys = new Set((decision.reportDynamics.changedSignals ?? []).map((signal) => signal.key));
  const availableContributions = (decision.reportDynamics.signalContributions ?? [])
    .filter((item) => !item.unavailable);
  const rankedContributionPool = changedSignalKeys.size > 0
    ? availableContributions.filter((item) => changedSignalKeys.has(item.key))
    : availableContributions;
  const contributionRankedDrivers = rankedContributionPool
    .map((item) => {
      const matchingEvidence = evidenceByKey.get(item.key);
      const changedSignal = changedSignalByKey.get(item.key);
      const contributionLabel = item.normalizedPercentLabel;
      const postureDirection: "tightening" | "opening" | "flat" = changedSignal
        ? isImprovingSignalDelta(changedSignal.key, changedSignal.delta)
          ? "opening"
          : "tightening"
        : "flat";

      return {
        label: item.label?.trim() || deltaLabelBySignal[item.key],
        weightLabel: `${contributionLabel} posture weight`,
        weightPercent: Math.round(item.normalized * 100),
        deltaLabel: changedSignal ? formatDriverDeltaLabel(changedSignal.delta) : "No fresh weekly delta",
        implication:
          matchingEvidence?.immediateImplication
          ?? matchingEvidence?.supportingBullets[0]
          ?? "Carried meaningful weight in this week's posture call.",
        postureDirection,
        postureDirectionLabel:
          postureDirection === "opening"
            ? "Opening posture"
            : postureDirection === "tightening"
              ? "Tightening posture"
              : "Holding steady",
        influence: item.normalized,
        deltaMagnitude: Math.abs(changedSignal?.delta ?? 0),
      };
    })
    .filter((item) => item.influence > 0 || item.deltaMagnitude > 0)
    .sort((left, right) => {
      if (right.influence !== left.influence) {
        return right.influence - left.influence;
      }

      if (right.deltaMagnitude !== left.deltaMagnitude) {
        return right.deltaMagnitude - left.deltaMagnitude;
      }

      return left.label.localeCompare(right.label);
    })
    .slice(0, 3)
    .map(({ label, weightLabel, weightPercent, deltaLabel, implication, postureDirection, postureDirectionLabel }) => ({
      label,
      weightLabel,
      weightPercent,
      deltaLabel,
      implication,
      postureDirection,
      postureDirectionLabel,
    }));
  const driverHighlights = contributionRankedDrivers.length > 0
    ? contributionRankedDrivers
    : (decision.reportDynamics.changedSignals ?? [])
        .slice(0, 3)
        .map((signal) => {
          const matchingEvidence = evidenceByKey.get(signal.key);
          const postureDirection: "tightening" | "opening" = isImprovingSignalDelta(signal.key, signal.delta) ? "opening" : "tightening";

          return {
            label: signal.label?.trim() || deltaLabelBySignal[signal.key],
            weightLabel: "Weekly move",
            weightPercent: null,
            deltaLabel: formatDriverDeltaLabel(signal.delta),
            implication:
              matchingEvidence?.immediateImplication
              ?? matchingEvidence?.supportingBullets[0]
              ?? "Moved enough to affect this week's operating posture.",
            postureDirection,
            postureDirectionLabel: postureDirection === "opening" ? "Opening posture" : "Tightening posture",
          };
        });
  const recentMemorySteps = model.history.memoryRail.slice(-3);
  const postureSteps = recentMemorySteps.map((item, index, steps) => ({
    label:
      steps.length === 1
        ? "This week"
        : steps.length === 2
          ? index === 0
            ? "Last week"
            : "This week"
          : index === 0
            ? "Prior"
            : index === 1
              ? "Last week"
              : "This week",
    posture: item.posture,
    detail: item.label,
    isCurrent: index === steps.length - 1,
  }));
  const trajectoryDeltaSummary = model.diagnostics.postureTrajectory
    ? `Tightness ${formatTrajectoryDelta(model.diagnostics.postureTrajectory.weeklyDelta.tightness)} · Risk appetite ${formatTrajectoryDelta(model.diagnostics.postureTrajectory.weeklyDelta.riskAppetite)}`
    : undefined;

  return {
    activeRole: resolveRoleView(searchParams?.role),
    roleHrefs: {
      finance: buildRoleHref("finance", searchParams),
      product: buildRoleHref("product", searchParams),
    },
    roleTranslations: buildRoleTranslationCards({ decisionRules: decision.decisionRules }),
    citationMetaLine,
    inlineTrustMarker,
    trustStrip,
    trustStateDetail: inlineTrustMarker.detail,
    hasMaterialTrustDelta: inlineTrustMarker.degraded,
    comparisonSummary:
      model.sinceLastReview.items.find((item) => item.id === "posture-shift")?.detail
      ?? status.postureDelta,
    postureSteps,
    trajectoryDeltaSummary,
    snapshotGuardrail,
    snapshotWatch,
    effectiveFlipLabels,
    decisionBullets: [
      {
        label: "What changed",
        detail: decision.decisionShiftSummary.replace(/^Changed:\s*/i, "").trim(),
      },
      { label: "What that changes", detail: decision.immediateDecision.trim() },
      { label: "What to revisit", detail: decision.guardrail.trim() },
      { label: "What would flip", detail: snapshotWatch.trim() },
    ],
    driverHighlights,
    guardrailPolicyDetails,
    flipPolicyDetails,
  };
};

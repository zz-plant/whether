import { buildCompactFreshnessMeta } from "../../../lib/report/reportFormatting";
import { buildWeeklyCitationMetaLine, buildTrustMarker } from "../../../lib/report/trustStatus";
import type { WeeklyDecisionCardViewModel } from "../../../lib/report/homeBriefModel";
import {
  buildPolicyDetails,
  buildRoleHref,
  buildRoleTranslationCards,
  getOwnerLabelForArea,
  resolveRoleView,
} from "./policySupport";

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

  return {
    activeRole: resolveRoleView(searchParams?.role),
    roleHrefs: {
      finance: buildRoleHref("finance", searchParams),
      product: buildRoleHref("product", searchParams),
    },
    roleTranslations: buildRoleTranslationCards({ decisionRules: decision.decisionRules }),
    citationMetaLine,
    inlineTrustMarker,
    trustStateLabel: inlineTrustMarker.label.toUpperCase(),
    trustStateDetail: inlineTrustMarker.detail,
    hasMaterialTrustDelta: inlineTrustMarker.degraded,
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
    guardrailPolicyDetails,
    flipPolicyDetails,
  };
};

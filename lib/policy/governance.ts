import type { PolicyPosture } from "../regimeEngine";

export interface GovernanceParameterSet {
  hiringThreshold: "MODERATE" | "HIGH" | "VERY_HIGH";
  paybackWindowTolerance: "LONGER" | "STANDARD" | "SHORTER";
  rollbackRequirement: "STANDARD" | "EXPLICIT_KILL_CRITERIA" | "REVERSIBLE_ONLY";
  approvalVelocity: "FASTER" | "BALANCED" | "SLOWER_STRUCTURED";
  expansionScope: "BROAD" | "BALANCED" | "CONSTRAINED";
  experimentationTolerance: "HIGH" | "MEDIUM" | "LOW";
}

const GOVERNANCE_BY_POSTURE: Record<PolicyPosture, GovernanceParameterSet> = {
  RISK_ON: {
    hiringThreshold: "MODERATE",
    paybackWindowTolerance: "LONGER",
    rollbackRequirement: "STANDARD",
    approvalVelocity: "FASTER",
    expansionScope: "BROAD",
    experimentationTolerance: "HIGH",
  },
  TRANSITION: {
    hiringThreshold: "HIGH",
    paybackWindowTolerance: "STANDARD",
    rollbackRequirement: "EXPLICIT_KILL_CRITERIA",
    approvalVelocity: "BALANCED",
    expansionScope: "BALANCED",
    experimentationTolerance: "MEDIUM",
  },
  SAFETY_MODE: {
    hiringThreshold: "VERY_HIGH",
    paybackWindowTolerance: "SHORTER",
    rollbackRequirement: "REVERSIBLE_ONLY",
    approvalVelocity: "SLOWER_STRUCTURED",
    expansionScope: "CONSTRAINED",
    experimentationTolerance: "LOW",
  },
};

export const getGovernanceParametersForPosture = (
  posture: PolicyPosture,
  refusalActive: boolean
): GovernanceParameterSet => {
  if (!refusalActive) {
    return GOVERNANCE_BY_POSTURE[posture];
  }

  return {
    ...GOVERNANCE_BY_POSTURE[posture],
    rollbackRequirement: "REVERSIBLE_ONLY",
    approvalVelocity: "SLOWER_STRUCTURED",
    experimentationTolerance: "LOW",
  };
};

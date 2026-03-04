import { getPlaybookGuidance } from "../../playbook";
import type { RegimeAssessment } from "../../regimeEngine";
import { getRegimeStatusLabel } from "../regimeLabels";

export const buildGuidanceContext = (assessment: RegimeAssessment) => {
  const { playbook, startItems, stopItems } = getPlaybookGuidance(assessment.regime);

  return {
    fenceItems: assessment.constraints,
    playbook,
    startItems,
    statusLabel: getRegimeStatusLabel(assessment.regime),
    stopItems,
  };
};

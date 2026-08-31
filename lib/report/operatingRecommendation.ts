import type { RegimeAssessment } from "../regimeEngine";
import type { PlaybookEntry } from "../playbook";
import type { ActionStripItem } from "./operatingCalls";
import { buildGuidanceBundleFromAssessment } from "./reportEvidence";

export type OperatingRecommendationResult = {
  playbook: PlaybookEntry | null;
  startItems: string[];
  stopItems: string[];
  actionStripItems: ActionStripItem[];
  fenceItems: string[];
};

export const buildOperatingRecommendation = (
  assessment: RegimeAssessment,
): OperatingRecommendationResult => {
  const { playbook, startItems, stopItems, actionStripItems } = buildGuidanceBundleFromAssessment(assessment);
  const fenceItems = assessment.constraints;

  return {
    playbook,
    startItems,
    stopItems,
    actionStripItems,
    fenceItems,
  };
};

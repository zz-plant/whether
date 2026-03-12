import type { PostureStateContract } from "./postureStateContract";

type CanonicalDecisionHomeBriefModel = {
  postureWithStageLabel?: string;
  postureLabel: string;
  operatingStanceLine: string;
  actionNowShort?: string;
  guardrail: string;
  compactFlipConditionLabels?: string[];
  decisionRules: Array<{ resumeTrigger?: string }>;
};

export type CanonicalDecisionCopy = {
  currentRegimeLabel: string;
  operatingCall: string;
  doNowLines: string[];
  flipTrigger: string;
  flipConditions: string[];
};

const normalizeNonEmptyLines = (values: Array<string | undefined>, limit = 4): string[] =>
  values
    .map((value) => value?.trim() ?? "")
    .filter((value) => value.length > 0)
    .filter((value, index, items) => items.indexOf(value) === index)
    .slice(0, limit);

export const buildCanonicalDecisionCopy = ({
  homeBriefModel,
  postureState,
}: {
  homeBriefModel: CanonicalDecisionHomeBriefModel;
  postureState: PostureStateContract;
}): CanonicalDecisionCopy => {
  const doNowLines = normalizeNonEmptyLines(
    [homeBriefModel.actionNowShort, homeBriefModel.guardrail],
    3,
  );
  const fallbackFlipConditions = normalizeNonEmptyLines(
    homeBriefModel.decisionRules.map((rule) => rule.resumeTrigger),
    4,
  );
  const postureFlipConditions = normalizeNonEmptyLines(postureState.whatFlipsNext.thresholds, 4);
  const compactFlipConditions = normalizeNonEmptyLines(homeBriefModel.compactFlipConditionLabels ?? [], 4);
  const flipConditions = postureFlipConditions.length > 0
    ? postureFlipConditions
    : compactFlipConditions.length > 0
      ? compactFlipConditions
      : fallbackFlipConditions;

  return {
    currentRegimeLabel: homeBriefModel.postureWithStageLabel ?? homeBriefModel.postureLabel,
    operatingCall: homeBriefModel.operatingStanceLine,
    doNowLines,
    flipTrigger: postureState.whatFlipsNext.flipTrigger,
    flipConditions,
  };
};

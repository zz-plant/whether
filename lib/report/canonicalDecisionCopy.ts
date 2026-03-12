import type { PostureStateContract } from "./postureStateContract";
import type { buildHomeBriefModel } from "./homeBriefModel";

export type CanonicalDecisionCopy = {
  currentRegimeLabel: string;
  operatingCall: string;
  doNowLines: string[];
  flipTrigger: string;
  flipConditions: string[];
};

export const buildFlipConditionsWithoutTriggerDuplication = ({
  flipTrigger,
  flipConditions,
  maxItems = 4,
}: {
  flipTrigger: string;
  flipConditions: string[];
  maxItems?: number;
}) => {
  const normalizedTrigger = flipTrigger.trim();

  return flipConditions
    .map((condition) => condition.trim())
    .filter((condition) => condition.length > 0)
    .filter((condition, index, conditions) => conditions.indexOf(condition) === index)
    .filter((condition) => condition !== normalizedTrigger)
    .slice(0, maxItems);
};

type HomeBriefModel = ReturnType<typeof buildHomeBriefModel>;

const FALLBACK_DO_NOW_LINE = "Hold last week's bounded operating rules until thresholds move.";
const FALLBACK_FLIP_TRIGGER = "Recheck thresholds on next refresh.";

export const buildCanonicalDecisionCopy = ({
  homeBriefModel,
  postureState,
}: {
  homeBriefModel: HomeBriefModel;
  postureState: PostureStateContract;
}): CanonicalDecisionCopy => {
  const doNowLines = [
    homeBriefModel.actionNowShort,
    ...homeBriefModel.actionStripItems.map((item) => item.actionNow),
    homeBriefModel.guardrail,
  ]
    .map((line) => line?.trim())
    .filter((line): line is string => Boolean(line && line.length > 0))
    .filter((line, index, lines) => lines.indexOf(line) === index)
    .slice(0, 3);

  const compactFlipConditions = homeBriefModel.canonicalFlipConditions
    .map((condition) => condition.label.trim())
    .filter((label) => label.length > 0);
  const flipConditions = [
    ...postureState.whatFlipsNext.thresholds,
    ...compactFlipConditions,
    ...homeBriefModel.compactFlipConditionLabels,
  ]
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line, index, lines) => lines.indexOf(line) === index)
    .slice(0, 4);

  return {
    currentRegimeLabel: homeBriefModel.postureWithStageLabel ?? homeBriefModel.postureLabel,
    operatingCall: homeBriefModel.operatingStanceLine,
    doNowLines: doNowLines.length > 0 ? doNowLines : [FALLBACK_DO_NOW_LINE],
    flipTrigger: postureState.whatFlipsNext.flipTrigger.trim() || flipConditions[0] || FALLBACK_FLIP_TRIGGER,
    flipConditions: flipConditions.length > 0 ? flipConditions : [FALLBACK_FLIP_TRIGGER],
  };
};

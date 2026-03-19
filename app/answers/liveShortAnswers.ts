import type { RegimeAssessment } from "../../lib/regimeEngine";
import type { SeoDecisionPayload } from "../../lib/report/seoDecisionPayload";

export const isExpansionRegime = (regime: RegimeAssessment["regime"]) => regime === "EXPANSION";

export const buildLiveShortAnswer = ({ payload, fallback }: { payload: SeoDecisionPayload; fallback: string }) =>
  payload.currentCall.trim() || fallback;

export const buildLiveDirectAnswer = ({ payload, fallback }: { payload: SeoDecisionPayload; fallback: string }) => {
  const currentCall = payload.currentCall.trim() || fallback;

  return `${currentCall} Action: ${payload.immediateAction} Threshold: ${payload.triggerThreshold} Reverse: ${payload.reversalCondition}`;
};

import { NextResponse } from "next/server";
import { assembleHomePage } from "../../../lib/report/homePageAssembler";

export const runtime = "edge";
export const revalidate = 300;

export async function GET() {
  const homepage = await assembleHomePage({});
  const model = homepage.weeklyDecisionCardModel;

  return NextResponse.json({
    action: model.decision.actionNowShort ?? model.decision.immediateDecision,
    stance: model.status.postureLabel,
    postureWithStage: model.status.postureWithStageLabel,
    regime: model.status.regimeKey ?? "EXPANSION",
    confidence: model.status.confidenceLabel,
    guardrail: model.decision.guardrail,
    reversalTrigger: model.decision.reversalTrigger,
    decisionShift: model.decision.decisionShiftSummary,
    revisitDecisions: model.decision.revisitDecisions,
    actionStripItems: model.decision.actionStripItems?.map((item) => ({
      area: item.areaActionNow,
      threshold: item.triggerThreshold,
      reversal: item.reversalCondition,
    })),
    watchItems: model.decision.flipThreshold
      ? [model.decision.flipThreshold]
      : model.decision.compactFlipConditionLabels ?? [],
    weeklyMemoLines: model.decision.weeklyMemoLines,
  });
}

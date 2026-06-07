import { ImageResponse } from "next/og";
import { assembleHomePage } from "../../../../lib/report/homePageAssembler";
import { renderBriefImage, type BriefImageProps } from "../../../../lib/image/briefImageTemplate";
import type { SignalChange } from "../../../../lib/report/homeBriefModel";

export const runtime = "edge";

type BriefImageHomepage = Awaited<ReturnType<typeof assembleHomePage>>;

export const buildBriefImagePayload = (
  homepage: BriefImageHomepage,
): BriefImageProps => {
  const model = homepage.weeklyDecisionCardModel;
  const shell = homepage.reportShell;

  return {
    decision:
      model.decision.canonicalDecisionCopy?.doNowLines?.[0] ??
      model.decision.actionNowShort ??
      model.decision.immediateDecision,
    regime: shell.regime,
    postureLabel:
      model.status.postureWithStageLabel ?? model.status.postureLabel,
    tightness: model.diagnostics.currentScores.tightness,
    tightnessDelta:
      model.decision.reportDynamics.changedSignals.find(
        (s: SignalChange) => s.key === "tightness",
      )?.delta ?? 0,
    confidenceLabel: model.status.confidenceLabel,
    recordDate: shell.recordDateLabel,
    guardrail: model.decision.guardrail,
    pauseThreshold:
      model.diagnostics.postureTrajectory?.thresholds.tightness ??
      model.diagnostics.regimeDistance.thresholdValue,
    flipConditions: model.decision.compactFlipConditionLabels?.length
      ? model.decision.compactFlipConditionLabels
      : undefined,
  };
};

export async function GET() {
  const homepage = await assembleHomePage({});

  const image = new ImageResponse(
    renderBriefImage(buildBriefImagePayload(homepage)),
    { width: 1200, height: 800 },
  );

  image.headers.set(
    "Cache-Control",
    "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
  );

  return image;
}

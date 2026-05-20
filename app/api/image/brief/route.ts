import { ImageResponse } from "next/og";
import { assembleHomePage } from "../../../../lib/report/homePageAssembler";
import { renderBriefImage } from "../../../../lib/image/briefImageTemplate";
import type { SignalChange } from "../../../../lib/report/homeBriefModel";

export const runtime = "edge";

export async function GET() {
  const homepage = await assembleHomePage({});
  const model = homepage.weeklyDecisionCardModel;
  const shell = homepage.reportShell;

  const image = new ImageResponse(
    renderBriefImage({
      decision:
        model.decision.canonicalDecisionCopy?.doNowLines?.[0] ??
        model.decision.actionNowShort ??
        model.decision.immediateDecision,
      regime: shell.regime,
      postureLabel:
        model.status.postureWithStageLabel ?? model.status.postureLabel,
      tightness: model.diagnostics.currentScores.tightness,
      riskAppetite: model.diagnostics.currentScores.riskAppetite,
      tightnessDelta:
        model.decision.reportDynamics.changedSignals.find(
          (s: SignalChange) => s.key === "tightness",
        )?.delta ?? 0,
      riskAppetiteDelta:
        model.decision.reportDynamics.changedSignals.find(
          (s: SignalChange) => s.key === "riskAppetite",
        )?.delta ?? 0,
      confidenceLabel: model.status.confidenceLabel,
      recordDate: shell.recordDateLabel,
    }),
    { width: 1200, height: 800 },
  );

  image.headers.set(
    "Cache-Control",
    "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
  );

  return image;
}

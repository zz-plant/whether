import { ImageResponse } from "next/og";
import { assembleHomePage } from "../../../../lib/report/homePageAssembler";
import { renderBriefImage, type BriefImageProps } from "../../../../lib/image/briefImageTemplate";
import type { SignalChange } from "../../../../lib/report/homeBriefModel";
import { parseImageBriefRequestContext } from "../../../../lib/report/imageBriefSearchParams";
import { SECTOR_TAXONOMY, type SectorKey } from "../../../../lib/report/sectorSensitivity";
import type { CompanyStage } from "../../../../lib/report/operatorContext";

export const runtime = "edge";

const cadenceLabel: Record<string, string> = {
  weekly: "Weekly Brief",
  monthly: "Monthly Brief",
  quarterly: "Quarterly Brief",
  yearly: "Yearly Brief",
};

const stageLabel: Record<CompanyStage, string> = {
  "pre-seed": "Pre-seed",
  seed: "Seed",
  "series-a": "Series A",
  "series-b-plus": "Series B+",
  public: "Public",
};

const buildImageContextLabel = (requestContext: ReturnType<typeof parseImageBriefRequestContext>) => {
  const labels = [
    requestContext.searchParams?.sector
      ? SECTOR_TAXONOMY[requestContext.searchParams.sector as SectorKey]?.label
      : null,
    requestContext.operatorContext?.ticker,
    requestContext.operatorContext?.companyStage
      ? stageLabel[requestContext.operatorContext.companyStage]
      : null,
  ].filter((label): label is string => Boolean(label));

  return labels.length ? labels.join(" · ") : undefined;
};

type BriefImageHomepage = Awaited<ReturnType<typeof assembleHomePage>>;

type BuildBriefImagePayloadInput = {
  weeklyDecisionCardModel: BriefImageHomepage["weeklyDecisionCardModel"];
  reportShell: Pick<BriefImageHomepage["reportShell"], "regime" | "recordDateLabel">;
};

export const buildBriefImagePayload = (
  homepage: BuildBriefImagePayloadInput,
  requestContext: ReturnType<typeof parseImageBriefRequestContext> = {},
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
    briefLabel: cadenceLabel[requestContext.searchParams?.cadence ?? "weekly"] ?? "Weekly Brief",
    contextLabel: buildImageContextLabel(requestContext),
    guardrail: model.decision.guardrailThreshold,
    pauseThreshold:
      model.diagnostics.postureTrajectory?.thresholds.tightness ??
      model.diagnostics.regimeDistance.thresholdValue,
    flipConditions: model.decision.compactFlipConditionLabels?.length
      ? model.decision.compactFlipConditionLabels
      : undefined,
  };
};

export async function GET(request: Request) {
  const requestContext = parseImageBriefRequestContext(new URL(request.url).searchParams);
  const homepage = await assembleHomePage(requestContext);

  const image = new ImageResponse(
    renderBriefImage(buildBriefImagePayload(homepage, requestContext)),
    { width: 1200, height: 800 },
  );

  image.headers.set(
    "Cache-Control",
    "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
  );

  return image;
}

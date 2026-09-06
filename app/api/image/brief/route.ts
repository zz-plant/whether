import { ImageResponse } from "next/og";
import { assembleHomePage } from "../../../../lib/report/homePageAssembler";
import { renderBriefImage, type BriefImageProps } from "../../../../lib/image/briefImageTemplate";
import { loadOgFonts } from "../../../../lib/image/ogFonts";
import type { SignalChange } from "../../../../lib/report/homeBriefModel";
import { parseImageBriefRequestContext } from "../../../../lib/report/imageBriefSearchParams";
import { SECTOR_TAXONOMY, type SectorKey } from "../../../../lib/report/sectorSensitivity";
import { operatorStageLabel } from "../../../../lib/report/operatorStage";

export const runtime = "edge";

const cadenceLabel: Record<string, string> = {
  weekly: "Weekly Brief",
  monthly: "Monthly Brief",
  quarterly: "Quarterly Brief",
  yearly: "Yearly Brief",
};

const buildImageContextLabel = (requestContext: ReturnType<typeof parseImageBriefRequestContext>) => {
  const labels = [
    requestContext.searchParams?.sector
      ? SECTOR_TAXONOMY[requestContext.searchParams.sector as SectorKey]?.label
      : null,
    requestContext.operatorContext?.ticker,
    requestContext.operatorContext?.companyStage
      ? operatorStageLabel(requestContext.operatorContext.companyStage)
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
  const [homepage, fonts] = await Promise.all([
    assembleHomePage(requestContext),
    loadOgFonts(request.url),
  ]);

  // Without registered faces satori falls back to its default font and fetches a
  // Google font for every glyph that font lacks -- the brief carries at least one
  // (the U+2264 in the flip-condition copy). That fetch failing aborts the render
  // after the headers are already sent, so the card downloads as an empty file.
  const image = new ImageResponse(
    renderBriefImage(buildBriefImagePayload(homepage, requestContext)),
    { width: 1200, height: 800, ...(fonts ? { fonts } : {}) },
  );

  image.headers.set(
    "Cache-Control",
    "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
  );

  return image;
}

import { ImageResponse } from "next/og";
import { assembleHomePage } from "../../../../lib/report/homePageAssembler";
import { renderBriefImage, type BriefImageProps } from "../../../../lib/image/briefImageTemplate";
import { loadOgFonts } from "../../../../lib/image/ogFonts";
import { buildScoreReadings } from "../../../../lib/export/scoreReference";
import { notLiveReadingLabel, readerSourceLabel } from "../../../../lib/report/homeSharePreview";
import { parseImageBriefRequestContext } from "../../../../lib/report/imageBriefSearchParams";
import { buildSharedCorridorRails } from "../../../../lib/report/operatingCalls";
import { SECTOR_TAXONOMY, type SectorKey } from "../../../../lib/report/sectorSensitivity";
import { operatorStageLabel } from "../../../../lib/report/operatorStage";

export const runtime = "edge";

const cadenceLabel: Record<string, string> = {
  weekly: "Weekly Brief",
  monthly: "Monthly Brief",
  quarterly: "Quarterly Brief",
  yearly: "Yearly Brief",
};

type BriefImageHomepage = Awaited<ReturnType<typeof assembleHomePage>>;

const buildImageContextLabel = (
  requestContext: ReturnType<typeof parseImageBriefRequestContext>,
  shell: Pick<BriefImageHomepage["reportShell"], "historicalBanner" | "showOfflineBadge">,
) => {
  /* Why this is not simply this week's live reading, in the words the weekly card uses. */
  const notLive = notLiveReadingLabel({
    historicalBanner: shell.historicalBanner?.banner ?? null,
    monthRequested: Boolean(requestContext.searchParams?.month || requestContext.searchParams?.year),
    isFallback: shell.showOfflineBadge,
  });
  const labels = [
    notLive,
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

type BuildBriefImagePayloadInput = {
  weeklyDecisionCardModel: BriefImageHomepage["weeklyDecisionCardModel"];
  reportShell: Pick<
    BriefImageHomepage["reportShell"],
    "regime" | "recordDateLabel" | "provenance" | "historicalBanner" | "showOfflineBadge"
  >;
};

export const buildBriefImagePayload = (
  homepage: BuildBriefImagePayloadInput,
  requestContext: ReturnType<typeof parseImageBriefRequestContext> = {},
): BriefImageProps => {
  const model = homepage.weeklyDecisionCardModel;
  const shell = homepage.reportShell;
  const scores = {
    tightness: model.diagnostics.currentScores.tightness,
    riskAppetite: model.diagnostics.currentScores.riskAppetite,
  };
  const callChangeLines = model.diagnostics.postureTrajectory?.thresholds;

  return {
    decision:
      model.decision.canonicalDecisionCopy?.doNowLines?.[0] ??
      model.decision.actionNowShort ??
      model.decision.immediateDecision,
    regime: shell.regime,
    /* The derivation `/share` and every paste print: the lines the scores are
       judged against and how far from each. No `previous`, on purpose: the
       reading behind "last week" is the previous time-machine snapshot, which
       is the last month-end (Aug 31 for both the Sep 18 and Sep 25 reads), so
       the card would print a four-week-old number under a one-week label.
       `tightnessDelta` used to ride along here and was never drawn. */
    readings: buildScoreReadings({
      scores,
      ...(callChangeLines
        ? { thresholds: { tightnessRegime: callChangeLines.tightness, riskAppetiteRegime: callChangeLines.riskAppetite } }
        : {}),
      rails: buildSharedCorridorRails(model.decision.actionStripItems ?? [], scores),
    }),
    confidenceLabel: model.status.confidenceLabel,
    recordDate: shell.recordDateLabel,
    briefLabel: cadenceLabel[requestContext.searchParams?.cadence ?? "weekly"] ?? "Weekly Brief",
    contextLabel: buildImageContextLabel(requestContext, shell),
    sourceLabel: readerSourceLabel(shell.provenance.sourceLabel),
  };
};

export async function GET(request: Request) {
  const requestContext = parseImageBriefRequestContext(new URL(request.url).searchParams);
  const [homepage, fonts] = await Promise.all([
    assembleHomePage(requestContext),
    loadOgFonts(request.url),
  ]);

  // Without registered faces satori falls back to its default font and fetches a
  // Google font for every glyph that font lacks -- report copy carries some (the
  // U+2264 in a flip condition, an arrow). That fetch failing aborts the render
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

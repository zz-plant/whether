import { buildCanonicalUrl, buildOgImageUrl } from "../seo";
import { loadWeeklyBriefSnapshot } from "./weeklyBriefSnapshot";

export type HomeShareSearchParams = {
  month?: string;
  year?: string;
  [key: string]: string | undefined;
};

export type HomeSharePreview = {
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  imageAlt: string;
  eyebrow: string;
  audienceLabel: string;
  weekLabel: string;
  statusLabel: string;
  contextLabel: string;
  headline: string;
  whyItMatters: string;
  operatingStanceLine: string;
  changeSummary: string;
  immediateDecision: string;
  flipCondition: string;
  confidenceLabel: "HIGH" | "MED" | "LOW";
  trendLabel: string;
  postureDelta: string;
  baseRateLabel: string;
  curveSlopeLabel: string;
  freshnessLine: string;
  sourceLabel: string;
  isHistorical: boolean;
  isFallback: boolean;
};

type HomeSharePreviewDependencies = {
  loadWeeklyBriefSnapshot: typeof loadWeeklyBriefSnapshot;
};

const defaultDependencies: HomeSharePreviewDependencies = {
  loadWeeklyBriefSnapshot,
};

const formatRateValue = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(2)}%` : "n/a";

const normalizeWhitespace = (value: string) => value.trim().replace(/\s+/g, " ");

const normalizeSentence = (value: string) =>
  normalizeWhitespace(value).replace(/[.;:,]+$/g, "");

const toSentence = (value: string) => {
  const normalized = normalizeSentence(value);

  if (normalized.length === 0) {
    return normalized;
  }

  return `${normalized}.`;
};

const clampText = (value: string, maxLength: number) => {
  const normalized = normalizeWhitespace(value);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const truncated = normalized.slice(0, maxLength - 1);
  const lastSpace = truncated.lastIndexOf(" ");
  const safeSlice = lastSpace >= Math.floor(maxLength * 0.6) ? truncated.slice(0, lastSpace) : truncated;

  return `${safeSlice.trimEnd()}…`;
};

const buildImageParams = (searchParams: HomeShareSearchParams | undefined) => {
  const params: Record<string, string> = { template: "report" };

  if (searchParams?.month) {
    params.month = searchParams.month;
  }

  if (searchParams?.year) {
    params.year = searchParams.year;
  }

  return params;
};

export const buildHomeSharePath = (searchParams?: HomeShareSearchParams) => {
  const params = new URLSearchParams();

  Object.entries(searchParams ?? {})
    .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([key, value]) => {
      params.set(key, value!.trim());
    });

  const query = params.toString();
  return query ? `/?${query}` : "/";
};

export const loadHomeSharePreview = async (
  searchParams?: HomeShareSearchParams,
  dependencies: Partial<HomeSharePreviewDependencies> = {},
): Promise<HomeSharePreview> => {
  const resolvedDependencies = {
    ...defaultDependencies,
    ...dependencies,
  } satisfies HomeSharePreviewDependencies;
  const { reportResult, reportData, snapshot } = await resolvedDependencies.loadWeeklyBriefSnapshot(
    searchParams,
    { route: "/" },
    { overlaySector: searchParams?.sector },
  );
  const { isFallback, freshnessMeta, weeklyDecisionCardModel } = snapshot;

  const sharePath = buildHomeSharePath(searchParams);
  const imageUrl = buildOgImageUrl(buildImageParams(searchParams));
  const weekLabel = reportData.weeklyRecordDateLabel;
  const statusLabel = weeklyDecisionCardModel.status.statusLabel;
  const contextLabel = reportData.historicalSelection
    ? reportData.historicalSelection.banner
    : searchParams?.month || searchParams?.year
      ? "Time Machine selection unavailable"
      : reportData.treasuryProvenance.statusLabel;
  const operatingStanceLine = clampText(weeklyDecisionCardModel.decision.operatingStanceLine, 120);
  const immediateDecision = clampText(
    normalizeSentence(weeklyDecisionCardModel.decision.immediateDecision),
    130,
  );
  const headline = clampText(immediateDecision, 96);
  const whyItMatters = clampText(
    normalizeSentence(operatingStanceLine),
    140,
  );
  const flipCondition = clampText(
    normalizeSentence(
      weeklyDecisionCardModel.decision.flipThreshold
      ?? weeklyDecisionCardModel.decision.reversalTrigger
      ?? "Re-check the next threshold move before changing posture",
    ),
    130,
  );
  const audienceLabel = reportData.historicalSelection
    ? `For operators in ${reportData.historicalSelection.banner.replace(/^Historical mode active\s+·\s+/i, "")}`
    : "For operators this week";
  const title = reportData.historicalSelection
    ? `${contextLabel}: ${headline} — Whether`
    : `${statusLabel}: ${headline} — Whether`;
  const description = clampText(
    `${audienceLabel}. ${toSentence(immediateDecision)} ${toSentence(whyItMatters)} Changed: ${toSentence(weeklyDecisionCardModel.decision.decisionShiftSummary)} Flip when: ${toSentence(flipCondition)}`,
    210,
  );

  return {
    title,
    description,
    url: buildCanonicalUrl(sharePath),
    imageUrl,
    imageAlt: `${statusLabel} Whether weekly brief card for ${weekLabel}`,
    eyebrow: reportData.historicalSelection ? "Whether Historical Brief" : "Whether Weekly Brief",
    audienceLabel,
    weekLabel,
    statusLabel,
    contextLabel,
    headline,
    whyItMatters,
    operatingStanceLine,
    changeSummary: clampText(weeklyDecisionCardModel.decision.decisionShiftSummary, 140),
    immediateDecision,
    flipCondition,
    confidenceLabel: weeklyDecisionCardModel.status.confidenceLabel,
    trendLabel: weeklyDecisionCardModel.status.trendLabel,
    postureDelta: weeklyDecisionCardModel.status.postureDelta,
    baseRateLabel: formatRateValue(reportData.assessment.scores.baseRate),
    curveSlopeLabel: formatRateValue(reportData.assessment.scores.curveSlope),
    freshnessLine: freshnessMeta.line,
    sourceLabel: reportData.treasuryProvenance.sourceLabel,
    isHistorical: Boolean(reportData.historicalSelection),
    isFallback,
  };
};

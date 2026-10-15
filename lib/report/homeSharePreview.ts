import type { RegimeKey } from "../regimeEngine";
import { weeklyHeadline } from "./reportEvidence";
import { formatWeekMondayUTC } from "../formatters";
import { getRegimeWeatherRationale } from "../regimePresentation";
import { buildCanonicalUrl, buildOgImageUrl } from "../seo";
import { fitMovementHeadline } from "./decisionMovement";
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
  /** The conditions' engine key, so the card can draw them in their own hue. */
  regime: RegimeKey;
  /** Why this reading is not simply this week's live one, or null when it is. */
  contextLabel: string | null;
  headline: string;
  whyItMatters: string;
  operatingStanceLine: string;
  changeSummary: string;
  immediateDecision: string;
  flipCondition: string;
  confidenceLabel: "HIGH" | "MED" | "LOW";
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

/* "Canonical ingestion (FRED)" names our pipeline; a reader wants the publisher.
   Every treasury source resolves to one of these two. The brief card
   (`/api/image/brief`) reads the same label, so both cards name one source.
   The scores start from Treasury rates, then credit spreads, volatility and
   financial conditions (all FRED) and the curated startup-market snapshot
   adjust them (`/about`, spec 3.1). The label used to say "US Treasury rates"
   alone, which reads as rates-only, so it names all three. */
export const readerSourceLabel = (sourceLabel: string) =>
  /FRED/i.test(sourceLabel)
    ? "US Treasury and the St. Louis Fed (FRED), plus a curated startup-market snapshot"
    : /treasury/i.test(sourceLabel)
      ? "US Treasury daily yield curve"
      : sourceLabel;

/**
 * Why a card is not simply this week's live reading, or null when it is. The
 * provenance strip's status ("Canonical snapshot (high confidence)") is the
 * pipeline's word for where a reading came from; on a card the only thing a
 * reader needs is whether this is *not* this week's live reading, and why.
 * Both cards (`/api/og`, `/api/image/brief`) print this one answer.
 */
export const notLiveReadingLabel = ({
  historicalBanner,
  monthRequested,
  isFallback,
}: {
  historicalBanner: string | null;
  monthRequested: boolean;
  isFallback: boolean;
}) =>
  historicalBanner
    ? historicalBanner
    : monthRequested
      ? "That month is not on record"
      : isFallback
        ? "Saved reading, not live"
        : null;

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

/** The share card's "What changed" box, in characters. */
const CHANGE_BOX_LENGTH = 140;

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
  const { reportData, snapshot } = await resolvedDependencies.loadWeeklyBriefSnapshot(
    searchParams,
    { route: "/" },
    { overlaySector: searchParams?.sector },
  );
  const { isFallback, weeklyDecisionCardModel } = snapshot;

  const sharePath = buildHomeSharePath(searchParams);
  const imageUrl = buildOgImageUrl(buildImageParams(searchParams));
  /* The week by its Monday, the name every surface gives it; the card said
     "Week ending" the Friday after the reading. */
  const weekLabel = formatWeekMondayUTC(reportData.treasury.record_date);
  const statusLabel = weeklyDecisionCardModel.status.statusLabel;
  const contextLabel = notLiveReadingLabel({
    historicalBanner: reportData.historicalSelection?.banner ?? null,
    monthRequested: Boolean(searchParams?.month || searchParams?.year),
    isFallback,
  });
  /* The week's headline action, from the source the homepage h1 reads
     (`weeklyHeadline`). The card led with the action and printed the call under
     it, two instructions for one week; the line under the headline is what the
     conditions mean for money now. */
  const weekHeadline = weeklyHeadline(snapshot.weeklyCall);
  const operatingStanceLine = clampText(weekHeadline.action, 120);
  const immediateDecision = clampText(normalizeSentence(weekHeadline.action), 130);
  const headline = clampText(immediateDecision, 96);
  const whyItMatters = clampText(
    normalizeSentence(getRegimeWeatherRationale(reportData.assessment.regime)),
    140,
  );
  const flipCondition = clampText(
    normalizeSentence(
      weeklyDecisionCardModel.decision.flipThreshold
      ?? weeklyDecisionCardModel.decision.reversalTrigger
      ?? "Re-check where the scores sit against their lines before acting",
    ),
    130,
  );
  const audienceLabel = reportData.historicalSelection
    ? `For operators in ${reportData.historicalSelection.banner.replace(/^Historical mode active\s+·\s+/i, "")}`
    : "For operators this week";
  const title = reportData.historicalSelection
    ? `${reportData.historicalSelection.banner}: ${headline} — Whether`
    : `${statusLabel}: ${headline} — Whether`;
  /* The consequence without the lines that did it: a link preview has 210 characters,
     and the sentence with its evidence ran past them and was cut in the middle of it. The
     card's change box has 140, so the longest whole form of the headline that fits it,
     and the same line in both places. */
  const movement = weeklyDecisionCardModel.decision.decisionMovement;
  const changeLine = movement ? fitMovementHeadline(movement, CHANGE_BOX_LENGTH) : null;
  const changed = changeLine ?? weeklyDecisionCardModel.decision.decisionShiftHeadline;
  const description = clampText(
    `${audienceLabel}. ${toSentence(immediateDecision)} ${toSentence(whyItMatters)} Changed: ${toSentence(changed)} Conditions change if: ${toSentence(flipCondition)}`,
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
    regime: reportData.assessment.regime,
    contextLabel,
    headline,
    whyItMatters,
    operatingStanceLine,
    /* The summary ends by restating the change line, which has its own box on the
       card; cut there so the two boxes say two different things. */
    changeSummary: clampText(
      changeLine
        ?? weeklyDecisionCardModel.decision.decisionShiftSummary.split(/\s*Conditions change if:/)[0]
        ?? "",
      CHANGE_BOX_LENGTH,
    ),
    immediateDecision,
    flipCondition,
    confidenceLabel: weeklyDecisionCardModel.status.confidenceLabel,
    sourceLabel: readerSourceLabel(reportData.treasuryProvenance.sourceLabel),
    isHistorical: Boolean(reportData.historicalSelection),
    isFallback,
  };
};

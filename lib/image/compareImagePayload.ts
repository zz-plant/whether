import type { CompareOgImageProps, CompareEpoch } from "../../app/api/og/compareTemplate";
import { getRegimePublicLabel } from "../regimePresentation";
import { toImageSafeText } from "./ogFonts";
import { loadWeeklyBriefSnapshot } from "../report/weeklyBriefSnapshot";
import { hasTimeMachineEntry } from "../timeMachine/timeMachineCache";

/* The page's own default baseline (`app/history/compare/page.tsx`). */
const DEFAULT_B = { year: 2020, month: 3 };

export type CompareSearchParams = {
  yearA?: string;
  monthA?: string;
  yearB?: string;
  monthB?: string;
};

const clampText = (value: string, maxLength: number) => {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length <= maxLength) {
    return normalized;
  }
  const truncated = normalized.slice(0, maxLength - 1);
  const lastSpace = truncated.lastIndexOf(" ");
  const safeSlice = lastSpace >= Math.floor(maxLength * 0.6) ? truncated.slice(0, lastSpace) : truncated;
  return `${safeSlice.trimEnd()}\u2026`;
};

const toNumber = (value: string | undefined): number | undefined => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

function isYieldRecord(value: unknown): value is { tenYear: number; twoYear: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    "tenYear" in value &&
    typeof value.tenYear === "number" &&
    "twoYear" in value &&
    typeof value.twoYear === "number"
  );
}

const getCurveSpread = (yields: unknown): number | null => {
  if (!isYieldRecord(yields)) return null;
  return yields.tenYear - yields.twoYear;
};

const buildEpoch = (
  snapshot: Awaited<ReturnType<typeof loadWeeklyBriefSnapshot>>["snapshot"],
  label: string,
): CompareEpoch => {
  const reportData = snapshot.reportData;
  const model = snapshot.weeklyDecisionCardModel;
  const yields = reportData.treasury?.yields;

  return {
    label,
    regime: reportData.assessment.regime,
    postureLabel: toImageSafeText(
      model.status.postureWithStageLabel ?? model.status.postureLabel,
    ),
    tightness: reportData.assessment.scores.tightness ?? null,
    boldnessScore: model.decision.weeklyLeadershipSummary?.boldnessScore ?? null,
    curveSpread: getCurveSpread(yields),
  };
};

const formatEpochLabel = (year: number, month: number) => {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

export const loadComparePreview = async (
  searchParams?: CompareSearchParams,
): Promise<CompareOgImageProps> => {
  const yearA = toNumber(searchParams?.yearA);
  const monthA = toNumber(searchParams?.monthA);
  /* A month the archive does not hold loads the live week instead, silently, so
     "Dec 2008" printed this week's numbers under its label. Only a month on
     record keeps its name; anything else falls back the way the page does. */
  const requestedB = { year: toNumber(searchParams?.yearB), month: toNumber(searchParams?.monthB) };
  const bOnRecord =
    requestedB.year !== undefined && requestedB.month !== undefined && hasTimeMachineEntry(requestedB.year, requestedB.month);
  const yearB = bOnRecord && requestedB.year !== undefined ? requestedB.year : DEFAULT_B.year;
  const monthB = bOnRecord && requestedB.month !== undefined ? requestedB.month : DEFAULT_B.month;

  const hasA = yearA !== undefined && monthA !== undefined && hasTimeMachineEntry(yearA, monthA);
  const searchA = hasA ? { year: String(yearA), month: String(monthA) } : undefined;
  const searchB = { year: String(yearB), month: String(monthB) };

  const [resultA, resultB] = await Promise.all([
    loadWeeklyBriefSnapshot(searchA, { route: "/api/og/compare" }),
    loadWeeklyBriefSnapshot(searchB, { route: "/api/og/compare" }),
  ]);

  /* With no pair A the page compares the current week, so the card says "This
     week". It used to label that live reading with period B's month, so the
     default card compared "Mar 2020" against Mar 2020. */
  const epochA = buildEpoch(resultA.snapshot, hasA ? formatEpochLabel(yearA, monthA) : "This week");
  const epochB = buildEpoch(resultB.snapshot, formatEpochLabel(yearB, monthB));

  /* A is the month under examination and B the one it is measured against, the
     page's own framing — so the sentence is "A against B" and every delta is
     A − B. The headline used to read "Freezing to Sunny · boldness -19": "to"
     implied the move ran A to B while the number was A − B, so a rise of 19
     points printed as a fall, under a name the site retired. */
  const regimeA = getRegimePublicLabel(epochA.regime);
  const regimeB = getRegimePublicLabel(epochB.regime);

  return {
    eyebrow: "Compare periods",
    headline: toImageSafeText(clampText(`${epochA.label} (${regimeA}) against ${epochB.label} (${regimeB})`, 72)),
    epochA,
    epochB,
  };
};

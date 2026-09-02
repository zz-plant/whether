import type { CompareOgImageProps, CompareEpoch } from "../../app/api/og/compareTemplate";
import { getRegimePublicLabel } from "../regimePresentation";
import { toImageSafeText } from "./ogFonts";
import { loadWeeklyBriefSnapshot } from "../report/weeklyBriefSnapshot";

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
    recordDate: toImageSafeText(reportData.weeklyRecordDateLabel),
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
  const yearB = toNumber(searchParams?.yearB) ?? 2020;
  const monthB = toNumber(searchParams?.monthB) ?? 3;

  const hasA = yearA !== undefined && monthA !== undefined;
  const searchA = hasA ? { year: String(yearA), month: String(monthA) } : undefined;
  const searchB = { year: String(yearB), month: String(monthB) };

  const [resultA, resultB] = await Promise.all([
    loadWeeklyBriefSnapshot(searchA, { route: "/api/og/compare" }),
    loadWeeklyBriefSnapshot(searchB, { route: "/api/og/compare" }),
  ]);

  const epochA = buildEpoch(resultA.snapshot, formatEpochLabel(yearA ?? yearB, monthA ?? monthB));
  const epochB = buildEpoch(resultB.snapshot, formatEpochLabel(yearB, monthB));

  const boldnessDelta =
    epochA.boldnessScore !== null && epochB.boldnessScore !== null
      ? epochA.boldnessScore - epochB.boldnessScore
      : null;
  const regimeA = getRegimePublicLabel(epochA.regime);
  const regimeB = getRegimePublicLabel(epochB.regime);

  const headlineParts = [`${regimeA} to ${regimeB}`];
  if (boldnessDelta !== null) {
    headlineParts.push(`boldness ${boldnessDelta > 0 ? "+" : ""}${boldnessDelta.toFixed(0)}`);
  }
  headlineParts.push("across two periods");

  return {
    eyebrow: "Compare periods",
    headline: toImageSafeText(clampText(headlineParts.join(" · "), 72)),
    epochA,
    epochB,
  };
};

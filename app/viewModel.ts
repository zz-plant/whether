import type { RegimeKey } from "../../lib/regimeEngineCore";
import { REGIME_PUBLIC_LABELS } from "../../lib/regimePresentation";

export type SignalDirection = "tighten" | "ease" | "hold";

export const DIRECTION_ARROW: Record<SignalDirection, string> = {
  tighten: "↑", ease: "↓", hold: "→",
};

export const DIRECTION_LABEL: Record<SignalDirection, string> = {
  tighten: "Tightening", ease: "Easing", hold: "Holding",
};

export const DIRECTION_COLOR: Record<SignalDirection, string> = {
  tighten: "text-rose-300", ease: "text-emerald-300", hold: "text-slate-400",
};

export const DIRECTION_ACCENT: Record<SignalDirection, string> = {
  tighten: "border-t-rose-400/30", ease: "border-t-emerald-400/30", hold: "border-t-sky-400/30",
};

export const CONFIDENCE_COLOR = (label: string) =>
  label === "HIGH" ? "text-emerald-300" : label === "MED" ? "text-amber-300" : "text-rose-300";

export const RELIABILITY_COLOR = (score: number) =>
  score >= 80 ? "text-emerald-300" : score >= 60 ? "text-amber-300" : "text-rose-300";

export const RELIABILITY_BAR = (score: number) =>
  score >= 80 ? "bg-emerald-400" : score >= 60 ? "bg-amber-400" : "bg-rose-400";

// Record<string, string> lets consumers index dictionary keys at call sites.
// satisfies checks that all RegimeKey values have entries — remove a regime, get a compile error.
export const REGIME_DESCRIPTOR: Record<string, string> = {
  EXPANSION: "growth conditions",
  DEFENSIVE: "operating efficiently",
  SCARCITY: "capital constrained",
  VOLATILE: "mixed signals",
} satisfies Record<RegimeKey, string>;

export const REGIME_DISPLAY: Record<string, string> = { ...REGIME_PUBLIC_LABELS } satisfies Record<RegimeKey, string>;

export const REGIME_COLORS: Record<string, string> = {
  SCARCITY: "bg-amber-400/60",
  DEFENSIVE: "bg-rose-400/60",
  VOLATILE: "bg-sky-400/60",
  EXPANSION: "bg-emerald-400/60",
} satisfies Record<RegimeKey, string>;

export const formatBoldnessDeltaLabel = (delta: number) => {
  if (delta === 0) return "no change vs last week";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(0)} vs last week`;
};

export const computeReliabilityScore = ({
  confidenceLabel,
  showOfflineBadge,
  degradedCount,
}: {
  confidenceLabel: string;
  showOfflineBadge?: boolean;
  degradedCount: number;
}) => {
  const c = confidenceLabel === "HIGH" ? 90 : confidenceLabel === "MED" ? 60 : 30;
  const f = showOfflineBadge ? 50 : 100;
  const t = Math.max(degradedCount + 3, 4);
  return Math.round((c + f + Math.round(((t - degradedCount) / t) * 100)) / 3);
};

export type V2HeroSignalData = {
  baseRate?: number | null;
  baseRateUsed?: string;
  curveSlope?: number | null;
  macroContributors?: string[];
  tightnessThreshold?: number;
};

type V2HeroReportData = {
  assessment: {
    scores: {
      baseRate?: number | null;
      baseRateUsed?: string;
      curveSlope?: number | null;
    };
    thresholds: {
      tightnessRegime?: number;
    };
  };
  reportDynamics?: {
    signalContributions?: Array<{
      label: string;
      normalizedPercentLabel?: string;
      normalized?: number;
      unavailable?: boolean;
    }>;
  };
};

export const buildV2HeroSignalData = (reportData: V2HeroReportData): V2HeroSignalData => {
  const topContributors = (reportData.reportDynamics?.signalContributions ?? [])
    .filter((item) => !item.unavailable)
    .slice(0, 3)
    .map((item) => {
      if (item.normalizedPercentLabel) {
        return `${item.label} ${item.normalizedPercentLabel}`;
      }

      if (typeof item.normalized === "number") {
        return `${item.label} ${Math.round(item.normalized * 100)}%`;
      }

      return item.label;
    });

  return {
    baseRate: reportData.assessment.scores.baseRate ?? null,
    baseRateUsed: reportData.assessment.scores.baseRateUsed,
    curveSlope: reportData.assessment.scores.curveSlope ?? null,
    macroContributors: topContributors.length ? topContributors : undefined,
    tightnessThreshold: reportData.assessment.thresholds.tightnessRegime,
  };
};

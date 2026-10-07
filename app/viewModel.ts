import type { RegimeKey } from "../lib/regimeEngineCore";

export type SignalDirection = "tighten" | "ease" | "hold";

export const DIRECTION_ARROW: Record<SignalDirection, string> = {
  tighten: "↑", ease: "↓", hold: "→",
};

export const DIRECTION_LABEL: Record<SignalDirection, string> = {
  tighten: "Tightening", ease: "Easing", hold: "Steady",
};

export const CONFIDENCE_COLOR = (label: string) =>
  label === "HIGH" ? "text-emerald-300" : label === "MED" ? "text-amber-300" : "text-rose-300";

// Record<string, string> lets consumers index dictionary keys at call sites.
// satisfies checks that all RegimeKey values have entries — remove a regime, get a compile error.
export const REGIME_COLORS: Record<string, string> = {
  SCARCITY: "bg-rose-400/60",
  DEFENSIVE: "bg-amber-400/60",
  VOLATILE: "bg-violet-400/60",
  EXPANSION: "bg-emerald-400/60",
} satisfies Record<RegimeKey, string>;

export const formatBoldnessDeltaLabel = (delta: number) => {
  if (delta === 0) return "no change vs last week";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(0)} vs last week`;
};

/*
 * `computeReliabilityScore` lived here, with a colour and a bar to render it in
 * three bands. It averaged three invented numbers — confidence as 90/60/30, an
 * offline flag as 100/50, and a degraded-source ratio over `max(degraded + 3, 4)`,
 * where the 3 was justified nowhere — into a 0-100 "reliability" figure.
 *
 * Nothing ever rendered it, which was lucky: its own tests pinned MED at 87 and
 * LOW at 77 with every source healthy, against bands calling 80 green and 60
 * amber. So the entire confidence range landed between 77 and 97, LOW read amber
 * and MED read green, and the number looked measured while discriminating almost
 * nothing. Deleted rather than recalibrated — the site already publishes a
 * confidence label and, since the archive study, the record behind it.
 */

type V2HeroSignalData = {
  baseRate?: number | null;
  baseRateUsed?: string;
  curveSlope?: number | null;
  macroContributors?: string[];
  tightnessThreshold?: number;
  riskAppetiteThreshold?: number;
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
      riskAppetiteRegime?: number;
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

  const signalData: V2HeroSignalData = {
    baseRate: reportData.assessment.scores.baseRate ?? null,
    baseRateUsed: reportData.assessment.scores.baseRateUsed,
    curveSlope: reportData.assessment.scores.curveSlope ?? null,
    macroContributors: topContributors.length ? topContributors : undefined,
    tightnessThreshold: reportData.assessment.thresholds.tightnessRegime,
  };

  if (typeof reportData.assessment.thresholds.riskAppetiteRegime === "number") {
    signalData.riskAppetiteThreshold = reportData.assessment.thresholds.riskAppetiteRegime;
  }

  return signalData;
};

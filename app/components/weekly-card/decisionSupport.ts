import type { RoleAwareOperatingTemplate } from "../../../lib/report/operatingCalls";
import type { TransitionVelocityEstimate } from "../../../lib/report/forecastModel";
import { compactRoleCue } from "./shared";

export type RegimeDistanceInput = {
  thresholdDirection: "riseAbove" | string;
  thresholdValue: number;
  pointsToFlip: number;
  dimensionLabel: string;
};

export type DecisionDeltaStripItem = {
  id: "changed" | "revisit" | "flip";
  label: string;
  detail: string;
  impact: "high" | "medium" | "low";
  href: string;
};

export type LiveBandChip = {
  id: string;
  label: string;
  tone: "neutral" | "positive" | "warning";
};

export const buildFounderDecisionRows = ({
  postureLabel,
  guardrail,
  reversalTrigger,
}: {
  postureLabel: string;
  guardrail: string;
  reversalTrigger: string;
}) => {
  const normalizedLabel = postureLabel.toLowerCase();

  if (normalizedLabel.includes("scarcity") || normalizedLabel.includes("contraction")) {
    return [
      { area: "Hiring", action: "Tighten to backfills and revenue-critical roles", cue: guardrail },
      { area: "Fundraising", action: "Prioritize raise readiness now; avoid timing risk", cue: reversalTrigger },
      { area: "Runway", action: "Extend runway and freeze irreversible spend", cue: "Review weekly until trigger clears" },
    ];
  }

  if (normalizedLabel.includes("defensive") || normalizedLabel.includes("mixed") || normalizedLabel.includes("transitional")) {
    return [
      { area: "Hiring", action: "Hold net-new hiring to highest-payback roles", cue: guardrail },
      { area: "Fundraising", action: "Prepare raise narrative and move when window improves", cue: reversalTrigger },
      { area: "Runway", action: "Maintain runway floor with tranche-based releases", cue: "Require explicit stop triggers" },
    ];
  }

  return [
    { area: "Hiring", action: "Accelerate selectively in proven demand lanes", cue: guardrail },
    { area: "Fundraising", action: "Run a planned process while market weather is supportive", cue: reversalTrigger },
    { area: "Runway", action: "Deploy on reversible bets and protect downside bands", cue: "Pause if threshold trigger fires" },
  ];
};

const normalizeCueFragments = (text: string) =>
  compactRoleCue(text)
    .split(";")
    .map((fragment) => fragment.trim().replace(/[.;]+$/, ""))
    .filter(Boolean);

export const buildDecisionDeltaStripItems = ({
  weeklyMemoLines,
  immediateDecision,
  revisitDecisions,
  guardrail,
  regimeDistance,
  sectionHrefByLabel,
}: {
  weeklyMemoLines: string[];
  immediateDecision: string;
  revisitDecisions: boolean;
  guardrail: string;
  regimeDistance: RegimeDistanceInput;
  sectionHrefByLabel: {
    call: string;
    decide: string;
    evidence: string;
  };
}): DecisionDeltaStripItem[] => {
  const firstDelta = weeklyMemoLines.find((line) => line.trim().length > 0) ?? immediateDecision;
  const flipDirection = regimeDistance.thresholdDirection === "riseAbove" ? "rises above" : "falls to or below";
  const flipDistance = Math.max(0, Math.round(regimeDistance.pointsToFlip));

  return [
    {
      id: "changed",
      label: "Changed",
      detail: firstDelta,
      impact: "high",
      href: sectionHrefByLabel.call,
    },
    {
      id: "revisit",
      label: "Revisit",
      detail: revisitDecisions ? `YES — ${guardrail}` : "NO — keep this week’s plan on the current track.",
      impact: revisitDecisions ? "high" : "low",
      href: sectionHrefByLabel.decide,
    },
    {
      id: "flip",
      label: "Flip",
      detail: `${regimeDistance.dimensionLabel} ${flipDirection} ${regimeDistance.thresholdValue.toFixed(1)} (${flipDistance} pts away).`,
      impact: flipDistance <= 3 ? "high" : "medium",
      href: sectionHrefByLabel.evidence,
    },
  ];
};

export const impactToneClass: Record<DecisionDeltaStripItem["impact"], string> = {
  high: "border-amber-400/45 bg-amber-500/10 text-amber-100",
  medium: "border-sky-400/45 bg-sky-500/10 text-sky-100",
  low: "border-emerald-400/45 bg-emerald-500/10 text-emerald-100",
};

export const buildRoleTemplateBullets = ({
  roleAwareTemplates,
  field,
  maxItems = 5,
}: {
  roleAwareTemplates: RoleAwareOperatingTemplate[];
  field: "doNow" | "avoidNow";
  maxItems?: number;
}) => {
  const uniqueBullets = new Set<string>();

  roleAwareTemplates.forEach((template) => {
    normalizeCueFragments(template[field]).forEach((fragment) => {
      const normalized = fragment.toLowerCase();
      if (!uniqueBullets.has(normalized)) {
        uniqueBullets.add(normalized);
      }
    });
  });

  return Array.from(uniqueBullets)
    .slice(0, Math.max(1, maxItems))
    .map((bullet) => bullet.charAt(0).toUpperCase() + bullet.slice(1));
};

export const buildWatchBullets = ({
  regimeDistance,
  regimeVelocity,
}: {
  regimeDistance: RegimeDistanceInput;
  regimeVelocity: TransitionVelocityEstimate;
}) => {
  const distanceDirection = regimeDistance.thresholdDirection === "riseAbove" ? "rises above" : "falls to or below";
  const distanceBullet = `${regimeDistance.dimensionLabel} ${distanceDirection} ${regimeDistance.thresholdValue.toFixed(1)} (${Math.max(0, regimeDistance.pointsToFlip).toFixed(1)} pts away)`;
  const velocityBullet = regimeVelocity.status === "ok"
    ? `${regimeVelocity.from}→${regimeVelocity.to} can flip in ${regimeVelocity.typicalRangeLabel}`
    : `${regimeVelocity.from}→${regimeVelocity.to} timing is uncertain (${regimeVelocity.sampleSize} sample${regimeVelocity.sampleSize === 1 ? "" : "s"})`;

  return [distanceBullet, velocityBullet].slice(0, 5);
};

export const resolveLiveBandChips = ({
  confidenceLabel,
  confidencePercent,
  trendLabel,
  transitionWatch,
  regimeDistance,
}: {
  confidenceLabel: "HIGH" | "MED" | "LOW";
  confidencePercent: number;
  trendLabel: string;
  transitionWatch: "ON" | "OFF";
  regimeDistance: RegimeDistanceInput;
}): LiveBandChip[] => {
  const trendLower = trendLabel.toLowerCase();
  const confidenceTone = confidenceLabel === "HIGH" ? "positive" : confidenceLabel === "MED" ? "neutral" : "warning";
  const trendTone = trendLower.includes("improv") ? "positive" : trendLower.includes("deterior") ? "warning" : "neutral";
  const watchTone = transitionWatch === "ON" ? "warning" : "neutral";
  const flipTone = regimeDistance.pointsToFlip <= 3 ? "warning" : "neutral";

  return [
    {
      id: "confidence",
      label: `Confidence ${confidenceLabel} ${Math.round(confidencePercent)}%`,
      tone: confidenceTone,
    },
    {
      id: "trend",
      label: `Trend ${trendLabel}`,
      tone: trendTone,
    },
    {
      id: "watch",
      label: transitionWatch === "ON" ? "Transition watch active" : "Transition watch stable",
      tone: watchTone,
    },
    {
      id: "flip",
      label: `Flip risk in ${Math.max(1, Math.round(regimeDistance.pointsToFlip))} pts`,
      tone: flipTone,
    },
  ];
};

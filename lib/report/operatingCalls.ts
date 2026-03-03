import type { RegimeKey } from "../regimeEngine";

export type OperatingCall = {
  hiring: string;
  roadmap: string;
  spend: string;
};

export const operatingCallsByRegime: Record<RegimeKey, OperatingCall> = {
  SCARCITY: {
    hiring: "Maintain freeze",
    roadmap: "Cut to must-win commitments",
    spend: "Require immediate payback",
  },
  DEFENSIVE: {
    hiring: "Backfill critical roles only",
    roadmap: "Favor retention and reliability",
    spend: "Gate discretionary programs",
  },
  VOLATILE: {
    hiring: "Stay selective by role",
    roadmap: "Prioritize near-term ROI",
    spend: "Fund only measurable returns",
  },
  EXPANSION: {
    hiring: "Add targeted growth capacity",
    roadmap: "Scale validated bets",
    spend: "Increase with guardrails",
  },
};

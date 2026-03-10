/**
 * Playbook selectors for mapping regimes to operational stop/start/fence guidance.
 * Keeps playbook copy centralized and traceable to the insight database.
 */
import { insightDatabase } from "../data/recommendations";
import type { RegimeKey } from "./regimeEngine";
import { operatingLeverLabel, operatingLeverOrder, type OperatingLeverKey } from "./report/decisionKnobs";

type PlaybookOperatingLever = {
  lever: OperatingLeverKey;
  label: string;
  actionNow: string;
  triggerThreshold: string;
  reversalCondition: string;
};

export interface PlaybookEntry {
  key: RegimeKey;
  title: string;
  tone: string;
  mandate: string;
  insight: string;
  leadershipPhrases: {
    more: readonly string[];
    less: readonly string[];
  };
  stop: readonly string[];
  start: readonly string[];
  metric: string;
}

export interface PlaybookGuidance {
  playbook: PlaybookEntry | null;
  stopItems: string[];
  startItems: string[];
  operatingLevers: PlaybookOperatingLever[];
}

const DEFAULT_STOP_ITEMS = ["Avoid unbudgeted bets."];
const DEFAULT_START_ITEMS = ["Invest in margin-positive moves."];

const defaultLeverFallbacks: Record<OperatingLeverKey, Omit<PlaybookOperatingLever, "lever" | "label">> = {
  "hiring-stance": {
    actionNow: "Keep approvals tied to delivery-critical roles.",
    triggerThreshold: "Tighten if delivery confidence degrades or hiring risk rises.",
    reversalCondition: "Loosen when signal confidence and delivery stability recover.",
  },
  "investment-pace": {
    actionNow: "Sequence spend into short-cycle, measurable payback moves.",
    triggerThreshold: "Tighten if payback slips or financing pressure rises.",
    reversalCondition: "Loosen when payback proof improves for consecutive cycles.",
  },
  "sales-posture": {
    actionNow: "Bias GTM toward pipeline quality and conversion resilience.",
    triggerThreshold: "Tighten if conversion quality drops or cycle times lengthen.",
    reversalCondition: "Loosen when conversion quality and win rates recover.",
  },
  "product-priorities": {
    actionNow: "Prioritize roadmap work with clear near-term activation or retention impact.",
    triggerThreshold: "Tighten if activation/retention evidence weakens.",
    reversalCondition: "Loosen when milestone evidence improves and holds.",
  },
  "risk-tolerance": {
    actionNow: "Keep irreversible bets gated behind staged checkpoints.",
    triggerThreshold: "Tighten when threshold proximity or volatility risk increases.",
    reversalCondition: "Loosen after improvement persists across confirmation reads.",
  },
};

const buildPlaybookOperatingLevers = (regime: RegimeKey): PlaybookOperatingLever[] =>
  operatingLeverOrder.map((lever) => {
    const fallback = defaultLeverFallbacks[lever];
    const regimeAdjustment = regime === "EXPANSION" ? " while preserving reversal triggers." : ".";

    return {
      lever,
      label: operatingLeverLabel[lever],
      actionNow: fallback.actionNow.replace(/\.$/, regimeAdjustment),
      triggerThreshold: fallback.triggerThreshold,
      reversalCondition: fallback.reversalCondition,
    };
  });

export const getPlaybookForRegime = (regime: RegimeKey): PlaybookEntry | null => {
  const match = insightDatabase.regimePlaybooks.regimes.find((entry) => entry.key === regime);
  return match ?? null;
};

export const getPlaybookGuidance = (regime: RegimeKey): PlaybookGuidance => {
  const playbook = getPlaybookForRegime(regime);
  return {
    playbook,
    stopItems: playbook ? [...playbook.stop] : DEFAULT_STOP_ITEMS,
    startItems: playbook ? [...playbook.start] : DEFAULT_START_ITEMS,
    operatingLevers: buildPlaybookOperatingLevers(regime),
  };
};

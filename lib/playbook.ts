/**
 * Playbook selectors for mapping regimes to operational stop/start/fence guidance.
 * Keeps playbook copy centralized and traceable to the insight database.
 */
import { insightDatabase } from "../data/recommendations";
import type { RegimeKey } from "./regimeEngine";
import { operatingLeverLabel, type OperatingLeverKey } from "./report/decisionKnobs";
import { buildCanonicalBoundedDecisionRules } from "./report/boundedDecisionRules";
import { buildActionStripItems } from "./report/operatingCalls";
import { decisionAreaToOperatingLever } from "./report/operatingLeverMap";

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

const CANONICAL_RULE_FALLBACK = {
  actionNow: "Keep current operating posture until a rule refresh is available.",
  triggerThreshold: "Tighten only if confidence and threshold signals worsen.",
  reversalCondition: "Loosen only when threshold conditions recover and hold.",
} satisfies Omit<PlaybookOperatingLever, "lever" | "label">;

const DEFAULT_PLAYBOOK_RULE_CONTEXT = {
  thresholds: {
    tightnessRegime: 70,
    riskAppetiteRegime: 50,
  },
  scores: {
    tightness: 70,
    riskAppetite: 50,
  },
};

const buildPlaybookOperatingLevers = ({
  regime,
  thresholds = DEFAULT_PLAYBOOK_RULE_CONTEXT.thresholds,
  scores = DEFAULT_PLAYBOOK_RULE_CONTEXT.scores,
}: {
  regime: RegimeKey;
  thresholds?: { tightnessRegime: number; riskAppetiteRegime: number };
  scores?: { tightness: number; riskAppetite: number };
}): PlaybookOperatingLever[] => {
  const canonicalRules = buildCanonicalBoundedDecisionRules({ regime, thresholds, scores });
  const actionStripItems = buildActionStripItems(canonicalRules);
  const actionStripByLever = new Map(actionStripItems.map((item) => [item.lever, item]));

  return canonicalRules.map((rule) => {
    const lever = decisionAreaToOperatingLever[rule.area];
    const stripItem = actionStripByLever.get(lever);

    return {
      lever,
      label: operatingLeverLabel[lever],
      actionNow: stripItem?.actionNow ?? CANONICAL_RULE_FALLBACK.actionNow,
      triggerThreshold: stripItem?.triggerThreshold ?? CANONICAL_RULE_FALLBACK.triggerThreshold,
      reversalCondition: stripItem?.reversalCondition ?? CANONICAL_RULE_FALLBACK.reversalCondition,
    };
  });
};

export const getPlaybookForRegime = (regime: RegimeKey): PlaybookEntry | null => {
  const match = insightDatabase.regimePlaybooks.regimes.find((entry) => entry.key === regime);
  return match ?? null;
};

export const getPlaybookGuidance = (
  regime: RegimeKey,
  ruleContext?: {
    thresholds?: { tightnessRegime: number; riskAppetiteRegime: number };
    scores?: { tightness: number; riskAppetite: number };
  },
): PlaybookGuidance => {
  const playbook = getPlaybookForRegime(regime);
  return {
    playbook,
    stopItems: playbook ? [...playbook.stop] : DEFAULT_STOP_ITEMS,
    startItems: playbook ? [...playbook.start] : DEFAULT_START_ITEMS,
    operatingLevers: buildPlaybookOperatingLevers({ regime, ...ruleContext }),
  };
};

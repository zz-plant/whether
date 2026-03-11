/**
 * Playbook selectors for mapping regimes to operational stop/start/fence guidance.
 * Keeps playbook copy centralized and traceable to the insight database.
 */
import { insightDatabase } from "../data/recommendations";
import { DEFAULT_THRESHOLDS } from "./regimeEngine";
import type { RegimeKey } from "./regimeEngine";
import { buildCanonicalBoundedDecisionRules, type DecisionArea } from "./report/boundedDecisionRules";
import { operatingLeverLabel, operatingLeverOrder, type OperatingLeverKey } from "./report/decisionKnobs";
import { buildActionStripItems, decisionAreaToOperatingLever } from "./report/operatingCalls";

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

const canonicalAreaByOperatingLever: Record<OperatingLeverKey, DecisionArea> = {
  "hiring-stance": "hiring",
  "investment-pace": "burn-discipline",
  "sales-posture": "capital-raising",
  "product-priorities": "product-tempo",
  "risk-tolerance": "expansion-bets",
};

const buildPlaybookOperatingLevers = (
  regime: RegimeKey,
  context?: {
    thresholds?: { tightnessRegime: number; riskAppetiteRegime: number };
    scores?: { tightness: number; riskAppetite: number };
  },
): PlaybookOperatingLever[] => {
  const canonicalRules = buildCanonicalBoundedDecisionRules({
    regime,
    thresholds: context?.thresholds ?? DEFAULT_THRESHOLDS,
    scores: context?.scores ?? {
      tightness: DEFAULT_THRESHOLDS.tightnessRegime,
      riskAppetite: DEFAULT_THRESHOLDS.riskAppetiteRegime,
    },
  });
  const canonicalItemsByLever = new Map(
    buildActionStripItems(canonicalRules).map((item) => [item.lever, item]),
  );

  return operatingLeverOrder.map((lever) => {
    const area = canonicalAreaByOperatingLever[lever];
    const mappedLever = decisionAreaToOperatingLever[area];
    const canonicalItem = canonicalItemsByLever.get(lever);

    return {
      lever,
      label: canonicalItem?.label ?? operatingLeverLabel[mappedLever],
      actionNow: canonicalItem?.actionNow ?? "Keep current operating posture until a canonical rule refresh is available.",
      triggerThreshold: canonicalItem?.triggerThreshold ?? "Tighten only if confidence and threshold signals worsen.",
      reversalCondition: canonicalItem?.reversalCondition ?? "Loosen only when threshold conditions recover and hold.",
    };
  });
};

export const getPlaybookForRegime = (regime: RegimeKey): PlaybookEntry | null => {
  const match = insightDatabase.regimePlaybooks.regimes.find((entry) => entry.key === regime);
  return match ?? null;
};

export const getPlaybookGuidance = (
  regime: RegimeKey,
  context?: {
    thresholds?: { tightnessRegime: number; riskAppetiteRegime: number };
    scores?: { tightness: number; riskAppetite: number };
  },
): PlaybookGuidance => {
  const playbook = getPlaybookForRegime(regime);
  return {
    playbook,
    stopItems: playbook ? [...playbook.stop] : DEFAULT_STOP_ITEMS,
    startItems: playbook ? [...playbook.start] : DEFAULT_START_ITEMS,
    operatingLevers: buildPlaybookOperatingLevers(regime, context),
  };
};

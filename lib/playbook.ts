/**
 * Playbook selectors for mapping regimes to operational stop/start/fence guidance.
 * Keeps playbook copy centralized and traceable to the insight database.
 */
import { insightDatabase } from "../data/recommendations";
import type { RegimeKey } from "./regimeEngine";
import { getRegimePublicLabel } from "./regimePresentation";
import { businessAreaLabel, businessAreaOrder, type BusinessAreaKey } from "./report/decisionKnobs";
import { buildCanonicalBoundedDecisionRules } from "./report/boundedDecisionRules";
import { buildActionStripItems } from "./report/operatingCalls";
import { formatDecisionAction, formatDecisionReversal, formatDecisionThreshold } from "./report/reportFormatting";

type PlaybookOperatingLever = {
  lever: BusinessAreaKey;
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

interface PlaybookGuidance {
  playbook: PlaybookEntry | null;
  stopItems: string[];
  startItems: string[];
  operatingLevers: PlaybookOperatingLever[];
}

const DEFAULT_STOP_ITEMS = ["Avoid unbudgeted bets."];
const DEFAULT_START_ITEMS = ["Invest in margin-positive moves."];

const CANONICAL_RULE_FALLBACK = {
  actionNow: formatDecisionAction("Keep your current plan and hold new commitments."),
  triggerThreshold: formatDecisionThreshold("Pause if funding pressure rises above 60 or risk appetite falls below 40."),
  reversalCondition: formatDecisionReversal("Resume staged approvals when funding pressure falls below 50 and risk appetite is above 50."),
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

  return businessAreaOrder.map((lever) => {
    const stripItem = actionStripByLever.get(lever);

    return {
      lever,
      label: businessAreaLabel[lever],
      actionNow: stripItem?.areaActionNow ?? CANONICAL_RULE_FALLBACK.actionNow,
      triggerThreshold: stripItem?.triggerThreshold ?? CANONICAL_RULE_FALLBACK.triggerThreshold,
      reversalCondition: stripItem?.reversalCondition ?? CANONICAL_RULE_FALLBACK.reversalCondition,
    };
  });
};

/**
 * The public title is derived, not stored.
 *
 * `data/recommendations.ts` used to carry its own `title` per regime, and it
 * carried the *internal* names — "Scarcity", "Defensive", "Volatile",
 * "Expansion". That string is the `<h3>` of the rules panel on `/operate`, so
 * the same week the brief stamped FREEZING the plan page headlined Scarcity:
 * one condition under two public names, on two pages of a five-page loop.
 *
 * `REGIME_LABELS` exists to stop exactly that, and its own comment says four
 * byte-identical tables "drifted because readers picked one at random". A fifth
 * copy living in a data file is outside what that comment can reach, so the
 * field is gone rather than corrected — a stored title can drift again, a
 * derived one cannot.
 */
export const getPlaybookForRegime = (regime: RegimeKey): PlaybookEntry | null => {
  const match = insightDatabase.regimePlaybooks.regimes.find((entry) => entry.key === regime);
  return match ? { ...match, title: getRegimePublicLabel(match.key) } : null;
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

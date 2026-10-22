import type { DecisionAction, DecisionCategory, DecisionVerdict } from "../decisionShield";
import { DECISION_VERDICT_MATRIX } from "../decisionShieldConfig";
import type { DecisionMemoryEntry } from "../decisionMemory";
import type { RegimeKey, RegimeThresholds } from "../regimeEngineCore";
import { DEFAULT_THRESHOLDS } from "../regimeEngineCore";
import { getRegimePublicLabel } from "../regimePresentation";
import {
  buildCanonicalBoundedDecisionRules,
  isRuleConditionMet,
  type DecisionArea,
} from "./boundedDecisionRules";

export const DECISION_CATEGORY_TO_AREA: Record<DecisionCategory, DecisionArea> = {
  HIRING: "hiring",
  ROADMAP: "product-tempo",
  PRICING: "burn-discipline",
  INFRASTRUCTURE: "burn-discipline",
  M_AND_A: "expansion-bets",
  GEOGRAPHIC_EXPANSION: "expansion-bets",
  RESTRUCTURING: "burn-discipline",
};

export type SprintDecisionCandidate = {
  id?: string;
  title?: string;
  category: DecisionCategory;
  action: DecisionAction;
  context?: string;
  department?: string;
  owner?: string;
  verdict?: DecisionVerdict;
};

type SprintRetroViolation = {
  id: string;
  title: string;
  category: DecisionCategory;
  action: DecisionAction;
  area: DecisionArea;
  department?: string;
  owner?: string;
  ruleViolated: string;
  pauseCondition: string;
  avoidNowGuidance: string;
  recommendation: string;
};

type SprintRetroCompliantDecision = {
  id: string;
  title: string;
  category: DecisionCategory;
  action: DecisionAction;
  area: DecisionArea;
  status: string;
};

type ActivePauseTrigger = {
  area: DecisionArea;
  pauseVerb: string;
  pauseCondition: string;
};

export type SprintRetroReport = {
  regime: RegimeKey;
  totalDecisions: number;
  compliantCount: number;
  violationCount: number;
  violations: SprintRetroViolation[];
  compliant: SprintRetroCompliantDecision[];
  activePauseTriggers: ActivePauseTrigger[];
  headline: string;
  markdown: string;
};

const isCapitalCommitmentAction = (category: DecisionCategory, action: DecisionAction): boolean => {
  if (category === "HIRING" && action === "HIRE") return true;
  if (category === "ROADMAP" && (action === "REWRITE" || action === "LAUNCH")) return true;
  if ((category === "M_AND_A" || category === "GEOGRAPHIC_EXPANSION") && (action === "EXPAND" || action === "ACQUIRE" || action === "REGIONAL_EXPANSION")) return true;
  if (category === "INFRASTRUCTURE" && action === "INFRA_SPEND") return true;
  if (category === "PRICING" && action === "DISCOUNT") return true;
  return false;
};

const normalizeCandidate = (item: DecisionMemoryEntry | SprintDecisionCandidate, index: number): SprintDecisionCandidate => {
  if ("context" in item && typeof item.context === "object" && item.context !== null && "decision" in item) {
    const memory = item as DecisionMemoryEntry;
    const dec = memory.decision;
    return {
      id: memory.id,
      title: memory.outcome.summary || `Decision ${index + 1}`,
      category: dec?.category ?? "HIRING",
      action: dec?.action ?? "HIRE",
      context: dec?.context,
      department: memory.department,
      owner: memory.owner,
      verdict: memory.outcome.verdict,
    };
  }
  const candidate = item as SprintDecisionCandidate;
  return {
    id: candidate.id ?? `candidate-${index + 1}`,
    title: candidate.title ?? `${candidate.action.toLowerCase()} in ${candidate.category.toLowerCase()}`,
    category: candidate.category,
    action: candidate.action,
    context: candidate.context,
    department: candidate.department,
    owner: candidate.owner,
    verdict: candidate.verdict,
  };
};

export const auditSprintDecisions = ({
  decisions,
  regime,
  scores,
  thresholds = DEFAULT_THRESHOLDS,
}: {
  decisions: Array<DecisionMemoryEntry | SprintDecisionCandidate>;
  regime: RegimeKey;
  scores: { tightness: number; riskAppetite: number };
  thresholds?: RegimeThresholds;
}): SprintRetroReport => {
  const rules = buildCanonicalBoundedDecisionRules({ regime, thresholds, scores });
  const rulesByArea = new Map(rules.map((rule) => [rule.area, rule]));

  const activePauseTriggers: ActivePauseTrigger[] = [];
  for (const rule of rules) {
    const triggeredConditions = rule.pause.conditions.filter((cond) => isRuleConditionMet(cond, scores[cond.metric]));
    if (triggeredConditions.length > 0) {
      activePauseTriggers.push({
        area: rule.area,
        pauseVerb: rule.pause.verb,
        pauseCondition: triggeredConditions.map((c) => c.label).join(" or "),
      });
    }
  }

  const violations: SprintRetroViolation[] = [];
  const compliant: SprintRetroCompliantDecision[] = [];

  decisions.forEach((raw, idx) => {
    const candidate = normalizeCandidate(raw, idx);
    const area = DECISION_CATEGORY_TO_AREA[candidate.category];
    const rule = rulesByArea.get(area);
    if (!rule) return;

    const triggeredConditions = rule.pause.conditions.filter((cond) => isRuleConditionMet(cond, scores[cond.metric]));
    const pauseTriggered = triggeredConditions.length > 0;
    const baseVerdict = candidate.verdict ?? DECISION_VERDICT_MATRIX[candidate.action]?.[regime] ?? "RISKY";
    const commitsResources = isCapitalCommitmentAction(candidate.category, candidate.action);

    const isViolation = (pauseTriggered && commitsResources) || (regime !== "EXPANSION" && baseVerdict === "DANGEROUS");

    if (isViolation) {
      const pauseClause = triggeredConditions.length > 0
        ? triggeredConditions.map((c) => c.label).join(" or ")
        : rule.pause.conditions.map((c) => c.label).join(" or ");

      violations.push({
        id: candidate.id ?? `decision-${idx + 1}`,
        title: candidate.title ?? `${candidate.action} in ${candidate.category}`,
        category: candidate.category,
        action: candidate.action,
        area,
        department: candidate.department,
        owner: candidate.owner,
        ruleViolated: rule.pause.verb,
        pauseCondition: pauseClause,
        avoidNowGuidance: rule.avoidNow[0] ?? "Hold commitment until conditions ease.",
        recommendation: `Pause or attach reversal guardrail before continuing: ${rule.pause.verb} (${pauseClause}).`,
      });
    } else {
      compliant.push({
        id: candidate.id ?? `decision-${idx + 1}`,
        title: candidate.title ?? `${candidate.action} in ${candidate.category}`,
        category: candidate.category,
        action: candidate.action,
        area,
        status: `Aligned with ${regime} operating lines.`,
      });
    }
  });

  const totalDecisions = decisions.length;
  const violationCount = violations.length;
  const compliantCount = compliant.length;

  let headline: string;
  if (totalDecisions === 0) {
    headline = "No decisions recorded for this sprint.";
  } else if (violationCount === 0) {
    headline = `All ${totalDecisions} sprint decision(s) align with current ${getRegimePublicLabel(regime)} guidance.`;
  } else {
    headline = `${violationCount} of ${totalDecisions} sprint decision(s) crossed active pause triggers in ${getRegimePublicLabel(regime)} regime.`;
  }

  const markdownLines = [
    `**Sprint Retro Violation Report — ${getRegimePublicLabel(regime)}**`,
    `Guidance: ${headline}`,
    "",
  ];

  if (activePauseTriggers.length > 0) {
    markdownLines.push("Active pause lines in force:");
    for (const trigger of activePauseTriggers) {
      markdownLines.push(`- **${trigger.area}**: ${trigger.pauseVerb} (${trigger.pauseCondition})`);
    }
    markdownLines.push("");
  }

  if (violations.length > 0) {
    markdownLines.push("Commitments crossing pause lines:");
    for (const violation of violations) {
      const ownerSuffix = violation.owner ? ` [${violation.owner}]` : "";
      markdownLines.push(
        `- **[VIOLATION] ${violation.action} (${violation.area})**${ownerSuffix}: ${violation.ruleViolated} (${violation.pauseCondition}) -> ${violation.avoidNowGuidance}`,
      );
    }
    markdownLines.push("");
  }

  if (compliant.length > 0) {
    markdownLines.push(`Compliant decisions (${compliant.length}):`);
    for (const item of compliant) {
      markdownLines.push(`- ${item.action} (${item.area}): ${item.title}`);
    }
  }

  return {
    regime,
    totalDecisions,
    compliantCount,
    violationCount,
    violations,
    compliant,
    activePauseTriggers,
    headline,
    markdown: markdownLines.join("\n"),
  };
};

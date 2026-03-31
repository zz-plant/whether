import type { WeeklyDecisionCardViewModel } from "../homeBriefModel";

type ExecutiveOperationalStance = {
  expand: string[];
  avoid: string[];
};

const splitActionFragments = (value: string): string[] =>
  value
    .split(/(?<=[.;])\s+|\s+and\s+/gi)
    .map((item) => item.trim())
    .map((item) => item.replace(/[.;]+$/, "").trim())
    .filter((item) => item.length > 0);

const dedupeByStem = (items: string[]): string[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const stem = item.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!stem || seen.has(stem)) {
      return false;
    }
    seen.add(stem);
    return true;
  });
};

export const extractExecutiveOperationalStance = ({
  roleAwareTemplates,
  decisionRules,
  maxItemsPerList = 4,
}: {
  roleAwareTemplates: WeeklyDecisionCardViewModel["decision"]["roleAwareTemplates"];
  decisionRules: WeeklyDecisionCardViewModel["decision"]["decisionRules"];
  maxItemsPerList?: number;
}): ExecutiveOperationalStance => {
  const minItemsPerList = 2;
  const expandCandidates = [
    ...roleAwareTemplates.flatMap((template) => splitActionFragments(template.doNow)),
    ...decisionRules.map((rule) => rule.recommendation.trim().replace(/[.;]+$/, "")),
  ];
  const avoidCandidates = [
    ...roleAwareTemplates.flatMap((template) => splitActionFragments(template.avoidNow)),
    ...decisionRules.map((rule) =>
      rule.pauseTrigger.trim().replace(/^Pause\s+/i, "").replace(/[.;]+$/, ""),
    ),
  ];

  const clampMax = Math.max(minItemsPerList, maxItemsPerList);
  const expand = dedupeByStem(expandCandidates).slice(0, clampMax);
  const avoid = dedupeByStem(avoidCandidates).slice(0, clampMax);

  return {
    expand: expand.slice(0, Math.max(minItemsPerList, expand.length)),
    avoid: avoid.slice(0, Math.max(minItemsPerList, avoid.length)),
  };
};

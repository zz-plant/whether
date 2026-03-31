import type { BoundedDecisionRule } from "../../../lib/report/boundedDecisionRules";

const ownerLabelByArea: Record<BoundedDecisionRule["area"], string> = {
  hiring: "CEO",
  "product-tempo": "CPO",
  "capital-raising": "CEO / Finance",
  "burn-discipline": "CFO",
  "expansion-bets": "CEO",
};

const extractThresholdChips = (text: string): string[] => {
  const match = text.match(/(tightness|risk appetite)\s*(>=|<=|>|<)\s*(-?\d+(?:\.\d+)?)/i);

  if (!match) {
    return [];
  }

  const metricLabel =
    match[1].toLowerCase() === "risk appetite" ? "Risk appetite" : "Tightness";
  return [`Metric ${metricLabel}`, `Trigger ${match[2]} ${match[3]}`];
};

export const buildPolicyDetails = ({
  rule,
  summary,
  fallbackOwner,
}: {
  rule?: BoundedDecisionRule;
  summary: string;
  fallbackOwner: string;
}) => {
  if (!rule) {
    return {
      summary,
      chips: [`Owner ${fallbackOwner}`],
    };
  }

  const pauseChips = extractThresholdChips(rule.pauseTrigger);
  const firstFlip = rule.flipConditions[0];

  return {
    summary,
    chips: [
      ...(pauseChips.length > 0
        ? pauseChips
        : firstFlip
          ? [
              `Metric ${
                firstFlip.metric === "riskAppetite" ? "Risk appetite" : "Tightness"
              }`,
              `Trigger ${firstFlip.operator} ${firstFlip.value.toFixed(1)}`,
            ]
          : []),
      `Owner ${ownerLabelByArea[rule.area]}`,
    ],
  };
};

export const buildRoleTranslationCards = ({
  decisionRules,
}: {
  decisionRules: BoundedDecisionRule[];
}) => {
  const financeRule = decisionRules.find((rule) => rule.area === "burn-discipline");
  const productRule = decisionRules.find((rule) => rule.area === "product-tempo");

  return [
    {
      id: "finance" as const,
      label: "Finance",
      implication:
        financeRule?.recommendation ??
        "Translate posture into approval limits and commitment discipline.",
      doLine:
        financeRule?.doNow[0] ?? "Keep new fixed-cost commitments reversible and staged.",
      holdLine:
        financeRule?.avoidNow[0] ??
        "Do not approve multi-quarter spend without clear payback proof.",
    },
    {
      id: "product" as const,
      label: "Product",
      implication:
        productRule?.recommendation ??
        "Translate posture into roadmap pacing and scope discipline.",
      doLine:
        productRule?.doNow[0] ??
        "Prioritize near-term customer value and reversible roadmap bets.",
      holdLine:
        productRule?.avoidNow[0] ??
        "Do not expand long-payback roadmap scope without stronger proof.",
    },
  ];
};

export const resolveRoleView = (role: string | undefined): "finance" | "product" =>
  role === "product" ? "product" : "finance";

export const buildRoleHref = (
  role: "finance" | "product",
  searchParams?: Record<string, string | undefined>,
) => {
  const params = new URLSearchParams();

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (typeof value === "string" && value.length > 0 && key !== "role") {
      params.set(key, value);
    }
  });

  if (role !== "finance") {
    params.set("role", role);
  }

  const query = params.toString();
  return query.length > 0 ? `/?${query}#weekly-call-core` : "/#weekly-call-core";
};

export const getOwnerLabelForArea = (area: BoundedDecisionRule["area"]) =>
  ownerLabelByArea[area];

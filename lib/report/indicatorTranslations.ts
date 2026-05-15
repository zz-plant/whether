/**
 * Loop stage owner: signal → posture (trust/accessibility).
 *
 * Provides plain-English translations for macroeconomic indicators,
 * regime labels, and signal terminology. Designed to help operators
 * with no prior macro knowledge understand what each indicator means
 * and what decision it implies this week.
 *
 * This module is pure data/functions — no React or UI dependencies.
 */

import type { RegimeSignalKey } from "./reportFormatting";
import type { RegimeKey } from "../regimeEngine";

// ── Indicator-level plain-English translations ──

export type IndicatorPlainEnglish = {
  /** Human-readable label. e.g., "Cash availability" instead of "Capital tightness" */
  plainLabel: string;
  /** One-line summary of what this indicator captures. */
  whatItMeasures: string;
  /** What a HIGH value typically means for an operator. */
  highMeans: string;
  /** What a LOW value typically means for an operator. */
  lowMeans: string;
  /** What a MID-RANGE value typically means for an operator. */
  midMeans: string;
  /** The jargon term this translates. */
  jargonTerm: string;
  /** What to ask yourself when you see this number change. */
  operatorPrompt: string;
};

export const indicatorPlainEnglish: Record<RegimeSignalKey, IndicatorPlainEnglish> = {
  tightness: {
    plainLabel: "Cash availability",
    whatItMeasures:
      "How hard or easy it is for U.S. companies to raise and borrow money right now.",
    highMeans:
      "Money is tight — conserve cash, extend runway, defer big bets. Fundraising windows are narrow.",
    lowMeans:
      "Money is flowing — you can invest in growth, hire ahead of revenue, and lengthen payback timelines.",
    midMeans:
      "Money is balanced — stage investments with milestones; don't over-extend but don't freeze either.",
    jargonTerm: "Capital tightness",
    operatorPrompt: "If I needed to raise or borrow money this month, how hard would it be?",
  },
  riskAppetite: {
    plainLabel: "Market risk appetite",
    whatItMeasures:
      "How willing U.S. investors and buyers are to take risk on new products, hires, and growth bets.",
    highMeans:
      "Investors and markets are bold — launch new products, expand headcount, raise capital confidently.",
    lowMeans:
      "Markets are risk-averse — focus on retention, profitability, and core product. Delay speculative launches.",
    midMeans:
      "Markets are selectively open — prove traction before scaling; get customer evidence before committing big spend.",
    jargonTerm: "Risk appetite",
    operatorPrompt: "Would a new product launch or expansion hire get funded or questioned right now?",
  },
  baseRate: {
    plainLabel: "Fed interest rate",
    whatItMeasures: "The baseline cost of money set by the Federal Reserve. Higher means borrowing costs more.",
    highMeans:
      "Borrowing is expensive — prioritize cash-flow-positive work, extend runway, and avoid debt-heavy growth.",
    lowMeans:
      "Borrowing is cheap — it's a good time to invest in growth, lock in long-term contracts, and consider measured leverage.",
    midMeans:
      "Rates are moderate — plan as if rates stay here; hedge floating-rate exposure if you carry debt.",
    jargonTerm: "Base rate",
    operatorPrompt: "Does my company carry debt or rely on outside capital? If yes, this number matters.",
  },
  curveSlope: {
    plainLabel: "Recession warning gauge",
    whatItMeasures:
      "A U.S. Treasury market signal that historically warns of recession. Negative (inverted) means caution.",
    highMeans:
      "No recession warning — the yield curve is normal. Long-horizon planning is safer.",
    lowMeans:
      "Recession warning active — the yield curve is inverted or flat. Favor short-payback projects and conserve optionality.",
    midMeans:
      "Curve is neutral/flat — don't over-index on this signal alone; combine with cash availability and risk appetite reads.",
    jargonTerm: "Yield curve slope",
    operatorPrompt: "If I'm planning a 12+ month project, does this signal support that timeline?",
  },
};

// ── Regime plain-English translations ──

export type RegimePlainEnglish = {
  plainLabel: string;
  /** The operating stance in plain terms. */
  stance: string;
  /** What this regime means for day-to-day decisions. */
  whatItMeans: string;
  /** Concrete examples of what to do. */
  doExamples: string[];
  /** Concrete examples of what to avoid. */
  avoidExamples: string[];
};

export const regimePlainEnglish: Record<RegimeKey, RegimePlainEnglish> = {
  SCARCITY: {
    plainLabel: "Defend",
    stance: "Protect cash and extend runway above all else.",
    whatItMeans:
      "Money is tight and markets are risk-averse. Your primary job is survival — preserve cash, cut non-essential spend, and focus on what keeps the lights on.",
    doExamples: [
      "Freeze hiring except for critical roles",
      "Renegotiate vendor contracts",
      "Focus product on retention and core revenue",
      "Prepare fundraising materials now",
    ],
    avoidExamples: [
      "New product launches without committed customers",
      "Long-term commitments or multi-year contracts",
      "Expanding into new markets",
      "Bonus pools or discretionary spend",
    ],
  },
  DEFENSIVE: {
    plainLabel: "Conserve",
    stance: "Gate new commitments to short-payback work only.",
    whatItMeans:
      "Conditions are cautious but not critical. Approve only work that pays back quickly. Keep a cash buffer and avoid bets that take years to prove out.",
    doExamples: [
      "Approve only projects with <12 month payback",
      "Hire for revenue-generating roles",
      "Lock in renewal revenue",
      "Build a 6-month cash bridge plan",
    ],
    avoidExamples: [
      "Speculative R&D without customer pull",
      "Headcount growth ahead of revenue",
      "Acquisitions or large capital outlays",
      "Over-hiring in non-revenue functions",
    ],
  },
  VOLATILE: {
    plainLabel: "Guarded Expand",
    stance: "Approve only reversible bets with explicit checkpoint exits.",
    whatItMeans:
      "Conditions are mixed — some signals support growth, others warn caution. Make small, reversible moves. Set clear success/failure checkpoints for every new initiative.",
    doExamples: [
      "Run small experiments before scaling",
      "Hire with 90-day performance gates",
      "Launch features as MVPs with kill criteria",
      "Keep 3 months of operating cash as buffer",
    ],
    avoidExamples: [
      "All-in product bets without staged rollouts",
      "Over-hiring without revenue coverage",
      "Multi-year commitments without escape clauses",
      "Ignoring early warning signals in your own metrics",
    ],
  },
  EXPANSION: {
    plainLabel: "Expand",
    stance: "Scale proven bets with milestone-based approval gates.",
    whatItMeans:
      "Money is flowing and markets are confident. This is the time to invest in growth — but stay disciplined. Scale what's working, don't chase everything.",
    doExamples: [
      "Accelerate hiring for proven product lines",
      "Invest in go-to-market and sales capacity",
      "Expand into adjacent customer segments",
      "Lock in favorable long-term contracts",
    ],
    avoidExamples: [
      "Hiring without clear ownership and milestones",
      "Entering markets without customer validation",
      "Ignoring unit economics in pursuit of growth",
      "Over-spending on brand without measurable return",
    ],
  },
};

// ── Score-to-plain-English helpers ──

export type ScoreBand = "low" | "mid" | "high";

export const classifyScoreBand = (score: number): ScoreBand => {
  if (score >= 70) return "high";
  if (score <= 30) return "low";
  return "mid";
};

export const plainEnglishScoreDescription = (
  key: RegimeSignalKey,
  score: number,
): string => {
  const band = classifyScoreBand(score);
  const entry = indicatorPlainEnglish[key];
  if (band === "high") return entry.highMeans;
  if (band === "low") return entry.lowMeans;
  return entry.midMeans;
};

// ── "What this means for you this week" builder ──

export type WeeklyOperatorContext = {
  tightness: number;
  riskAppetite: number;
  regime: RegimeKey;
};

export const buildOperatorContextSummary = (
  context: WeeklyOperatorContext,
): string[] => {
  const regimeEntry = regimePlainEnglish[context.regime];
  const tightnessBand = classifyScoreBand(context.tightness);
  const riskBand = classifyScoreBand(context.riskAppetite);

  const lines = [
    `Your operating environment this week: ${regimeEntry.plainLabel} mode.`,
    "",
    `Cash availability is ${tightnessBand} (score ${context.tightness}). ${indicatorPlainEnglish.tightness[tightnessBand === "high" ? "highMeans" : tightnessBand === "low" ? "lowMeans" : "midMeans"]}`,
    "",
    `Market risk appetite is ${riskBand} (score ${context.riskAppetite}). ${indicatorPlainEnglish.riskAppetite[riskBand === "high" ? "highMeans" : riskBand === "low" ? "lowMeans" : "midMeans"]}`,
    "",
    regimeEntry.whatItMeans,
    "",
    "DO:",
    ...regimeEntry.doExamples.map((ex) => `  • ${ex}`),
    "",
    "AVOID:",
    ...regimeEntry.avoidExamples.map((ex) => `  • ${ex}`),
    "",
    `Pacing rule: ${regimeEntry.stance}`,
  ];

  return lines;
};

// ── Inline term substitution for plain-English briefs ──

export type TermSubstitution = {
  pattern: RegExp;
  replacement: string;
};

export const PLAIN_ENGLISH_SUBSTITUTIONS: TermSubstitution[] = [
  { pattern: /\bCapital tightness\b/gi, replacement: "Cash availability" },
  { pattern: /\bRisk appetite\b/gi, replacement: "Market risk appetite" },
  { pattern: /\bYield curve slope\b/gi, replacement: "Recession warning gauge" },
  { pattern: /\bBase rate\b/gi, replacement: "Fed interest rate" },
  { pattern: /\bSCARCITY\b/g, replacement: "Defend mode" },
  { pattern: /\bDEFENSIVE\b/g, replacement: "Conserve mode" },
  { pattern: /\bVOLATILE\b/g, replacement: "Guarded Expand mode" },
  { pattern: /\bEXPANSION\b/g, replacement: "Expand mode" },
  { pattern: /\btightness\b/gi, replacement: "cash availability" },
  { pattern: /\brisk appetite threshold\b/gi, replacement: "risk tolerance boundary" },
  { pattern: /\bregime\b/gi, replacement: "operating environment" },
  { pattern: /\bposture\b/gi, replacement: "operating stance" },
  { pattern: /\bHY OAS stress\b/gi, replacement: "high-yield bond market stress" },
  { pattern: /\bEquity volatility shock\b/gi, replacement: "stock market volatility" },
  { pattern: /\bFinancial conditions tightening\b/gi, replacement: "financial conditions tightening" },
  { pattern: /\bVC funding slowdown\b/gi, replacement: "VC funding is slowing" },
  { pattern: /\bTech layoff pressure\b/gi, replacement: "tech layoffs are rising" },
  { pattern: /\bCash tightness\b/gi, replacement: "Cash availability" },
  { pattern: /\bCurve slope\b/gi, replacement: "Recession warning gauge" },
];

export const applyPlainEnglishSubstitutions = (text: string): string => {
  let result = text;
  for (const sub of PLAIN_ENGLISH_SUBSTITUTIONS) {
    result = result.replace(sub.pattern, sub.replacement);
  }
  return result;
};

// ── "Why this matters" one-liners ──

export const INDICATOR_WHY_MATTERS: Record<RegimeSignalKey, string> = {
  tightness: "Cash availability determines whether you conserve or invest.",
  riskAppetite: "Market risk appetite tells you how bold your roadmap can be this week.",
  baseRate: "The Fed rate affects your cost of capital and burn planning.",
  curveSlope: "The recession gauge warns whether long-horizon bets are safe.",
};
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

export type SignalPlainEnglish = {
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

export const signalPlainEnglish: Record<RegimeSignalKey, SignalPlainEnglish> = {
  tightness: {
    plainLabel: "Cash availability",
    whatItMeasures:
      "How hard or easy it is for U.S. companies to raise and borrow money.",
    highMeans:
      "Money is tight — conserve cash, extend runway, defer big bets. Fundraising windows are narrow.",
    lowMeans:
      "Money is flowing — you can invest in growth, hire ahead of revenue, and lengthen payback timelines.",
    midMeans:
      "Money is balanced — invest with milestones and keep options open.",
    jargonTerm: "Capital tightness",
    operatorPrompt: "If I needed to raise or borrow money this month, how hard would it be?",
  },
  riskAppetite: {
    plainLabel: "Risk appetite",
    whatItMeasures:
      "How willing U.S. investors and buyers are to take risks on new products, hires, and growth bets.",
    highMeans:
      "Investors and markets are bold — launch new products, expand headcount, raise capital confidently.",
    lowMeans:
      "Markets are risk-averse — focus on retention, profitability, and core product. Delay speculative launches.",
    midMeans:
      "Markets are selectively open — prove traction before scaling; get customer evidence before making large commitments.",
    jargonTerm: "Risk appetite",
    operatorPrompt: "Would a new product launch or expansion hire get funded or questioned?",
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
      "Recession warning active — the yield curve is inverted or flat. Favor short-payback projects and keep options open.",
    midMeans:
      "Curve is neutral/flat — don't rely on this signal alone; also check cash availability and market risk appetite.",
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
    plainLabel: "Freezing",
    stance: "Protect cash and extend runway above all else.",
    whatItMeans:
      "Money is tight and markets are risk-averse. Your primary job is survival — preserve cash, cut non-essential spend, and focus on what keeps the lights on.",
    doExamples: [
      "Freeze hiring except for critical roles",
      "Renegotiate vendor contracts",
      "Focus the product on retention and core revenue",
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
    plainLabel: "Cloudy",
    stance: "Focus on efficiency — new commitments should pay back within 12 months.",
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
    plainLabel: "Stormy",
    stance: "Conditions uncertain — make reversible moves with clear exit criteria.",
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
    plainLabel: "Sunny",
    stance: "Growth conditions — scale what's working and keep milestones for new bets.",
    whatItMeans:
      "Money is flowing and markets are confident. This is the time to invest in growth — with discipline. Scale what's working, don't chase everything.",
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
  const entry = signalPlainEnglish[key];
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
    `Cash availability is ${tightnessBand} (score ${context.tightness}). ${signalPlainEnglish.tightness[tightnessBand === "high" ? "highMeans" : tightnessBand === "low" ? "lowMeans" : "midMeans"]}`,
    "",
    `Risk appetite is ${riskBand} (score ${context.riskAppetite}). ${signalPlainEnglish.riskAppetite[riskBand === "high" ? "highMeans" : riskBand === "low" ? "lowMeans" : "midMeans"]}`,
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
  { pattern: /\bYield curve slope\b/gi, replacement: "Recession warning gauge" },
  { pattern: /\bBase rate\b/gi, replacement: "Fed interest rate" },
  { pattern: /\bSCARCITY\b/g, replacement: "Freezing" },
  { pattern: /\bDEFENSIVE\b/g, replacement: "Cloudy" },
  { pattern: /\bVOLATILE\b/g, replacement: "Stormy" },
  { pattern: /\bEXPANSION\b/g, replacement: "Sunny" },
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

export const SIGNAL_WHY_MATTERS: Record<RegimeSignalKey, string> = {
  tightness: "Cash availability determines whether you conserve or invest.",
  riskAppetite: "Risk appetite tells you how bold your roadmap can be this week.",
  baseRate: "The Fed rate affects your cost of capital and burn planning.",
  curveSlope: "The recession gauge tells you whether long-horizon bets are safe.",
};
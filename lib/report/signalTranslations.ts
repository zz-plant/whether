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

// ── Indicator-level plain-English translations ──

type SignalPlainEnglish = {
  /** Human-readable label. e.g., "Funding pressure" for the tightness axis. */
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
    plainLabel: "Funding pressure",
    whatItMeasures:
      "How hard or easy it is for U.S. companies to raise and borrow money.",
    highMeans:
      "Money is tight — conserve cash, extend runway, defer big bets. Fundraising windows are narrow.",
    lowMeans:
      "Money is flowing — you can invest in growth, hire ahead of revenue, and lengthen payback timelines.",
    midMeans:
      "Money is balanced — invest with milestones and keep options open.",
    jargonTerm: "Funding pressure",
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
    /*
     * Not "Fed interest rate". `getBaseRate`'s `FED` rung has never fired, so
     * this number is the 1-month Treasury bill in every published reading —
     * `BASE_RATE_SOURCE_LABELS` in `regimeEngineCore` already corrected the
     * engine's own wording for exactly this reason, and the correction never
     * reached the four label tables that render it. A name that says which
     * institution set the rate is a claim; "short-term borrowing rate" is what
     * the number is on any of the three rungs.
     */
    plainLabel: "Short-term borrowing rate",
    whatItMeasures: "The baseline cost of short-term borrowing in U.S. markets. Higher means borrowing costs more.",
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
      "Curve is neutral/flat — don't rely on this signal alone; also check funding pressure and risk appetite.",
    jargonTerm: "Yield curve slope",
    operatorPrompt: "If I'm planning a 12+ month project, does this signal support that timeline?",
  },
};

// ── Score-to-plain-English helpers ──

type ScoreBand = "low" | "mid" | "high";

/** Reading bands for the 0-100 composite scores. Not the regime thresholds — those
 *  live in `regimeEngineCore` and answer a different question (which quadrant are we
 *  in), while these answer "is 64 a normal number or an alarming one". */
const SCORE_BAND_HIGH_FLOOR = 70;
const SCORE_BAND_LOW_CEILING = 30;

export const classifyScoreBand = (score: number): ScoreBand => {
  if (score >= SCORE_BAND_HIGH_FLOOR) return "high";
  if (score <= SCORE_BAND_LOW_CEILING) return "low";
  return "mid";
};

/** The two signals published as 0-100 composites. `baseRate` and `curveSlope` are
 *  raw percentages and carry their own units, so they are excluded here. */
export type CompositeSignalKey = Extract<RegimeSignalKey, "tightness" | "riskAppetite">;

type SignalScale = {
  /** Range shown beside the number, e.g. "0-100". */
  rangeLabel: string;
  /** Plain-words meaning of the bottom of the range. */
  lowAnchor: string;
  /** Plain-words meaning of the top of the range. */
  highAnchor: string;
  /** One line combining both ends, for use under a score. */
  directionLabel: string;
};

export const compositeSignalScales: Record<CompositeSignalKey, SignalScale> = {
  tightness: {
    rangeLabel: "0-100",
    lowAnchor: "money is easy to raise",
    highAnchor: "money is hard to raise",
    directionLabel: "0 = easier funding \u00b7 100 = harder funding",
  },
  riskAppetite: {
    rangeLabel: "0-100",
    lowAnchor: "investors are avoiding risk",
    highAnchor: "investors are funding risk",
    directionLabel: "0 = risk-averse investors \u00b7 100 = risk-hungry investors",
  },
};

type ScoreBandRow = {
  band: ScoreBand;
  /** e.g. "0-30". */
  rangeLabel: string;
  /** What this band is called. */
  label: string;
  /** What a reading in this band means for an operator. */
  meaning: string;
};

/** The one-word descriptor shown next to a score. Exported because any surface
 *  that prints a band word must print the word for the band the meaning sentence
 *  came from — two band systems on one card contradict each other. */
export const SCORE_BAND_LABELS: Record<ScoreBand, string> = {
  low: "Low",
  mid: "Moderate",
  high: "High",
};

/**
 * The reference a bare score needs to be readable: what the three bands are and
 * what a reading in each means. Without it, "64" is a number with no scale
 * attached, which is only interpretable if you already know the domain.
 */
export const scoreBandReference = (key: RegimeSignalKey): readonly ScoreBandRow[] => {
  const entry = signalPlainEnglish[key];
  return [
    {
      band: "low",
      rangeLabel: `0-${SCORE_BAND_LOW_CEILING}`,
      label: SCORE_BAND_LABELS.low,
      meaning: entry.lowMeans,
    },
    {
      band: "mid",
      rangeLabel: `${SCORE_BAND_LOW_CEILING + 1}-${SCORE_BAND_HIGH_FLOOR - 1}`,
      label: SCORE_BAND_LABELS.mid,
      meaning: entry.midMeans,
    },
    {
      band: "high",
      rangeLabel: `${SCORE_BAND_HIGH_FLOOR}-100`,
      label: SCORE_BAND_LABELS.high,
      meaning: entry.highMeans,
    },
  ];
};

/**
 * The canonical reader-facing name for each signal.
 *
 * Four modules used to carry their own copy of this map — `reportFormatting`,
 * `briefFormatting`, `reportEvidence` twice — and three of them carried a
 * comment telling the next reader not to add a fourth spelling. The comments
 * were the whole mechanism, so when `baseRate` needed renaming the rename had
 * to land in six places and landed in none. Derived from `signalPlainEnglish`,
 * which already had to hold the name for its own sentences.
 */
export const regimeSignalLabel: Record<RegimeSignalKey, string> = {
  tightness: signalPlainEnglish.tightness.plainLabel,
  riskAppetite: signalPlainEnglish.riskAppetite.plainLabel,
  baseRate: signalPlainEnglish.baseRate.plainLabel,
  curveSlope: signalPlainEnglish.curveSlope.plainLabel,
};

/** Canonical destination for "what does this word mean" links. */
export const GLOSSARY_HREF = "/trust#beginner-glossary";

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

// ── Inline term substitution for plain-English briefs ──

type TermSubstitution = {
  pattern: RegExp;
  replacement: string;
};

/**
 * Applied in order, so every multi-word phrase containing a term must come
 * before the bare term. "Cash tightness" placed after the bare /tightness/ rule
 * produced "Cash funding pressure" — the bare rule consumed the second word and
 * the specific rule then had nothing left to match.
 */
export const PLAIN_ENGLISH_SUBSTITUTIONS: TermSubstitution[] = [
  // Multi-word phrases first.
  { pattern: /\bCapital tightness\b/gi, replacement: "Funding pressure" },
  { pattern: /\bCash tightness\b/gi, replacement: "Funding pressure" },
  { pattern: /\bYield curve slope\b/gi, replacement: "Recession warning gauge" },
  { pattern: /\bCurve slope\b/gi, replacement: "Recession warning gauge" },
  { pattern: /\brisk appetite threshold\b/gi, replacement: "risk tolerance boundary" },
  { pattern: /\bVC funding slowdown\b/gi, replacement: "VC funding is slowing" },
  { pattern: /\bTech layoff pressure\b/gi, replacement: "tech layoffs are rising" },
  { pattern: /\bBase rate\b/gi, replacement: "Short-term borrowing rate" },
  // Regime keys.
  { pattern: /\bSCARCITY\b/g, replacement: "Freezing" },
  { pattern: /\bDEFENSIVE\b/g, replacement: "Cloudy" },
  { pattern: /\bVOLATILE\b/g, replacement: "Stormy" },
  { pattern: /\bEXPANSION\b/g, replacement: "Sunny" },
  // Bare terms last.
  { pattern: /\btightness\b/gi, replacement: "funding pressure" },
  { pattern: /\bregime\b/gi, replacement: "operating environment" },
  { pattern: /\bposture\b/gi, replacement: "operating stance" },
];

export const applyPlainEnglishSubstitutions = (text: string): string => {
  let result = text;
  for (const sub of PLAIN_ENGLISH_SUBSTITUTIONS) {
    result = result.replace(sub.pattern, sub.replacement);
  }
  return result;
};

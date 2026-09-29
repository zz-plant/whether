/**
 * Reads the money and the headcount out of a plan sentence.
 *
 * The stress tester asks for "Hiring 3 senior engineers @ $180k, or signing a
 * $50k annual cloud commit" and, until this module existed, read neither number.
 * "Hire 1 junior contractor" and "hire 40 senior engineers at $250k each"
 * returned the identical verdict, because `stressTestDecisionPlan` classified the
 * sentence into a category and then threw the text away. A tool that prints a
 * placeholder full of figures and grades every figure the same is not a stress
 * test; it is a regime lookup with an input box in front of it.
 *
 * Kept separate from `decisionShield.ts` because the two answer different
 * questions and fail differently. This one is text in, numbers out, and is wrong
 * in ways a regex is wrong — a sentence it cannot read. That is worth testing on
 * its own, at the sentence level, without constructing a `RegimeAssessment`.
 *
 * ## What it deliberately does not do
 *
 * It applies no loading factor to salaries. Fully-loaded cost is commonly 1.25x
 * to 1.4x base, and picking a number inside that range would silently inflate
 * every hiring plan by an amount the operator never typed and cannot see.
 * `SALARY_SCOPE_NOTE` says the figure is base pay only and leaves the adjustment
 * to the reader, which is the same stance the regime engine takes about imputed
 * inputs: state the gap rather than fill it.
 */

/** How often the commitment recurs, as the sentence describes it. */
type CommitmentCadence = "MONTHLY" | "ANNUAL" | "ONE_OFF";

export type ParsedCommitment = {
  /** People named by the plan, when it names any. */
  headcount: number | null;
  /** The amount as written, before any per-unit multiplication. */
  unitAmountUsd: number | null;
  cadence: CommitmentCadence;
  /**
   * First-year cash cost. `null` whenever the sentence carried no amount at all
   * — the absence is the useful signal, and a zero would read as "free".
   */
  annualUsd: number | null;
  /**
   * How that figure was reached, in the reader's own numbers. Rendered next to
   * the verdict so a misparse is visible and arguable rather than silent.
   */
  basis: string | null;
};

/** Beyond this a parse is a typo or a units mix-up, not a plan. */
const MAX_PLAUSIBLE_USD = 1e12;

const SUFFIX_MULTIPLIERS: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9 };

/*
 * Two shapes, and both are required to carry a marker: a `$`, or a k/m/b suffix.
 * A bare integer must never register as money, or "hire 3 engineers" sizes the
 * plan at three dollars. That is also why the suffix branch is anchored with
 * `\b` — "12 months" and "18 mo" would otherwise read as 12 and 18 million.
 */
const MONEY_PATTERN =
  /\$\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*([kKmMbB])?|\b(\d+(?:\.\d+)?)\s*([kKmMbB])\b/g;

const PEOPLE_NOUNS =
  "engineers?|developers?|designers?|architects?|leads?|principals?|hires?|reps?|sdrs?|aes?|contractors?|managers?|analysts?|people|persons?|heads?|ftes?|roles?|seats?|headcount";

/*
 * A count that belongs to people, not to money or to time. Up to three
 * adjectives may sit between, so "3 senior backend engineers" still reads as 3,
 * and the quantifier is lazy so the nearest noun wins.
 */
const HEADCOUNT_BEFORE_NOUN = new RegExp(`\\b(\\d{1,4})\\s+(?:[a-z][a-z-]*\\s+){0,3}?(?:${PEOPLE_NOUNS})\\b`, "i");
const HEADCOUNT_AFTER_VERB = /\b(?:hire|hiring|add|adding|recruit|recruiting|open|poach)\s+(\d{1,4})\b/i;

/*
 * Only an explicit per-unit marker licenses multiplying the amount by the
 * headcount. "3 engineers @ $180k" is three times the figure; "3 engineers,
 * $540k budgeted" is not, and multiplying it would treble a number the operator
 * had already totalled.
 */
const PER_UNIT_MARKER = /(@|\beach\b|\bapiece\b|\bper\s+(?:head|hire|person|seat|engineer|rep|role|lead|architect)\b)/i;

const MONTHLY_MARKER = /(\bper\s+month\b|\/\s?mo\b|\bmonthly\b|\ba\s+month\b|\bpcm\b)/i;
const ANNUAL_MARKER = /(\bper\s+year\b|\/\s?yr\b|\bannual(?:ly)?\b|\ba\s+year\b|\bper\s+annum\b|\bp\.?a\.?\b)/i;

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** One decimal, but never a bare `.0` — "$2.0M" reads as false precision next to
 *  the round number the operator actually typed. */
const trimDecimal = (value: number) => value.toFixed(1).replace(/\.0$/, "");

/**
 * Compact USD for a label: `$540k`, `$1.2M`. Falls back to grouped digits below
 * a thousand, where a suffix would lose more precision than it saves.
 */
export const formatCommitmentUsd = (value: number): string => {
  const magnitude = Math.abs(value);
  if (magnitude >= 1e9) return `$${trimDecimal(value / 1e9)}B`;
  if (magnitude >= 1e6) return `$${trimDecimal(value / 1e6)}M`;
  if (magnitude >= 1e3) return `$${Math.round(value / 1e3)}k`;
  return usdFormatter.format(value);
};

const readMoneyTokens = (text: string): number[] => {
  const tokens: number[] = [];
  for (const match of text.matchAll(MONEY_PATTERN)) {
    const digits = match[1] ?? match[3];
    const suffix = (match[2] ?? match[4] ?? "").toLowerCase();
    if (!digits) continue;
    const base = Number.parseFloat(digits.replace(/,/g, ""));
    if (!Number.isFinite(base)) continue;
    const value = base * (SUFFIX_MULTIPLIERS[suffix] ?? 1);
    if (value > 0 && value <= MAX_PLAUSIBLE_USD) tokens.push(value);
  }
  return tokens;
};

const readHeadcount = (text: string): number | null => {
  const beforeNoun = HEADCOUNT_BEFORE_NOUN.exec(text);
  const afterVerb = HEADCOUNT_AFTER_VERB.exec(text);
  const raw = beforeNoun?.[1] ?? afterVerb?.[1];
  if (!raw) return null;
  const count = Number.parseInt(raw, 10);
  return Number.isFinite(count) && count > 0 ? count : null;
};

const readCadence = (text: string): CommitmentCadence => {
  if (MONTHLY_MARKER.test(text)) return "MONTHLY";
  if (ANNUAL_MARKER.test(text)) return "ANNUAL";
  return "ONE_OFF";
};

const describeBasis = (
  unitAmountUsd: number,
  headcount: number | null,
  multiplied: boolean,
  cadence: CommitmentCadence,
  annualUsd: number,
): string => {
  const unit = formatCommitmentUsd(unitAmountUsd);
  const total = formatCommitmentUsd(annualUsd);

  if (multiplied && headcount !== null) {
    const perUnit = cadence === "MONTHLY" ? `${unit} a month each` : `${unit} each`;
    return `${headcount} × ${perUnit} → ${total} in the first year`;
  }
  if (cadence === "MONTHLY") return `${unit} a month → ${total} in the first year`;
  if (cadence === "ANNUAL") return `${unit} a year`;
  return `${unit}, read as a first-year cost`;
};

/**
 * Reads one plan sentence. Never throws and never guesses a number that is not
 * in the text: a sentence with no amount comes back with `annualUsd: null`, and
 * the caller is expected to say it cannot size the plan rather than to invent a
 * figure and grade it.
 */
export const parsePlanCommitment = (planText: string): ParsedCommitment => {
  const text = planText ?? "";
  const headcount = readHeadcount(text);
  const cadence = readCadence(text);
  const tokens = readMoneyTokens(text);

  if (tokens.length === 0) {
    return { headcount, unitAmountUsd: null, cadence, annualUsd: null, basis: null };
  }

  /* The largest figure in the sentence, not the first. A plan that names two
     numbers is sized by the bigger commitment, and reading order is not a
     reliable guide to which that is. */
  const unitAmountUsd = Math.max(...tokens);
  const multiplied = headcount !== null && headcount > 1 && PER_UNIT_MARKER.test(text);
  const total = multiplied ? unitAmountUsd * headcount! : unitAmountUsd;
  const annualUsd = cadence === "MONTHLY" ? total * 12 : total;

  return {
    headcount,
    unitAmountUsd,
    cadence,
    annualUsd,
    basis: describeBasis(unitAmountUsd, headcount, multiplied, cadence, annualUsd),
  };
};

/**
 * Reads a single money field — a burn box, a cash box — where the label already
 * establishes that the number is dollars.
 *
 * Unlike {@link parsePlanCommitment} this accepts a bare integer, because
 * "150000" typed into a field captioned "monthly burn" is not ambiguous the way
 * a bare 3 in "hire 3 engineers" is. It still accepts the shorthand people
 * actually type, so `$150k`, `150k` and `150,000` all land in the same place.
 */
export const parseMoneyInput = (raw: string): number | null => {
  const text = (raw ?? "").trim();
  if (!text) return null;

  const suffixed = readMoneyTokens(text);
  if (suffixed.length > 0) return Math.max(...suffixed);

  const bare = Number.parseFloat(text.replace(/[$,\s]/g, ""));
  if (!Number.isFinite(bare) || bare <= 0 || bare > MAX_PLAUSIBLE_USD) return null;
  return bare;
};

/**
 * Share of the cash the company actually has that this commitment consumes in
 * its first year.
 *
 * This is the whole reason the parser exists: a number is only large or small
 * against a balance. Returns `null` unless the caller supplied a real cash
 * figure — either directly, or as a burn rate the runway can be multiplied by.
 * Nothing here estimates burn from a stage or a regime; an unsupplied balance
 * means the plan is not sized, and the surface says so.
 */
export const computeRunwayShare = ({
  annualUsd,
  cashBalanceUsd,
  monthlyBurnUsd,
  runwayMonths,
}: {
  annualUsd: number | null;
  cashBalanceUsd?: number;
  monthlyBurnUsd?: number;
  runwayMonths?: number;
}): { share: number; cashUsd: number; cashBasis: string } | null => {
  if (annualUsd === null || annualUsd <= 0) return null;

  if (typeof cashBalanceUsd === "number" && Number.isFinite(cashBalanceUsd) && cashBalanceUsd > 0) {
    return {
      share: annualUsd / cashBalanceUsd,
      cashUsd: cashBalanceUsd,
      cashBasis: `${formatCommitmentUsd(cashBalanceUsd)} cash on hand`,
    };
  }

  if (
    typeof monthlyBurnUsd === "number" &&
    Number.isFinite(monthlyBurnUsd) &&
    monthlyBurnUsd > 0 &&
    typeof runwayMonths === "number" &&
    Number.isFinite(runwayMonths) &&
    runwayMonths > 0
  ) {
    const cashUsd = monthlyBurnUsd * runwayMonths;
    return {
      share: annualUsd / cashUsd,
      cashUsd,
      cashBasis: `${formatCommitmentUsd(monthlyBurnUsd)} a month × ${runwayMonths} months of runway`,
    };
  }

  return null;
};

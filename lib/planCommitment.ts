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
 * Three shapes, and each is required to carry a marker: a `$`, a k/m/b suffix, or the word itself.
 * A bare integer must never register as money, or "hire 3 engineers" sizes the
 * plan at three dollars. That is also why the suffix branch is anchored with
 * `\b` — "12 months" and "18 mo" would otherwise read as 12 and 18 million.
 */
const MONEY_PATTERN =
  /\$\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*([kKmMbB])?|\b(\d+(?:\.\d+)?)\s*([kKmMbB])\b|\b(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s+(?:dollars?|usd|bucks)\b/gi;

const PEOPLE_NOUNS =
  "engineers?|developers?|designers?|architects?|leads?|principals?|hires?|reps?|sdrs?|aes?|contractors?|managers?|analysts?|people|persons?|heads?|ftes?|roles?|seats?|reqs?|requisitions?|positions?|headcount";

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

/*
 * A stated term caps how many months a monthly amount runs: "a contractor for 3
 * months at $15k/mo" is $45k, and annualising it read $180k. Only a term under a
 * year changes anything, since the figure is a first-year cost either way. A
 * term reads "for/over N months" or "an N-month <thing>"; "9 months of runway"
 * is neither. The hyphenated form is a term only when it modifies a commitment,
 * not runway: "maintaining a 9-month runway" is an aside about runway and must
 * not shrink the cost ("$10k/mo while maintaining a 9-month runway" is $120k a
 * year, not $90k).
 */
const TERM_MONTHS = /\b(?:(?:for|over)\s+(\d{1,2}|[a-z]+)\s+months?|(\d{1,2}|[a-z]+)[- ]month\b(?!\s*(?:of\s+)?(?:runway|buffer|reserve)\b))/i;
/* The same term in weeks, which bills as the months it touches: six weeks of a monthly fee is two months of it. */
const TERM_WEEKS = /\b(?:(?:for|over)\s+(\d{1,2}|[a-z]+)\s+weeks?|(\d{1,2}|[a-z]+)[- ]week\b)/i;

const SPELLED_NUMBERS = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

const readTermCount = (match: RegExpExecArray | null): number => {
  const raw = (match?.[1] ?? match?.[2] ?? "").toLowerCase();
  const spelled = SPELLED_NUMBERS.indexOf(raw);
  return spelled >= 0 ? spelled + 1 : Number.parseInt(raw, 10);
};

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
 *
 * Under $10k it keeps a tenth of a thousand, because these figures sit in
 * sentences that do arithmetic: whole thousands printed $1,400 as "$1k" in
 * "Revenue covers spending today. At $1k more a month you would burn $400", and
 * $1,500 as "$2k". A figure that rounds up into the next unit is written in it
 * ("$1M", never "$1000k").
 */
export const formatCommitmentUsd = (value: number): string => {
  const magnitude = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (magnitude >= 999_950_000) return `${sign}$${trimDecimal(magnitude / 1e9)}B`;
  if (magnitude >= 999_500) return `${sign}$${trimDecimal(magnitude / 1e6)}M`;
  if (magnitude >= 9_950) return `${sign}$${Math.round(magnitude / 1e3)}k`;
  if (magnitude >= 999.5) return `${sign}$${trimDecimal(magnitude / 1e3)}k`;
  return usdFormatter.format(value);
};

const readMoneyTokens = (text: string): number[] => {
  const tokens: number[] = [];
  for (const match of text.matchAll(MONEY_PATTERN)) {
    const digits = match[1] ?? match[3] ?? match[5];
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

/** Months a monthly amount runs in the first year: the stated term, or 12. */
const readMonthsInFirstYear = (text: string): number => {
  const weeks = readTermCount(TERM_WEEKS.exec(text));
  const term = Number.isFinite(weeks) && weeks > 0 ? Math.ceil((weeks * 12) / 52) : readTermCount(TERM_MONTHS.exec(text));
  return Number.isFinite(term) && term > 0 && term < 12 ? term : 12;
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
  months: number,
  annualUsd: number,
): string => {
  const unit = formatCommitmentUsd(unitAmountUsd);
  const total = formatCommitmentUsd(annualUsd);
  const term = months < 12 ? ` for ${months} month${months === 1 ? "" : "s"}` : "";

  if (multiplied && headcount !== null) {
    const perUnit = cadence === "MONTHLY" ? `${unit} a month each${term}` : `${unit} each`;
    return `${headcount} × ${perUnit} → ${total} in the first year`;
  }
  if (cadence === "MONTHLY") return `${unit} a month${term} → ${total} in the first year`;
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
  const months = cadence === "MONTHLY" ? readMonthsInFirstYear(text) : 12;
  const annualUsd = cadence === "MONTHLY" ? total * months : total;

  return {
    headcount,
    unitAmountUsd,
    cadence,
    annualUsd,
    basis: describeBasis(unitAmountUsd, headcount, multiplied, cadence, months, annualUsd),
  };
};

/* ------------------------------------------------------------------------------------------------
 * Plans that name several commitments.
 *
 * "Pausing 2 EMEA SDR reqs and allocating $80k to an annual Datadog commit while deferring SOC-2 to
 * Q3" is three decisions. Read as one sentence it became one category, sized on its largest figure,
 * and the other two figures were thrown away; "Hire 2 engineers at $15k a month each and sign a $120k
 * annual AWS commit" read as one monthly amount of $120k per engineer, $2.88M. Each clause is now
 * read on its own by `parsePlanCommitment`, so each keeps its own figure, cadence and headcount.
 *
 * The split is conservative. A conjunction separates two commitments only when the words after it
 * open with their own action verb ("and allocating …", "while deferring …") or their own dollar
 * figure after a clause that already had one ("… at $180k and $50k a month on AWS"). "Sales and
 * marketing", "$80k and 2 people for the same project" and "$10k/mo while maintaining a 9-month
 * runway" stay whole. A sentence with no action verb of its own ("Each at $180k.", "We have 12 months
 * of runway.") stays attached to its neighbour, so context sentences still reach the parse they
 * qualify. A plan that does not split comes back as its own text, unchanged, and parses exactly as
 * it did before clauses existed.
 * ---------------------------------------------------------------------------------------------- */

/** Whether a clause adds a commitment or pauses, defers or cuts one. */
export type ClauseDirection = "COMMIT" | "REDUCE";

export type PlanDepartment =
  | "engineering"
  | "data"
  | "sales"
  | "marketing"
  | "product"
  | "design"
  | "customer success"
  | "finance"
  | "legal"
  | "people"
  | "security"
  | "operations";

export type ParsedPlanClause = {
  /** The clause as written in the plan. */
  text: string;
  direction: ClauseDirection;
  commitment: ParsedCommitment;
  /** People added (positive) or paused and cut (negative); null when the clause names no count. */
  headcountDelta: number | null;
  department: PlanDepartment | null;
};

/* Verbs that open a commitment, in the forms a plan uses: "hire", "hiring", "hired". Words that are
   also nouns ("commit", "lease", "budget") count, which only matters when a clause opens with one.
   Left out on purpose: "fund", "move", "start", "extend", "keep" and "maintain", which open asides
   about funding, timing and runway far more often than a commitment. */
const COMMIT_VERBS = [
  "hir(?:e|es|ed|ing)",
  "add(?:s|ed|ing)?",
  "recruit(?:s|ed|ing)?",
  "poach(?:es|ed|ing)?",
  "onboard(?:s|ed|ing)?",
  "open(?:s|ed|ing)?",
  "sign(?:s|ed|ing)?",
  "commit(?:s|ted|ting)?",
  "allocat(?:e|es|ed|ing)",
  "spen(?:d|ds|t|ding)",
  "invest(?:s|ed|ing)?",
  "budget(?:s|ed|ing)?",
  "buy(?:s|ing)?",
  "bought",
  "purchas(?:e|es|ed|ing)",
  "acquir(?:e|es|ed|ing)",
  "leas(?:e|es|ed|ing)",
  "rent(?:s|ed|ing)?",
  "reserv(?:e|es|ed|ing)",
  "prepa(?:y|ys|id|ying)",
  "pa(?:y|ys|id|ying)",
  "renew(?:s|ed|ing)?",
  "launch(?:es|ed|ing)?",
  "build(?:s|ing)?",
  "built",
  "rebuild(?:s|ing)?",
  "rebuilt",
  "rewrit(?:e|es|ing)",
  "rewrote",
  "refactor(?:s|ed|ing)?",
  "migrat(?:e|es|ed|ing)",
  "expand(?:s|ed|ing)?",
  "enter(?:s|ed|ing)?",
  "offer(?:s|ed|ing)?",
  "discount(?:s|ed|ing)?",
  "rais(?:e|es|ed|ing)",
  "increas(?:e|es|ed|ing)",
  "doubl(?:e|es|ed|ing)",
  "upgrad(?:e|es|ed|ing)",
  "contract(?:s|ed|ing)?",
  "engag(?:e|es|ed|ing)",
  "deploy(?:s|ed|ing)?",
  "provision(?:s|ed|ing)?",
  "adopt(?:s|ed|ing)?",
  "licens(?:e|es|ed|ing)",
  "subscrib(?:e|es|ed|ing)",
  "outsourc(?:e|es|ed|ing)",
  "(?:bring|bringing|brought)\\s+on",
  "(?:take|takes|taking|took)\\s+on",
];

/* Verbs that pause, defer or cut. "close" and "end" are left out: "close a $50k deal" and "end of
   Q3" are not cuts. */
const REDUCE_VERBS = [
  "paus(?:e|es|ed|ing)",
  "freez(?:e|es|ing)",
  "froze(?:n)?",
  "defer(?:s|red|ring)?",
  "delay(?:s|ed|ing)?",
  "postpon(?:e|es|ed|ing)",
  /* "push the rewrite back", "push SOC-2 to Q3": the object usually sits between. */
  "push(?:es|ed|ing)?(?=(?:\\s+\\S+){0,4}?\\s+(?:back|out|to\\s+(?:q[1-4]|h[12]|next|later|20\\d\\d))\\b)",
  "cut(?:s|ting)?",
  "cancel(?:s|led|ling|ed|ing)?",
  "drop(?:s|ped|ping)?",
  "halt(?:s|ed|ing)?",
  "reduc(?:e|es|ed|ing)",
  "trim(?:s|med|ming)?",
  "shelv(?:e|es|ed|ing)",
  "stop(?:s|ped|ping)?",
  "sunset(?:s|ting)?",
  "(?:lay|lays|laying|laid)\\s+off",
  "(?:let|lets|letting)\\s+go",
  "downsiz(?:e|es|ed|ing)",
  "(?:scale|scales|scaled|scaling)\\s+back",
  "(?:hold|holds|holding|held)\\s+off",
  "(?:wind|winds|winding|wound)\\s+down",
  "put(?:s|ting)?(?=(?:\\s+\\S+){0,5}?\\s+on\\s+(?:hold|ice)\\b)",
];

const ACTION_VERB = `(?:${[...COMMIT_VERBS, ...REDUCE_VERBS].join("|")})`;

/* Words that may stand between a conjunction and its verb: "and we'll hire", "while also deferring",
   "and then plan to sign". */
const LEADING_FILLER =
  "(?:(?:we|i|they|you|we['’]ll|we['’]re|i['’]ll|i['’]m|we\\s+are|will|would|should|shall|must|can|could|may|might|also|then|next|later|separately|finally|plan\\s+to|planning\\s+to|need\\s+to|want\\s+to|going\\s+to|intend\\s+to|to)\\s+)*";

const HAS_ACTION_VERB = new RegExp(`\\b${ACTION_VERB}\\b`, "i");
const OPENS_WITH_ACTION_VERB = new RegExp(`^${LEADING_FILLER}${ACTION_VERB}\\b`, "i");
const OPENS_WITH_REDUCE_VERB = new RegExp(`^${LEADING_FILLER}(?:${REDUCE_VERBS.join("|")})\\b`, "i");
const OPENS_WITH_MONEY = /^(?:(?:an?|another|the)\s+)?(?:\$\s?\d|\d+(?:\.\d+)?\s*[kmb]\b)/i;
/* "… and $20k to the same project" is one commitment told in two figures. */
const POINTS_BACK = /\b(?:same|it|its|that|this|those|these|them|both)\b/i;
/* A cut that lowers a price is a discount, which the stress test grades, not a pause. */
const NAMES_A_PRICE = /\b(?:price|prices|pricing|discounts?)\b/i;
/* After a bare comma a past form describes the commitment before it ("a $240k AWS commit, paid
   monthly"); it does not start another. */
const OPENS_WITH_PAST_FORM = /^(?:[a-z]+ed|paid|prepaid|spent|built|rebuilt|bought|rewrote|laid|held|froze|frozen|wound|brought|took)\b/i;
const PAUSE_ANYWHERE =/\bon\s+hold\b|\b(?:hiring|headcount)\s+freeze\b/i;

/* Sentence ends, semicolons and line breaks always end a piece; a period inside "$1.2M" or "e.g. so"
   does not, because a boundary needs whitespace and then a capital, digit or dollar sign after it. */
const HARD_BOUNDARY = /\s*;\s*|\s*(?:\r?\n)+\s*|(?<=[.!?])\s+(?=["'(]?[A-Z0-9$])/g;
/* A joining word, or a bare comma (which splits only before an action verb). */
const SOFT_BOUNDARY = /\s*,?\s*\b(?:and\s+then|and\s+also|as\s+well\s+as|and|while|whilst|plus|but|whereas|then)\b\s+|\s+&\s+|\s*,\s+/gi;
const LIST_MARKER = /^(?:[-*•]|\d{1,2}[.)])\s+/;

type Span = { start: number; end: number };

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

const carriesItsOwnCommitment = (text: string) =>
  HAS_ACTION_VERB.test(text) || readMoneyTokens(text).length > 0 || readHeadcount(text) !== null;

/** Whether a joining word between `left` and `right` separates two commitments rather than listing parts of one. */
const separatesCommitments = (left: string, right: string, bareComma: boolean): boolean => {
  if (wordCount(left) < 2 || wordCount(right) < 2 || !carriesItsOwnCommitment(left)) return false;
  if (bareComma && OPENS_WITH_PAST_FORM.test(right)) return false;
  if (OPENS_WITH_ACTION_VERB.test(right)) return true;
  return (
    !bareComma &&
    OPENS_WITH_MONEY.test(right) &&
    HAS_ACTION_VERB.test(left) &&
    readMoneyTokens(left).length > 0 &&
    !POINTS_BACK.test(right)
  );
};

const splitOnBoundaries = (text: string, span: Span, boundary: RegExp): { span: Span; gapAfter: string }[] => {
  const piece = text.slice(span.start, span.end);
  const parts: { span: Span; gapAfter: string }[] = [];
  let cursor = 0;
  for (const match of piece.matchAll(boundary)) {
    if (match.index === undefined || match[0].length === 0) continue;
    parts.push({ span: { start: span.start + cursor, end: span.start + match.index }, gapAfter: match[0] });
    cursor = match.index + match[0].length;
  }
  parts.push({ span: { start: span.start + cursor, end: span.end }, gapAfter: "" });
  return parts;
};

const softSplit = (text: string, span: Span): Span[] => {
  const [first, ...rest] = splitOnBoundaries(text, span, SOFT_BOUNDARY);
  if (first === undefined) return [span];
  const clauses: Span[] = [];
  /* `open` is the clause being built; it always ends where the previous part ended. */
  let open = first.span;
  let gapBefore = first.gapAfter;
  for (const part of rest) {
    const left = text.slice(open.start, open.end);
    const right = text.slice(part.span.start, part.span.end);
    if (separatesCommitments(left, right, !/[a-z&]/i.test(gapBefore))) {
      clauses.push(open);
      open = part.span;
    } else {
      open = { start: open.start, end: part.span.end };
    }
    gapBefore = part.gapAfter;
  }
  clauses.push(open);
  return clauses;
};

/** Hard pieces with no action verb of their own join a neighbour: the one before, else the one after. */
const attachVerblessPieces = (text: string, spans: Span[]): Span[] => {
  const merged: Span[] = [];
  let pendingStart: number | null = null;
  for (const span of spans) {
    if (!HAS_ACTION_VERB.test(text.slice(span.start, span.end))) {
      const previous = merged.at(-1);
      if (previous) previous.end = span.end;
      else pendingStart ??= span.start;
      continue;
    }
    merged.push({ start: pendingStart ?? span.start, end: span.end });
    pendingStart = null;
  }
  return merged;
};

const tidyClause = (raw: string) => raw.trim().replace(LIST_MARKER, "").replace(/[\s,;:.]+$/, "").trim();

/**
 * Splits a plan into the commitments it names. A plan that names one comes back as a single
 * element holding its own text, untouched, so every caller that read the whole sentence before
 * reads the same sentence now.
 */
export const segmentPlanClauses = (planText: string): string[] => {
  const text = planText ?? "";
  const hard = splitOnBoundaries(text, { start: 0, end: text.length }, HARD_BOUNDARY)
    .map(({ span }) => span)
    .filter((span) => /[a-z0-9$]/i.test(text.slice(span.start, span.end)));
  const clauses = attachVerblessPieces(text, hard)
    .flatMap((span) => softSplit(text, span))
    .map((span) => tidyClause(text.slice(span.start, span.end)))
    .filter((clause) => /[a-z0-9$]/i.test(clause));
  return clauses.length > 1 ? clauses : [text];
};

const DEPARTMENT_WORDS: [PlanDepartment, RegExp][] = [
  ["data", /\bdata\s+(?:team|engineers?|scientists?|science|platform)\b|\bml\s+engineers?\b/i],
  ["engineering", /\bengineer(?:s|ing)?\b|\bdevelopers?\b|\bdevops\b|\bsres?\b|\b(?:back|front)[- ]?end\b|\bplatform\s+team\b/i],
  ["sales", /\bsales\b|\bsdrs?\b|\bbdrs?\b|\baes?\b|\baccount\s+executives?\b|\brevops\b/i],
  ["marketing", /\bmarketing\b|\bdemand\s+gen\b|\bpaid\s+(?:ads|search|social)\b/i],
  ["product", /\bproduct\s+(?:managers?|team|org)\b|\bpms?\b/i],
  ["design", /\bdesigners?\b|\bdesign\s+team\b|\bux\b/i],
  ["customer success", /\bcustomer\s+(?:success|support)\b|\bsupport\s+(?:team|agents?|reps?)\b|\bcsms?\b/i],
  ["finance", /\bfinance\b|\baccounting\b|\bcontrollers?\b|\bcfo\b|\bbookkeep(?:er|ers|ing)\b/i],
  ["legal", /\blegal\b|\bcounsel\b|\blawyers?\b/i],
  ["people", /\brecruiters?\b|\brecruiting\s+(?:team|fees?|agency|agencies|firm)\b|\bhr\b|\bpeople\s+(?:team|ops)\b/i],
  ["security", /\bsecurity\b|\bsoc[- ]?2\b|\biso\s?27001\b|\bcompliance\b|\bpen(?:etration)?[- ]tests?\b/i],
  ["operations", /\boperations\b|\bbiz\s?ops\b|\bops\s+team\b/i],
];

/** The department the clause names first, when it names one. */
const readDepartment = (text: string): PlanDepartment | null => {
  let found: { department: PlanDepartment; index: number } | null = null;
  for (const [department, pattern] of DEPARTMENT_WORDS) {
    const match = pattern.exec(text);
    if (match && (found === null || match.index < found.index)) found = { department, index: match.index };
  }
  return found?.department ?? null;
};

const readDirection = (text: string): ClauseDirection =>
  (OPENS_WITH_REDUCE_VERB.test(text.trim()) && !NAMES_A_PRICE.test(text)) || PAUSE_ANYWHERE.test(text) ? "REDUCE" : "COMMIT";

/** Every commitment the plan names, each read on its own. */
export const parsePlanClauses = (planText: string): ParsedPlanClause[] =>
  segmentPlanClauses(planText).map((text) => {
    const commitment = parsePlanCommitment(text);
    const direction = readDirection(text);
    return {
      text,
      direction,
      commitment,
      headcountDelta: commitment.headcount === null ? null : direction === "REDUCE" ? -commitment.headcount : commitment.headcount,
      department: readDepartment(text),
    };
  });

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
 *
 * The burn is net (spend less revenue), and the basis says so with both
 * figures: "$50k a month × 12 months" printed a net burn the stress test's form
 * shows nowhere, beside a spend box reading $200k.
 */
export const computeRunwayShare = ({
  annualUsd,
  cashBalanceUsd,
  monthlyBurnUsd,
  monthlyRevenueUsd,
  runwayMonths,
}: {
  annualUsd: number | null;
  cashBalanceUsd?: number;
  /** Net: spend less revenue. */
  monthlyBurnUsd?: number;
  /** The revenue net burn was taken from, so the basis can show the subtraction. */
  monthlyRevenueUsd?: number;
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
    const revenue = typeof monthlyRevenueUsd === "number" && Number.isFinite(monthlyRevenueUsd) && monthlyRevenueUsd > 0
      ? monthlyRevenueUsd
      : undefined;
    const netBurn = revenue === undefined
      ? `${formatCommitmentUsd(monthlyBurnUsd)} a month of net burn`
      : `${formatCommitmentUsd(monthlyBurnUsd)} a month of net burn (${formatCommitmentUsd(monthlyBurnUsd + revenue)} spend less ${formatCommitmentUsd(revenue)} revenue)`;
    return {
      share: annualUsd / cashUsd,
      cashUsd,
      cashBasis: `${netBurn} × ${runwayMonths} months of runway`,
    };
  }

  return null;
};

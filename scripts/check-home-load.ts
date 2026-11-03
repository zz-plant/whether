#!/usr/bin/env bun
/**
 * Holds the homepage's cognitive load to a budget that only falls.
 *
 * What a reader meets on `/` is a count, and a count only goes one way unless something
 * holds it: every section added a few sentences, a fold, a control, a score restated in
 * its own words, and no single change was the one that made the page heavy. On
 * 2026-11-03 production's main content held about 2,167 words, 310 numbers, 8 `<details>`
 * folds, 11 buttons and 25 inputs, and named "Funding pressure" 59 times and
 * "Risk appetite" 53. The cuts are separate work; this census is what makes them stay cut.
 *
 * It measures the `<main id="main-content">` of the page the route renders offline (the
 * bundled reading served as the live path serves it), so a number here is reproducible
 * and is not production's. It tracks the same shape of page, which is the point: a PR that
 * adds a paragraph moves it by that paragraph, wherever the data stands.
 *
 *   words             whitespace-separated tokens holding a letter or digit
 *   numbers           digit runs, so "12–24" is two and "$2.1M" is two
 *   wordsBeforeAreas  words ahead of the "Your decisions this week" section, i.e. what a
 *                     reader crosses before the first answer about an area
 *   folds             `<details>` elements, open or closed
 *   buttons           `<button>` elements
 *   fields            `<input>`, `<select>` and `<textarea>` elements (a radio is one)
 *   fundingPressure   mentions of "Funding pressure", any case
 *   riskAppetite      mentions of "Risk appetite", any case
 *   jargon            occurrences of the macro and finance terms in JARGON_TERMS below, whole
 *                     words, any case; the table also prints the count per term
 *   hardSentences     sentences above Flesch-Kincaid grade 12 (HARD_SENTENCE_GRADE); the table
 *                     also prints the five hardest
 *   longestSentence   words in the longest sentence; the table also prints it
 *
 * The sentence metrics read the prose: each block (a paragraph, list item, heading, caption,
 * summary, label, table cell) is split on . ! ? into sentences. Chart text, and anything with
 * fewer than five words that hold a letter (a label, "Range 0-1.85", a bare figure), is not a
 * sentence and is skipped. A grade is computed on one sentence at a time, so it is a rough
 * guide: a short sentence of long words ("Weekly operating guidance for startup leaders.")
 * grades high, and the budget holds it where it stands.
 *
 * Like `scripts/check-unchecked-indexed-access.ts`, the baseline below only falls: lowering
 * it is an edit to this file that lands with the cut that earned it, and raising it is a
 * policy change that belongs in its own PR. Unlike it, the count needs the page rendered,
 * which only a test process can do (it stubs the request, the router and the network), so
 * the gate is `tests/homeLoadBudget.test.tsx`, which runs in every suite run. Run this
 * script for the table when that test fails, or after a cut to read the new numbers.
 *
 * Usage:
 *   bun run check:home-load
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

const measureSchema = z.object({
  words: z.number(),
  numbers: z.number(),
  wordsBeforeAreas: z.number(),
  folds: z.number(),
  buttons: z.number(),
  fields: z.number(),
  fundingPressure: z.number(),
  riskAppetite: z.number(),
  jargon: z.number(),
  hardSentences: z.number(),
  longestSentence: z.number(),
});

/** What is read off the page but not budgeted: the per-term jargon counts, the hardest sentences and the longest. */
const detailSchema = z.object({
  jargonTerms: z.record(z.string(), z.number()),
  longestSentence: z.object({ text: z.string(), words: z.number() }).nullable(),
  hardestSentences: z.array(z.object({ text: z.string(), words: z.number(), grade: z.number(), times: z.number() })),
});

const readingSchema = z.object({ measure: measureSchema, detail: detailSchema });

export type HomeLoadMeasure = z.infer<typeof measureSchema>;
export type HomeLoadMetric = keyof HomeLoadMeasure;
export type HomeLoadDetail = z.infer<typeof detailSchema>;
export type HomeLoadReading = z.infer<typeof readingSchema>;

/**
 * The current budget, measured on origin/main on 2026-11-03. Lowering a value is an edit
 * to this file that lands with the work that earned it: set it to what
 * `bun run check:home-load` prints. Raising one is a policy change and belongs in its own PR.
 */
export const HOME_LOAD_BASELINE: HomeLoadMeasure = {
  words: 1772,
  numbers: 298,
  wordsBeforeAreas: 341,
  folds: 9,
  buttons: 8,
  fields: 26,
  fundingPressure: 35,
  riskAppetite: 48,
  jargon: 9,
  hardSentences: 2,
  longestSentence: 23,
};

/** The test writes its reading to the path in this variable when it is set; the CLI reads it back. */
export const HOME_LOAD_OUT_ENV = "WHETHER_HOME_LOAD_OUT";

/** A sentence above this Flesch-Kincaid grade is hard. Twelve is the last year of school. */
const HARD_SENTENCE_GRADE = 12;

/** A block of text is a sentence only when it holds this many words with a letter in them; shorter is a label or a figure. */
const MIN_SENTENCE_WORDS = 5;

/** How many of the hardest sentences the table prints. */
const HARDEST_SHOWN = 5;

const METRIC_LABELS: Record<HomeLoadMetric, string> = {
  words: "Words in main",
  numbers: "Numbers in main",
  wordsBeforeAreas: "Words before the areas",
  folds: "<details> folds",
  buttons: "<button>s",
  fields: "<input>/<select> fields",
  fundingPressure: "\"Funding pressure\" mentions",
  riskAppetite: "\"Risk appetite\" mentions",
  jargon: "Jargon terms",
  hardSentences: `Sentences above grade ${HARD_SENTENCE_GRADE}`,
  longestSentence: "Longest sentence (words)",
};

/** How to lower a metric whose cut is not obvious from its name. The older metrics are counts of things to delete. */
const METRIC_FIXES: Partial<Record<HomeLoadMetric, string>> = {
  jargon: "say the plain thing in place of the term, or move the term to the page that defines it. `bun run check:home-load` counts each term.",
  hardSentences: "split the sentence, or swap its long words for short ones. `bun run check:home-load` prints the five hardest.",
  longestSentence: "split the longest sentence at its first \"and\", \"but\", \"so\" or semicolon. `bun run check:home-load` prints it.",
};

const METRIC_ORDER: readonly HomeLoadMetric[] = [
  "words",
  "wordsBeforeAreas",
  "numbers",
  "folds",
  "buttons",
  "fields",
  "fundingPressure",
  "riskAppetite",
  "jargon",
  "hardSentences",
  "longestSentence",
];

const TEST_PATH = "tests/homeLoadBudget.test.tsx";

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
  nbsp: " ",
};

const decodeEntities = (text: string): string =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
    if (body.startsWith("#")) {
      const code = body.at(1)?.toLowerCase() === "x" ? Number.parseInt(body.slice(2), 16) : Number(body.slice(1));
      return Number.isInteger(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? entity;
  });

/** Markup a reader never meets: scripts, styles and comments. */
const withoutHiddenMarkup = (html: string): string =>
  html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi, "");

/** What a reader would read: tags as breaks, entities decoded, whitespace collapsed. */
const visibleText = (html: string): string =>
  decodeEntities(withoutHiddenMarkup(html).replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

/** The tokens of a text that hold a letter or a digit: a bare arrow or dot is not a word. */
const wordsOf = (text: string): string[] => text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token));

const countWords = (text: string): number => wordsOf(text).length;

const countMatches = (text: string, pattern: RegExp): number => text.match(pattern)?.length ?? 0;

const countOccurrences = (text: string, phrase: string): number => {
  const haystack = text.toLowerCase();
  const needle = phrase.toLowerCase();
  let count = 0;
  for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + needle.length)) count += 1;
  return count;
};

type JargonTerm = { label: string; pattern: string };

/**
 * Macro and finance terms a reader without a macro background will not know, each a label
 * and the regex source that finds it. A term matches whole words, any case. The total is
 * every occurrence, so a longer term claims its words before a shorter one inside it is
 * looked for: "yield curve" is one occurrence, not also a "yield". A word that is also
 * plain English ("spread", "inverted") over-counts; the budget is a ratchet on the count,
 * not a verdict on each hit. Add a term here with its reason; removing one lowers the
 * count without a cut, so a removal needs a reason too.
 */
const JARGON_TERMS: readonly JargonTerm[] = [
  { label: "Treasury", pattern: "treasur(?:y|ies)" }, // a lay reader hears a government department, not the bond market
  { label: "T-bill", pattern: "t[-\u2010\u2011]bills?" }, // market shorthand for short-term government debt
  { label: "bill rate", pattern: "bill rates?" }, // the T-bill yield, named for the instrument and not for what it signals
  { label: "yield", pattern: "yields?" }, // a bond's return, which is also the market's borrowing cost
  { label: "yield curve", pattern: "yield curves?" }, // yields laid out by maturity, which only means something once "yield" does
  { label: "10Y", pattern: "10y" }, // the ten-year yield, as a ticker
  { label: "2Y", pattern: "2y" }, // the two-year yield, as a ticker
  { label: "10Y−2Y", pattern: "10y\\s?[−–-]\\s?2y" }, // the curve's slope as one symbol, spelled with a minus, a hyphen or an en dash
  { label: "spread", pattern: "spreads?" }, // the gap between two rates, without saying between which
  { label: "credit spread", pattern: "credit spreads?" }, // the extra a riskier borrower pays; it assumes the baseline is known
  { label: "high-yield", pattern: "high[-\u2010\u2011\\s]yield" }, // the polite name for junk bonds
  { label: "basis point(s)", pattern: "basis points?" }, // a hundredth of a percentage point, a unit finance uses and few others do
  { label: "percentage point(s)", pattern: "percentage points?" }, // a change in a rate, which readers confuse with a percent change
  { label: "VIX", pattern: "vix" }, // the stock market's fear gauge, known by its ticker
  { label: "FRED", pattern: "fred" }, // the St. Louis Fed's data service, known by its acronym
  { label: "inverted/inversion", pattern: "inverted|inversion" }, // short rates above long rates, said as a shape
  { label: "base rate", pattern: "base rates?" }, // a baseline frequency to a statistician and a central bank's rate to a banker
  { label: "policy rate", pattern: "policy rates?" }, // the central bank's rate, under its own name
  { label: "hysteresis", pattern: "hysteresis" }, // an effect that outlasts its cause
];

const JARGON_LONGEST_FIRST = [...JARGON_TERMS]
  .sort((a, b) => b.label.length - a.label.length)
  .map(({ label, pattern }) => ({ label, regex: new RegExp(`(?<![\\p{L}\\p{N}])(?:${pattern})(?![\\p{L}\\p{N}])`, "giu") }));

/** Occurrences of each term in `text`, keyed by label in the order of JARGON_TERMS; a longer term claims its words first. */
const countJargon = (text: string): Record<string, number> => {
  const found = new Map<string, number>();
  let unclaimed = text;
  for (const { label, regex } of JARGON_LONGEST_FIRST) {
    let hits = 0;
    unclaimed = unclaimed.replace(regex, () => {
      hits += 1;
      return " ";
    });
    found.set(label, hits);
  }
  return Object.fromEntries(JARGON_TERMS.map(({ label }) => [label, found.get(label) ?? 0]));
};

/**
 * Syllables in one run of a word, by the usual heuristic: each group of vowels (y counts)
 * is one, less a silent final "e", "ed" or "es" and a leading "y"; a word of three letters
 * or fewer is one. A number counts as one syllable however it is read aloud, so a figure
 * adds a word to a sentence and a little to its grade, never a long word's worth.
 */
const syllablesInPart = (part: string): number => {
  const letters = part.toLowerCase().replace(/[^a-z]/g, "");
  if (letters === "") return /\p{N}/u.test(part) ? 1 : 0;
  if (letters.length <= 3) return 1;
  const stem = letters.replace(/(?:[^laeiouytd]ed|[^laeiouysxzcg]es|[^laeiouy]e)$/, "").replace(/^y/, "");
  return Math.max(1, stem.match(/[aeiouy]+/g)?.length ?? 0);
};

/** Syllables in a word; a compound is counted by its parts, so "year-over-year" is four and "T-bill" two. */
export const countSyllables = (word: string): number =>
  word.split(/[-\u2010\u2011–—−/]+/).reduce((total, part) => total + syllablesInPart(part), 0);

/**
 * The Flesch-Kincaid grade of one sentence: 0.39 x words + 11.8 x syllables per word - 15.59.
 * With a single sentence the first term is just its length in words, so a long sentence of
 * short words and a short one of long words can land on the same grade.
 */
export const fleschKincaidGrade = (sentence: string): number => {
  const words = wordsOf(sentence);
  if (words.length === 0) return 0;
  const syllables = words.reduce((total, word) => total + countSyllables(word), 0);
  return 0.39 * words.length + 11.8 * (syllables / words.length) - 15.59;
};

/** A full stop after one of these does not end the sentence, even when a capital follows. */
const ABBREVIATION_END = /(?:^|[\s(])(?:e\.g|i\.e|vs|approx|u\.s|inc|pts|mo|yr)\.$/i;

/** What a sentence can begin with: a capital, a digit, an opening quote or bracket, a currency sign. */
const SENTENCE_START = /^[\p{Lu}\p{N}"'“‘([$]/u;

/**
 * Splits one block of text into sentences at . ! and ?, with closing quotes and brackets
 * kept on the sentence they close. It does not split inside a number ("0.22"), before a
 * lowercase word ("e.g. spreads") or after a known abbreviation ("pts."). A block with
 * no end mark is one sentence, which is how a heading or a list item reads.
 */
export const splitSentences = (block: string): string[] => {
  const text = block.replace(/\s+/g, " ").trim();
  const sentences: string[] = [];
  let start = 0;
  for (const found of text.matchAll(/[.!?]+["'”’)\]]*(?=\s|$)/g)) {
    const end = found.index + found[0].length;
    const next = text.slice(end).trimStart();
    if (next !== "" && !SENTENCE_START.test(next)) continue;
    if (ABBREVIATION_END.test(text.slice(start, end))) continue;
    sentences.push(text.slice(start, end).trim());
    start = end;
  }
  sentences.push(text.slice(start).trim());
  return sentences.filter((sentence) => sentence !== "");
};

/** Tags that end one block of text and begin another; every other tag runs on inside its sentence. */
const BLOCK_TAGS =
  /<\/?(?:address|article|aside|blockquote|body|br|button|caption|dd|details|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|label|legend|li|main|nav|ol|option|p|pre|section|select|summary|table|tbody|td|textarea|tfoot|th|thead|tr|ul)\b[^>]*>/gi;

const BLOCK_BREAK = "\u0001";

/** Drops every `<svg>`, the icons nested inside a chart's own svg included: innermost first, until none is left. */
const withoutSvg = (markup: string): string => {
  const stripped = markup.replace(/<svg\b(?:(?!<svg\b)[\s\S])*?<\/svg>/gi, " ");
  return stripped === markup ? markup : withoutSvg(stripped);
};

/**
 * The page's prose, one string per block. A chart's text is its axis and is dropped. A
 * table cell is a block of its own, so a row of values never runs together into one long
 * sentence; a cell of figures or a short value then falls under MIN_SENTENCE_WORDS, and a
 * cell that holds a sentence (the area actions are cells) is read as one. A middle dot,
 * this site's separator between items, ends a block. Inline tags join their text to the
 * words around them, except where one element ends and the next begins with nothing between
 * them (`</span><span>`): inline text needs a space there, so two elements that touch are
 * laid out as separate boxes, like a name and its description, and each is its own block.
 */
const proseBlocks = (markup: string): string[] =>
  withoutSvg(withoutHiddenMarkup(markup))
    .replace(/(<\/[a-z][^>]*>)(?=<[a-z])/gi, `$1${BLOCK_BREAK}`)
    .replace(BLOCK_TAGS, BLOCK_BREAK)
    .replace(/<[^>]*>/g, " ")
    .split(BLOCK_BREAK)
    .flatMap((block) => decodeEntities(block).split("·"))
    .map((block) =>
      block
        .replace(/\s+/g, " ")
        .replace(/ ([.,;:!?%)\]])/g, "$1")
        .replace(/([($[]) /g, "$1")
        .trim(),
    )
    .filter((block) => block !== "");

type ReadSentence = { text: string; words: number; grade: number };

/** The sentences in the markup: blocks split at sentence ends, less anything with fewer than MIN_SENTENCE_WORDS words that hold a letter. */
const readSentences = (markup: string): ReadSentence[] =>
  proseBlocks(markup)
    .flatMap(splitSentences)
    .flatMap((text) => {
      const words = wordsOf(text);
      if (words.filter((word) => /\p{L}/u.test(word)).length < MIN_SENTENCE_WORDS) return [];
      return [{ text, words: words.length, grade: fleschKincaidGrade(text) }];
    });

/** The HARDEST_SHOWN hardest distinct sentences, hardest first; a sentence the page says more than once is listed once with how many times. */
const hardestSentences = (sentences: readonly ReadSentence[]): HomeLoadDetail["hardestSentences"] => {
  const times = new Map<string, number>();
  for (const { text } of sentences) times.set(text, (times.get(text) ?? 0) + 1);
  return sentences
    .filter(({ text }, at) => sentences.findIndex((other) => other.text === text) === at)
    .sort((a, b) => b.grade - a.grade || b.words - a.words)
    .slice(0, HARDEST_SHOWN)
    .map(({ text, words, grade }) => ({ text, words, grade: Math.round(grade * 10) / 10, times: times.get(text) ?? 1 }));
};

/** The sentence with the most words; the first on the page when two tie. */
const longestSentence = (sentences: readonly ReadSentence[]): HomeLoadDetail["longestSentence"] => {
  const longest = sentences.reduce<ReadSentence | null>((best, next) => (best === null || next.words > best.words ? next : best), null);
  return longest === null ? null : { text: longest.text, words: longest.words };
};

const MAIN_OPEN = /<main\b[^>]*\bid="main-content"[^>]*>/;

/**
 * Reads the homepage's `<main id="main-content">`: the budgeted measure, and the per-term
 * jargon counts and hardest sentences that say where to cut. `areasSectionId` is the id of
 * the section that opens the area answers. Throws when either is missing: a page that lost
 * its main, or whose section was renamed, would otherwise measure zero and pass every
 * ratchet it is held to.
 */
export const readHomeLoad = (html: string, areasSectionId: string): HomeLoadReading => {
  const open = MAIN_OPEN.exec(html);
  const closeAt = html.indexOf("</main>", open?.index ?? 0);
  if (open === null || closeAt === -1) {
    throw new Error("[home-load] the rendered page has no <main id=\"main-content\">; there is nothing to measure.");
  }
  const main = html.slice(open.index, closeAt);

  const areasAt = main.search(new RegExp(`\\sid="${areasSectionId}"`));
  if (areasAt === -1) {
    throw new Error(`[home-load] <main> has no element with id="${areasSectionId}"; the areas section was renamed or removed.`);
  }
  const markup = withoutHiddenMarkup(main);
  const text = visibleText(main);
  const jargonTerms = countJargon(text);
  const sentences = readSentences(main);
  const hardest = hardestSentences(sentences);

  return {
    measure: {
      words: countWords(text),
      numbers: countMatches(text, /\d+(?:[.,]\d+)*/g),
      wordsBeforeAreas: countWords(visibleText(main.slice(0, main.lastIndexOf("<", areasAt)))),
      folds: countMatches(markup, /<details[\s>]/gi),
      buttons: countMatches(markup, /<button[\s>]/gi),
      fields: countMatches(markup, /<(?:input|select|textarea)[\s>/]/gi),
      fundingPressure: countOccurrences(text, "Funding pressure"),
      riskAppetite: countOccurrences(text, "Risk appetite"),
      jargon: Object.values(jargonTerms).reduce((total, hits) => total + hits, 0),
      hardSentences: sentences.filter(({ grade }) => grade > HARD_SENTENCE_GRADE).length,
      longestSentence: longestSentence(sentences)?.words ?? 0,
    },
    detail: {
      jargonTerms,
      longestSentence: longestSentence(sentences),
      hardestSentences: hardest,
    },
  };
};

/** The budgeted measure alone. */
export const measureHomeLoad = (html: string, areasSectionId: string): HomeLoadMeasure => readHomeLoad(html, areasSectionId).measure;

export type HomeLoadBreach = { metric: HomeLoadMetric; measured: number; baseline: number };

/** The metrics above their budget. Equal passes; so does lower, which is a cut waiting to be written down. */
export const findBudgetBreaches = (measured: HomeLoadMeasure, baseline: HomeLoadMeasure): HomeLoadBreach[] =>
  METRIC_ORDER.filter((metric) => measured[metric] > baseline[metric]).map((metric) => ({
    metric,
    measured: measured[metric],
    baseline: baseline[metric],
  }));

const count = (value: number): string => value.toLocaleString("en-US");

/** The failure text: which metric, the value, the budget, and the one way down. */
export const describeBreaches = (breaches: readonly HomeLoadBreach[]): string =>
  [
    "[home-load] The homepage is heavier than its budget:",
    ...breaches.map(
      ({ metric, measured, baseline }) =>
        `  ${METRIC_LABELS[metric]}: ${count(measured)}, budget ${count(baseline)} (+${count(measured - baseline)})`,
    ),
    ...breaches.flatMap(({ metric }) => {
      const fix = METRIC_FIXES[metric];
      return fix === undefined ? [] : [`  To lower "${METRIC_LABELS[metric]}": ${fix}`];
    }),
    "The budget only falls. Cut the page back to it, or move the weight to a page that is meant to hold it; do not raise HOME_LOAD_BASELINE to make this pass.",
    "When a change cuts a metric, `bun run check:home-load` prints the new value: set that metric in HOME_LOAD_BASELINE (scripts/check-home-load.ts) to it, in the same PR, lower only.",
  ].join("\n");

/** The measured table, with the room each metric has left or the cut it is waiting to record. */
export const formatHomeLoadTable = (measured: HomeLoadMeasure, baseline: HomeLoadMeasure): string => {
  const rows = METRIC_ORDER.map((metric) => {
    const value = measured[metric];
    const budget = baseline[metric];
    const status =
      value > budget
        ? `OVER by ${count(value - budget)}`
        : value < budget
          ? `lower the budget to ${count(value)}`
          : "at budget";
    return [METRIC_LABELS[metric], count(value), count(budget), status];
  });
  const header = ["Metric", "Measured", "Budget", "Status"];
  const widths = header.map((cell, column) => Math.max(cell.length, ...rows.map((row) => row[column]?.length ?? 0)));
  const line = (cells: readonly string[]) =>
    cells
      .map((cell, column) => (column === 0 || column === 3 ? cell.padEnd(widths[column] ?? 0) : cell.padStart(widths[column] ?? 0)))
      .join("  ")
      .trimEnd();
  return [line(header), ...rows.map(line)].join("\n");
};

/** The jargon count per term, most-used first with the absent terms on one line, then the hardest sentences. */
export const formatHomeLoadDetail = (detail: HomeLoadDetail): string => {
  const terms = Object.entries(detail.jargonTerms);
  const used = terms.filter(([, hits]) => hits > 0).sort(([, a], [, b]) => b - a);
  const unused = terms.filter(([, hits]) => hits === 0).map(([label]) => label);
  return [
    "Jargon by term (JARGON_TERMS, scripts/check-home-load.ts):",
    ...(used.length > 0 ? used.map(([label, hits]) => `  ${label}: ${count(hits)}`) : ["  none"]),
    ...(unused.length > 0 ? [`  not on the page: ${unused.join(", ")}`] : []),
    "",
    `The ${detail.hardestSentences.length} hardest sentences (Flesch-Kincaid grade, words):`,
    ...detail.hardestSentences.map(
      ({ text, words, grade, times }, at) => `  ${at + 1}. grade ${grade.toFixed(1)}, ${count(words)} words${times > 1 ? `, said ${times} times` : ""}: ${text}`,
    ),
    ...(detail.longestSentence === null ? [] : ["", `The longest sentence (${count(detail.longestSentence.words)} words): ${detail.longestSentence.text}`]),
  ].join("\n");
};

const readReading = (path: string): HomeLoadReading | null =>
  existsSync(path) ? readingSchema.parse(JSON.parse(readFileSync(path, "utf8"))) : null;

/** Runs the census test, prints the table, and returns the exit code. */
const main = (): number => {
  const scratch = mkdtempSync(join(tmpdir(), "whether-home-load-"));
  const outPath = join(scratch, "measure.json");
  try {
    const run = spawnSync(process.execPath, ["scripts/run-tests.mjs", TEST_PATH], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, [HOME_LOAD_OUT_ENV]: outPath },
    });
    const reading = readReading(outPath);
    const breaches = reading === null ? [] : findBudgetBreaches(reading.measure, HOME_LOAD_BASELINE);

    if (reading === null || (run.status !== 0 && breaches.length === 0)) {
      process.stdout.write(`${run.stdout ?? ""}${run.stderr ?? ""}`);
      process.stdout.write(`[home-load] ${TEST_PATH} failed without a measurement to trust.\n`);
      return 1;
    }

    process.stdout.write("[home-load] offline render of /, the page's <main>, against the budget in scripts/check-home-load.ts\n");
    process.stdout.write(`${formatHomeLoadTable(reading.measure, HOME_LOAD_BASELINE)}\n\n${formatHomeLoadDetail(reading.detail)}\n`);
    if (breaches.length === 0) return 0;
    process.stdout.write(`${describeBreaches(breaches)}\n`);
    return 1;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
};

if (import.meta.main) {
  process.exitCode = main();
}

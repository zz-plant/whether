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
});

export type HomeLoadMeasure = z.infer<typeof measureSchema>;
export type HomeLoadMetric = keyof HomeLoadMeasure;

/**
 * The current budget, measured on origin/main on 2026-11-03. Lowering a value is an edit
 * to this file that lands with the work that earned it: set it to what
 * `bun run check:home-load` prints. Raising one is a policy change and belongs in its own PR.
 */
export const HOME_LOAD_BASELINE: HomeLoadMeasure = {
  words: 1793,
  numbers: 316,
  wordsBeforeAreas: 350,
  folds: 9,
  buttons: 8,
  fields: 26,
  fundingPressure: 35,
  riskAppetite: 49,
};

/** The test writes its measurement to the path in this variable when it is set; the CLI reads it back. */
export const HOME_LOAD_OUT_ENV = "WHETHER_HOME_LOAD_OUT";

const METRIC_LABELS: Record<HomeLoadMetric, string> = {
  words: "Words in main",
  numbers: "Numbers in main",
  wordsBeforeAreas: "Words before the areas",
  folds: "<details> folds",
  buttons: "<button>s",
  fields: "<input>/<select> fields",
  fundingPressure: "\"Funding pressure\" mentions",
  riskAppetite: "\"Risk appetite\" mentions",
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

const countWords = (text: string): number => text.split(" ").filter((token) => /[\p{L}\p{N}]/u.test(token)).length;

const countMatches = (text: string, pattern: RegExp): number => text.match(pattern)?.length ?? 0;

const countOccurrences = (text: string, phrase: string): number => {
  const haystack = text.toLowerCase();
  const needle = phrase.toLowerCase();
  let count = 0;
  for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + needle.length)) count += 1;
  return count;
};

const MAIN_OPEN = /<main\b[^>]*\bid="main-content"[^>]*>/;

/**
 * Measures the homepage's `<main id="main-content">`. `areasSectionId` is the id of the
 * section that opens the area answers. Throws when either is missing: a page that lost
 * its main, or whose section was renamed, would otherwise measure zero and pass every
 * ratchet it is held to.
 */
export const measureHomeLoad = (html: string, areasSectionId: string): HomeLoadMeasure => {
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

  return {
    words: countWords(text),
    numbers: countMatches(text, /\d+(?:[.,]\d+)*/g),
    wordsBeforeAreas: countWords(visibleText(main.slice(0, main.lastIndexOf("<", areasAt)))),
    folds: countMatches(markup, /<details[\s>]/gi),
    buttons: countMatches(markup, /<button[\s>]/gi),
    fields: countMatches(markup, /<(?:input|select|textarea)[\s>/]/gi),
    fundingPressure: countOccurrences(text, "Funding pressure"),
    riskAppetite: countOccurrences(text, "Risk appetite"),
  };
};

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

const readMeasurement = (path: string): HomeLoadMeasure | null =>
  existsSync(path) ? measureSchema.parse(JSON.parse(readFileSync(path, "utf8"))) : null;

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
    const measured = readMeasurement(outPath);
    const breaches = measured === null ? [] : findBudgetBreaches(measured, HOME_LOAD_BASELINE);

    if (measured === null || (run.status !== 0 && breaches.length === 0)) {
      process.stdout.write(`${run.stdout ?? ""}${run.stderr ?? ""}`);
      process.stdout.write(`[home-load] ${TEST_PATH} failed without a measurement to trust.\n`);
      return 1;
    }

    process.stdout.write("[home-load] offline render of /, the page's <main>, against the budget in scripts/check-home-load.ts\n");
    process.stdout.write(`${formatHomeLoadTable(measured, HOME_LOAD_BASELINE)}\n`);
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

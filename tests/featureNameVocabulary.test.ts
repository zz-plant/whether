import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it } from "bun:test";

/*
 * The names the work was built under never reach a reader (2026-11-18). The drawings and
 * controls of feature-log §1.1.108 were specified as a "month cursor", an "area lens", a
 * "what-if", an "analog", a "slider", "regions", "overlays", a "ghost" marker. Those are the
 * builders' words: a reader sees "Which area?", "After one Fed cut", "Like which time?",
 * "where Hiring pauses". The owner's instruction was that the site must not suffer its own
 * vocabulary (docs/editorial-guardrails.md, "Questions and answers, as people say them").
 *
 * This reads every visible string in the components and copy modules those features live in:
 * JSX text, the accessible-name attributes, and sentence-like literals (a space and a letter).
 * Comments, identifiers, selectors and data attributes are not copy and are not read. A real
 * reader's question that happens to contain a word ("What if the Fed cuts?") is fine; the
 * hyphenated noun ("what-if") is the builders'.
 */

const ROOT = new URL("..", import.meta.url).pathname;

const SCANNED_DIRS = [
  "app/components/home",
  "app/components/ui",
  "app/components/history",
  "app/history",
  "app/signals/components",
  "app/trust",
  "app/operate/components",
];
const SCANNED_FILES = [
  "app/components/monthCursor.tsx",
  "app/components/trustStrip.tsx",
  "app/components/shareRail.tsx",
  "lib/report/ruleRegions.ts",
  "lib/report/ruleChartParams.ts",
  "lib/report/rateScenario.ts",
  "lib/report/fedSteps.ts",
  "lib/report/scoreComposition.ts",
  "lib/report/lastTimeCallChanged.ts",
  "lib/report/signalFlow.ts",
  "lib/report/recordCalendar.ts",
  "lib/report/advanceWarning.ts",
  "lib/report/latitudeChart.ts",
  "lib/report/home/inputTrail.ts",
  "lib/report/confidenceCalibration.ts",
  "lib/report/marketMoveScale.ts",
];

const BANNED =
  /\b(lens|cursor|analog(ue)?s?|sandbox|what-ifs?|simulat(e|ed|es|ion|ions)|toggle[sd]?|overlays?|ghost|sliders?|scrub(s|bed|bing)?|brush(ing)?|regions?|bucket(s)?)\b/i;

const walk = (dir: string): string[] =>
  readdirSync(join(ROOT, dir)).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(join(ROOT, path)).isDirectory()) return walk(path);
    return /\.(tsx?|mts)$/.test(name) ? [path] : [];
  });

const withoutComments = (source: string) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, " ");

/** The strings a reader can meet: JSX text, accessible names, and sentence-like literals. */
const visibleStrings = (source: string): { at: number; text: string }[] => {
  const found: { at: number; text: string }[] = [];
  /* JSX text: between a tag's close and the next tag, with no code in it. */
  for (const match of source.matchAll(/(?:["'}\w]|\/)>\s*([^<>{}=;()]*[A-Za-z][^<>{}=;()]*)\s*</g)) {
    if (match[1] && /\s|^[A-Z]/.test(match[1].trim())) found.push({ at: match.index ?? 0, text: match[1] });
  }
  /* Accessible names and labels. */
  for (const match of source.matchAll(/\b(?:aria-label|aria-valuetext|aria-description|title|alt|placeholder|label|caption|hint|summary)\s*[=:]\s*\{?\s*(["'`])([^"'`]*)\1/g)) {
    found.push({ at: match.index ?? 0, text: match[2] ?? "" });
  }
  /* Sentence-like literals: a letter and a space, so selectors, ids and keys are left out. */
  for (const match of source.matchAll(/(["'`])((?:(?!\1)[^\n\\]|\\.)*[A-Za-z](?:(?!\1)[^\n\\]|\\.)*)\1/g)) {
    const text = match[2] ?? "";
    if (!/\s/.test(text) || /^[\w-]+(\s[\w-]+)*$/.test(text) && !/[A-Z]/.test(text.charAt(0))) continue;
    if (/^(\[|\.|#|data-|aria-|M\d|[a-z-]+:)/.test(text) || /\b(className|class)\b/.test(source.slice(Math.max(0, (match.index ?? 0) - 12), match.index ?? 0))) continue;
    found.push({ at: match.index ?? 0, text });
  }
  return found;
};

const lineOf = (source: string, at: number) => source.slice(0, at).split("\n").length;

/* A class list (every token a lower-case utility: `cursor-pointer`, `z-[var(--z-overlay)]`) is
   not copy, and neither is the code inside a template's `${…}`. */
const UTILITY_TOKEN = /^[a-z0-9!:[\]\-/.%()_&>~@=*#,'"]+$/;
const asCopy = (text: string): string | null => {
  const words = text.replace(/\$\{[^}]*\}/g, " ").trim();
  if (words === "") return null;
  return words.split(/\s+/).every((token) => UTILITY_TOKEN.test(token)) && !/[A-Z]/.test(words) && /-|\[|:/.test(words) ? null : words;
};

describe("internal feature names never reach a reader", () => {
  const files = [...SCANNED_DIRS.flatMap(walk), ...SCANNED_FILES];

  it("scans the files the drawings and controls live in", () => {
    assert.ok(files.length > 60, `expected the feature files, found ${files.length}`);
  });

  it("prints none of the builders' names in visible copy", () => {
    const offenders = files.flatMap((file) => {
      const source = withoutComments(readFileSync(join(ROOT, file), "utf8"));
      return visibleStrings(source)
        .map(({ at, text }) => ({ at, text: asCopy(text) }))
        .filter((entry): entry is { at: number; text: string } => entry.text !== null && BANNED.test(entry.text))
        .map(({ at, text }) => `${relative(ROOT, join(ROOT, file))}:${lineOf(source, at)} ${text.slice(0, 100)}`);
    });
    assert.deepEqual([...new Set(offenders)], []);
  });

  it("catches the shapes it guards against, and lets a reader's own question through", () => {
    const hit = (text: string) =>
      visibleStrings(text).some(({ text: found }) => {
        const copy = asCopy(found);
        return copy !== null && BANNED.test(copy);
      });
    assert.equal(hit('<p className="x">Move the slider to see</p>'), true);
    assert.equal(hit('aria-label="Month cursor"'), true);
    assert.equal(hit('const note = "This is the pause region.";'), true);
    assert.equal(hit('<h3>What if the Fed cuts?</h3>'), false);
    assert.equal(hit('document.querySelector("[data-latitude-cursor]")'), false);
    assert.equal(hit('<summary className="cursor-pointer select-none text-sm">Sources</summary>'), false);
  });
});

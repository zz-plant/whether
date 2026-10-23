#!/usr/bin/env bun
/**
 * Pairs of top-level functions under `app/`, `lib/` and `worker/` that do the same job
 * under different names, found by embedding each one with EmbeddingGemma 2 on a local
 * Ollama and listing the pairs whose vectors sit closest.
 *
 * Advisory, and outside the gate: the suite runs offline, and a cosine score is a prompt
 * to read two functions side by side, not a finding. `rg` and the dead-export census catch
 * a copy that kept its name or lost its callers; this catches the helper written again
 * under a new name because nobody found the first one. A pair that scores high and turns
 * out to be two different jobs (a parser and its serializer, say) is the expected noise.
 *
 * Embeddings are cached by content hash under `artifacts/near-duplicates/`, so a rerun only
 * embeds what changed. Model 2026-10: `embeddinggemma-2:740m` (`ollama pull` it first). The
 * 270M text-only tag shares its embedding space for code at a third of the memory; the
 * cache is keyed by model name, so switching tags re-embeds rather than mixing vectors.
 *
 * `--copy` asks the same question of reader copy: it reads the reader routes from a running
 * server, splits them into sentences the way `audit:jev-copy` does, and lists pairs of
 * sentences that say the same thing, on one page or across two. Repeating a sentence is the
 * one copy rule nothing else checks: `audit:jev-copy` judges each sentence alone, and drops
 * exact repeats before it does. A sentence on every route read is page chrome, not repetition,
 * and is left out.
 *
 * Usage:
 *   bun run audit:near-duplicates
 *   bun run audit:near-duplicates -- --threshold 0.9 --limit 40 --model embeddinggemma-2:270m
 *   bun run dev   # in another shell, then:
 *   bun run audit:near-duplicates -- --copy [--base-url http://localhost:3000] [--routes /,/trust]
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { deadExportsConfig } from "./census.config";
import { DEFAULT_ROUTES as READER_ROUTES, extractSentences } from "./jev-copy-audit";
import { walkFiles } from "./walk-files.mjs";
import { embedTexts } from "./local-embeddings";

const DEFAULT_MODEL = "embeddinggemma-2:740m";
const DEFAULT_THRESHOLD = 0.93;
/* Sentences, unlike functions, share a site's whole vocabulary; see the calibration note at
   `run` for what scores above and below this. */
const DEFAULT_COPY_THRESHOLD = 0.95;
const DEFAULT_LIMIT = 25;
const MIN_LINES = 6;
/* Route handlers are thin by design: every one parses a request and hands it on, so they
   fill the top of the list and say nothing about the modules behind them. */
const HTTP_METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);
/* The model's 8,192-token budget is shared with the prefix; a function longer than this is
   judged on its opening, which is where its job is usually stated. */
const MAX_CHARS = 12_000;
const BATCH = 16;
const REPORT_DIR = "artifacts/near-duplicates";

export type CodeUnit = { file: string; name: string; line: number; text: string };

const TOP_LEVEL = /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\*?\s+([A-Za-z_$][\w$]*)|const\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=)/;

/**
 * Top-level functions in one file: each runs from its declaration line to the line before
 * the next top-level declaration, comment or blank-line run included. A `const` counts
 * only when its value is a function, so tables and config objects stay out — they repeat
 * by design. Declarations shorter than `MIN_LINES` carry too little to compare.
 */
export const extractUnits = (source: string, file: string): CodeUnit[] => {
  const lines = source.split("\n");
  const starts = lines.flatMap((line, index) => {
    const match = TOP_LEVEL.exec(line);
    return match ? [{ index, line, name: match[1] ?? match[2] ?? "" }] : [];
  });
  return starts.flatMap(({ index, line, name }, position) => {
    const end = starts[position + 1]?.index ?? lines.length;
    const body = lines.slice(index, end);
    while (body.length > 0 && !body.at(-1)?.trim()) body.pop();
    const text = body.join("\n");
    const isFunction = /^(?:export\s+)?(?:default\s+)?(?:async\s+)?function/.test(line) || /=>|\bfunction\b/.test(body.slice(0, 3).join(" "));
    if (!name || HTTP_METHODS.has(name) || !isFunction || body.length < MIN_LINES) return [];
    return [{ file, name, line: index + 1, text: text.slice(0, MAX_CHARS) }];
  });
};

const normalize = (vector: number[]): number[] => {
  const length = Math.hypot(...vector);
  return length > 0 ? vector.map((value) => value / length) : vector;
};

const locate = ({ file, name, line }: CodeUnit) => ({ file, name, line });

export type NearPair = { score: number; a: Omit<CodeUnit, "text">; b: Omit<CodeUnit, "text"> };

/**
 * Pairs at or above `threshold`, closest first. Two declarations in one file are left out
 * by default: a file's own helpers sharing vocabulary is the normal case, and the question
 * is whether one module re-implements another's. Copy passes `sameFile`, because a page
 * saying one thing twice is the commonest repetition there is.
 */
export const nearestPairs = (
  embedded: { unit: CodeUnit; vector: number[] }[],
  threshold: number,
  limit: number,
  { sameFile = false, skip }: { sameFile?: boolean; skip?: (a: CodeUnit, b: CodeUnit) => boolean } = {},
): NearPair[] => {
  const normed = embedded.map(({ unit, vector }) => ({ unit, vector: normalize(vector) }));
  const pairs: NearPair[] = [];
  for (const [index, a] of normed.entries()) {
    for (const b of normed.slice(index + 1)) {
      if (!sameFile && a.unit.file === b.unit.file) continue;
      if (skip?.(a.unit, b.unit)) continue;
      let score = 0;
      for (const [k, value] of a.vector.entries()) score += value * (b.vector[k] ?? 0);
      if (score >= threshold) pairs.push({ score, a: locate(a.unit), b: locate(b.unit) });
    }
  }
  return pairs.sort((x, y) => y.score - x.score).slice(0, limit);
};

/* EmbeddingGemma 2's document prefix for code; queries would take `task: code retrieval | query:`.
   Both sides of a pair are documents here, so both get this one. */
const documentPrompt = (unit: CodeUnit) => `title: ${unit.file} | text: ${unit.text}`;
/* The model card's prompt for comparing two passages with each other. */
const sentencePrompt = (unit: CodeUnit) => `task: sentence similarity | query: ${unit.text}`;

/** Case, punctuation and list markers aside, the words of a sentence. */
const sentenceKey = (sentence: string) => sentence.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const MONTHS = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/g;

/**
 * The words a sentence keeps when its numbers and months are taken out. Two rows of one
 * table ("Freezing — week of Sep 29" and "… Sep 22", or one yield reading per month)
 * share it: they are one template filled twice, which a reader expects of a table, and
 * they would otherwise fill the report.
 */
export const sentenceTemplate = (sentence: string) =>
  sentenceKey(sentence).replace(MONTHS, " ").replace(/\d+/g, " ").replace(/\s+/g, " ").trim();

/**
 * One unit per distinct sentence. `file` lists the routes it appears on and `line` is its
 * place on the first of them. A sentence printed word for word on several routes is one
 * component rendered more than once, so it is one unit: the pairs that remain are two
 * sentences worded differently, which is the repetition a reader notices and a grep cannot
 * find. A sentence on every route read is page chrome and is left out entirely.
 */
export const sentenceUnits = (pages: { route: string; sentences: string[] }[]): CodeUnit[] => {
  const byKey = new Map<string, { routes: string[]; line: number; text: string }>();
  for (const { route, sentences } of pages) {
    for (const [index, sentence] of sentences.entries()) {
      const key = sentenceKey(sentence);
      const seen = byKey.get(key);
      if (!seen) byKey.set(key, { routes: [route], line: index + 1, text: sentence });
      else if (!seen.routes.includes(route)) seen.routes.push(route);
    }
  }
  return [...byKey.values()].flatMap(({ routes, line, text }) =>
    pages.length > 1 && routes.length === pages.length
      ? []
      : [{ file: routes.join(", "), name: text.length > 80 ? `${text.slice(0, 77)}...` : text, line, text }]);
};

const cacheSchema = z.record(z.string(), z.array(z.number()));

const parseArgs = (argv: string[]) => {
  const read = (name: string) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const copy = argv.includes("--copy");
  return {
    copy,
    model: read("model") ?? DEFAULT_MODEL,
    host: read("host") ?? process.env.OLLAMA_HOST ?? "http://localhost:11434",
    threshold: Number(read("threshold") ?? (copy ? DEFAULT_COPY_THRESHOLD : DEFAULT_THRESHOLD)),
    limit: Number(read("limit") ?? DEFAULT_LIMIT),
    baseUrl: read("base-url") ?? "http://localhost:3000",
    routes: read("routes")?.split(",").map((route) => route.trim()).filter(Boolean) ?? READER_ROUTES,
  };
};

const collectUnits = (): CodeUnit[] => {
  const ignored = new Set(deadExportsConfig.ignoredDirectories);
  return deadExportsConfig.declarationRoots.flatMap((root) =>
    walkFiles(root, { skip: (name: string, isDirectory: boolean) => isDirectory && ignored.has(name) })
      .filter((file: string) => /\.tsx?$/.test(file) && !file.endsWith(".d.ts"))
      .flatMap((file: string) => extractUnits(readFileSync(file, "utf8"), file)));
};

const collectSentences = async (baseUrl: string, routes: readonly string[]): Promise<CodeUnit[]> => {
  const pages = [];
  for (const route of routes) {
    const url = new URL(route, baseUrl);
    const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok) throw new Error(`could not read ${url.href} (HTTP ${response.status})`);
    pages.push({ route, sentences: extractSentences(await response.text()) });
  }
  return sentenceUnits(pages);
};

const run = async (args: ReturnType<typeof parseArgs>) => {
  const units = args.copy ? await collectSentences(args.baseUrl, args.routes) : collectUnits();
  const prompt = args.copy ? sentencePrompt : documentPrompt;
  const kind = args.copy ? "sentences" : "functions";
  const cacheFile = path.join(REPORT_DIR, `cache.${args.copy ? "copy." : ""}${args.model.replace(/[^\w.-]+/g, "_")}.json`);
  const cache = existsSync(cacheFile) ? cacheSchema.parse(JSON.parse(readFileSync(cacheFile, "utf8"))) : {};
  const keyed = units.map((unit) => ({ unit, key: createHash("sha256").update(prompt(unit)).digest("hex") }));
  const missing = keyed.filter(({ key }) => !cache[key]);

  console.log(`near-duplicates: ${units.length} ${kind}, ${missing.length} to embed with ${args.model}`);
  mkdirSync(REPORT_DIR, { recursive: true });
  for (let start = 0; start < missing.length; start += BATCH) {
    const batch = missing.slice(start, start + BATCH);
    const vectors = await embedTexts(batch.map(({ unit }) => prompt(unit)), { model: args.model, host: args.host });
    for (const [index, { key }] of batch.entries()) {
      const vector = vectors[index];
      if (vector) cache[key] = vector;
    }
    writeFileSync(cacheFile, JSON.stringify(cache));
    if (process.stdout.isTTY) process.stdout.write(`\r  embedded ${Math.min(start + BATCH, missing.length)}/${missing.length}`);
  }
  if (missing.length > 0 && process.stdout.isTTY) process.stdout.write("\n");

  const embedded = keyed.flatMap(({ unit, key }) => {
    const vector = cache[key];
    return vector ? [{ unit, vector }] : [];
  });
  const pairs = nearestPairs(embedded, args.threshold, args.limit, args.copy
    ? { sameFile: true, skip: (a, b) => sentenceTemplate(a.text) === sentenceTemplate(b.text) }
    : {});
  for (const { score, a, b } of pairs) {
    console.log(`  ${score.toFixed(3)}  ${a.file}:${a.line} ${a.name}\n         ${b.file}:${b.line} ${b.name}`);
  }
  const report = path.join(REPORT_DIR, args.copy ? "report.copy.json" : "report.json");
  writeFileSync(report, `${JSON.stringify({ model: args.model, threshold: args.threshold, [kind]: units.length, pairs }, null, 2)}\n`);
  console.log(`near-duplicates: ${pairs.length} pair(s) at ≥${args.threshold}; report ${report}`);
  return 0;
};

if (import.meta.main) {
  const args = parseArgs(process.argv.slice(2));
  if (!Number.isFinite(args.threshold) || args.threshold <= 0 || args.threshold > 1) {
    console.error("near-duplicates: --threshold must be in (0, 1].");
    process.exit(2);
  }
  if (!Number.isInteger(args.limit) || args.limit < 1) {
    console.error("near-duplicates: --limit must be a positive integer.");
    process.exit(2);
  }
  process.exit(await run(args).catch((error: unknown) => {
    console.error(`near-duplicates: ${error instanceof Error ? error.message : String(error)} — is Ollama running with ${args.model} pulled?`);
    return 1;
  }));
}

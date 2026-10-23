#!/usr/bin/env bun
/**
 * Reader-copy and brief-consistency audit, judged by Jev (`typesafe/jev` on
 * Cloudflare Workers AI).
 *
 * Advisory modes outside the gate — the suite runs offline,
 * and a model's answer is not a deterministic check:
 *
 * - `copy` (default) fetches rendered routes from a running server, splits the
 *   visible text into sentences, and asks the four questions the 2026-09-22
 *   copy audit asked by hand: is it cryptic, figurative, abstract, presumptuous.
 *   `tests/readerVocabulary.test.tsx` can ban a word; it cannot see a sentence
 *   that assumes the reader has a board without saying "board". This can.
 * - `brief` compares generated text with its paired canonical document, refusing
 *   mismatched reading identities before inference.
 * - `screenshot`, `evidence`, and `eval` review local images, select source-backed
 *   candidates, and measure labeled cases. See docs/developer/decision-models.md.
 *
 * A flagged sentence is a prompt for a person to read it, not a verdict: Jev
 * gives no reasons, and a probability near the threshold is close to a coin
 * toss. Every Jev call that fails is counted, and any failure exits non-zero,
 * so a run that judged nothing cannot read as a clean one.
 *
 * `--model` picks the decision model (`jev`, the default, `clef`, `clef-flash` or `clef-omni`;
 * see `lib/jev/jevClient.ts`). Two or more, comma-separated, judge every sentence
 * once per model and list the sentences they disagree on: that list, not the
 * agreement rate, is what says whether the cheaper model can stand in for Jev.
 *
 * Needs CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (Workers AI: Read/Edit).
 *
 * Usage:
 *   bun run dev   # in another shell
 *   bun run audit:jev-copy
 *   bun run audit:jev-copy -- --routes /,/trust --threshold 0.7
 *   bun run audit:jev-copy -- --model jev,clef-flash
 *   bun run brief:weekly:artifact && bun run audit:jev-copy -- --mode brief
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isDecisionModel, runJev, type DecisionModel, type JevQuestion, type JevResult } from "../lib/jev/jevClient";
import { getRegimePublicLabel } from "../lib/regimePresentation";
import { runArtifactAudit } from "./jev-artifact-audit";

export const DEFAULT_ROUTES = ["/", "/trust", "/history", "/signals", "/share", "/operate", "/resources"];
const DEFAULT_THRESHOLD = 0.8;
const CONCURRENCY = 4;
const REPORT_DIR = "artifacts/jev";

/* Named market conditions are the product's defined labels; without saying so,
   "figurative" flags every sentence that names this week's call. */
const COPY_CONTEXT = [
  "The sentence is from Whether, a site that turns public market data into a weekly operating call",
  "for startup and product leaders. Its four named conditions",
  `(${["EXPANSION", "VOLATILE", "DEFENSIVE", "SCARCITY"].map(getRegimePublicLabel).join(", ")})`,
  "are defined labels on the site, not figures of speech.",
].join(" ");

export const COPY_QUESTIONS: Record<string, JevQuestion> = {
  cryptic: {
    type: "noul",
    instructions:
      "Would a startup operator reading this site for the first time need a term defined, that the sentence does not define, to understand it?",
    criteria: { true: "Uses jargon, internal names or abbreviations a newcomer cannot decode", false: "Plain to a newcomer" },
  },
  figurative: {
    type: "noul",
    instructions: "Does the sentence lean on a metaphor or figure of speech where a plain statement would say it better?",
    criteria: { true: "Meaning depends on a figure of speech", false: "Literal, or the figure is a defined label" },
  },
  abstract: {
    type: "noul",
    instructions: "Is the sentence so general that a reader could not act on it or check it?",
    criteria: { true: "No concrete action, number, or condition a reader could use", false: "Says something concrete" },
  },
  presumptuous: {
    type: "noul",
    instructions:
      "Does the sentence assume facts about the reader's company or role (a board, a CEO, a finance lead, a set meeting, a stage) that the reader has not told the site?",
    criteria: { true: "Assumes the reader's org structure or circumstances", false: "Makes no such assumption" },
  },
};

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&#x27;": "'", "&nbsp;": " " };

/**
 * Visible sentences in a served page, without the head and the nav chrome every
 * route repeats. Scripts carry the RSC flight payload,
 * which repeats the page as JSON; counting it would judge every sentence twice
 * and a lot of props that are never shown.
 */
export const extractSentences = (html: string): string[] => {
  const text = html
    .replace(/<(head|nav|script|style|svg|noscript|template)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/li|\/h[1-6]|\/div|\/td|\/th|\/dt|\/dd)\b[^>]*>/gi, ". ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? " ")
    .replace(/\s+/g, " ")
    // A sentence that already ended before its block closed gains a second stop.
    .replace(/([.!?])(?:\s*\.)+/g, "$1");
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.replace(/^[.\s]+/, "").trim())
    .filter((sentence) => sentence.length >= 30 && sentence.length <= 400 && /[a-z]/i.test(sentence) && sentence.split(" ").length >= 5);
  return [...new Set(sentences)];
};

export type CopyFinding = { route: string; sentence: string; flags: Record<string, number> };

/** The questions a sentence scored at or above the threshold on. */
export const flaggedQuestions = (result: JevResult, threshold: number): Record<string, number> => {
  if (!result.ok) return {};
  const flags: Record<string, number> = {};
  for (const [key, answer] of Object.entries(result.answers)) {
    if (answer.type === "noul" && answer.noul >= threshold) flags[key] = answer.noul;
  }
  return flags;
};

export type Disagreement = { route: string; sentence: string; question: string; flaggedBy: string[]; clearedBy: string[] };

/**
 * Every sentence and question one model flagged and another cleared. A sentence
 * any model failed to judge is left out: its empty flags would read as a clear.
 */
export const findDisagreements = (
  items: { route: string; sentence: string }[],
  resultsByModel: Record<string, JevResult[]>,
  threshold: number,
): Disagreement[] => {
  const runs = Object.entries(resultsByModel);
  return items.flatMap((item, index) => {
    const judged: { model: string; flags: Record<string, number> }[] = [];
    for (const [model, results] of runs) {
      const result = results[index];
      if (!result?.ok) return [];
      judged.push({ model, flags: flaggedQuestions(result, threshold) });
    }
    return Object.keys(COPY_QUESTIONS).flatMap((question) => {
      const flaggedBy = judged.filter(({ flags }) => question in flags).map(({ model }) => model);
      if (flaggedBy.length === 0 || flaggedBy.length === judged.length) return [];
      const clearedBy = judged.map(({ model }) => model).filter((model) => !flaggedBy.includes(model));
      return [{ ...item, question, flaggedBy, clearedBy }];
    });
  });
};

const parseModels = (value: string | undefined): DecisionModel[] | null => {
  const names = [...new Set((value ?? "jev").split(",").map((name) => name.trim()).filter(Boolean))];
  const models = names.filter(isDecisionModel);
  return models.length === names.length && models.length > 0 ? models : null;
};

const parseArgs = (argv: string[]) => {
  const read = (name: string) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const threshold = Number(read("threshold") ?? DEFAULT_THRESHOLD);
  return {
    mode: read("mode") ?? "copy",
    baseUrl: read("base-url") ?? "http://localhost:3000",
    routes: read("routes")?.split(",").map((route) => route.trim()).filter(Boolean) ?? DEFAULT_ROUTES,
    threshold,
    models: parseModels(read("model")),
    inputPath: read("input"),
    imagePath: read("image"),
    reportDir: read("out-dir"),
  };
};

type Args = ReturnType<typeof parseArgs> & { models: DecisionModel[] };
type Credentials = { accountId: string; apiToken: string };

const pool = async <T, R>(items: T[], worker: (item: T) => Promise<R>): Promise<R[]> => {
  const results: R[] = Array.from({ length: items.length });
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await worker(items[index]);
      }
    }),
  );
  return results;
};

const writeReport = (name: string, report: unknown) => {
  mkdirSync(REPORT_DIR, { recursive: true });
  const file = path.join(REPORT_DIR, name);
  writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
  return file;
};

const runCopyAudit = async (args: Args, credentials: Credentials) => {
  const seen = new Set<string>();
  const items: { route: string; sentence: string }[] = [];
  for (const route of args.routes) {
    const url = new URL(route, args.baseUrl);
    const response = await fetch(url, { signal: AbortSignal.timeout(120_000) }).catch((error: unknown) => error);
    if (!(response instanceof Response) || !response.ok) {
      const reason = response instanceof Response ? `HTTP ${response.status}` : String(response);
      console.error(`jev-copy-audit: could not read ${url.href} (${reason}). Is a server running at ${args.baseUrl}?`);
      return 1;
    }
    for (const sentence of extractSentences(await response.text())) {
      if (seen.has(sentence)) continue;
      seen.add(sentence);
      items.push({ route, sentence });
    }
  }

  console.log(`jev-copy-audit: judging ${items.length} sentences from ${args.routes.length} routes with ${args.models.join(", ")}`);
  const resultsByModel: Record<string, JevResult[]> = {};
  const byModel: Record<string, { served: string[]; failed: number; findings: CopyFinding[] }> = {};
  let failed = 0;
  for (const model of args.models) {
    const results = await pool(items, (item) =>
      runJev({ state: { context: COPY_CONTEXT, sentence: item.sentence }, questions: COPY_QUESTIONS }, { ...credentials, model }));
    resultsByModel[model] = results;
    const failures = results.flatMap((result) => (result.ok ? [] : [result.reason]));
    const findings: CopyFinding[] = items
      .map((item, index) => ({ ...item, flags: flaggedQuestions(results[index], args.threshold) }))
      .filter((finding) => Object.keys(finding.flags).length > 0);
    const served = [...new Set(results.flatMap((result) => (result.ok ? [result.model] : [])))];
    byModel[model] = { served, failed: failures.length, findings };
    failed += failures.length;

    for (const finding of findings) {
      const flags = Object.entries(finding.flags).map(([key, p]) => `${key} ${p.toFixed(2)}`).join(", ");
      console.log(`  ${model}  ${finding.route}  [${flags}]\n    ${finding.sentence}`);
    }
    console.log(`jev-copy-audit: ${model} flagged ${findings.length} of ${items.length} at ≥${args.threshold} (served by ${served.join(", ") || "none"})`);
    if (failures.length > 0) console.error(`jev-copy-audit: ${model}: ${failures.length} call(s) failed, first: ${failures[0]}`);
  }

  const disagreements = args.models.length > 1 ? findDisagreements(items, resultsByModel, args.threshold) : [];
  for (const entry of disagreements) {
    console.log(`  disagree  ${entry.route}  ${entry.question}: flagged by ${entry.flaggedBy.join(", ")}, cleared by ${entry.clearedBy.join(", ")}\n    ${entry.sentence}`);
  }
  const file = writeReport("copy-audit.json", { threshold: args.threshold, judged: items.length, byModel, disagreements });
  if (args.models.length > 1) console.log(`jev-copy-audit: ${disagreements.length} disagreement(s) across ${args.models.join(", ")}`);
  console.log(`jev-copy-audit: report ${file}`);
  return failed > 0 ? 1 : 0;
};

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    console.log("Usage: bun run audit:jev-copy -- --mode copy|brief|screenshot|evidence|counterevidence|eval --model jev,clef,clef-flash,clef-omni\nFile modes: --input <json> --image <png|jpg|webp> --out-dir <directory> --threshold <0.5..1>\nDefault brief input: artifacts/weekly-slack-brief.txt.audit.json; regenerate with bun run brief:weekly:artifact.\nCounterevidence input: { canonical, candidates:[{id,claim,excerpt,sourceUrl,observedAt,side?}] }; labeled review cases feed `bun run reviewed-cases:add`.\nAll model calls are advisory; review raw probabilities and labeled errors.");
    process.exit(0);
  }
  const args = parseArgs(process.argv.slice(2));
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!accountId || !apiToken) {
    console.error("jev-copy-audit: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (Workers AI) are not both set.");
    process.exit(2);
  }
  if (!Number.isFinite(args.threshold) || args.threshold <= 0 || args.threshold > 1) {
    console.error("jev-copy-audit: --threshold must be in (0, 1].");
    process.exit(2);
  }
  if (args.mode !== "copy" && args.mode !== "brief" && args.mode !== "screenshot" && args.mode !== "evidence" && args.mode !== "counterevidence" && args.mode !== "eval") {
    console.error("jev-copy-audit: --mode must be copy, brief, screenshot, evidence, counterevidence or eval.");
    process.exit(2);
  }
  const { models } = args;
  if (!models) {
    console.error("jev-copy-audit: --model takes jev, clef, clef-flash or clef-omni, comma-separated.");
    process.exit(2);
  }
  process.exit(args.mode === "copy"
    ? await runCopyAudit({ ...args, models }, { accountId, apiToken })
    : await runArtifactAudit({ ...args, mode: args.mode, models }, { accountId, apiToken }));
}

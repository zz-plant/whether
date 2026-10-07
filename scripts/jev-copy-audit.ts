#!/usr/bin/env bun
/**
 * Reader-copy and brief-consistency audit, judged by Jev (`typesafe/jev` on
 * Cloudflare Workers AI).
 *
 * Two modes, both advisory and both outside the gate — the suite runs offline,
 * and a model's answer is not a deterministic check:
 *
 * - `copy` (default) fetches rendered routes from a running server, splits the
 *   visible text into sentences, and asks the four questions the 2026-09-22
 *   copy audit asked by hand: is it cryptic, figurative, abstract, presumptuous.
 *   `tests/readerVocabulary.test.tsx` can ban a word; it cannot see a sentence
 *   that assumes the reader has a board without saying "board". This can.
 * - `brief` puts the latest published call (`data/published_briefs.json`) and
 *   the generated brief text (`bun run brief:weekly:artifact` writes it to
 *   `artifacts/weekly-slack-brief.txt`) side by side and asks whether the text contradicts
 *   the call — the shape of the `/history` "Reading now" defect, where two
 *   surfaces disagreed and every check was green.
 *
 * A flagged sentence is a prompt for a person to read it, not a verdict: Jev
 * gives no reasons, and a probability near the threshold is close to a coin
 * toss. Every Jev call that fails is counted, and any failure exits non-zero,
 * so a run that judged nothing cannot read as a clean one.
 *
 * Needs CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (Workers AI: Read/Edit).
 *
 * Usage:
 *   bun run dev   # in another shell
 *   bun run audit:jev-copy
 *   bun run audit:jev-copy -- --routes /,/trust --threshold 0.7
 *   bun run brief:weekly:artifact && bun run audit:jev-copy -- --mode brief
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { runJev, type JevQuestion, type JevResult } from "../lib/jev/jevClient";
import { getRegimePublicLabel } from "../lib/regimePresentation";

const DEFAULT_ROUTES = ["/", "/trust", "/history", "/signals", "/pricing", "/share", "/operate", "/resolve"];
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

export const BRIEF_QUESTIONS: Record<string, JevQuestion> = {
  contradicts_call: {
    type: "noul",
    instructions:
      "Does state.briefText tell the reader something (a condition, an action, a threshold, a confidence) that contradicts state.publishedCall?",
    criteria: {
      true: "A reader of the text would act differently than a reader of the published call",
      false: "The text agrees with the published call, or only adds detail to it",
    },
  },
  conflict_area: {
    type: "choice",
    instructions: "If the text and the published call disagree, where is the biggest disagreement?",
    criteria: {
      condition: "The named market condition or its severity",
      action: "What to do now",
      thresholds: "The lines that pause or resume a decision",
      confidence: "How sure the call is",
      none: "They do not disagree",
    },
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
  };
};

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

const runCopyAudit = async (args: ReturnType<typeof parseArgs>, credentials: { accountId: string; apiToken: string }) => {
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

  console.log(`jev-copy-audit: judging ${items.length} sentences from ${args.routes.length} routes`);
  const results = await pool(items, (item) =>
    runJev({ state: { context: COPY_CONTEXT, sentence: item.sentence }, questions: COPY_QUESTIONS }, credentials));

  const failures = results.flatMap((result) => (result.ok ? [] : [result.reason]));
  const findings: CopyFinding[] = items
    .map((item, index) => ({ ...item, flags: flaggedQuestions(results[index], args.threshold) }))
    .filter((finding) => Object.keys(finding.flags).length > 0);
  const models = [...new Set(results.flatMap((result) => (result.ok ? [result.model] : [])))];

  const file = writeReport("copy-audit.json", { threshold: args.threshold, models, judged: items.length, failed: failures.length, findings });
  for (const finding of findings) {
    const flags = Object.entries(finding.flags).map(([key, p]) => `${key} ${p.toFixed(2)}`).join(", ");
    console.log(`  ${finding.route}  [${flags}]\n    ${finding.sentence}`);
  }
  console.log(`jev-copy-audit: ${findings.length} flagged of ${items.length} at ≥${args.threshold} (model ${models.join(", ") || "none"}); report ${file}`);
  if (failures.length > 0) {
    console.error(`jev-copy-audit: ${failures.length} Jev call(s) failed, first: ${failures[0]}`);
    return 1;
  }
  return 0;
};

const runBriefAudit = async (args: ReturnType<typeof parseArgs>, credentials: { accountId: string; apiToken: string }) => {
  const archive: unknown = JSON.parse(readFileSync("data/published_briefs.json", "utf8"));
  const latest = Array.isArray(archive) ? archive.at(-1) : null;
  /* Generated, never a committed copy: the committed one fell back here while it sat three weeks
     behind the archive, so a "contradiction" would have been its age, not a disagreement. */
  const briefPath = "artifacts/weekly-slack-brief.txt";
  if (!existsSync(briefPath)) {
    console.error(`jev-copy-audit: ${briefPath} is missing; run \`bun run brief:weekly:artifact\` first.`);
    return 1;
  }
  if (!latest || typeof latest !== "object") {
    console.error("jev-copy-audit: data/published_briefs.json holds no published call to compare against.");
    return 1;
  }
  const { slug, recordDate, postureLabel, confidenceLabel, summary, actionNow, guardrailThreshold, flipThreshold } =
    latest as Record<string, unknown>;
  const publishedCall = { slug, recordDate, postureLabel, confidenceLabel, summary, actionNow, guardrailThreshold, flipThreshold };

  const result = await runJev(
    { state: { publishedCall, briefText: readFileSync(briefPath, "utf8") }, questions: BRIEF_QUESTIONS },
    credentials,
  );
  if (!result.ok) {
    console.error(`jev-copy-audit: Jev call failed: ${result.reason}`);
    return 1;
  }
  const file = writeReport("brief-audit.json", { publishedCall, briefPath, threshold: args.threshold, model: result.model, answers: result.answers });
  const contradicts = result.answers.contradicts_call;
  const area = result.answers.conflict_area;
  const p = contradicts?.type === "noul" ? contradicts.noul : 0;
  console.log(`jev-copy-audit: ${briefPath} vs published ${String(slug)} — contradicts ${p.toFixed(2)}`
    + `${area?.type === "choice" ? `, area ${area.choice}` : ""} (model ${result.model}); report ${file}`);
  if (p >= args.threshold) console.log("  flagged: read the brief against the published call before it is sent.");
  return 0;
};

if (import.meta.main) {
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
  if (args.mode !== "copy" && args.mode !== "brief") {
    console.error("jev-copy-audit: --mode must be copy or brief.");
    process.exit(2);
  }
  const run = args.mode === "brief" ? runBriefAudit : runCopyAudit;
  process.exit(await run(args, { accountId, apiToken }));
}

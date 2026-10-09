#!/usr/bin/env bun
/**
 * Stage 4: label the selected posts with the local model under the registered rubric.
 * One JSON line per post in `.cache/advice-corpus/labels/<prompt version>.jsonl`; a post
 * already labelled is skipped, so the run resumes where it stopped.
 *
 *   bun run advice-corpus:classify                       # the prefilter's selection
 *   bun run advice-corpus:classify -- --concurrency 2
 *   bun run advice-corpus:classify -- --ids ids.txt --out pilot  # an ad hoc list
 *
 * It never asks Ollama to reload a model another session holds: each request sends the
 * context size the resident copy was loaded with (pre-registration §11, D7), never a
 * `keep_alive`, and waits rather than load the model itself. Every input here fits in 4,096
 * tokens with the answer, so a smaller resident context is waited out, not used.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";

import { ExtractedPostSchema, type ExtractedPost } from "./extract";
import { CACHE, LOCAL_CHAT_MODEL, OLLAMA_URL } from "./paths";
import { buildClassifierInput, parseLabel, PROMPT_VERSION, RESPONSE_SCHEMA, SYSTEM_PROMPT, type Label } from "./rubric";

const LabelSchema = z.object({
  capitalRelevant: z.boolean(),
  audience: z.enum(["founders", "lps", "general"]),
  stance: z.enum(["expand", "conserve", "craft", "none"]),
  metrics: z.array(z.string()),
  evidence: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
});

export const LabelRecordSchema = z.object({
  id: z.string(),
  model: z.string(),
  promptVersion: z.string(),
  label: LabelSchema.nullable(),
  error: z.string().nullable(),
  attempts: z.number(),
  ms: z.number(),
  at: z.string(),
  /** Prompt tokens the model read and the context it ran in, to show no input was cut. */
  promptTokens: z.number().optional(),
  numCtx: z.number().optional(),
});
export type LabelRecord = z.infer<typeof LabelRecordSchema>;

const ChatResponseSchema = z.object({ message: z.object({ content: z.string() }), prompt_eval_count: z.number().optional() });
const PsSchema = z.object({ models: z.array(z.object({ name: z.string(), context_length: z.number().optional() })) });

/** The smallest resident context every input here fits in, with room for the answer. */
const MIN_CONTEXT = 4096;

/** The context size the resident copy of the model was loaded with, or null when it is not resident. */
async function residentContext(): Promise<number | null> {
  const ps = PsSchema.parse(await (await fetch(`${OLLAMA_URL}/api/ps`, { signal: AbortSignal.timeout(10_000) })).json());
  return ps.models.find((model) => model.name === LOCAL_CHAT_MODEL)?.context_length ?? null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Wait until the model is resident with a context every input fits in; never load it. */
async function waitForResidentContext(): Promise<number> {
  for (;;) {
    const context = await residentContext();
    if (context !== null && context >= MIN_CONTEXT) return context;
    await sleep(30_000);
  }
}

export const labelsPath = (name = PROMPT_VERSION) => join(CACHE.labels, `${name}.jsonl`);

export function readLabelRecords(path: string): LabelRecord[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => LabelRecordSchema.parse(JSON.parse(line)));
}

export function readPost(source: string, id: string): ExtractedPost {
  return ExtractedPostSchema.parse(JSON.parse(readFileSync(join(CACHE.text, source, `${id}.json`), "utf8")));
}

async function ask(input: string, temperature: number): Promise<{ content: string; promptTokens: number | null; numCtx: number }> {
  const numCtx = await waitForResidentContext();
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: LOCAL_CHAT_MODEL,
      stream: false,
      format: RESPONSE_SCHEMA,
      options: { temperature, seed: 42, num_predict: 400, num_ctx: numCtx },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: input },
      ],
    }),
    signal: AbortSignal.timeout(300_000),
  });
  if (!response.ok) throw new Error(`ollama ${response.status}: ${(await response.text()).slice(0, 200)}`);
  const parsed = ChatResponseSchema.parse(await response.json());
  return { content: parsed.message.content, promptTokens: parsed.prompt_eval_count ?? null, numCtx };
}

/** One post, one registered retry at temperature 0.3 when the first answer does not parse. */
export async function classifyPost(
  post: ExtractedPost,
): Promise<{ label: Label | null; error: string | null; attempts: number; promptTokens?: number; numCtx?: number }> {
  let lastError = "";
  const input = buildClassifierInput(post.title, post.text);
  for (const [attempt, temperature] of [0, 0.3].entries()) {
    try {
      const answer = await ask(input, temperature);
      const parsed = parseLabel(answer.content, input);
      const usage = { numCtx: answer.numCtx, ...(answer.promptTokens === null ? {} : { promptTokens: answer.promptTokens }) };
      if (parsed.ok) return { label: parsed.label, error: null, attempts: attempt + 1, ...usage };
      lastError = parsed.error;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  return { label: null, error: lastError, attempts: 2 };
}

const SelectionSchema = z.object({ selected: z.array(z.object({ id: z.string(), source: z.string() })) });

async function main() {
  const { values } = parseArgs({
    options: {
      concurrency: { type: "string", default: "1" },
      ids: { type: "string" },
      out: { type: "string" },
      limit: { type: "string" },
    },
  });
  if ((await residentContext()) === null) {
    console.error(`[classify] ${LOCAL_CHAT_MODEL} is not loaded; refusing to load it over another session's models.`);
    process.exit(1);
  }
  const targets: { id: string; source: string }[] = values.ids
    ? readFileSync(values.ids, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [source, id] = line.trim().split("/");
          return { source, id };
        })
    : SelectionSchema.parse(JSON.parse(readFileSync(CACHE.prefilter, "utf8"))).selected;
  const out = labelsPath(values.out ?? PROMPT_VERSION);
  mkdirSync(CACHE.labels, { recursive: true });
  // A post whose last attempt failed is tried again; the newest record for an id is the one read.
  const done = new Set(readLabelRecords(out).filter((record) => record.label !== null).map((record) => record.id));
  const queue = targets.filter((target) => !done.has(target.id)).slice(0, values.limit ? Number(values.limit) : undefined);
  console.log(`[classify] ${done.size} already labelled, ${queue.length} to go -> ${out}`);
  const started = Date.now();
  let finished = 0;
  const worker = async () => {
    for (;;) {
      const target = queue.shift();
      if (!target) return;
      let post: ExtractedPost;
      try {
        post = readPost(target.source, target.id);
      } catch (error) {
        console.error(`[classify] cannot read ${target.source}/${target.id}: ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }
      const t0 = Date.now();
      const result = await classifyPost(post);
      const record: LabelRecord = {
        id: post.id,
        model: LOCAL_CHAT_MODEL,
        promptVersion: PROMPT_VERSION,
        label: result.label,
        error: result.error,
        attempts: result.attempts,
        ms: Date.now() - t0,
        at: new Date().toISOString(),
        ...(result.promptTokens === undefined ? {} : { promptTokens: result.promptTokens }),
        ...(result.numCtx === undefined ? {} : { numCtx: result.numCtx }),
      };
      appendFileSync(out, `${JSON.stringify(record)}\n`);
      finished += 1;
      if (finished % 25 === 0) {
        const rate = (Date.now() - started) / finished / 1000;
        console.log(`[classify] ${finished} done, ${rate.toFixed(1)}s/post, ~${Math.round((rate * queue.length) / 60)} min left`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Number(values.concurrency)) }, worker));
  console.log(`[classify] finished ${finished} in ${Math.round((Date.now() - started) / 60000)} min`);
}

if (import.meta.main) await main();

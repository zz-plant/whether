#!/usr/bin/env bun
/**
 * Builds the counterevidence source pool for the weekly call.
 *
 * Reads a recurring passage file and the call's canonical document, embeds
 * both with EmbeddingGemma 2 (local Ollama), and writes the exact input
 * `--mode counterevidence` judges: the passages most relevant to the call,
 * each tagged with the retrieval frame it resembles more — the call as printed
 * (side "support") or the opposite stance (side "challenge").
 *
 * The side is a retrieval hypothesis, never a verdict — Clef judges each
 * candidate independently in the counterevidence mode, and the packet carries
 * both the pool's side and the model's judgment so the two can be compared.
 * Embedding similarity is topic similarity, not stance: a passage that argues
 * the opposite with the call's own vocabulary is still retrieved and tagged by
 * the closer frame, and the packet's challenge list comes from the model.
 *
 * Passages come from a file the caller maintains (the recurring evidence
 * set): `[{ "id", "title"?, "text", "sourceUrl", "publishedAt" }]`. On a
 * machine with the advice-corpus cache, posts can be chunked into passages;
 * this tool itself is collection-agnostic.
 *
 * Usage:
 *   bun run evidence:pool -- --passages data/evidence-pool/passages.json \
 *     --canonical artifacts/weekly-slack-brief.txt.audit.json \
 *     --out artifacts/evidence-pool/counterevidence-input.json
 *   bun run audit:jev-copy -- --mode counterevidence --input artifacts/evidence-pool/counterevidence-input.json
 *
 * Needs a local Ollama with `embeddinggemma-2:740m` (ollama pull it first).
 * Embeddings are cached by content hash under .cache/evidence-pool/.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, appendFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  buildChallengeQuery,
  buildCounterevidenceInput,
  buildSupportQuery,
  cosineSimilarity,
  evidencePoolSchema,
  poolCanonicalSchema,
  selectEvidencePool,
  type EvidencePassage,
} from "../lib/evidencePool";
import { counterevidenceInputSchema } from "../lib/jev/counterevidence";

const DEFAULT_MODEL = "embeddinggemma-2:740m";
const CACHE_DIR = ".cache/evidence-pool";
const CACHE_FILE = path.join(CACHE_DIR, "embeddings.jsonl");

const flag = (argv: string[], name: string): string | undefined => {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : undefined;
};

const embedResponse = z.object({ embeddings: z.array(z.array(z.number())) });

const embed = async (inputs: string[], model: string, host: string): Promise<number[][]> => {
  const response = await fetch(new URL("/api/embed", host), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, input: inputs, keep_alive: "5m" }),
    signal: AbortSignal.timeout(300_000),
  });
  if (!response.ok) throw new Error(`Ollama ${response.status}: ${(await response.text()).slice(0, 200)}`);
  const parsed = embedResponse.parse(await response.json());
  if (parsed.embeddings.length !== inputs.length) throw new Error(`Ollama returned ${parsed.embeddings.length} vectors for ${inputs.length} inputs`);
  return parsed.embeddings;
};

/* EmbeddingGemma 2's document prompt for passages; queries use the task prefix. */
const documentPrompt = (passage: EvidencePassage) => `title: ${passage.title ?? passage.id} | text: ${passage.text}`;
const queryPrompt = (query: string) => `task: sentence similarity | query: ${query}`;

const readCanonical = (file: string) => {
  const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
  if (typeof parsed === "object" && parsed !== null && "canonical" in parsed) {
    return poolCanonicalSchema.parse((parsed as { canonical: unknown }).canonical);
  }
  return poolCanonicalSchema.parse(parsed);
};

const main = async () => {
  const passagesPath = flag(process.argv, "passages");
  const canonicalPath = flag(process.argv, "canonical");
  const outPath = flag(process.argv, "out") ?? "artifacts/evidence-pool/counterevidence-input.json";
  const model = flag(process.argv, "model") ?? DEFAULT_MODEL;
  const host = flag(process.argv, "host") ?? process.env.OLLAMA_HOST ?? "http://localhost:11434";
  const top = Number(flag(process.argv, "top") ?? 6);
  const minSimilarity = Number(flag(process.argv, "min-similarity") ?? 0.3);

  if (!passagesPath || !canonicalPath) {
    console.error("evidence:pool requires --passages <json> and --canonical <json> (a canonical object, or a brief audit bundle with `.canonical`).");
    process.exit(2);
  }
  if (!Number.isFinite(top) || top < 1 || top > 50) {
    console.error("evidence:pool: --top must be a count between 1 and 50.");
    process.exit(2);
  }
  if (!Number.isFinite(minSimilarity) || minSimilarity <= 0 || minSimilarity > 1) {
    console.error("evidence:pool: --min-similarity must be in (0, 1].");
    process.exit(2);
  }

  const pool = evidencePoolSchema.parse(JSON.parse(readFileSync(passagesPath, "utf8")));
  const canonical = readCanonical(canonicalPath);
  const supportQuery = buildSupportQuery(canonical);
  const challengeQuery = buildChallengeQuery();

  const documents = pool.passages.map((passage) => ({
    key: createHash("sha256").update(documentPrompt(passage)).digest("hex"),
    prompt: documentPrompt(passage),
  }));
  const support = { key: createHash("sha256").update(queryPrompt(supportQuery)).digest("hex"), prompt: queryPrompt(supportQuery) };
  const challenge = { key: createHash("sha256").update(queryPrompt(challengeQuery)).digest("hex"), prompt: queryPrompt(challengeQuery) };
  const keyed = [...documents, support, challenge];

  const cache = new Map<string, number[]>();
  if (existsSync(CACHE_FILE)) {
    for (const line of readFileSync(CACHE_FILE, "utf8").split("\n").filter(Boolean)) {
      const entry: { key: string; vector: number[] } = JSON.parse(line);
      cache.set(entry.key, entry.vector);
    }
  }
  const missing = keyed.filter(({ key }) => !cache.has(key));
  if (missing.length > 0) {
    mkdirSync(CACHE_DIR, { recursive: true });
    const vectors = await embed(missing.map(({ prompt }) => prompt), model, host).catch((error: unknown) => {
      const reason = error instanceof Error ? error.message : String(error);
      console.error(`evidence:pool: could not embed with ${model} at ${host} (${reason}). Pull the model first: \`ollama pull ${model}\`.`);
      process.exit(2);
    });
    missing.forEach(({ key }, index) => {
      const vector = vectors[index];
      if (vector) {
        cache.set(key, vector);
        appendFileSync(CACHE_FILE, `${JSON.stringify({ key, vector })}\n`);
      }
    });
  }

  const supportSimilarity = documents.map(({ key }) => {
    const vector = cache.get(key);
    const query = cache.get(support.key);
    return vector && query ? cosineSimilarity(vector, query) : 0;
  });
  const challengeSimilarity = documents.map(({ key }) => {
    const vector = cache.get(key);
    const query = cache.get(challenge.key);
    return vector && query ? cosineSimilarity(vector, query) : 0;
  });

  const selection = selectEvidencePool(pool.passages, supportSimilarity, challengeSimilarity, { top, minSimilarity });
  const candidates = [...selection.supporting, ...selection.challenging];
  const input = buildCounterevidenceInput(canonical, candidates);
  counterevidenceInputSchema.parse(input); // the audit must accept exactly what is written

  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(input, null, 2)}\n`);
  console.log(`evidence:pool: ${selection.supporting.length} supporting + ${selection.challenging.length} challenging of ${pool.passages.length} passages (${selection.excluded} excluded as below floor or outside top ${top}) — wrote ${outPath}`);
  console.log("evidence:pool: the side tags are retrieval hypotheses; judge them with bun run audit:jev-copy -- --mode counterevidence --input <out>");
  for (const candidate of candidates) {
    console.log(`  ${candidate.side} ${candidate.passage.id}  (support ${candidate.supportSimilarity.toFixed(3)}, challenge ${candidate.challengeSimilarity.toFixed(3)})`);
  }
  return 0;
};

process.exitCode = await main();
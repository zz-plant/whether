#!/usr/bin/env bun
/** Local candidate discovery for the existing Clef evidence audit; similarity never establishes support. */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isDeepStrictEqual, parseArgs } from "node:util";
import { z } from "zod";
import { artifactAuditSchema, buildArtifactAudit, canonicalAuditSchema, evidenceCandidateSchema } from "../lib/jev/auditRequests";
import { DEFAULT_EMBEDDING_MODEL, embedTexts, normalizeVectors, type EmbeddingOptions } from "./local-embeddings";

const PROMPT_VERSION = "whether-evidence-retrieval-v1";
const poolSchema = z.object({
  canonical: canonicalAuditSchema,
  candidates: z.array(evidenceCandidateSchema).min(1).max(10_000)
    .refine((items) => new Set(items.map((item) => item.id)).size === items.length, "candidate IDs must be unique"),
});
const modelSchema = z.object({ name: z.string(), digest: z.string().regex(/^[a-f0-9]{64}$/) });
const tagsSchema = z.object({ models: z.array(modelSchema) });
const cacheSchema = z.object({ version: z.string(), model: modelSchema, vectors: z.record(z.string(), z.array(z.number().finite()).min(1)) });
type Options = { model?: string; host?: string; limit?: number; cachePath?: string; fetchImpl?: typeof fetch };
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const readJson = (file: string): unknown => JSON.parse(readFileSync(file, "utf8"));
const writeJson = (file: string, value: unknown) => {
  mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporary, file);
};

const localHost = (host: string) => {
  const url = new URL(host);
  if (url.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("evidence retrieval requires an HTTP loopback Ollama host");
  }
  return url.origin;
};
const modelIdentity = async (options: EmbeddingOptions) => {
  const response = await (options.fetchImpl ?? fetch)(new URL("/api/tags", options.host), { signal: AbortSignal.timeout(10_000), redirect: "error" });
  if (!response.ok) throw new Error(`Ollama model discovery failed (${response.status})`);
  const identity = tagsSchema.parse(await response.json()).models.find((item) => item.name === options.model);
  if (!identity) throw new Error(`local model is not installed: ${options.model}`);
  return identity;
};

export const retrieveEvidence = async (input: unknown, options: Options = {}) => {
  const started = performance.now();
  const bundle = poolSchema.parse(input);
  const limit = options.limit ?? 8;
  if (!Number.isInteger(limit) || limit < 1 || limit > 16) throw new Error("limit must be an integer from 1 to 16");
  const embedding = { model: options.model ?? DEFAULT_EMBEDDING_MODEL, host: localHost(options.host ?? process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434"), fetchImpl: options.fetchImpl };
  const dated = bundle.candidates.filter((item) => item.observedAt <= bundle.canonical.recordDate);
  const seen = new Set<string>();
  const eligible = dated.filter((item) => {
    const key = JSON.stringify([item.claim, item.excerpt].map((text) => text.toLowerCase().replace(/\s+/g, " ").trim()));
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!eligible.length) throw new Error("no eligible evidence on or before the canonical record date");
  const identity = await modelIdentity(embedding);
  let vectors: Record<string, number[]> = {};
  if (options.cachePath && existsSync(options.cachePath)) {
    const cache = cacheSchema.parse(readJson(options.cachePath));
    if (cache.version === PROMPT_VERSION && cache.model.name === identity.name && cache.model.digest === identity.digest) vectors = cache.vectors;
  }
  const query = ["guidance", "action", "pauseLine", "resumeLine", "changeLine"].flatMap((field) => {
    const value = Reflect.get(bundle.canonical, field);
    return typeof value === "string" ? [`${field}: ${value}`] : [];
  }).join("\n");
  const prompts = [`task: search result | query: ${query}`, ...eligible.map((item) => `title: ${item.claim} | text: ${item.excerpt}`)];
  const keys = prompts.map((prompt) => digest(`${PROMPT_VERSION}\n${prompt}`));
  const missing = prompts.flatMap((prompt, index) => {
    const key = keys[index];
    if (!key) throw new Error("missing prompt identity");
    return vectors[key] ? [] : [{ prompt, key }];
  });
  for (let start = 0; start < missing.length; start += 16) {
    const batch = missing.slice(start, start + 16);
    const embedded = await embedTexts(batch.map((item) => item.prompt), embedding);
    batch.forEach((item, index) => {
      const vector = embedded[index];
      if (!vector) throw new Error("missing embedding");
      vectors[item.key] = vector;
    });
  }
  const all = normalizeVectors(keys.map((key) => {
    const vector = vectors[key];
    if (!vector) throw new Error("missing cached vector");
    return vector;
  }));
  const queryVector = all[0];
  if (!queryVector) throw new Error("missing query embedding");
  const ranked = eligible.map((candidate, index) => {
    const vector = all[index + 1];
    if (!vector) throw new Error("missing candidate embedding");
    const similarity = queryVector.reduce((sum, value, dimension) => sum + value * (vector[dimension] ?? 0), 0);
    return { candidate, similarity: Math.max(-1, Math.min(1, similarity)) };
  }).sort((a, b) => b.similarity - a.similarity || a.candidate.id.localeCompare(b.candidate.id)).slice(0, limit);
  // A replacement under the same tag during this run must not produce a mixed-space cache/report.
  if ((await modelIdentity(embedding)).digest !== identity.digest) throw new Error("embedding model changed during retrieval; rerun");
  if (options.cachePath) writeJson(options.cachePath, { version: PROMPT_VERSION, model: identity, vectors });
  return {
    status: "completed", canonical: bundle.canonical, candidates: ranked.map((item) => item.candidate),
    retrieval: {
      advisory: true, promptVersion: PROMPT_VERSION, model: identity.name, modelDigest: identity.digest,
      dimensions: queryVector.length, query, inputDigest: digest(JSON.stringify(input)),
      poolSize: bundle.candidates.length, excludedFuture: bundle.candidates.length - dated.length,
      excludedDuplicates: dated.length - eligible.length, cacheHits: keys.length - missing.length,
      embedded: missing.length, limit, ranking: ranked.map((item) => ({ id: item.candidate.id, similarity: item.similarity })),
      durationMs: performance.now() - started,
    },
  };
};

export const runEvidenceRetrieval = async (args: Options & { inputPath: string; outputPath: string; briefPath?: string }): Promise<number> => {
  const paths = [args.inputPath, args.outputPath, args.cachePath].filter((file): file is string => Boolean(file)).map((file) => path.resolve(file));
  if (new Set(paths).size !== paths.length) { console.error("retrieval input, output and cache must be different files"); return 1; }
  if (args.briefPath && [args.outputPath, args.cachePath].some((file) => file && path.resolve(file) === path.resolve(args.briefPath ?? ""))) {
    console.error("retrieval output and cache must not overwrite the brief"); return 1;
  }
  try {
    let input = readJson(args.inputPath);
    if (args.briefPath) {
      const brief = artifactAuditSchema.parse(readJson(args.briefPath));
      buildArtifactAudit(brief); // Validate the paired date, reading and engine before inference.
      const pool = z.object({ candidates: z.array(evidenceCandidateSchema), canonical: canonicalAuditSchema.optional() }).parse(input);
      if (pool.canonical && !isDeepStrictEqual(pool.canonical, brief.canonical)) throw new Error("pool canonical differs from the paired brief; regenerate the pool or remove its canonical field");
      input = { canonical: brief.canonical, candidates: pool.candidates };
    }
    const result = await retrieveEvidence(input, args);
    writeJson(args.outputPath, { ...result, retrieval: { ...result.retrieval, canonicalPath: args.briefPath ?? args.inputPath }, generatedAt: new Date().toISOString() });
    console.log(`evidence retrieval: ${result.candidates.length}/${result.retrieval.poolSize} candidates → ${args.outputPath} (advisory; review support with Clef)`);
    return 0;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "retrieval failed";
    writeJson(args.outputPath, { status: "failed", generatedAt: new Date().toISOString(), error: reason });
    console.error(`evidence retrieval: ${reason}`);
    return 1;
  }
};

if (import.meta.main) {
  const { values } = parseArgs({ args: process.argv.slice(2).filter((arg) => arg !== "--"), options: {
    input: { type: "string" }, brief: { type: "string" }, out: { type: "string", default: "artifacts/evidence-candidates.json" },
    cache: { type: "string", default: "artifacts/evidence-retrieval/cache.json" },
    model: { type: "string", default: DEFAULT_EMBEDDING_MODEL }, host: { type: "string" }, limit: { type: "string", default: "8" }, help: { type: "boolean" },
  } });
  if (values.help || !values.input) {
    console.log("Usage: bun run evidence:retrieve -- --input <pool.json> [--brief <weekly-brief.audit.json>] [--out artifacts/evidence-candidates.json] [--limit 1..16] [--cache <file>] [--model embeddinggemma-2:740m] [--host http://127.0.0.1:11434]\nLocal discovery only. Input: {canonical, candidates:[{id,claim,excerpt,sourceUrl,observedAt}]}. With --brief, omit canonical to use the paired weekly artifact. Output feeds audit:jev-copy --mode evidence.");
    process.exit(values.help ? 0 : 1);
  }
  process.exitCode = await runEvidenceRetrieval({ inputPath: values.input, briefPath: values.brief, outputPath: values.out, cachePath: values.cache, model: values.model, host: values.host, limit: Number(values.limit) });
}

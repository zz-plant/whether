#!/usr/bin/env bun
/**
 * Stage 3: choose what the local model reads (pre-registration §5). Keyword density and
 * embedding similarity to six anchors, each turned into a percentile rank and averaged; the
 * top K are candidates, and a seeded 10% of the rest is classified too, to measure what the
 * score misses. Embeddings are cached in `.cache/advice-corpus/embeddings.jsonl`.
 *
 *   bun run advice-corpus:prefilter
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";

import { loadCorpus } from "./corpus";
import { CACHE, LOCAL_EMBED_MODEL, NON_CANDIDATE_SAMPLE_RATE, OLLAMA_URL, SEEDS } from "./paths";
import { capitalTermPattern } from "./rubric";
import { percentileRanks, seededRandom, shuffled } from "./stats";

export const EMBEDDING_ANCHORS = [
  "Advice to startup founders on fundraising: when to raise, how much to raise, valuation and dilution.",
  "Advice to founders on burn rate, runway and cutting costs to survive a downturn.",
  "Advice to founders to grow fast, hire ahead, spend aggressively and raise big rounds to win the market.",
  "Advice to founders on profitability, capital efficiency, burn multiple, payback and the Rule of 40.",
  "How the venture capital market and startup valuations are changing and what it means for founders.",
  "Advice on hiring plans, headcount growth, layoffs and how fast a startup should scale its team.",
];

/** Capital-term matches per 1,000 words. */
export function keywordDensity(text: string): number {
  const words = (text.match(/\S+/g) ?? []).length;
  if (words === 0) return 0;
  return ((text.match(capitalTermPattern()) ?? []).length * 1000) / words;
}

/** K = min(⌊0.30·N⌋, ⌊(2,600 − 0.1·N)/0.9⌋), registered so the model reads about 2,600 posts in all. */
export const candidateCount = (corpusSize: number) =>
  Math.max(0, Math.min(Math.floor(0.3 * corpusSize), Math.floor((2600 - NON_CANDIDATE_SAMPLE_RATE * corpusSize) / 0.9)));

/** The registered selection, given each post's two scores. Pure: same input, same selection. */
export function selectForClassification(scored: readonly { id: string; kw: number; emb: number }[], seed = SEEDS.nonCandidateSample) {
  const kwRanks = percentileRanks(scored.map((post) => post.kw));
  const embRanks = percentileRanks(scored.map((post) => post.emb));
  const ranked = scored
    .map((post, index) => ({ ...post, score: (kwRanks[index] + embRanks[index]) / 2 }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const k = candidateCount(ranked.length);
  const candidates = ranked.slice(0, k);
  const rest = ranked.slice(k).sort((a, b) => a.id.localeCompare(b.id));
  const sampleSize = Math.round(rest.length * NON_CANDIDATE_SAMPLE_RATE);
  const sampled = shuffled(rest, seededRandom(seed)).slice(0, sampleSize);
  return { ranked, candidates, sampled, nonCandidates: rest.length };
}

const cosine = (a: readonly number[], b: readonly number[]) => {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    na += a[index] ** 2;
    nb += b[index] ** 2;
  }
  return na === 0 || nb === 0 ? 0 : dot / Math.sqrt(na * nb);
};

const EmbedResponseSchema = z.object({ embeddings: z.array(z.array(z.number())) });
const EmbeddingLineSchema = z.object({ id: z.string(), vector: z.array(z.number()) });

async function embed(inputs: string[]): Promise<number[][]> {
  const response = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: LOCAL_EMBED_MODEL, input: inputs, truncate: true }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`ollama embed ${response.status}: ${(await response.text()).slice(0, 200)}`);
  return EmbedResponseSchema.parse(await response.json()).embeddings;
}

const documentInput = (title: string, text: string) => `search_document: ${title}\n${text.split(/\s+/).slice(0, 300).join(" ")}`;

async function main() {
  const { posts, counts, bySource } = loadCorpus();
  console.log(`[prefilter] corpus ${counts.corpus} posts`, counts);
  const cached = new Map<string, number[]>();
  if (existsSync(CACHE.embeddings)) {
    for (const line of readFileSync(CACHE.embeddings, "utf8").split("\n").filter(Boolean)) {
      const parsed = EmbeddingLineSchema.parse(JSON.parse(line));
      cached.set(parsed.id, parsed.vector);
    }
  }
  const missing = posts.filter((post) => !cached.has(post.id));
  console.log(`[prefilter] ${cached.size} embeddings cached, ${missing.length} to compute`);
  for (let start = 0; start < missing.length; start += 16) {
    const batch = missing.slice(start, start + 16);
    const vectors = await embed(batch.map((post) => documentInput(post.title, post.text)));
    batch.forEach((post, index) => {
      cached.set(post.id, vectors[index]);
      appendFileSync(CACHE.embeddings, `${JSON.stringify({ id: post.id, vector: vectors[index] })}\n`);
    });
    if ((start / 16) % 50 === 0) console.log(`[prefilter] embedded ${Math.min(start + 16, missing.length)}/${missing.length}`);
  }
  const anchors = await embed(EMBEDDING_ANCHORS.map((anchor) => `search_query: ${anchor}`));
  const scored = posts.map((post) => {
    const vector = cached.get(post.id) ?? [];
    return { id: post.id, kw: keywordDensity(post.text), emb: Math.max(...anchors.map((anchor) => cosine(vector, anchor))) };
  });
  const selection = selectForClassification(scored);
  const sourceOf = new Map(posts.map((post) => [post.id, post.source]));
  const selected = [
    ...selection.candidates.map((post) => ({ id: post.id, source: sourceOf.get(post.id) ?? "", prefilter: "candidate" })),
    ...selection.sampled.map((post) => ({ id: post.id, source: sourceOf.get(post.id) ?? "", prefilter: "sample" })),
  ];
  writeFileSync(
    CACHE.prefilter,
    JSON.stringify({
      corpus: posts.length,
      counts,
      bySource,
      k: selection.candidates.length,
      nonCandidates: selection.nonCandidates,
      sampled: selection.sampled.length,
      selected,
      scores: selection.ranked.map((post) => ({ id: post.id, kw: post.kw, emb: post.emb, score: post.score })),
    }),
  );
  console.log(
    `[prefilter] N=${posts.length} K=${selection.candidates.length} non-candidates=${selection.nonCandidates} sampled=${selection.sampled.length} -> ${selected.length} to classify`,
  );
}

if (import.meta.main) await main();
